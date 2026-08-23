/**
 * 桌面宠物 · 状态聚合 reducer（纯，可单测）
 * 汇总好感度/配件/透明度/性格/番茄钟/待办/拼豆/家园。
 */
import {
  addInteraction,
  affinityLevel,
  emptyAffinity,
  levelProgress,
  type AffinityState,
} from './lib/affinity';
import { emptyAttributes, gainAttr, attrLevel, type AttributesState, type AttrSourceKind } from './lib/attributes';
import { emptyEvolution, totalLevel, checkEvolution, accessorySlots, type EvolutionState } from './lib/evolution';
import { emptyBehavior, type BehaviorState, type BehaviorAction } from './lib/behavior';
import { createPomodoro, startPhase, tickPomodoro, type PomodoroConfig, type PomodoroState } from './lib/pomodoro';
import { todosReducer, type TodosAction, type Todo } from './lib/todos';
import type { AccessoryId, InteractionType, PersonalityId } from './data';

export interface PetState {
  affinity: AffinityState;
  attributes: AttributesState;
  evolution: EvolutionState;
  behavior: BehaviorState;
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
  attributes: emptyAttributes(),
  evolution: emptyEvolution(),
  behavior: emptyBehavior(),
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
  /** 进化刚发生（阶段庆祝） */
  evolved?: boolean;
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
  | { type: 'home'; value: boolean }
  | { type: 'gain-attr'; kind: AttrSourceKind; now?: number }
  | { type: 'evolve-check'; now?: number }
  | { type: 'behavior-adopt'; action: BehaviorAction; now?: number }
  | { type: 'behavior-interact'; now?: number };

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
      const slots = accessorySlots(state.evolution.stage);
      const on = state.accessories.includes(action.id);
      if (!on && state.accessories.length >= slots) {
        return { state, leveledUp: false, todoDone: false };
      }
      const accessories = on
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
    case 'gain-attr': {
      const now = action.now ?? Date.now();
      const r = gainAttr(state.attributes, action.kind, now);
      if (r.gained === 0) return { state, leveledUp: false, todoDone: false };
      return { state: { ...state, attributes: r.state }, leveledUp: false, todoDone: false };
    }
    case 'evolve-check': {
      const now = action.now ?? Date.now();
      const five = {
        int: attrLevel(state.attributes.exp.int),
        vit: attrLevel(state.attributes.exp.vit),
        cha: attrLevel(state.attributes.exp.cha),
        cre: attrLevel(state.attributes.exp.cre),
        aff: affinityLevel(state.affinity.exp),
      };
      const { stage, evolved } = checkEvolution(state.evolution.stage, totalLevel(five));
      const dex = { ...state.evolution.dex };
      if (dex[state.evolution.stage] == null) dex[state.evolution.stage] = now;
      if (evolved) dex[stage] = now;
      if (!evolved && dex[state.evolution.stage] === state.evolution.dex[state.evolution.stage]) {
        return { state, leveledUp: false, todoDone: false, evolved: false }; // 无变化
      }
      return { state: { ...state, evolution: { stage, dex } }, leveledUp: evolved, todoDone: false, evolved };
    }
    case 'behavior-adopt': {
      const now = action.now ?? Date.now();
      const b = state.behavior;
      return {
        state: {
          ...state,
          behavior: {
            ...b,
            current: action.action,
            lastInviteAt: action.action === 'invite' ? now : b.lastInviteAt,
            lastStudyAt: action.action === 'study' ? now : b.lastStudyAt,
          },
        },
        leveledUp: false,
        todoDone: false,
      };
    }
    case 'behavior-interact':
      return {
        state: { ...state, behavior: { ...state.behavior, lastInteractAt: action.now ?? Date.now() } },
        leveledUp: false,
        todoDone: false,
      };
    default:
      return { state, leveledUp: false, todoDone: false };
  }
}

export { levelProgress };