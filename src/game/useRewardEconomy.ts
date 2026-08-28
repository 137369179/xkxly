/**
 * 星星经济持久化层（TD-R160-01 收口）
 * ------------------------------------------------------------
 * `rewardEconomy.ts` 刻意做成纯函数：易测、可复现、零副作用。
 * 但纯函数不留状态 —— 孩子攒的星星、解锁的奖励、收集册在刷新页面后
 * 会全部归零。本 Hook 补上这层：把纯函数的结果**安全地落盘**。
 *
 * 为什么这里值得单独一层，而不是随手 setItem：
 *   教育类 App 的进度丢失不是「小 bug」，而是最伤信任的失效。业界归纳的
 *   六大根因里，本层正面处理了其中四个 ——
 *     ① 状态未跨会话持久化 → 每次变更即写回；
 *     ② 序列化 / 反序列化错误（版本不匹配、畸形数据）→ 逐字段自愈；
 *     ③ 本地存储损坏 → 按字段抢救，绝不整体清空；
 *     ④ 应用更新 / 结构迁移 → version 字段 + 逐字段兼容。
 *
 * **核心取舍：自愈优先于重置。**
 * 大人的工具可以「数据损坏 → 恢复默认设置」，孩子的乐园不行。攒了两周的
 * 星星一夜归零，且无法找回（头部产品同样如此：宝宝巴士系应用的进度丢失
 * 最终只能走客服人工补录），这种挫败会直接摧毁继续学习的意愿。
 * 因此即使读到完全不认识的结构，本层也**逐字段抢救能抢救的部分**，
 * 只有在字段类型本身不可用时才回落到安全值，绝不因为一个字段坏掉
 * 就丢掉整份存档。
 *
 * 设计要点：
 *   - 跨天只重置「当日入账」，余额 / 已解锁 / 收集册 / 保底计数全部保留；
 *   - 日期用**本地日期**（不是 UTC）—— 孩子心里的「今天」是墙上的钟；
 *   - 存储不可用时 `degraded=true`，游戏照常进行，只是进度无法跨会话保留
 *     （复用 safeStorage 的 'storage-error' 事件，不额外造探测逻辑）；
 *   - 多标签页同步（家长中心 + 学习页同时打开的常见家庭场景）；
 *   - 反向护栏沿用 rewardEconomy：无付费墙、无惩罚、余额永不为负。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CAPSULE_PRIZES,
  DEFAULT_DAILY_CAP,
  PITY_THRESHOLD,
  REWARD_CATALOG,
  capsuleOdds,
  capsuleStats,
  drawCapsule as rollCapsule,
  earnStars,
  nextRewardGoal,
  pityRemaining,
  redeem,
  rewardStage,
} from './rewardEconomy';
import type {
  CapsuleDrawResult,
  CapsuleOdds,
  EarnResult,
  RedeemResult,
  RewardGoal,
  RewardItem,
  RewardStage,
  RewardTier,
  SessionOutcome,
} from './rewardEconomy';
import { safeGetJSON, safeParseJSON, safeSetJSON } from '@/lib/safeStorage';

/** 默认存储键（模块内可覆盖，便于按孩子 / 按模块分槽） */
export const REWARD_STORAGE_KEY = 'bb:reward-economy';

/** 存档结构版本：未来结构变更时按版本号分派迁移，而不是一刀切清空 */
export const REWARD_STATE_VERSION = 1;

/** 余额上界：防止异常写入把 UI 撑爆。正常学习量远达不到（最贵奖励 200 星） */
const MAX_BALANCE = 9999;

/** 累计赚取上界 */
const MAX_LIFETIME = 999999;

/** 已解锁奖励的合法 id 集合（目录变更时自动丢弃已下架项，不崩） */
const OWNED_IDS: readonly string[] = REWARD_CATALOG.map((item) => item.id);

/** 扭蛋奖品的合法 id 集合 */
const PRIZE_IDS: readonly string[] = CAPSULE_PRIZES.map((prize) => prize.id);

/** 扭蛋消耗来源：与 REWARD_CATALOG 同源，杜绝第二份价格常量漂移。
 *  导出供统一消费层（useUnifiedStars）做支出双写时引用同一价格。 */
export const CAPSULE_ITEM: RewardItem =
  REWARD_CATALOG.find((item) => item.kind === 'capsule') ?? REWARD_CATALOG[0];

// ─────────────────────────────────────────────────────────────
// 1) 纯函数层：日期、清洗、归一化（可脱离 React 单测）
// ─────────────────────────────────────────────────────────────

