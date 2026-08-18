/**
 * 英语单词题出题器：看图选词 / 看英文选中文 / 看中文选英文
 * ------------------------------------------------------------
 */
import type { Question } from '@/types';
import { getAllWords, type WordEntry } from '@/data/wordIndex';
import { getFamiliesOfWord } from '@/data/wordFamilies';
import { sample, sampleMany, shuffle } from '@/lib/utils';
import { type Difficulty, nextId, opt } from './_shared';

/** 掌握度映射（skill key → lv），供 SRS 弱词优先抽词 */
export type MasteryMap = Record<string, { lv: number }>;

/** 抽目标词：mastery 存在时优先抽未掌握/薄弱词（lv<2），全掌握则随机 */
function pickTarget(all: WordEntry[], mastery?: MasteryMap): WordEntry {
  if (mastery) {
    const weak = all.filter((w) => !mastery[`word:${w.word}`] || (mastery[`word:${w.word}`]?.lv ?? 0) < 2);
    if (weak.length > 0) {
      const sorted = [...weak].sort(
        (a, b) => (mastery[`word:${a.word}`]?.lv ?? 0) - (mastery[`word:${b.word}`]?.lv ?? 0),
      );
      const head = sorted.slice(0, Math.max(5, Math.ceil(sorted.length * 0.3)));
      return sample(head);
    }
  }
  return sample(all);
}

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
    answerId: options[opts.indexOf(target)]?.id ?? '',
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
    answerId: options[opts.indexOf(target)]?.id ?? '',
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
    answerId: options[opts.indexOf(target)]?.id ?? '',
    hint: `首字母是 ${target.word[0]?.toUpperCase() ?? ''}`,
    why: `"${target.zh}" 的英文是 "${target.word}"，${target.sentence}`,
  };
}

/** 取目标词：forceWord 优先，否则按掌握度（SRS 弱词优先），再随机 */
function resolveTarget(all: WordEntry[], forceWord?: string, mastery?: MasteryMap): WordEntry | undefined {
  if (forceWord) {
    const lower = forceWord.toLowerCase().trim();
    const found = all.find((w) => w.word.toLowerCase() === lower);
    if (found) return found;
  }
  return pickTarget(all, mastery);
}

/** 英语单词题统一入口（保留原 3 档题型契约，新增 mastery 弱词优先） */
export function makeWordQuestion(difficulty: Difficulty = 1, forceWord?: string, mastery?: MasteryMap): Question | null {
  // getAllWords() 内部 flatMap 重建数组，单题只调一次并复用
  const all = getAllWords();
  if (!all.length) return null;
  const entry = resolveTarget(all, forceWord, mastery);
  if (!entry) return null;
  const pool = all.filter((w) => w.level === entry.level);
  if (difficulty === 1) return makeWordEmojiQuestion(entry, pool);
  if (difficulty === 2) return makeWordZhQuestion(entry, pool);
  return makeWordEnQuestion(entry, pool);
}

/** 听音选词（难度 2+ 题型）：播放读音，选对应单词 */
export function makeWordListenQuestion(forceWord?: string): Question | null {
  const all = getAllWords();
  if (!all.length) return null;
  const target = resolveTarget(all, forceWord) ?? sample(all);
  const distractors = sampleMany(all.filter((w) => w.word !== target.word), 3);
  const opts = shuffle([target, ...distractors]);
  const options = opts.map((w) => opt({ label: w.word, emoji: w.emoji }));
  return {
    id: nextId('word-listen'),
    kind: 'word-listen',
    skill: `word:${target.word}`,
    prompt: '听一听，选出你听到的单词',
    display: '🔊',
    speak: target.word,
    options,
    answerId: options[opts.indexOf(target)]?.id ?? '',
    hint: target.zh,
    why: `你听到的是 "${target.word}"（${target.zh}），${target.sentenceZh}`,
    difficulty: 2,
  };
}

/** 拼写选择题（难度 3 题型）：看图选正确拼写，干扰项为同长近似词 */
export function makeWordSpellQuestion(forceWord?: string): Question | null {
  const all = getAllWords();
  if (!all.length) return null;
  const target = resolveTarget(all, forceWord) ?? sample(all);
  const sameLen = all.filter((w) => w.word !== target.word && w.word.length === target.word.length);
  const distractors = sampleMany(sameLen.length >= 3 ? sameLen : all.filter((w) => w.word !== target.word), 3);
  const opts = shuffle([target, ...distractors]);
  const options = opts.map((w) => opt({ label: w.word }));
  return {
    id: nextId('word-spell'),
    kind: 'word-spell',
    skill: `word:${target.word}`,
    prompt: `"${target.zh}" 的英文拼写是？`,
    display: target.emoji,
    options,
    answerId: options[opts.indexOf(target)]?.id ?? '',
    hint: target.phonics,
    why: `"${target.zh}" 的拼写是 "${target.word}"，${target.sentence}`,
    difficulty: 3,
  };
}

/** 词族迁移题（难度 3 题型）：同一词族能拼出哪个词（考拼读迁移） */
export function makeWordFamilyQuestion(forceWord?: string): Question | null {
  const all = getAllWords();
  if (!all.length) return null;
  const target = resolveTarget(all, forceWord) ?? sample(all);
  const fam = getFamiliesOfWord(target.word)[0];
  // 同族成员（必须存在于词库，才有 emoji/例句数据）
  const siblings = fam
    ? fam.words.filter((w) => w !== target.word && all.some((a) => a.word === w))
    : [];
  if (!fam || siblings.length === 0) {
    // 回退到看中文选英文题
    const pool = all.filter((w) => w.level === target.level);
    return makeWordEnQuestion(target, pool);
  }
  const answerWord = sample(siblings) ?? siblings[0] ?? '';
  const answer = all.find((w) => w.word === answerWord);
  if (!answer) {
    // 防御：siblings 已按「词库中存在」过滤，正常情况下必能找到
    const pool = all.filter((w) => w.level === target.level);
    return makeWordEnQuestion(target, pool);
  }
  const others = all.filter((w) => w.word !== target.word && w.word !== answer.word && !fam.words.includes(w.word));
  const distractors = sampleMany(others, 3);
  const opts = shuffle([answer, ...distractors]);
  const options = opts.map((w) => opt({ label: w.word, emoji: w.emoji }));
  return {
    id: nextId('word-family'),
    kind: 'word-family',
    skill: `word:${target.word}`,
    prompt: `"${target.word}" 和哪个单词是同一个词族（-${fam.id}）？`,
    display: `${target.word} ${target.emoji}`,
    options,
    answerId: options[opts.findIndex((w) => w.word === answer.word)]?.id ?? '',
    hint: `都押 ${fam.sound} 的音，试着读一读`,
    why: `${answer.word} 和 ${target.word} 都在 -${fam.id} 家族，都发 ${fam.sound} 的音`,
    difficulty: 3,
  };
}
