import { describe, it, expect } from 'vitest';
import { smartDifficulty, calibrateDifficulty, rampDifficulty, masteryToDifficulty } from './difficulty';
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

describe('difficulty', () => {
  describe('masteryToDifficulty', () => {
    it('低等级返回1', () => {
      expect(masteryToDifficulty(0)).toBe(1);
      expect(masteryToDifficulty(1)).toBe(1);
    });
    it('中等级返回2', () => {
      expect(masteryToDifficulty(2)).toBe(2);
      expect(masteryToDifficulty(3)).toBe(2);
    });
    it('高等级返回3', () => {
      expect(masteryToDifficulty(4)).toBe(3);
      expect(masteryToDifficulty(5)).toBe(3);
    });
  });

  describe('smartDifficulty', () => {
    it('空progress返回1', () => {
      expect(smartDifficulty(baseProgress)).toBe(1);
    });
  });

  describe('calibrateDifficulty', () => {
    it('连对5题升难度', () => {
      expect(calibrateDifficulty(2, 5, 0)).toBe(3);
    });
    it('连错2题降难度', () => {
      expect(calibrateDifficulty(2, 0, 2)).toBe(1);
    });
    it('稳定答题不变难度', () => {
      expect(calibrateDifficulty(2, 2, 1)).toBe(2);
    });
  });

  describe('rampDifficulty', () => {
    it('样本不足返回1', () => {
      expect(rampDifficulty(baseProgress, 'math')).toBe(1);
    });
  });
});
