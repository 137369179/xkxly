/**
 * 扭蛋机（CapsuleMachine）—— 星星经济的儿童向可视化消费层之二
 * ----------------------------------------------------------------------------
 * 消费 R160 `rewardEconomy.ts` + R161 `useRewardEconomy.ts`。组件受控：数据
 * 与回调外部注入，自身零副作用，单测可纯靠假数据驱动。
 *
 * 本组件最特殊的一点是：**把合规义务直接做成界面的一级信息**。
 *
 * R161 为国家监管要求（概率公示须「百分比 + 两位小数」、保底剩余次数须玩家可见）
 * 专门实现了 `capsuleOdds()` 与 `pityRemaining()`，还写了蒙特卡洛 20,000 次测试
 * 保证公示值与真实算法一致 —— 但那两个函数在 UI 上没有出口，等于合规能力做好了
 * 却看不见。本组件把它们**常驻渲染**在扭蛋机主界面，而不是塞进「规则说明」折叠层。
 *
 * 这同时是一层反操控设计：
 *   ScreenWise 2026《Dopamine-Learning Trap》指出，可变比率强化（variable-ratio
 *   reinforcement）是斯金纳箱的核心机制 —— 正因为结果不可预测，行为才被钩住。
 *   把「普通 70.00% / 稀有 25.00% / 史诗 5.00%」明明白白写在旁边，就是把「惊喜」
 *   拉回「可预期」。透明本身即是反成瘾手段。
 *
 * 三重防挫败（沿用 R160 引擎，本组件只负责如实呈现）：
 *   1. 保底：连续 5 次未出稀有，下次必出稀有及以上，且**剩余次数可见**；
 *   2. 去重优先：优先抽未拥有的奖品，收集过程始终有进展；
 *   3. 重复返星：重复时返还 2 颗星，绝不出现「白抽一次」的纯损失。
 *
 * 约束：受控、零副作用、不触碰三核心学习逻辑、可独立测试。
 */
import { useId, useState } from 'react';
import type { CapsuleDrawResult, CapsuleOdds, CapsulePrize, RewardTier } from '@/game/rewardEconomy';
import type { CapsuleStat } from '@/game/useRewardEconomy';

/** 档位儿童向配色：普通→稀有→史诗，稀有度越高越亮 */
const TIER_STYLE: Record<RewardTier, { label: string; bg: string; ring: string; glow: string }> = {
  common: { label: '普通', bg: 'hsl(200 70% 90%)', ring: 'hsl(200 55% 55%)', glow: 'hsl(200 70% 96%)' },
  rare: { label: '稀有', bg: 'hsl(265 82% 90%)', ring: 'hsl(265 62% 60%)', glow: 'hsl(265 82% 96%)' },
  epic: { label: '史诗', bg: 'hsl(38 95% 88%)', ring: 'hsl(38 80% 52%)', glow: 'hsl(38 95% 95%)' },
};

export interface CapsuleDrawOutcome {
  ok: boolean;
  draw: CapsuleDrawResult | null;
  balance: number;
  message: string;
}

export interface CapsuleMachineProps {
  /** 当前星星余额 */
  balance: number;
  /** 抽一次消耗的星星 */
  cost: number;
  /** 连续未出稀有的计数（用于展示保底剩余） */
  pity: number;
  /** 距离保底还差几次（由 pityRemaining() 计算，UI 不自行推导） */
  pityRemaining: number;
  /** 各档位概率（由 capsuleOdds() 产出，UI 绝不硬编码百分比） */
  odds: readonly CapsuleOdds[];
  /** 各档位收集进度 */
  stats: readonly CapsuleStat[];
  /** 已收集的奖品 id */
  collection: readonly string[];
  /** 全部奖品（用于渲染收集册的未收集占位） */
  prizes: readonly CapsulePrize[];
  /** 抽一次；返回文案原样展示，UI 不重写 */
  onDraw: () => CapsuleDrawOutcome;
  /** 是否需要压低动效（无障碍 / 家长护眼场景） */
  reducedMotion?: boolean;
  className?: string;
}

