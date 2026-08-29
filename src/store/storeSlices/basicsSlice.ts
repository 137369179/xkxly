import type { ReciteStat } from '@/types';
import { createInitialProgress } from '@/lib/progress';
import { sanitizeProgress } from '@/lib/backup';
import { grantFreeze, registerActivity, todayISO, type StreakState } from '@/game/streakProtection';
import { useSettingsStore } from '../useSettingsStore';
import {
  applyProgress as _applyProgress,
  bumpLog as _bumpLog,
  applyLearn as _applyLearn,
  applyPractice as _applyPractice,
  toggleIn as _toggleIn,
} from '../storeHelpers';
import {
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
    | 'grantStreakFreeze'
    | 'clearStreakEvent'
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
        const today = todayISO();
        if (p.lastVisit === today) return p;
        // R163：接入 streakProtection 安全网 —— 断签 1 天且有保护卡时温和续接
        // （不惩罚、不焦虑），替代旧「断签直接归 1」逻辑。
        const prev: StreakState = {
          current: p.streak,
          longest: p.longestStreak ?? p.streak,
          lastActiveDate: p.lastVisit || null,
          freezesRemaining: p.streakFreezes ?? 0,
        };
        const update = registerActivity(prev, today);
        return {
          ...p,
          lastVisit: today,
          streak: update.state.current,
          longestStreak: update.state.longest,
          streakFreezes: update.state.freezesRemaining,
          streakEvent: update.event === 'protected' ? 'protected' : undefined,
          dailyLog: _bumpLog(p, {
            startMathTotal: p.mathTotal,
            startMathCorrect: p.mathCorrect,
            startLogicTotal: p.logicTotal,
          }),
        };
      }),
    ),

  grantStreakFreeze: (count = 1) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const next = grantFreeze(
          {
            current: p.streak,
            longest: p.longestStreak ?? p.streak,
            lastActiveDate: p.lastVisit || null,
            freezesRemaining: p.streakFreezes ?? 0,
          },
          count,
        );
        return { ...p, streakFreezes: next.freezesRemaining };
      }),
    ),

  consumeBadge: () => set((s) => ({ pendingBadges: s.pendingBadges.slice(1) })),

  clearStreakEvent: () =>
    set((s) =>
      s.progress.streakEvent
        ? _applyProgress(s, (p) => ({ ...p, streakEvent: undefined }))
        : { progress: s.progress },
    ),

  resetAll: () => set(() => ({ progress: createInitialProgress(), pendingBadges: [] })),

  restoreProgress: (progress, settings) => {
    // 安全（扫描 P0-1）：导入的进度一律经过白名单 + 数值钳位净化，
    // 即便绕过 UI 直接调用，也无法注入未知字段 / 超大数值破坏状态。
    const safe = sanitizeProgress(progress);
    if (settings) {
      const s = useSettingsStore.getState();
      // settings 白名单校验：只接受合法取值，防止伪造数据写入
      if (typeof settings.parentPin === 'string' && /^\d{4}$/.test(settings.parentPin)) {
        s.setParentPin(settings.parentPin);
      }
      if (typeof settings.sound === 'boolean') s.setSound(settings.sound);
      if (typeof settings.showPinyin === 'boolean') s.setShowPinyin(settings.showPinyin);
      if (typeof settings.dailyLimitMin === 'number') {
        s.setDailyLimit(Math.max(0, Math.min(1440, Math.round(settings.dailyLimitMin))));
      }
      if (typeof settings.eyeCareMin === 'number') {
        s.setEyeCare(Math.max(0, Math.min(120, Math.round(settings.eyeCareMin))));
      }
      if (typeof settings.aiEnabled === 'boolean') s.setAiEnabled(settings.aiEnabled);
    }
    set(() => ({
      progress: deepMergeProgress(initialProgress, safe),
      pendingBadges: [],
    }));
  },

  incPkCount: () => set((s) => ({ progress: { ...s.progress, pkCount: s.progress.pkCount + 1 } })),
  incCreativeCount: () => set((s) => ({ progress: { ...s.progress, creativeCount: s.progress.creativeCount + 1 } })),
});
