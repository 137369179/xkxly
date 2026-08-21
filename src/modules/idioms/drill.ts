/**
 * 复习形态扩展（T-3.3）· 题型调度与客观题生成（纯逻辑）
 * --------------------------------------------------------
 * - variantFor：按复习进度从「形态池」分配题型
 * - buildFillBlank：四字成语拆字缺一字，给出候选项（正确字 + 干扰字）
 * - buildContextPick：用成语例句作题干，给出 4 个候选成语（正确 + 干扰）
 * - pickDistractors：从成语池取非目标的干扰项
 * 只依赖 IDIOMS 与 shuffle，不触碰 store，方便单测。
 */
import { IDIOMS, type Idiom } from '@/data/idioms';
import { shuffle } from '@/lib/utils';

/** 复习题型 */
export type DrillVariant = 'recallWord' | 'recallMeaning' | 'picGuess' | 'fillBlank' | 'contextPick';

/** 回忆型（自评）形态池 */
const RECALL_VARIANTS: DrillVariant[] = ['recallWord', 'recallMeaning', 'picGuess'];
/** 客观型（自动判）形态 */
export const OBJECTIVE_VARIANTS: DrillVariant[] = ['fillBlank', 'contextPick'];

/**
 * 按复习进度分配题型。
 * mode='recall'：恒 recallWord（兼容既有行为，测试稳定）。
 * mode='mixed'：回忆型与客观型轮换，覆盖多形态。
 */
export function variantFor(index: number, _total: number, mode: 'recall' | 'mixed'): DrillVariant {
  if (mode === 'recall') return 'recallWord';
  const pool: DrillVariant[] = [...RECALL_VARIANTS, ...OBJECTIVE_VARIANTS];
  return pool[index % pool.length] ?? 'recallWord';
}

/** 从池中取 count 个「非 target」成语（干扰项） */
export function pickDistractors(target: Idiom, count: number, pool: Idiom[] = IDIOMS): Idiom[] {
  return shuffle(pool.filter((i) => i.id !== target.id)).slice(0, count);
}

export interface FillBlankCard {
  missingIndex: number;
  correct: string;
  chars: string[]; // 选项（含正确字，已打乱）
}

/**
 * 拆字填空：藏住成语的 missingIndex 位，返回正确字与候选字（正确+干扰，打乱）。
 * 干扰字从 distractors 的同位字取；不足 3 个干扰则选项更少（>=2 即可用）。
 */
export function buildFillBlank(
  target: Idiom,
  distractors: Idiom[],
  missingIndex = 2,
): FillBlankCard | null {
  const chars = Array.from(target.word);
  if (chars.length < 3) return null;
  const correct = chars[missingIndex];
  if (!correct) return null;

  const seen = new Set<string>();
  const wrong: string[] = [];
  for (const d of distractors) {
    const c = Array.from(d.word)[missingIndex];
    if (c && c !== correct && !seen.has(c)) {
      seen.add(c);
      wrong.push(c);
    }
  }
  return { missingIndex, correct, chars: shuffle([correct, ...wrong.slice(0, 3)]) };
}

export interface ContextPickCard {
  sentence: string; // 例句（题干，成语处留空）
  options: Idiom[]; // 候选（含正确，已打乱）
  answerId: string;
}

/** 语境判别：用成语例句作题干，候选=正确+distractors */
export function buildContextPick(target: Idiom, distractors: Idiom[]): ContextPickCard {
  const options = shuffle([target, ...distractors]);
  return { sentence: target.example, options, answerId: target.id };
}

/** 客观题统一落地为「选项 id + 正确 id」 */
export function objectiveAnswer(
  kind: 'fillBlank' | 'contextPick',
  chosen: string,
  pick: { answerId: string } | { correct: string },
): boolean {
  if (kind === 'fillBlank') return chosen === (pick as { correct: string }).correct;
  return chosen === (pick as { answerId: string }).answerId;
}