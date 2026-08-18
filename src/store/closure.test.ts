import { describe, it, expect } from 'vitest';
import { applyPractice } from './storeHelpers';
import type { Progress } from '@/types';

/**
 * 闭环回归测试：覆盖「学习乐园加强升级改造」本轮为识字/英语/数学三大模块
 * 新增的 SRS 回写 skill 命名空间。验证这些 key 经 applyPractice 后能正确
 * 落库到 mastery / stars / wrongBook，确保练习结果不再丢失（根治 2026-08-07
 * 审计指出的 🔴 P0 学习闭环碎片化隐患）。
 */

const baseProgress: Progress = {
  stars: 0, spent: 0, badges: [], badgeDates: {},
  lettersHeard: [], matchGamesWon: 0, poemsRead: [], poemFavorites: [],
  poemNotes: {}, poemMarks: {}, poemRecite: {}, numbersHeard: [],
  mathCorrect: 0, mathTotal: 0, countCorrect: 0, logicCorrect: 0,
  logicTotal: 0, levelStars: {}, unlockedLevel: 1, lastVisit: '',
  streak: 0, mastery: {}, wrongBook: [], dailyLog: {}, traced: [],
  stickers: [], lessonDate: '', lessonStep: 0, pkCount: 0, creativeCount: 0,
  fishCount: 0, growth: [], speedCorrect: 0, gameBest: {},
  researchNotes: {}, discoveries: [], researchStats: {
    topicsExplored: [], exploreActions: 0, cardsRead: 0,
    sessionsCompleted: 0, exploreSeconds: 0,
  },
};

// 本次升级新增/补全回写的 skill key（按模块分组，便于定位）
const NEW_KEYS = {
  识字: ['hanzi:木', 'hanzi-build:好', 'hanzi-stroke:水', 'pinyin:group:single'],
  英语: ['letter-order', 'letter-trace:A', 'letter-study:B', 'word:phonics:a', 'word:review:cat', 'word:sentence:s1', 'word:cat'],
  数学: ['math:fraction', 'math:money', 'math:shape', 'math:skip', 'math:tenframe', 'math:rabbit', 'math:trace:5', 'logic:maze', 'logic:codebot', 'logic:sudoku'],
} as const;

describe('学习闭环 · 三大模块新增 skill 回写', () => {
  (Object.keys(NEW_KEYS) as (keyof typeof NEW_KEYS)[]).forEach((module) => {
    NEW_KEYS[module].forEach((skill) => {
      it(`[${module}] 答对 → ${skill} 正确落库 mastery/stars`, () => {
        const r = applyPractice(baseProgress, skill, true, 1);
        expect(r.mastery[skill]).toBeDefined();
        expect(r.mastery[skill]!.lv).toBeGreaterThanOrEqual(1);
        expect(r.stars).toBe(1);
        expect(r.wrongBook).not.toContain(skill);
      });

      it(`[${module}] 答错 → ${skill} 进入错题本且不计星`, () => {
        const r = applyPractice(baseProgress, skill, false, 1);
        expect(r.wrongBook).toContain(skill);
        expect(r.stars).toBe(0);
      });
    });
  });

  it('连续答对同 key 累计掌握度（难度可驱动 SRS）', () => {
    let p = baseProgress;
    for (let i = 0; i < 3; i++) p = applyPractice(p, 'math:fraction', true, 1, 2 as 1 | 2 | 3);
    expect(p.mastery['math:fraction']!.lv).toBeGreaterThanOrEqual(1);
    expect(p.stars).toBe(3);
  });
});
