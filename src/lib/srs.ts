import type { MasteryItem, Progress } from '@/types';
import type { Tone } from '@/lib/tones';

/**
 * 间隔重复引擎（Spaced Repetition）
 *
 * 设计依据：艾宾浩斯遗忘曲线 + 洪恩/帮帮识字「学一点，回头看一点」的穿插复习节奏。
 * 与成人版 SM-2 不同，儿童版做了三点简化，避免复习量爆炸打击积极性：
 *   1. 等级只有 0-5 六档，间隔固定，不做个体化难度因子
 *   2. 答错只降 1 级（不清零），保护挫败感
 *   3. 每日复习量有上限，超出部分自然顺延
 */

/** 知识点 id 前缀 */
export const SKILL = {
  letter: (l: string) => `letter:${l.toUpperCase()}`,
  number: (n: number) => `number:${n}`,
  poem: (id: string) => `poem:${id}`,
  math: (op: 'add' | 'sub') => `math:${op}`,
  count: () => 'number:count',
  logic: (kind: 'pattern' | 'match' | 'order') => `logic:${kind}`,
  hanzi: (c: string) => `hanzi:${c}`,
  pinyin: (p: string) => `pinyin:${p}`,
  word: (w: string) => `word:${w}`,
} as const;

/** 掌握度等级 -> 下次复习间隔（天）。lv0 当天再练，lv5 视为长期记忆 */
export const INTERVALS = [0, 1, 2, 4, 7, 15] as const;

export const MAX_LEVEL = 5;

const DAY = 86400000;

export function emptyMastery(now = Date.now()): MasteryItem {
  return { lv: 0, due: now, ok: 0, ng: 0, last: 0 };
}

/**
 * 记录一次练习结果，返回更新后的掌握度。
 *
 * 难度感知升降级（核心加强 C）：
 *   - 高难度(3)答对 → 升 2 级：真正掌握难题代表扎实，加速进入长期记忆
 *   - 低难度(1)答错 → 降 2 级：基础题都错说明没掌握，重点回退重练
 *   - 其余情况 → 升 1 级 / 降 1 级（原逻辑）
 *   - 不传 difficulty → 完全原逻辑，向后兼容
 *
 * 答对：升 N 级并按新等级排下次复习；
 * 答错：降 N 级，按降级后等级的一半间隔排复习（温和回退，避免断崖式骤降）
 *
 * @param difficulty 可选，题目难度 1/2/3。传入后启用难度感知升降级。
 */
export function review(
  prev: MasteryItem | undefined,
  correct: boolean,
  now = Date.now(),
  difficulty?: 1 | 2 | 3,
): MasteryItem {
  const cur = prev ?? emptyMastery(now);
  if (correct) {
    // 难度感知：高难度答对升 2 级，其余升 1 级
    const step = difficulty === 3 ? 2 : 1;
    const lv = Math.min(MAX_LEVEL, cur.lv + step);
    return { lv, due: now + INTERVALS[lv]! * DAY, ok: cur.ok + 1, ng: cur.ng, last: now };
  }
  // 难度感知：低难度答错降 2 级，其余降 1 级
  const step = difficulty === 1 ? 2 : 1;
  const lv = Math.max(0, cur.lv - step);
  // 答错间隔温和化：降级后等级对应间隔的一半，最低 10 分钟
  const intervalMs = Math.max(10 * 60000, Math.ceil((INTERVALS[lv]! * DAY) / 2));
  return { lv, due: now + intervalMs, ok: cur.ok, ng: cur.ng + 1, last: now };
}

/** 某知识点是否到期待复习（lv5 也有保温复习，间隔为 30 天） */
export function isDue(m: MasteryItem | undefined, now = Date.now()): boolean {
  if (!m) return false;
  if (m.lv >= MAX_LEVEL) {
    // 已掌握的知识点每 30 天保温复习一次，防止长期遗忘
    return (m.due ?? 0) + 30 * DAY <= now;
  }
  return (m.due ?? Infinity) <= now;
}

/**
 * 取出所有到期知识点，按优先级排序：
 *   1. 等级低（lv 越小越不熟，先复习）
 *   2. 错误率高（ng/(ok+ng) 越大说明常错，重点回炉）
 *   3. 逾期久（due 越小越早到期，先拣起来）
 *
 * 加入错误率维度后，与 weakSkills 形成呼应：
 * 同样是低等级，错得多的会排到前面，避免「等级低但全对」的知识点挤掉真正需要回炉的薄弱点。
 */
