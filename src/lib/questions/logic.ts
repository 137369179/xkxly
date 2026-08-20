/**
 * 逻辑题出题器：找规律 / 图形配对 / 排序
 * ------------------------------------------------------------
 */
import type { Question } from '@/types';
import { makeNumberOptions, randInt, sample, sampleMany, shuffle } from '@/lib/utils';
import { ALL_POOLS, type Difficulty, nextId, opt } from './_shared';

export type LogicKind = 'pattern' | 'match' | 'order' | 'condition' | 'steps';

/** 5-1 找规律 */
export function makePatternQuestion(difficulty: Difficulty = 1): Question {
  const pool = sample(ALL_POOLS);
  const useNumber = difficulty >= 2 && Math.random() < 0.35;

  if (useNumber) {
    // 数字规律：等差数列
    const step = difficulty === 3 ? sample([2, 3, 5]) : sample([1, 2]);
    const start = randInt(1, 5);
    const len = 4;
    const seqArr = Array.from({ length: len }, (_, i) => start + i * step);
    const answer = start + len * step;

    const values = makeNumberOptions(answer, 4, 1, answer + 8);
    const options = values.map((v) => opt({ label: String(v) }));
    const answerId = options[values.indexOf(answer)]?.id ?? '';

    return {
      id: nextId('pat'),
      kind: 'logic',
      prompt: '找规律，问号里应该是几？',
      displayShapes: [...seqArr.map(String), '❓'],
      speak: '找一找规律，问号里应该填几呀？',
      options,
      answerId,
      hint: `每次加 ${step}，所以是 ${answer}`,
      skill: 'logic:pattern',
      why: `看相邻两个数差多少：${seqArr[1]} − ${seqArr[0]} = ${step}，每次都加 ${step}，所以最后是 ${answer}`,
    };
  }

  // 图形规律
  const patterns: string[][] = [
    ['A', 'B', 'A', 'B', 'A', 'B'],
    ['A', 'A', 'B', 'A', 'A', 'B'],
    ['A', 'B', 'B', 'A', 'B', 'B'],
    ['A', 'B', 'C', 'A', 'B', 'C'],
    ['A', 'B', 'A', 'C', 'A', 'B'],
  ];
  const tpl = difficulty === 1 ? sample(patterns.slice(0, 2)) : sample(patterns);
  const need = new Set(tpl).size;
  const picked = sampleMany(pool, Math.max(need, 4));
  const mapping: Record<string, string> = {
    A: picked[0] ?? '',
    B: picked[1] ?? '',
    C: picked[2] ?? '',
  };

  const showLen = difficulty === 1 ? 5 : 5;
  const shown = tpl.slice(0, showLen).map((k) => mapping[k] ?? '');
  const nextKey = tpl[showLen];
  const answerShape = nextKey ? (mapping[nextKey] ?? '') : '';

  const wrongPool = shuffle(picked.filter((s) => s !== answerShape)).slice(0, 3);
  const all = shuffle([answerShape, ...wrongPool]);
  const options = all.map((s) => opt({ emoji: s }));
  const answerId = options[all.indexOf(answerShape)]?.id ?? '';

  return {
    id: nextId('pat'),
    kind: 'logic',
    prompt: '找规律，接下来是哪一个？',
    displayShapes: [...shown, '❓'],
    speak: '看看这些图形有什么规律，接下来应该是哪一个呀？',
    options,
    answerId,
    hint: '按照重复出现的顺序往下排就对啦',
    skill: 'logic:pattern',
    why: `把图形分成一小组一小组念一遍：${tpl.slice(0, need * 2).join('')} 这样重复，就知道下一个是 ${answerShape} 了`,
  };
}

