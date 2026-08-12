/**
 * 拼音题出题器：看拼音选顺口溜 / 看示例字选拼音 / 拼音类型识别
 * ------------------------------------------------------------
 */
import type { Question } from '@/types';
import { getAllPinyin, type PinyinEntry } from '@/data/pinyin';
import { sample, sampleMany, shuffle } from '@/lib/utils';
import { type Difficulty, nextId, opt } from './_shared';

/** 拼音查找：按 p 字段精确匹配 */
function findPinyin(all: PinyinEntry[], p: string): PinyinEntry | undefined {
  return all.find((item) => item.p === p);
}

/** 看拼音选顺口溜（难度 1） */
function makePinyinRhymeQuestion(target: PinyinEntry, pool: PinyinEntry[]): Question {
  const distractors = sampleMany(pool.filter((p) => p.p !== target.p), 3);
  const opts = shuffle([target, ...distractors]);
  const options = opts.map((p) => opt({ label: p.rhyme }));
  return {
    id: nextId('pinyin-rhyme'),
    kind: 'pinyin-rhyme',
    skill: `pinyin:${target.p}`,
    prompt: `"${target.p}" 的顺口溜是？`,
    display: target.p,
    speak: target.p,
    options,
    answerId: options[opts.indexOf(target)]!.id,
    hint: target.sound,
    why: `${target.p}：${target.rhyme}`,
  };
}

/** 看示例字选拼音（难度 2） */
function makePinyinCharQuestion(target: PinyinEntry, pool: PinyinEntry[]): Question {
  const char = sample(target.examples);
  const distractors = sampleMany(pool.filter((p) => p.p !== target.p), 3);
  const opts = shuffle([target, ...distractors]);
  const options = opts.map((p) => opt({ label: p.p }));
  return {
    id: nextId('pinyin-char'),
    kind: 'pinyin-char',
    skill: `pinyin:${target.p}`,
    prompt: `"${char}" 的拼音是？`,
    display: char,
    speak: char,
    options,
    answerId: options[opts.indexOf(target)]!.id,
    hint: target.sound,
    why: `${char} 的拼音是 "${target.p}"，${target.rhyme}`,
  };
}

/** 拼音类型识别（难度 3） */
function makePinyinTypeQuestion(target: PinyinEntry): Question {
  const typeLabel: Record<PinyinEntry['type'], string> = {
    shengmu: '声母',
    yunmu: '韵母',
    zhengti: '整体认读音节',
  };
  const allTypes = ['声母', '韵母', '整体认读音节'];
  const answer = typeLabel[target.type]!
  const distractors = shuffle(allTypes.filter((t) => t !== answer));
  const opts = shuffle([answer, ...distractors.slice(0, 2)]);
  const options = opts.map((t) => opt({ label: t }));
  return {
    id: nextId('pinyin-type'),
    kind: 'pinyin-type',
    skill: `pinyin:${target.p}`,
    prompt: `"${target.p}" 属于哪一类？`,
    display: target.p,
    speak: target.p,
    options,
    answerId: options[opts.indexOf(answer)]!.id,
    hint: target.sound,
    why: `${target.p} 是${answer}，${target.rhyme}`,
  };
}

/** 拼音题统一入口 */
export function makePinyinQuestion(difficulty: Difficulty = 1, forceP?: string): Question | null {
  // getAllPinyin() 内部 flatMap 重建数组，单题只调一次并复用
  const all = getAllPinyin();
  if (!all.length) return null;
  const target = forceP ? findPinyin(all, forceP) : undefined;
  const entry = target ?? sample(all);
  if (!entry) return null;
  const pool = all.filter((p) => p.type === entry.type);
  if (difficulty === 1) return makePinyinRhymeQuestion(entry, pool);
  if (difficulty === 2) return makePinyinCharQuestion(entry, pool);
  return makePinyinTypeQuestion(entry);
}
