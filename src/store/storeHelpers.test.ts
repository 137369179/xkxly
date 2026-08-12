import { describe, it, expect } from 'vitest';
import { applyPractice, applyLearn, bumpLog, wrongCategory, toggleIn } from './storeHelpers';
import type { Progress } from '@/types';

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

describe('storeHelpers', () => {
  describe('applyPractice', () => {
    it('增加星星当答对', () => {
      const result = applyPractice(baseProgress, 'math:add', true, 2);
      expect(result.stars).toBe(2);
      expect(result.wrongBook).not.toContain('math:add');
    });

    it('不增加星星当答错', () => {
      const result = applyPractice(baseProgress, 'math:add', false, 2);
      expect(result.stars).toBe(0);
      expect(result.wrongBook).toContain('math:add');
    });

    it('答错加入错题本', () => {
      const result = applyPractice(baseProgress, 'letter:A', false, 1);
      expect(result.wrongBook).toContain('letter:A');
    });

    it('答对且掌握度>=3时从错题本移除', () => {
      const p = { ...baseProgress, wrongBook: ['letter:A'], mastery: { 'letter:A': { lv: 3, ng: 0, ok: 5, due: 0 } } };
      const result = applyPractice(p, 'letter:A', true, 1);
      expect(result.wrongBook).not.toContain('letter:A');
    });
  });

  describe('applyLearn', () => {
    it('创建新知识点', () => {
      const result = applyLearn(baseProgress, 'letter:B');
      expect(result.mastery['letter:B']).toBeDefined();
      expect(result.mastery['letter:B']!.lv).toBeGreaterThanOrEqual(1);
    });

    it('不重复创建已存在的知识点', () => {
      const p = { ...baseProgress, mastery: { 'letter:A': { lv: 2, ng: 1, ok: 3, due: 0 } } };
      const result = applyLearn(p, 'letter:A');
      expect(result.mastery['letter:A']!.lv).toBe(2);
    });
  });

  describe('bumpLog', () => {
    it('更新今日统计', () => {
      const result = bumpLog(baseProgress, { items: 1, ok: 1, stars: 2 });
      const today = Object.keys(result)[0]!;
      expect(result[today]!.items).toBe(1);
      expect(result[today]!.ok).toBe(1);
      expect(result[today]!.stars).toBe(2);
    });

    it('累加同日多次记录', () => {
      const p = { ...baseProgress, dailyLog: bumpLog(baseProgress, { items: 1, ok: 1 }) };
      const result = bumpLog(p, { items: 1, ok: 0 });
      const today = Object.keys(result)[0]!;
      expect(result[today]!.items).toBe(2);
      expect(result[today]!.ok).toBe(1);
    });
  });

  describe('wrongCategory', () => {
    it('提取前缀', () => {
      expect(wrongCategory('letter:A')).toBe('letter');
      expect(wrongCategory('math:add')).toBe('math');
      expect(wrongCategory('poem:chunxiao')).toBe('poem');
    });

    it('无冒号时返回other', () => {
      expect(wrongCategory('unknown')).toBe('unknown');
    });
  });

  describe('toggleIn', () => {
    it('添加字符标记', () => {
      const result = toggleIn(undefined, 'chars', '春');
      expect(result.chars).toContain('春');
    });

    it('移除已存在字符标记', () => {
      const prev = { chars: ['春'], lines: [], at: 0 };
      const result = toggleIn(prev, 'chars', '春');
      expect(result.chars).not.toContain('春');
    });

    it('添加行标记', () => {
      const result = toggleIn(undefined, 'lines', 2);
      expect(result.lines).toContain(2);
    });
  });
});
