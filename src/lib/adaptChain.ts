/**
 * 自适应学习链（核心加强 F - M6）
 * ------------------------------------------------------------
 * 设计依据：可汗学院 Kids 自适应路径 + SM-2 间隔重复 +
 *          叫叫阅读 L1-L6 分级递进的难度阶梯。
 *
 * 核心逻辑：
 *   - 每个 category 维护一条「难度链条」
 *   - 连续答对 N 次 → 自动升档（更难的内容）
 *   - 连续答错 M 次 → 自动降档（回顾基础）
 *   - 档位变化需要通过「正式评估关卡」才真正生效
 *   - 跨 session 持久化（localStorage）
 */
import { adaptiveDifficulty } from '@/lib/dailyPlan';
import type { Progress } from '@/types';

import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

/* ------------------------------------------------------------------ */
/* 链条持久化                                                          */
/* ------------------------------------------------------------------ */
const CHAIN_KEY = 'adapt-chain';

interface AttemptRecord {
  correct: boolean;
  /** 作答耗时（毫秒），用于识别"在纠结/走神" */
  ms: number;
  /** 本题是否用过提示/重试，频繁用提示说明当前难度偏难 */
  hintUsed: boolean;
  /** 错因类型（如题型/知识点子类），仅答错时记录，供 getWeakTypes 薄弱项分析 */
  errorType?: string;
  t: number;
}

export interface ChainSlot {
  category: string;
  lv: number;
  streak: number;
  lastCorrect: boolean;
  pendingUp: boolean;
  /** 最近若干次作答明细（滚动窗口，用于 DDA 心流区调节） */
  log?: AttemptRecord[];
}

interface ChainState {
  slots: ChainSlot[];
  updated: number;
  version: number;
}

const CHAIN_VERSION = 1;

// P2-1 修复：原 loadChain 每次全量 JSON.parse，单次作答 2 读 2 写、渲染期再 parse 多次，
// 主线程反复序列化。加模块级缓存，写入同步落盘并刷新缓存，避免重复 parse。
let chainCache: ChainState | null = null;

function freshChain(): ChainState {
  return { slots: [], updated: Date.now(), version: CHAIN_VERSION };
}

function loadChain(): ChainState {
  if (chainCache) return chainCache;
  const raw = safeGetItem(CHAIN_KEY);
  if (!raw) { chainCache = freshChain(); return chainCache; }
  try {
    const s = JSON.parse(raw) as ChainState;
    if (s.version !== CHAIN_VERSION) { chainCache = freshChain(); return chainCache; }
    chainCache = s;
    return s;
  } catch {
    chainCache = freshChain();
    return chainCache;
  }
}

function saveChain(s: ChainState) {
  s.updated = Date.now();
  // 先更新缓存（引用同一对象），再落盘，避免立即回读又触发 parse
  chainCache = s;
  safeSetItem(CHAIN_KEY, JSON.stringify(s));
}

export function getSlot(cat: string): ChainSlot {
  const cs = loadChain();
  let slot = cs.slots.find((s) => s.category === cat);
  if (!slot) {
    slot = { category: cat, lv: 1, streak: 0, lastCorrect: false, pendingUp: false };
    cs.slots.push(slot);
    saveChain(cs);
  }
  return slot;
}

const UPGRADE_THRESHOLD = 5;
const DOWNGRADE_THRESHOLD = 3;

export function recordAdapt(
  cat: string,
  correct: boolean,
): { changed: boolean; newLv: number; direction: 'up' | 'down' | 'none' } {
  const cs = loadChain();
  let slot = cs.slots.find((s) => s.category === cat);
  if (!slot) {
    slot = { category: cat, lv: 1, streak: 0, lastCorrect: false, pendingUp: false };
    cs.slots.push(slot);
  }

  let direction: 'up' | 'down' | 'none' = 'none';

  if (correct) {
    if (slot.streak < 0) slot.streak = 0;
    slot.streak += 1;
    slot.lastCorrect = true;
    if (!slot.pendingUp && slot.streak >= UPGRADE_THRESHOLD && slot.lv < 5) {
      slot.pendingUp = true;
    }
  } else {
    if (slot.streak > 0) slot.streak = 0;
    slot.streak -= 1;
    slot.lastCorrect = false;
    if (slot.streak <= -DOWNGRADE_THRESHOLD && slot.lv > 1) {
      slot.lv -= 1;
      slot.streak = 0;
      slot.pendingUp = false;
      direction = 'down';
    }
  }

  saveChain(cs);
  return { changed: direction !== 'none', newLv: slot.lv, direction };
}

