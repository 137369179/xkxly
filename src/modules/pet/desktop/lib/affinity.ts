/**
 * 好感度系统（纯逻辑，可单测）
 * 8 种互动类型、每日次数上限、等级提升、里程碑庆祝。
 */
import {
  INTERACTIONS,
  AFFINITY_LEVELS,
  MAX_LEVEL,
  type InteractionType,
  type InteractionSpec,
} from '../data';

export interface AffinityState {
  /** 累计好感度 exp */
  exp: number;
  /** 按「互动类型」记当日已用次数：key = today 日期 */
  interacted: Record<string, Partial<Record<InteractionType, number>>>;
}

export const emptyAffinity = (): AffinityState => ({ exp: 0, interacted: {} });

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function interactionSpec(type: InteractionType): InteractionSpec {
  return INTERACTIONS.find((i: InteractionSpec) => i.type === type) ?? INTERACTIONS[0]!;
}

/** 当前好感度等级（1..MAX_LEVEL） */
export function affinityLevel(exp: number): number {
  let lv = 1;
  for (let i = 0; i < AFFINITY_LEVELS.length; i++) {
    if (exp >= AFFINITY_LEVELS[i]!) lv = i + 1;
  }
  return lv;
}

export interface LevelProgress {
  level: number;
  /** 0..1 本等级内进度 */
  progress: number;
  /** 距下一级还需 exp；满级为 null */
  toNext: number | null;
}
export function levelProgress(exp: number): LevelProgress {
  const level = affinityLevel(exp);
  if (level >= MAX_LEVEL) {
    return { level, progress: 1, toNext: null };
  }
  const floor = AFFINITY_LEVELS[level - 1]!;
  const ceil = AFFINITY_LEVELS[level]!;
  return { level, progress: (exp - floor) / (ceil - floor), toNext: ceil - exp };
}

/** 某互动类型当日还能不能继续（遵守每日上限） */
export function canInteractToday(
  state: AffinityState,
  type: InteractionType,
  now: Date = new Date(),
): boolean {
  const spec = interactionSpec(type);
  const used = state.interacted[todayKey(now)]?.[type] ?? 0;
  return used < spec.daily;
}

/**
 * 记录一次互动。返回新状态 + 是否升级（用于里程碑庆祝）与本次收获。
 */
export function addInteraction(
  state: AffinityState,
  type: InteractionType,
  now: Date = new Date(),
): { state: AffinityState; leveledUp: boolean; gained: number } {
  const spec = interactionSpec(type);
  const day = todayKey(now);
  const used = state.interacted[day]?.[type] ?? 0;
  // 已达当日上限则本次不生效
  if (used >= spec.daily) return { state, leveledUp: false, gained: 0 };

  const before = affinityLevel(state.exp);
  const next: AffinityState = {
    exp: state.exp + spec.exp,
    interacted: {
      ...state.interacted,
      [day]: { ...state.interacted[day], [type]: used + 1 },
    },
  };
  const after = affinityLevel(next.exp);
  return { state: next, leveledUp: after > before, gained: spec.exp };
}

/** 里程碑文案：升级到新等级时触发庆祝 */
export function milestoneBanner(level: number): string | null {
  if (level < 2) return null;
  return `好感度升到 ${level} 级啦！`;
}