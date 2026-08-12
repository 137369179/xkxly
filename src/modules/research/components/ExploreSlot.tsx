import { Suspense, lazy, useCallback } from 'react';
import type { ExploreSlotKey } from '@/lib/research/types';

/**
 * 探索媒体槽适配器（D2 / 主架构 §4.5）
 * ------------------------------------------------------------------
 * 复用 6 个既有 Explore 组件的 **lazy 注册表**：编排层只认 ExploreSlotKey，
 * 不感知各组件 props 差异（实测全部零 props，具名导出）。
 *
 * 行为采集（F19 / C-4 防虚高）：
 *   - 既有组件内部**没有** data-explore-action 标记，故将「媒体互动区容器」
 *     本身标记为 data-explore-action：孩子点颜色/恐龙/职业卡 = 探索行为 ✓
 *   - 事件委托 onClickCapture + closest 校验，保证只统计媒体区内的交互，
 *     操作条（「还有吗」「换主题」）在容器外，**不**计入 exploreActions ✓
 *
 * 降级：lazy 失败 / 挂载异常 → Suspense 兜底占位，不阻断研究闭环。
 */

/** lazy 注册表：槽位键 → 组件（具名导出，实测全部 memo 组件） */
const SLOT_REGISTRY: Record<ExploreSlotKey, React.LazyExoticComponent<React.ComponentType>> = {
  color: lazy(() => import('@/components/ColorExplore').then((m) => ({ default: m.ColorExplore }))),
  vehicle: lazy(() => import('@/components/VehicleExplore').then((m) => ({ default: m.VehicleExplore }))),
  job: lazy(() => import('@/components/JobExplore').then((m) => ({ default: m.JobExplore }))),
  dino: lazy(() => import('@/modules/science/components/DinoWorld').then((m) => ({ default: m.DinoWorld }))),
  space: lazy(() => import('@/modules/science/components/SpaceExplorer').then((m) => ({ default: m.SpaceExplorer }))),
  body: lazy(() => import('@/modules/science/components/BodyAdventure').then((m) => ({ default: m.BodyAdventure }))),
};

function ExploreFallback() {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-2xl bg-soft text-ink-soft">
      <span className="text-sm">🔭</span>
    </div>
  );
}

interface ExploreSlotProps {
  slotKey: ExploreSlotKey;
  /** 探索行为计数回调（媒体区交互时触发，C-4 防虚高） */
  onExploreAction?: () => void;
}

export function ExploreSlot({ slotKey, onExploreAction }: ExploreSlotProps) {
  const Component = SLOT_REGISTRY[slotKey] ?? null;

  const handleCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // C-4 防虚高：媒体区容器带 data-explore-action，任何内部交互都计一次；
      // 容器外（操作条等）不会命中 closest → 不计入 exploreActions
      if (!onExploreAction) return;
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === 'function' && target.closest('[data-explore-action]')) {
        onExploreAction();
      }
    },
    [onExploreAction],
  );

  return (
    <div className="relative overflow-hidden rounded-2xl" onClickCapture={handleCapture}>
      {Component ? (
        <div data-explore-action className="min-h-[180px]">
          <Suspense fallback={<ExploreFallback />}>
            <Component />
          </Suspense>
        </div>
      ) : (
        <ExploreFallback />
      )}
    </div>
  );
}
