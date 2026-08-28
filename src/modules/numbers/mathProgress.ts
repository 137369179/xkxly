import { MAX_LEVEL } from '@/lib/srs';
import type { MasteryItem } from '@/types';

/**
 * 数字子功能 → 掌握度 skill 键映射。
 * 与 recommendNumbers 的 skill→game 映射同源；仅登记「有独立 SRS 回写键」的子功能。
 * 未列出的子功能（vertical/balance/count/challenge/speed/clock/measure）走分类聚合近似。
 *
 * 注意：部分技能按子项拆分键写入 mastery，例如
 *   - trace（数字描红）→ math:trace:0 … math:trace:9
 *   - ladder（算术梯）  → math:ladder:1 … math:ladder:8
 * 进度计算需同时匹配「精确键」与「键前缀」才能正确聚合，不能只做精确相等。
 */
export const SUB_MATH_KEY: Record<string, string> = {
  tenframe: 'math:tenframe',
  trace: 'math:trace',
  skip: 'math:skip',
  math: 'math:add',
  extra: 'math:mul',
  ladder: 'math:ladder',
  run: 'math:rabbit',
  word: 'math:word',
  shape: 'math:shape',
  tangram: 'math:tangram',
  fraction: 'math:fraction',
  money: 'math:money',
};

/** mastery 中是否存在某个匹配 key（精确 math:k 或带子项后缀 math:k:N）且 lv>=1 */
function hasTouched(mastery: Record<string, MasteryItem | undefined>, key: string): boolean {
  return Object.keys(mastery).some(
    (mk) => (mk === key || mk.startsWith(key + ':')) && (mastery[mk]?.lv ?? 0) >= 1,
  );
}

/**
 * 计算某数字子功能的掌握度进度（0-100），用于入口功能卡展示。
 *
 * 数据模型：progress.mastery 为 Record<skillId, { lv: 0..5 }>，每个 skill 一个键，
 * 部分技能按子项拆分键（见 SUB_MATH_KEY 注释）。
 *
 * - 有具体 skill 键：取所有匹配键（精确 math:<key> 或带子项后缀 math:<key>:N）的
 *   **平均掌握等级 / MAX_LEVEL**，得到 0-100 的平滑进度（lv5=已掌握=100%）。
 * - 无独立键（vertical 及未单独回写的分类）：用同分类下已回写技能的「已接触占比」近似。
 *
 * @param mastery 知识点掌握度表
 * @param subId 子功能 id（与 CATEGORIES[].subTabs[].id 对齐）
 * @param catSubIds 当前子功能所属分类的全部子功能 id（用于分类聚合回退）
 */
export function calcMathSubProgress(
  mastery: Record<string, MasteryItem | undefined>,
  subId: string,
  catSubIds: string[],
): number {
  const key = SUB_MATH_KEY[subId];
  if (key) {
    let sum = 0;
    let n = 0;
    for (const [k, m] of Object.entries(mastery)) {
      if (k === key || k.startsWith(key + ':')) {
        sum += m?.lv ?? 0;
        n += 1;
      }
    }
    if (n === 0) return 0;
    return Math.min(100, Math.round((sum / n / MAX_LEVEL) * 100));
  }

  // 分类聚合：该分类下已回写任一 math:* 的子功能占比
  const catKeys = catSubIds.map((id) => SUB_MATH_KEY[id]).filter((k): k is string => Boolean(k));
  if (catKeys.length === 0) return 0;
  const touched = catKeys.filter((k) => hasTouched(mastery, k)).length;
  return Math.min(100, Math.round((touched / catKeys.length) * 100));
}
