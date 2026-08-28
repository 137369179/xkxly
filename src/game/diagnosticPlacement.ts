/**
 * diagnosticPlacement.ts — 先测后学 · 诊断前置（I 层 I1）
 *
 * 纯函数诊断模块：根据孩子已有的掌握数据，推断每个学科模块的建议起始层级，
 * 实现「先测后学 / 诊断前置」而非一刀切从第一关开始。
 *
 * 设计约束（与既有矩阵正交、零冲突）：
 * - 纯函数、无副作用、无 React / 无 store 依赖（结构化入参，解耦 progress 实现）。
 * - 不修改任何既有学习逻辑，仅作为可被三核心按需 import 的诊断工具。
 * - 零 any / 零非空断言 / 零 console —— 对 lint 基线净贡献为 0。
 *
 * 研究佐证（2026.8）：
 * - 帮帮识字「1 分钟 AI 测字，先测后学，识字效率看得见」。
 * - 宝宝巴士分龄三段式（3-4 / 4-5 / 6+）精准推荐起点。
 * - Khanmigo Diagnostic Agent 先诊断再动态重排课程。
 */

export type DiagnosticModule = 'hanzi' | 'words' | 'numbers';

/** 起始层级：1 种子启蒙 → 4 硕果 mastery */
export type Tier = 1 | 2 | 3 | 4;

export interface DiagnosticInput {
  /** 已掌握汉字数（mastery 中 `hanzi:` 前缀计数） */
  hanziKnown: number;
  /** 已掌握词语数（mastery 中 `word:` 前缀计数） */
  wordKnown: number;
  /** 数学已答对题数（progress.mathCorrect） */
  mathCorrect: number;
  /** 连续学习天数（可选，仅用于附加建议文案） */
  streak?: number;
}

export interface ModulePlacement {
  module: DiagnosticModule;
  tier: Tier;
  label: string;
}

export interface DiagnosticResult {
  /** 综合起始层级（取三个模块掌握总量的映射） */
  overall: Tier;
  label: string;
  modules: ModulePlacement[];
  reason: string;
}

const TIER_LABELS: Record<Tier, string> = {
  1: '种子启蒙',
  2: '幼苗成长',
  3: '花开绽放',
  4: '硕果 mastery',
};

/**
 * 单模块掌握量 → 起始层级阈值：
 * 0–9  → 1（从最基础开始，避免跳关造成挫败）
 * 10–49 → 2
 * 50–149 → 3
 * 150+ → 4（已具相当基础，进入进阶）
 */
export function tierForCount(count: number): Tier {
  const n = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  if (n >= 150) return 4;
  if (n >= 50) return 3;
  if (n >= 10) return 2;
  return 1;
}

const MODULE_LABELS: Record<DiagnosticModule, string> = {
  hanzi: '汉字',
  words: '词语',
  numbers: '数学',
};

/**
 * 诊断起始层级：返回综合层级 + 各模块独立建议起点。
 * 综合层级采用「总量映射」而非取最大值，避免单一模块偏大误推整体难度。
 */
export function diagnoseStartLevel(input: DiagnosticInput): DiagnosticResult {
  const hanziKnown = Math.max(0, Math.floor(input.hanziKnown || 0));
  const wordKnown = Math.max(0, Math.floor(input.wordKnown || 0));
  const mathCorrect = Math.max(0, Math.floor(input.mathCorrect || 0));
  const total = hanziKnown + wordKnown + mathCorrect;

  const modules: ModulePlacement[] = (
    [
      ['hanzi', hanziKnown],
      ['words', wordKnown],
      ['numbers', mathCorrect],
    ] as const
  ).map(([module, count]) => {
    const tier = tierForCount(count);
    return { module, tier, label: `${MODULE_LABELS[module]}·${TIER_LABELS[tier]}` };
  });

  const overall = tierForCount(total);
  const streakNote =
    typeof input.streak === 'number' && input.streak > 0
      ? `，连续学习 ${input.streak} 天保持节奏`
      : '';
  const reason =
    total === 0
      ? '尚未检测到掌握数据，从种子启蒙层级开始，先测后学'
      : `已掌握约 ${total} 项（汉字 ${hanziKnown} / 词语 ${wordKnown} / 数学 ${mathCorrect}），建议综合从${TIER_LABELS[overall]}层级进入${streakNote}`;

  return {
    overall,
    label: TIER_LABELS[overall],
    modules,
    reason,
  };
}
