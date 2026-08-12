import { HANZI_DATA, type HanziEntry } from './hanzi';
import { shuffle } from '@/lib/utils';
import { recommendByPrereq } from '@/lib/hanziEtymology';

export type { HanziEntry } from './hanzi';

export interface HanziLevel {
  id: 1 | 2 | 3;
  name: string;
  emoji: string;
  tone: 'green' | 'blue' | 'purple';
  count: number;
  desc: string;
}

export const HANZI_LEVELS: HanziLevel[] = [
  { id: 1, name: '启蒙', emoji: '🌱', tone: 'green', count: 100, desc: '最常见的汉字' },
  { id: 2, name: '常用', emoji: '🌿', tone: 'blue', count: 100, desc: '生活常用字' },
  { id: 3, name: '进阶', emoji: '🌳', tone: 'purple', count: 100, desc: '古诗中的字' },
];

/** 按阶段获取汉字列表 */
export function getHanziByLevel(level: number): HanziEntry[] {
  return HANZI_DATA.filter((h) => h.level === level);
}

/** 按汉字字符查找 */
export function getHanziByChar(c: string): HanziEntry | undefined {
  return HANZI_DATA.find((h) => h.c === c);
}

/** 模糊搜索汉字（支持按汉字、拼音、组词搜索） */
export function searchHanzi(query: string): HanziEntry[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  return HANZI_DATA.filter(
    (h) =>
      h.c.includes(q) ||
      h.p.includes(q) ||
      h.pd.includes(q) ||
      h.words.some((w) => w.includes(q)) ||
      h.radical.includes(q)
  );
}

/** 获取指定阶段的前 N 个汉字（用于分页展示） */
export function getHanziByLevelPaginated(
  level: number,
  page: number,
  pageSize: number
): HanziEntry[] {
  const list = getHanziByLevel(level);
  const start = (page - 1) * pageSize;
  return list.slice(start, start + pageSize);
}

/** 获取阶段统计信息 */
export function getLevelStats(level: number): { total: number; learned: number } {
  return { total: getHanziByLevel(level).length, learned: 0 };
}

/** 按部首筛选 */
export function getHanziByRadical(radical: string): HanziEntry[] {
  return HANZI_DATA.filter((h) => h.radical === radical);
}

/** 获取所有部首列表（去重） */
export function getAllRadicals(): string[] {
  return [...new Set(HANZI_DATA.map((h) => h.radical))].sort();
}

/** 按声调筛选 */
export function getHanziByTone(tone: 1 | 2 | 3 | 4): HanziEntry[] {
  return HANZI_DATA.filter((h) => h.tone === tone);
}

/** 按笔画数范围筛选 */
export function getHanziByStrokeRange(min: number, max: number): HanziEntry[] {
  return HANZI_DATA.filter((h) => h.strokes >= min && h.strokes <= max);
}

/** 随机获取指定数量的汉字（用于练习） */
export function getRandomHanzi(level: number | null, count: number): HanziEntry[] {
  const pool = level ? getHanziByLevel(level) : HANZI_DATA;
  const shuffled = shuffle(pool);
  return shuffled.slice(0, count);
}

/**
 * 推荐下一个要学的汉字。
 *
 * 两层策略：
 *   ① 字理依赖图优先（recommendByPrereq）——在「课程前沿」的小窗口内，
 *      优先推荐部件已掌握的字（日+月→明 的拼装顿悟），并偏好枢纽字
 *      （学会 青 能带出 清/情/晴）。窗口机制保证不会跳到生僻字上。
 *   ② 回退线性遍历——HANZI_DATA 已按 level 升序、freq 降序排好，
 *      取第一个未掌握的即可（与升级前行为完全一致，保证不退化）。
 */
export function nextHanzi(mastery: Record<string, { lv: number }>): HanziEntry | null {
  const rec = recommendByPrereq(mastery);
  if (rec) {
    const hit = getHanziByChar(rec);
    if (hit) return hit;
  }
  for (const h of HANZI_DATA) {
    const m = mastery[`hanzi:${h.c}`];
    if (!m || m.lv < 1) return h;
  }
  return null;
}

/** 按声旁（拼音相同）归类获取汉字（字族学习） */
export function getHanziByPhonetic(pinyin: string): HanziEntry[] {
  return HANZI_DATA.filter((h) => h.p === pinyin);
}
