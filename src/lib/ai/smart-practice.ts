/**
 * AI 智能练习 · 错题诊断引擎
 * ------------------------------------------------------------------
 * 设计定位（与现有系统的边界）：
 *   - `srs.ts`     负责「掌握度存储 / 间隔重复」（真相源）
 *   - `adaptChain` 负责「难度链升降档」（训练节奏）
 *   - 本模块      只做「薄弱类型诊断 + 个性化复习建议」这一层，
 *                 完全基于 srs 的 MasteryItem 数据，**不重复**掌握度/难度逻辑。
 *
 * 之前版本（被虚假「完成报告」声称落地）的问题：
 *   1. analyzeSkillErrors 把 skillId 硬编码为空字符串 → 无法定位任何技能；
 *   2. detectWeaknessType 的 'calculation' 分支永远走不到（死代码）；
 *   3. 整个模块未被任何 UI 集成，是孤儿骨架。
 * 本版本修复上述全部问题，并提供真正可用的 diagnoseSkill 入口。
 */

import type { MasteryItem } from '@/types';

export type DifficultyLevel = 1 | 2 | 3;
export type WeaknessType =
  | 'conceptual'
  | 'calculation'
  | 'memory'
  | 'application'
  | 'carelessness';

export interface ErrorAnalysis {
  /** 技能 id（如 `math:add`），本版本保证真实回填 */
  skillId: string;
  weaknessType: WeaknessType;
  /** 累计错误次数（来自 mastery.ng） */
  frequency: number;
  lastErrorAt: number;
  suggestedDifficulty: DifficultyLevel;
  recommendedActions: string[];
}

/** 薄弱类型 → 儿童友好的口语化标签（展示在练习小结） */
export const WEAKNESS_LABEL: Record<WeaknessType, string> = {
  conceptual: '还没完全弄懂',
  calculation: '容易算错',
  memory: '有点记混了',
  application: '没看清题意',
  carelessness: '有点粗心',
};

/** 薄弱类型 → 复习行动建议（儿童友好、可操作） */
const RECOMMENDATIONS: Record<WeaknessType, string[]> = {
  conceptual: ['先看小茜讲一讲', '从更简单的内容练起', '多听几遍例题'],
  calculation: ['慢慢算，别跳步', '用草稿纸列算式', '算完再检查一遍'],
  memory: ['多读几遍记一记', '用卡片帮记忆', '隔一会儿再复习'],
  application: ['读清题目要求', '想想解题步骤', '做完说说思路'],
  carelessness: ['做完检查一遍', '圈出关键词', '看清楚再选'],
};

/** 错题分析引擎：薄弱类型诊断 + 个性化复习建议 */
export class ErrorAnalysisEngine {
  /**
   * 基于掌握度诊断某技能的薄弱类型（真正可用的主入口）。
   * @param skillId 技能 id，必填，用于回填到分析结果
   * @param mastery 该技能的掌握度（来自 srs）
   * @returns 没有错误记录时返回 null（无需诊断）
   */
  diagnoseSkill(skillId: string, mastery: MasteryItem | undefined): ErrorAnalysis | null {
    if (!mastery || mastery.ng === 0) return null;

    const total = mastery.ok + mastery.ng;
    const errorRate = mastery.ng / Math.max(total, 1);
    const weaknessType = this.detectWeaknessType(mastery, errorRate);

    // 建议难度：基础不牢(nv<=1)且错得多 → 降难度；已熟练(lv>=3)且错得少 → 可进阶
    let suggestedDifficulty: DifficultyLevel = 2;
    if (mastery.lv <= 1 && mastery.ng >= 3) suggestedDifficulty = 1;
    else if (mastery.lv >= 3 && mastery.ng <= 2) suggestedDifficulty = 3;

    return {
      skillId,
      weaknessType,
      frequency: mastery.ng,
      lastErrorAt: mastery.last ?? 0,
      suggestedDifficulty,
      recommendedActions: RECOMMENDATIONS[weaknessType],
    };
  }

  /**
   * 向后兼容入口：保留基于「错误历史」的签名，但内部直接复用 diagnoseSkill，
   * 由 mastery 派生诊断，避免重复维护两套判定逻辑。
   */
  analyzeSkillErrors(
    skillId: string,
    mastery: MasteryItem | undefined,
    _errorHistory: Array<{ correct: boolean; timestamp: number }> = [],
  ): ErrorAnalysis | null {
    return this.diagnoseSkill(skillId, mastery);
  }

  /**
   * 薄弱类型判定（基于 mastery 的等级与错误率）：
   *   - 错误率极高(>0.6)且基础不牢(lv<=1) → 计算/基础概念型
   *   - 错误率极高(>0.6)但已有基础         → 记忆型（需复习）
   *   - 本该会(lv>=3)却还错(>0.3)         → 粗心型
   *   - 错误率中等(>0.4)                   → 应用/理解型
   *   - 其余                                → 概念型（从头讲）
   */
  private detectWeaknessType(m: MasteryItem, errorRate: number): WeaknessType {
    if (errorRate > 0.6 && m.lv <= 1) return 'calculation';
    if (errorRate > 0.6) return 'memory';
    if (m.lv >= 3 && errorRate > 0.3) return 'carelessness';
    if (errorRate > 0.4) return 'application';
    return 'conceptual';
  }

  /**
   * 由若干技能的诊断聚合出一份练习计划。
   * 注意：入参的 skillId 现已保证真实（来自 diagnoseSkill），不再为空串。
   */
  generatePracticePlan(
    errorAnalyses: ErrorAnalysis[],
    timeAvailableMinutes = 15,
  ): Array<{
    skillId: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    suggestedCount: number;
    targetMastery: number;
  }> {
    const perMin = 2; // 每项约 2 分钟
    const budget = Math.max(1, Math.floor(timeAvailableMinutes / perMin));
    return errorAnalyses
      .filter((a) => a.skillId)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, budget)
      .map((analysis, index) => ({
        skillId: analysis.skillId,
        priority: index === 0 ? 'high' : index < 3 ? 'medium' : 'low',
        reason: `薄弱：累计错 ${analysis.frequency} 次（${WEAKNESS_LABEL[analysis.weaknessType]}）`,
        suggestedCount:
          analysis.suggestedDifficulty === 1 ? 6 : analysis.suggestedDifficulty === 2 ? 4 : 3,
        targetMastery: Math.min(analysis.suggestedDifficulty + 2, 5),
      }));
  }
}

/** 自适应难度调节器（辅助）：基于最近答题结果微调难度，供 AI 叙事/建议复用。 */
export class AdaptiveDifficultyAdjuster {
  adjustDifficulty(
    current: DifficultyLevel,
    recentResults: boolean[],
    masteryLevel: number,
  ): DifficultyLevel {
    if (recentResults.length < 3) return current;
    const recent = recentResults.slice(-5);
    const acc = recent.filter(Boolean).length / recent.length;
    if (acc > 0.8 && masteryLevel >= 3 && current < 3) return (current + 1) as DifficultyLevel;
    if (acc < 0.5 && current > 1) return (current - 1) as DifficultyLevel;
    return current;
  }
}

export const errorAnalyzer = new ErrorAnalysisEngine();
export const difficultyAdjuster = new AdaptiveDifficultyAdjuster();

export default { errorAnalyzer, difficultyAdjuster };