/** 5-2 图形配对 */
export function makeMatchQuestion(difficulty: Difficulty = 1): Question {
  const pool = sample(ALL_POOLS);
  const groupSize = difficulty === 1 ? 2 : difficulty === 2 ? 3 : 3;
  const picked = sampleMany(pool, Math.min(pool.length, 5));

  const target = Array.from({ length: groupSize }, () => sample(picked.slice(0, 3)));

  // 生成 3 个不同的干扰组合
  const wrongs: string[][] = [];
  const seenKeys = new Set<string>([target.join('')]);
  let guard = 0;
  while (wrongs.length < 3 && guard++ < 80) {
    const cand = target.slice();
    const idx = randInt(0, groupSize - 1);
    const repl = sample(picked.filter((s) => s !== cand[idx]));
    cand[idx] = repl;
    const key = cand.join('');
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      wrongs.push(cand);
    }
  }
  // 兜底：随机未凑够时用全随机补齐（带去重 + guard，避免无限循环 / 重复选项）
  let fillGuard = 0;
  while (wrongs.length < 3 && fillGuard++ < 40) {
    const cand = shuffle(sampleMany(pool, groupSize));
    const key = cand.join('');
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      wrongs.push(cand);
    }
  }

  const all = shuffle([target, ...wrongs]);
  const options = all.map((g) => opt({ shapes: g }));
  const answerId = options[all.findIndex((g) => g.join('') === target.join(''))]?.id ?? '';

  return {
    id: nextId('match'),
    kind: 'logic',
    prompt: '哪一组和上面的一模一样？',
    displayShapes: target,
    speak: '仔细看，哪一组和上面的一模一样呀？',
    options,
    answerId,
    hint: '要一个一个仔细对比哦',
    skill: 'logic:match',
    why: '比一比的窍门：从左往右，第 1 个对第 1 个、第 2 个对第 2 个，只要有一个不一样就不是它',
  };
}

/** 5-3 排序 */
export function makeOrderQuestion(difficulty: Difficulty = 1): Question {
  const mode = sample(['seq', 'max', 'min'] as const);
  const max = difficulty === 1 ? 10 : difficulty === 2 ? 30 : 100;
  const count = difficulty === 1 ? 3 : 4;

  const nums = shuffle(
    (() => {
      const set = new Set<number>();
      while (set.size < count) set.add(randInt(1, max));
      return [...set];
    })(),
  );

  if (mode === 'max' || mode === 'min') {
    const answer = mode === 'max' ? Math.max(...nums) : Math.min(...nums);
    const options = nums.map((n) => opt({ label: String(n) }));
    const answerId = options[nums.indexOf(answer)]?.id ?? '';
    return {
      id: nextId('ord'),
      kind: 'logic',
      prompt: mode === 'max' ? '哪个数字最大？' : '哪个数字最小？',
      displayShapes: nums.map(String),
      speak: mode === 'max' ? '哪一个数字最大呀？' : '哪一个数字最小呀？',
      options,
      answerId,
      hint: `${answer} 是${mode === 'max' ? '最大' : '最小'}的`,
      skill: 'logic:order',
      why: `把它们排成一队：${[...nums].sort((x, y) => x - y).join(' < ')}，排在${mode === 'max' ? '最后' : '最前'}的 ${answer} 就是${mode === 'max' ? '最大' : '最小'}的`,
    };
  }

  // 从小到大排序
  const asc = [...nums].sort((a, b) => a - b);
  const ascKey = asc.join(',');
  const wrongs: number[][] = [];
  const seen = new Set<string>([ascKey]);
  let guard = 0;
  while (wrongs.length < 3 && guard++ < 80) {
    const cand = shuffle(nums);
    const key = cand.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      wrongs.push(cand);
    }
  }
  // 兜底：随机未凑够时用确定性交换补齐，避免无限循环
  // （count ≤ 4、数字不重复时排列数 ≥ 6，此处至多再补几次必然凑齐）
  let fillGuard = 0;
  while (wrongs.length < 3 && fillGuard++ < 24) {
    const cand = asc.slice();
    if (cand.length >= 2) {
      const first = cand[0];
      const second = cand[1];
      if (first !== undefined && second !== undefined) {
        [cand[0], cand[1]] = [second, first];
      }
    }
    const key = cand.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      wrongs.push(cand);
    } else if (cand.length >= 3) {
      const tail = cand[cand.length - 1];
      const preTail = cand[cand.length - 2];
      if (tail !== undefined && preTail !== undefined) {
        [cand[cand.length - 1], cand[cand.length - 2]] = [preTail, tail];
      }
      const key2 = cand.join(',');
      if (!seen.has(key2)) {
        seen.add(key2);
        wrongs.push(cand);
      }
    }
  }

  const all = shuffle([asc, ...wrongs]);
  const options = all.map((g) => opt({ label: g.join(' < ') }));
  const answerId = options[all.findIndex((g) => g.join(',') === ascKey)]?.id ?? '';

  return {
    id: nextId('ord'),
    kind: 'logic',
    prompt: '哪一组是从小到大排好的？',
    displayShapes: nums.map(String),
    speak: '哪一组数字是从小到大排好的呀？',
    options,
    answerId,
    hint: `正确顺序是 ${asc.join(' < ')}`,
    skill: 'logic:order',
    why: `先找出最小的 ${asc[0]} 放最前面，剩下的里再找最小的，一直挑下去就排好了：${asc.join(' < ')}`,
  };
}

