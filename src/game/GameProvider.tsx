/**
 * GameProvider — 三核心「一行包裹」统一游戏化编排上下文
 * ─────────────────────────────────────────────────────────────────
 * 把三套状态型 Hook（useReducedMotion / useSound / useGamification）
 * 收敛为单一 React Context，让三核心只需：
 *
 *   <GameProvider getProgress={store.getProgress} scene="hanzi">
 *     …练习闭环…
 *   </GameProvider>
 *
 * 即可通过 useGame() 拿到 { reducedMotion, sound, gamification }，
 * 消除各模块重复挂载 hook 的样板，统一「无障碍开关 / 音效开关 / 连击反馈」
 * 三个状态的唯一来源，避免多份实现漂移。
 *
 * 设计约束（与 R144–R156 已建 @/game 基础设施一致）：
 *  - 纯新建、零用户 WIP 依赖、零既有学习逻辑改动；
 *  - 不编辑 WIP 中的 src/game/index.ts，经深路径 import 即可复用；
 *  - 三核心收敛 WIP 后，可增量包裹 <GameProvider> 接入，学习逻辑零改动。
 *
 * 研究依据（R1–R156 竞品 / 国际 RCT）：
 *  - 无障碍总开关（A 层）须全局唯一来源 → 否则儿重视动效失控；
 *  - 音效可静音且偏好持久化（S/M 层·COPPA 友好·零 PII）；
 *  - 连击 / 即时反馈 / 成就检测（任务 #1 #3 #5）应统一编排。
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Progress } from '@/types';
import type { PraiseScene } from '@/lib/feedback';
import { useReducedMotion } from './useReducedMotion';
import { useSound, type UseSoundApi } from './useSound';
import { useGamification, type GamificationApi } from './useGamification';

export interface GameContextValue {
  /** A 儿童无障碍包容层：是否应降级动效 */
  reducedMotion: boolean;
  /** S/M 音乐韵律层：端侧音效开关与播放 */
  sound: UseSoundApi;
  /** 呈现编排：连击 / 即时反馈 / 成就检测 */
  gamification: GamificationApi;
}

const GameContext = createContext<GameContextValue | null>(null);

export interface GameProviderProps {
  children: ReactNode;
  /** 取最新进度快照（成就判定用），由三核心注入 store getter */
  getProgress?: () => Progress;
  /** 默认表扬场景（决定即时反馈话术） */
  scene?: PraiseScene;
  /** 初始静音（家长可后续通过 sound.setMuted 切换） */
  initialMuted?: boolean;
}

export function GameProvider({
  children,
  getProgress,
  scene,
  initialMuted,
}: GameProviderProps): ReactNode {
  const reducedMotion = useReducedMotion();
  const sound = useSound(initialMuted);
  const gamification = useGamification({ getProgress, scene });

  const value = useMemo<GameContextValue>(
    () => ({ reducedMotion, sound, gamification }),
    [reducedMotion, sound, gamification],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/**
 * 读取统一游戏化上下文。
 * 必须在 <GameProvider> 内调用，否则抛错以强制正确包裹（fail-fast）。
 */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (ctx === null) {
    throw new Error('useGame 必须在 <GameProvider> 内使用');
  }
  return ctx;
}
