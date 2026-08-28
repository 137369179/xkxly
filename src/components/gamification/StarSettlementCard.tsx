/**
 * 星星结算卡（StarSettlementCard）—— 让「赚到星星」变成可核验的事实
 * ------------------------------------------------------------------
 * 【本组件要解决的真实缺陷】
 * 三核心练习（汉字闯关 / 词语配对 / 数学闯关）在结算页都会画星星：
 * 汉字闯关用本地 `totalStars`（答对一题 +1）、词语配对用 `score` 阈值换算 1–3 星、
 * 数学闯关走 RoundRunner 的 `starsByMistakes`。三者口径互不相同，且**没有一颗
 * 真的进账** —— 星星只活在组件的 `useState` 里，离开结算页就蒸发。
 *
 * 孩子在结算页被明确告知「你获得了 N 颗星」，但成长荣誉馆、贴纸商店、成就徽章
 * 读到的都是另一个数字。这不是显示瑕疵，是**承诺不兑现**：孩子迟早会发现
 * 「我明明赚了星星，却什么都换不了」。对靠积累感驱动的学习产品，这比少给几颗星
 * 更伤 —— 它摧毁的是「努力会被记住」这个前提。
 *
 * 【本组件的定位】
 * 只做一件事：把 `earnStars()` 算出的 `EarnResult` 诚实、具体、可被孩子读懂地
 * 呈现出来。**不计算、不存储、不发起副作用** —— 结算与入账由调用方完成，
 * 本组件因此可被独立测试，也永远不会与实际入账数说两套话。
 *
 * 【研究依据（2026）】
 * - Liao 2026（MyReadscape，Humanit Soc Sci Commun 13:473）：8 周 N=30 实证发现，
 *   真正提升学习自我调节的是**可视化进度仪表盘**，而徽章收藏作用远小于预期。
 *   推论：仪表盘有效的前提是数字可信 —— 因此本卡逐项列出星从哪来，
 *   让「我为什么有这些星星」可被解释，而不是一个凭空冒出的总数。
 * - Deci / Koestner / Ryan 元分析（过度理由效应）：外部奖励撤除后内驱可能低于基线。
 *   对冲手段是把奖励描述成**胜任感信息**而非交易 —— 故明细文案写「答得又快又准」
 *   这类对能力的陈述，不写「奖励你 N 颗星」这类交易句式。
 * - ScreenWise 2026《Dopamine-Learning Trap》：可变比率强化是斯金纳箱核心。
 *   本卡刻意**不**做随机翻倍、不显示「再抽一次」，收益完全可预期。
 */
import type { EarnResult, StarBreakdown } from '@/game/rewardEconomy';

/** 明细来源的展示元数据（emoji + 短标签），UI 与文案收敛在一处避免散落 */
const SOURCE_META: Record<StarBreakdown['source'], { emoji: string; label: string }> = {
  rating: { emoji: '⭐', label: '表现' },
  combo: { emoji: '🔥', label: '连击' },
  perfect: { emoji: '🎯', label: '全对' },
  comeback: { emoji: '💪', label: '不放弃' },
};

interface StarSettlementCardProps {
  /** 由 `earnStars()` 产出的结算结果 —— 本组件信任它，不重算 */
  result: EarnResult;
  /** 模块中文名，用于无障碍标签（如「汉字」） */
  moduleName?: string;
  /** 减弱动画：关闭逐项弹跳，仅保留静态呈现 */
  reducedMotion?: boolean;
  className?: string;
}

/**
 * 结算卡。
 *
 * 三种状态必须都被照顾到，缺一个都会在真实使用中露出破绽：
 *  1. 正常入账（granted > 0）：展示总数 + 逐项明细 + 已存入口袋的确认
 *  2. 当日上限触顶（granted === 0 但 raw > 0）：**认可式收尾**而非限制式提示。
 *     孩子刚完成一节课，此刻收到「不能再赚了」是把成就翻译成惩罚；
 *     改写为「今天已经很棒了」并把注意力引向明天。
 *  3. 无有效题量（raw === 0）：不应发生，但兜底给中性鼓励，绝不显示「0 颗星」。
 */
export function StarSettlementCard({
  result,
  moduleName,
  reducedMotion = false,
  className,
}: StarSettlementCardProps) {
  const items = result.breakdown;
  const capped = result.capped > 0;

  return (
    <section
      className={className}
      role="status"
      aria-live="polite"
      aria-label={moduleName ? `${moduleName}本回合星星结算` : '本回合星星结算'}
    >
      <style>{`
        @keyframes sscPop { from { transform: scale(.72); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes sscGlow { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
      `}</style>

      {/* 总数：孩子第一眼要看的是「我赚了多少」，所以放最前、字号最大 */}
      {result.granted > 0 ? (
        <p
          className="ssc-total text-center"
          data-animate="true"
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: '#e8537f',
            lineHeight: 1.35,
            animation: reducedMotion ? undefined : 'sscPop 320ms cubic-bezier(.34,1.56,.64,1) both',
          }}
        >
          <span
            aria-hidden="true"
            data-animate="true"
            style={{
              display: 'inline-block',
              fontSize: 30,
              animation: reducedMotion ? undefined : 'sscGlow 1.6s ease-in-out 400ms 2',
            }}
          >
            🌟
          </span>
          <br />
          这节课赚到 {result.granted} 颗星，已经存进你的口袋啦！
        </p>
      ) : (
        /* 状态 2 / 3：绝不显示「0 颗星」，把上限翻译成对今天的认可 */
        <p
          className="ssc-rested text-center"
          style={{ fontSize: 18, fontWeight: 900, color: '#7a6bb8', lineHeight: 1.45 }}
        >
          今天已经赚了好多星星啦，你真棒！
          <br />
          <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.85 }}>
            明天再来，星星会继续等着你 🌙
          </span>
        </p>
      )}

      {/* 逐项明细：让「我为什么有这些星星」可被解释（Liao 2026 仪表盘可信度前提） */}
      {items.length > 0 && (
        <ul
          className="mt-3"
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}
          aria-label="星星明细"
        >
          {items.map((item, i) => {
            const meta = SOURCE_META[item.source];
            return (
              <li
                key={`${item.source}-${i}`}
                className="ssc-item"
                data-animate="true"
                data-source={item.source}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 12px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,.72)',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#5a4ba8',
                  animation: reducedMotion
                    ? undefined
                    : `sscPop 240ms ease ${120 + i * 70}ms both`,
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 16 }}>
                  {meta.emoji}
                </span>
                {/* 明细文案由 earnStars 提供（能力陈述式，非交易式） */}
                <span style={{ flex: 1 }}>{item.reason}</span>
                <span
                  style={{ color: '#e8537f', fontWeight: 900, whiteSpace: 'nowrap' }}
                  aria-label={`${meta.label}获得 ${item.stars} 颗星`}
                >
                  +{item.stars}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* 上限提示：承认「少给了」，而不是假装什么都没发生 */}
      {capped && (
        <p
          className="ssc-cap-note mt-2 text-center"
          style={{ fontSize: 12, fontWeight: 700, color: '#9b8fc7' }}
        >
          今天的星星口袋已经装得很满啦，这节课还有 {result.capped} 颗留给明天 🌙
        </p>
      )}
    </section>
  );
}