export function makeLogicQuestion(kind: LogicKind | 'mixed', difficulty: Difficulty = 1): Question {
  const k = kind === 'mixed' ? sample(['pattern', 'match', 'order', 'condition', 'steps'] as const) : kind;
  if (k === 'pattern') return makePatternQuestion(difficulty);
  if (k === 'match') return makeMatchQuestion(difficulty);
  if (k === 'condition') return makeConditionQuestion(difficulty);
  if (k === 'steps') return makeStepsQuestion(difficulty);
  return makeOrderQuestion(difficulty);
}

/* ============================================================
   5-5 步骤排序（🧭 新增题型，2026-08-21）
   对齐 Code.org「sequencing（顺序编排）」核心概念：
   把生活流程的正确步骤顺序排出来——先做什么、再做什么。
     L1 三步流程（洗手 / 起床 / 跳绳）—— 3-4 岁
     L2 四步流程（刷牙 / 做三明治）—— 5-6 岁
     L3 四步细节流程（种花 / 寄信）—— 7 岁+
   ============================================================ */

interface StepFlow {
  flow: string;
  emoji: string;
  steps: string[];
  hint: string;
  why: string;
}

const STEP_FLOWS: Record<Difficulty, StepFlow[]> = {
  1: [
    {
      flow: '洗手',
      emoji: '🧼',
      steps: ['开水龙头', '抹肥皂', '冲干净'],
      hint: '先开水的开关，再抹肥皂搓一搓，最后冲掉泡泡',
      why: '洗手要先 🚰 开水龙头，再 🧼 抹肥皂搓出泡泡，最后 🫧 冲干净，这样手就洗好啦。',
    },
    {
      flow: '起床',
      emoji: '🌅',
      steps: ['穿衣服', '洗脸', '吃早饭'],
      hint: '起床先穿好衣服，再去洗洗脸，然后吃早饭',
      why: '起床要 👕 先穿好衣服，再 🧴 去洗脸，最后 🥣 吃早饭，一步一步来。',
    },
    {
      flow: '跳绳',
      emoji: '🪢',
      steps: ['拿绳子', '甩起来', '跳过去'],
      hint: '先把绳子拿在手里，再甩起来，等绳子到脚下就跳',
      why: '跳绳要先 🪢 拿好绳子，再 ⭕ 把绳子甩过头顶，绳子到脚下 🦶 时跳过去。',
    },
  ],
  2: [
    {
      flow: '刷牙',
      emoji: '🪥',
      steps: ['接水', '挤牙膏', '刷牙', '漱口'],
      hint: '先接水，再挤牙膏，上下刷一刷，最后漱口',
      why: '刷牙要先 💧 接一杯水，再 🪥 挤上牙膏，然后 🦷 上下刷干净，最后 💦 漱口吐掉。',
    },
    {
      flow: '做三明治',
      emoji: '🥪',
      steps: ['拿面包', '放生菜', '夹火腿', '盖上面包'],
      hint: '从一片面包开始，一层一层往上叠，最后盖上面包',
      why: '做三明治要 🍞 先拿一片面包，放 🥬 生菜，夹 🍖 火腿，最后 🍞 盖上一片面包。',
    },
  ],
  3: [
    {
      flow: '种花',
      emoji: '🌻',
      steps: ['挖土洞', '放种子', '盖上土', '浇水'],
      hint: '先挖个小洞，把种子放进去，盖好土，再浇水',
      why: '种花要 🕳️ 先挖一个土洞，把 🌱 种子放进去，再 🪨 盖上土，最后 💧 浇水，小花就能长大。',
    },
    {
      flow: '寄信',
      emoji: '✉️',
      steps: ['写信', '装进信封', '贴邮票', '投进邮筒'],
      hint: '先写内容，再装信封，贴上邮票，最后投邮筒',
      why: '寄信要 📝 先写好内容，装进 ✉️ 信封，贴上 🏷️ 邮票，最后 📮 投进邮筒寄出去。',
    },
  ],
};

