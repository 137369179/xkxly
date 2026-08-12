/**
 * 「小智」形象 —— 全站 AI 的统一视觉锚点
 * 纯内联 SVG，无外部依赖；三种状态用同一张脸，只换眼睛与动效。
 */
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export type AvatarMood = 'idle' | 'thinking' | 'talking' | 'sleep' | 'celebrating';

export function AiAvatar({
  size = 40,
  mood = 'idle',
  className,
}: {
  size?: number;
  mood?: AvatarMood;
  className?: string;
}) {
  const bob =
    mood === 'thinking'
      ? { y: [0, -3, 0] }
      : mood === 'talking'
        ? { rotate: [0, -3, 3, 0] }
        : mood === 'celebrating'
          ? { y: [0, -8, 0], rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.15, 1] }
          : { y: 0 };

  return (
    <motion.span
      className={cn('inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
      animate={bob}
      transition={{ duration: mood === 'idle' ? 0 : mood === 'celebrating' ? 0.6 : 1.4, repeat: mood === 'idle' ? 0 : Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      <svg viewBox="0 0 48 48" width={size} height={size}>
        <defs>
          <linearGradient id="zhi-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#BFA6FF" />
            <stop offset="100%" stopColor="#8B6BF0" />
          </linearGradient>
        </defs>
        {/* 天线 */}
        <line x1="24" y1="4" x2="24" y2="11" stroke="#8B6BF0" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="24" cy="4" r="3.2" fill="#FFC93C" />
        {/* 头 */}
        <rect x="6" y="10" width="36" height="30" rx="12" fill="url(#zhi-body)" />
        {/* 面屏 */}
        <rect x="11" y="16" width="26" height="18" rx="9" fill="#FFFFFF" opacity="0.95" />
        {/* 眼睛 */}
        {mood === 'sleep' ? (
          <>
            <path d="M15 25 q3.5 3 7 0" stroke="#5B4A9E" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M26 25 q3.5 3 7 0" stroke="#5B4A9E" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="18.5" cy="24" r="2.9" fill="#5B4A9E" />
            <circle cx="29.5" cy="24" r="2.9" fill="#5B4A9E" />
            <circle cx="19.4" cy="23.1" r="0.95" fill="#FFFFFF" />
            <circle cx="30.4" cy="23.1" r="0.95" fill="#FFFFFF" />
          </>
        )}
        {/* 嘴 */}
        {mood === 'talking' ? (
          <ellipse cx="24" cy="30.5" rx="3.4" ry="2.2" fill="#FF8FB1" />
        ) : mood === 'celebrating' ? (
          <path d="M19 29 q5 5 10 0 q-5 3 -10 0z" fill="#FF8FB1" stroke="none" />
        ) : (
          <path d="M20.5 30 q3.5 2.6 7 0" stroke="#FF8FB1" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}
        {/* 耳朵 */}
        <rect x="2.5" y="20" width="4" height="10" rx="2" fill="#8B6BF0" />
        <rect x="41.5" y="20" width="4" height="10" rx="2" fill="#8B6BF0" />
      </svg>
    </motion.span>
  );
}

/** 思考中的三点动画 */
export function AiDots({ color = '#8B6BF0' }: { color?: string }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label="正在思考">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={`dot-${i}`}
          className="block h-2 w-2 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}
