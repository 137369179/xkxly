// useUnifiedStars — 星星账本统一消费层（R162）
// ------------------------------------------------------------------
// 【为什么需要这一层】
// 项目里存在两套星星账本：store（已上线界面在用）与 rewardEconomy（R160/R161 新建、
// 目前零挂载）。各记各的赚与花，互不知情。若直接把星星小屋挂上去，孩子会在
// 成长荣誉馆和星星小屋看到两个不同的星星数 —— 那不是显示 bug，是**信任事故**。
//
// 本层是唯一的对外出口，对外只给**一个余额**。分工：
//   · 余额与流水 → 以 store 为准（它与已上线界面共用同一份持久化，改动面最小）
//   · 玩法状态   → 收集册 / 保底 / 已解锁 / 奖励淡出 / 每日上限，由 rewardEconomy 持有
//     （这些 store 里没有对应字段，属于星星经济层的增量能力）
//   · 收入       → 双写：一次学习成果同时进 store（可花）与 rewardEconomy（玩法与上限）
//   · 支出       → 走既有通道：贴纸用 store.buySticker，目录奖励与扭蛋走 rewardEconomy
//
// 研究依据（2026）：
//   · Liao 2026（MyReadscape，DOI 10.1057/s41599-026-06750-x）：8 周 N=30 小学二三年级
//     实证发现，真正提升自我调节的是**可视化进度仪表盘**而非徽章收藏；而仪表盘发挥作用
//     的前提是数字可信。两个互相打架的余额，比没有仪表盘更伤。
//   · 儿童向护栏（延续 R160/R161）：本层不引入任何付费、竞争、惩罚语义。
//
// 零改动既有文件：仅通过 store 的公开 selector / action 与 rewardEconomy 的公开 API 协作。

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStore, useSpent, useStars } from '@/store/useStore';
import { safeGetJSON, safeSetJSON } from '@/lib/safeStorage';
import {
  CAPSULE_ITEM,
  useRewardEconomy,
  type CapsuleStat,
  type DrawOutcome,
  type UseRewardEconomyOptions,
} from './useRewardEconomy';
import type {
  CapsuleDrawResult,
  CapsuleOdds,
  EarnResult,
  RedeemResult,
  RewardGoal,
  RewardStage,
  SessionOutcome,
} from './rewardEconomy';
import { REWARD_CATALOG } from './rewardEconomy';
import {
  describeDivergence,
  LEDGER_MIGRATION_KEY,
  LEDGER_MIGRATION_VERSION,
  needsMigration,
  parseMigrationMarker,
  reconcileLedgers,
  type LedgerDivergence,
  type LedgerNotice,
} from './starLedger';

/** 目录奖励解锁结果：在 RedeemResult 之上补齐统一口径后的余额 */
export interface UnifiedRedeemResult extends RedeemResult {
  /** 解锁后的可用星星（统一口径） */
  available: number;
}

export interface UnifiedStarsApi {
  /** 当前可花星星（唯一真源：统一口径后的 store 余额） */
  available: number;
  /** 累计赚得 */
  lifetime: number;
  /** 当日已入账 */
  earnedToday: number;
  /** 每日星星上限（触顶时应给认可式收尾，而非限制式提示） */
  dailyCap: number;
  /** 已解锁的奖励 id */
  owned: readonly string[];
  /** 扭蛋收集册 */
  collection: readonly string[];
  /** 连续未出稀有计数 */
  pity: number;
  /** 距离保底还差几次（保底进度必须让孩子看得见） */
  pityRemaining: number;
  /** 扭蛋各档真实概率（两位小数百分比，UI 原样展示不得改写） */
  odds: readonly CapsuleOdds[];
  /** 当前奖励淡出阶段 */
  stage: RewardStage;
  /** 下一个够得着的目标 */
  goal: RewardGoal | null;
  /** 收集册进度（普通 / 稀有 / 史诗各已收几件） */
  stats: readonly CapsuleStat[];
  /** 存储降级：仍可学习，但进度不跨会话 */
  degraded: boolean;
  /** 两个账本的偏离方向（给家长端 / 日志观测用，不直接展示给孩子） */
  divergence: LedgerDivergence;
  /** 偏离差额 */
  gap: number;
  /** 给孩子看的偏离说明（无偏离时为 null） */
  notice: LedgerNotice | null;
  /** 记录一节课成果：双写 store 与玩法层，返回星星明细 */
  recordSession: (outcome: SessionOutcome) => EarnResult;
  /** 解锁一件目录奖励 */
  unlock: (itemId: string) => UnifiedRedeemResult;
  /** 抽一次扭蛋（seed 供测试与确定性回放注入） */
  draw: (
    seed?: number,
  ) => DrawOutcome & { draw: CapsuleDrawResult | null; available: number };
  /** 兑换贴纸（走 store 既有消费通道） */
  buySticker: (id: string, cost: number) => boolean;
}

/**
 * 统一的星星入口。
 *
 * @param options 透传给 useRewardEconomy 的选项（已掌握量驱动奖励淡出、每日上限等）
 */
