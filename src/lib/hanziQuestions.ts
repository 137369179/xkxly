/**
 * 汉字出题函数（专业版）
 * ------------------------------------------------------------
 * 题型矩阵：
 *   1. 看字选拼音（认读）
 *   2. 看拼音选字（拼读）
 *   3. 看字选组词（运用）
 *   4. 听音选字（听力辨字，TTS 发音）
 *   5. 部首辨认（字形结构）
 *   6. 笔画数（书写基础）
 *   7. 形近字辨析（精细视觉辨别，错因含形近点提示）
 *   8. 六书识别（字理：选出这个字的造字法）
 *   9. 部件识别（字理：形旁 / 声旁 / 含部件）
 *
 * 8/9 两类「字理测评」复用 @/lib/hanziEtymology 查询层，与 P2 字理可视化
 * （六书徽章 / 部件拆解 / 字族树）同源，做到「看了就考、考了再巩固」。
 * 教学正确性护栏：声旁仅在 soundRel 成立时出题；独体/会意/象形字自动回退六书题。
 *
 * 依赖仅 @/types（Question）、@/data/hanziIndex 与 @/lib/hanziEtymology，符合 lib 层定位。
 */
import type { Question } from '@/types';
import { getHanziByLevel, getHanziByChar, type HanziEntry } from '@/data/hanziIndex';
import {
  liushuOf,
  getEtymology,
  getComponents,
  componentUsers,
  componentDistractors,
  LIUSHU_META,
  LIUSHU_ORDER,
  semanticHint,
  explainFormation,
} from '@/lib/hanziEtymology';

/** i18n 翻译函数（可选）：传入则题干用双语 key，不传则回退中文，保证既有调用方不受影响 */
type TFunc = (key: string, params?: Record<string, string | number>) => string;