export function dueSkills(p: Progress, now = Date.now(), limit = 999): string[] {
  const items: Array<[string, MasteryItem]> = Object.entries(p.mastery)
    .filter((e): e is [string, MasteryItem] => !!e[1] && isDue(e[1], now));
  return items
    .sort((a, b) => {
      const lvDiff = (a[1]!.lv ?? 0) - (b[1]!.lv ?? 0);
      if (lvDiff !== 0) return lvDiff;
      // 错误率：ng / (ok+ng)，越大越优先复习
      const ra = a[1]!!.ng / Math.max(1, a[1]!.ok + a[1]!.ng);
      const rb = b[1]!!.ng / Math.max(1, b[1]!.ok + b[1]!.ng);
      if (ra !== rb) return rb - ra;
      return (a[1]!.due ?? 0) - (b[1]!.due ?? 0);
    })
    .slice(0, limit)
    .map(([k]) => k);
}

/** 已接触过的知识点总数 */
export function touchedCount(p: Progress): number {
  return Object.keys(p.mastery).length;
}

/** 已熟练（lv>=4）的知识点数 */
export function masteredCount(p: Progress): number {
  return Object.values(p.mastery).filter((m) => m.lv >= 4).length;
}

/** 整体掌握率 0-1：以平均等级 / 5 计 */
export function masteryRate(p: Progress): number {
  const vals = Object.values(p.mastery);
  if (!vals.length) return 0;
  return vals.reduce((s, m) => s + m.lv, 0) / (vals.length * MAX_LEVEL);
}

/** 薄弱知识点 TOP N：错得多、等级低的排前面 */
export function weakSkills(p: Progress, n = 6): { skill: string; m: MasteryItem }[] {
  return Object.entries(p.mastery)
    .filter(([, m]) => m.ng > 0)
    .map(([skill, m]) => ({ skill, m }))
    .sort((a, b) => {
      const ra = a.m.ng / Math.max(1, a.m.ok + a.m.ng);
      const rb = b.m.ng / Math.max(1, b.m.ok + b.m.ng);
      return rb - ra || b.m.ng - a.m.ng;
    })
    .slice(0, n);
}

/** ---------------- 展示层：知识点 id -> 人类可读 ---------------- */
const CATEGORY: Record<string, { label: string; tone: Tone; emoji: string }> = {
  letter: { label: '字母', tone: 'blue', emoji: '🔤' },
  number: { label: '数字', tone: 'yellow', emoji: '🔢' },
  hanzi: { label: '汉字', tone: 'green', emoji: '🀄' },
  pinyin: { label: '拼音', tone: 'blue', emoji: '📋' },
  poem: { label: '古诗', tone: 'pink', emoji: '🌸' },
  word: { label: '英语', tone: 'pink', emoji: '💬' },
  math: { label: '数学', tone: 'green', emoji: '➕' },
  logic: { label: '逻辑', tone: 'purple', emoji: '🧩' },
  idiom: { label: '成语', tone: 'orange', emoji: '📜' },
  sentence: { label: '造句', tone: 'blue', emoji: '✍️' },
};

/**
 * 学科（顶层模块）单一真相源，供 UI 列表 / 图表复用。
 * 覆盖全部学科：letter/number/math/poem/hanzi/pinyin/word/logic/idiom/sentence。
 * 字段：key 学科标识、label 统一中文名、emoji/tone 展示风格、color 图表配色。
 * 注意：`math` 统一中文名为「数学」（原 CATEGORY 曾用「算术」，此处收敛为单一值）。
 */
export const SUBJECTS: {
  key: string;
  label: string;
  emoji: string;
  tone: Tone;
  color: string;
}[] = [
  { key: 'letter', label: '字母', emoji: '🔤', tone: 'blue', color: '#3b82f6' },
  { key: 'number', label: '数字', emoji: '🔢', tone: 'yellow', color: '#eab308' },
  { key: 'math', label: '数学', emoji: '➕', tone: 'green', color: '#22c55e' },
  { key: 'poem', label: '古诗', emoji: '🌸', tone: 'pink', color: '#ec4899' },
  { key: 'hanzi', label: '汉字', emoji: '🀄', tone: 'green', color: '#10b981' },
  { key: 'pinyin', label: '拼音', emoji: '📋', tone: 'blue', color: '#6366f1' },
  { key: 'word', label: '英语', emoji: '💬', tone: 'pink', color: '#f97316' },
  { key: 'logic', label: '逻辑', emoji: '🧩', tone: 'purple', color: '#a855f7' },
  { key: 'idiom', label: '成语', emoji: '📜', tone: 'orange', color: '#ef4444' },
  { key: 'sentence', label: '造句', emoji: '✍️', tone: 'blue', color: '#14b8a6' },
];

