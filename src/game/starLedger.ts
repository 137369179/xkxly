// starLedger — 星星账本统一层（R162）
// ------------------------------------------------------------------
// 【本模块要解决的真实缺陷】
// 代码库里同时存在两套互不感知的星星账本：
//   ① store 账本（`baby-learning-park-v1`，字段 progress.stars / progress.spent）
//      —— 成长荣誉馆、贴纸商店等**已上线界面**真正在用的余额来源；
//   ② 星星经济层（`bb:reward-economy`，字段 balance / lifetime / earnedToday）
//      —— R160/R161 新建的扭蛋与奖励目录层，目前**全树零挂载**。
//
// 二者各自记「赚」与「花」，彼此不知道对方存在。一旦把星星小屋（RewardStation）
// 挂上去，孩子会在两个界面看到两个不一样的星星数 —— 这不是显示瑕疵，而是**信任崩塌**：
// 孩子会认为「我的星星丢了」。对一个靠积累感驱动的学习产品，这比少给几颗星严重得多。
//
// 因此本层的第一原则不是「算得快」，而是**永不丢星**：
//   - 赚得取两本最大值（宁可多算，绝不让孩子辛苦挣的星凭空消失）；
//   - 花掉取两本最大值（已兑走的奖励不会因为换了一本账就「白送」）；
//   - 取最大值而非相加，是为了避免把同一次学习在两个账本里各记一次（重复计数）。
//
// 研究依据（2026）：
//   - Liao 2026（MyReadscape，Humanit Soc Sci Commun 13:473，DOI 10.1057/s41599-026-06750-x）
//     8 周、N=30 小学二三年级实证：真正驱动自我调节的是**可视化进度仪表盘**
//     （孩子主动用它自查「还差几本到下一级」），而徽章收藏「作用远小于预期」。
//     推论：进度反馈的可信度是仪表盘发挥作用的前提 —— 数字自相矛盾的仪表盘比没有更糟。
//   - ScreenWise 2026《Dopamine-Learning Trap》：可变比率强化是斯金纳箱的核心，
//     而透明、可预期是对冲手段。统一账本 = 让「我为什么有这些星星」可被解释。
//
// 本模块纯函数、零依赖、零 React，可安全单测与复用。

/** 单个账本在某一时刻的快照 */
export interface LedgerSnapshot {
  /** 累计赚得（理论只增不减） */
  earned: number;
  /** 累计花掉（理论只增不减） */
  spent: number;
}

/** 统一口径后的星星账本 */
export interface UnifiedStars {
  /** 累计赚得 */
  earned: number;
  /** 累计花掉 */
  spent: number;
  /** 当前可花的星星，恒 >= 0 */
  available: number;
}

/**
 * 两个账本的偏离方向。
 * - `store-ahead`：store 记的赚得更多（正常态 —— 学习任务直接 addStars，不经过星星经济层）
 * - `reward-ahead`：星星经济层记的赚得更多（异常态 —— 通常意味着某次入账没同步进 store，需要迁移）
 * - `none`：两边一致
 */
export type LedgerDivergence = 'none' | 'store-ahead' | 'reward-ahead';

export interface ReconcileResult {
  /** 统一口径后的账本 */
  unified: UnifiedStars;
  /** 偏离方向 */
  divergence: LedgerDivergence;
  /** 两个账本「赚得」的差额（绝对值），用于健康度观测 */
  gap: number;
  /**
   * 需要补记进 store 的星星数。
   * 仅当 reward-ahead 时 > 0 —— 意味着孩子在星星经济层挣了星却没能同步到主账本，
   * 这些星必须补回去，否则等于把孩子的成果抹掉。
   */
  toMigrate: number;
}

/**
 * 星星数量的合理上界。
 * 用于把 Infinity / 超大脏值钳回可运算区间 —— 存档被写坏时，钳到一个大数
 * 也比让余额变成 NaN 强：NaN 会让所有比较失效，界面直接空白。
 */
export const MAX_STARS = 1_000_000;

/**
 * 把任意来源的星星数量洗成安全的非负整数。
 * NaN / 非数字 → 0；负数 → 0；Infinity 或超界 → MAX_STARS；小数 → 向下取整。
 */
export function sanitizeAmount(value: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  // 正负无穷必须分开处理：两者都落到「非有限」分支会把 -Infinity 钳成 MAX_STARS，
  // 一个写坏的存档就会让孩子凭空多出上百万颗星 —— 比归零更糟，因为它直接摧毁
  // 整个奖励体系的稀缺性与可信度。
  if (value === Number.POSITIVE_INFINITY) return MAX_STARS;
  if (value === Number.NEGATIVE_INFINITY) return 0;
  if (value <= 0) return 0;
  if (value > MAX_STARS) return MAX_STARS;
  return Math.floor(value);
}

