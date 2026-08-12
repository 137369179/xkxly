/**
 * 字母题出题器：大小写配对 / 看图选首字母
 * ------------------------------------------------------------
 */
import type { Question } from '@/types';
import { LETTERS } from '@/data/letters';
import { sample, sampleMany, shuffle } from '@/lib/utils';
import { type Difficulty, nextId, opt } from './_shared';

export function makeLetterQuestion(difficulty: Difficulty = 1, forceLetter?: string): Question {
  const forced = forceLetter
    ? LETTERS.find((l) => l.upper === forceLetter.toUpperCase())
    : undefined;
  const target = forced ?? sample(LETTERS);
  const distractors = sampleMany(
    LETTERS.filter((l) => l.upper !== target.upper),
    3,
  );
  const mode = difficulty >= 2 && Math.random() < 0.45 ? 'word' : 'case';

  if (mode === 'word') {
    // 看图选首字母
    const all = shuffle([target, ...distractors]);
    const options = all.map((l) => opt({ label: l.upper }));
    const answerId = options[all.findIndex((l) => l.upper === target.upper)]!.id;
    return {
      id: nextId('letter'),
      kind: 'letter',
      prompt: `${target.zh} 的英文是 ${target.word}，它的首字母是哪个？`,
      display: target.emoji,
      speak: target.word,
      speakLang: 'en-US',
      options,
      answerId,
      hint: `${target.word} 以字母 ${target.upper} 开头`,
      skill: `letter:${target.upper}`,
      why: `${target.word}（${target.zh}）读的时候，第一个音就是 ${target.upper} 发出来的`,
    };
  }

  // 大小写配对
  const upperFirst = Math.random() < 0.5;
  const all = shuffle([target, ...distractors]);
  const options = all.map((l) => opt({ label: upperFirst ? l.lower : l.upper }));
  const answerId = options[all.findIndex((l) => l.upper === target.upper)]!.id;

  return {
    id: nextId('letter'),
    kind: 'letter',
    prompt: upperFirst ? '它的小写是哪个？' : '它的大写是哪个？',
    display: upperFirst ? target.upper : target.lower,
    speak: target.upper,
    speakLang: 'en-US',
    options,
    answerId,
    hint: `${target.upper} 的小写是 ${target.lower}`,
    skill: `letter:${target.upper}`,
    why: `${target.upper} 和 ${target.lower} 是同一个字母的大小写，就像大人和小孩，长得像但不一样大`,
  };
}
