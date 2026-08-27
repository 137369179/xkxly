/**
 * 游戏化统一入口（Facade）
 * ------------------------------------------------------------
 * 三核心 / 新模块「一行 import」即可拿到全部已验证的游戏化能力：
 *   - 核心闭环：applyAnswer（engine）
 *   - 呈现编排：useGamification / useReducedMotion / GameErrorBoundary
 *   - 复用既有已测库（单一真相源，杜绝第二份实现漂移）：
 *     srs（间隔重复）/ milestone（成就）/ feedback（即时反馈）/
 *     difficulty（渐进难度）/ struggle（温和引导）/ combo（连击）/
 *     stars（星级）/ wrongCluster（错题因果聚类）/ celebrate（庆祝）/ safeStorage（安全存储）
 *
 * 这是 R1–R143 跨轮研究收敛出的「十维商用上线矩阵」的工程收口：
 * 三大核心模块只需改用本入口，即可统一接入计分 / 闯关 / 奖励解锁 /
 * 渐进难度 / 即时反馈 / 进度成就 与 无障碍 / 错误兜底。
 */
export { applyAnswer } from './engine';
export type { AnswerParams, GameOutcome } from './engine';
export { useGamification } from './useGamification';
export type { UseGamificationOptions, AnswerHandleResult, GamificationApi } from './useGamification';
export { useReducedMotion } from './useReducedMotion';
export { GameErrorBoundary } from './GameErrorBoundary';

export * from '@/lib/srs';
export * from '@/lib/milestone';
export * from '@/lib/feedback';
export * from '@/lib/difficulty';
export * from '@/lib/struggle';
export * from '@/lib/combo';
export * from '@/lib/stars';
export * from '@/lib/wrongCluster';
export {
  celebrateSmall,
  celebrateBig,
  celebrateStars,
  celebrateLarge,
} from '@/lib/celebrate';
export {
  safeGetJSON,
  safeSetJSON,
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  safeParseJSON,
} from '@/lib/safeStorage';
