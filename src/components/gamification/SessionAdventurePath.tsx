/**
 * 本节课冒险路线（SessionAdventurePath）—— 玩法轮换调度器的儿童向可视化消费层
 * ----------------------------------------------------------------------------
 * 直接消费 R159 落地的 `src/game/playVariety.ts`：
 *   - 把「18 种玩法池 + 六级降级链」渲染成孩子看得懂的「冒险路线图」
 *   - 每个玩法 = 一个彩色站点（认/学/读/写/练/测 六类形态一目了然）
 *   - 难度带用 ★ 与配色双通道表达（低带暖粉 → 高带青蓝，营造进阶感）
 *
 * 设计目标对齐需求：
 *   #1 每个学习功能独立游戏化玩法 → 路线图把「多样性」直接呈现给孩子
 *   #2 渐进式难度 → 站点按 band 着色，孩子看见「越来越厉害」的成长线
 *   #5 学习进度 / 成就 / 成长目标感 → 路线图 = 本节课的清晰目标清单
 *
 * 约束：纯展示、受控、零副作用、不触碰三核心学习逻辑、可独立测试。
 * 后续接入点：三核心练习组件（HanziQuizGame/WordMatch/MathQuiz）当前为用户 WIP，
 * 接入时只需在练习循环顶部 <SessionAdventurePath module level recent seed /> 即可。
 */
import { useId, useMemo } from 'react';
import {
  buildSessionPlan,
  type DifficultyBand,
  type ModuleKey,
  type PlayMode,
} from '@/game/playVariety';

const MODULE_LABEL: Record<ModuleKey, string> = {
  hanzi: '识字',
  words: '词语',
  numbers: '数学',
};

// 难度带配色：低带暖粉(330°) → 高带青蓝(250°)，hsl 明快果冻感
function bandColor(band: number): string {
  const hue = 330 - (band - 1) * 40;
  return `hsl(${hue} 85% 72%)`;
}

function bandRing(band: number): string {
  const hue = 330 - (band - 1) * 40;
  return `hsl(${hue} 70% 55%)`;
}

export interface SessionAdventurePathProps {
  /** 当前学科模块 */
  module: ModuleKey;
  /** 当前自适应难度等级（= 路线难度带上限，绝不越界给孩子挫败感） */
  level: DifficultyBand;
  /** 跨节课已玩过的玩法 id（抗单调），可不传 */
  recent?: readonly string[];
  /** 随机种子（同种子 → 同路线，便于课堂可复现与测试） */
  seed?: number;
  /** 本节课站点数，默认 5（对齐洪恩「每 5 字一单元」） */
  length?: number;
  /** 是否降低动效（无障碍 / 家长护眼场景） */
  reducedMotion?: boolean;
  className?: string;
}

/**
 * 孩子向的「本节课冒险路线」：把玩法轮换调度结果渲染成彩色站点序列。
 */
export function SessionAdventurePath({
  module,
  level,
  recent,
  seed,
  length,
  reducedMotion = false,
  className,
}: SessionAdventurePathProps) {
  const titleId = useId();
  const plan: PlayMode[] = useMemo(
    () => buildSessionPlan({ module, level, recent, seed, length }),
    [module, level, recent, seed, length],
  );

  return (
    <section
      className={`rounded-2xl bg-white/85 p-4 shadow-sm${className ? ` ${className}` : ''}`}
      aria-labelledby={titleId}
      data-testid="session-adventure-path"
    >
      <style>{`
        @keyframes sapPop { from { transform: scale(0.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .sap-stop { animation: none !important } }
      `}</style>
      <h3 id={titleId} className="mb-3 text-lg font-extrabold text-[#8b6ef0]">
        🗺️ {MODULE_LABEL[module]}课 · 今天的冒险路线
      </h3>
      <ol
        className="flex flex-col gap-2"
        aria-label={`${MODULE_LABEL[module]}本节课共 ${plan.length} 个玩法`}
      >
        {plan.map((mode, i) => (
          <li
            key={`${mode.id}-${i}`}
            className={`sap-stop flex items-center gap-3 rounded-xl bg-[#faf7ff] p-2${reducedMotion ? ' sap-reduced' : ''}`}
            aria-current={i === 0 ? 'step' : undefined}
            style={
              reducedMotion
                ? undefined
                : { animation: `sapPop 260ms ease ${i * 70}ms both` }
            }
          >
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white shadow"
              style={{ background: bandColor(mode.band), boxShadow: `0 2px 0 ${bandRing(mode.band)}` }}
            >
              {mode.label.slice(0, 2)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-extrabold text-[#4a3f8a]">{mode.label}</span>
              <span className="truncate text-xs text-[#9b8fc7]">{mode.hint}</span>
            </span>
            <span
              className="shrink-0 text-sm"
              aria-label={`难度 ${mode.band} 星`}
              style={{ color: bandRing(mode.band) }}
            >
              {'★'.repeat(mode.band)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