export function useUnifiedStars(options: UseRewardEconomyOptions = {}): UnifiedStarsApi {
  const reward = useRewardEconomy(options);
  const storeEarned = useStars();
  const storeSpent = useSpent();

  // rewardEconomy 只暴露「余额」与「累计」，花掉的量由二者推出。
  const rewardSpent = Math.max(0, reward.lifetime - reward.balance);

  const reconciled = useMemo(
    () =>
      reconcileLedgers(
        { earned: storeEarned, spent: storeSpent },
        { earned: reward.lifetime, spent: rewardSpent },
      ),
    [storeEarned, storeSpent, reward.lifetime, rewardSpent],
  );

  // —— 一次性迁移：把「星星经济层记到、却没进主账本」的星星补回去 ——
  // 幂等靠 localStorage 标记；重复迁移等于凭空印星，会毁掉奖励体系的稀缺性。
  const migrationDoneRef = useRef(false);
  useEffect(() => {
    if (migrationDoneRef.current) return;
    migrationDoneRef.current = true;

    const marker = parseMigrationMarker(safeGetJSON<unknown>(LEDGER_MIGRATION_KEY, null));
    if (!needsMigration(reconciled, marker)) return;

    // 读此刻最新的 store，避免 effect 里用到过期闭包值
    const store = useStore.getState();
    store.addStars(reconciled.toMigrate);
    safeSetJSON(LEDGER_MIGRATION_KEY, {
      version: LEDGER_MIGRATION_VERSION,
      migrated: reconciled.toMigrate,
    });
  }, [reconciled]);

  // —— 持续对账（只补 store-ahead）：收入已全双写，reward-ahead 的差额只会
  // 来自历史存档，由上方一次性迁移处理（有标记防印星，二者不可叠加 —— 否则
  // 同一份差额会被迁移和对账各补一次，凭空翻倍）。store-ahead 则可能持续产生：
  // 既有 30+ 处旧代码仍直调 addStars，每次入账都会造成分叉，必须持续校平。
  // max 口径下「补齐落后方」不产生新星星：统一总额仍由领先方账本决定。
  const { creditFromStore } = reward;
  const divergence = reconciled.divergence;
  const gap = reconciled.gap;
  useEffect(() => {
    if (divergence !== 'store-ahead' || gap <= 0) return;
    creditFromStore(gap);
  }, [divergence, gap, creditFromStore]);

  const recordSession = useCallback(
    (outcome: SessionOutcome): EarnResult => {
      // 先过玩法层：拿到评级星 / 连击 / 全对 / 奖励淡出后的最终星数，
      // 以及当日上限是否触顶（触顶时 granted 为 0，store 也就不该加星）。
      const result = reward.recordSession(outcome);
      if (result.granted > 0) {
        // store 是余额真源，必须同步入账，否则孩子挣的星花不出去。
        useStore.getState().addStars(result.granted);
      }
      return result;
    },
    [reward],
  );

  const unlock = useCallback(
    (itemId: string): UnifiedRedeemResult => {
      const result = reward.unlock(itemId);
      let available = reconciled.unified.available;
      if (result.ok) {
        // 支出双写：经济层扣过的星星，store 同步扣 —— 两本账永不分叉
        const spent = REWARD_CATALOG.find((item) => item.id === itemId)?.cost ?? 0;
        if (spent > 0) useStore.getState().spendStars(spent);
        available = Math.max(0, available - spent);
      }
      return { ...result, available };
    },
    [reward, reconciled.unified.available],
  );

  const draw = useCallback(
    (seed?: number): DrawOutcome & {
      draw: CapsuleDrawResult | null;
      available: number;
    } => {
      const outcome = reward.drawCapsule(seed);
      let available = reconciled.unified.available;
      if (outcome.ok) {
        // 支出双写：扭蛋扣款进 store；重复奖品的退款同步返还。
        // 校平 effect 会先把两本账拉齐，这里 spendStars 与经济层校验同标准。
        const store = useStore.getState();
        const refund = outcome.draw?.refund ?? 0;
        if (store.spendStars(CAPSULE_ITEM.cost) && refund > 0) {
          store.addStars(refund);
        }
        available = Math.max(0, available - CAPSULE_ITEM.cost + refund);
      }
      return { ...outcome, available };
    },
    [reward, reconciled.unified.available],
  );

  const buySticker = useCallback((id: string, cost: number): boolean => {
    // 贴纸消费已由 store 承载（成长荣誉馆在用），这里只做转发，
    // 不另建一套消费通道 —— 多一条通道就多一处账本分叉。
    return useStore.getState().buySticker(id, cost);
  }, []);

  return {
    available: reconciled.unified.available,
    lifetime: reconciled.unified.earned,
    earnedToday: reward.earnedToday,
    dailyCap: reward.dailyCap,
    owned: reward.owned,
    collection: reward.collection,
    pity: reward.pity,
    pityRemaining: reward.pityRemaining,
    odds: reward.odds,
    stage: reward.stage,
    goal: reward.goal,
    stats: reward.stats,
    degraded: reward.degraded,
    divergence: reconciled.divergence,
    gap: reconciled.gap,
    notice: describeDivergence(reconciled),
    recordSession,
    unlock,
    draw,
    buySticker,
  };
}