/** 本地日期键 YYYY-MM-DD。刻意不用 UTC：孩子的「今天」由墙上的钟决定 */
export function rewardDayKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 数值清洗：非数字 / NaN → fallback；负数 → 0；超大值（含 Infinity）→ 钳到上界。
 *
 * 刻意区分 Infinity 与 NaN：Infinity 是「越界」而非「无效」，应当钳到上界
 * （保底计数被写成 Infinity 时，正确的处理是让孩子直接触发保底，
 * 而不是清零让他从头再抽五次普通档）。
 */
function toCount(value: unknown, max: number, fallback = 0): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(Math.max(0, Math.floor(value)), max);
}

/**
 * id 列表清洗：只保留「字符串 + 在合法集合内 + 不重复」的项。
 * 与目录求交而非照单全收 —— 奖励下架后旧存档不会把 UI 带崩。
 */
function toIdList(value: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const allow = new Set(allowed);
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && allow.has(item) && !out.includes(item)) out.push(item);
  }
  return out;
}

/** 落盘的奖励存档结构 */
export interface RewardState {
  version: number;
  /** 当前可用星星 */
  balance: number;
  /** 累计赚取（只增不减，家长报告与成长展示用） */
  lifetime: number;
  /** 已解锁的目录奖励 id */
  owned: readonly string[];
  /** 扭蛋收集册（已抽到的奖品 id） */
  collection: readonly string[];
  /** 连续未出稀有的计数（保底用） */
  pity: number;
  /** 当日已入账星数（每日上限计账用） */
  earnedToday: number;
  /** earnedToday 归属的本地日期 */
  day: string;
}

export function createRewardState(day: string = rewardDayKey()): RewardState {
  return {
    version: REWARD_STATE_VERSION,
    balance: 0,
    lifetime: 0,
    owned: [],
    collection: [],
    pity: 0,
    earnedToday: 0,
    day,
  };
}

/**
 * 归一化：把任意来源（localStorage / storage 事件 / 旧版本）的数据
 * 收敛成一份合法的 RewardState。
 *
 * 刻意**不**把 version 不匹配当成「整份作废」。版本字段的职责是给未来的
 * 迁移函数提供分派依据，而不是丢弃数据的理由 —— 一旦因版本号不符就清空，
 * 孩子攒下的星星就再也回不来了。逐字段抢救是这里唯一负责任的做法。
 */
export function normalizeRewardState(raw: unknown, day: string = rewardDayKey()): RewardState {
  if (!isRecord(raw)) return createRewardState(day);
  // 跨天：只有「当日入账」归零，其余一律保留
  const sameDay = raw['day'] === day;
  return {
    version: REWARD_STATE_VERSION,
    balance: toCount(raw['balance'], MAX_BALANCE),
    lifetime: toCount(raw['lifetime'], MAX_LIFETIME),
    owned: toIdList(raw['owned'], OWNED_IDS),
    collection: toIdList(raw['collection'], PRIZE_IDS),
    pity: toCount(raw['pity'], PITY_THRESHOLD),
    earnedToday: sameDay ? toCount(raw['earnedToday'], MAX_BALANCE) : 0,
    day,
  };
}

/** 跨天翻转：只重置当日记账，其余字段原样保留 */
function rollover(s: RewardState): RewardState {
  const day = rewardDayKey();
  return s.day === day ? s : { ...s, day, earnedToday: 0 };
}

/** 从 window 事件里安全取出错的存储键名（无 CustomEvent 环境回落空串） */
function readErrorName(event: Event): string {
  if (typeof CustomEvent !== 'undefined' && event instanceof CustomEvent) {
    const detail: unknown = event.detail;
    if (isRecord(detail) && typeof detail['name'] === 'string') return detail['name'];
  }
  return '';
}

// ─────────────────────────────────────────────────────────────
// 2) React 层
// ─────────────────────────────────────────────────────────────

export interface UseRewardEconomyOptions {
  /** 存储键，默认 REWARD_STORAGE_KEY */
  storageKey?: string;
  /** 已掌握内容量（字 / 词 / 题），驱动奖励淡出阶段 */
  masteredCount?: number;
  /** 每日星星上限，默认 DEFAULT_DAILY_CAP */
  dailyCap?: number;
}

/** 扭蛋结果：星星不足时 ok=false，draw 为 null，但仍有温和的目标型文案 */
export interface DrawOutcome {
  ok: boolean;
  draw: CapsuleDrawResult | null;
  /** 操作后的余额 */
  balance: number;
  message: string;
}

