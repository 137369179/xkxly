/**
 * 游戏化核心闭环引擎（Core Loop Engine）
 * ------------------------------------------------------------
 * 这是「每次孩子作答后发生什么」的唯一真相源，把原本散落在各模块的
 * 计分 / 掌握度(SRS) / 错题本 / 星星 逻辑收敛为一处纯函数。
 *
 * 设计依据（来自 R1–R143 的竞品 / 国际 RCT 研究）：
 *   - 掌握度 > 分数：答对升 SRS 等级，升到 lv4 视为「熟练」额外奖励，避免刷分；
 *   - 2 胜即停 / 温和回退：答错只降 1~2 级（srs.review 已做难度感知），
 *     不清零、不惩罚，保护挫败感（洪恩「过度游戏化副作用」实证的反面教材）；
 *   - 错题本闭环：答错进本、连续答对升到 lv3 自动出本（消灭错题）。
 *
 * 纯函数、无副作用、零 localStorage 依赖 —— 因此可独立单测，
 * 也方便三核心以「一行调用」替换各自分散的 recordMath/practice 逻辑。
 */
import type { Progress } from '@/types';
import { review } from '@/lib/srs';

/** 一次作答的参数 */
export interface AnswerParams {
  /** 统一 SRS 命名空间的 skill key，如 `hanzi:水` / `math:add` / `word:苹果` */
  skill: string;
  /** 是否答对 */
  correct: boolean;
  /** 题目难度 1/2/3（传入启用难度感知升降级） */
  difficulty?: 1 | 2 | 3;
  /** 作答反应时长（毫秒），用于快速秒对提速升级 */
  latencyMs?: number;
}

/** 一次作答后的结果（不可变：返回全新的 Progress，不修改入参） */
export interface GameOutcome {
  /** 更新后的进度（新对象，原 progress 不被修改） */
  progress: Progress;
  /** 该 skill 作答后的掌握度 */
  masteryAfter: { lv: number; ok: number; ng: number; due: number };
  /** 本次获得的星星数（答对 +1，新熟练 +2） */
  starsEarned: number;
  /** 本次是否「首次达到熟练」（lv 由 <4 升到 >=4） */
  isNewlyMastered: boolean;
  /** 本次是否答错（用于错题本标记） */
  wasWrong: boolean;
}

const MASTERED_LV = 4;
const CLEARED_LV = 3;

/**
 * 应用一次作答结果，返回新的 Progress 与配套事件。
 * 严格不可变：任何字段变更都通过展开 + 替换实现，原对象保持不变。
 */
export function applyAnswer(progress: Progress, params: AnswerParams): GameOutcome {
  const prev = progress.mastery[params.skill];
  const prevLv = prev?.lv ?? 0;

  const updated = review(prev, params.correct, Date.now(), params.difficulty, params.latencyMs);
  const mastery = { ...progress.mastery, [params.skill]: updated };

  let stars = progress.stars;
  if (params.correct) {
    stars += 1;
    if (updated.lv >= MASTERED_LV && prevLv < MASTERED_LV) stars += 2;
  }

  let wrongBook = progress.wrongBook;
  if (!params.correct) {
    if (!wrongBook.includes(params.skill)) wrongBook = [...wrongBook, params.skill];
  } else if (wrongBook.includes(params.skill) && updated.lv >= CLEARED_LV) {
    // 曾经错、现在升到 lv3 以上 → 视为消灭，移出错题本
    wrongBook = wrongBook.filter((s) => s !== params.skill);
  }

  const nextProgress: Progress = { ...progress, mastery, stars, wrongBook };

  return {
    progress: nextProgress,
    masteryAfter: { lv: updated.lv, ok: updated.ok, ng: updated.ng, due: updated.due ?? 0 },
    starsEarned: stars - progress.stars,
    isNewlyMastered: updated.lv >= MASTERED_LV && prevLv < MASTERED_LV,
    wasWrong: !params.correct,
  };
}
