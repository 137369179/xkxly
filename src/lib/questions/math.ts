/**
 * 数学 / 数数 / 数字 / 形状 / 时间 / 钱币 / 比大小 出题器
 * ------------------------------------------------------------
 * 涵盖：
 *   - 加减法（makeMathQuestion）
 *   - 乘除法（makeMulQuestion / makeDivQuestion）
 *   - 数数对应（makeCountQuestion）
 *   - 数字认知（makeNumberQuestion）
 *   - 形状识别（makeShapeQuestion）
 *   - 钟表时间（makeTimeQuestion）
 *   - 钱币计算（makeCoinQuestion）
 *   - 比大小（makeCompareQuestion）
 */
import type { Question } from '@/types';
import { toChineseNumber } from '@/lib/chineseNumber';
import { makeNumberOptions, randInt, sample, shuffle } from '@/lib/utils';
import { ANIMALS, FRUITS, THINGS, type Difficulty, nextId, opt } from './_shared';

/* ============================================================
   乘除法 / 图形 / 时间 / 钱币  (P1 新增)
   ============================================================ */
const SHAPES = [
  { name: '圆形', emoji: '⭕', sides: 0 },
  { name: '三角形', emoji: '🔺', sides: 3 },
  { name: '正方形', emoji: '⬜', sides: 4 },
  { name: '长方形', emoji: '▭', sides: 4 },
  { name: '五角星', emoji: '⭐', sides: 5 },
  { name: '心形', emoji: '❤️', sides: 0 },
] as const;

export function makeMulQuestion(difficulty: Difficulty = 1): Question {
  const max = difficulty === 1 ? 5 : difficulty === 2 ? 9 : 12;
  const a = randInt(2, max);
  const b = randInt(2, Math.min(max, 9));
  const answer = a * b;
  const display = `${a} × ${b} = ?`;
  const values = makeNumberOptions(answer, 4, Math.max(0, answer - 6), answer + 6);
  const options = values.map((v) => opt({ label: String(v) }));
  const answerId = options[values.indexOf(answer)]!.id;
  return {
    id: `mul-${Date.now().toString(36)}`,
    kind: 'math-mul',
    skill: 'math:mul',
    prompt: display,
    display,
    speak: `${a} 乘以 ${b} 等于多少`,
    options,
    answerId,
    hint: `${a} 个 ${b} 相加`,
    why: `${a} × ${b} = ${answer}（${a} 个 ${b} 加在一起）`,
  };
}

export function makeDivQuestion(difficulty: Difficulty = 1): Question {
  const max = difficulty === 1 ? 5 : difficulty === 2 ? 9 : 12;
  const b = randInt(2, max);
  const q = randInt(2, Math.min(max, 9));
  const answer = q;
  const total = b * q;
  const display = `${total} ÷ ${b} = ?`;
  const values = makeNumberOptions(answer, 4, Math.max(0, answer - 4), answer + 4);
  const options = values.map((v) => opt({ label: String(v) }));
  const answerId = options[values.indexOf(answer)]!.id;
  return {
    id: `div-${Date.now().toString(36)}`,
    kind: 'math-div',
    skill: 'math:div',
    prompt: display,
    display,
    speak: `${total} 除以 ${b} 等于多少`,
    options,
    answerId,
    hint: `${total} 平均分成 ${b} 份`,
    why: `${total} ÷ ${b} = ${answer}（${total} 个东西分 ${b} 份，每份 ${answer} 个）`,
  };
}

export function makeShapeQuestion(difficulty: Difficulty = 1): Question {
  const count = difficulty === 1 ? randInt(2, 5) : difficulty === 2 ? randInt(3, 8) : randInt(5, 12);
  const target = sample(SHAPES);
  const display = target.emoji.repeat(count);
  const options = shuffle(SHAPES.filter(s => s.name !== target.name)).slice(0, 3).concat([target]);
  const shuffled = shuffle(options);
  return {
    id: `shape-${Date.now().toString(36)}`,
    kind: 'shape',
    skill: 'shape:recognize',
    prompt: '这是什么形状？',
    display,
    speak: '',
    options: shuffled.map(s => ({ id: s.name, label: s.name, emoji: s.emoji })),
    answerId: target.name,
    hint: `它有 ${target.sides} 条边`,
    why: `这是${target.name}${target.sides > 0 ? `，有 ${target.sides} 条边` : ''}`,
  };
}