export interface CapsuleStat {
  tier: RewardTier;
  ownedCount: number;
  total: number;
}

export interface RewardEconomyApi {
  /** 当前可用星星 */
  balance: number;
  /** 累计赚取（只增不减） */
  lifetime: number;
  /** 当日已入账 */
  earnedToday: number;
  /**
   * 每日星星上限。
   * 触顶时 UI 应给「今天收集的星星够多啦，明天再来」这类**认可式**收尾，
   * 而不是「已达上限」这种限制式提示 —— 上限是防刷的护栏，不是给孩子的墙。
   */
  dailyCap: number;
  /** 已解锁的奖励 id */
  owned: readonly string[];
  /** 扭蛋收集册 */
  collection: readonly string[];
  /** 连续未出稀有计数 */
  pity: number;
  /**
   * 扭蛋各档位的真实抽取概率（含两位小数百分比）。
   * UI 应原样展示，不得改写或省略 —— 概率一旦与算法漂移，
   * 就落入了监管点名的违规情形，也把「惊喜」变回了黑箱。
   */
  odds: readonly CapsuleOdds[];
  /** 距离触发保底还差几次（保底计数必须让孩子看得见） */
  pityRemaining: number;
  /** 当前奖励淡出阶段 */
  stage: RewardStage;
  /** 下一个够得着的目标 */
  goal: RewardGoal | null;
  /** 收集册进度（普通 / 稀有 / 史诗各已收几件） */
  stats: readonly CapsuleStat[];
  /** 存储降级：仍可正常学习，但进度不跨会话保留 */
  degraded: boolean;
  /** 记录一节课结果并入账星星；返回明细供 UI 做「你因为 XX 拿到 N 颗星」 */
  recordSession: (outcome: SessionOutcome) => EarnResult;
  /**
   * 账本校平：把主账本（store）领先于本层的差额补进来。
   * 供星星统一消费层（useUnifiedStars）在对账时调用，balance 与 lifetime
   * 同额增加（保持「已花费 = lifetime - balance」的推导不变）。
   * 只接受正数；调用方负责保证金额来自对账差额，防止凭空印星。
   */
  creditFromStore: (amount: number) => void;
  /** 用星星解锁一件目录奖励 */
  unlock: (itemId: string) => RedeemResult;
  /** 转一次扭蛋（消耗目录中的扭蛋项，重复返星） */
  drawCapsule: (seed?: number) => DrawOutcome;
  /**
   * 清空全部奖励进度。
   * 仅用于家长中心 —— 会连同已解锁奖励与收集册一并清除且不可撤销，
   * 调用方必须自行做二次确认，本 Hook 不提供任何自动重置路径。
   */
  resetAll: () => void;
}

/**
 * 星星经济的 React 绑定层。
 *
 * 状态更新走「ref 镜像 + 显式 next」而非 setState 回调：
 * 所有变更都是读 ref → 算 next → 写 ref → setState，因此同一事件里
 * 连续多次调用也不会因为批处理读到过期值（例如一节课结束时
 * 连续 recordSession 与 drawCapsule）。
 */
