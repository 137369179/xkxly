/**
 * 闯关里程碑条（StreakBar）
 * ------------------------------------------------------------------
 * 游戏化「闯关感」组件：显示本轮连续答对进度。
 *  - target 个圆点，当前 streak 个点亮（对勾），形成"再答对几题就通关"的目标感
 *  - 答错归零 → 温和引导（由调用方处理，本组件只负责进度可视化）
 * 纯展示组件，可被任意题卷式模块复用（数字/拼音/古诗等）。
 */
import { cn } from '@/lib/utils';

interface Props {
  /** 当前连续答对数（0..target） */
  streak: number;
  /** 一轮目标连对数 */
  target: number;
  /** 主题色（Tailwind 语义色，默认黄/数字主题） */
  tone?: 'yellow' | 'green' | 'purple' | 'pink' | 'blue';
  className?: string;
}

const TONE_DOT: Record<NonNullable<Props['tone']>, string> = {
  yellow: 'bg-candy-yellow-deep',
  green: 'bg-candy-green-deep',
  purple: 'bg-candy-purple-deep',
  pink: 'bg-candy-pink-deep',
  blue: 'bg-candy-blue-deep',
};
const TONE_EMPTY = 'bg-white/80 border border-ink-soft/25';

export function StreakBar({ streak, target, tone = 'yellow', className }: Props) {
  const dots = Array.from({ length: target }, (_, i) => i < streak);
  const filled = TONE_DOT[tone];
  return (
    <div
      data-testid="streak-bar"
      className={cn('flex items-center justify-center gap-2 rounded-2xl bg-amber-50/70 px-3 py-2', className)}
    >
      {dots.map((on, i) => (
        <span
          key={i}
          data-testid={`streak-dot-${i}`}
          data-on={on ? '1' : '0'}
          className={cn(
            'grid h-7 w-7 place-items-center rounded-full text-sm font-black text-white shadow-sm transition-all',
            on ? filled : TONE_EMPTY,
          )}
        >
          {on ? '✓' : i + 1}
        </span>
      ))}
    </div>
  );
}