// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { computeGrowthGoals } from './growthGoals';
import type { Progress } from '@/types';

function baseProgress(over: Partial<Progress> = {}): Progress {
  return {
    stars: 0,
    spent: 0,
    badges: [],
    badgeDates: {},
    lettersHeard: [],
    matchGamesWon: 0,
    poemsRead: [],
    poemFavorites: [],
    poemNotes: {},
    poemMarks: {},
    poemRecite: {},
    numbersHeard: [],
    mathCorrect: 0,
    mathTotal: 0,
    countCorrect: 0,
    logicCorrect: 0,
    logicTotal: 0,
    levelStars: {},
    unlockedLevel: 1,
    lastVisit: '',
    streak: 0,
    mastery: {},
    growth: [],
    wrongBook: [],
    dailyLog: {},
    traced: [],
    stickers: [],
    lessonDate: '',
    lessonStep: 0,
    ...over,
  } as Progress;
}

describe('computeGrowthGoals', () => {
  it('空进度：六项目标齐全、进度为 0、给出温和引导', () => {
    const goals = computeGrowthGoals(baseProgress());
    expect(goals).toHaveLength(6);
    const hanzi = goals.find((g) => g.id === 'hanzi-mastery');
    expect(hanzi?.current).toBe(0);
    expect(hanzi?.target).toBe(300);
    expect(hanzi?.progress).toBe(0);
    expect(hanzi?.hint).toContain('再掌握');
  });

  it('掌握度按 lv>=4 计为熟练，math 与 number 前缀聚合', () => {
    const p = baseProgress({
      mastery: {
        'hanzi:水': { lv: 4, ok: 5, ng: 0 },
        'hanzi:火': { lv: 3, ok: 3, ng: 1 }, // 未熟练，不计
        'math:add': { lv: 4, ok: 4, ng: 0 },
        'number:1': { lv: 5, ok: 6, ng: 0 },
      },
    });
    const goals = computeGrowthGoals(p);
    expect(goals.find((g) => g.id === 'hanzi-mastery')?.current).toBe(1); // 仅「水」熟练
    expect(goals.find((g) => g.id === 'math-mastery')?.current).toBe(2); // math + number
  });

  it('达标后给出正向强化文案且进度为 1', () => {
    const goals = computeGrowthGoals(baseProgress({ streak: 7 }));
    const streakGoal = goals.find((g) => g.id === 'streak');
    expect(streakGoal?.progress).toBe(1);
    expect(streakGoal?.hint).toContain('连续');
  });

  it('错题存在时给消灭引导，清零后视为达成', () => {
    const withWrong = computeGrowthGoals(baseProgress({ wrongBook: ['hanzi:错'] }));
    const w1 = withWrong.find((g) => g.id === 'mistake-clear');
    expect(w1?.progress).toBe(0);
    expect(w1?.hint).toContain('还有');

    const cleared = computeGrowthGoals(baseProgress({ wrongBook: [] }));
    expect(cleared.find((g) => g.id === 'mistake-clear')?.progress).toBe(1);
  });

  it('成就目标基于 milestone 聚合，初始进度为 0', () => {
    const a = computeGrowthGoals(baseProgress()).find((g) => g.id === 'achievement');
    expect(a?.target).toBeGreaterThan(0);
    expect(a?.progress).toBe(0);
  });

  it('progress 恒在 0–1 区间且无 NaN', () => {
    const goals = computeGrowthGoals(baseProgress({ streak: 99, wrongBook: [] }));
    for (const g of goals) {
      expect(g.progress).toBeGreaterThanOrEqual(0);
      expect(g.progress).toBeLessThanOrEqual(1);
      expect(Number.isNaN(g.progress)).toBe(false);
    }
  });

  it('可通过 opts 覆盖目标总量', () => {
    const goals = computeGrowthGoals(baseProgress(), { hanziTarget: 10 });
    expect(goals.find((g) => g.id === 'hanzi-mastery')?.target).toBe(10);
  });
});
