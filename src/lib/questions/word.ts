/**
 * 英语单词题出题器：看图选词 / 看英文选中文 / 看中文选英文
 * ------------------------------------------------------------
 */
import type { Question } from '@/types';
import { getAllWords, type WordEntry } from '@/data/wordIndex';
import { sample, sampleMany, shuffle } from '@/lib/utils';
import { type Difficulty, nextId, opt } from './_shared';

/** 看图选英文单词（难度 1） */
function makeWordEmojiQuestion(target: WordEntry, pool: WordEntry[]): Question {
  const distractors = sampleMany(pool.filter((w) => w.word !== target.word), 3);
  const opts = shuffle([target, ...distractors]);
  const options = opts.map((w) => opt({ label: `${w.emoji} ${w.word}` }));
  return {
    id: nextId('word-emoji'),
    kind: 'word-emoji',
    skill: `word:${target.word}`,
    prompt: '这个图片的英文是？',
    display: target.emoji,
    speak: target.word,
    options,
    answerId: options[opts.indexOf(target)]!.id,
    hint: target.phonics,
    why: `${target.emoji} 的英文是 "${target.word}"，中文是"${target.zh}"`,
  };
}

/** 看英文选中文（难度 2） */
function makeWordZhQuestion(target: WordEntry, pool: WordEntry[]): Question {
  const distractors = sampleMany(pool.filter((w) => w.word !== target.word), 3);
  const opts = shuffle([target, ...distractors]);
  const options = opts.map((w) => opt({ label: w.zh }));
  return {
    id: nextId('word-zh'),
    kind: 'word-zh',
    skill: `word:${target.word}`,
    prompt: `"${target.word}" 是什么意思？`,
    display: target.word,
    speak: target.word,
    options,
    answerId: options[opts.indexOf(target)]!.id,
    hint: target.phonics,
    why: `"${target.word}" 的意思是"${target.zh}"，${target.sentenceZh}`,
  };
}

/** 看中文选英文（难度 3） */
function makeWordEnQuestion(target: WordEntry, pool: WordEntry[]): Question {
  const distractors = sampleMany(pool.filter((w) => w.word !== target.word), 3);
  const opts = shuffle([target, ...distractors]);
  const options = opts.map((w) => opt({ label: w.word }));
  return {
    id: nextId('word-en'),
    kind: 'word-en',
    skill: `word:${target.word}`,
    prompt: `"${target.zh}" 的英文是？`,
    display: target.zh,
    speak: target.zh,
    options,
    answerId: options[opts.indexOf(target)]!.id,
    hint: `首字母是 ${target.word[0]!.toUpperCase()}`,
    why: `"${target.zh}" 的英文是 "${target.word}"，${target.sentence}`,
  };
}

/** 英语单词题统一入口 */
export function makeWordQuestion(difficulty: Difficulty = 1, forceWord?: string): Question | null {
  // getAllWords() 内部 flatMap 重建数组，单题只调一次并复用
  const all = getAllWords();
  if (!all.length) return null;
  let entry: WordEntry | undefined;
  if (forceWord) {
    const lower = forceWord.toLowerCase().trim();
    entry = all.find((w) => w.word.toLowerCase() === lower);
  }
  entry = entry ?? sample(all);
  if (!entry) return null;
  const pool = all.filter((w) => w.level === entry!.level);
  if (difficulty === 1) return makeWordEmojiQuestion(entry, pool);
  if (difficulty === 2) return makeWordZhQuestion(entry, pool);
  return makeWordEnQuestion(entry, pool);
}
