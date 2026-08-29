/**
 * StarWallet — 星星钱包与成长目标（R161 持久化层的儿童向消费层）
 * ----------------------------------------------------------------------------
 * 直接消费 `src/game/useRewardEconomy.ts`，把「赚 → 攒 → 花 → 解锁 → 新目标」
 * 这条闭环第一次变成**孩子看得见、点得动**的界面。
 *
 * 为什么拆成两个导出：
 *   持久化层是按 storageKey 落盘的，同一页面挂两个实例会互相覆盖存档。
 *   因此 `StarWallet` 只做纯展示（api 必填、零副作用、易测），
 *   需要 drop-in 的场景用 `StarWalletConnected`（内部挂一个 hook 后转交）。
 *   这样「一个页面一个数据源」在类型层面就是默认，而不是靠调用方自觉。
 *
 * 设计决策（每条都有研究或代码依据）：
 *   ① **概率公示摆在扭蛋机旁边，不折叠**——监管要求「显著位置 + 百分比 +
 *      两位小数」，且点名「仅公示部分奖池」为违规；同时透明本身就是反操控
 *      （可变比率强化是斯金纳箱的核心机制，把概率摆到台面上，
 *       就把「惊喜」从黑箱拉回「可预期」）。
 *   ② **保底剩余次数常驻可见**——「再抽 N 次必出稀有」，监管要求玩家能
 *      清晰看到距离保底的剩余次数。
 *   ③ **余额不足时给目标而非否定**——按钮保持可点，点击后说「还差 N 颗星」，
 *      而不是置灰停用（R160 已定的产品口径：错误与不足都不惩罚）。
 *   ④ **奖励淡出驱动界面重心迁移**——掌握量越高，标题从「我的星星」转向
 *      「我学会啦」，但星星数字**始终可见**：研究指出完全撤除认可会让低龄
 *      儿童失去「被看见」的感觉，淡出的是外部牵引，不是胜任感反馈。
 *   ⑤ **真实 button + 完整 ARIA**——余额与操作结果走 aria-live，屏幕阅读器
 *      能即时播报「你抽到了…」，不靠视觉独享信息。
 *
 * 约束：纯展示 / 零副作用 / 不触碰三核心学习逻辑 / 可独立测试。
 * 接入点：三核心练习组件当前为用户 WIP，收敛后在页面内
 * `<StarWalletConnected masteredCount={n} />` 即可。
 */
import { useId, useState } from 'react';
import { REWARD_CATALOG } from '@/game/rewardEconomy';
import type { RewardItem, RewardTier } from '@/game/rewardEconomy';
import type { RewardEconomyApi } from '@/game/useRewardEconomy';
import { useRewardEconomy } from '@/game/useRewardEconomy';

const TIER_LABEL: Record<RewardTier, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
};

const TIER_COLOR: Record<RewardTier, string> = {
  common: 'hsl(210 70% 62%)',
  rare: 'hsl(275 75% 64%)',
  epic: 'hsl(38 95% 52%)',
};

const KIND_ICON: Record<RewardItem['kind'], string> = {
  capsule: '🎰',
  theme: '🎨',
  pet: '🐱',
  badge: '🏅',
  story: '📖',
};

export interface StarWalletProps {
  /** 星星经济 api 实例（由 StarWalletConnected 或父级注入，保证单数据源） */
  api: RewardEconomyApi;
  /** 已掌握内容量（字 / 词 / 题），用于奖励淡出后的重心迁移展示 */
  masteredCount?: number;
  /** 是否渲染奖励小屋，默认 true */
  showRewards?: boolean;
  /** 是否渲染扭蛋机（含概率公示与保底计数），默认 true */
  showCapsule?: boolean;
  /** 是否渲染收集册，默认 true */
  showCollection?: boolean;
  /**
   * 扭蛋随机种子。不传时用 Date.now()（生产随机）；
   * 传固定值则结果可复现（单测 / 课堂演示）。
   */
  seed?: number;
  /** 是否降低动效（无障碍 / 家长护眼场景） */
  reducedMotion?: boolean;
  className?: string;
}

