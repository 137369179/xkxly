/**
 * 成语 SRS 复习 · 纯逻辑与细粒度订阅（T-3.2）
 * ----------------------------------------------
 * 复用现有 srs 引擎（progress.mastery / srs.review），本文件只负责：
 *   - 从 mastery 中筛出「idiom:」前缀且到期的技能
 *   - 计算待复习数量、按 due 升序取每日上限
 *   - 提供细粒度 hook，避免整块 mastery 抖动触发重渲染
 */
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { SKILL } from '@/lib/srs';
import { safeGetItem } from '@/lib/safeStorage';
import type { MasteryItem } from '@/types';

/** 每日复习上限（儿童版 srs 约定，超出自然顺延） */
export const MAX_DAILY = 10;

const PREFIX = 'idiom:';

/* ------------------------------------------------------------
 * 复习链路调试日志（T-3.2 排查用，默认关闭）
 * 开启：localStorage.setItem('idiomReview_debug','1')；关闭则 removeItem。
 * 复用 safeStorage，兼容禁用存储的 WebView。
 * --------------------------------------------------------- */
const IDR_KEY = 'idiomReview_debug';
const T0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

export function isIdrDebug(): boolean {
  // 1) 优先走 safeStorage（含 memoryFallback → local → session 多级兜底）
  if (safeGetItem(IDR_KEY) === '1') return true;
  // 2) 兜底：绕过 safeStorage，直接回读 window.localStorage。
  //    适用场景：用原生 localStorage.setItem 写入开关、而 safeStorage 因
  //    存储环境/内存态不一致返回 null（此时直读仍能拿到真实值）。
  //    若直读抛 SecurityError（Safari 隐私等），视为未开启，绝不抛出。
  if (typeof window !== 'undefined') {
    try {
      return window.localStorage.getItem(IDR_KEY) === '1';
    } catch {
      /* 存储不可用，回落未开启 */
    }
  }
  return false;
}

/** 核心逻辑/流程分支打点 */
export function idrLog(stage: string, extra?: Record<string, unknown>): void {
  if (!isIdrDebug()) return;
  const t = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - T0).toFixed(1);
  // eslint-disable-next-line no-console
  console.log(`%c[IdiomReview] ${stage}`, 'color:#5f2ecc;font-weight:bold', { t_ms: t, ...extra });
}

/** from skillId → idiom id（如 'idiom:i3' → 'i3'） */
export function idiomIdOfSkill(skill: string): string {
  return skill.startsWith(PREFIX) ? skill.slice(PREFIX.length) : '';
}

/** 由 mastery 快照筛出到期的成语技能 id（按 due 升序，限每日上限） */
export function selectDueIdiomSkills(
  mastery: Record<string, MasteryItem>,
  now = Date.now(),
  limit = MAX_DAILY,
): string[] {
  return Object.entries(mastery)
    .filter(([skill, m]) => skill.startsWith(PREFIX) && !!m && (m.due ?? 0) <= now)
    .sort((a, b) => (a[1]?.due ?? 0) - (b[1]?.due ?? 0))
    .slice(0, limit)
    .map(([skill]) => skill);
}

/** 到期成语总数（未截断；用于头部展示） */
export function dueIdiomCount(mastery: Record<string, MasteryItem>, now = Date.now()): number {
  let n = 0;
  for (const [skill, m] of Object.entries(mastery)) {
    if (skill.startsWith(PREFIX) && m && (m.due ?? 0) <= now) n += 1;
  }
  return n;
}

/**
 * 细粒度订阅：仅当 `idiom:` 前缀的 mastery 集合变化时重算。
 * 返回到期的成语技能 id 列表（已按 due 排序，取每日上限）。
 */
export function useDueIdiomSkills(): string[] {
  return useStore(
    useShallow((s) => {
      const now = Date.now();
      const entries = Object.entries(s.progress.mastery)
        .filter(([skill, m]) => skill.startsWith(PREFIX) && !!m && (m.due ?? 0) <= now)
        .sort((a, b) => (a[1]?.due ?? 0) - (b[1]?.due ?? 0))
        .slice(0, MAX_DAILY)
        .map(([skill]) => skill);
      return entries;
    }),
  );
}

/** 生成某成语的标准技能 id（复习/练习统一入口） */
export function idiomSkill(id: string): string {
  return SKILL.idiom(id);
}