/**
 * 扭蛋机：摇蛋 → 开蛋 → 收集册，含常驻概率公示与保底剩余。
 */
export function CapsuleMachine({
  balance,
  cost,
  pity,
  pityRemaining,
  odds,
  stats,
  collection,
  prizes,
  onDraw,
  reducedMotion = false,
  className,
}: CapsuleMachineProps) {
  const titleId = useId();
  const oddsId = useId();
  const [outcome, setOutcome] = useState<CapsuleDrawOutcome | null>(null);
  const [shaking, setShaking] = useState(false);

  const safeBalance = Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0;
  const affordable = safeBalance >= cost;
  const ownedSet = new Set(collection);

  function handleDraw() {
    if (!affordable) {
      // 星星不足也走同一条文案通道，保持「目标型」而非「否定型」
      setOutcome(onDraw());
      return;
    }
    if (reducedMotion) {
      setOutcome(onDraw());
      return;
    }
    setShaking(true);
    setOutcome(null);
    window.setTimeout(() => {
      setOutcome(onDraw());
      setShaking(false);
    }, 620);
  }

  const prize = outcome?.draw?.prize ?? null;

  return (
    <section
      className={`rounded-3xl bg-white/90 p-4 shadow-sm${className ? ` ${className}` : ''}`}
      aria-labelledby={titleId}
      data-testid="capsule-machine"
    >
      <style>{`
        @keyframes cmShake {
          0%,100% { transform: translateX(0) rotate(0deg) }
          20% { transform: translateX(-6px) rotate(-7deg) }
          40% { transform: translateX(6px) rotate(7deg) }
          60% { transform: translateX(-4px) rotate(-5deg) }
          80% { transform: translateX(4px) rotate(5deg) }
        }
        @keyframes cmBurst { from { transform: scale(0.3); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes cmGlow { 0%,100% { opacity: 0.55 } 50% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .cm-stop { animation: none !important } }
      `}</style>

      <h3 id={titleId} className="mb-3 text-lg font-extrabold text-[#8f5bff]">
        🎁 星星扭蛋机
      </h3>

      {/* 扭蛋本体 */}
      <div className="mb-3 flex flex-col items-center">
        <div
          className={`cm-stop relative flex h-32 w-32 items-center justify-center rounded-full${shaking ? ' cm-shaking' : ''}`}
          style={{
            background: 'radial-gradient(circle at 34% 30%, hsl(330 95% 96%), hsl(330 80% 82%))',
            boxShadow: '0 6px 0 hsl(330 60% 66%), inset 0 -8px 12px rgba(255,255,255,0.65)',
            animation: shaking ? 'cmShake 620ms ease' : undefined,
          }}
          data-testid="capsule-orb"
        >
          {prize ? (
            <span
              className="cm-stop flex flex-col items-center"
              style={reducedMotion ? undefined : { animation: 'cmBurst 420ms ease both' }}
            >
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full text-3xl"
                style={{
                  background: TIER_STYLE[prize.tier].glow,
                  boxShadow: `0 3px 0 ${TIER_STYLE[prize.tier].ring}`,
                  color: TIER_STYLE[prize.tier].ring,
                }}
                aria-hidden="true"
              >
                {prize.glyph}
              </span>
            </span>
          ) : (
            <span className="text-4xl" aria-hidden="true">
              ⭐
            </span>
          )}
        </div>

        {prize && (
          <p
            className="mt-2 text-lg font-extrabold"
            style={{ color: TIER_STYLE[prize.tier].ring }}
            data-testid="capsule-prize-name"
          >
            {prize.label}
            <span className="ml-1.5 text-xs font-bold">（{TIER_STYLE[prize.tier].label}）</span>
          </p>
        )}

        <button
          type="button"
          onClick={handleDraw}
          disabled={shaking}
          className={`mt-3 rounded-full px-7 py-2.5 text-base font-extrabold transition-transform active:translate-y-[2px]${
            affordable
              ? ' bg-[#8f5bff] text-white shadow-[0_4px_0_#6a4fd0]'
              : ' bg-[#ece7f7] text-[#b0a6cf] shadow-[0_4px_0_#ddd4f0]'
          } ${shaking ? ' cursor-wait' : ''} focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#8f5bff]/50`}
          aria-label={affordable ? `花 ${cost} 颗星抽一次扭蛋` : `抽扭蛋需要 ${cost} 颗星，星星还不够`}
          data-testid="capsule-draw"
        >
          {shaking ? '摇一摇…' : `抽一次 · ${cost}⭐`}
        </button>
        <p className="mt-1 text-xs font-bold text-[#ab81ff] tabular-nums" data-testid="capsule-balance">
          我的星星 {safeBalance}
        </p>
      </div>

      {/* 结果播报 */}
      <p
        className="mb-3 min-h-[1.5rem] text-center text-sm font-extrabold text-[#8f5bff]"
        role="status"
        aria-live="polite"
        data-testid="capsule-notice"
      >
        {outcome ? outcome.message : ''}
      </p>

      {/* 概率公示 —— 常驻一级信息，不折叠。数值全部来自 capsuleOdds() */}
      <div className="mb-3 rounded-2xl bg-[#faf7ff] p-3" data-testid="capsule-odds">
        <h4 id={oddsId} className="mb-1.5 text-sm font-extrabold text-[#6f62b8]">
          📋 抽奖概率公开
        </h4>
        <ul className="flex flex-col gap-1" aria-labelledby={oddsId}>
          {odds.map((row) => {
            const style = TIER_STYLE[row.tier];
            return (
              <li key={row.tier} className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: style.ring }}
                    aria-hidden="true"
                  />
                  <span className="text-[#4a20a0]">{style.label}</span>
                  <span className="text-[#b0a6cf]">（{row.total} 款）</span>
                </span>
                <span className="text-[#6f62b8] tabular-nums" data-testid={`capsule-odds-${row.tier}`}>
                  {row.percent}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-1.5 text-xs leading-relaxed font-bold text-[#ab81ff]" data-testid="capsule-pity">
          连续 {pity} 次没抽到稀有啦 —— 再抽{' '}
          <span className="text-[#8f5bff] tabular-nums">{pityRemaining}</span> 次，一定会出稀有或以上！
        </p>
      </div>

      {/* 收集册：未收集的格子以虚线占位，让「缺口」本身成为牵引力（蔡格尼克效应） */}
      <div data-testid="capsule-collection">
        <h4 className="mb-1.5 text-sm font-extrabold text-[#6f62b8]">📖 我的收集册</h4>
        {stats.map((stat) => {
          const tierPrizes = prizes.filter((p) => p.tier === stat.tier);
          return (
            <div key={stat.tier} className="mb-2">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xs font-extrabold" style={{ color: TIER_STYLE[stat.tier].ring }}>
                  {TIER_STYLE[stat.tier].label}
                </span>
                <span className="text-xs font-bold text-[#ab81ff] tabular-nums">
                  {stat.ownedCount} / {stat.total}
                </span>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {tierPrizes.map((p) => {
                  const has = ownedSet.has(p.id);
                  return (
                    <li
                      key={p.id}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-base${has ? '' : ' border-2 border-dashed border-[#e0d9f5] bg-[#fbfaff]'}`}
                      style={
                        has
                          ? { background: TIER_STYLE[p.tier].glow, boxShadow: `0 2px 0 ${TIER_STYLE[p.tier].ring}`, color: TIER_STYLE[p.tier].ring }
                          : { color: 'rgba(0,0,0,0.12)' }
                      }
                      aria-label={has ? `已收集 ${p.label}` : `未收集，还差一个`}
                      data-testid={`capsule-slot-${p.id}`}
                      data-owned={has ? 'true' : 'false'}
                    >
                      <span aria-hidden="true">{has ? p.glyph : '?'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default CapsuleMachine;
