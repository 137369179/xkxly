/**
 * AI React 接入层
 * ------------------------------------------------------------------
 * 全站所有 AI 交互都走这两个 hook，保证行为一致：
 *   useAiStream  —— 流式文本（逐字出现、可中断、失败自动兜底）
 *   useAiTask    —— 结构化一次性调用
 *
 * 关键设计：失败不报错给孩子。AI 挂了就静默切到 fallback 文案，
 * 只在家长中心的调用日志里留痕。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chatStream, isAiEnabled } from './client';
import { guardForScene, guardOutput } from './guard';
import type { StreamTask, TaskResult } from './tasks';
import type { AiError } from './types';

export type AiStatus = 'idle' | 'thinking' | 'streaming' | 'done' | 'error';

export interface AiStreamState {
  status: AiStatus;
  /** 已生成的正文（实时增长） */
  text: string;
  /** 是否为本地兜底内容 */
  fallback: boolean;
  error?: AiError;
  /** 发起（或重发）一次生成；doneCb 在流结束后（非 abort）触发 */
  run: (task: StreamTask, opts?: { onDone?: () => void }) => void;
  /** 中断当前生成 */
  stop: () => void;
  /** 回到初始状态 */
  reset: () => void;
  /** 当前任务，用于「重试」按钮 */
  task?: StreamTask;
}

/**
 * 流式生成。
 * @param autoTask 传入即在挂载时自动跑一次（用于「打开就出内容」的场景）
 */
export function useAiStream(autoTask?: StreamTask): AiStreamState {
  const [status, setStatus] = useState<AiStatus>('idle');
  const [text, setText] = useState('');
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState<AiError | undefined>();
  const [task, setTask] = useState<StreamTask | undefined>(autoTask);

  const abortRef = useRef<AbortController | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const run = useCallback((t: StreamTask, opts?: { onDone?: () => void }) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setTask(t);
    setText('');
    setError(undefined);
    setFallback(false);

    // 全局开关关闭时直接给本地内容，不发请求
    if (!isAiEnabled()) {
      setFallback(true);
      setText(t.fallback);
      setStatus('done');
      opts?.onDone?.();
      return;
    }

    setStatus('thinking');
    const doneCb = opts?.onDone;

    (async () => {
      let acc = '';
      let failed: AiError | undefined;

      try {
        for await (const chunk of chatStream({
          scene: t.scene,
          messages: t.messages,
          cacheKey: t.cacheKey,
          cacheTtl: t.cacheTtl,
          signal: ac.signal,
        })) {
          if (!aliveRef.current || ac.signal.aborted) return;
          if (chunk.type === 'text') {
            acc += chunk.text;
            setText(acc);
            setStatus('streaming');
          } else if (chunk.type === 'error') {
            failed = chunk.error;
          }
          // thinking 分片故意不展示给孩子 —— 思考链啰嗦且可能出现术语
        }
      } catch {
        failed = { code: 'unknown', message: '生成失败', retryable: true };
      }

      if (!aliveRef.current || ac.signal.aborted) return;

      // 主动取消不算失败，保持已渲染内容，不要闪回兜底文案
      if (failed?.code === 'aborted') {
        setStatus('done');
        return;
      }

      // 按场景选校验强度：古诗讲解不该被「杀/死」误杀，家长周报不该被 220 字砍断
      const guarded = guardOutput(acc, guardForScene(t.scene));
      if (failed || !guarded.ok) {
        // 兜底：直接换成本地内容，孩子无感
        setFallback(true);
        setText(t.fallback);
        setError(failed);
        setStatus('done');
        doneCb?.();
      } else {
        setText(guarded.text);
        setStatus('done');
        doneCb?.();
      }
    })().catch(() => {
      // 兜底兜底：任何漏网的异常都不能变成 unhandledrejection 弹到控制台
      if (!aliveRef.current || ac.signal.aborted) return;
      setFallback(true);
      setText(t.fallback);
      setStatus('done');
    });
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus((s) => (s === 'thinking' || s === 'streaming' ? 'done' : s));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setText('');
    setError(undefined);
    setFallback(false);
  }, []);

  /**
   * 自动模式：任务变化即重跑。
   * ⚠️ 旧 key 用 messages.length 做指纹 —— 换了一道题但消息条数不变时不会重跑，
   * 孩子看到的还是上一题的讲解。改成对消息正文取哈希。
   */
  const autoKey = useMemo(() => (autoTask ? taskKey(autoTask) : ''), [autoTask]);
  // 任务对象通常是行内字面量，每次渲染都是新引用；用 ref 拿最新值，只靠 key 触发
  const autoRef = useRef(autoTask);
  autoRef.current = autoTask;

  useEffect(() => {
    const t = autoRef.current;
    if (!t) return;
    run(t);
    // intentional: run when autoKey changes, autoRef is intentionally excluded
  }, [autoKey]);

  return { status, text, fallback, error, run, stop, reset, task };
}

/** 便宜的字符串哈希（FNV-1a 变体），用于给任务生成稳定指纹 */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function taskKey(t: StreamTask): string {
  if (!t) return '';
  const msgs = (t.messages ?? []).map((m) => `${m.role}:${m.content}`).join('\u0001');
  return `${t.scene}|${t.cacheKey ?? ''}|${hash(msgs)}`;
}


/* ------------------------------------------------------------------ */
/* 结构化任务                                                          */
/* ------------------------------------------------------------------ */
export interface AiTaskState<T> {
  loading: boolean;
  result?: TaskResult<T>;
  /** 任务函数自身抛异常时的记录（正常业务失败走 result.fallback，不进这里） */
  error?: AiError;
  run: () => void;
}

/**
 * 结构化一次性调用。
 * @param fn 返回 TaskResult 的任务函数（内部已含本地兜底）
 * @param auto 挂载时自动执行一次
 */
export function useAiTask<T>(fn: () => Promise<TaskResult<T>>, auto = false): AiTaskState<T> {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaskResult<T> | undefined>();
  const [error, setError] = useState<AiError | undefined>();
  const aliveRef = useRef(true);
  /** 递增序号：只有最后一次发起的调用有权写回结果，杜绝旧响应覆盖新响应 */
  const seqRef = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const run = useCallback(() => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(undefined);

    // ⚠️ 原实现没有 .catch —— 任务函数一旦 reject（任务层内部异常、JSON 崩了），
    // loading 会永远卡在 true，界面停在骨架屏，控制台还多一条 unhandledrejection
    Promise.resolve()
      .then(() => fnRef.current())
      .then((r) => {
        if (!aliveRef.current || seq !== seqRef.current) return;
        setResult(r);
      })
      .catch((e: unknown) => {
        if (!aliveRef.current || seq !== seqRef.current) return;
        if (import.meta.env.DEV) console.warn('[useAiTask] task threw', e);
        setError({
          code: 'unknown',
          message: e instanceof Error ? e.message : '任务执行失败',
          retryable: true,
        });
      })
      .finally(() => {
        if (!aliveRef.current || seq !== seqRef.current) return;
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (auto) run();
    // intentional: run when auto flag changes
  }, [auto]);

  return { loading, result, error, run };
}
