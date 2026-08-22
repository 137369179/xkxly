/**
 * 桌面宠物 · 状态聚合 reducer（纯，可单测）
 * 汇总好感度/配件/透明度/性格/番茄钟/待办/拼豆/家园。
 */
import {
  addInteraction,
  emptyAffinity,
  levelProgress,
  type AffinityState,
} from './lib/affinity';
import { createPomodoro, startPhase, tickPomodoro, type PomodoroConfig, type PomodoroState } from './lib/pomodoro';
import { todosReducer, type TodosAction, type Todo } from './lib/todos';
import type { AccessoryId, InteractionType, PersonalityId } from './data';

export interface PetState {
  affinity: AffinityState;
  accessories: AccessoryId[];
  opaqueness: number; // 0.3..1
  personality: PersonalityId;
  pomodoro: PomodoroState;
  pomodoroConfig: PomodoroConfig;
  todos: Todo[];
  /** 拼豆外观（序列化网格），null=默认外观 */
  pixel: string | null;
  home: boolean; // 是否回到家园
}

export const defaultPetState = (): PetState => ({
  affinity: emptyAffinity(),
  accessories: [],
  opaqueness: 1,
  personality: 'gentle',
  pomodoro: createPomodoro(),
  pomodoroConfig: { workMin: 25, restMin: 5 },
  todos: [],
  pixel: null,
  home: false,
});

export interface PetActionResult {
  state: PetState;
  /** 好感度升级（里程碑庆祝） */
  leveledUp: boolean;
  /** 待办刚完成（好感度联动） */
  todoDone: boolean;
}

export type PetAction =
  | { type: 'interact'; interaction: InteractionType; now?: number }
  | { type: 'equip'; id: AccessoryId }
  | { type: 'opacity'; value: number }
  | { type: 'personality'; id: PersonalityId }
  | { type: 'pomodoro-start'; phase: 'work' | 'rest' }
  | { type: 'pomodoro-tick'; delta: number }
  | { type: 'pomodoro-reset' }
  | { type: 'pomodoro-config'; workMin: number; restMin: number }
  | { type: 'todo'; action: TodosAction }
  | { type: 'pixel'; serialized: string }
  | { type: 'home'; value: boolean };

export function petReducer(state: PetState, action: PetAction): PetActionResult {
  switch (action.type) {
    case 'interact': {
      const { state: affinity, leveledUp } = addInteraction(
        state.affinity,
        action.interaction,
        action.now ? new Date(action.now) : undefined,
      );
      return { state: { ...state, affinity }, leveledUp, todoDone: false };
    }
    case 'equip': {
      const accessories = state.accessories.includes(action.id)
        ? state.accessories.filter((a) => a !== action.id)
        : [...state.accessories, action.id];
      return { state: { ...state, accessories }, leveledUp: false, todoDone: false };
    }
    case 'opacity':
      return { state: { ...state, opaqueness: Math.min(1, Math.max(0.3, action.value)) }, leveledUp: false, todoDone: false };
    case 'personality':
      return { state: { ...state, personality: action.id }, leveledUp: false, todoDone: false };
    case 'pomodoro-start':
      return {
        state: { ...state, pomodoro: startPhase(state.pomodoro, action.phase, state.pomodoroConfig) },
        leveledUp: false,
        todoDone: false,
      };
    case 'pomodoro-tick': {
      const { state: pomodoro } = tickPomodoro(state.pomodoro, state.pomodoroConfig, action.delta);
      return { state: { ...state, pomodoro }, leveledUp: false, todoDone: false };
    }
    case 'pomodoro-reset':
      return { state: { ...state, pomodoro: createPomodoro() }, leveledUp: false, todoDone: false };
    case 'pomodoro-config': {
      // 配置仅允许 1..120 分钟；运行中不直接改动，由 UI 在 idle 时提供
      const workMin = Math.min(120, Math.max(1, Math.round(action.workMin)));
      const restMin = Math.min(120, Math.max(1, Math.round(action.restMin)));
      return { state: { ...state, pomodoroConfig: { workMin, restMin } }, leveledUp: false, todoDone: false };
    }
    case 'todo': {
      const res = todosReducer(state.todos, action.action);
      return { state: { ...state, todos: res.todos }, leveledUp: false, todoDone: res.justCompleted };
    }
    case 'pixel':
      return { state: { ...state, pixel: action.serialized }, leveledUp: false, todoDone: false };
    case 'home':
      return { state: { ...state, home: action.value }, leveledUp: false, todoDone: false };
    default:
      return { state, leveledUp: false, todoDone: false };
  }
}

export { levelProgress };