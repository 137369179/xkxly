/**
 * AI 服务层 · 核心客户端
 * ------------------------------------------------------------------
 * 全站唯一的 AI 出口。所有模块都通过这里调用，不允许各自 fetch。
 *
 * 处理的 7 件事：
 *   1. SSE 流式解析（容忍半包、跳过 [DONE]）
 *   2. 思考链分流 —— Agnes 全系推理模型，reasoning_content 与 content 分开
 *   3. 双超时 —— 首字节 25s / 全程 90s
 *   4. 智能重试 —— ⚠️ Agnes 参数错误返 500 而非 400，不能"5xx 一律重试"
 *   5. 模型降级 —— 主模型不可用时自动切备选
 *   6. 本地兜底 —— 全败时返回 ok:false，由调用方降级到规则内容
 *   7. 调用日志 —— 环形缓冲，家长中心可查
 */
import {
  PROXY_URL,
  RETRY_BASE_MS,
  RETRY_MAX,
  TIMEOUT_FIRST_BYTE,
  TIMEOUT_TOTAL,
  sceneConfig,
} from './config';
import { cacheGet, cacheSet } from './cache';
import type { AiChunk, AiError, AiLogEntry, AiResult, AiUsage, ChatOptions } from './types';

/** Health check endpoint: 由 PROXY_URL 去掉 /chat 后缀得到；若 PROXY_URL 本身不含 /chat，则复用其前缀作为健康检查地址（原 `|| '/api/ai/health'` 分支恒为死代码，已移除） */
const HEALTH_URL = PROXY_URL.replace(/\/chat$/, '/health');

/* ------------------------------------------------------------------ */
/* 全局开关（家长中心可一键关闭全站 AI）                                */
/* ------------------------------------------------------------------ */
let enabled = true;
export function setAiEnabled(v: boolean) {
  enabled = v;
}
export function isAiEnabled() {
  return enabled;
}

/* ------------------------------------------------------------------ */
/* 调用日志                                                            */
/* ------------------------------------------------------------------ */
const LOG_CAP = 60;
/**
 * ⚠️ 必须整体替换引用，不能 unshift 原地改。
 * React 订阅方拿到的是这个引用，同引用会被 Object.is 判定为"没变"而跳过渲染，
 * 家长中心的日志面板就永远刷不出来。
 */
let logs: readonly AiLogEntry[] = [];
const logListeners = new Set<() => void>();

function log(entry: AiLogEntry) {
  logs = [entry, ...logs].slice(0, LOG_CAP);
  logListeners.forEach((f) => {
    try {
      f();
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[ai] log listener threw', e);
    }
  });
  if (import.meta.env.DEV) {
    const tag = entry.cached ? 'cache' : entry.ok ? 'ok' : 'fail';
    console.debug(`[ai:${tag}] ${entry.scene} ${entry.model} ${entry.ms}ms`, entry.errCode ?? '');
  }
}

export function aiLogs(): readonly AiLogEntry[] {
  return logs;
}
export function onAiLog(fn: () => void): () => void {
  logListeners.add(fn);
  return () => {
    logListeners.delete(fn);
  };
}

/* ------------------------------------------------------------------ */
/* 错误归一化                                                          */
/* ------------------------------------------------------------------ */
function normalizeError(status: number, body: unknown): AiError {
  const raw = body as { error?: { code?: string; message?: string } } | undefined;
  const code = raw?.error?.code || '';
  const message = raw?.error?.message || '请求失败';

  if (status === 401) return { code: 'unauthorized', message: '密钥无效', retryable: false, status };
  if (status === 429) return { code: 'rate_limited', message: '请求太频繁', retryable: true, status };
  if (code === 'model_not_found') {
    return { code: 'model_not_found', message, retryable: false, status };
  }
  // ⚠️ Agnes 把参数错误也返回 500，靠 code 而非 status 判断，重试它没有意义
  if (code === 'invalid_request' || code === 'bad_json') {
    return { code: 'invalid_request', message, retryable: false, status };
  }
  if (code === 'timeout') return { code: 'timeout', message: '响应超时', retryable: true, status };
  if (status >= 500) return { code: 'unknown', message, retryable: true, status };
  return { code: 'unknown', message, retryable: false, status };
}

