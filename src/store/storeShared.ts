import { dateKey } from '@/lib/dailyPlan';
import type { Progress } from '@/types';
import { createInitialProgress } from '@/lib/progress';
import type { StoreApi } from 'zustand';
import type { StoreState } from './useStore';

export type SliceSet = StoreApi<StoreState>['setState'];
export type SliceGet = StoreApi<StoreState>['getState'];
export type SliceCreator<Slice> = (set: SliceSet, get: SliceGet) => Slice;

export const todayStr = () => dateKey();
export const initialProgress: Progress = createInitialProgress();

/** 是否为纯对象（非数组、非 null），用于深合并判定 */
export function isPlainObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 真正深合并（P2-8）：以初始值为底、覆盖层优先，补齐缺失的新字段默认值；
 * 数组与原始值直接以覆盖层为准。
 */
export function deepMergeProgress(base: Progress, override: Partial<Progress>): Progress {
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override) as (keyof Progress)[]) {
    const ov = override[key];
    if (ov === undefined) continue;
    const bv = (base as unknown as Record<string, unknown>)[key];
    if (isPlainObj(ov) && isPlainObj(bv)) {
      out[key] = { ...bv, ...ov };
    } else {
      out[key] = ov;
    }
  }
  return out as unknown as Progress;
}

/**
 * S2 错误连续计数（P3 抽公共函数）：连错 >=3 且未安抚时触发安抚并清零，否则累计；答对则清零。
 * 改为接收 set，避免对 useStore 的模块级依赖（切片安全）。
 */
export function scheduleWrongStreakUpdate(
  set: SliceSet,
  prevStreak: number,
  comfortingActive: boolean,
  correct: boolean,
) {
  if (correct) {
    queueMicrotask(() => set({ wrongStreak: 0 }));
    return;
  }
  const nextStreak = prevStreak + 1;
  if (nextStreak >= 3 && !comfortingActive) {
    queueMicrotask(() => set({ wrongStreak: 0, comfortingActive: true }));
  } else {
    queueMicrotask(() => set({ wrongStreak: nextStreak }));
  }
}
