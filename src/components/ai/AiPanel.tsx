/**
 * AI 内容面板 —— 全站所有「小茜说话」的唯一容器
 * ------------------------------------------------------------------
 * 交互一致性靠这一个组件保证：
 *   思考中 → 头像抖动 + 三点动画 + 场景化提示语
 *   生成中 → 正文逐字出现 + 光标
 *   完成   → 朗读按钮 + 换一个说法
 *   兜底   → 静默切本地内容，只用一行小字说明，绝不弹错误框吓到孩子
 */
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { AiAvatar } from './AiAvatar';
import { AiThinking } from './AiThinking';
import { RubyText } from './RubyText';
import type { AiStreamState } from '@/lib/ai/useAi';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { speak, speechSupported, stopSpeaking } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

function IconSpeak() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function AiPanel({
  state,
  tone = 'purple',
  title,
  className,
  showActions = true,
  compact = false,
}: {
  state: AiStreamState;
  tone?: Tone;
  /** 覆盖任务自带的标题 */
  title?: string;
  className?: string;
  showActions?: boolean;
  compact?: boolean;
}) {
  const { t: tr } = useTranslation();
  const t = TONE_STYLE[tone]!
  const { status, text, fallback, task, run, thought } = state;
  const [speaking, setSpeaking] = useState(false);
  const [showPinyin, setShowPinyin] = useState(false);
  /**
   * ⚠️ stopSpeaking 是全局的。旧代码在卸载时无条件调用，
   * 页面上任何一个 AiPanel 消失都会掐断别处正在进行的朗读（比如古诗范读）。
   * 只有"是我在读"才由我来停。
   */
  const speakingRef = useRef(false);
  speakingRef.current = speaking;

  useEffect(
    () => () => {
      if (speakingRef.current) stopSpeaking();
    },
    [],
  );

  if (status === 'idle') return null;

  const heading = title ?? task?.title ?? '小茜说';
  const thinking = status === 'thinking';
  const mood = thinking ? 'thinking' : status === 'streaming' ? 'talking' : 'idle';

  const onSpeak = () => {
    sfxTap();
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    if (!text.trim()) return;
    setSpeaking(true);
    // 朗读失败（无可用音色、被系统打断）不该冒泡成 unhandledrejection
    speak(text, { lang: 'zh-CN', rate: 0.92, module: 'ai' })
      .catch(() => undefined)
      .finally(() => setSpeaking(false));
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn('rounded-[1.4rem] border-2', compact ? 'p-3' : 'p-4 sm:p-5', className)}
      style={{ background: t.soft, borderColor: `${t.main}55` }}
    >
      <header className="mb-2 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <AiAvatar size={compact ? 32 : 38} mood={mood} />
          <span className="text-base font-extrabold sm:text-lg" style={{ color: t.deep }}>
            {heading}
          </span>
        </div>
        {status === 'done' && (
          <button
            type="button"
            onClick={() => {
              sfxTap();
              setShowPinyin((v) => !v);
            }}
            className={cn(
              'rounded-xl px-2.5 py-1 text-xs font-black transition active:scale-95 border',
              showPinyin ? 'bg-pink-500 text-candy-pink-on border-pink-600' : 'bg-white text-pink-700 border-pink-200',
            )}
          >
            {showPinyin ? '🔤 纯汉字' : '拼 拼音'}
          </button>
        )}
      </header>

      <AnimatePresence mode="wait">
        {thinking ? (
          <motion.div
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AiThinking thought={thought} hint={task?.hint} bubble={false} tone={tone} />
          </motion.div>
        ) : (
          <motion.div key="body" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div
              className={cn(
                'whitespace-pre-wrap break-words font-medium',
                compact ? 'text-base leading-relaxed' : 'text-lg leading-8',
              )}
              style={{ color: '#4a2b1f' }}
            >
              {showPinyin ? <RubyText text={text} /> : text}
              {status === 'streaming' && (
                <motion.span
                  className="ml-0.5 inline-block h-[1em] w-[3px] translate-y-[2px] rounded-full"
                  style={{ background: t.main }}
                  animate={{ opacity: [1, 0.15, 1] }}
                  transition={{ duration: 0.85, repeat: Infinity }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showActions && status === 'done' && (
        <footer className="mt-3 flex flex-wrap items-center gap-2">
          {speechSupported && text && (
            <button
              type="button"
              onClick={onSpeak}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-3.5 text-sm font-bold transition active:translate-y-[2px]"
              style={{ background: '#FFFFFF', color: t.deep, boxShadow: `0 3px 0 0 ${t.main}44` }}
            >
              <IconSpeak />
              {speaking ? tr('common.stop') : tr('common.readToMe')}
            </button>
          )}
          {task && (
            <button
              type="button"
              onClick={() => {
                sfxTap();
                // 重新生成：绕开缓存，换一种说法
                run({ ...task, cacheKey: undefined });
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-3.5 text-sm font-bold transition active:translate-y-[2px]"
              style={{ background: '#FFFFFF', color: t.deep, boxShadow: `0 3px 0 0 ${t.main}44` }}
            >
              <IconRefresh />
              换个说法
            </button>
          )}
          {fallback && (
            <span className="text-xs text-ink-soft">小茜暂时连不上，这是离线小提示</span>
          )}
        </footer>
      )}
    </motion.section>
  );
}
