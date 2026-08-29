import { review } from '@/lib/srs';
import {
  applyProgress as _applyProgress,
  bumpLog as _bumpLog,
  applyPractice as _applyPractice,
  applyLearn as _applyLearn,
  emptyStat as _emptyStat,
  applyWrongBook as _applyWrongBook,
  withDailySnapshot as _withDailySnapshot,
} from '../storeHelpers';
import { todayStr, scheduleWrongStreakUpdate, type SliceCreator } from '../storeShared';
import type { StoreState } from '../useStore';

export const createLearningSlice: SliceCreator<
  Pick<
    StoreState,
    | 'practice'
    | 'learnSkill'
    | 'tickTime'
    | 'setLessonStep'
    | 'finishLesson'
    | 'resetTodayLesson'
    | 'markTraced'
    | 'buySticker'
    | 'refundSticker'
    | 'spendStars'
    | 'recordSpeed'
    | 'recordMath'
    | 'recordCount'
    | 'recordLogic'
    | 'buddyJudge'
    | 'practiceWrong'
    | 'updateWrongHistory'
    | 'clearWrongBook'
    | 'completeDailyReview'
  >
> = (set, get) => ({
  practice: (skill, correct, star = 1, difficulty, latencyMs) =>
    set((s) => _applyProgress(s, (p) => _applyPractice(p, skill, correct, star, difficulty, latencyMs))),

  learnSkill: (skill) => set((s) => _applyProgress(s, (p) => _applyLearn(p, skill))),

  // 每日成语复习完成奖励（每日一次；重复完成不再加星，防刷）
  completeDailyReview: (stars) =>
    set((s) => {
      const today = todayStr();
      if (s.progress.reviewDate === today) return s;
      return _applyProgress(s, (p) => ({
        ...p,
        reviewDate: today,
        stars: p.stars + stars,
        dailyLog: _bumpLog(p, { stars }),
      }));
    }),

  tickTime: (sec) =>
    set((s) => {
      const key = todayStr();
      const cur = s.progress.dailyLog[key] ?? _emptyStat();
      const nextEntry = { ...cur, sec: cur.sec + sec };
      return {
        progress: { ...s.progress, dailyLog: { ...s.progress.dailyLog, [key]: nextEntry } },
      };
    }),

  setLessonStep: (n) =>
    set((s) => ({
      progress: { ...s.progress, lessonDate: todayStr(), lessonStep: n },
    })),

  finishLesson: (bonus) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const today = todayStr();
        if (p.dailyLog[today]?.lesson) return p;
        return {
          ...p,
          lessonDate: today,
          stars: p.stars + bonus,
          dailyLog: _bumpLog(p, { items: 1, ok: 1, stars: bonus, lesson: true }),
        };
      }),
    ),

  resetTodayLesson: () =>
    set((s) => {
      const today = todayStr();
      const log = { ...s.progress.dailyLog };
      if (log[today]) {
        const { lesson: _lesson, stars: _stars, ...rest } = log[today]!;
        log[today] = rest as typeof log[string];
      }
      return {
        progress: { ...s.progress, lessonDate: '', lessonStep: 0, dailyLog: log },
      };
    }),

  markTraced: (id) =>
    set((s) =>
      _applyProgress(s, (p) =>
        p.traced.includes(id) ? p : { ...p, traced: [...p.traced, id] },
      ),
    ),

  buySticker: (id, cost) => {
    const p = get().progress;
    if (p.stickers.includes(id)) return false;
    if (p.stars - p.spent < cost) return false;
    set((s) =>
      _applyProgress(s, (q) => ({
        ...q,
        spent: q.spent + cost,
        stickers: [...q.stickers, id],
      })),
    );
    return true;
  },

  /** 撤销贴纸兑换（可撤销容错）：移除贴纸并退回已消耗的星星 */
  refundSticker: (id, cost) => {
    const p = get().progress;
    if (!p.stickers.includes(id)) return false;
    set((s) =>
      _applyProgress(s, (q) => ({
        ...q,
        spent: Math.max(0, q.spent - cost),
        stickers: q.stickers.filter((x) => x !== id),
      })),
    );
    return true;
  },

  spendStars: (cost) => {
    const p = get().progress;
    if (!(cost > 0) || p.stars - p.spent < cost) return false;
    set((s) => _applyProgress(s, (q) => ({ ...q, spent: q.spent + cost })));
    return true;
  },

  recordSpeed: (correct) =>
    set((s) =>
      _applyProgress(s, (p) => ({
        ...p,
        speedCorrect: p.speedCorrect + (correct ? 1 : 0),
      })),
    ),

  recordMath: (correct, skill = 'math:add') =>
    set((s) => {
      scheduleWrongStreakUpdate(set, s.wrongStreak, s.comfortingActive, correct);
      return _applyProgress(s, (p) => {
        const next = _applyPractice(p, skill, correct, 1);
        return {
          ...next,
          mathTotal: next.mathTotal + 1,
          mathCorrect: next.mathCorrect + (correct ? 1 : 0),
        };
      });
    }),

  recordCount: (correct) =>
    set((s) => {
      scheduleWrongStreakUpdate(set, s.wrongStreak, s.comfortingActive, correct);
      return _applyProgress(s, (p) => {
        const next = _applyPractice(p, 'number:count', correct, 1);
        return {
          ...next,
          countCorrect: next.countCorrect + (correct ? 1 : 0),
        };
      });
    }),

  recordLogic: (correct, skill = 'logic:pattern') =>
    set((s) => {
      scheduleWrongStreakUpdate(set, s.wrongStreak, s.comfortingActive, correct);
      return _applyProgress(s, (p) => {
        const next = _applyPractice(p, skill, correct, 1);
        return {
          ...next,
          logicTotal: next.logicTotal + 1,
          logicCorrect: next.logicCorrect + (correct ? 1 : 0),
        };
      });
    }),

  buddyJudge: (correct) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const judgeCount = (p.buddyJudgeCount ?? 0) + 1;
        const correctCount = (p.buddyCorrectJudge ?? 0) + (correct ? 1 : 0);
        const streak = correct ? (p.buddyStreak ?? 0) + 1 : 0;
        const difficulty = streak >= 3 ? Math.min((p.buddyDifficulty ?? 1) + 1, 3) : (p.buddyDifficulty ?? 1);
        return {
          ...p,
          buddyJudgeCount: judgeCount,
          buddyCorrectJudge: correctCount,
          buddyStreak: streak,
          buddyDifficulty: difficulty,
          stars: p.stars + (correct ? 2 : 0),
          dailyLog: _bumpLog(p, { items: 1, ok: correct ? 1 : 0, stars: correct ? 2 : 0 }),
        };
      }),
    ),

  clearWrongBook: () => set((s) => ({ progress: { ...s.progress, wrongBook: [] } })),

  practiceWrong: (skill, correct, difficulty) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const now = Date.now();
        const m = p.mastery[skill];
        const wasInWrongBook = p.wrongBook.includes(skill);

        const diff = difficulty ?? (m && m.lv <= 1 ? 1 : m && m.lv <= 3 ? 2 : 3) as 1 | 2 | 3;
        const newMastery = review(m, correct, now, diff);
        const newWrongBook = _applyWrongBook(p, skill, correct, newMastery);

        const justCleared = correct && wasInWrongBook && !newWrongBook.includes(skill);

        const wh = p.wrongHistory ?? {
          totalEver: 0,
          uniqueSkills: 0,
          cleared: 0,
          maxCount: 0,
          bestStreak: 0,
          dailyStreak: 0,
          lastTrainDate: '',
          aiAnalyzeCount: 0,
        };

        const today = todayStr();
        const dailyStreak = wh.lastTrainDate === today
          ? wh.dailyStreak
          : (wh.lastTrainDate === (() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            })() ? wh.dailyStreak + 1 : 1);

        const isWrong = !correct;
        const newlyAdded = !wasInWrongBook && !correct;
        const gained = correct ? (diff >= 3 ? 2 : 1) : 0;

        const next = {
          ...p,
          mastery: { ...p.mastery, [skill]: newMastery.firstSeen || newMastery.lv < 1 ? newMastery : { ...newMastery, firstSeen: today } },
          wrongBook: newWrongBook,
          stars: p.stars + gained,
          fishCount: (p.fishCount ?? 0) + (correct ? 1 : 0),
          dailyLog: _bumpLog(p, { items: 1, ok: correct ? 1 : 0, stars: gained }),
          wrongHistory: {
            ...wh,
            totalEver: wh.totalEver + (isWrong ? 1 : 0),
            uniqueSkills: wh.uniqueSkills + (newlyAdded ? 1 : 0),
            maxCount: Math.max(wh.maxCount, newWrongBook.length),
            dailyStreak,
            lastTrainDate: today,
            cleared: wh.cleared + (justCleared ? 1 : 0),
          },
        };
        return _withDailySnapshot(next);
      }),
    ),

  updateWrongHistory: (patch) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const wh = p.wrongHistory ?? {
          totalEver: 0,
          uniqueSkills: 0,
          cleared: 0,
          maxCount: 0,
          bestStreak: 0,
          dailyStreak: 0,
          lastTrainDate: '',
          aiAnalyzeCount: 0,
        };
        return { ...p, wrongHistory: { ...wh, ...patch } };
      }),
    ),
});
