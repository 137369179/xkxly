/**
 * 进化引擎（纯函数）：总等级 → 4 阶段；阶段单调递增；图鉴时间戳。
 */
export type Stage = 1 | 2 | 3 | 4;

export interface FiveLevels { int: number; vit: number; cha: number; cre: number; aff: number }

export interface StageSpec {
  stage: Stage;
  label: string;
  emoji: string;
  minTotal: number;
  maxTotal: number;
  slots: number;
  amp: number;
}

export const STAGES: StageSpec[] = [
  { stage: 1, label: '蛋',   emoji: '🥚', minTotal: 1, maxTotal: 1,  slots: 2, amp: 0.6 },
  { stage: 2, label: '幼年', emoji: '🐣', minTotal: 2, maxTotal: 3,  slots: 4, amp: 0.8 },
  { stage: 3, label: '少年', emoji: '🐱', minTotal: 4, maxTotal: 6,  slots: 5, amp: 1.0 },
  { stage: 4, label: '成年', emoji: '🦁', minTotal: 7, maxTotal: 10, slots: 7, amp: 1.15 },
];

export interface EvolutionState {
  stage: Stage;
  dex: Partial<Record<Stage, number>>;
}

export const emptyEvolution = (): EvolutionState => ({ stage: 1, dex: {} });

export function totalLevel(lv: FiveLevels): number {
  return Math.round((lv.int + lv.vit + lv.cha + lv.cre + lv.aff) / 5);
}

export function stageOf(total: number): Stage {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (total >= STAGES[i]!.minTotal) return STAGES[i]!.stage;
  }
  return 1;
}

export function checkEvolution(prev: Stage, total: number): { stage: Stage; evolved: boolean } {
  const next = stageOf(total);
  return next > prev ? { stage: next, evolved: true } : { stage: prev, evolved: false };
}

export function accessorySlots(stage: Stage): number {
  return STAGES.find((s) => s.stage === stage)?.slots ?? 2;
}

export function stageSpec(stage: Stage): StageSpec {
  return STAGES.find((s) => s.stage === stage) ?? STAGES[0]!;
}