const sleep = (ms: number): Promise<void> => new Promise<void>((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* 单次流式请求                                                        */
/* ------------------------------------------------------------------ */
async function* streamOnce(
  model: string,
  opts: ChatOptions,
  cfg: ReturnType<typeof sceneConfig>,
): AsyncGenerator<AiChunk> {
  // 外部 signal 已经是 abort 状态时，addEventListener 永远不会触发 —— 必须先短路
  if (opts.signal?.aborted) {
    yield { type: 'error', error: { code: 'aborted', message: '已取消', retryable: false } };
    return;
  }

  const ac = new AbortController();
  const onAbort = () => ac.abort();
  opts.signal?.addEventListener('abort', onAbort);

  const totalTimer = setTimeout(() => ac.abort(), TIMEOUT_TOTAL);
  let firstByteTimer: ReturnType<typeof setTimeout> | null = setTimeout(
    () => ac.abort(),
    TIMEOUT_FIRST_BYTE,
  );
  const clearFirstByte = () => {
    if (firstByteTimer) {
      clearTimeout(firstByteTimer);
      firstByteTimer = null;
    }
  };

  // 提前中断（用户切页/组件卸载）时要主动关掉底层连接，否则代理端并发闸门会被占满
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ac.signal,
      body: JSON.stringify({
        scene: opts.scene,
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? cfg.temperature,
        max_tokens: opts.maxTokens ?? cfg.maxTokens,
        stream: true,
        ...(opts.json ?? cfg.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!res.ok || !res.body) {
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* 无响应体 */
      }
      yield { type: 'error', error: normalizeError(res.status, body) };
      return;
    }

    reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let usage: AiUsage | undefined;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      clearFirstByte();

      buf += decoder.decode(value, { stream: true });

      // SSE 以空行分帧；最后一段可能是半包，留在 buf 里等下一轮
      const frames = buf.split('\n\n');
      buf = frames.pop() ?? '';

      for (const frame of frames) {
        const line = frame.trim();
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;

        let json: {
          choices?: { delta?: { content?: string; reasoning_content?: string } }[];
          usage?: {
            prompt_tokens?: number;
            total_tokens?: number;
            completion_tokens_details?: { reasoning_tokens?: number; text_tokens?: number };
          };
        };
        try {
          json = JSON.parse(data);
        } catch {
          continue; // 半包或脏帧，丢弃
        }

        const delta = json.choices?.[0]?.delta;
        if (delta?.reasoning_content) yield { type: 'thinking', text: delta.reasoning_content };
        if (delta?.content) yield { type: 'text', text: delta.content };

        if (json.usage) {
          usage = {
            promptTokens: json.usage.prompt_tokens ?? 0,
            reasoningTokens: json.usage.completion_tokens_details?.reasoning_tokens ?? 0,
            textTokens: json.usage.completion_tokens_details?.text_tokens ?? 0,
            totalTokens: json.usage.total_tokens ?? 0,
          };
        }
      }
    }
    yield { type: 'done', usage };
  } catch (err) {
    const aborted = (err as Error)?.name === 'AbortError';
    // 外部主动取消 ≠ 超时，不该报"等太久了"也不该触发重试
    if (aborted && opts.signal?.aborted) {
      yield { type: 'error', error: { code: 'aborted', message: '已取消', retryable: false } };
    } else {
      yield {
        type: 'error',
        error: aborted
          ? { code: 'timeout', message: '等太久了，再试一次吧', retryable: true }
          : { code: 'network_error', message: '网络连不上', retryable: true },
      };
    }
  } finally {
    clearFirstByte();
    clearTimeout(totalTimer);
    opts.signal?.removeEventListener('abort', onAbort);
    // 消费方 break 出 for-await 时会走到这里；不 cancel 的话 TCP 连接会一直挂着
    if (reader) {
      try {
        await reader.cancel();
      } catch {
        /* 流已关闭 */
      }
      try {
        reader.releaseLock();
      } catch {
        /* 已释放 */
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* 对外：流式                                                          */
/* ------------------------------------------------------------------ */
const MAX_CONCURRENT_AI = 6;
let activeAiStreams = 0;
const aiStreamWaiters: Array<() => void> = [];
function acquireAiStream(): Promise<void> {
  if (activeAiStreams < MAX_CONCURRENT_AI) {
    activeAiStreams++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => aiStreamWaiters.push(resolve));
}
function releaseAiStream(): void {
  const w = aiStreamWaiters.shift();
  if (w) w();
  else if (activeAiStreams > 0) activeAiStreams--;
}
/**
 * 流式对话。自动处理重试与模型降级。
 * 调用方只需消费 chunk，无需关心底层失败。
 */
export async function* chatStream(opts: ChatOptions): AsyncGenerator<AiChunk> {
  if (!enabled) {
    yield { type: 'error', error: { code: 'disabled', message: 'AI 功能已关闭', retryable: false } };
    return;
  }

  // P2-4：客户端并发上限，避免多组件同发打满代理/后端闸门
  await acquireAiStream();
  try {
  const cfg = sceneConfig(opts.scene);
  const started = Date.now();

  // 缓存命中：一次性吐出，避免孩子重复等十几秒
  if (opts.cacheKey) {
    const hit = cacheGet(`${opts.scene}:${opts.cacheKey}`);
    if (hit) {
      yield { type: 'text', text: hit };
      yield { type: 'done' };
      log({ at: Date.now(), scene: opts.scene, model: 'cache', ms: Date.now() - started, ok: true, cached: true });
      return;
    }
  }

  // 离线预判：navigator.onLine === false 时直接降级到本地兜底，
  // 避免 fetch 在断网下挂到超时（首字节 25s + 全程 90s），孩子等不到响应就放弃了。
  // 仅在浏览器环境生效，SSR / 测试环境无 navigator 时跳过。
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    yield {
      type: 'error',
      error: { code: 'network_error', message: '网络连不上，先用本地内容哦', retryable: false },
    };
    log({
      at: Date.now(),
      scene: opts.scene,
      model: 'offline',
      ms: Date.now() - started,
      ok: false,
      errCode: 'offline',
    });
    return;
  }

  // 去重：主模型可能与 fallback 重复，重复跑一遍纯属浪费
  const chain = [...new Set([opts.model || cfg.model, ...cfg.fallback])];
  let lastError: AiError | undefined;

  for (let mi = 0; mi < chain.length; mi++) {
    const model = chain[mi]!!

    for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
      if (opts.signal?.aborted) {
        yield { type: 'error', error: { code: 'aborted', message: '已取消', retryable: false } };
        return;
      }

      let text = '';
      let failed: AiError | undefined;
      let usage: AiUsage | undefined;
      let emitted = false;

      for await (const chunk of streamOnce(model, opts, cfg)) {
        if (chunk.type === 'error') {
          failed = chunk.error;
          break;
        }
        if (chunk.type === 'done') {
          usage = chunk.usage;
          break;
        }
        if (chunk.type === 'text') {
          text += chunk.text;
          emitted = true;
        }
        yield chunk;
      }

      // 成功
      if (!failed && text.trim()) {
        if (opts.cacheKey) {
          cacheSet(`${opts.scene}:${opts.cacheKey}`, text, opts.cacheTtl);
        }
        yield { type: 'done', usage };
        log({
          at: Date.now(),
          scene: opts.scene,
          model,
          ms: Date.now() - started,
          ok: true,
          textTokens: usage?.textTokens,
          reasoningTokens: usage?.reasoningTokens,
        });
        return;
      }

      // 有响应但正文为空：推理模型的典型症状（思考链吃光 max_tokens）
      const err: AiError = failed ?? {
        code: 'empty_content',
        message: '模型只思考没说话',
        retryable: true,
      };
      lastError = err;

      // 用户主动取消：立刻停，不重试也不降级
      if (err.code === 'aborted') {
        yield { type: 'error', error: err };
        return;
      }

      /**
       * ⚠️ 已经吐出过部分内容 → 整体收尾，既不重试也不换模型。
       * 原来只 break 内层，外层会拿下一个模型从头重跑一遍，
       * 用户屏幕上就出现"半句 + 完整一句"的重复文字。
       * 半截内容也比报错强，按 done 收尾，日志标记 partial。
       */
      if (emitted) {
        yield { type: 'done', usage };
        log({
          at: Date.now(),
          scene: opts.scene,
          model,
          ms: Date.now() - started,
          ok: true,
          errCode: `partial:${err.code}`,
        });
        return;
      }

      if (!err.retryable) break;
      if (attempt < RETRY_MAX) await sleep(RETRY_BASE_MS * 2 ** attempt);
    }

    // 这个模型彻底不行，换下一个
    if (lastError && (lastError.code === 'unauthorized' || lastError.code === 'invalid_request')) {
      break; // 换模型也救不了
    }
  }

  const err = lastError ?? { code: 'unknown' as const, message: '未知错误', retryable: false };
  yield { type: 'error', error: err };
  log({
    at: Date.now(),
    scene: opts.scene,
    model: chain[0]!,
    ms: Date.now() - started,
    ok: false,
    errCode: err.code,
  });
  } finally {
    releaseAiStream();
  }
}

/* ------------------------------------------------------------------ */
/* 对外：非流式                                                        */
/* ------------------------------------------------------------------ */
/** 一次性拿完整结果。内部仍走流式，便于复用重试与降级逻辑。 */
export async function chat(opts: ChatOptions): Promise<AiResult> {
  const started = Date.now();
  let text = '';
  let thinking = '';
  let usage: AiUsage | undefined;
  let error: AiError | undefined;

  for await (const chunk of chatStream(opts)) {
    if (chunk.type === 'text') text += chunk.text;
    else if (chunk.type === 'thinking') thinking += chunk.text;
    else if (chunk.type === 'done') usage = chunk.usage;
    else if (chunk.type === 'error') error = chunk.error;
  }

  return {
    ok: !error && !!text.trim(),
    text: text.trim(),
    thinking: thinking.trim() || undefined,
    usage,
    error,
    ms: Date.now() - started,
  };
}

/**
 * 探活：家长中心显示服务状态。
 * 必须带超时——代理进程挂死时 fetch 会一直悬着，家长中心的"检测中"转圈转到天荒地老。
 */
export async function aiHealth(timeoutMs = 6000): Promise<{ ok: boolean; model?: string }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(HEALTH_URL, {
      method: 'GET',
      signal: ac.signal,
    });
    if (!res.ok) return { ok: false };
    const j = (await res.json()) as { ok?: boolean; model?: string };
    return { ok: !!j.ok, model: j.model };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
