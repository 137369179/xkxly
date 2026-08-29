/**
 * 星星银行（StarBank）—— 星星经济的儿童向可视化消费层之一
 * ----------------------------------------------------------------------------
 * 消费 R160 `rewardEconomy.ts` + R161 `useRewardEconomy.ts`，补上闭环里缺失的
 * 「花 → 解锁 → 新目标」三环。组件刻意做成**受控**：数据与回调全部由外部注入，
 * 自身不碰 localStorage、不调 hook，因此在单测里可以纯靠假数据驱动。
 *
 * 三条研究驱动的设计：
 *
 *  1) **目标梯度效应（Goal-Gradient Effect）**
 *     Kivetz/Urminsky/Zheng (2006) 咖啡卡实验：集 10 送 1 的空白卡完成率 19%，
 *     而「集 12 但已预盖 2 格」的卡完成率 34% —— 实际都要再盖 10 格，差别只
 *     在「已经开始」的视觉暗示。本组件因此**强调剩余距离**（还差 N 颗星）而非
 *     已完成量，并把 12 级目录切成孩子够得着的小台阶（Milestone Chunking）。
 *
 *     但这里刻意**不制造幻觉进度**（Illusionary Goal Progress）—— 综述把它列为
 *     操纵性设计。进度条永远反映真实余额，起步优势靠「首档只要 5 颗星」这种
 *     真实的低门槛实现，而不是靠给一笔虚假的初始星星。
 *
 *  2) **防奖励后重置（Post-Reward Reset）**
 *     目标达成后动机会瞬间跌回基线，即便下一个奖励已在视野内 —— 这是最容易
 *     流失用户的时刻。因此解锁成功后，下一个目标与庆祝文案**同屏**出现，
 *     用「新目标已就位」填平动机断崖，而不是先弹庆祝再回到一张空列表。
 *
 *  3) **目标型文案，而非否定型**
 *     余额不足时统一说「再集 N 颗星，就能解锁 X 啦」，绝不说「星星不够」。
 *     文案只有一份实现 —— 直接复用 redeem() 的返回，UI 不重写第二份，
 *     避免两处措辞漂移成「买不起」这类挫败表达。
 *
 * 约束：受控、零副作用、不触碰三核心学习逻辑、可独立测试。
 */
import { useId, useState } from 'react';
import type { RedeemResult, RewardGoal, RewardItem } from '@/game/rewardEconomy';

/** 奖励类别的儿童向配色（果冻感 hsl，与三核心模块配色同源） */
const KIND_STYLE: Record<RewardItem['kind'], { bg: string; ring: string; emoji: string }> = {
  capsule: { bg: 'hsl(330 85% 88%)', ring: 'hsl(330 70% 62%)', emoji: '🎁' },
  theme: { bg: 'hsl(265 85% 90%)', ring: 'hsl(265 65% 62%)', emoji: '🎨' },
  pet: { bg: 'hsl(28 90% 88%)', ring: 'hsl(28 75% 58%)', emoji: '🐾' },
  badge: { bg: 'hsl(45 92% 86%)', ring: 'hsl(42 78% 52%)', emoji: '🏅' },
  story: { bg: 'hsl(160 70% 88%)', ring: 'hsl(160 55% 48%)', emoji: '📖' },
};

export interface StarBankProps {
  /** 当前星星余额 */
  balance: number;
  /** 今日入账（跨天由持久化层重置，此处只读展示） */
  earnedToday?: number;
  /** 下一个够得着的目标；null 表示目录已全部解锁 */
  goal: RewardGoal | null;
  /** 奖励目录（默认 REWARD_CATALOG，传入可覆盖以便测试） */
  catalog: readonly RewardItem[];
  /** 已解锁的奖励 id */
  owned: readonly string[];
  /**
   * 解锁回调。返回值直接来自 redeem()，组件原样展示其 message —— 不重写文案。
   */
  onUnlock: (itemId: string) => RedeemResult;
  /** 是否需要压低动效（无障碍 / 家长护眼场景） */
  reducedMotion?: boolean;
  className?: string;
}

type RowState = 'owned' | 'ready' | 'locked';

function rowStateOf(item: RewardItem, balance: number, owned: readonly string[]): RowState {
  if (owned.includes(item.id)) return 'owned';
  return balance >= item.cost ? 'ready' : 'locked';
}

/**
 * 星星银行：余额 + 目标梯度进度 + 12 级奖励阶梯。
 */
