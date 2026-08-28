/**
 * reviewQueue.ts — 错字本 / 间隔重复「主动复习」调度器（I 层 I4 · SRS 编排）
 *
 * 与 `@/lib/srs` 的 `review()`（单题作答后更新掌握度与下次 due）正交互补：
 *   - `review()` 负责「一次作答 → 推算下一次 due」；
 *   - 本模块负责「当下所有掌握数据中，挑出此刻该复习哪些」——即宝宝巴士
 *     「AI 复习动态调整 / 精灵岛主动复习 / 识字表三态」的编排层。
 *
 * 设计依据（2026.8 竞品 + 国际 RCT 研究）：
 *   - 宝宝巴士 V9.91.22：错得多的、易忘的字增加复习频次；记得牢的减少复习（千人千面）。
 *   - 洪恩 / 帮帮「学一点回头看一点」穿插复习；精灵岛让孩子主动复习。
 *   - Leitner 五盒 + 扩张间隔（儿童早期用扩张间隔建立自信，成熟转等间隔）。
 *   - 2025 元分析（21,415 人 / 85 研究）SMD=0.78：间隔重复显著优于集中练习。
 *   - 每日复习量上限，避免复习量爆炸打击积极性（与 SM-2 儿童简化一致）。
 *
 * 纯函数、无副作用、零 store / React 依赖；零 any / 零非空断言 / 零 console。
 * 经由深路径 `@/game/reviewQueue` 可达，不编辑 WIP 的 index.ts。
 */
import type { Progress, MasteryItem } from '@/types';

/** 复习调度仅需的 Progress 子集（结构化入参，解耦具体实现） */
export type Reviewable = Pick<Progress, 'mastery' | 'wrongBook'>;

/** 复习项来源：错字本优先 / 已到期 / 逾期最久优先 */
export type ReviewReason = 'wrong' | 'due' | 'overdue';

export interface ReviewItem {
  skill: string;
  reason: ReviewReason;
  /** 逾期毫秒数（due 早于 now 的量），未逾期为 0 */
  overdueMs: number;
}

export interface ReviewQueueOptions {
  /** 当前时间戳（可注入，便于测试与确定性） */
  now?: number;
  /** 每日复习量上限，超出自然顺延（默认 10，防复习量爆炸） */
  dailyCap?: number;
  /** 是否把错字本（易错字）纳入优先复习（默认 true） */
  includeWrongBook?: boolean;
}

export interface ReviewQueue {
  items: ReviewItem[];
  /** 因达上限被顺延的候选项数量 */
  capped: number;
  /** 来自错字本的数量 */
  fromWrongBook: number;
  /** 全局下次有复习到期的绝对时间戳；无则返回 0 */
  nextDueAt: number;
}

export interface ReviewHint {
  hasDue: boolean;
  nextDueAt: number;
}

const DEFAULT_CAP = 10;

/** 读取某 skill 的下次到期时间，兼容 `due` 与历史上的 `dueAt` 命名 */
function dueAtOf(m: MasteryItem | undefined): number {
  if (!m) return 0;
  const d = m.due ?? m.dueAt;
  return typeof d === 'number' && Number.isFinite(d) ? d : 0;
}

/**
 * 选择当前应复习的知识点队列。
 * 规则：错字本（易错字）最优先 → 其次逾期越久越靠前；总量受 dailyCap 约束。
 */
export function selectReviewQueue(progress: Reviewable, opts: ReviewQueueOptions = {}): ReviewQueue {
  const now = opts.now ?? Date.now();
  const cap = Math.max(1, Math.floor(opts.dailyCap ?? DEFAULT_CAP));
  const includeWrongBook = opts.includeWrongBook ?? true;

  // 1) 到期候选（掌握度 due <= now）
  const dueSet = new Set<string>();
  for (const skill of Object.keys(progress.mastery)) {
    if (dueAtOf(progress.mastery[skill]) <= now) dueSet.add(skill);
  }

  // 2) 错字本优先（易错字增频）
  const wrongSet = includeWrongBook ? new Set(progress.wrongBook) : new Set<string>();

  // 3) 合并 + 标注来源
  const candidates = new Map<string, ReviewReason>();
  for (const s of wrongSet) candidates.set(s, 'wrong');
  for (const s of dueSet) {
    if (!candidates.has(s)) {
      candidates.set(s, dueAtOf(progress.mastery[s]) < now ? 'overdue' : 'due');
    }
  }

  const items: ReviewItem[] = [];
  for (const [skill, reason] of candidates) {
    const due = dueAtOf(progress.mastery[skill]);
    const overdueMs = due > 0 && due <= now ? now - due : 0;
    items.push({ skill, reason, overdueMs });
  }

  // 排序：错字本最优先，其次逾期越久越靠前（更该复习）
  items.sort((a, b) => {
    const aw = a.reason === 'wrong' ? 1 : 0;
    const bw = b.reason === 'wrong' ? 1 : 0;
    if (aw !== bw) return bw - aw;
    return b.overdueMs - a.overdueMs;
  });

  const fromWrongBook = items.filter((i) => i.reason === 'wrong').length;
  const capped = Math.max(0, items.length - cap);
  const selected = items.slice(0, cap);

  // 下次到期：未入选、且 due 最小的未来时间戳
  let nextDueAt = 0;
  for (const skill of Object.keys(progress.mastery)) {
    const due = dueAtOf(progress.mastery[skill]);
    if (due > now) nextDueAt = nextDueAt === 0 ? due : Math.min(nextDueAt, due);
  }

  return { items: selected, capped, fromWrongBook, nextDueAt };
}

/**
 * 是否存在此刻应复习的知识点（用于「复习提醒」红点）。
 * 任一错字本 skill 即视为待复习（易错字增频，无论是否仍在 mastery 中）。
 */
export function hasDueReview(progress: Reviewable, now: number = Date.now()): boolean {
  if (progress.wrongBook.length > 0) return true;
  for (const skill of Object.keys(progress.mastery)) {
    if (dueAtOf(progress.mastery[skill]) <= now) return true;
  }
  return false;
}

/** 复习提醒提示：是否有到期项 + 最近一次到期时间 */
export function nextReviewHint(progress: Reviewable, now: number = Date.now()): ReviewHint {
  return { hasDue: hasDueReview(progress, now), nextDueAt: selectReviewQueue(progress, { now }).nextDueAt };
}
