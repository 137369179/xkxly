/**
 * 英语句子题出题器：看英文选中文 / 听音选中文 / 缺词填空
 * ------------------------------------------------------------
 * skill key 与 SentencePage 的 learnSkill('sentence:s1') 保持一致，
 * 供每日课程 / 复习 / 错题本复用。
 */
import type { Question } from '@/types';
import { SENTENCES, type Sentence } from '@/data/sentences';
import { sample, sampleMany, shuffle } from '@/lib/utils';
import { type Difficulty, nextId, opt, distinct } from './_shared';

function resolveSentence(forceId?: string): Sentence {
  if (forceId) {
    const found = SENTENCES.find((s) => s.id === forceId);
    if (found) return found;
  }
  return sample(SENTENCES)!;
}

/** 看英文选中文（难度 1） */
function makeSentenceZhQuestion(forceId?: string): Question {
  const target = resolveSentence(forceId);
  const distractors = sampleMany(SENTENCES.filter((s) => s.zh !== target.zh), 3);
  const opts = shuffle([target, ...distractors]);
  const options = opts.map((s) => opt({ label: s.zh, emoji: s.emoji }));
  return {
    id: nextId('sentence-zh'),
    kind: 'sentence-zh',
    skill: `sentence:${target.id}`,
    prompt: `"${target.en}" 是什么意思？`,
    display: target.en,
    speak: target.en,
    options,
    answerId: options[opts.indexOf(target)]!.id,
    hint: target.words[0],
    why: `"${target.en}" 的意思是 "${target.zh}"`,
    difficulty: 1,
  };
}

/** 听音选中文（难度 2） */
function makeSentenceListenQuestion(forceId?: string): Question {
  const target = resolveSentence(forceId);
  const distractors = sampleMany(SENTENCES.filter((s) => s.zh !== target.zh), 3);
  const opts = shuffle([target, ...distractors]);
  const options = opts.map((s) => opt({ label: s.zh, emoji: s.emoji }));
  return {
    id: nextId('sentence-listen'),
    kind: 'sentence-listen',
    skill: `sentence:${target.id}`,
    prompt: '听一听，选出对应的中文',
    display: '🔊',
    speak: target.en,
    options,
    answerId: options[opts.indexOf(target)]!.id,
    hint: target.en.split(' ')[0],
    why: `你听到 "${target.en}"，意思是 "${target.zh}"`,
    difficulty: 2,
  };
}

/** 缺词填空（难度 3）：挖掉句中一个实词，选正确单词 */
function makeSentenceFillQuestion(forceId?: string): Question {
  const target = resolveSentence(forceId);
  const words = target.words;
  const idx = Math.floor(Math.random() * words.length);
  const blank = words[idx]!;
  const pool = distinct(SENTENCES.flatMap((s) => s.words.map((w) => w.toLowerCase())));
  const distractors = sampleMany(pool.filter((w) => w !== blank.toLowerCase()), 3);
  const options = shuffle([blank, ...distractors].map((w) => opt({ label: w })));
  const parts = target.en.split(/(\s+)/);
  const clean = (s: string) => s.replace(/[^a-zA-Z]/g, '').toLowerCase();
  const shown = parts.map((p) => {
    if (p.trim() && clean(p) === blank.toLowerCase()) return '______';
    return p;
  }).join('');
  return {
    id: nextId('sentence-fill'),
    kind: 'sentence-fill',
    skill: `sentence:${target.id}`,
    prompt: '选一个单词把句子补充完整',
    display: shown,
    speak: target.en,
    options,
    answerId: options.find((o) => o.label === blank)!.id,
    hint: `${blank} 的意思是 ${target.zh.match(/[^，。！？]+/)?.[0] ?? ''}`,
    why: `完整的句子是 "${target.en}"（${target.zh}）`,
    difficulty: 3,
  };
}

/** 句子题统一入口 */
export function makeSentenceQuestion(difficulty: Difficulty = 1, forceId?: string): Question | null {
  if (difficulty === 1) return makeSentenceZhQuestion(forceId);
  if (difficulty === 2) return makeSentenceListenQuestion(forceId);
  return makeSentenceFillQuestion(forceId);
}