export function promoteAdapt(cat: string): number {
  const cs = loadChain();
  const slot = cs.slots.find((s) => s.category === cat);
  if (!slot || !slot.pendingUp) return slot?.lv ?? 1;
  slot.lv = Math.min(slot.lv + 1, 5);
  slot.streak = 0;
  slot.pendingUp = false;
  saveChain(cs);
  return slot.lv;
}

export function getAdaptLv(cat: string): number {
  return getSlot(cat).lv;
}

export function hasPendingUpgrade(cat: string): boolean {
  return getSlot(cat).pendingUp;
}

export function getChainSnapshot(): ChainSlot[] {
  return loadChain().slots;
}

export function resetChain(cat: string) {
  const cs = loadChain();
  cs.slots = cs.slots.filter((s) => s.category !== cat);
  saveChain(cs);
}

// 统一难度模型（P1-2）：已移除原 chainDifficulty 死路径（min(chainLv,statLv) 恒等于 statLv，
// 既忽略 DDA 反应时/提示信号，又使 streak chain 形同虚设）。现由 recommendDifficulty 单一入口
// 合并「历史掌握度基线 + streak chain 已证明档位 + 最近窗口四维信号」，见下方。

export function nextPendingUpgrade(): string | null {
  const cs = loadChain();
  const slot = cs.slots.find((s) => s.pendingUp);
  return slot?.category ?? null;
}

/* ------------------------------------------------------------------ */
/* DDA · 动态难度适配（核心加强：把"连续对错"升级为真正的动态难度）   */
/* ------------------------------------------------------------------ */
/**
 * 设计依据（深度研究结论）：
 *   - QuestKids（5-6 岁）规则型 DDA：用滚动正确率把成功率稳在 65–85% 心流区，
 *     85% 周留存实证（UENR 论文）。
 *   - Funexpected Math：完成率 + 反应时 + 提示频率 + 错误模式 四维实时调难度。
 *   - 发展认知：低龄儿童工作记忆有限，错误率突增应自动降档而非继续施压。
 *
 * 因此难度推荐 = 历史正确率（adaptiveDifficulty）作为基线，
 *   再叠加最近 10 次窗口的 4 个信号微调：
 *     · 滚动正确率 < 65% → 降一档；> 85% → 升一档
 *     · 平均反应时 > 12s（在纠结）→ 降一档
 *     · 提示使用率 > 40%（依赖提示）→ 降一档
 *     · 连续 3 次答错 → 立即降一档（防挫败）
 *   始终夹在 1–3 之间。
 */
const FLOW_LOW = 0.65;
const FLOW_HIGH = 0.85;
const SLOW_MS = 12_000;
const HINT_RATIO = 0.4;
const WINDOW = 10;
const LOG_CAP = 15;

export interface AttemptInput {
  correct: boolean;
  ms: number;
  hintUsed?: boolean;
  /** 错因类型（答错时由调用方传入，如 question.kind/type） */
  errorType?: string;
}

/**
 * 记录一次完整作答（含反应时与提示信号），同时驱动连击/升降档。
 * 在 QuizCard 的每次 handlePick 调用，是 DDA 的数据入口；
 * 其它仅用 recordAdapt 的地方不影响 log（无反应时数据，不参与微调）。
 */
export function recordAttempt(
  cat: string,
  input: AttemptInput,
): { changed: boolean; newLv: number; direction: 'up' | 'down' | 'none' } {
  const res = recordAdapt(cat, input.correct);
  const cs = loadChain();
  const slot = cs.slots.find((s) => s.category === cat);
  if (slot) {
    const log = slot.log ?? [];
    log.push({
      correct: input.correct,
      ms: input.ms,
      hintUsed: !!input.hintUsed,
      errorType: input.errorType,
      t: Date.now(),
    });
    if (log.length > LOG_CAP) log.splice(0, log.length - LOG_CAP);
    slot.log = log;
    saveChain(cs);
  }
  return res;
}