export function makeTimeQuestion(difficulty: Difficulty = 1): Question {
  const hour = randInt(1, 12);
  const minute = difficulty === 1 ? 0 : difficulty === 2 ? [0, 30][randInt(0, 1)] : [0, 15, 30, 45][randInt(0, 3)];
  const answer = `${hour}时${minute ? `${minute}分` : ''}`;
  const display = `🕐 ${hour}:${String(minute).padStart(2, '0')}`;
  const wrong: string[] = [];
  let guard = 0;
  while (wrong.length < 3 && guard++ < 80) {
    const wh = randInt(1, 12);
    const wm = [0, 15, 30, 45][randInt(0, 3)];
    const w = `${wh}时${wm ? `${wm}分` : ''}`;
    if (w !== answer && !wrong.includes(w)) wrong.push(w);
  }
  const opts = shuffle(wrong.concat([answer]));
  return {
    id: `time-${Date.now().toString(36)}`,
    kind: 'time',
    skill: 'time:clock',
    prompt: '钟表上显示的是几点？',
    display,
    speak: '',
    options: opts.map(o => ({ id: o, label: o, emoji: '🕐' })),
    answerId: answer,
    hint: `时针指着 ${hour}`,
    why: `时针指着 ${hour}，分针指着 ${minute ? minute / 5 : 0}，所以是 ${answer}`,
  };
}

export function makeCoinQuestion(difficulty: Difficulty = 1): Question {
  const items = [
    { name: '1元', value: 100, emoji: '🪙' },
    { name: '5角', value: 50, emoji: '🪙' },
    { name: '1角', value: 10, emoji: '🪙' },
  ];
  // 难度梯度：
  //   1 = 两枚硬币相加（最常见，结果≤1元5角）
  //   2 = 两枚硬币相加（允许重复面值，结果更大）
  //   3 = 三枚硬币相加（多步累加，进位多）
  const coinCount = difficulty === 1 ? 2 : difficulty === 2 ? 2 : 3;
  const picked = Array.from({ length: coinCount }, () => sample(items));
  // 难度1 限制：至少包含一枚 1 元，避免全是 1 角的过简单题目
  if (difficulty === 1 && !picked.some((c) => c.value === 100)) {
    picked[0] = items[0]!;
  }
  const total = picked.reduce((s, c) => s + c.value, 0);
  const yuan = Math.floor(total / 100);
  const jiao = Math.floor((total % 100) / 10);
  const answer = `${yuan}元${jiao ? `${jiao}角` : ''}`;
  const display = picked.map((c) => `${c.emoji}${c.name}`).join(' + ');
  const wrong: string[] = [];
  let guard = 0;
  while (wrong.length < 3 && guard++ < 80) {
    const wYuan = randInt(0, Math.max(2, yuan + 1));
    const wJiao = randInt(0, 9);
    const w = `${wYuan}元${wJiao ? `${wJiao}角` : ''}`;
    if (wYuan * 100 + wJiao * 10 !== total && !wrong.includes(w)) wrong.push(w);
  }
  const opts = shuffle(wrong.concat([answer]));
  return {
    id: `coin-${Date.now().toString(36)}`,
    kind: 'coin',
    skill: 'coin:recognize',
    prompt: `${display} = ?`,
    display,
    speak: picked.map((c) => c.name).join(' 加 ') + ' 等于多少',
    options: opts.map(o => ({ id: o, label: o, emoji: '🪙' })),
    answerId: answer,
    hint: `1元=10角`,
    why: `${picked.map((c) => c.name).join('+')}=${answer}`,
  };
}

/* ============================================================
   1. 加减法（10 以内 / 20 以内）
   ============================================================ */
