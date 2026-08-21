/**
 * 小智问答（多轮）—— 目前用于古诗花园的「AI 导师」
 * ------------------------------------------------------------------
 * 儿童向对话的三个取舍：
 *   1. 以「快捷问题」为主，输入框为辅 —— 5 岁孩子打字很慢
 *   2. 历史只保留最近 3 轮 —— 控 token，也避免模型跑题
 *   3. 输入先过 guardInput，不合适的问题在前端就拦下
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AiAvatar } from './AiAvatar';
import { AiPanel } from './AiPanel';
import { AiThinking } from './AiThinking';
import { useAiStream } from '@/lib/ai/useAi';
import type { StreamTask } from '@/lib/ai/tasks';
import { guardInput } from '@/lib/ai/guard';
import type { AiMessage } from '@/lib/ai/types';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { sfxTap } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';

/** 保留的历史轮数（1 轮 = 一问一答） */
const KEEP_ROUNDS = 3;

export interface ChatTurn {
  q: string;
  a: string;
}

export function AiChat({
  /** 根据「问题 + 历史」构造流式任务 */
  buildTask,
  quickQuestions,
  tone = 'green',
  placeholder = '想问什么，打在这里…',
  /** 一轮问答完成时触发（用于父组件统计/成就等副作用） */
  onDone,
}: {
  buildTask: (question: string | undefined, history: AiMessage[]) => StreamTask;
  quickQuestions: string[];
  tone?: Tone;
  placeholder?: string;
  onDone?: () => void;
}) {
  const t = TONE_STYLE[tone]!
  const { t: translate } = useTranslation();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [tip, setTip] = useState('');
  /**
   * 当前这一轮的问题。空串 = 没有进行中的轮次。
   * ⚠️ 原来这里用的是 useRef —— ref 改了不触发渲染，
   * 「当前轮」的显隐全靠别的 setState 顺带刷新，时序一乱就白屏。改为 state。
   */
  const [asked, setAsked] = useState('');
  const stream = useAiStream();

  const busy = stream.status === 'thinking' || stream.status === 'streaming';

  // 生成结束时把这一轮落到历史里（放 effect 里，避免渲染期改状态）
  useEffect(() => {
    if (stream.status !== 'done' || !asked) return;
    const answer = stream.text.trim();
    if (answer) {
      setTurns((prev) => [...prev, { q: asked, a: answer }].slice(-(KEEP_ROUNDS + 1)));
      onDone?.();
    } else {
      // 空回答：不能把 asked 挂在这儿不管，否则界面永远停在三点动画
      setTip(translate('companion.emptyAnswer'));
    }
    setAsked('');
  }, [stream.status, stream.text, asked]);

  const history = (): AiMessage[] =>
    turns.slice(-KEEP_ROUNDS).flatMap<AiMessage>((x) => [
      { role: 'user', content: x.q },
      { role: 'assistant', content: x.a },
    ]);

  const ask = (raw: string) => {
    const g = guardInput(raw, 60);
    if (!g.ok) {
      setTip(g.reason ?? translate('companion.rephrase'));
      return;
    }
    setTip('');
    setInput('');
    setAsked(g.text);
    stream.run(buildTask(g.text, history()));
  };

  // 卸载时停掉在途请求，避免离开页面后还在烧代理并发额度
  useEffect(() => () => stream.stop(), []); // intentional: only cleanup on unmount

  return (
    <div className="space-y-3">
      {/* 历史对话 */}
      <AnimatePresence initial={false}>
        {turns.map((x, i) => (
          <motion.div
            key={`${i}-${x.q}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex justify-end">
              <span
                className="max-w-[80%] rounded-[1.1rem] rounded-br-md px-4 py-2.5 text-base font-bold"
                style={{ background: t.main, color: t.on }}
              >
                {x.q}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AiAvatar size={30} />
              <span className="max-w-[85%] whitespace-pre-wrap rounded-[1.1rem] rounded-tl-md bg-white px-4 py-2.5 text-base leading-relaxed font-medium text-[#5c2e3d] shadow-sm">
                {x.a}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 当前这轮：问题气泡 + 实时生成的答案 */}
      {asked && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <span
              className="max-w-[80%] rounded-[1.1rem] rounded-br-md px-4 py-2.5 text-base font-bold"
              style={{ background: t.main, color: t.on }}
            >
              {asked}
            </span>
          </div>
          {/*
            ⚠️ 这里原本只画一个三点动画，答案要等落进历史才可见。
            推理模型端到端十几秒，孩子盯着三个点干等，还以为卡死了。
            现在直接把流式面板放出来，逐字可见；答案入历史后 asked 清空，
            面板同步消失，也就不会出现"面板 + 历史"各显示一遍的重影。
          */}
          {stream.status === 'thinking' ? (
            <div className="pl-1">
              <AiThinking thought={stream.thought} compact />
            </div>
          ) : (
            <AiPanel state={stream} tone={tone} compact showActions={false} />
          )}
        </div>
      )}

      {/* 快捷问题 */}
      <div className="flex flex-wrap gap-2">
        {quickQuestions.map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => {
              sfxTap();
              ask(q);
            }}
            className="min-h-[44px] rounded-2xl border-2 bg-white px-3.5 text-sm font-bold transition active:translate-y-[2px] disabled:opacity-50"
            style={{ borderColor: `${t.main}66`, color: t.deep }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* 自由输入（辅助） */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim() && !busy) ask(input);
          }}
          placeholder={placeholder}
          maxLength={60}
          aria-label={translate('companion.inputLabel')}
          /* 16px 起步，避免 iOS 聚焦时自动放大页面 */
          className="min-h-[48px] flex-1 rounded-2xl border-2 bg-white px-4 text-base font-medium outline-none"
          style={{ borderColor: `${t.main}55` }}
        />
        <button
          type="button"
          disabled={busy || !input.trim()}
          onClick={() => ask(input)}
          aria-label={translate('companion.sendLabel')}
          className="min-h-[48px] min-w-[64px] rounded-2xl px-4 text-base font-extrabold transition active:translate-y-[3px] disabled:opacity-50"
          style={{ background: t.main, color: t.on, boxShadow: `0 4px 0 0 ${t.deep}` }}
        >
          {translate('companion.askBtn')}
        </button>
      </div>

      {tip && <p className="text-sm font-bold text-[#c2410c]">{tip}</p>}
    </div>
  );
}
