import type { DailyPlan, LessonSection, Progress } from '@/types';
import type { Tone } from '@/lib/tones';
import { LETTERS } from '@/data/letters';
import POEMS from '@/data/poemsIndex';
import { SKILL, dueSkills, isDue, weakSkills, subjectLabel } from '@/lib/srs';
import { currentStage, type EnglishStage } from '@/lib/englishCurriculum';
import { nextHanzi } from '@/data/hanziIndex';
import { nextPinyin } from '@/data/pinyinIndex';
import { WORD_THEMES, type WordEntry } from '@/data/words';

/**
 * 每日课程包引擎
 *
 * 产品依据：洪恩识字「大地图旅程 + 每 5 字阶段检测」、帮帮识字「每日课程 + 智能复习」。
 * 儿童启蒙产品的关键不是"功能多"，而是每天打开时**确定地知道今天学什么、学多久、学完了**。
 *
 * 课程结构（约 15-20 分钟，覆盖全模块，符合 6 岁儿童专注力窗口）：
 *   1. 热身复习  —— 到期知识点回炉（艾宾浩斯）
 *   2. 新字母    —— 玩→认→练→写→说 五步闭环
 *   3. 新数字    —— 一组 5 个数，含数概念可视化与描红
 *   4. 今日新字  —— 汉字：玩→认→练→写→说（按频次推荐下一个）
 *   5. 今日拼音  —— 拼音：认→读→练→写（按教学顺序推荐）
 *   6. 新古诗    —— 听→读→填→背 四步
 *   7. 英语拓展  —— 单词认读（按主题推进）
 *   8. 综合练习  —— 自适应难度混合题
 *
 * 稳定性设计：判定"是否已学"时只看 **今天零点之前** 的记录，
 * 因此当天完成任何内容都不会导致课程包中途重排，刷新页面也能原样恢复。
 */

const MINUTE = 60;

/** 按难度预排序的古诗列表，避免每次 buildDailyPlan 重复排序 */
const POEM_INDEX_SORTED = [...POEMS].sort((a, b) => a.level - b.level);

export function dayStart(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dateKey(now = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 该知识点是否在"今天之前"就已经学过 */
function learnedBefore(p: Progress, skill: string, start: number): boolean {
  const m = p.mastery[skill];
  const last = m?.last ?? 0;
  return !!m && last > 0 && last < start;
}

/** 数字教学分组：低段逐个精学，高段整十成组 */
export const NUMBER_GROUPS: number[][] = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20],
  ...Array.from({ length: 8 }, (_, i) =>
    Array.from({ length: 10 }, (_, j) => 21 + i * 10 + j),
  ),
];

/** 自适应难度：按该类知识点的历史正确率动态调整，避免一直太难或太简单 */
export function adaptiveDifficulty(p: Progress, category: string): 1 | 2 | 3 {
  const items = Object.entries(p.mastery).filter(([k]) => k.startsWith(`${category}:`));
  const ok = items.reduce((s, [, m]) => s + m.ok, 0);
  const ng = items.reduce((s, [, m]) => s + m.ng, 0);
  const total = ok + ng;
  if (total < 6) return 1;
  const rate = ok / total;
  if (rate >= 0.85) return 3;
  if (rate >= 0.68) return 2;
  return 1;
}

/** 某知识点类别已学内容的平均掌握等级（0-5），用于关卡门控。
 *  返回值 < 2 表示"基础不牢，需要先巩固"。 */
function categoryAvgLv(p: Progress, category: string, start: number): number {
  const items = Object.entries(p.mastery)
    .filter(([k]) => k.startsWith(`${category}:`) && learnedBefore(p, k, start));
  if (!items.length) return 0;
  return items.reduce((s, [, m]) => s + m.lv, 0) / items.length;
}

/** 为某类新内容生成门控提示文本 */
function gateNote(category: string, avgLv: number): string | undefined {
  if (avgLv >= 2) return undefined;
  if (avgLv === 0) return undefined; // 还没学过就不提示
  const label = subjectLabel(category);
  return `⚠️ ${label}基础还不够牢（掌握度 ${Math.round(avgLv * 20)}%），先巩固再学新字效果更好哦～`;
}
/**
 * 按课程阶段推荐下一个新单词：
 *   Stage 1（字母启蒙）→ 不推荐单词（由 nextLetter 负责）
 *   Stage 2（自然拼读）→ 优先推荐启蒙学段（grade 1）词
 *   Stage 3（高频词）  → 优先推荐一年级/二年级（grade 2-3）词
 *   Stage 4+          → 任意未掌握词兜底
 */
