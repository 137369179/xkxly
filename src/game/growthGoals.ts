/**
 * growthGoals — 任务 #5「成长目标感」跨模块聚合器
 * ─────────────────────────────────────────────────────────────────
 * 把分散在 mastery / streak / wrongBook / milestone 的进度，
 * 收敛成一组「给孩子看的下一成长目标」，让学习像游戏一样有明确方向感。
 *
 * 设计约束（与 R144–R154 已建 @/game 基础设施一致）：
 *  - 纯函数、零 React 依赖、零用户 WIP 依赖 → 可安全新建、零回归风险；
 *  - 仅依赖稳定契约：Progress 类型 + @/lib/milestone（已提交稳定）；
 *    不 import 任何 WIP 模块（如 moduleStats / index.ts 当前均为 WIP）；
 *  - 三核心练习闭环收敛 WIP 后，可通过
 *    `import { computeGrowthGoals } from '@/game/growthGoals'`
 *    在「今日 / 成长」页增量挂载，学习逻辑零改动。
 *
 * 研究依据（R1–R154 竞品 / 国际 RCT）：
 *  - 进度须报「掌握度 > 分数」（Sepúlveda 2026 streak η²=0.38–0.42；
 *    R123 三层级成长闭环：即时层 / 掌握层 / 成长层）；
 *  - 连续学习给短期目标（never-miss-twice 安全网）；
 *  - 错题消灭给具体下一步（温和引导，非惩罚）；
 *  - 成就里程碑给长期方向（避免刷分，2 胜即停防过度游戏化）。
 */
import type { Progress } from '@/types';
import { achievedCount, milestoneCount } from '@/lib/milestone';

export type GrowthGoalKind = 'mastery' | 'streak' | 'mistake' | 'achievement';

export interface GrowthGoal {
  id: string;
  kind: GrowthGoalKind;
  /** 给孩子看的目标标题 */
  label: string;
  current: number;
  target: number;
  /** 0–1 完成度，便于进度环 / 条形渲染 */
  progress: number;
  /** 具体下一步引导（温和、正向） */
  hint: string;
}

export interface GrowthGoalConfig {
  /** 各模块「熟练」目标总量（lv>=4 计为熟练） */
  hanziTarget?: number;
  wordTarget?: number;
  mathTarget?: number;
  /** 连续学习里程碑天数 */
  streakMilestone?: number;
}

const DEFAULTS: Required<GrowthGoalConfig> = {
  hanziTarget: 300,
  wordTarget: 74,
  mathTarget: 101,
  streakMilestone: 7,
};

/** 统计某前缀集合下「熟练」(lv>=4) 的 skill 数量 */
function masteredCount(progress: Progress, prefixes: string[]): number {
  return Object.entries(progress.mastery).reduce((sum, [key, item]) => {
    const hit = prefixes.some((prefix) => key.startsWith(`${prefix}:`));
    if (!hit) return sum;
    const lv = item?.lv ?? 0;
    return sum + (lv >= 4 ? 1 : 0);
  }, 0);
}

function clamp01(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * 计算「下一成长目标」列表。
 * 纯函数：不修改入参，返回新数组；缺失字段以安全默认值处理。
 */
export function computeGrowthGoals(progress: Progress, opts: GrowthGoalConfig = {}): GrowthGoal[] {
  const cfg = { ...DEFAULTS, ...opts };
  const goals: GrowthGoal[] = [];

  const hanzi = masteredCount(progress, ['hanzi']);
  goals.push({
    id: 'hanzi-mastery',
    kind: 'mastery',
    label: '汉字小达人',
    current: hanzi,
    target: cfg.hanziTarget,
    progress: clamp01(hanzi / cfg.hanziTarget),
    hint:
      hanzi >= cfg.hanziTarget
        ? '已掌握全部基础汉字，太厉害了！'
        : `再掌握 ${cfg.hanziTarget - hanzi} 个汉字，就能解锁新绘本`,
  });

  const word = masteredCount(progress, ['word']);
  goals.push({
    id: 'word-mastery',
    kind: 'mastery',
    label: '词语小能手',
    current: word,
    target: cfg.wordTarget,
    progress: clamp01(word / cfg.wordTarget),
    hint:
      word >= cfg.wordTarget
        ? '词语全部拿下，继续挑战！'
        : `再掌握 ${cfg.wordTarget - word} 个词语，去读更多故事`,
  });

  const math = masteredCount(progress, ['math', 'number']);
  goals.push({
    id: 'math-mastery',
    kind: 'mastery',
    label: '数学小天才',
    current: math,
    target: cfg.mathTarget,
    progress: clamp01(math / cfg.mathTarget),
    hint:
      math >= cfg.mathTarget
        ? '数学本领全点亮，真棒！'
        : `再练会 ${cfg.mathTarget - math} 道数学，成为计算高手`,
  });

  const streak = progress.streak ?? 0;
  const streakTarget = cfg.streakMilestone;
  goals.push({
    id: 'streak',
    kind: 'streak',
    label: '连续学习星',
    current: streak,
    target: streakTarget,
    progress: clamp01(streak / streakTarget),
    hint:
      streak >= streakTarget
        ? `已连续学习 ${streak} 天，习惯养成中！`
        : `再连续学习 ${streakTarget - streak} 天，就能解锁连续成就`,
  });

  const wrong = progress.wrongBook?.length ?? 0;
  goals.push({
    id: 'mistake-clear',
    kind: 'mistake',
    label: '错题消灭战',
    current: wrong === 0 ? 1 : 0,
    target: 1,
    progress: wrong === 0 ? 1 : 0,
    hint:
      wrong === 0
        ? '没有错题啦，保持住！'
        : `还有 ${wrong} 个错题，练熟它们就能全部消灭`,
  });

  const achieved = achievedCount(progress);
  const total = milestoneCount();
  goals.push({
    id: 'achievement',
    kind: 'achievement',
    label: '成就收藏家',
    current: achieved,
    target: total,
    progress: clamp01(total === 0 ? 1 : achieved / total),
    hint:
      total > 0 && achieved >= total
        ? '所有成就都点亮了，你是学习之星！'
        : `再解锁 ${Math.max(0, total - achieved)} 个里程碑，收集更多勋章`,
  });

  return goals;
}
