/**
 * 古诗题出题器：选下句 / 选题目 / 填字
 * ------------------------------------------------------------
 */
import type { Question } from '@/types';
import type { PoemIndex } from '@/data/poemsIndex';
import { randInt, sample, sampleMany, shuffle } from '@/lib/utils';
import { type Difficulty, nextId, opt } from './_shared';

/** 6. 古诗题（闯关用） */
export function makePoemQuestion(
  poems: PoemIndex[],
  difficulty: Difficulty = 1,
  forceId?: string,
): Question | null {
  if (poems.length < 4) return null;
  const pool = poems.filter((p) => p.lines.length >= 2 && p.level <= difficulty + 1);
  const usable = pool.length >= 4 ? pool : poems;
  const target = (forceId ? poems.find((p) => p.id === forceId) : undefined) ?? sample(usable);

  let mode = Math.random() < 0.45 ? 'nextLine' : Math.random() < 0.5 ? 'title' : 'fill';
  if (mode === 'fill') {
    const f = makePoemFillQuestion(poems, difficulty, target.id);
    if (f) return f;
    mode = 'nextLine';
  }

  if (mode === 'nextLine' && target.lines.length >= 2) {
    // 给上句，选下句
    const i = randInt(0, target.lines.length - 2);
    const cur = target.lines[i]!;
    const answer = target.lines[i + 1]!;

    // 干扰句去重 + 过滤掉答案本身，避免选项重复导致实际只有 2-3 个选项
    const otherLines = [...new Set(
      usable.filter((p) => p.id !== target.id).flatMap((p) => p.lines),
    )].filter((l) => l !== answer);
    const others = sampleMany(otherLines, Math.min(3, otherLines.length));
    const all = shuffle([answer, ...others]);
    const options = all.map((s) => opt({ label: s!.replace(/[，。？！]$/, '') }));
    const answerId = options[all.indexOf(answer)]!.id;

    return {
      id: nextId('poem'),
      kind: 'poem',
      prompt: '下一句是什么呀？',
      display: cur.replace(/[，。？！]$/, ''),
      speak: cur,
      options,
      answerId,
      hint: `出自${target.dynasty}·${target.author}《${target.title}》`,
      skill: `poem:${target.id}`,
      why: `《${target.title}》里这两句是连着的：「${cur.replace(/[，。？！]$/, '')}」后面跟着「${answer.replace(/[，。？！]$/, '')}」，多读两遍就记住啦`,
    };
  }

  // 给诗句，选题目
  const line = sample(target.lines);
  const others = sampleMany(
    usable.filter((p) => p.id !== target.id).map((p) => p.title),
    3,
  );
  const all = shuffle([target.title, ...others]);
  const options = all.map((s) => opt({ label: s }));
  const answerId = options[all.indexOf(target.title)]!.id;

  return {
    id: nextId('poem'),
    kind: 'poem',
    prompt: '这句诗出自哪首古诗？',
    display: line.replace(/[，。？！]$/, ''),
    speak: line,
    options,
    answerId,
    hint: `${target.dynasty}·${target.author}《${target.title}》`,
    skill: `poem:${target.id}`,
    why: `这句「${line.replace(/[，。？！]$/, '')}」是${target.dynasty}诗人${target.author}写的《${target.title}》里的句子`,
  };
}

/** 8-5 古诗填字（复用 poem 知识点，强化同一首诗） */
export function makePoemFillQuestion(
  poems: PoemIndex[],
  difficulty: Difficulty = 1,
  forceId?: string,
): Question | null {
  if (poems.length < 4) return null;
  const pool = poems.filter((p) => p.lines.length >= 2 && p.level <= difficulty + 1);
  const usable = pool.length >= 4 ? pool : poems;
  const target = (forceId ? usable.find((p) => p.id === forceId) : undefined) ?? sample(usable);
  const cand = target.lines
    .map((l) => l.replace(/[，。？！]$/, ''))
    .filter((l) => l.length >= 4 && /[一-龥]/.test(l));
  if (!cand.length) return null;
  const line = sample(cand);
  const chars = [...line];
  const idx = randInt(0, chars.length - 1);
  const blank = chars[idx]!
  const shown = chars.map((c, i) => (i === idx ? '＿' : c)).join('');
  // 优化：先用 Set 去重（避免 distinct 后不足 3 个），再用随机索引抽取 3 个
  // （不全量 shuffle 数千字符池，O(k) 替代 O(n)）
  const charPool = [
    ...new Set(
      usable.flatMap((p) => p.lines.join('').split('')).filter((c) => c !== blank && /[一-龥]/.test(c)),
    ),
  ];
  const distract: string[] = [];
  const usedIdx = new Set<number>();
  let dGuard = 0;
  while (distract.length < Math.min(3, charPool.length) && dGuard++ < 30) {
    const i = randInt(0, charPool.length - 1);
    if (!usedIdx.has(i)) {
      usedIdx.add(i);
      distract.push(charPool[i]!);
    }
  }
  const opts = shuffle([blank, ...distract]).map((c) => opt({ label: c }));
  const answerId = opts.find((o) => o.label === blank)!.id;
  return {
    id: nextId('poemfill'),
    kind: 'poem',
    skill: `poem:${target.id}`,
    prompt: '这句诗缺了哪个字？',
    display: shown,
    speak: line,
    options: opts,
    answerId,
    hint: `出自《${target.title}》`,
    why: `《${target.title}》里这句是「${line}」`,
  };
}
