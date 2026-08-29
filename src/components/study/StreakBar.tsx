/**
 * 闯关里程碑条（StreakBar）
 * ------------------------------------------------------------------
 * 游戏化「闯关感」组件：显示本轮连续答对进度。
 *  - target 个圆点，当前 streak 个点亮（对勾），形成"再答对几题就通关"的目标感
 *  - 答错归零 → 温和引导（由调用方处理，本组件只负责进度可视化）
 *  - 达标融合： streak 首次达到 target 时，弹出一次 Combo 庆祝动画 + 彩带，
 *    之后本轮不再重复触发，直到 streak 归零后再次挑战。
 * 纯展示组件，可被任意题卷式模块复用（数字/拼音/古诗等）。
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { celebrateSmall } from '@/lib/celebrate';
import { safeGetItem } from '@/lib/safeStorage';
import { cn } from '@/lib/utils';

/**
 * StreakBar 达标庆祝调试日志。
 * 运行时通过 `localStorage.setItem('sb_debug','1')` 开启（无需刷新即生效），
 * 关闭则 `localStorage.removeItem('sb_debug')`。用于排查动画触发问题的关键节点：
 * 渲染/达标判定/庆祝触发/计时器/归零重置。默认零开销。
 */
const SB_DEBUG = 'sb_debug';
function sbLog(stage: string, extra?: Record<string, unknown>): void {
  if (safeGetItem(SB_DEBUG) !== '1') return;
  // eslint-disable-next-line no-console
  console.log(`%c[StreakBar] ${stage}`, 'color:#f59e0b;font-weight:bold', { ...extra });
}

interface Props {
  /** 当前连续答对数（0..target） */
  streak: number;
  /** 一轮目标连对数 */
  target: number;
  /** 主题色（Tailwind 语义色，默认黄/数字主题） */
  tone?: 'yellow' | 'green' | 'purple' | 'pink' | 'blue';
  /** 达标庆祝文案模板（可含 {n} 占位连对数） */
  celebrateText?: string;
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

export function StreakBar({
  streak,
  target,
  tone = 'yellow',
  celebrateText = '🎉 {n} 连对！闯关成功！',
  className,
}: Props) {
  const dots = Array.from({ length: target }, (_, i) => i < streak);
  const filled = TONE_DOT[tone];

  // 达标瞬间：streak 首次等于 target 时触发一次 Combo 庆祝
  // 用 ref 记录是否已庆祝过当前轮，避免连续渲染重复触发；streak 归零/回调自动重置信号
  const [celebrating, setCelebrating] = useState(false);
  const hasCelebratedRef = useRef(false);

  sbLog('render', { streak, target, celebrating });
  const justHit = streak === target && streak > 0 && !hasCelebratedRef.current;
  sbLog('judge.justHit', { streak, target, justHit, hasCelebrated: hasCelebratedRef.current });
  // 达标庆祝：仅触发一次；组件卸载时清理计时器
  useEffect(() => {
    if (!justHit) {
      sbLog('celebrate.skipped', { streak, target, hasCelebrated: hasCelebratedRef.current });
      return;
    }
    hasCelebratedRef.current = true;
    setCelebrating(true);
    sbLog('celebrate.small', { streak, target });
    void celebrateSmall();
    const t = setTimeout(() => {
      sbLog('celebrate.end', { streak, target });
      setCelebrating(false);
    }, 1600);
    return () => {
      sbLog('celebrate.cleanup', { streak, target });
      clearTimeout(t);
    };
  }, [justHit]);
  // streak 归零时重置"已庆祝"信号，允许下一轮再次庆祝
  useEffect(() => {
    if (streak === 0) {
      if (hasCelebratedRef.current) sbLog('reset.celebrated', { target });
      hasCelebratedRef.current = false;
    }
  }, [streak]);

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

      {/* 达标 Combo 庆祝动画（与现有连击徽章呼应） */}
      <AnimatePresence>
        {celebrating && (
          <motion.span
            key="combo"
            data-testid="streak-combo"
            initial={{ opacity: 0, y: -10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-0.5 text-xs font-black text-candy-orange-on shadow-md"
          >
            {celebrateText.replace('{n}', String(streak))}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}