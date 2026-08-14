/**
 * 出题器统一入口（barrel + 派发器）
 * ------------------------------------------------------------
 * 把分散在 _shared / math / logic / letter / poem / concept /
 * pinyin / word / mixed / wrongReason 中的题目生成器统一聚合：
 *
 *   - 对外暴露与原 questions.ts 完全一致的 API
 *   - 提供 questionForSkill 派发器：把 skill id（如 'math:add'）
 *     路由到对应的 makeXxxQuestion
 *   - makeDailyMixedQuestion 与派发器同文件，因为它依赖派发器
 *
 * 1223 行的"上帝模块"被拆成 10 个聚焦文件，本文件只是聚合层。
 */
import type { Question } from '@/types';
import POEMS from '@/data/poems';
import { getHanziByChar } from '@/data/hanziIndex';
import { makeHanziQuestion } from '@/lib/hanziQuestions';
import { sample } from '@/lib/utils';

// 共享层
export { type Difficulty, COLOR_SHAPES, GEO_SHAPES, FRUITS, ANIMALS, THINGS } from './_shared';

// 派发器依赖的具体生成器（同时 re-export 给外部调用方）
import {
  makeMulQuestion,
  makeDivQuestion,
  makeShapeQuestion,
  makeTimeQuestion,
  makeCoinQuestion,
  makeMathQuestion,
  makeCountQuestion,
  makeNumberQuestion,
  makeCompareQuestion,
} from './math';
import { type LogicKind, makePatternQuestion, makeMatchQuestion, makeOrderQuestion, makeLogicQuestion } from './logic';
import { makeLetterQuestion } from './letter';
import { makePoemQuestion, makePoemFillQuestion } from './poem';
import { makeCategoryQuestion, makeOppositeQuestion, makeSimilarHanziQuestion } from './concept';
import { makePinyinQuestion } from './pinyin';
import { makeWordQuestion, makeWordListenQuestion, makeWordSpellQuestion, makeWordFamilyQuestion, type MasteryMap } from './word';
import { makeSentenceQuestion } from './sentence';
import { makeMixedQuestion } from './mixed';
import { wrongReason } from './wrongReason';
import type { Difficulty } from './_shared';

// 把上面导入的生成器统一再导出，保持 `@/lib/questions` 公共 API 不变
export {
  // math
  makeMulQuestion,
  makeDivQuestion,
  makeShapeQuestion,
  makeTimeQuestion,
  makeCoinQuestion,
  makeMathQuestion,
  makeCountQuestion,
  makeNumberQuestion,
  makeCompareQuestion,
  // logic
  type LogicKind,
  makePatternQuestion,
  makeMatchQuestion,
  makeOrderQuestion,
  makeLogicQuestion,
  // letter / poem
  makeLetterQuestion,
  makePoemQuestion,
  makePoemFillQuestion,
  // concept
  makeCategoryQuestion,
  makeOppositeQuestion,
  makeSimilarHanziQuestion,
  // pinyin / word / mixed / wrongReason
  makePinyinQuestion,
  makeWordQuestion,
  makeWordListenQuestion,
  makeWordSpellQuestion,
  makeWordFamilyQuestion,
  type MasteryMap,
  makeSentenceQuestion,
  makeMixedQuestion,
  wrongReason,
};

/* ============================================================
   7. 知识点 -> 题目 派发器（复习 / 每日课程复用）
   ============================================================ */