/** 5-5 步骤排序：按难度档取生活流程，生成 4 个排列（正确 + 3 个打乱，去重） */
export function makeStepsQuestion(difficulty: Difficulty = 1): Question {
  const pool = STEP_FLOWS[difficulty] ?? STEP_FLOWS[1];
  const item = sample(pool);
  const correct = item.steps;
  const correctKey = correct.join('>');
  const wrongs: string[][] = [];
  const seen = new Set<string>([correctKey]);
  let guard = 0;
  while (wrongs.length < 3 && guard++ < 120) {
    const cand = shuffle(correct);
    const key = cand.join('>');
    if (!seen.has(key) && cand.join('') !== correct.join('')) {
      seen.add(key);
      wrongs.push(cand);
    }
  }
  // 兜底：确定性相邻交换补齐（保证恒 4 选项）
  let fillGuard = 0;
  while (wrongs.length < 3 && fillGuard++ < 40) {
    const cand = correct.slice();
    if (cand.length >= 2) {
      const first = cand[0];
      const second = cand[1];
      if (first !== undefined && second !== undefined) {
        [cand[0], cand[1]] = [second, first];
      }
    }
    const key = cand.join('>');
    if (!seen.has(key)) {
      seen.add(key);
      wrongs.push(cand);
    }
  }

  const all = shuffle([correct, ...wrongs]);
  const options = all.map((g) => opt({ label: g.join(' → ') }));
  const answerId = options[all.findIndex((g) => g.join('>') === correctKey)]?.id ?? '';
  return {
    id: nextId('steps'),
    kind: 'logic',
    prompt: `下面哪个是「${item.flow}」的正确顺序？`,
    displayShapes: [item.emoji, '❓'],
    speak: `想一想，「${item.flow}」应该先做什么、再做什么呀？`,
    options,
    answerId,
    hint: item.hint,
    skill: 'logic:steps',
    why: item.why,
  };
}

/* ============================================================
   5-4 条件判断（🚦 新增题型，2026-08-21）
   阶梯式难度（对齐分龄认知发展）：
     L1 生活分类 —— 会飞吗 / 是水果吗 / 是红色吗（3-4 岁）
     L2 真假判断 + 场景规则 —— 哪句对 / 红灯该怎么做（5-6 岁）
     L3 多条件推理 —— 既是…又是… / 大小传递 / 数量推理（7 岁+）
   ============================================================ */

interface ClassifyItem {
  prompt: string;
  speak: string;
  answer: string;
  wrongs: [string, string, string];
  hint: string;
  why: string;
}