export function nextWord(
  mastery: Record<string, { lv: number }>,
  stage: EnglishStage = 3,
): { word: string; zh: string; emoji: string } | null {
  if (stage === 1) return null;
  const gradeOk = (w: WordEntry): boolean => {
    const g = w.grade ?? w.level;
    if (stage === 2) return g === 1;
    if (stage === 3) return g === 2 || g === 3;
    return true;
  };
  // 先按学段过滤
  for (const theme of WORD_THEMES) {
    for (const w of theme.words) {
      if (!gradeOk(w)) continue;
      const m = mastery[`word:${w.word}`];
      if (!m || m.lv < 1) return { word: w.word, zh: w.zh, emoji: w.emoji };
    }
  }
  // 学段内学完 → 任意未掌握兜底
  for (const theme of WORD_THEMES) {
    for (const w of theme.words) {
      const m = mastery[`word:${w.word}`];
      if (!m || m.lv < 1) return { word: w.word, zh: w.zh, emoji: w.emoji };
    }
  }
  return null;
}

/** 生成今日课程包（掌握度关卡门控版）
 * 
 * 核心加强 A (M2)："先巩固再学新"。每天先检查是否有到期知识点需要复习 +
 * 薄弱点需要专练，再安排新内容。如果复习量过大（>12），优先确保弱点回炉，
 * 适度推迟新内容的引入，避免信息过载打击积极性。
 *
 * 门控逻辑：
 *   - 同类新内容的"已学知识点"平均等级 < 2 → 加一段"该类型还需练习"提示节
 *   - 不跳过已有新内容，但会在该节前插入一句温和提醒
 */
