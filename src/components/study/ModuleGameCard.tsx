import { type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

type Tone = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'orange';

export interface ModuleGameCardProps {
  /** 功能图标（emoji 或节点） */
  emoji: ReactNode;
  /** 功能名称 */
  title: string;
  /** 功能描述（一句话卖点） */
  desc?: string;
  /** 掌握度 0-100，驱动进度条与解锁态 */
  progress?: number;
  /** 已掌握数量（与 total 搭配显示「已点亮 N」） */
  masteredCount?: number;
  /** 总量 */
  totalCount?: number;
  /** 本功能累计/关联星星数（可选，用于成就感可视化） */
  stars?: number;
  /** 主题色（与全站 candy 语义色一致） */
  tone?: Tone;
  /** 是否锁定（未达到前置条件） */
  locked?: boolean;
  /** 当前是否选中（渲染 aria-pressed，供无障碍与测试） */
  pressed?: boolean;
  /** 点击进入回调 */
  onEnter?: () => void;
  /** 测试 id */
  testId?: string;
}

const toneChip: Record<Tone, string> = {
  blue: 'from-sky-400 to-blue-500 text-candy-blue-on',
  green: 'from-emerald-400 to-green-500 text-candy-green-on',
  yellow: 'from-amber-300 to-yellow-500 text-amber-950',
  red: 'from-rose-400 to-red-500 text-candy-pink-on',
  purple: 'from-violet-400 to-purple-500 text-candy-purple-on',
  pink: 'from-[#FF5C8A] to-[#FF9EBA] text-white',
  orange: 'from-orange-300 to-orange-500 text-orange-950',
};

const toneBar: Record<Tone, 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'orange'> = {
  blue: 'blue',
  green: 'green',
  yellow: 'yellow',
  red: 'red',
  purple: 'purple',
  pink: 'pink',
  orange: 'orange',
};

/**
 * 游戏化功能卡（ModuleGameCard）
 * 统一承载「每个学习功能独立玩法」的入口激励可视化：
 * 进度条 + 掌握数 + 星星 + 解锁态 + 进入微动画。
 * 纯 UI，零副作用，复用既有 ProgressBar / store 数据，范围内零逻辑改写。
 */
export function ModuleGameCard({
  emoji,
  title,
  desc,
  progress = 0,
  masteredCount,
  totalCount,
  stars,
  tone = 'blue',
  locked = false,
  pressed = false,
  onEnter,
  testId,
}: ModuleGameCardProps) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const isStarted = pct > 0;

  return (
    <motion.button
      type="button"
      data-testid={testId}
      aria-pressed={pressed}
      disabled={locked}
      onClick={locked ? undefined : onEnter}
      whileHover={locked ? undefined : { scale: 1.03 }}
      whileTap={locked ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className={cn(
        'group relative flex w-full flex-col gap-2 rounded-3xl border-2 p-4 text-left shadow-sm transition-colors',
        locked
          ? 'cursor-not-allowed border-gray-200 bg-gray-50/80'
          : 'border-transparent bg-white/95 hover:border-current/20 active:shadow-md',
      )}
      style={!locked ? { borderColor: 'transparent' } : undefined}
    >
      {/* 顶部：图标 + 名称 + 解锁态 */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-2xl shadow-sm',
            toneChip[tone],
            locked && 'from-gray-300 to-gray-400 text-white',
          )}
        >
          {locked ? '🔒' : emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-base font-black', locked ? 'text-gray-400' : 'text-ink')}>
            {title}
          </p>
          {desc && (
            <p className="truncate text-xs font-semibold text-ink-soft">{desc}</p>
          )}
        </div>
      </div>

      {/* 进度条 + 掌握数 */}
      <div className="space-y-1">
        <ProgressBar
          value={pct}
          max={100}
          color={toneBar[tone]}
          size="sm"
          showValue={false}
          animated
        />
        <div className="flex items-center justify-between text-xs font-bold">
          <span className={locked ? 'text-gray-400' : 'text-ink-soft'}>
            {totalCount != null && masteredCount != null
              ? `已点亮 ${masteredCount}/${totalCount}`
              : isStarted
                ? `进度 ${pct}%`
                : '还没开始哦'}
          </span>
          {stars != null && stars > 0 && !locked && (
            <span className="flex items-center gap-0.5 text-amber-500">⭐ {stars}</span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