export function StarWallet({
  api,
  masteredCount = 0,
  showRewards = true,
  showCapsule = true,
  showCollection = true,
  seed,
  reducedMotion = false,
  className,
}: StarWalletProps) {
  const titleId = useId();
  const goalId = useId();
  const rewardsId = useId();
  const capsuleId = useId();
  const collectionId = useId();

  /** 最近一次操作的结果文案（解锁 / 扭蛋），走 aria-live 即时播报 */
  const [notice, setNotice] = useState<string | null>(null);
  /** 最近抽到的奖品（展示用） */
  const [lastPrize, setLastPrize] = useState<{ glyph: string; label: string; tier: RewardTier } | null>(null);

  const { balance, lifetime, earnedToday, dailyCap, owned, collection, odds, pityRemaining, stage, goal, stats, degraded } =
    api;

  // 奖励淡出：掌握量到自主期，重心从「星星」转向「我学会了什么」
  const competenceFirst = stage.emphasis === 'competence';
  const todayFull = earnedToday >= dailyCap;

  const onUnlock = (item: RewardItem) => {
    const result = api.unlock(item.id);
    setLastPrize(null);
    setNotice(result.message);
  };

  const onDraw = () => {
    const outcome = api.drawCapsule(seed ?? Date.now());
    setNotice(outcome.message);
    if (outcome.draw) {
      setLastPrize({
        glyph: outcome.draw.prize.glyph,
        label: outcome.draw.prize.label,
        tier: outcome.draw.prize.tier,
      });
    }
  };

  const capsuleCost = REWARD_CATALOG[0].cost;
  const canDraw = balance >= capsuleCost;

  return (
    <section
      aria-labelledby={titleId}
      data-testid="star-wallet"
      className={`rounded-2xl bg-white/85 p-4 shadow-sm${className ? ` ${className}` : ''}`}
    >
      <style>{`
        @keyframes swPop { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes swShine { 0%,100% { transform: scale(1) } 50% { transform: scale(1.08) } }
        @keyframes swDrop { from { transform: translateY(-6px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) {
          .sw-anim { animation: none !important }
        }
      `}</style>

      <h3 id={titleId} className="mb-3 text-lg font-extrabold text-[#8f5bff]">
        {competenceFirst ? '🌟 我学会啦' : '⭐ 我的星星'}
      </h3>

      {/* ① 余额区：淡出期缩小视觉权重，但绝不隐藏（孩子需要「被看见」） */}
      <div className="flex items-end gap-3 rounded-xl bg-[#faf7ff] p-3">
        <div className={`sw-anim ${competenceFirst ? '' : 'text-4xl'} font-extrabold text-[#ff9f1c]`}
          style={{
            fontSize: competenceFirst ? 28 : undefined,
            animation: reducedMotion ? undefined : 'swShine 2.4s ease-in-out infinite',
          }}
          aria-live="polite"
          aria-label={`当前星星 ${balance} 颗`}
        >
          <span aria-hidden="true">⭐</span> {balance}
        </div>
        <div className="flex-1 pb-1 text-xs text-[#ab81ff]">
          {competenceFirst ? (
            <div>
              已经掌握 <b className="text-[#4a20a0]">{masteredCount}</b> 个内容啦
            </div>
          ) : null}
          <div>
            今天收集 <b className="text-[#4a20a0]">{earnedToday}</b> 颗 · 累计{' '}
            <b className="text-[#4a20a0]">{lifetime}</b> 颗
          </div>
          {todayFull ? (
            <div className="mt-1 text-[#ff9f1c]">今天收集的星星够多啦，明天再来！</div>
          ) : null}
        </div>
      </div>

      {degraded ? (
        <p className="mt-2 rounded-lg bg-[#fff7e6] p-2 text-xs text-[#a06a00]" role="status">
          这个设备暂时存不住进度，星星可能不会一直留着，但学习不受影响哦。
        </p>
      ) : null}

      {/* ② 下一个够得着的目标（需求 #5：明确的成长目标感） */}
      {goal ? (
        <div className="mt-3" id={goalId}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-extrabold text-[#4a20a0]">
              <span aria-hidden="true">🎯 </span>下一个目标
            </span>
            <span className="text-[#ab81ff]">
              {goal.shortfall > 0 ? `还差 ${goal.shortfall} 颗星` : '可以解锁啦！'}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={goal.item.cost}
            aria-valuenow={balance}
            aria-valuetext={
              goal.shortfall > 0
                ? `${goal.item.label}，还差 ${goal.shortfall} 颗星`
                : `${goal.item.label}，可以解锁啦！`
            }
            className="h-3 overflow-hidden rounded-full bg-[#efe9ff]"
          >
            <div
              className="h-full rounded-full bg-[#ff9f1c] transition-[width] duration-500"
              style={{ width: `${Math.round(goal.progress * 100)}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-[#ab81ff]">
            {KIND_ICON[goal.item.kind]} {goal.item.label} · {goal.item.description}
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-[#faf7ff] p-2 text-sm text-[#4a20a0]">
          🎉 全部奖励都解锁啦，你太棒了！
        </p>
      )}

      {/* ③ 奖励小屋：花 → 解锁 */}
      {showRewards ? (
        <div className="mt-4" id={rewardsId}>
          <h4 className="mb-2 text-sm font-extrabold text-[#4a20a0]">
            <span aria-hidden="true">🎁 </span>奖励小屋
          </h4>
          <ul className="flex flex-wrap gap-2" aria-label="可解锁的奖励">
            {REWARD_CATALOG.map((item) => {
              const isOwned = owned.includes(item.id);
              const affordable = balance >= item.cost;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onUnlock(item)}
                    data-testid={`reward-${item.id}`}
                    aria-label={`${item.label}，需要 ${item.cost} 颗星${isOwned ? '，已拥有' : ''}`}
                    className={`sw-anim rounded-xl px-3 py-2 text-left text-xs font-bold ${
                      isOwned
                        ? 'bg-[#e8f7ee] text-[#2f855a]'
                        : affordable
                          ? 'bg-[#faf7ff] text-[#4a20a0]'
                          : 'bg-[#f6f5fa] text-[#a9a3c2]'
                    }`}
                    style={{
                      boxShadow: affordable && !isOwned ? '0 2px 0 #ffd6ec' : undefined,
                      animation: reducedMotion ? undefined : 'swPop 260ms ease both',
                    }}
                  >
                    <span className="block text-base" aria-hidden="true">
                      {isOwned ? '✅' : KIND_ICON[item.kind]}
                    </span>
                    <span className="block">{item.label}</span>
                    <span className="block text-xs font-normal">
                      {isOwned ? '已拥有' : `${item.cost} 颗星`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* ④ 扭蛋机 + 概率公示 + 保底可见 */}
      {showCapsule ? (
        <div className="mt-4 rounded-xl bg-[#faf7ff] p-3" id={capsuleId}>
          <h4 className="mb-2 text-sm font-extrabold text-[#4a20a0]">
            <span aria-hidden="true">🎰 </span>扭蛋机
          </h4>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onDraw}
              data-testid="capsule-draw"
              disabled={!canDraw}
              aria-label={`转一次扭蛋，需要 ${capsuleCost} 颗星`}
              className="sw-anim rounded-xl px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
              style={{
                background: canDraw ? 'linear-gradient(135deg,#ff7eb3 0%,#8f5bff 100%)' : '#c9c4dd',
                animation: reducedMotion || !canDraw ? undefined : 'swShine 2s ease-in-out infinite',
              }}
            >
              转一转 · {capsuleCost}⭐
            </button>
            <div className="text-xs text-[#ab81ff]">
              {canDraw
                ? `再抽 ${pityRemaining} 次必出稀有`
                : `再集 ${capsuleCost - balance} 颗星就能转啦`}
            </div>
          </div>

          {/* 概率公示：显著位置 + 百分比 + 两位小数（不可折叠、不可省略） */}
          <dl
            className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#ab81ff]"
            data-testid="capsule-odds"
            aria-label="扭蛋各档位抽取概率"
          >
            {odds.map((o) => (
              <div key={o.tier} className="flex items-center gap-1">
                <dt style={{ color: TIER_COLOR[o.tier] }} className="font-bold">
                  {TIER_LABEL[o.tier]}
                </dt>
                <dd>{o.percent}</dd>
              </div>
            ))}
          </dl>

          {lastPrize ? (
            <p
              className="sw-anim mt-2 text-sm font-extrabold"
              style={{
                color: TIER_COLOR[lastPrize.tier],
                animation: reducedMotion ? undefined : 'swDrop 320ms ease both',
              }}
            >
              <span aria-hidden="true">{lastPrize.glyph} </span>
              {lastPrize.label}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ⑤ 收集册 */}
      {showCollection ? (
        <div className="mt-4" id={collectionId}>
          <h4 className="mb-2 text-sm font-extrabold text-[#4a20a0]">
            <span aria-hidden="true">📖 </span>收集册
          </h4>
          <ul className="flex flex-wrap gap-2 text-xs" aria-label="收集册进度">
            {stats.map((stat) => (
              <li
                key={stat.tier}
                className="rounded-lg bg-[#faf7ff] px-2 py-1 font-bold"
                style={{ color: TIER_COLOR[stat.tier] }}
              >
                {TIER_LABEL[stat.tier]} {stat.ownedCount}/{stat.total}
              </li>
            ))}
          </ul>
          {collection.length === 0 ? (
            <p className="mt-1 text-xs text-[#a9a3c2]">还没有收集到小礼物，去转一次扭蛋吧！</p>
          ) : null}
        </div>
      ) : null}

      {/* 操作结果播报：屏幕阅读器与视觉同步（需求 #3 即时反馈） */}
      <p
        role="status"
        aria-live="polite"
        data-testid="wallet-notice"
        className="mt-3 min-h-[1.25rem] text-sm font-bold text-[#8f5bff]"
      >
        {notice}
      </p>
    </section>
  );
}

export interface StarWalletConnectedProps extends Omit<StarWalletProps, 'api'> {
  /** 已掌握内容量（同时驱动奖励淡出阶段与界面重心） */
  masteredCount?: number;
  /** 存储键，默认 REWARD_STORAGE_KEY */
  storageKey?: string;
  /** 每日星星上限，默认 DEFAULT_DAILY_CAP */
  dailyCap?: number;
}

/**
 * drop-in 版本：内部挂载唯一的 useRewardEconomy 实例后转交 StarWallet。
 * 同一页面只应出现一个 —— 多个实例会写同一个存储键而互相覆盖。
 */
export function StarWalletConnected({
  masteredCount = 0,
  storageKey,
  dailyCap,
  ...rest
}: StarWalletConnectedProps) {
  const api = useRewardEconomy({ masteredCount, storageKey, dailyCap });
  return <StarWallet api={api} masteredCount={masteredCount} {...rest} />;
}
