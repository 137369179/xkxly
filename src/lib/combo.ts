/**
 * 全局连击系统：在连续答对时触发不同庆祝效果。
 * 连击状态不持久化（刷新后重置），只是额外的激励层，
 * 不影响现有的 SRS / practice 逻辑。
 *
 * 连击重置条件：答错、超过 30 秒无答题。
 */

/** 连击庆祝级别 */
export type ComboCelebration = 'small' | 'medium' | 'big';

/** 连击阈值与对应效果 */
export interface ComboThreshold {
  count: number;
  emoji: string;
  celebration: ComboCelebration;
}

/** 连击阈值表：达到对应连击数时触发庆祝 */
export const COMBO_THRESHOLDS: ComboThreshold[] = [
  { count: 3, emoji: '✨', celebration: 'small' },
  { count: 5, emoji: '🌟', celebration: 'medium' },
  { count: 10, emoji: '🔥', celebration: 'big' },
];

/** 连击状态 */
export interface ComboState {
  count: number; // 当前连击数
  bestToday: number; // 今日最高连击
  lastCorrectTime: number; // 上次答对时间戳
}

/** recordCombo 的返回值 */
export interface ComboResult {
  count: number; // 当前连击数
  triggered: boolean; // 是否触发了阈值
  level: number; // 触发的阈值等级索引（-1 表示未触发）
}

/** 连击无答题超时时间（毫秒）：超过则连击清零 */
const COMBO_TIMEOUT_MS = 30_000;

const initialState: ComboState = {
  count: 0,
  bestToday: 0,
  lastCorrectTime: 0,
};

let state: ComboState = { ...initialState };
const listeners = new Set<(count: number) => void>();
let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

function clearInactivityTimer(): void {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

function notify(): void {
  for (const l of listeners) l(state.count);
}

/** 重置无答题计时器：30 秒内无答题则连击清零 */
function scheduleInactivityReset(): void {
  clearInactivityTimer();
  inactivityTimer = setTimeout(() => {
    inactivityTimer = null;
    resetCombo();
  }, COMBO_TIMEOUT_MS);
}

/**
 * 记录答题结果，返回当前连击数和是否触发了阈值。
 * - 答对：连击 +1，达到阈值时返回 triggered=true
 * - 答错：连击清零
 */
export function recordCombo(correct: boolean): ComboResult {
  clearInactivityTimer();

  if (!correct) {
    // 答错：清零连击
    if (state.count !== 0) {
      state = { ...state, count: 0 };
      notify();
    }
    return { count: 0, triggered: false, level: -1 };
  }

  // 答对：连击 +1
  const nextCount = state.count + 1;
  // 查找是否命中阈值
  let level = -1;
  for (let i = 0; i < COMBO_THRESHOLDS.length; i++) {
    if (nextCount === COMBO_THRESHOLDS[i]!.count) {
      level = i;
      break;
    }
  }
  state = {
    count: nextCount,
    bestToday: Math.max(state.bestToday, nextCount),
    lastCorrectTime: Date.now(),
  };
  notify();
  scheduleInactivityReset();
  return { count: nextCount, triggered: level >= 0, level };
}

/** 获取当前连击数 */
export function getCombo(): number {
  return state.count;
}

/** 获取今日最高连击数（用于每日挑战判定） */
export function getBestToday(): number {
  return state.bestToday;
}

/** 重置连击 */
export function resetCombo(): void {
  clearInactivityTimer();
  if (state.count === 0) return;
  state = { ...state, count: 0 };
  notify();
}

/** 订阅连击变化，返回取消订阅函数 */
export function subscribeCombo(listener: (count: number) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
