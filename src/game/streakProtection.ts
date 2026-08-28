/**
 * streakProtection — R 层（留存与习惯养成）核心原语
 * ─────────────────────────────────────────────────────────────────
 * 实现 Duolingo 验证过的 "never-miss-twice"（连续保护安全网）范式
 * （见 R137 留存专项研究：安全网使流失率下降、连续天数更稳健）。
 *
 * 设计约束（与既有 @/game 基础设施一致）：
 *  - 纯函数模块，零 React 依赖、零用户 WIP 依赖 → 可安全新建、零回归风险；
 *  - 仅依赖本地日期工具，不引入网络 / 存储副作用；
 *  - 三核心（hanzi / words / numbers）练习闭环收敛 WIP 后，可通过
 *    `import { registerActivity, grantFreeze } from '@/game/streakProtection'`
 *    （或在当前隔离期以相对路径）增量挂载，学习逻辑零改动。
 *
 * 儿童友好：断签 1 天且有保护卡时温和续接（不惩罚、不焦虑），
 * 契合 Core Loop v2「协作 > 竞争 / 反馈质量 > 奖励 / 2 胜即停」基调。
 */

export interface StreakState {
  /** 当前连续学习天数 */
  current: number;
  /** 历史最长连续天数 */
  longest: number;
  /** 最近活跃日，ISO 本地日期 yyyy-mm-dd；从未活跃为 null */
  lastActiveDate: string | null;
  /** 剩余连续保护卡数量（奖励解锁时发放） */
  freezesRemaining: number;
}

export type StreakEvent =
  | 'initialized' // 首次激活
  | 'extended' // 连续 +1
  | 'unchanged' // 同一天重复激活
  | 'protected' // 断 1 天，消耗保护卡续接
  | 'broken'; // 断签超过保护卡可覆盖范围

export interface StreakUpdate {
  state: StreakState;
  event: StreakEvent;
  /** 本次是否消耗了一张保护卡 */
  freezeUsed: boolean;
}

export const INITIAL_STREAK: StreakState = {
  current: 0,
  longest: 0,
  lastActiveDate: null,
  freezesRemaining: 0,
};

/** 返回本地时区的 yyyy-mm-dd（避免 UTC 偏移导致跨日误判） */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 两个 yyyy-mm-dd 之间的整天数差（b - a；忽略时分秒） */
export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return NaN;
  const ms = db.getTime() - da.getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * 记录一次学习活跃，返回新的连续状态。
 * 规则：
 *  - 从未活跃 → initialized（current=1）
 *  - 同一天再次活跃 → unchanged
 *  - 距上次恰好 1 天 → extended（current+1）
 *  - 距上次 >1 天但 ≤ (1 + freezesRemaining) 天且有保护卡 → protected（消耗 1 张，current 维持/延续）
 *  - 否则 → broken（current 归 0，lastActiveDate 更新为今天，保护卡保留）
 */
export function registerActivity(
  state: StreakState,
  today: string = todayISO(),
): StreakUpdate {
  if (!state) return { state: { ...INITIAL_STREAK }, event: 'broken', freezeUsed: false };

  // 首次激活
  if (!state.lastActiveDate) {
    const next: StreakState = {
      current: 1,
      longest: Math.max(1, state.longest),
      lastActiveDate: today,
      freezesRemaining: state.freezesRemaining,
    };
    return { state: next, event: 'initialized', freezeUsed: false };
  }

  const gap = daysBetween(state.lastActiveDate, today);
  if (Number.isNaN(gap)) {
    // 日期解析异常时保守维持，不破坏既有进度
    return { state: { ...state, lastActiveDate: today }, event: 'unchanged', freezeUsed: false };
  }

  // 同一天
  if (gap === 0) {
    return { state: { ...state }, event: 'unchanged', freezeUsed: false };
  }

  // 完美衔接：恰好隔 1 天
  if (gap === 1) {
    const current = state.current + 1;
    const next: StreakState = {
      current,
      longest: Math.max(current, state.longest),
      lastActiveDate: today,
      freezesRemaining: state.freezesRemaining,
    };
    return { state: next, event: 'extended', freezeUsed: false };
  }

  // 断签：可用保护卡覆盖（gap-1 张内）
  const needed = gap - 1;
  if (needed <= state.freezesRemaining) {
    const current = state.current + 1;
    const next: StreakState = {
      current,
      longest: Math.max(current, state.longest),
      lastActiveDate: today,
      freezesRemaining: state.freezesRemaining - needed,
    };
    return { state: next, event: 'protected', freezeUsed: needed > 0 };
  }

  // 断签超出保护能力：归零（保留已有保护卡，不惩罚式清空）
  const next: StreakState = {
    current: 1,
    longest: state.longest,
    lastActiveDate: today,
    freezesRemaining: state.freezesRemaining,
  };
  return { state: next, event: 'broken', freezeUsed: false };
}

/** 奖励解锁时发放连续保护卡（默认 +1，封顶 5 张避免无限囤积） */
export function grantFreeze(state: StreakState, count = 1, cap = 5): StreakState {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return { ...state };
  return {
    ...state,
    freezesRemaining: Math.min(cap, state.freezesRemaining + n),
  };
}