export function StarBank({
  balance,
  earnedToday = 0,
  goal,
  catalog,
  owned,
  onUnlock,
  reducedMotion = false,
  className,
}: StarBankProps) {
  const titleId = useId();
  const goalId = useId();
  const [notice, setNotice] = useState<RedeemResult | null>(null);

  const safeBalance = Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0;

  // 进度条：真实反映余额 / 目标成本，绝不制造幻觉进度
  const progress = goal ? Math.min(1, Math.max(0, goal.progress)) : 1;

  function handleUnlock(item: RewardItem) {
    const result = onUnlock(item.id);
    setNotice(result);
  }

  return (
    <section
      className={`rounded-3xl bg-white/90 p-4 shadow-sm${className ? ` ${className}` : ''}`}
      aria-labelledby={titleId}
      data-testid="star-bank"
    >
      <style>{`
        @keyframes sbFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
        @keyframes sbPop { from { transform: scale(0.82); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes sbShine { from { background-position: -160px 0 } to { background-position: 240px 0 } }
        @media (prefers-reduced-motion: reduce) { .sb-stop { animation: none !important } }
      `}</style>

      <h3 id={titleId} className="mb-3 text-lg font-extrabold text-[#8f5bff]">
        ⭐ 我的星星银行
      </h3>

      {/* 余额区 */}
      <div className="mb-3 flex items-end justify-between rounded-2xl bg-[hsl(45_92%_94%)] p-3">
        <div className="flex items-end gap-2">
          <span
            className={`sb-stop text-4xl leading-none font-extrabold text-[#e0a008] tabular-nums${reducedMotion ? '' : ' sb-float'}`}
            style={reducedMotion ? undefined : { animation: 'sbFloat 2.6s ease-in-out infinite' }}
            aria-label={`当前星星余额 ${safeBalance} 颗`}
            data-testid="star-bank-balance"
          >
            {safeBalance}
          </span>
          <span className="pb-1 text-sm font-bold text-[#b8860b]">颗星星</span>
        </div>
        {earnedToday > 0 && (
          <span
            className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-extrabold text-[#e08a08]"
            data-testid="star-bank-today"
          >
            今天 +{earnedToday}
          </span>
        )}
      </div>

      {/* 目标梯度进度：强调「还差多少」，把大目标切成够得着的小台阶 */}
      <div className="mb-4" data-testid="star-bank-goal">
        {goal ? (
          <>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span id={goalId} className="truncate text-sm font-extrabold text-[#4a20a0]">
                下一个目标：{goal.item.label}
              </span>
              <span className="shrink-0 text-xs font-bold text-[#ab81ff]">
                {safeBalance} / {goal.item.cost}
              </span>
            </div>
            <div
              className="h-3.5 w-full overflow-hidden rounded-full bg-[#efe9ff]"
              role="progressbar"
              aria-labelledby={goalId}
              aria-valuemin={0}
              aria-valuemax={goal.item.cost}
              aria-valuenow={Math.min(safeBalance, goal.item.cost)}
              aria-valuetext={`还差 ${goal.shortfall} 颗星`}
            >
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  background: reducedMotion
                    ? 'linear-gradient(90deg, hsl(45 92% 62%), hsl(330 80% 70%))'
                    : 'linear-gradient(90deg, hsl(45 92% 62%) 0%, hsl(20 90% 68%) 45%, hsl(330 80% 70%) 100%)',
                  backgroundSize: reducedMotion ? undefined : '240px 100%',
                  animation: reducedMotion ? undefined : 'sbShine 3.2s linear infinite',
                }}
                data-testid="star-bank-goal-bar"
              />
            </div>
            <p className="mt-1.5 text-xs font-bold text-[#8f5bff]">
              再集 {goal.shortfall} 颗星，就能解锁「{goal.item.label}」啦！
            </p>
          </>
        ) : (
          <p className="rounded-2xl bg-[hsl(160_70%_92%)] p-3 text-sm font-extrabold text-[#2f7d63]">
            🎉 太棒了！你已经把星星小屋里的奖励全部解锁啦！
          </p>
        )}
      </div>

      {/* 12 级奖励阶梯 */}
      <h4 className="mb-2 text-sm font-extrabold text-[#6f62b8]">🎁 奖励阶梯</h4>
      <ul className="flex flex-col gap-2" data-testid="star-bank-catalog">
        {catalog.map((item, i) => {
          const state = rowStateOf(item, safeBalance, owned);
          const style = KIND_STYLE[item.kind];
          const isOwned = state === 'owned';
          const isReady = state === 'ready';
          return (
            <li
              key={item.id}
              className={`sb-stop flex items-center gap-3 rounded-2xl border-2 p-2.5${
                isOwned ? ' border-[#cfe9d8] bg-[#f4fbf6]'
                : isReady ? ' border-[#ffd98a] bg-[#fffaf0]'
                : ' border-transparent bg-[#faf7ff]'
              }`}
              style={reducedMotion ? undefined : { animation: `sbPop 240ms ease ${i * 40}ms both` }}
              data-testid={`star-bank-item-${item.id}`}
              data-state={state}
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ background: style.bg, boxShadow: `0 2px 0 ${style.ring}` }}
              >
                {style.emoji}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`truncate font-extrabold ${isOwned ? 'text-[#5a8f70]' : 'text-[#4a20a0]'}`}>
                  {item.label}
                </span>
                <span className="truncate text-xs text-[#ab81ff]">{item.description}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-extrabold text-[#e0a008] tabular-nums">{item.cost}⭐</span>
                {isOwned ? (
                  <span className="rounded-full bg-[#dff2e6] px-2 py-0.5 text-xs font-extrabold text-[#3f7d5c]">
                    已解锁
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUnlock(item)}
                    disabled={!isReady}
                    className={`rounded-full px-3 py-1 text-xs font-extrabold transition-transform active:translate-y-[1px]${
                      isReady
                        ? ' bg-[#8f5bff] text-white shadow-[0_2px_0_#6a4fd0]'
                        : ' cursor-not-allowed bg-[#ece7f7] text-[#b0a6cf]'
                    } focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#8f5bff]/50`}
                    aria-label={isReady ? `用 ${item.cost} 颗星解锁${item.label}` : `${item.label}需要 ${item.cost} 颗星，星星还不够`}
                  >
                    {isReady ? '解锁' : '未解锁'}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {/* 结果播报：live region 让读屏与孩子同步收到反馈 */}
      <p
        className="mt-3 min-h-[1.5rem] text-center text-sm font-extrabold text-[#8f5bff]"
        role="status"
        aria-live="polite"
        data-testid="star-bank-notice"
      >
        {notice ? notice.message : ''}
      </p>
    </section>
  );
}

export default StarBank;
