/**
 * AI 思考期 · 可爱过渡动画
 * ------------------------------------------------------------------
 * 替代纯「三点加载」，让孩子在推理模型思考的数秒内也感知「小茜在认真想」
 * （推理模型 reasoning 可能吃掉 5~12s，只有三点会让孩子以为卡死了）。
 *
 * 视觉：Q弹思考气泡呼吸 + 轮换童趣话术 + 一组进度圆点。
 * 进度圆点由 useAiStream 的思考分片计数驱动（thought 递增），
 * 让动画有「真实在进展」的感知，而非固定假转圈；思考文本本身仍不展示给孩子。
 */
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TONE_STYLE, type Tone } from '@/lib/tones';

/** 轮换话术（儿童口吻） */
const PHRASES = ['小茜正在想…', '脑袋转呀转…', '快想到啦 ~', '托着下巴想一想…', '马上就好啦 ~'];
const CYCLE_MS = 1500;

export function AiThinking({
  thought = 0,
  hint,
  compact = false,
  tone = 'purple',
  bubble = true,
}: {
  /** useAiStream 的思考分片计数（递增），驱动进度圆点；不展示思考文本 */
  thought?: number;
  /** 场景化提示语，若提供则作为首条话术 */
  hint?: string;
  compact?: boolean;
  tone?: Tone;
  /** 是否带左侧 Q弹思考气泡（AiPanel 头部已有头像时可传 false 避免重复） */
  bubble?: boolean;
}) {
  const t = TONE_STYLE[tone]!;
  const list = hint ? [hint, ...PHRASES] : PHRASES;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % list.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [list.length]);

  // 用真实思考分片数驱动 1..5 个圆点亮起：思考推进 → 圆点增多，营造「在思考」的进展感
  const steps = Math.min(5, ((thought ?? 0) % 6) + 1);

  return (
    <div className={cn('flex items-center gap-2.5', compact && 'gap-2')}>
      {bubble && (
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.14, 1], rotate: [0, 4, -4, 0] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'grid shrink-0 place-items-center rounded-full',
            compact ? 'h-9 w-9 text-xl' : 'h-12 w-12 text-2xl',
          )}
          style={{
            background: t.soft,
            border: `2px solid ${t.main}66`,
            boxShadow: `0 3px 0 0 ${t.main}44`,
          }}
        >
          💭
        </motion.span>
      )}

      <div className="flex min-w-0 flex-col gap-1.5">
        <AnimatePresence mode="wait">
          <motion.span
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="truncate text-base font-bold leading-tight"
            style={{ color: t.deep }}
          >
            {list[idx]!}
          </motion.span>
        </AnimatePresence>

        <div className="flex items-center gap-1" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className={cn('h-1.5 w-1.5 rounded-full', i < steps ? '' : 'opacity-30')}
              style={{ background: t.main }}
              animate={i < steps ? { opacity: [0.6, 1, 0.6] } : undefined}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}