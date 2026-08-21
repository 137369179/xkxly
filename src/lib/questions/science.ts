/**
 * 科学小考官 · 题目生成器（R54 游戏化）
 * ------------------------------------------------------------
 * 基于既有 science 数据源（恐龙/动物/行星）自动生成知识问答，
 * 供各实验室「小考官」闯关环节使用（RoundRunner + 3 连对 StreakBar）。
 * 渐进难度：L1 认物（名称辨认）→ L2 特征（食性/分类）→ L3 推理（比较/多条件）。
 */
import type { Question, QuizOption } from '@/types';
import { DINOSAURS } from '@/data/dinosaurs';
import { ANIMALS } from '@/data/animals';
import { PLANETS } from '@/data/space';
import { shuffle } from '@/lib/utils';

export type ScienceCategory = 'dino' | 'animal' | 'space';

export type ScienceDifficulty = 1 | 2 | 3;

interface NamedEntity {
  id: string;
  nameZh: string;
  nameEn: string;
  emoji: string;
}

let qSeq = 0;
function genId(): string {
  qSeq += 1;
  return `sci-${Date.now().toString(36)}-${qSeq}`;
}

/** 从数据源挑 N 个干扰项（排除正确答案） */
function distractors<T extends NamedEntity>(pool: T[], correctId: string, n: number): T[] {
  const rest = pool.filter((x) => x.id !== correctId);
  return shuffle(rest).slice(0, n);
}

function toOptions(items: NamedEntity[]): QuizOption[] {
  return items.map((x) => ({ id: x.id, label: x.nameZh, emoji: x.emoji }));
}

/** L1 认物：看 emoji/描述选出对应名称 */
function makeRecognize<T extends NamedEntity>(pool: T[], skill: string, prompt: (t: T) => string): Question {
  const target = pool[Math.floor(Math.random() * pool.length)]!;
  const opts = shuffle([target, ...distractors(pool, target.id, 3)]);
  return {
    id: genId(),
    kind: 'science-recognize',
    skill,
    prompt: prompt(target),
    display: target.emoji,
    options: toOptions(opts),
    answerId: target.id,
    hint: target.nameEn,
    why: `正确答案是「${target.nameZh}」(${target.nameEn})。`,
  };
}

/** 二分特征题：从 N 个候选中选出具有某特征的项（保证恰好 4 选项） */
function makeFeature<T extends NamedEntity>(
  pool: T[],
  skill: string,
  pickKey: (t: T) => string | undefined,
  questionText: (feature: string) => string,
  featureLabel: (t: T) => string,
): Question {
  // 先找一个有特征的项（保证至少 2 个同特征可构成选项）
  const withFeature = pool.filter((x) => pickKey(x));
  if (withFeature.length < 2) return makeRecognize(pool, skill, (t) => `这是哪个？${t.emoji}`);
  const target = withFeature[Math.floor(Math.random() * withFeature.length)]!;
  const feature = featureLabel(target);
  const sameFeature = withFeature.filter((x) => x.id !== target.id);
  const others = pool.filter((x) => !withFeature.includes(x));
  // 组合候选：1 正 + 1 同特征 + 2 异特征（不足则用 pool 兜底补足）
  const candidates = shuffle([
    target,
    ...shuffle(sameFeature).slice(0, 1),
    ...shuffle(others).slice(0, 2),
  ]);
  const need = 4 - candidates.length;
  if (need > 0) {
    const rest = pool.filter((x) => !candidates.includes(x));
    candidates.push(...shuffle(rest).slice(0, need));
  }
  const opts = shuffle(candidates);
  return {
    id: genId(),
    kind: 'science-feature',
    skill,
    prompt: questionText(feature),
    display: feature,
    options: toOptions(opts),
    answerId: target.id,
    hint: target.nameEn,
    why: `${feature}的是「${target.nameZh}」(${target.nameEn})。`,
  };
}

/** 生成一道科学题（按类别 + 难度） */
export function makeScienceQuestion(category: ScienceCategory, difficulty: ScienceDifficulty = 1): Question {
  if (category === 'dino') {
    if (difficulty === 1) {
      return makeRecognize(DINOSAURS, 'science:dino', (t) => `这是哪种恐龙？${t.emoji}`);
    }
    if (difficulty === 2) {
      return makeFeature(
        DINOSAURS,
        'science:dino',
        (t) => t.diet,
        (f) => `哪种恐龙是${f}动物？`,
        (t) => t.diet,
      );
    }
    // L3 推理：最高恐龙
    const tallest = [...DINOSAURS].sort((a, b) => b.height - a.height)[0]!;
    const opts = shuffle([tallest, ...distractors(DINOSAURS, tallest.id, 3)]);
    return {
      id: genId(),
      kind: 'science-reason',
      skill: 'science:dino',
      prompt: `谁是最高的恐龙？`,
      display: '🏆',
      options: toOptions(opts),
      answerId: tallest.id,
      hint: '它的脖子特别长，能吃到树顶的叶子',
      why: `「${tallest.nameZh}」是已知最高的恐龙之一（${tallest.height}米），脖子特别长。`,
    };
  }

  if (category === 'animal') {
    if (difficulty === 1) {
      return makeRecognize(ANIMALS, 'science:animal', (t) => `这是哪种动物？${t.emoji}`);
    }
    if (difficulty === 2) {
      return makeFeature(
        ANIMALS,
        'science:animal',
        (t) => t.diet,
        (f) => `哪种动物是${f}动物？`,
        (t) => t.diet,
      );
    }
    // L3：按体型最大
    const biggest = [...ANIMALS].sort((a, b) => (b.sizeLevel ?? 0) - (a.sizeLevel ?? 0))[0]!;
    const opts = shuffle([biggest, ...distractors(ANIMALS, biggest.id, 3)]);
    return {
      id: genId(),
      kind: 'science-reason',
      skill: 'science:animal',
      prompt: `谁是陆地上最大的动物？`,
      display: '🐘',
      options: toOptions(opts),
      answerId: biggest.id,
      hint: '它有大耳朵和长鼻子',
      why: `「${biggest.nameZh}」是陆地上体型最大的动物。`,
    };
  }

  // space（PlanetItem 扩展了 NamedEntity 的字段，此处按需取用）
  const planets = PLANETS.filter((p) => p.bodyType !== 'star') as (NamedEntity & { moons: number; order: number })[];
  if (difficulty === 1) {
    return makeRecognize(planets, 'science:space', (t) => `这是哪个星球？${t.emoji}`);
  }
  if (difficulty === 2) {
    return makeFeature(
      planets,
      'science:space',
      (t) => (t.moons > 0 ? '有卫星' : undefined),
      (f) => `哪个行星${f}？`,
      () => '有卫星',
    );
  }
  // L3：按距离排序
  const nearest = [...planets].sort((a, b) => a.order - b.order)[0]!;
  const opts = shuffle([nearest, ...distractors(planets, nearest.id, 3)]);
  return {
    id: genId(),
    kind: 'science-reason',
    skill: 'science:space',
    prompt: `离太阳最近的行星是哪个？`,
    display: '☀️',
    options: toOptions(opts),
    answerId: nearest.id,
    hint: '它离太阳最近，非常热',
    why: `「${nearest.nameZh}」是离太阳最近的行星。`,
  };
}