const CLASSIFY_ITEMS: ClassifyItem[] = [
  {
    prompt: '下面哪个会飞呀？',
    speak: '想一想，下面哪一个会飞呀？',
    answer: '🐦',
    wrongs: ['🐟', '🚗', '🐶'],
    hint: '小鸟有翅膀，可以飞到天上',
    why: '🐦 小鸟有翅膀会飞；🐟 小鱼在水里游，🚗 汽车在地上跑，🐶 小狗也不会飞，所以选 🐦。',
  },
  {
    prompt: '下面哪个是水果？',
    speak: '找一找，下面哪一个是我们吃的水果？',
    answer: '🍎',
    wrongs: ['🥕', '🍚', '🥚'],
    hint: '红红的、甜甜的，早上吃它最健康',
    why: '🍎 苹果是水果；🥕 胡萝卜是蔬菜，🍚 米饭是主食，🥚 鸡蛋是蛋类，所以选 🍎。',
  },
  {
    prompt: '下面哪个是动物？',
    speak: '看一看，下面哪一个是有生命的动物？',
    answer: '🐰',
    wrongs: ['🌸', '⚽', '🚗'],
    hint: '它会蹦蹦跳跳，爱吃胡萝卜',
    why: '🐰 小兔子是动物；🌸 花朵是植物，⚽ 皮球和 🚗 汽车都是物品，所以选 🐰。',
  },
  {
    prompt: '下面哪个是红色的？',
    speak: '找一找，下面哪一个颜色是红色的？',
    answer: '🔴',
    wrongs: ['🟢', '🔵', '🟡'],
    hint: '像苹果、像小红旗的颜色',
    why: '🔴 是红色，像苹果和小红旗；🟢 是绿色，🔵 是蓝色，🟡 是黄色，所以选 🔴。',
  },
  {
    prompt: '下面哪个可以吃？',
    speak: '哪个是可以放进嘴里吃掉的呀？',
    answer: '🍉',
    wrongs: ['📚', '✏️', '🧦'],
    hint: '夏天吃它最解渴，是水果哦',
    why: '🍉 西瓜是水果可以吃；📚 书本、✏️ 铅笔、🧦 袜子都不能吃，所以选 🍉。',
  },
  {
    prompt: '下面哪个会游泳？',
    speak: '想一想，下面哪一个可以在水里游来游去？',
    answer: '🐟',
    wrongs: ['🐱', '🚗', '🎈'],
    hint: '它在水里生活，摇摇尾巴游呀游',
    why: '🐟 小鱼生活在水里会游泳；🐱 小猫不会游泳，🚗 汽车和 🎈 气球也不会，所以选 🐟。',
  },
];

/** L1 生活分类：从生活经验出发的属性归类（答案唯一、图形直观、低门槛） */
function makeClassifyQuestion(): Question {
  const item = sample(CLASSIFY_ITEMS);
  const all = shuffle([item.answer, ...item.wrongs]);
  const options = all.map((s) => opt({ emoji: s }));
  const answerId = options[all.indexOf(item.answer)]?.id ?? '';
  return {
    id: nextId('cond'),
    kind: 'logic',
    prompt: item.prompt,
    displayShapes: [item.answer, '❓'],
    speak: item.speak,
    options,
    answerId,
    hint: item.hint,
    skill: 'logic:condition',
    why: item.why,
  };
}

const TRUE_STATEMENTS = [
  '太阳从东边升起',
  '一天有 24 个小时',
  '3 比 2 大',
  '小猫是动物',
  '夏天很热',
  '人有两只手',
];
const FALSE_STATEMENTS = [
  '鱼会飞',
  '冬天很热',
  '5 比 10 大',
  '汽车会游泳',
  '太阳从西边升起',
  '人有 5 只手',
];

/** L2 真假判断：辨别说法对错（练条件判断中的「真/假」分支） */
function makeTrueFalseQuestion(): Question {
  const askTrue = Math.random() < 0.5;
  const correct = sample(askTrue ? TRUE_STATEMENTS : FALSE_STATEMENTS);
  const wrongPool = shuffle(askTrue ? FALSE_STATEMENTS : TRUE_STATEMENTS).slice(0, 3);
  const prompt = askTrue ? '下面哪句话是对的？' : '下面哪句话是错的？';
  const hint = askTrue ? '想一想这句话符不符合我们平时的生活常识' : '找一找哪句话和平时看到的完全不一样';
  const all = shuffle([correct, ...wrongPool]);
  const options = all.map((s) => opt({ label: s }));
  const answerId = options[all.indexOf(correct)]?.id ?? '';
  const why = askTrue
    ? `因为「${correct}」符合生活常识，是真的；其它三句都和常识相反，所以选它。`
    : `因为「${correct}」和常识完全相反，是错的；其它三句都是对的，所以选它。`;
  return {
    id: nextId('cond'),
    kind: 'logic',
    prompt,
    displayShapes: [],
    speak: askTrue ? '哪一句话是对的呀？仔细想一想。' : '哪一句话是错的呀？要找出不对的那一句。',
    options,
    answerId,
    hint,
    skill: 'logic:condition',
    why,
  };
}

interface RuleItem {
  prompt: string;
  speak: string;
  answer: string;
  wrongs: [string, string, string];
  hint: string;
  why: string;
}