function genId() {
  return `hanzi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const v = copy.splice(Math.floor(Math.random() * copy.length), 1)[0];
    if (v !== undefined) out.push(v);
  }
  return out;
}

/** 看字选拼音 */
export function makeHanziPinyinQuestion(target: HanziEntry, pool: HanziEntry[]): Question {
  const distractors = pick(pool.filter(h => h.c !== target.c), 3);
  const opts = pick([target, ...distractors], 4);
  return {
    id: genId(),
    kind: 'hanzi-pinyin',
    skill: `hanzi:${target.c}`,
    prompt: `"${target.c}" 的拼音是？`,
    display: target.c,
    speak: target.c,
    options: opts.map(h => ({ id: h.c, label: h.pd, emoji: '' })),
    answerId: target.c,
    hint: `声调是第${target.tone}声`,
    why: `${target.c} 读 "${target.pd}"，${target.origin}`,
  };
}

/** 看拼音选字 */
export function makeHanziCharQuestion(target: HanziEntry, pool: HanziEntry[]): Question {
  const distractors = pick(pool.filter(h => h.c !== target.c), 3);
  const opts = pick([target, ...distractors], 4);
  return {
    id: genId(),
    kind: 'hanzi-char',
    skill: `hanzi:${target.c}`,
    prompt: `哪个字的拼音是 "${target.pd}"？`,
    display: target.pd,
    speak: target.pd,
    options: opts.map(h => ({ id: h.c, label: h.c, emoji: '' })),
    answerId: target.c,
    hint: `部首是"${target.radical}"`,
    why: `${target.c}（${target.pd}），${target.origin}`,
  };
}

/** 看字选组词 */
export function makeHanziWordQuestion(target: HanziEntry, pool: HanziEntry[]): Question {
  const correctWord = target.words[0] ?? target.c;
  const others = pool.filter(h => h.c !== target.c).flatMap(h => h.words).filter(w => w !== correctWord);
  const distractors = pick(others, 3);
  const opts = pick([correctWord, ...distractors], 4);
  return {
    id: genId(),
    kind: 'hanzi-word',
    skill: `hanzi:${target.c}`,
    prompt: `"${target.c}" 可以组哪个词？`,
    display: target.c,
    speak: target.c,
    options: opts.map((w, i) => ({ id: `w${i}`, label: w, emoji: '' })),
    // pick() 会打乱顺序，正确项位置必须按值查找（原硬编码 'w0' 是 bug）
    answerId: `w${opts.findIndex(w => w === correctWord)}`,
    hint: `想想"${target.sentence}"`,
    why: `${target.c} 可以组成 "${correctWord}"`,
  };
}

/** 听音选字（TTS 朗读，不显示目标字形，训练听力辨字） */
export function makeHanziListenQuestion(target: HanziEntry, pool: HanziEntry[]): Question {
  const distractors = pick(pool.filter(h => h.c !== target.c && h.p !== target.p), 3);
  const opts = pick([target, ...distractors], 4);
  return {
    id: genId(),
    kind: 'hanzi-listen',
    skill: `hanzi:${target.c}`,
    prompt: '仔细听，选出你听到的字',
    display: '🔊',
    speak: `${target.c}，${target.words[0] ?? target.c}的${target.c}`,
    speakLang: 'zh-CN',
    options: opts.map(h => ({ id: h.c, label: h.c, emoji: '' })),
    answerId: target.c,
    hint: `再听一遍：${target.words.join('、')}`,
    why: `听到的是「${target.c}」（${target.pd}），${target.origin}`,
  };
}

/** 部首辨认（汉字结构基础：先认部首再记字形） */
export function makeHanziRadicalQuestion(target: HanziEntry, pool: HanziEntry[]): Question {
  const radicals = [...new Set(pool.map(h => h.radical))].filter(r => r !== target.radical);
  const distractors = pick(radicals, 3);
  const opts = pick([target.radical, ...distractors], 4);
  return {
    id: genId(),
    kind: 'hanzi-radical',
    skill: `hanzi:${target.c}`,
    prompt: `「${target.c}」的部首是哪个？`,
    display: target.c,
    speak: `${target.c}的部首是哪个？`,
    options: opts.map((r, i) => ({ id: `r${i}`, label: r, emoji: '' })),
    answerId: `r${opts.findIndex(r => r === target.radical)}`,
    hint: `部首大多表示字的意思类别`,
    why: `「${target.c}」是「${target.radical}」部，${target.origin}`,
  };
}

/** 笔画数（书写基本功：数笔画是查字典和写字的基础） */
export function makeHanziStrokeCountQuestion(target: HanziEntry): Question {
  const correct = target.strokes;
  const candidates = [correct - 2, correct - 1, correct + 1, correct + 2].filter(n => n > 0 && n !== correct);
  const distractors = pick(candidates, 3);
  const opts = pick([correct, ...distractors], 4).sort((a, b) => a - b);
  return {
    id: genId(),
    kind: 'hanzi-strokes',
    skill: `hanzi:${target.c}`,
    prompt: `「${target.c}」一共有几画？`,
    display: target.c,
    speak: `${target.c}一共有几画？数一数吧`,
    options: opts.map((n, i) => ({ id: `s${i}`, label: `${n} 画`, emoji: '' })),
    answerId: `s${opts.findIndex(n => n === correct)}`,
    hint: `先看笔顺动画，跟着数一数`,
    why: `「${target.c}」一共 ${correct} 画，部首是「${target.radical}」`,
  };
}

/**
 * 形近字辨析（视觉辨别力）
 * 优先从同阶段的同音/近形字里挑干扰；若没有则用同阶段随机字。
 */
export function makeHanziSimilarQuestion(target: HanziEntry, pool: HanziEntry[]): Question {
  // 同音不同字是最常见的混淆点
  const samePinyin = pool.filter(h => h.c !== target.c && h.p === target.p);
  const sameRadical = pool.filter(h => h.c !== target.c && h.radical === target.radical && h.p !== target.p);
  const distractors = pick([...samePinyin, ...sameRadical], 3);
  while (distractors.length < 3) {
    const cand = pick(pool.filter(h => h.c !== target.c && !distractors.includes(h)), 1);
    if (!cand.length) break;
    distractors.push(cand[0]!);
  }
  const opts = pick([target, ...distractors], 4);
  return {
    id: genId(),
    kind: 'hanzi-similar',
    skill: `hanzi:${target.c}`,
    prompt: `听一听，哪个字是「${target.words[0] ?? target.c}」的「${target.c}」？`,
    display: '🔊',
    speak: `${target.c}，${target.words[0] ?? target.c}的${target.c}`,
    speakLang: 'zh-CN',
    options: opts.map(h => ({ id: h.c, label: h.c, emoji: '' })),
    answerId: target.c,
    hint: `注意看每个字的偏旁不一样哦`,
    why: `「${target.c}」是「${target.radical}」部，${target.origin}。形近字要看清偏旁！`,
  };
}

/**
 * 六书识别（字理测评）：给出字，选出它的造字法。
 * 所有 300 字都有 liushu，因此本题永远可出；选项为四书打乱。
 */
export function makeHanziFormationQuestion(target: HanziEntry, t?: TFunc): Question {
  const liushu = liushuOf(target.c);
  if (!liushu) return makeHanziPinyinQuestion(target, getHanziByLevel(target.level));
  const tr = (key: string, fallback: string, params?: Record<string, string | number>) =>
    t ? t(key, params) : fallback;
  const opts = pick([...LIUSHU_ORDER], 4).map((l) => ({
    id: l,
    label: `${LIUSHU_META[l].emoji} ${LIUSHU_META[l].label}`,
  }));
  return {
    id: genId(),
    kind: 'hanzi-formation',
    skill: `hanzi:${target.c}`,
    prompt: tr('hanzi.qFormation', `「${target.c}」是用什么办法造出来的字？`, { c: target.c }),
    display: target.c,
    speak: `${target.c}，${LIUSHU_META[liushu].label}`,
    options: opts,
    answerId: liushu,
    hint: LIUSHU_META[liushu].kidHint,
    why: explainFormation(target.c),
  };
}

/** 部件识别题的兜底干扰部件（当高频池不足时补充，避免选项少于 4） */
const COMPONENT_FALLBACK = ['木', '水', '火', '人', '口', '日', '月', '心', '手', '女', '田', '目'];

/** 把「答案部件 + 干扰部件」拼成 4 选项的部件识别题 */
function componentOptions(answerGlyph: string, targetChar: string): { id: string; label: string }[] {
  const distractors = componentDistractors(targetChar, 3);
  const pool = [...distractors];
  // 不足 3 个时从兜底池补（排除答案本身、已选干扰）
  for (const g of COMPONENT_FALLBACK) {
    if (pool.length >= 3) break;
    if (g !== answerGlyph && !pool.includes(g)) pool.push(g);
  }
  return pick([answerGlyph, ...pool], 4).map((g) => ({ id: g, label: g }));
}

/**
 * 部件识别（字理测评）：根据数据可用性抽一种子题型——
 *   - semantic：问形旁（部首），仅当该字有语义部件且为拆解内成员
 *   - phonetic：问声旁，仅当声旁表音关系成立（soundRel 存在，避免教错）
 *   - contains：问「下面哪个字含有部件 X」，强化字族/部件迁移
 * 独体 / 会意 / 象形（无可用部件题）自动回退六书识别题。
 */
export function makeHanziComponentQuestion(target: HanziEntry, pool?: HanziEntry[], t?: TFunc): Question {
  const e = getEtymology(target.c);
  const comps = getComponents(target.c);
  if (!e || comps.length < 2) return makeHanziFormationQuestion(target, t);

  const kinds: Array<'semantic' | 'phonetic' | 'contains'> = [];
  if (e.semantic && comps.includes(e.semantic)) kinds.push('semantic');
  if (e.phonetic && e.soundRel) kinds.push('phonetic');
  const containable = comps.filter((c) => componentUsers(c).length >= 2);
  if (containable.length) kinds.push('contains');
  if (!kinds.length) return makeHanziFormationQuestion(target, t);

  const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
  const p = pool ?? getHanziByLevel(target.level);
  const tr = (key: string, fallback: string, params?: Record<string, string | number>) =>
    t ? t(key, params) : fallback;

  if (kind === 'semantic') {
    const ans = e.semantic!;
    return {
      id: genId(),
      kind: 'hanzi-component',
      skill: `hanzi:${target.c}`,
      prompt: tr('hanzi.qSemantic', `「${target.c}」表示意思的形旁（部首）是哪个？`, { c: target.c }),
      display: target.c,
      speak: `${target.c}，哪个部件表示意思？`,
      options: componentOptions(ans, target.c),
      answerId: ans,
      hint: `形旁「${ans}」${semanticHint(ans)}`,
      why: explainFormation(target.c),
    };
  }

  if (kind === 'phonetic') {
    const ans = e.phonetic!;
    const relPhrase =
      e.soundRel === 'exact' ? '读音和它一样' : e.soundRel === 'rhyme' ? '韵母和它一样' : '开头音和它一样';
    return {
      id: genId(),
      kind: 'hanzi-component',
      skill: `hanzi:${target.c}`,
      prompt: tr('hanzi.qPhonetic', `「${target.c}」提示读音的声旁是哪个？`, { c: target.c }),
      display: target.c,
      speak: `${target.c}，哪个部件提示读音？`,
      options: componentOptions(ans, target.c),
      answerId: ans,
      hint: `声旁「${ans}」${relPhrase}`,
      why: explainFormation(target.c),
    };
  }

  // contains：从「含有部件 X」的字里挑一个正确答案，再从同阶字里挑不含 X 的干扰
  const comp = containable[Math.floor(Math.random() * containable.length)]!;
  const userChars = componentUsers(comp).filter((c) => c !== target.c);
  const correctChar = userChars.length ? pick(userChars, 1)[0]! : comp;
  const nonUsers = p.filter((h) => h.c !== target.c && !componentUsers(comp).includes(h.c));
  const distractors = pick(nonUsers, 3);
  const opts = pick([getHanziByChar(correctChar) ?? target, ...distractors], 4).map((h) => ({
    id: h.c,
    label: h.c,
  }));
  return {
    id: genId(),
    kind: 'hanzi-component',
    skill: `hanzi:${target.c}`,
    prompt: tr('hanzi.qContains', `下面哪个字含有部件「${comp}」？`, { comp }),
    display: `「${comp}」`,
    speak: `哪个字含有部件${comp}？`,
    options: opts,
    answerId: correctChar,
    hint: `想想「${correctChar}」里是不是有「${comp}」`,
    why: `「${correctChar}」里就有部件「${comp}」，和「${target.c}」是同一类字族哦！`,
  };
}

/** 根据难度生成（保持原有 1/2/3 语义不变） */
export function makeHanziQuestion(target: HanziEntry, difficulty = 1, t?: TFunc): Question {
  const pool = getHanziByLevel(target.level);
  if (difficulty === 1) return makeHanziPinyinQuestion(target, pool);
  // 中/高难度：按比例穿插字理测评（六书识别 / 部件识别），强化 P2 字理可视化学到的知识。
  // 独体/会意/象形字若没有可用部件题，生成器会自动回退六书题，不会出现答非所问。
  if (Math.random() < 0.35) {
    return Math.random() < 0.5
      ? makeHanziFormationQuestion(target, t)
      : makeHanziComponentQuestion(target, pool, t);
  }
  if (difficulty === 2) return makeHanziCharQuestion(target, pool);
  return makeHanziWordQuestion(target, pool);
}

/** 混合题型：测验时随机抽一种，覆盖听说读写 + 字理多个维度 */
export function makeHanziMixedQuestion(target: HanziEntry, pool?: HanziEntry[], t?: TFunc): Question {
  const p = pool ?? getHanziByLevel(target.level);
  // 用闭包统一签名，避免各生成器第二参数类型不同（pool vs t）导致的类型/运行时错配
  const generators: Array<() => Question> = [
    () => makeHanziPinyinQuestion(target, p),
    () => makeHanziCharQuestion(target, p),
    () => makeHanziWordQuestion(target, p),
    () => makeHanziListenQuestion(target, p),
    () => makeHanziRadicalQuestion(target, p),
    () => makeHanziSimilarQuestion(target, p),
    // 字理维度：六书识别 / 部件识别（生成器内部按数据可用性自动回退，不会出无效题）
    () => makeHanziFormationQuestion(target, t),
    () => makeHanziComponentQuestion(target, p, t),
  ];
  // 笔画数题只需 target，概率与其余题型均等：每 9 题约出现 1 次
  if (Math.random() < 1 / 9) return makeHanziStrokeCountQuestion(target);
  const g = generators[Math.floor(Math.random() * generators.length)] ?? (() => makeHanziPinyinQuestion(target, p));
  return g();
}
