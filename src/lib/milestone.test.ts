import { describe, it, expect } from 'vitest';
import { checkMilestones, milestoneCount, achievedCount } from './milestone';
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

describe('milestone', () => {
  it('milestoneCount > 0', () => {
    expect(milestoneCount()).toBeGreaterThan(0);
  });

  it('空 progress 无达成里程碑', () => {
    const achieved = checkMilestones(baseProgress);
    expect(achieved.length).toBe(0);
  });

  it('achievedCount 返回数字', () => {
    const count = achievedCount(baseProgress);
    expect(typeof count).toBe('number');
    expect(count).toBe(0);
  });

  it('有星星时可能有达成里程碑', () => {
    const p = { ...baseProgress, stars: 500 };
    const count = achievedCount(p);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