const RULE_ITEMS: RuleItem[] = [
  {
    prompt: '红灯亮了，应该怎么做？',
    speak: '过马路看到红灯亮了，应该怎么做呀？',
    answer: '🛑 停下来',
    wrongs: ['🚶 走过去', '🏃 跑过去', '🚲 骑过去'],
    hint: '红灯停，绿灯行，黄灯等一等',
    why: '交通规则说「红灯停、绿灯行」。红灯亮了要 🛑 停下来等一等，不能过马路，所以选「停下来」。',
  },
  {
    prompt: '下雨天出门，应该带什么？',
    speak: '外面下雨了，出门应该带什么呀？',
    answer: '🌂 带雨伞',
    wrongs: ['🕶️ 带墨镜', '⚽ 带皮球', '🍦 带冰淇淋'],
    hint: '下雨的时候，要用它挡雨',
    why: '下雨天要带 🌂 雨伞挡雨；墨镜是太阳大时戴，皮球是玩的时候带，冰淇淋下雨吃会化，所以选「带雨伞」。',
  },
  {
    prompt: '到了睡觉时间，应该怎么做？',
    speak: '晚上到睡觉的时间了，应该怎么做呀？',
    answer: '🛏️ 上床睡觉',
    wrongs: ['🎮 继续玩游戏', '🍬 吃很多糖', '📺 熬夜看电视'],
    hint: '按时睡觉才能长高高、身体棒',
    why: '到了睡觉时间要 🛏️ 上床睡觉，身体才能休息好；继续玩游戏、吃糖、看电视都会影响休息，所以选「上床睡觉」。',
  },
  {
    prompt: '天气很冷，出门应该穿什么？',
    speak: '冬天外面很冷，出门应该穿什么呀？',
    answer: '🧥 穿外套',
    wrongs: ['🩱 穿泳衣', '🩴 穿拖鞋', '🍉 抱个大西瓜'],
    hint: '穿得暖暖的，才不怕冷风',
    why: '天冷要穿 🧥 外套保暖；泳衣是游泳时穿，拖鞋在家穿，西瓜是吃的不是穿的，所以选「穿外套」。',
  },
];

/** L2 真假判断 + 场景规则：生活规则「如果…那么…」的行为分支与真假辨别（两者轮换保持新鲜感） */
function makeRuleQuestion(): Question {
  // 50% 真假判断（辨别说法对错），50% 场景规则（执行生活规则）
  if (Math.random() < 0.5) return makeTrueFalseQuestion();
  const item = sample(RULE_ITEMS);
  const all = shuffle([item.answer, ...item.wrongs]);
  const options = all.map((s) => opt({ label: s }));
  const answerId = options[all.indexOf(item.answer)]?.id ?? '';
  return {
    id: nextId('cond'),
    kind: 'logic',
    prompt: item.prompt,
    displayShapes: [],
    speak: item.speak,
    options,
    answerId,
    hint: item.hint,
    skill: 'logic:condition',
    why: item.why,
  };
}