export function questionForSkill(skill: string, difficulty: Difficulty = 1): Question | null {
  const [cat, val = ''] = skill.split(':');
  switch (cat) {
    case 'letter':
      return makeLetterQuestion(difficulty, val);
    case 'number':
      // SKILL.count() 返回 'number:count'，需特判走数数题而非数字认知题
      if (val === 'count') return makeCountQuestion(difficulty);
      return makeNumberQuestion(difficulty, Number(val));
    case 'math':
      // math:mul / math:div / math:add / math:sub 统一走这里
      // （makeMulQuestion/makeDivQuestion 的 skill 字段是 'math:mul'/'math:div'，
      //  cat='math'，不能再用单独的 case 'math-mul'/'math-div' 分支）
      if (val === 'mul') return makeMulQuestion(difficulty);
      if (val === 'div') return makeDivQuestion(difficulty);
      return makeMathQuestion(difficulty, val === 'sub' ? 'sub' : 'add');
    case 'shape':
      return makeShapeQuestion(difficulty);
    case 'time':
      return makeTimeQuestion(difficulty);
    case 'coin':
      return makeCoinQuestion(difficulty);
    case 'count':
      return makeCountQuestion(difficulty);
    case 'logic':
      return makeLogicQuestion(val as LogicKind, difficulty);
    case 'compare':
      return makeCompareQuestion(difficulty);
    case 'sort':
      return makeCategoryQuestion(difficulty);
    case 'pair':
      return makeOppositeQuestion(difficulty);
    case 'similar':
      return makeSimilarHanziQuestion(difficulty);
    case 'hanzi': {
      // 知识点孤岛修复：hanzi:山 → 查找汉字数据 → 生成认拼音/选字/组词题
      const entry = getHanziByChar(val);
      if (!entry) return null;
      return makeHanziQuestion(entry, difficulty);
    }
    case 'pinyin':
      // 知识点孤岛修复：pinyin:a → 生成顺口溜/示例字/类型识别题
      return makePinyinQuestion(difficulty, val);
    case 'word':
      // 知识点孤岛修复：word:cat → 生成看图选词/看英文选中文/看中文选英文题（支持 mastery 弱词优先）
      return makeWordQuestion(difficulty, val);
    case 'sentence':
      // sentence:s1 → 句子题：看英文选中文/听音选中文/缺词填空
      return makeSentenceQuestion(difficulty, val);
    case 'poem':
      return makePoemQuestion(POEMS, difficulty, val);
    default:
      if (import.meta.env.DEV) console.warn('Unknown skill category:', skill);
      return null;
  }
}

/* ============================================================
   每日综合小挑战（依赖 questionForSkill，与派发器同文件）
   ------------------------------------------------------------
   设计意图：每日课程的「综合小挑战」不只是随机出题，而要按优先级回扣：
     1. 错题本（真错过，最需要回炉）—— 权重最高
     2. 薄弱知识点（weakSkills，错误率高）—— 次高
     3. 当天学习内容（学→练→测闭环）—— 中等
     4. 全题型混合（保证题型多样性，避免一直练同一类）—— 兜底
   ============================================================ */
export interface DailyMixedOptions {
  /** 错题本中的 skill id 列表（如 ['math:add', 'letter:A']） */
  wrongBook?: string[];
  /** 薄弱知识点 skill id 列表（来自 weakSkills） */
  weakSkills?: string[];
}

export function makeDailyMixedQuestion(
  todaySkills: string[],
  difficulty: Difficulty = 1,
  options?: DailyMixedOptions,
): Question {
  const learned = todaySkills.filter(Boolean);
  const wrong = options?.wrongBook?.filter(Boolean) ?? [];
  const weak = options?.weakSkills?.filter(Boolean) ?? [];

  // 按权重构建出题来源池
  const sources: Array<{ weight: number; gen: () => Question | null }> = [];

  // 错题本：真错过，权重最高（3.0）
  if (wrong.length > 0) {
    sources.push({
      weight: 3.0,
      gen: () => questionForSkill(sample(wrong), difficulty),
    });
  }
  // 薄弱知识点：错误率高，次高权重（2.5）
  if (weak.length > 0) {
    // 去重：已加入错题本的不重复占权重
    const weakOnly = weak.filter((s) => !wrong.includes(s));
    if (weakOnly.length > 0) {
      sources.push({
        weight: 2.5,
        gen: () => questionForSkill(sample(weakOnly), difficulty),
      });
    }
  }
  // 当天学习内容：学→练→测闭环（3.0）
  if (learned.length > 0) {
    sources.push({
      weight: 3.0,
      gen: () => questionForSkill(sample(learned), difficulty),
    });
  }
  // 全题型混合：兜底，保证多样性（1.5）
  sources.push({ weight: 1.5, gen: () => makeMixedQuestion(difficulty) });

  // 按权重随机抽一个来源，失败则降级到全题型混合
  const totalWeight = sources.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * totalWeight;
  for (const src of sources) {
    r -= src.weight;
    if (r <= 0) {
      const q = src.gen();
      if (q) return q;
      break; // 该来源出题失败，降级
    }
  }
  return makeMixedQuestion(difficulty);
}
