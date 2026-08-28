/**
 * 🌲 跨学科知识盲点前置依赖树 (Knowledge Prerequisite Tree)
 * ------------------------------------------------------------------
 * 针对 3-8 岁幼小衔接与学科认知规律构建前置依赖图谱。
 * 当孩子在某个高阶知识点（如进位加减法、复韵母拼读、CVC三拼）受挫或频繁出错时，
 * 能够迅速追溯其根源性前置薄弱点并提供针对性降级补强。
 */

export interface PrerequisiteNode {
  id: string;
  label: string;
  subject: 'math' | 'pinyin' | 'letters' | 'hanzi' | 'science';
  prerequisites: string[];
}

/** 跨学科前置知识依赖图谱 */
export const PREREQUISITE_GRAPH: Record<string, string[]> = {
  // 数学领域
  'math:sub_20': ['math:add_10', 'math:sub_10', 'math:count'],
  'math:add_20': ['math:add_10', 'math:count'],
  'math:sub_10': ['math:add_10', 'math:count'],
  'math:add_10': ['math:count'],
  'math:compare': ['math:count'],
  'math:shapes_3d': ['math:shapes_2d'],

  // 拼音领域
  'pinyin:overall': ['pinyin:initials', 'pinyin:finals'],
  'pinyin:compound': ['pinyin:finals', 'pinyin:initials'],
  'pinyin:nasal': ['pinyin:finals'],
  'pinyin:tones': ['pinyin:finals'],

  // 英语字母与自然拼读
  'words:cvc': ['letters:vowels', 'letters:phonics', 'letters:names'],
  'letters:phonics': ['letters:names'],
  'letters:case': ['letters:names'],

  // 汉字与国学
  'hanzi:compound': ['hanzi:basic', 'hanzi:radicals'],
  'hanzi:stroke': ['hanzi:basic'],
  'idioms:stories': ['hanzi:basic'],
};

/**
 * 获取某个知识点的直接前置依赖
 */
export function getPrerequisites(skillId: string): string[] {
  // 精确匹配
  if (PREREQUISITE_GRAPH[skillId]) {
    return PREREQUISITE_GRAPH[skillId];
  }

  // 模糊前缀匹配 (例如 math:sub:carry -> 匹配 math:sub_20)
  for (const [key, deps] of Object.entries(PREREQUISITE_GRAPH)) {
    if (skillId.startsWith(key) || key.startsWith(skillId)) {
      return deps;
    }
  }

  return [];
}

/**
 * 根因薄弱点诊断算法：
 * 遍历当前出错知识点的前置依赖，若发现前置基础知识点掌握度低 (lv < 2)，
 * 优先返回该前置知识点作为根因推荐。
 */
export function findRootCauseSkill(
  failedSkillId: string,
  mastery: Record<string, { lv?: number } | undefined>,
): string | null {
  const deps = getPrerequisites(failedSkillId);
  if (!deps || deps.length === 0) return null;

  for (const dep of deps) {
    const item = mastery[dep];
    const lv = item?.lv ?? 0;
    // 若前置基础尚未达到稳定掌握（等级 < 2），则判定该基础点为根因
    if (lv < 2) {
      return dep;
    }
  }

  return null;
}
