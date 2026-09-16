/**
 * ModuleGameShell —— 三核心「一行包裹」的模块级游戏化外壳
 * ───────────────────────────────────────────────────────────────────────────
 * **为什么需要这一层**
 *
 * R144–R167 陆续造齐了游戏化的每一块零件（ComboMeter / GentleFeedback /
 * SessionAdventurePath / RewardStation / GameHud / GameErrorBoundary …），
 * 但扫描全树后发现一个结构性缺口：**这些零件在三核心里是「各挂各的」**——
 * HanziQuizGame 挂了 ComboMeter + GentleFeedback + RestReminder，MathQuiz 挂了
 * ComboMeter + GentleFeedback + RestReminder + StarSettlementCard，WordLearn
 * 只挂了一条 StreakBar。而最能撑起「奖励解锁」闭环的 RewardStation（星星银行 +
 * 扭蛋机）、最能撑起「成长目标感」的 SessionAdventurePath（冒险路线图）与
 * GameHud（成就墙），**全树零挂载**。
 *
 * 结果就是：孩子能赚星星，却看不见余额、也花不出去 —— 行为心理学上这叫
 * 「强化物延迟断裂」。洪恩识字用「礼物塔」把星星换成有形道具，帮帮识字用
 * 「一字一玩」把每个学习单元包装成拆礼物的仪式感，两者共同点是：
 * **赚 → 看见 → 花 → 解锁 → 新目标**这条链必须完整可见。
 *
 * 本外壳把这条链收敛成三核心的一次包裹，同时补齐两块此前全树缺失的兜底：
 *   - GameErrorBoundary：任何子玩法抛错都降级为安抚卡片，绝不整页白屏
 *   - 星星小屋入口：把 RewardStation 挂到孩子眼前，闭环从此成立
 *
 * **设计约束（继承历轮）**
 *   - 纯新增文件，零既有文件改写，零学习逻辑改动；
 *   - 受控组件：combo / feedback / progress 由父级注入，外壳自身不做进度写入；
 *   - 关闭态的星星小屋不渲染内容（零常驻开销）；
 *   - 键盘与读屏可达：入口是真 <button>，面板有 aria-modal / aria-labelledby。
 */
import { useCallback, useId, useMemo, useState, type ReactNode } from 'react';
import type { Progress } from '@/types';
import { GameProvider } from '@/game/GameProvider';
import { GameErrorBoundary } from '@/game/GameErrorBoundary';
import { useStars } from '@/store/useStore';
import type { DifficultyBand, ModuleKey } from '@/game/playVariety';
import { SessionAdventurePath } from './SessionAdventurePath';
import { RewardStation } from './RewardStation';
import { GameHud, type GameHudFeedback } from './GameHud';

/** 学科 → 表扬场景（决定 GameProvider 默认话术）：与三核心既有调用保持一致 */
const SCENE_OF: Record<ModuleKey, 'hanzi' | 'word' | 'math'> = {
  hanzi: 'hanzi',
  words: 'word',
  numbers: 'math',
};

const MODULE_LABEL: Record<ModuleKey, string> = {
  hanzi: '识字',
  words: '词语',
  numbers: '数学',
};

export interface ModuleGameShellProps {
  /** 学科模块键（决定冒险路线玩法池与表扬话术） */
  module: ModuleKey;
  /** 当前自适应难度等级 1–3（冒险路线的难度带上限，绝不越界给孩子挫败感） */
  level: DifficultyBand;
  /** 最新进度快照（成就 / 掌握度判定），由父级注入 store 当前值 */
  progress: Progress;
  /** 当前连击数，驱动 GameHud 的 ComboMeter */
  combo?: number;
  /** 最近的即时反馈；为 null 时不渲染反馈气泡 */
  feedback?: GameHudFeedback | null;
  /** 已掌握内容量（字 / 词 / 题），驱动星星奖励淡出阶段 */
  masteredCount?: number;
  /** 冒险路线种子（同种子 → 同路线，便于课堂可复现与测试） */
  seed?: number;
  /** 跨节课已玩过的玩法 id（抗单调） */
  recent?: readonly string[];
  /** 顶部标题；不传则不渲染 */
  title?: string;
  /** 是否渲染冒险路线图（默认 true） */
  showAdventure?: boolean;
  /** 是否渲染星星小屋入口（默认 true）—— 奖励解锁闭环的入口 */
  showReward?: boolean;
  /** 是否渲染 GameHud 整面板（默认 true） */
  showHud?: boolean;
  /** 家长是否已关闭护眼休息提醒，透传给 GameHud */
  restDisabled?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * 三核心统一外壳。用法：
 *
 * ```tsx
 * <ModuleGameShell module="hanzi" level={1} progress={progress} combo={combo} feedback={fb}>
 *   …练习闭环…
 * </ModuleGameShell>
 * ```
 */
export function ModuleGameShell({
  module,
  level,
  progress,
  combo = 0,
  feedback = null,
  masteredCount = 0,
  seed,
  recent,
  title,
  showAdventure = true,
  showReward = true,
  showHud = true,
  restDisabled,
  className,
  children,
}: ModuleGameShellProps): ReactNode {
  const titleId = useId();
  const [rewardOpen, setRewardOpen] = useState(false);
  /** 星星余额：与成长荣誉馆同源（store 为真源），孩子在这里看到的就是真实可花的 */
  const stars = useStars();

  const getProgress = useMemo(() => () => progress, [progress]);
  const closeReward = useCallback(() => setRewardOpen(false), []);
  const openReward = useCallback(() => setRewardOpen(true), []);

  return (
    <GameErrorBoundary>
      <GameProvider getProgress={getProgress} scene={SCENE_OF[module]}>
        <section className={className} aria-labelledby={title ? titleId : undefined}>
          {title ? (
            <h2 id={titleId} className="sr-only">
              {title}
            </h2>
          ) : null}

          <div className="space-y-3">
            {showAdventure ? (
              <SessionAdventurePath
                module={module}
                level={level}
                seed={seed}
                recent={recent}
              />
            ) : null}

            {showReward ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-200 bg-white/80 px-3 py-2">
                <p className="min-w-0 text-sm font-extrabold text-amber-800">
                  ⭐ 我的星星
                  <span className="ml-1.5 text-base text-amber-600">{stars}</span>
                </p>
                <button
                  type="button"
                  onClick={openReward}
                  aria-haspopup="dialog"
                  aria-expanded={rewardOpen}
                  className="shrink-0 rounded-xl bg-amber-400 px-3 py-1.5 text-sm font-black text-amber-950 transition active:translate-y-[2px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
                >
                  🏠 星星小屋
                </button>
              </div>
            ) : null}
          </div>

          {children}

          {showHud ? (
            <GameHud
              progress={progress}
              combo={combo}
              feedback={feedback}
              restDisabled={restDisabled}
            />
          ) : null}

          {showReward ? (
            <RewardStation
              open={rewardOpen}
              onClose={closeReward}
              masteredCount={masteredCount}
            />
          ) : null}
        </section>
      </GameProvider>
    </GameErrorBoundary>
  );
}

/**
 * 模块中文名（供父级拼标题 / aria 文案，避免各处硬编码不一致）。
 */
export function moduleLabel(module: ModuleKey): string {
  return MODULE_LABEL[module];
}
