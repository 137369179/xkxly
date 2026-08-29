/**
 * Store 纯函数助手 - 从 useStore.ts 提取
 * 所有函数接收 state/progress，返回新值，无副作用
 */
import type { Progress, DailyStat, MasteryItem, GrowthSnapshot, PoemMark } from '@/types';
import type { StateStorage } from 'zustand/middleware';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safeStorage';
import { review } from '@/lib/srs';
import { findNewBadges } from '@/data/badges';
import { MEDAL_MAP, applyMedalReward } from '@/data/medals';
import { masteryRate, touchedCount, masteredCount } from '@/lib/srs';
import { dateKey } from '@/lib/dailyPlan';

/* ------------------------------------------------------------------ */
/* 节流写盘工厂（核心加强 N，主 / 设置 Store 共用，消除重复实现）        */
/* ------------------------------------------------------------------ */
// 模块级共享状态：两个 Store 持久化 key 不同，共享同一套节流表安全无副作用。
let _persistTimers: Map<string, ReturnType<typeof setTimeout>> | null = null;
let _pendingValues: Map<string, string> | null = null;
let _listenersAdded = false;

/**
 * 返回节流版 StateStorage 与 flush 函数，供 zustand persist 使用：
 *  - 500ms 内多次写入只保留最新值，定时器到期才写盘，降低主线程压力（INP 更稳）
 *  - 关闭 / 隐藏页面时立即 flush，避免丢最后一次进度
 *  - 模块级 flag 防止 HMR 下重复注册监听器
 */
export function createThrottledStorage(): { storage: StateStorage; flush: () => void } {
  const timers = (_persistTimers ??= new Map<string, ReturnType<typeof setTimeout>>());
  const values = (_pendingValues ??= new Map<string, string>());

  const doWrite = (name: string, value: string) => {
    // 统一走 safeSetItem：localStorage → sessionStorage → 内存兜底，失败派发 storage-error
    safeSetItem(name, value);
  };

  const flush = () => {
    for (const [name, value] of values) {
      const t = timers.get(name);
      if (t) {
        clearTimeout(t);
        timers.delete(name);
      }
      doWrite(name, value);
      values.delete(name);
    }
  };

  const storage: StateStorage = {
    getItem: (name: string) => safeGetItem(name),
    removeItem: (name: string) => {
      const t = timers.get(name);
      if (t) {
        clearTimeout(t);
        timers.delete(name);
      }
      values.delete(name);
      safeRemoveItem(name);
    },
    setItem: (name: string, value: string) => {
      // 高频写入用节流合并：500ms 内多次 set 只保留最新值，定时器到期才写盘
      values.set(name, value);
      if (timers.has(name)) return;
      const timer = setTimeout(() => {
        timers.delete(name);
        const v = values.get(name);
        if (v != null) {
          doWrite(name, v);
          values.delete(name);
        }
      }, 500);
      timers.set(name, timer);
    },
  };

  if (typeof window !== 'undefined' && !_listenersAdded) {
    _listenersAdded = true;
    window.addEventListener('beforeunload', flush, { capture: true });
    document.addEventListener('pagehide', flush, { capture: true });
  }

  return { storage, flush };
}

const todayStr = () => dateKey();

const LOG_KEEP_DAYS = 90;
const WRONG_CAP = 100;
const WRONG_CAP_PER_CATEGORY = 15;
const MAX_GROWTH = 140;

export const emptyStat = (): DailyStat => ({ sec: 0, items: 0, ok: 0, stars: 0, lesson: false });

export const STORE_CONSTANTS = { LOG_KEEP_DAYS, WRONG_CAP, WRONG_CAP_PER_CATEGORY, MAX_GROWTH };

export interface StoreLike {
  progress: Progress;
  pendingBadges: string[];
}