/**
 * 学科统一中文名（单一真相源）。
 * 入参可为 skill 字符串（如 `math:add`，自动取前缀 `math`）或直连 key；
 * 优先查 SUBJECTS，其次回退到 CATEGORY（覆盖 count/compare 等子类别），未知返回「其他」。
 */
export function subjectLabel(skillOrKey: string): string {
  const key = skillOrKey.includes(':') ? skillOrKey.split(':')[0] : skillOrKey;
  return SUBJECTS.find((s) => s.key === key)?.label ?? CATEGORY[key!]?.label ?? '其他';
}

/** 学科 emoji（单一真相源），未知返回默认书本 emoji。 */
export function subjectEmoji(skillOrKey: string): string {
  const key = skillOrKey.includes(':') ? skillOrKey.split(':')[0] : skillOrKey;
  return SUBJECTS.find((s) => s.key === key)?.emoji ?? CATEGORY[key!]?.emoji ?? '📘';
}

/** 学科 tone（单一真相源），未知返回 blue。 */
export function subjectTone(skillOrKey: string): Tone {
  const key = skillOrKey.includes(':') ? skillOrKey.split(':')[0] : skillOrKey;
  return SUBJECTS.find((s) => s.key === key)?.tone ?? CATEGORY[key!]?.tone ?? ('blue' as Tone);
}

/** 学科图表配色（单一真相源），未知返回灰色。 */
export function subjectColor(skillOrKey: string): string {
  const key = skillOrKey.includes(':') ? skillOrKey.split(':')[0] : skillOrKey;
  return SUBJECTS.find((s) => s.key === key)?.color ?? '#94a3b8';
}

const LOGIC_NAME: Record<string, string> = {
  pattern: '找规律',
  match: '图形配对',
  order: '排排序',
};

export function skillCategory(skill: string): { key: string; label: string; tone: Tone; emoji: string } {
  const key = skill.split(':')[0]!;
  const c = CATEGORY[key]! ?? { label: '其他', tone: 'blue' as Tone, emoji: '📘' };
  return { key, ...c };
}

/** 知识点显示名，例如 letter:A -> 字母 A；logic:pattern -> 找规律 */
export function skillLabel(skill: string, poemTitle?: (id: string) => string | undefined): string {
  const [key, val = ''] = skill.split(':');
  switch (key) {
    case 'letter':
      return `字母 ${val}`;
    case 'number':
      return `数字 ${val}`;
    case 'math':
      return val === 'add' ? '加法' : '减法';
    case 'count':
      return '数物对应';
    case 'logic':
      return LOGIC_NAME[val] ?? '逻辑题';
    case 'poem':
      return poemTitle?.(val) ?? '古诗';
    case 'compare':
      return '比大小';
    case 'sort':
      return '归类';
    case 'pair':
      return '反义词配对';
    case 'similar':
      return `形近字 ${val}`;
    case 'idiom':
      return val ? `成语 ${val}` : '成语';
    case 'sentence':
      return val ? `造句 ${val}` : '造句';
    default:
      return skill;
  }
}

/** 掌握等级 -> 文案与颜色（家长报告用） */
export const LEVEL_TEXT = ['刚接触', '有印象', '认得出', '比较熟', '很熟练', '已掌握'] as const;

export function levelColor(lv: number): string {
  return ['#e8e3ef', '#ffd4e0', '#ffe6a8', '#c9e8ff', '#bdf0cf', '#8fe3ae'][Math.min(5, Math.max(0, lv))]!;
}

/** 距离下次复习的人类可读文案 */
export function dueText(m: MasteryItem, now = Date.now()): string {
  if (m.lv >= MAX_LEVEL) return '已掌握';
  const diff = (m.due ?? Infinity) - now;
  if (diff <= 0) return '该复习啦';
  const d = Math.round(diff / DAY);
  if (d >= 1) return `${d} 天后复习`;
  const h = Math.round(diff / 3600000);
  return h >= 1 ? `${h} 小时后复习` : '稍后复习';
}
