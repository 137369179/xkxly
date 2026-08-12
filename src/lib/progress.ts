import type { Progress } from '@/types';

/**
 * 默认（全新用户）学习进度工厂。
 * 抽离为独立可复用工厂：useStore 初始化 / resetAll 与单测 fixture 共用同一真相源，
 * 避免 Progress 接口增字段时出现多处默认值漂移（P3-3 收敛 as any 的副产物）。
 */
export function createInitialProgress(): Progress {
  return {
    stars: 0,
    spent: 0,
    speedCorrect: 0,
    gameBest: {},
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
    pkCount: 0,
    creativeCount: 0,
    fishCount: 10,
    catAffection: 20,
    catFullness: 80,
    catCleanliness: 80,
    lastCatUpdate: Date.now(),
    storybooks: [],
    // —— 研究模式（CMML）：C4 硬门槛，必须与 types.ts#Progress 双处同步登记 ——
    researchNotes: {},
    discoveries: [],
    researchStats: {
      topicsExplored: [],
      exploreActions: 0,
      cardsRead: 0,
      sessionsCompleted: 0,
      exploreSeconds: 0,
    },
  };
}
