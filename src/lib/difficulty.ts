import type { Progress } from '@/types';
import { masteryRate, MAX_LEVEL } from '@/lib/srs';
import { recommendDifficulty } from '@/lib/adaptChain';
import { ageDifficultyBounds } from '@/store/useProfilesStore';

/**
 * 难度曲线引擎
 * ------------------------------------------------------------
 * 把「难度」从「关卡写死 1/2/3」升级为「随掌握度与表现动态爬坡」：
 *   - masteryToDifficulty：单知识点 SRS 等级 → 出题难度
 *   - rampDifficulty：某类别历史正确率 + 平均掌握等级 → 难度（既看对不对，也看熟不熟）
 *   - smartDifficulty：整体掌握率 → 全局难度（驱动每日综合挑战，整体越强越难）
 *   - calibrateDifficulty：会话内连对/连错微调，带迟滞避免抖动
 */

/** 把 SRS 掌握等级（0-5）映射成出题难度（1-3） */
export function masteryToDifficulty(lv?: number): 1 | 2 | 3 {
  if (!lv || lv <= 1) return 1;
  if (lv <= 3) return 2;
  return 3;
}

/**
 * 类别难度（统一自适应入口）：
 * 委托 adaptChain.recommendDifficulty —— 它是更丰富的 DDA 引擎，在「历史掌握度基线」
 * 之上叠加「最近窗口四维信号（心流区 / 反应时 / 提示率 / 连错）」与
 * 「streak chain 已证明档位」，比原 rampDifficulty（仅历史正确率 + 平均等级）更跟手、更防挫败。
 * 所有调用点（Today / Adventure / drill 复习）因此自动获得完整 DDA 能力，避免双套难度系统并行。
 */
export function rampDifficulty(p: Progress, category: string): 1 | 2 | 3 {
  const base = recommendDifficulty(p, category);
  // 年龄基线偏置：低龄段压低上限、高龄段抬高下限（规格六 → 难度自适应）
  const b = ageDifficultyBounds();
  return Math.max(b.min, Math.min(b.max, base)) as 1 | 2 | 3;
}

/** 全局难度曲线：随整体掌握率上升而变难（用于综合混合挑战） */
export function smartDifficulty(p: Progress): 1 | 2 | 3 {
  const r = masteryRate(p);
  // 阈值调整：给儿童更多在低难度建立信心的空间
  if (r >= 0.7) return 3;
  if (r >= 0.4) return 2;
  return 1;
}

/**
 * 会话内动态校准：根据最近连对/连错微调，带迟滞避免抖动。
 * 连续答对 5 题 → 难度 +1（提高阈值避免蒙对升档）；连续答错 2 题 → 难度 -1。
 */
export function calibrateDifficulty(
  base: 1 | 2 | 3,
  correctStreak: number,
  wrongStreak: number,
): 1 | 2 | 3 {
  if (correctStreak >= 5 && base < 3) return (base + 1) as 1 | 2 | 3;
  if (wrongStreak >= 2 && base > 1) return (base - 1) as 1 | 2 | 3;
  return base;
}

/** 等级上限常量再导出，方便调用方引用 */
export { MAX_LEVEL };
