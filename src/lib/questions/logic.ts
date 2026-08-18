/**
 * 逻辑题出题器：找规律 / 图形配对 / 排序
 * ------------------------------------------------------------
 */
import type { Question } from '@/types';
import { makeNumberOptions, randInt, sample, sampleMany, shuffle } from '@/lib/utils';
import { ALL_POOLS, type Difficulty, nextId, opt } from './_shared';

export type LogicKind = 'pattern' | 'match' | 'order';

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
  const k = kind === 'mixed' ? sample(['pattern', 'match', 'order'] as const) : kind;
  if (k === 'pattern') return makePatternQuestion(difficulty);
  if (k === 'match') return makeMatchQuestion(difficulty);
  return makeOrderQuestion(difficulty);
}