export function useRewardEconomy(options: UseRewardEconomyOptions = {}): RewardEconomyApi {
  const {
    storageKey = REWARD_STORAGE_KEY,
    masteredCount = 0,
    dailyCap = DEFAULT_DAILY_CAP,
  } = options;

  const [state, setState] = useState<RewardState>(() =>
    normalizeRewardState(safeGetJSON<unknown>(storageKey, null)),
  );
  const [degraded, setDegraded] = useState(false);

  /** 状态镜像：供事件回调同步读取，规避闭包过期 */
  const stateRef = useRef<RewardState>(state);
  /** 已写入的序列化快照：内容未变则跳过写盘（StrictMode 双调用不产生多余写） */
  const writtenRef = useRef<string | null>(null);
  /** 已加载的存储键：切换 key 时重新水合 */
  const loadedKeyRef = useRef<string>(storageKey);

  // 切换存储键 → 重新读取。刻意声明在持久化 effect 之前：
  // 本次渲染的写盘 effect 会因 writtenRef 未变而跳过，不会把旧数据写进新键。
  useEffect(() => {
    if (loadedKeyRef.current === storageKey) return;
    loadedKeyRef.current = storageKey;
    writtenRef.current = null;
    const next = normalizeRewardState(safeGetJSON<unknown>(storageKey, null));
    stateRef.current = next;
    setState(next);
  }, [storageKey]);

  // 持久化
  useEffect(() => {
    const next = JSON.stringify(state);
    if (writtenRef.current === next) return;
    writtenRef.current = next;
    safeSetJSON(storageKey, state);
  }, [state, storageKey]);

  // 存储不可用 → 降级提示（孩子照常学习，UI 温和告知进度可能不保留）
  useEffect(() => {
    const onError = (event: Event) => {
      if (readErrorName(event) === storageKey) setDegraded(true);
    };
    window.addEventListener('storage-error', onError);
    return () => window.removeEventListener('storage-error', onError);
  }, [storageKey]);

  // 多标签页同步：家长中心与学习页同时打开时保持一致
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      // 另一标签页清空时不跟随：避免一次误触把两个页面的进度一起抹掉
      if (event.newValue === null) return;
      const next = normalizeRewardState(safeParseJSON<unknown>(event.newValue, null));
      stateRef.current = next;
      setState(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  const commit = useCallback((next: RewardState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  /** 读取当前状态（自动跨天翻转） */
  const current = useCallback((): RewardState => rollover(stateRef.current), []);

  const recordSession = useCallback(
    (outcome: SessionOutcome): EarnResult => {
      const prev = current();
      const result = earnStars(outcome, {
        earnedToday: prev.earnedToday,
        dailyCap,
        masteredCount,
      });
      commit({
        ...prev,
        balance: prev.balance + result.granted,
        lifetime: prev.lifetime + result.granted,
        earnedToday: prev.earnedToday + result.granted,
      });
      return result;
    },
    [commit, current, dailyCap, masteredCount],
  );

  const unlock = useCallback(
    (itemId: string): RedeemResult => {
      const prev = current();
      const item = REWARD_CATALOG.find((entry) => entry.id === itemId);
      if (!item) {
        return {
          ok: false,
          balance: prev.balance,
          unlocked: [],
          message: '这个奖励暂时找不到啦，换一个试试！',
          shortfall: 0,
        };
      }
      const result = redeem(prev.balance, item, prev.owned);
      if (result.ok) {
        commit({ ...prev, balance: result.balance, owned: [...prev.owned, item.id] });
      }
      return result;
    },
    [commit, current],
  );

  const draw = useCallback(
    (seed?: number): DrawOutcome => {
      const prev = current();
      const cost = CAPSULE_ITEM.cost;
      if (prev.balance < cost) {
        return {
          ok: false,
          draw: null,
          balance: prev.balance,
          message: `再集 ${cost - prev.balance} 颗星，就能转一次扭蛋啦！`,
        };
      }
      const roll = rollCapsule({
        pity: prev.pity,
        owned: prev.collection,
        ...(seed === undefined ? {} : { seed }),
      });
      const balance = prev.balance - cost + roll.refund;
      const collection = roll.duplicate ? prev.collection : [...prev.collection, roll.prize.id];
      commit({ ...prev, balance, collection, pity: roll.pityAfter });
      return { ok: true, draw: roll, balance, message: roll.message };
    },
    [commit, current],
  );

  const resetAll = useCallback(() => {
    commit(createRewardState());
  }, [commit]);

  /** 账本校平：把主账本领先于本层的差额补进来（balance/lifetime 同增，不占当日上限） */
  const creditFromStore = useCallback(
    (amount: number): void => {
      if (!(amount > 0)) return;
      const prev = current();
      commit({
        ...prev,
        balance: prev.balance + amount,
        lifetime: prev.lifetime + amount,
      });
    },
    [commit, current],
  );

  const stage = useMemo(() => rewardStage(masteredCount), [masteredCount]);
  const odds = useMemo(() => capsuleOdds(), []);
  const goal = useMemo(
    () => nextRewardGoal(state.balance, state.owned),
    [state.balance, state.owned],
  );
  const stats = useMemo<readonly CapsuleStat[]>(
    () => capsuleStats(state.collection),
    [state.collection],
  );

  return {
    balance: state.balance,
    lifetime: state.lifetime,
    earnedToday: state.earnedToday,
    dailyCap,
    owned: state.owned,
    collection: state.collection,
    pity: state.pity,
    odds,
    pityRemaining: pityRemaining(state.pity),
    stage,
    goal,
    creditFromStore,
    stats,
    degraded,
    recordSession,
    unlock,
    drawCapsule: draw,
    resetAll,
  };
}