export function applyProgress<S extends StoreLike>(
  state: S,
  mutate: (p: Progress) => Progress,
): Pick<S, 'progress' | 'pendingBadges'> {
  const next = mutate(state.progress);
  
  // 学习掉落：每获得 1 颗星星，必定掉落 1 个小鱼干 (Learn to Earn)
  const starsDiff = next.stars - state.progress.stars;
  if (starsDiff > 0) {
    next.fishCount = (next.fishCount ?? 0) + starsDiff;
  }

  const fresh = findNewBadges(next);
  if (!fresh.length) return { progress: next, pendingBadges: state.pendingBadges } as Pick<S, 'progress' | 'pendingBadges'>;
  const now = Date.now();
  const newDates: Record<string, number> = { ...next.badgeDates };
  for (const id of fresh) {
    if (newDates[id] === undefined) newDates[id] = now;
    // 勋章：解锁时自动发放其绑定的奖励（星星/小鱼干/猫咪资源），仅发放一次
    const medal = MEDAL_MAP.get(id);
    if (medal?.reward) applyMedalReward(next, medal.reward);
  }
  return {
    progress: { ...next, badges: [...next.badges, ...fresh], badgeDates: newDates },
    pendingBadges: [...state.pendingBadges, ...fresh],
  } as Pick<S, 'progress' | 'pendingBadges'>;
}

/** 更新今日统计（并顺带回收过期日志） */
export function bumpLog(p: Progress, patch: Partial<DailyStat>): Record<string, DailyStat> {
  const key = todayStr();
  const cur = p.dailyLog[key] ?? emptyStat();
  const next: Record<string, DailyStat> = {
    ...p.dailyLog,
    [key]: {
      sec: cur.sec + (patch.sec ?? 0),
      items: cur.items + (patch.items ?? 0),
      ok: cur.ok + (patch.ok ?? 0),
      stars: cur.stars + (patch.stars ?? 0),
      lesson: patch.lesson ?? cur.lesson,
      // 「今日开始时基准值」类字段：首次设置后不再覆盖（幂等），
      // 用于 DailyGoal 计算"今日增量"（当前值 - 基准值）。
      startMathTotal: cur.startMathTotal ?? patch.startMathTotal,
      startLogicTotal: cur.startLogicTotal ?? patch.startLogicTotal,
      // P1-1 修复：startMathCorrect / startLogicCorrect 同理，
      // 原先 bumpLog 未合并这两个字段，导致 DailyGoal 数学正确率基准值永远丢失。
      startMathCorrect: cur.startMathCorrect ?? patch.startMathCorrect,
      startLogicCorrect: cur.startLogicCorrect ?? patch.startLogicCorrect,
    },
  };
  const keys = Object.keys(next).sort();
  if (keys.length > LOG_KEEP_DAYS) {
    for (const k of keys.slice(0, keys.length - LOG_KEEP_DAYS)) delete next[k];
  }
  return next;
}

/** 取知识点的类别前缀 */
export function wrongCategory(skill: string): string {
  return skill.split(':')[0] ?? 'other';
}

/** 按类别分桶更新错题本 */
export function applyWrongBook(p: Progress, skill: string, correct: boolean, m: MasteryItem): string[] {
  const wrongBook = p.wrongBook ?? [];
  if (correct && m.lv >= 3) {
    return wrongBook.filter((x) => x !== skill);
  }
  if (correct) {
    return wrongBook;
  }
  const filtered = wrongBook.filter((x) => x !== skill);
  const cat = wrongCategory(skill);
  const sameCatCount = filtered.filter((x) => wrongCategory(x) === cat).length;
  if (sameCatCount >= WRONG_CAP_PER_CATEGORY) {
    let removeIdx = -1;
    for (let i = filtered.length - 1; i >= 0; i--) {
      if (wrongCategory(filtered[i]!) !== cat) continue;
      const lv = p.mastery[filtered[i]!]?.lv ?? 0;
      if (lv >= 3) {
        removeIdx = i;
        break;
      }
    }
    if (removeIdx === -1) {
      for (let i = filtered.length - 1; i >= 0; i--) {
        if (wrongCategory(filtered[i]!) === cat) {
          removeIdx = i;
          break;
        }
      }
    }
    const trimmed = removeIdx >= 0
      ? filtered.filter((_, idx) => idx !== removeIdx)
      : filtered;
    return [skill, ...trimmed].slice(0, WRONG_CAP);
  }
  return [skill, ...filtered].slice(0, WRONG_CAP);
}

