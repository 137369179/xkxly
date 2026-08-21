/**
 * 番茄钟（纯逻辑，可单测）
 * 工作/休息可配置；结束由宠物动画+音效提醒（由 UI 监听 finish）。
 */
export interface PomodoroConfig {
  workMin: number;
  restMin: number;
}
export type PomodoroPhase = 'idle' | 'work' | 'rest';

export interface PomodoroState {
  phase: PomodoroPhase;
  /** 距阶段结束剩余毫秒 */
  remainingMs: number;
  cycles: number;
  /** 本次阶段经历过的段数（用于 UI 计数） */
  step: number;
}

export function createPomodoro(_config?: PomodoroConfig): PomodoroState {
  return { phase: 'idle', remainingMs: 0, cycles: 0, step: 0 };
}

export const POMODORO_MIN_MS = 60_000;

export function startPhase(
  state: PomodoroState,
  phase: Exclude<PomodoroPhase, 'idle'>,
  config: PomodoroConfig,
): PomodoroState {
  const minutes = phase === 'work' ? config.workMin : config.restMin;
  return {
    ...state,
    phase,
    remainingMs: minutes * POMODORO_MIN_MS,
    cycles: phase === 'work' ? state.cycles : state.cycles, // 完成一轮由 tick 累加
  };
}

export interface PomodoroTick {
  state: PomodoroState;
  /** 是否刚结束一个阶段（应触发提醒） */
  finished: boolean;
}

/** 推进时钟；返回新状态（含跨段自动切换：work→rest，rest→(idle) 并累计 cycles） */
export function tickPomodoro(
  state: PomodoroState,
  config: PomodoroConfig,
  deltaMs: number,
): PomodoroTick {
  if (state.phase === 'idle') return { state, finished: false };
  const remaining = state.remainingMs - deltaMs;
  if (remaining > 0) {
    return { state: { ...state, remainingMs: remaining }, finished: false };
  }
  // 阶段结束
  if (state.phase === 'work') {
    return {
      state: startPhase({ ...state, remainingMs: 0 }, 'rest', config),
      finished: true,
    };
  }
  // rest 结束 → 回到 idle，完成一轮
  return {
    state: { phase: 'idle', remainingMs: 0, cycles: state.cycles + 1, step: 0 },
    finished: true,
  };
}

export function formatRemain(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}