export function makeMathQuestion(difficulty: Difficulty = 1, forceOp?: 'add' | 'sub'): Question {
  const max = difficulty === 1 ? 10 : difficulty === 2 ? 15 : 20;
  const isAdd = forceOp ? forceOp === 'add' : Math.random() < (difficulty === 1 ? 0.6 : 0.5);

  let a: number, b: number, answer: number, expr: string;
  if (isAdd) {
    a = randInt(1, max - 1);
    b = randInt(1, max - a);
    answer = a + b;
    expr = `${a} + ${b} = ?`;
  } else {
    a = randInt(2, max);
    b = randInt(1, a);
    answer = a - b;
    expr = `${a} − ${b} = ?`;
  }

  const values = makeNumberOptions(answer, 4, 0, max);
  const options = values.map((v) => opt({ label: String(v) }));
  const answerId = options[values.indexOf(answer)]!.id;

  return {
    id: nextId('math'),
    kind: 'math',
    prompt: '算一算，等于几呀？',
    display: expr,
    speak: isAdd
      ? `${toChineseNumber(a)} 加 ${toChineseNumber(b)} 等于几？`
      : `${toChineseNumber(a)} 减 ${toChineseNumber(b)} 等于几？`,
    options,
    answerId,
    hint: isAdd ? `${a} + ${b} = ${answer}` : `${a} − ${b} = ${answer}`,
    skill: isAdd ? 'math:add' : 'math:sub',
    why: isAdd
      ? `伸出手指数一数：先记住 ${a}，再往后数 ${b} 下，就数到 ${answer} 啦`
      : `伸出手指数一数：从 ${a} 开始往回数 ${b} 下，就数到 ${answer} 啦`,
  };
}

/* ============================================================
   2. 数数小游戏（数物对应）
   ============================================================ */
export function makeCountQuestion(difficulty: Difficulty = 1): Question {
  const max = difficulty === 1 ? 9 : difficulty === 2 ? 14 : 20;
  const n = randInt(1, max);
  const emoji = sample([...FRUITS, ...ANIMALS, ...THINGS]);

  const values = makeNumberOptions(n, 4, 1, max + 2);
  const options = values.map((v) => opt({ label: String(v) }));
  const answerId = options[values.indexOf(n)]!.id;

  return {
    id: nextId('count'),
    kind: 'count',
    prompt: '数一数，一共有几个？',
    displayShapes: Array.from({ length: n }, () => emoji),
    speak: '数一数，一共有几个呀？',
    options,
    answerId,
    hint: `一共有 ${n} 个，读作「${toChineseNumber(n)}」`,
    skill: 'number:count',
    why: `数的时候用手指一个一个点过去：1、2、3……最后停在几，就是几个。这里最后数到 ${n}`,
  };
}

/* ============================================================
   3. 数字认知（听数字选数字 / 中文数字对应）
   ============================================================ */
export function makeNumberQuestion(difficulty: Difficulty = 1, forceN?: number): Question {
  const max = difficulty === 1 ? 20 : difficulty === 2 ? 50 : 100;
  const n = forceN ?? randInt(0, max);
  const useChinese = Math.random() < 0.5;

  const values = makeNumberOptions(n, 4, 0, Math.max(max, n + 4));
  const options = values.map((v) => opt({ label: useChinese ? String(v) : toChineseNumber(v) }));
  const answerId = options[values.indexOf(n)]!.id;

  return {
    id: nextId('num'),
    kind: 'number',
    prompt: useChinese ? '这个数字是几？' : '哪个是这个数字的中文写法？',
    display: useChinese ? toChineseNumber(n) : String(n),
    speak: useChinese ? '这个数字是几？' : `数字 ${toChineseNumber(n)}，中文怎么写？`,
    options,
    answerId,
    hint: `${n} 读作「${toChineseNumber(n)}」`,
    skill: `number:${n}`,
    why: `「${toChineseNumber(n)}」和「${n}」是同一个数的两种写法，一个是中文写法，一个是阿拉伯数字`,
  };
}

/* ============================================================
   8-1 比大小
   ============================================================ */
export function makeCompareQuestion(difficulty: Difficulty = 1): Question {
  const max = difficulty === 1 ? 9 : difficulty === 2 ? 20 : 50;
  const a = randInt(1, max);
  let b = randInt(1, max);
  if (b === a) b = b >= max ? b - 1 : b + 1;
  const answerId = a > b ? 'a' : 'b';
  const opts = shuffle([
    { id: 'a', label: String(a) },
    { id: 'b', label: String(b) },
    { id: 'eq', label: '一样大' },
  ]).map((o) => opt(o));
  return {
    id: nextId('cmp'),
    kind: 'compare',
    skill: 'compare:size',
    prompt: '比一比：哪个数字更大？',
    display: `${a} 和 ${b}`,
    speak: `比较一下，${toChineseNumber(a)} 和 ${toChineseNumber(b)}，哪个更大呀？`,
    options: opts,
    answerId,
    hint: `${Math.max(a, b)} 更大`,
    why: `${Math.max(a, b)} 比 ${Math.min(a, b)} 大`,
  };
}