/** 取某类最近作答明细（供 UI / 调试） */
export function getAttemptLog(cat: string): AttemptRecord[] {
  return getSlot(cat).log ?? [];
}

export interface WeakType {
  type: string;
  count: number;
}

/**
 * 统计某类最近错题的薄弱错因类型（按频次降序）。
 * 依赖 recordAttempt 写入的 errorType（答错时由 QuizCard 传入题型/子类），
 * 供家长中心「薄弱项」与错题本加权重出做内容种子。
 */
export function getWeakTypes(cat: string): WeakType[] {
  const log = getAttemptLog(cat);
  const counts = new Map<string, number>();
  for (const r of log) {
    if (r.correct || !r.errorType) continue;
    counts.set(r.errorType, (counts.get(r.errorType) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/** 最近窗口的平均正确率 */
function recentAccuracy(log: AttemptRecord[]): number {
  const w = log.slice(-WINDOW);
  if (!w.length) return 1;
  return w.filter((r) => r.correct).length / w.length;
}

/**
 * 推荐难度（1|2|3）：把成功率稳在 65–85% 心流区。
 * 纯函数，依赖 Progress 做历史正确率基线；可在渲染期安全调用。
 */
export function recommendDifficulty(p: Progress, cat: string): 1 | 2 | 3 {
  let d: 1 | 2 | 3 = adaptiveDifficulty(p, cat);
  // P1-2：合并 streak chain 已证明档位（封顶 3）作为基线下限，尊重正式评估达到的水平；
  // DDA 最近窗口信号仍可在此基础上向下微调，避免把已证明的孩子一下按到地板。
  const chainCeil = Math.min(getAdaptLv(cat), 3) as 1 | 2 | 3;
  d = Math.max(d, chainCeil) as 1 | 2 | 3;
  return applyRecentSignals(cat, d);
}

/**
 * 把「最近窗口的状态信号」叠加到一个已给定的难度基线上。
 *
 * 与 `recommendDifficulty` 的区别：这里**不碰历史基线**，只做状态修正。
 * 适用于调用方已经有更精确的基线时——比如错题本按单个知识点的掌握度定档，
 * 那个基线比学科级的历史正确率准，但它看不见"今天答得特别慢 / 一直在看提示 /
 * 刚连错三题"这些当下状态，正好由这里补上。
 */
export function applyRecentSignals(cat: string, base: 1 | 2 | 3): 1 | 2 | 3 {
  let d = base;
  const log = getAttemptLog(cat).slice(-WINDOW);
  if (log.length < 3) return d;

  const acc = recentAccuracy(log);
  if (acc < FLOW_LOW) d = Math.max(1, d - 1) as 1 | 2 | 3;
  else if (acc > FLOW_HIGH) d = Math.min(3, d + 1) as 1 | 2 | 3;

  const avgMs = log.reduce((s, r) => s + r.ms, 0) / log.length;
  if (avgMs > SLOW_MS) d = Math.max(1, d - 1) as 1 | 2 | 3;

  const hintRatio = log.filter((r) => r.hintUsed).length / log.length;
  if (hintRatio > HINT_RATIO) d = Math.max(1, d - 1) as 1 | 2 | 3;

  if (log.slice(-3).every((r) => !r.correct)) {
    d = Math.max(1, d - 1) as 1 | 2 | 3;
  }
  return d;
}

/**
 * React 钩子：某类学科的"小智建议难度"。
 * 模块在生成题目时用它做默认难度，并允许孩子手动覆盖（仍是主人）。
 */
export interface AdaptiveDifficultyMeta {
  /** 当前是否仍由小智自动调节（孩子尚未手动选档） */
  auto: boolean;
  /** 小智当前建议档位（与 auto 无关，始终反映 DDA 实时推荐） */
  recommended: 1 | 2 | 3;
  /** 处于跟随模式，且小智的最新建议与正在用的档位不一致（等待安全时机切换） */
  pending: boolean;
  /** 回到"跟随小智"模式，并立即采用最新建议 */
  reset: () => void;
  /** 在安全边界（一轮做完、重新开局）调用：把小智的最新建议应用上来 */
  syncNow: () => void;
}