/** 统一的知识点练习结算 */
export function applyPractice(
  p: Progress,
  skill: string,
  correct: boolean,
  star: number,
  difficulty?: 1 | 2 | 3,
  latencyMs?: number,
): Progress {
  const now = Date.now();
  const m = review(p.mastery[skill], correct, now, difficulty, latencyMs);
  // P-每日目标修复：首次达到「已掌握」（lv>=1）时记录日期，供每日「新掌握」目标精确统计（旧数据缺失 firstSeen 视为非今日）
  if (m.lv >= 1 && !m.firstSeen) m.firstSeen = dateKey();
  const wrongBook = applyWrongBook(p, skill, correct, m);
  const gained = correct ? star : 0;
  // A4: 记录错题变化
  const wrongNew = !correct && !p.wrongBook.includes(skill) ? 1 : 0;
  const wrongCleared = correct && p.wrongBook.includes(skill) && !wrongBook.includes(skill) ? 1 : 0;
  return withDailySnapshot({
    ...p,
    mastery: { ...p.mastery, [skill]: m },
    wrongBook,
    stars: p.stars + gained,
    dailyLog: bumpLog(p, { items: 1, ok: correct ? 1 : 0, stars: gained }),
  }, { wrongCount: wrongBook.length, wrongNew, wrongCleared });
}

/** 成长快照 */
export function withDailySnapshot(p: Progress, extra?: { wrongCount?: number; wrongNew?: number; wrongCleared?: number }): Progress {
  const key = dateKey();
  const last = p.growth[p.growth.length - 1];
  if (last && last.date === key) {
    // 同一天更新已有快照中的错题数据
    if (extra) {
      const updated = { ...last };
      if (extra.wrongCount !== undefined) updated.wrongCount = extra.wrongCount;
      if (extra.wrongNew !== undefined) updated.wrongNew = (updated.wrongNew ?? 0) + extra.wrongNew;
      if (extra.wrongCleared !== undefined) updated.wrongCleared = (updated.wrongCleared ?? 0) + extra.wrongCleared;
      const growth = [...p.growth];
      growth[growth.length - 1] = updated;
      return { ...p, growth };
    }
    return p;
  }
  const snap: GrowthSnapshot = {
    date: key,
    at: Date.now(),
    rate: masteryRate(p),
    touched: touchedCount(p),
    mastered: masteredCount(p),
    stars: p.stars,
    wrongCount: extra?.wrongCount ?? p.wrongBook.length,
    wrongNew: extra?.wrongNew ?? 0,
    wrongCleared: extra?.wrongCleared ?? 0,
  };
  const growth = [...p.growth, snap];
  if (growth.length > MAX_GROWTH) growth.splice(0, growth.length - MAX_GROWTH);
  return { ...p, growth };
}

/** 难点标记增删 */
export function toggleIn<K extends 'chars' | 'lines'>(
  prev: PoemMark | undefined,
  field: K,
  value: K extends 'chars' ? string : number,
): PoemMark {
  const base: PoemMark = prev ?? { chars: [], lines: [], at: 0 };
  if (field === 'chars') {
    const v = value as string;
    const has = base.chars.includes(v);
    return { ...base, chars: has ? base.chars.filter((x) => x !== v) : [...base.chars, v], at: Date.now() };
  }
  const v = value as number;
  const has = base.lines.includes(v);
  return { ...base, lines: has ? base.lines.filter((x) => x !== v) : [...base.lines, v], at: Date.now() };
}

/** 教学环节：建立知识点档案 */
export function applyLearn(p: Progress, skill: string): Progress {
  const now = Date.now();
  const prev = p.mastery[skill];
  if (prev && prev.lv >= 1) return p;
  const m = review(prev, true, now);
  return { ...p, mastery: { ...p.mastery, [skill]: m } };
}
