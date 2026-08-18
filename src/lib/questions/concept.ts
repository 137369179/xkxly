/**
 * 概念题出题器：归类 / 反义词 / 形近字
 * ------------------------------------------------------------
 * 这些题型共同特征是「按概念分组/配对」，与数学运算/逻辑推理区分开。
 */
import type { Question } from '@/types';
import { sample, shuffle } from '@/lib/utils';
import { type Difficulty, nextId, opt } from './_shared';

/** 8-2 归类（水果 / 动物 / 交通工具 / 蔬菜 / 颜色 / 衣物） */
const CATEGORY_ITEMS = [
  { cat: '水果', emoji: '🍎', items: ['🍎', '🍌', '🍇', '🍊', '🍓', '🍉', '🍐', '🍒', '🍑', '🥝'] },
  { cat: '动物', emoji: '🐱', items: ['🐱', '🐶', '🐰', '🐼', '🦁', '🐯', '🐸', '🐵', '🐷', '🐮'] },
  { cat: '交通工具', emoji: '🚗', items: ['🚗', '🚌', '🚄', '✈️', '🚀', '🚲', '🚜', '🚢', '🏍️', '🚕'] },
  { cat: '蔬菜', emoji: '🥕', items: ['🥕', '🍅', '🥦', '🌽', '🥒', '🍆', '🥬', '🧅', '🥔', '🌶️'] },
  // 难度 2+ 扩展类别（更细分，干扰更强）
  { cat: '颜色', emoji: '🎨', items: ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠', '⚫', '⚪', '🟤'] },
  { cat: '衣物', emoji: '👕', items: ['👕', '👖', '👗', '🧥', '🧢', '👟', '🧦', '手套'] },
];

export function makeCategoryQuestion(difficulty: Difficulty = 1): Question {
  // 难度梯度：
  //   1 = 基础 4 类（水果/动物/交通工具/蔬菜），类别差异大易区分
  //   2 = 全 6 类，加入颜色/衣物等抽象类别
  //   3 = 全 6 类，但干扰项优先选相近类别（水果 vs 蔬菜易混）
  const baseCats = CATEGORY_ITEMS.slice(0, 4);
  const allCats = CATEGORY_ITEMS;
  const pool = difficulty === 1 ? baseCats : allCats;
  const target = sample(pool);
  const item = sample(target.items);

  let wrongCats: typeof pool;
  if (difficulty === 3) {
    // 优先选"易混"类别作为干扰项：水果↔蔬菜、动物↔交通工具
    const confusingMap: Record<string, string[]> = {
      '水果': ['蔬菜'],
      '蔬菜': ['水果'],
    };
    const confusing = (confusingMap[target.cat] ?? [])
      .map((c) => pool.find((p) => p.cat === c))
      .filter((x): x is typeof pool[number] => !!x);
    const others = shuffle(pool.filter((c) => c.cat !== target.cat && !confusing.includes(c)));
    wrongCats = [...confusing, ...others].slice(0, 3);
  } else {
    wrongCats = shuffle(pool.filter((c) => c.cat !== target.cat)).slice(0, 3);
  }

  const opts = shuffle([target.cat, ...wrongCats.map((c) => c.cat)]).map((c) => opt({ label: c }));
  const answerId = opts.find((o) => o.label === target.cat)?.id ?? '';
  return {
    id: nextId('cat'),
    kind: 'sort',
    skill: 'sort:category',
    prompt: '它属于哪一类？',
    display: item,
    speak: `这个${target.cat}属于哪一类呀？`,
    options: opts,
    answerId,
    hint: `它是${target.cat}`,
    why: `${item} 是${target.cat}`,
  };
}

/** 8-3 反义词配对（按难度分档：直观 → 中频 → 抽象） */
const OPPOSITE_PAIRS = [
  // 难度 1：5 个最直观、儿童最先接触的反义词
  ['大', '小'], ['多', '少'], ['上', '下'], ['长', '短'], ['高', '矮'],
  // 难度 2：4 个中频反义词（含感官与方位）
  ['快', '慢'], ['冷', '热'], ['里', '外'], ['黑', '白'],
  // 难度 3：3 个相对抽象的反义词
  ['胖', '瘦'], ['远', '近'], ['开', '关'],
];

export function makeOppositeQuestion(difficulty: Difficulty = 1): Question {
  // 难度梯度：1=前 5 对直观词 / 2=前 9 对中频词 / 3=全部 12 对含抽象词
  const endIdx = difficulty === 1 ? 5 : difficulty === 2 ? 9 : OPPOSITE_PAIRS.length;
  const pool = OPPOSITE_PAIRS.slice(0, endIdx);
  const [a, b] = sample(pool);
  // 干扰项从同档及以下抽取，避免低难度题出现没学过的词
  const wrongs = shuffle(pool.filter((p) => p[0] !== a && p[1] !== b).flat()).slice(0, 3);
  // 兜底：干扰项不足 3 个时从全集补
  // 缓存 flat() 到循环外，避免每次循环都重建 24 元素数组
  const allWords = OPPOSITE_PAIRS.flat();
  let guard = 0;
  while (wrongs.length < 3 && guard++ < 40) {
    const cand = sample(allWords);
    if (cand !== b && !wrongs.includes(cand)) wrongs.push(cand);
  }
  const opts = shuffle([b, ...wrongs]).map((w) => opt({ label: w }));
  const answerId = opts.find((o) => o.label === b)?.id ?? '';
  return {
    id: nextId('opp'),
    kind: 'pair',
    skill: 'pair:opposite',
    prompt: `「${a}」的反义词是哪个？`,
    display: a,
    speak: `${a} 的反义词是哪个呀？`,
    options: opts,
    answerId,
    hint: `「${a}」的反义词是「${b}」`,
    why: `和「${a}」意思相反的就是「${b}」`,
  };
}

/** 8-4 形近字辨析 */
const SIMILAR_GROUPS = [
  ['人', '入', '八'], ['木', '本', '禾'], ['大', '天', '夫'], ['刀', '力', '九'],
  ['田', '由', '甲'], ['日', '目', '白'], ['土', '士', '干'], ['己', '已', '乙'],
  ['王', '玉', '主'], ['千', '干', '于'], ['石', '右', '古'], ['去', '云', '丢'],
];

export function makeSimilarHanziQuestion(difficulty: Difficulty = 1): Question {
  const group = sample(SIMILAR_GROUPS);
  const target = sample(group);
  const sameGroupDistract = shuffle(group.filter((c) => c !== target));

  // 难度梯度：
  //   1 = 3 选 1（少干扰，同组 2 个相近字即可，最易区分）
  //   2 = 4 选 1（同组 3 个干扰，标准难度）
  //   3 = 4 选 1 但跨组补入干扰（字形更杂，相似度更低，考验分辨力）
  const distractCount = difficulty === 1 ? 2 : 3;
  const pool: string[] = sameGroupDistract.slice(0, distractCount);

  // 同组不足时跨组补
  let gi = 0;
  while (pool.length < distractCount) {
    const g = SIMILAR_GROUPS[gi++ % SIMILAR_GROUPS.length] ?? []
    const c = sample(g);
    if (c !== target && !pool.includes(c)) pool.push(c);
  }

  // 难度 3：跨组再补 1 个干扰字，让选项字形更杂（替换最不像的同组字）
  if (difficulty === 3) {
    let extra: string | null = null;
    let gi2 = 0;
    while (extra === null && gi2 < SIMILAR_GROUPS.length * 3) {
      const g = SIMILAR_GROUPS[gi2++ % SIMILAR_GROUPS.length] ?? []
      if (g === group) continue;
      const c = sample(g);
      if (c !== target && !pool.includes(c)) extra = c;
    }
    if (extra) {
      // 替换同组中"最不像"的（这里简化为替换最后一个），让干扰更杂
      pool[pool.length - 1] = extra;
    }
  }

  const opts = shuffle([target, ...pool]).map((c) => opt({ label: c }));
  const answerId = opts.find((o) => o.label === target)?.id ?? '';
  return {
    id: nextId('sim'),
    kind: 'similar',
    skill: `similar:${target}`,
    prompt: '请选出和上面一模一样的字',
    display: target,
    speak: `这个字读什么呀？下面哪个和它一模一样？`,
    options: opts,
    answerId,
    hint: `这个字是「${target}」`,
    why: `仔细看，「${target}」的字形是这样的，要找完全相同的`,
  };
}