/** L3 多条件推理：属性交集 / 大小传递 / 数量推理（同时满足多个条件） */
function makeReasonQuestion(): Question {
  const mode = sample(['intersect', 'transfer', 'count'] as const);
  if (mode === 'intersect') {
    const items = [
      { prompt: '下面哪个既是动物，又会游泳？', speak: '哪一个既是动物，又会游泳呀？', answer: '🐟', wrongs: ['🌸', '🚗', '🐱'], hint: '先找动物，再看它会不会游泳', why: '条件是「既是动物又会游泳」：🐟 小鱼是动物也会游泳；🌸 花不是动物，🚗 车不会游泳，🐱 小猫虽然是动物但不会游泳，所以选 🐟。' },
      { prompt: '下面哪个既是水果，又是红色的？', speak: '哪一个既是水果，颜色又是红色的呀？', answer: '🍎', wrongs: ['🍌', '🍇', '🍊'], hint: '先找水果，再看颜色是不是红红的', why: '条件是「既是水果又是红色」：🍎 苹果是水果而且是红色；🍌 香蕉是黄色，🍇 葡萄是紫色，🍊 橘子是橙色，所以选 🍎。' },
      { prompt: '下面哪个既是动物，又有四条腿？', speak: '哪一个既是动物，又有四条腿呀？', answer: '🐶', wrongs: ['🐟', '🐦', '🚗'], hint: '先找动物，再数一数有几条腿', why: '条件是「既是动物又有四条腿」：🐶 小狗是动物而且有四条腿；🐟 小鱼没有腿，🐦 小鸟有两条腿，🚗 汽车不是动物，所以选 🐶。' },
    ];
    const item = sample(items);
    const all = shuffle([item.answer, ...item.wrongs]);
    const options = all.map((s) => opt({ emoji: s }));
    const answerId = options[all.indexOf(item.answer)]?.id ?? '';
    return {
      id: nextId('cond'),
      kind: 'logic',
      prompt: item.prompt,
      displayShapes: [item.answer, '❓'],
      speak: item.speak,
      options,
      answerId,
      hint: item.hint,
      skill: 'logic:condition',
      why: item.why,
    };
  }
  if (mode === 'transfer') {
    const items = [
      { prompt: '大象比小狗大，小狗比小猫大，谁最大？', answer: '🐘 大象', wrongs: ['🐶 小狗', '🐱 小猫', '🐰 小兔子'], hint: '排排队：最大 > 中间 > 最小', why: '大象 > 小狗 > 小猫，所以 🐘 大象最大，这就是「一个比一个大」的推理。' },
      { prompt: '小猫比小鱼大，小鱼比蚂蚁大，谁最小？', answer: '🐜 蚂蚁', wrongs: ['🐱 小猫', '🐟 小鱼', '🐦 小鸟'], hint: '反过来想：最小的在最下面', why: '小猫 > 小鱼 > 蚂蚁，所以 🐜 蚂蚁最小，最小的排最后。' },
      { prompt: '皮球比积木大，积木比弹珠大，谁排在中间？', answer: '🧱 积木', wrongs: ['⚽ 皮球', '🔴 弹珠', '🎈 气球'], hint: '最大的和最小的都不在中间哦', why: '皮球 > 积木 > 弹珠，所以 🧱 积木不大不小，正好排在中间。' },
    ];
    const item = sample(items);
    const all = shuffle([item.answer, ...item.wrongs]);
    const options = all.map((s) => opt({ label: s }));
    const answerId = options[all.indexOf(item.answer)]?.id ?? '';
    return {
      id: nextId('cond'),
      kind: 'logic',
      prompt: item.prompt,
      displayShapes: [],
      speak: '比一比大小，想一想谁最大、谁最小。',
      options,
      answerId,
      hint: item.hint,
      skill: 'logic:condition',
      why: item.why,
    };
  }
  // mode === 'count'：数量推理（每组 × 份数）
  const items = [
    { prompt: '每个小朋友吃 2 块饼干，3 个小朋友一共吃几块？', answer: '6', wrongs: ['5', '8', '9'], hint: '2、4、6，数一数三个小朋友的饼干', why: '3 个小朋友，每个 2 块：2 + 2 + 2 = 6，一共 6 块。' },
    { prompt: '每个小朋友拿 1 个气球，4 个小朋友一共拿几个？', answer: '4', wrongs: ['3', '5', '6'], hint: '1、2、3、4，数一数小朋友手里的气球', why: '4 个小朋友，每个 1 个：1 + 1 + 1 + 1 = 4，一共 4 个。' },
    { prompt: '每辆自行车有 2 个轮子，2 辆自行车一共有几个轮子？', answer: '4', wrongs: ['2', '3', '6'], hint: '一辆 2 个，两辆就是 2 + 2', why: '2 辆自行车，每辆 2 个轮子：2 + 2 = 4，一共 4 个轮子。' },
  ];
  const item = sample(items);
  const values = shuffle([item.answer, ...item.wrongs]);
  const options = values.map((v) => opt({ label: v }));
  const answerId = options[values.indexOf(item.answer)]?.id ?? '';
  return {
    id: nextId('cond'),
    kind: 'logic',
    prompt: item.prompt,
    displayShapes: [],
    speak: '数一数、算一算，一共是多少呀？',
    options,
    answerId,
    hint: item.hint,
    skill: 'logic:condition',
    why: item.why,
  };
}

/** 5-4 条件判断入口：按难度档路由（L1 分类 / L2 规则 / L3 推理） */
export function makeConditionQuestion(difficulty: Difficulty = 1): Question {
  if (difficulty <= 1) return makeClassifyQuestion();
  if (difficulty === 2) return makeRuleQuestion();
  return makeReasonQuestion();
}
