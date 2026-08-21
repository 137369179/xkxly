/**
 * praise 分场景语库测试（R47 游戏化扩展 · 英语场景语料）
 * ------------------------------------------------------------
 * 覆盖：
 *  - word / letter 新场景语料非空且内容贴合（含关键词）
 *  - skillToPraiseScene 映射：word:xxx → 'word'、letter:A / letter-order → 'letter'
 *  - 既有场景（hanzi/pinyin/math）回归不破坏
 */
import { describe, it, expect } from 'vitest';
import { praiseByScene, encourageByScene, skillToPraiseScene, skillToEncourageScene } from './praise';

describe('praise 分场景语料', () => {
  it('word 表扬语非空且贴合单词语境', () => {
    const text = praiseByScene('word');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/单词|拼|发音|读/);
  });

  it('letter 表扬语非空且贴合字母语境', () => {
    const text = praiseByScene('letter');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/字母|读|顺序|写/);
  });

  it('word 鼓励语非空且贴合单词语境', () => {
    const text = encourageByScene('word');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/发音|拼|单词|读/);
  });

  it('letter 鼓励语非空且贴合字母语境', () => {
    const text = encourageByScene('letter');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/字母|顺序|读/);
  });

  it('既有场景回归：hanzi/math 语料仍非空', () => {
    expect(praiseByScene('hanzi').length).toBeGreaterThan(0);
    expect(praiseByScene('math').length).toBeGreaterThan(0);
    expect(encourageByScene('hanzi').length).toBeGreaterThan(0);
  });

  it('idiom 表扬/鼓励语非空且贴合成语语境', () => {
    const p = praiseByScene('idiom');
    expect(p.length).toBeGreaterThan(0);
    expect(p).toMatch(/成语|接龙|字/);
    const e = encourageByScene('idiom');
    expect(e.length).toBeGreaterThan(0);
    expect(e).toMatch(/成语|字/);
  });
});

describe('skill → 场景映射', () => {
  it('word:cat → word', () => {
    expect(skillToPraiseScene('word:cat')).toBe('word');
    expect(skillToEncourageScene('word:cat')).toBe('word');
  });

  it('letter:A → letter', () => {
    expect(skillToPraiseScene('letter:A')).toBe('letter');
    expect(skillToPraiseScene('letter-order')).toBe('letter');
  });

  it('hanzi/pinyin/math 映射不变', () => {
    expect(skillToPraiseScene('hanzi:山')).toBe('hanzi');
    expect(skillToPraiseScene('pinyin:a')).toBe('pinyin');
    expect(skillToPraiseScene('math:add')).toBe('math');
  });

  it('idiom:xxx → idiom', () => {
    expect(skillToPraiseScene('idiom:chain')).toBe('idiom');
    expect(skillToPraiseScene('idiom-chain')).toBe('idiom');
    expect(skillToEncourageScene('idiom:chain')).toBe('idiom');
  });

  it('未知 skill → general', () => {
    expect(skillToPraiseScene('unknown:x')).toBe('general');
    expect(skillToPraiseScene(undefined)).toBe('general');
  });
});
