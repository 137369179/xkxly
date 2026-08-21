// @vitest-environment node
/**
 * T-3.3 复习形态 · 纯逻辑单测
 * 覆盖：题型调度 / 拆字填空 / 语境判别 / 干扰项 / 客观判定。
 */
import { describe, it, expect } from 'vitest';
import { IDIOMS } from '@/data/idioms';
import {
  variantFor,
  pickDistractors,
  buildFillBlank,
  buildContextPick,
  objectiveAnswer,
} from './drill';

const shou = IDIOMS.find((i) => i.word === '守株待兔')!; // 守株待兔
const shui = IDIOMS.find((i) => i.word === '水滴石穿')!; // 水滴石穿

describe('variantFor 题型调度', () => {
  it('recall 模式恒为 recallWord（兼容既有行为）', () => {
    for (let i = 0; i < 8; i += 1) expect(variantFor(i, 8, 'recall')).toBe('recallWord');
  });

  it('mixed 模式轮回 5 种题型，且覆盖客观题', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10; i += 1) seen.add(variantFor(i, 10, 'mixed'));
    for (const v of ['recallWord', 'recallMeaning', 'picGuess', 'fillBlank', 'contextPick']) {
      expect(seen.has(v)).toBe(true);
    }
  });
});

describe('pickDistractors 干扰项', () => {
  it('返回指定数量、均非目标成语', () => {
    const ds = pickDistractors(shou, 3);
    expect(ds.length).toBe(3);
    for (const d of ds) expect(d.id).not.toBe(shou.id);
  });
});

describe('buildFillBlank 拆字填空', () => {
  it('正确字入选「对」且被藏在 missingIndex；干扰字来自其它成语同位', () => {
    const ds = pickDistractors(shou, 3);
    const card = buildFillBlank(shou, ds, 2);
    expect(card).not.toBeNull();
    const chars = Array.from(shou.word);
    expect(card!.correct).toBe(chars[2]);
    expect(card!.chars).toContain(chars[2]);
    expect(card!.chars.length).toBeGreaterThanOrEqual(2);
    // 选项唯一
    expect(new Set(card!.chars).size).toBe(card!.chars.length);
  });

  it('objectiveAnswer：填对/填错判定', () => {
    const ds = pickDistractors(shui, 3);
    const card = buildFillBlank(shui, ds, 0)!;
    expect(objectiveAnswer('fillBlank', card.correct, { correct: card.correct })).toBe(true);
    const wrong = card.chars.find((c) => c !== card.correct)!;
    expect(objectiveAnswer('fillBlank', wrong, { correct: card.correct })).toBe(false);
  });
});

describe('buildContextPick 语境判别', () => {
  it('例句为题干，正确成语在选项中', () => {
    const card = buildContextPick(shou, pickDistractors(shou, 3));
    expect(card.sentence).toBe(shou.example);
    expect(card.options.some((o) => o.id === card.answerId)).toBe(true);
    expect(card.options.length).toBe(4);
  });

  it('objectiveAnswer：选中正确/干扰判定', () => {
    const ds = pickDistractors(shui, 3);
    const card = buildContextPick(shui, ds);
    expect(objectiveAnswer('contextPick', card.answerId, card)).toBe(true);
    const wrongId = card.options.find((o) => o.id !== card.answerId)!.id;
    expect(objectiveAnswer('contextPick', wrongId, card)).toBe(false);
  });
});