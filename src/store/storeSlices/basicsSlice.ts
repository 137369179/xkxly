import type { ReciteStat } from '@/types';
import { dateKey } from '@/lib/dailyPlan';
import { createInitialProgress } from '@/lib/progress';
import { useSettingsStore } from '../useSettingsStore';
import {
  applyProgress as _applyProgress,
  bumpLog as _bumpLog,
  applyLearn as _applyLearn,
  applyPractice as _applyPractice,
  toggleIn as _toggleIn,
} from '../storeHelpers';
import {
  todayStr,
  deepMergeProgress,
  initialProgress,
  type SliceCreator,
} from '../storeShared';
import type { StoreState } from '../useStore';

export const createBasicsSlice: SliceCreator<
  Pick<
    StoreState,
    | 'addStars'
    | 'heardLetter'
    | 'wonMatchGame'
    | 'readPoem'
    | 'togglePoemFavorite'
    | 'setPoemNote'
    | 'togglePoemCharMark'
    | 'togglePoemLineMark'
    | 'clearPoemMarks'
    | 'recordRecite'
    | 'heardNumber'
    | 'setGameBest'
    | 'completeLevel'
    | 'checkIn'
    | 'consumeBadge'
    | 'resetAll'
    | 'restoreProgress'
    | 'incPkCount'
    | 'incCreativeCount'
  >
> = (set) => ({
  addStars: (n) =>
    set((s) =>
      _applyProgress(s, (p) => ({
        ...p,
        stars: p.stars + n,
        dailyLog: _bumpLog(p, { stars: n }),
      })),
    ),

  heardLetter: (l) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const next = _applyLearn(p, `letter:${l.toUpperCase()}`);
        return next.lettersHeard.includes(l)
          ? next
          : { ...next, lettersHeard: [...next.lettersHeard, l] };
      }),
    ),

  wonMatchGame: () =>
    set((s) =>
      _applyProgress(s, (p) => ({
        ...p,
        matchGamesWon: p.matchGamesWon + 1,
        stars: p.stars + 3,
        dailyLog: _bumpLog(p, { items: 1, ok: 1, stars: 3 }),
      })),
    ),

  readPoem: (id) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const next = _applyLearn(p, `poem:${id}`);
        return next.poemsRead.includes(id)
          ? next
          : {
              ...next,
              poemsRead: [...next.poemsRead, id],
              stars: next.stars + 1,
              dailyLog: _bumpLog(next, { items: 1, ok: 1, stars: 1 }),
            };
      }),
    ),

  togglePoemFavorite: (id) =>
    set((s) => ({
      progress: {
        ...s.progress,
        poemFavorites: s.progress.poemFavorites.includes(id)
          ? s.progress.poemFavorites.filter((x) => x !== id)
          : [...s.progress.poemFavorites, id],
      },
    })),

  setPoemNote: (id, text) =>
    set((s) => ({
      progress: {
        ...s.progress,
        poemNotes: { ...s.progress.poemNotes, [id]: text },
      },
    })),

  togglePoemCharMark: (id, char) =>
    set((s) => ({
      progress: {
        ...s.progress,
        poemMarks: { ...s.progress.poemMarks, [id]: _toggleIn(s.progress.poemMarks[id], 'chars', char) },
      },
    })),

  togglePoemLineMark: (id, line) =>
    set((s) => ({
      progress: {
        ...s.progress,
        poemMarks: { ...s.progress.poemMarks, [id]: _toggleIn(s.progress.poemMarks[id], 'lines', line) },
      },
    })),

  clearPoemMarks: (id) =>
    set((s) => {
      const next = { ...s.progress.poemMarks };
      delete next[id];
      return { progress: { ...s.progress, poemMarks: next } };
    }),

  recordRecite: (id, score, stage) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const now = Date.now();
        const prev = p.poemRecite[id];
        const stat: ReciteStat = {
          best: Math.max(prev?.best ?? 0, score),
          runs: (prev?.runs ?? 0) + 1,
          lastAt: now,
          stage: score >= 80 ? Math.max(prev?.stage ?? 0, stage) : (prev?.stage ?? 0),
        };
        const gained = score >= 80 ? Math.round(score / 25) : 0;
        const next = _applyPractice(p, `poem:${id}`, score >= 80, gained);
        return { ...next, poemRecite: { ...next.poemRecite, [id]: stat } };
      }),
    ),

  heardNumber: (n) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const next = _applyLearn(p, `number:${n}`);
        return next.numbersHeard.includes(n)
          ? next
          : { ...next, numbersHeard: [...next.numbersHeard, n] };
      }),
    ),

  setGameBest: (game, score) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const prev = p.gameBest[game] ?? 0;
        if (score <= prev) return p;
        return { ...p, gameBest: { ...p.gameBest, [game]: score } };
      }),
    ),

  completeLevel: (levelId, stars) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const prev = p.levelStars[levelId] ?? 0;
        const best = Math.max(prev, stars);
        const gained = Math.max(0, best - prev) * 2;
        return {
          ...p,
          levelStars: { ...p.levelStars, [levelId]: best },
          unlockedLevel: Math.max(p.unlockedLevel, Math.min(levelId + 1, 20)),
          stars: p.stars + gained,
          dailyLog: _bumpLog(p, { items: 1, ok: 1, stars: gained }),
        };
      }),
    ),

  checkIn: () =>
    set((s) =>
      _applyProgress(s, (p) => {
        const today = todayStr();
        if (p.lastVisit === today) return p;
        const yesterday = dateKey(Date.now() - 86400000);
        const streak = p.lastVisit === yesterday ? p.streak + 1 : 1;
        return {
          ...p,
          lastVisit: today,
          streak,
          dailyLog: _bumpLog(p, {
            startMathTotal: p.mathTotal,
            startMathCorrect: p.mathCorrect,
            startLogicTotal: p.logicTotal,
          }),
        };
      }),
    ),

  consumeBadge: () => set((s) => ({ pendingBadges: s.pendingBadges.slice(1) })),

  resetAll: () => set(() => ({ progress: createInitialProgress(), pendingBadges: [] })),

  restoreProgress: (progress, settings) => {
    if (settings) {
      const s = useSettingsStore.getState();
      if (settings.parentPin) s.setParentPin(settings.parentPin);
      s.setSound(settings.sound);
      s.setShowPinyin(settings.showPinyin);
      s.setDailyLimit(settings.dailyLimitMin);
      s.setEyeCare(settings.eyeCareMin);
      s.setAiEnabled(settings.aiEnabled);
    }
    set(() => ({
      progress: deepMergeProgress(initialProgress, progress),
      pendingBadges: [],
    }));
  },

  incPkCount: () => set((s) => ({ progress: { ...s.progress, pkCount: s.progress.pkCount + 1 } })),
  incCreativeCount: () => set((s) => ({ progress: { ...s.progress, creativeCount: s.progress.creativeCount + 1 } })),
});
