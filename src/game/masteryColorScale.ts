/**
 * masteryColorScale — 掌握度四档色阶（A1 色不独依 + 任务#5 进度成就可视化）
 * ------------------------------------------------------------------
 * 把「掌握度分数(0–1)」映射为四档视觉令牌，供进度环 / 成就墙 / 关卡地图统一渲染。
 *
 * 设计原则（来自 R108 / R135 研究）：
 *  - 四档：untouched / novice / skilled / master；
 *  - 每档返回 { level, label, hex, shape, ariaLabel } —— 形状 + 文字双重编码，
 *    绝不只靠颜色传递信息（A1 色不独依 / 色盲友好 / 神经包容 Rule of Three）；
 *  - 提供 colorblindSafe 调色板（Okabe-Ito 8 色系子集），确保色觉差异者仍可区分；
 *  - 纯函数、零依赖、零 React → 可安全新建、三核心 WIP 收敛后一行 import 复用。
 *
 * 研究依据（R1–R157 竞品 / 国际 RCT 收敛）：
 *  - E 实证层：掌握度 > 分数（Sepúlveda 2026 streak η²=0.38–0.42；
 *    R123 三层级成长闭环：即时层 / 掌握层 / 成长层）；
 *  - A 层：色不独依（R135 A1）/ 神经包容（Rule of Three）；
 *  - 国际 RCT（2026）：掌握≥16 字母技能增益更大（ResearchSquare2026）→ 掌握度色阶是
 *    孩子「明确成长目标感」（任务#5）的核心可视化载体。
 */

export type MasteryLevel = 'untouched' | 'novice' | 'skilled' | 'master';

export type MasteryShape = 'circle' | 'triangle' | 'square' | 'star';

export interface MasteryTier {
  level: MasteryLevel;
  /** 给孩子看的中文标签 */
  label: string;
  /** 默认（果冻粉主题）主色，HEX */
  hex: string;
  /** 色盲友好主色（Okabe-Ito 子集），HEX */
  colorblindHex: string;
  /** 形状编码（与颜色并列，避免只靠颜色传递信息） */
  shape: MasteryShape;
  /** 屏幕阅读器文案 */
  ariaLabel: string;
}

export interface MasteryThresholds {
  /** 达到「初识」的掌握度（默认 0.25） */
  novice: number;
  /** 达到「熟练」的掌握度（默认 0.6） */
  skilled: number;
  /** 达到「精通」的掌握度（默认 0.9） */
  master: number;
}

export const DEFAULT_THRESHOLDS: MasteryThresholds = {
  novice: 0.25,
  skilled: 0.6,
  master: 0.9,
};

/** 四档视觉令牌（颜色 + 形状双重编码，色盲友好变体基于 Okabe-Ito 调色板） */
export const MASTERY_TIERS: Record<MasteryLevel, Omit<MasteryTier, 'level'>> = {
  untouched: {
    label: '未接触',
    hex: '#E5E7EB',
    colorblindHex: '#999999',
    shape: 'circle',
    ariaLabel: '尚未开始学习',
  },
  novice: {
    label: '初识',
    hex: '#FFD1DC',
    colorblindHex: '#F0E442',
    shape: 'triangle',
    ariaLabel: '刚刚认识，继续加油',
  },
  skilled: {
    label: '熟练',
    hex: '#FF8FB1',
    colorblindHex: '#56B4E9',
    shape: 'square',
    ariaLabel: '已经比较熟练啦',
  },
  master: {
    label: '精通',
    hex: '#FF5C8A',
    colorblindHex: '#0072B2',
    shape: 'star',
    ariaLabel: '完全掌握，你真棒',
  },
};

const ORDER: MasteryLevel[] = ['untouched', 'novice', 'skilled', 'master'];

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * 由掌握度分数(0–1)判定所属档位。
 * 纯函数：不修改入参，非法/越界值安全降级为 untouched。
 */
export function getMasteryLevel(
  score: number,
  thresholds: MasteryThresholds = DEFAULT_THRESHOLDS,
): MasteryLevel {
  const s = clamp01(score);
  if (s >= thresholds.master) return 'master';
  if (s >= thresholds.skilled) return 'skilled';
  if (s >= thresholds.novice) return 'novice';
  return 'untouched';
}

/** 由掌握度分数派生完整视觉令牌（含颜色 + 形状 + 文案） */
export function getMasteryTier(
  score: number,
  thresholds: MasteryThresholds = DEFAULT_THRESHOLDS,
): MasteryTier {
  const level = getMasteryLevel(score, thresholds);
  return { level, ...MASTERY_TIERS[level] };
}

/** 由「已掌握次数 / 目标总量」派生掌握度并取档（任务#5 进度环 / 成就墙常用） */
export function getMasteryTierByCount(
  mastered: number,
  target: number,
  thresholds: MasteryThresholds = DEFAULT_THRESHOLDS,
): MasteryTier {
  const score = target > 0 ? mastered / target : 0;
  return getMasteryTier(score, thresholds);
}

/**
 * 计算「距离下一档还差多少」的进度（0–1），用于温和引导文案，
 * 例如「再练 3 个就到熟练啦」。已到达最高档时 to=null、progress=1。
 */
export function nextTierProgress(
  score: number,
  thresholds: MasteryThresholds = DEFAULT_THRESHOLDS,
): { from: MasteryLevel; to: MasteryLevel | null; progress: number } {
  const level = getMasteryLevel(score, thresholds);
  const idx = ORDER.indexOf(level);
  if (idx >= ORDER.length - 1) {
    return { from: level, to: null, progress: 1 };
  }
  const lower = idx === 0 ? 0 : (thresholds[ORDER[idx] as keyof MasteryThresholds] as number);
  const upper = thresholds[ORDER[idx + 1] as keyof MasteryThresholds] as number;
  const s = clamp01(score);
  const progress = upper > lower ? (s - lower) / (upper - lower) : 0;
  return { from: level, to: ORDER[idx + 1]!, progress: clamp01(progress) };
}