export function buildDailyPlan(p: Progress, now = Date.now()): DailyPlan {
  const start = dayStart(now);
  const sections: LessonSection[] = [];

  /** —— 1. 热身复习 —— */
  // 只复习「今天之前学过」的内容：当天刚学的不算，保证课程包当天不重排
  const reviewRefs = dueSkills(p, now)
    .filter((k) => learnedBefore(p, k, start))
    .slice(0, 8);
  if (reviewRefs.length >= 2) {
    sections.push({
      id: 'review',
      kind: 'review',
      title: '热身复习',
      sub: `${reviewRefs.length} 个学过的知识点回来啦`,
      emoji: '🔁',
      tone: 'orange',
      refs: reviewRefs,
      count: reviewRefs.length,
      minutes: Math.max(1, Math.round((reviewRefs.length * 15) / MINUTE)),
    });
  }

  /** —— 1.5 薄弱点专练（核心加强 D）——
   * 针对错误率最高的薄弱知识点强制回炉，不管是否到期：
   *   - 取 weakSkills TOP 4，剔除已在热身复习里的（避免重复练同一题）
   *   - 至少 2 个才插入，避免只有一个薄弱点时整节太短
   *   - 复用 'review' kind 渲染，但 title/sub 标明"薄弱点专练"让孩子有感知
   * 设计依据：错题本 + weakSkills 已有数据，但日常课程缺少"主动强化"环节，
   * 导致薄弱点要等到到期才复习，错过最佳纠正时机。
   */
  const weakRefs = weakSkills(p, 4)
    .map((w) => w.skill)
    .filter((s) => !reviewRefs.includes(s));
  if (weakRefs.length >= 2) {
    sections.push({
      id: 'weak',
      kind: 'review',
      title: '薄弱点专练',
      sub: `${weakRefs.length} 个常错知识点重点回炉`,
      emoji: '💪',
      tone: 'pink',
      refs: weakRefs,
      count: weakRefs.length,
      minutes: Math.max(1, Math.round((weakRefs.length * 15) / MINUTE)),
    });
  }

  /** —— 2. 新字母 —— */
  const nextLetter = LETTERS.find((l) => !learnedBefore(p, SKILL.letter(l.upper), start));
  if (nextLetter) {
    const letterAvg = categoryAvgLv(p, 'letter', start);
    const gateSub = gateNote('letter', letterAvg);
    sections.push({
      id: `letter-${nextLetter.upper}`,
      kind: 'letter',
      title: `学字母 ${nextLetter.upper}${nextLetter.lower}`,
      sub: gateSub || '玩 · 认 · 练 · 写 · 说',
      emoji: nextLetter.emoji,
      tone: 'blue',
      refs: [nextLetter.upper],
      count: 5,
      minutes: 3,
    });
  }

  /** —— 3. 新数字 —— */
  const nextGroup = NUMBER_GROUPS.find((g) =>
    g.some((n) => !learnedBefore(p, SKILL.number(n), start)),
  );
  if (nextGroup) {
    const numAvg = categoryAvgLv(p, 'number', start);
    const gateSub = gateNote('number', numAvg);
    sections.push({
      id: `number-${nextGroup[0]}`,
      kind: 'number',
      title: `认数字 ${nextGroup[0]}~${nextGroup[nextGroup.length - 1]}`,
      sub: gateSub || '看得见的数量 · 描红书写',
      emoji: '🔢',
      tone: 'yellow',
      refs: nextGroup.map(String),
      count: nextGroup.length,
      minutes: 3,
    });
  }

  /** —— 4. 今日新字（汉字：按频次推荐下一个未学字） —— */
  const recHanzi = nextHanzi(p.mastery);
  if (recHanzi && !learnedBefore(p, SKILL.hanzi(recHanzi.c), start)) {
    const hzAvg = categoryAvgLv(p, 'hanzi', start);
    const gateSub = gateNote('hanzi', hzAvg);
    sections.push({
      id: `hanzi-${recHanzi.c}`,
      kind: 'hanzi',
      title: `学汉字「${recHanzi.c}」`,
      sub: gateSub || `${recHanzi.pd} · ${recHanzi.radical}部 · 玩认练写说`,
      emoji: '🀄',
      tone: 'green',
      refs: [recHanzi.c],
      count: 5,
      minutes: 3,
    });
  }

  /** —— 5. 今日拼音（按教学顺序推荐下一个） —— */
  const recPinyin = nextPinyin(p.mastery);
  if (recPinyin && !learnedBefore(p, SKILL.pinyin(recPinyin.p), start)) {
    const pyAvg = categoryAvgLv(p, 'pinyin', start);
    const gateSub = gateNote('pinyin', pyAvg);
    sections.push({
      id: `pinyin-${recPinyin.p}`,
      kind: 'pinyin',
      title: `学拼音「${recPinyin.p}」`,
      sub: gateSub || `${recPinyin.sound} · 认读练写`,
      emoji: '📋',
      tone: 'blue',
      refs: [recPinyin.p],
      count: 4,
      minutes: 2,
    });
  }

  /** —— 6. 新古诗（按难度分级推进） —— */
  const readSet = new Set(p.poemsRead);
  const nextPoem =
    POEM_INDEX_SORTED.find((x) => !readSet.has(x.id) && !learnedBefore(p, SKILL.poem(x.id), start)) ??
    POEM_INDEX_SORTED.find((x) => !learnedBefore(p, SKILL.poem(x.id), start));
  if (nextPoem) {
    const poemAvg = categoryAvgLv(p, 'poem', start);
    const gateSub = gateNote('poem', poemAvg);
    sections.push({
      id: `poem-${nextPoem.id}`,
      kind: 'poem',
      title: `读古诗《${nextPoem.title}》`,
      sub: gateSub || `${nextPoem.dynasty} · ${nextPoem.author} · 听读填背`,
      emoji: '🌸',
      tone: 'pink',
      refs: [nextPoem.id],
      count: 4,
      minutes: 3,
    });
  }

  /** —— 7. 英语拓展（按主题推进） —— */
  const recWord = nextWord(p.mastery, currentStage(p));
  if (recWord && !learnedBefore(p, `word:${recWord.word}`, start)) {
    const wordAvg = categoryAvgLv(p, 'word', start);
    const gateSub = gateNote('word', wordAvg);
    sections.push({
      id: `word-${recWord.word}`,
      kind: 'word',
      title: `学单词「${recWord.word}」`,
      sub: gateSub || `${recWord.zh} · ${recWord.emoji}`,
      emoji: recWord.emoji,
      tone: 'pink',
      refs: [recWord.word],
      count: 3,
      minutes: 2,
    });
  }

  /** —— 8. 综合练习 —— */
  sections.push({
    id: 'quiz',
    kind: 'quiz',
    title: '综合小挑战',
    sub: '算一算 · 数一数 · 找规律',
    emoji: '🎯',
    tone: 'green',
    refs: [],
    count: 6,
    minutes: 3,
  });

  return {
    date: dateKey(now),
    sections,
    minutes: sections.reduce((s, x) => s + (x.minutes ?? 0), 0),
    dueCount: Object.entries(p.mastery).filter(([, m]) => isDue(m, now)).length,
  };
}