/**
 * 合并两个账本为统一口径。
 *
 * 规则（永不丢星 + 防重复计数）：
 *   earned = max(store.earned, reward.earned)
 *   spent  = max(store.spent,  reward.spent)
 *   available = max(0, earned - spent)
 *
 * 为什么是 max 而不是 sum：两套账本记录的是**同一件事**（孩子的学习成果），
 * 相加会把一次学习算成两次。取最大值保证：任何一个账本记到的成果都不会被抹掉。
 */
export function reconcileLedgers(
  store: LedgerSnapshot,
  reward: LedgerSnapshot,
): ReconcileResult {
  const storeEarned = sanitizeAmount(store.earned);
  const storeSpent = sanitizeAmount(store.spent);
  const rewardEarned = sanitizeAmount(reward.earned);
  const rewardSpent = sanitizeAmount(reward.spent);

  const earned = Math.max(storeEarned, rewardEarned);
  const spent = Math.max(storeSpent, rewardSpent);

  let divergence: LedgerDivergence = 'none';
  if (storeEarned > rewardEarned) divergence = 'store-ahead';
  else if (rewardEarned > storeEarned) divergence = 'reward-ahead';

  return {
    unified: {
      earned,
      spent,
      // 花掉的星理论上不会超过赚得的；万一存档写坏出现倒挂，
      // 宁可显示 0 也不能显示负数 —— 负余额对孩子是无法理解的概念。
      available: Math.max(0, earned - spent),
    },
    divergence,
    gap: Math.abs(storeEarned - rewardEarned),
    toMigrate: Math.max(0, earned - storeEarned),
  };
}

/**
 * 判断一次迁移是否已经完成（幂等标记）。
 * 迁移只能做一次：重复迁移会把同一批星星反复加进主账本（重复计数），
 * 那等于凭空印星，长期会毁掉整个奖励体系的稀缺性与可信度。
 */
export const LEDGER_MIGRATION_KEY = 'bb:star-ledger-migrated';

export interface MigrationMarker {
  /** 已完成迁移的 schema 版本 */
  version: number;
  /** 迁移时刻补记的星星数，供排查「余额为何变多」时溯源 */
  migrated: number;
}

/** 当前迁移版本。结构变更时递增，触发新一轮幂等迁移。 */
export const LEDGER_MIGRATION_VERSION = 1;

/**
 * 解析迁移标记。任何不认识 / 损坏的结构都视为「未迁移」——
 * 因为「误判为已迁移」的代价是丢星，而「误判为未迁移」的代价只是多跑一次幂等检查。
 */
export function parseMigrationMarker(raw: unknown): MigrationMarker | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record: Record<string, unknown> = raw as Record<string, unknown>;
  const version = record['version'];
  const migrated = record['migrated'];
  if (typeof version !== 'number' || !Number.isFinite(version)) return null;
  if (typeof migrated !== 'number' || !Number.isFinite(migrated)) return null;
  return { version: Math.floor(version), migrated: Math.floor(migrated) };
}

/**
 * 判断是否需要执行迁移。
 * 需要迁移 = 有差额可补（toMigrate > 0）且当前版本尚未标记完成。
 */
export function needsMigration(
  result: ReconcileResult,
  marker: MigrationMarker | null,
): boolean {
  if (result.toMigrate <= 0) return false;
  if (marker === null) return true;
  return marker.version < LEDGER_MIGRATION_VERSION;
}

/**
 * 生成给孩子的偏离说明文案。
 * 返回 null 表示无需向孩子解释（没有偏离，或差额小到不值得打断学习）。
 *
 * 刻意不写「数据异常」「同步失败」这类成人系统术语 ——
 * 孩子看不懂，只会感到不安。需要排查的信息走 `divergence` / `gap` 字段给家长端或日志。
 */
export interface LedgerNotice {
  /** 语气：补记（好事）vs 持平 */
  tone: 'gained' | 'steady';
  /** 给孩子看的短句 */
  message: string;
}

/** 低于该差额不打扰孩子（避免为了 1 颗星打断学习心流） */
export const NOTICE_THRESHOLD = 1;

export function describeDivergence(result: ReconcileResult): LedgerNotice | null {
  if (result.toMigrate < NOTICE_THRESHOLD) return null;
  return {
    tone: 'gained',
    // 「找回来」而不是「补发」—— 前者让孩子感到自己的努力被尊重，后者像系统出错的救济。
    message: `帮你找回了 ${result.toMigrate} 颗星星！`,
  };
}
