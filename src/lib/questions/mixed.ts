/**
 * 综合混合出题：覆盖全部题型
 * ------------------------------------------------------------
 * 仅包含 makeMixedQuestion；makeDailyMixedQuestion 因为依赖
 * questionForSkill 派发器，与派发器一起放在 ./index.ts 中。
 */
import type { Question } from '@/types';
import POEMS from '@/data/poems';
import { sample } from '@/lib/utils';
import { type Difficulty } from './_shared';
import {
  makeMathQuestion,
  makeCountQuestion,
  makeNumberQuestion,
  makeCompareQuestion,
} from './math';
import { makeLetterQuestion } from './letter';
import { makeLogicQuestion } from './logic';
import { makePoemQuestion } from './poem';
import {
  makeCategoryQuestion,
  makeOppositeQuestion,
  makeSimilarHanziQuestion,
} from './concept';
import { makePinyinQuestion } from './pinyin';
import { makeWordQuestion } from './word';

/** 综合混合出题：覆盖全部题型（含本次新增的 5 种 + hanzi/pinyin/word），用于每日综合小挑战 */
export function makeMixedQuestion(difficulty: Difficulty = 1): Question {
  const pool: Array<() => Question | null> = [
    () => makeMathQuestion(difficulty),
    () => makeCountQuestion(difficulty),
    () => makeNumberQuestion(difficulty),
    () => makeLetterQuestion(difficulty),
    () => makeLogicQuestion('mixed', difficulty),
    () => makePoemQuestion(POEMS, difficulty),
    () => makeCompareQuestion(difficulty),
    () => makeCategoryQuestion(difficulty),
    () => makeOppositeQuestion(difficulty),
    () => makeSimilarHanziQuestion(difficulty),
    // 消除知识点孤岛：综合练习也能出 hanzi/pinyin/word 题
    () => makePinyinQuestion(difficulty),
    () => makeWordQuestion(difficulty),
  ];
  const q = sample(pool)();
  return q ?? makeMathQuestion(difficulty);
}
