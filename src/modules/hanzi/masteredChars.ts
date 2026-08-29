/**
 * 已掌握汉字判定（儿童识字「组词/例句只用已掌握的字」专用）
 * ------------------------------------------------------------------
 * 家长反馈：帮帮识字等 App 的组词、例句里混着孩子没学过的字，孩子因为
 * 读不出整句而挫败、失去兴趣。所以组词/例句要做「已掌握字」过滤。
 *
 * 掌握度 key 的真实格式：`hanzi:<汉字>`（见 src/lib/srs.ts 的 SKILL.hanzi，
 * 以及 HanziLearn 里的 `const skill = \`hanzi:${hanzi.c}\``）。
 * 数据结构：progress.mastery: Record<string, MasteryItem>，MasteryItem.lv 为 0-5。
 *
 * 设计原则：**任何异常都只能降级，绝不能让页面空白或报错**。
 * 新用户 / 存档缺失 / 字段缺失时一律当作「已掌握」，即不过滤。
 */

/** 视为「已掌握」的等级门槛：lv 3 对应 LEVEL_TEXT 的「比较熟」 */
export const MASTERED_LV = 3;

/** mastery 的最小可用形状：只依赖 lv 字段，方便复用与单测 */
export type MasteryLike = Record<string, { lv?: number } | undefined>;

/** 汉字知识点 key（`hanzi:山`） */
export function hanziSkillKey(ch: string): string {
  return `hanzi:${ch}`;
}

/**
 * 单个汉字是否已掌握。
 *
 * 优雅降级（重要）：mastery 为空对象 / undefined / null 时返回 true，
 * 意味着「不做过滤」而不是「全部过滤掉」——宁可展示含生字的词，
 * 也不能让组词区变成空白让孩子以为内容坏了。
 */
export function isCharMastered(ch: string, mastery: MasteryLike | undefined | null): boolean {
  if (!ch) return true;
  if (!mastery) return true;
  if (Object.keys(mastery).length === 0) return true;
  const item = mastery[hanziSkillKey(ch)];
  if (!item) return false;
  return (item.lv ?? 0) >= MASTERED_LV;
}

/** 只取文本中的汉字（标点、数字、空格不参与「是否已掌握」判定） */
function hanziCharsOf(text: string): string[] {
  return Array.from(text).filter((ch) => /[一-龥]/.test(ch));
}

/**
 * 一段文本是否只由已掌握的字组成（目标字本身永远算掌握——
 * 孩子正在学的就是它，不因为它还没到 lv3 就把所有组词都过滤掉）。
 */
export function textUsesOnlyMastered(
  text: string,
  target: string,
  mastery: MasteryLike | undefined | null,
): boolean {
  return hanziCharsOf(text).every((ch) => ch === target || isCharMastered(ch, mastery));
}

/**
 * 过滤组词/例句，只保留「孩子每个字都认得」的条目。
 *
 * 过滤后为空 → **回退到原数据**（原因：识字初期几乎每个词都含生字，
 * 严格过滤会导致组词区整片空白；保留原文至少还有可点读的内容，
 * 好过让孩子面对空白区以为 App 坏了）。
 */
export function filterMasteredTexts<T extends string>(
  texts: readonly T[],
  target: string,
  mastery: MasteryLike | undefined | null,
): T[] {
  const kept = texts.filter((s) => textUsesOnlyMastered(s, target, mastery));
  return kept.length > 0 ? kept : [...texts];
}