/** 课程包完成度 0-1 */
export function planProgress(plan: DailyPlan, step: number): number {
  if (!plan.sections.length) return 1;
  return Math.min(1, step / plan.sections.length);
}

export const SECTION_TONE: Record<string, Tone> = {
  review: 'orange',
  letter: 'blue',
  number: 'yellow',
  hanzi: 'green',
  pinyin: 'blue',
  poem: 'pink',
  word: 'pink',
  quiz: 'green',
};

/* ============================================================
   P1-7: 多时段排课
   ============================================================ */
export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export const SLOT_INFO: { id: TimeSlot; label: string; emoji: string; tone: Tone }[] = [
  { id: 'morning', label: '上午', emoji: '🌅', tone: 'orange' },
  { id: 'afternoon', label: '下午', emoji: '☀️', tone: 'yellow' },
  { id: 'evening', label: '晚上', emoji: '🌙', tone: 'blue' },
];

/** 根据当前小时返回时段 */
export function currentSlot(now = Date.now()): TimeSlot {
  const h = new Date(now).getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

/** 将课程包按时段拆分：上午 2 节 / 下午 2 节 / 晚上最多 2 节（临近睡眠不宜过多） */
export function splitBySlot(plan: DailyPlan): Record<TimeSlot, LessonSection[]> {
  const slots: Record<TimeSlot, LessonSection[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };
  const total = plan.sections.length;
  if (total <= 2) {
    slots.morning = [...plan.sections];
  } else if (total <= 4) {
    slots.morning = plan.sections.slice(0, 2);
    slots.afternoon = plan.sections.slice(2);
  } else if (total <= 6) {
    // 5-6 节：上午 2 / 下午 2 / 晚上 1-2
    slots.morning = plan.sections.slice(0, 2);
    slots.afternoon = plan.sections.slice(2, 4);
    slots.evening = plan.sections.slice(4, 6);
  } else {
    // 7+ 节：均衡分配，晚间最多 2 节（保护儿童睡眠）
    const eveningCount = Math.min(2, Math.ceil((total - 4) / 2));
    const afternoonCount = total - 2 - eveningCount;
    slots.morning = plan.sections.slice(0, 2);
    slots.afternoon = plan.sections.slice(2, 2 + afternoonCount);
    slots.evening = plan.sections.slice(2 + afternoonCount, 2 + afternoonCount + eveningCount);
  }
  return slots;
}

/** 某时段是否已完成（所有节都 done） */
export function slotDone(
  plan: DailyPlan,
  slot: TimeSlot,
  step: number,
): boolean {
  const slots = splitBySlot(plan);
  const sections = slots[slot];
  if (sections.length === 0) return true;
  // step 是全局步骤索引，计算该时段最后一段是否已 done
  const last = sections[sections.length - 1];
  const lastIdx = last === undefined ? -1 : plan.sections.indexOf(last);
  return step > lastIdx;
}

/** 某时段的起始步骤索引 */
export function slotStartStep(
  plan: DailyPlan,
  slot: TimeSlot,
): number {
  const slots = splitBySlot(plan);
  const sections = slots[slot];
  if (sections.length === 0) return 0;
  const first = sections[0];
  return first === undefined ? 0 : plan.sections.indexOf(first);
}
