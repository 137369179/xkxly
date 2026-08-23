/**
 * 效用行为引擎（纯函数）：8 行为效用打分 + 迟滞决策。
 */
export type BehaviorAction =
  | 'idle' | 'wander' | 'sleep' | 'play' | 'invite' | 'study' | 'eat' | 'goHome';

export interface BehaviorState {
  current: BehaviorAction;
  lastInteractAt: number;
  lastInviteAt: number;
  lastStudyAt: number;
  wakePenaltyUntil: number;
}

export const emptyBehavior = (): BehaviorState => ({
  current: 'idle',
  lastInteractAt: 0,
  lastInviteAt: 0,
  lastStudyAt: 0,
  wakePenaltyUntil: 0,
});

export interface BehaviorCtx {
  hour: number;
  night: boolean;
  atHome: boolean;
  affinityLv: number;
  lowestIsInt: boolean;
  now: number;
}

export const INVITE_COOLDOWN_MS = 10 * 60_000;
export const STUDY_COOLDOWN_MS = 20 * 60_000;
export const HYSTERESIS = 0.15;

export function utility(a: BehaviorAction, s: BehaviorState, c: BehaviorCtx): number {
  const day = !c.night;
  switch (a) {
    case 'sleep': {
      let v = c.hour >= 22 || c.hour < 6 ? 0.95 : c.hour >= 21 ? 0.6 : 0.05;
      if (c.atHome) v += 0.3;
      if (c.now < s.wakePenaltyUntil) v -= 0.3;
      return Math.max(0, v);
    }
    case 'wander':
      return day ? 0.5 : 0.15;
    case 'play':
      return day ? 0.55 + (c.affinityLv >= 3 ? 0.1 : 0) : 0.15;
    case 'invite': {
      if (s.lastInviteAt > 0 && c.now - s.lastInviteAt < INVITE_COOLDOWN_MS) return 0;
      const since = c.now - s.lastInteractAt;
      return since > 30 * 60_000 ? 0.85 : since > 10 * 60_000 ? 0.7 : 0.1;
    }
    case 'study': {
      if (s.lastStudyAt > 0 && c.now - s.lastStudyAt < STUDY_COOLDOWN_MS) return 0;
      return day && c.lowestIsInt ? 0.7 : 0.05;
    }
    case 'eat':
      return day ? 0.3 : 0.1;
    case 'goHome':
      return c.night && !c.atHome ? 0.8 : 0;
    case 'idle':
    default:
      return 0.4;
  }
}

export interface Decision { action: BehaviorAction; utilities: Record<BehaviorAction, number> }

export function decide(s: BehaviorState, c: BehaviorCtx): Decision {
  const all: BehaviorAction[] = ['idle', 'wander', 'sleep', 'play', 'invite', 'study', 'eat', 'goHome'];
  const utilities = {} as Record<BehaviorAction, number>;
  let best: BehaviorAction = 'idle';
  let bestScore = -1;
  for (const a of all) {
    let v = utility(a, s, c);
    if (a === s.current) v += HYSTERESIS;
    utilities[a] = v;
    if (v > bestScore) { bestScore = v; best = a; }
  }
  return { action: best, utilities };
}

export const BEHAVIOR_BUBBLES: Record<BehaviorAction, string[]> = {
  idle: ['哼哼~', '发呆中…'],
  wander: ['到处看看~', '散步啦！'],
  sleep: ['Zzz…', '呼…呼…'],
  play: ['自己玩会儿~', '蹦蹦跳！'],
  invite: ['陪我玩一会儿吧！', '好久没摸摸我啦~'],
  study: ['我们去练智力吧！', '学习时间到！'],
  eat: ['有点饿了~', '想吃小饼干'],
  goHome: ['回家睡觉咯~', '晚安…'],
};
