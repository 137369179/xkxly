// @vitest-environment node
/**
 * 数字离线童谣数据 · 详细单元测试
 * 覆盖：覆盖范围 / 文案质量 / 唯一性 / 落点约束 / 兜底稳定性
 */
import { describe, it, expect } from 'vitest';
import { numberRhyme, RHYME_NUMBERS } from './numberRhymes';

const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

describe('numberRhymes 覆盖范围', () => {
  it('恰好覆盖 0-9 且无遗漏', () => {
    expect([...RHYME_NUMBERS].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('每个 key 都是唯一的非负整数', () => {
    expect(new Set(RHYME_NUMBERS).size).toBe(RHYME_NUMBERS.length);
    for (const n of RHYME_NUMBERS) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('numberRhymes 文案质量', () => {
  it('每条童谣非空、包含对应中文数字，且以句号结尾', () => {
    for (const n of RHYME_NUMBERS) {
      const rhyme = numberRhyme(n);
      expect(rhyme.length).toBeGreaterThan(8);
      expect(rhyme.includes(CN[n]!)).toBe(true);
      expect(rhyme.endsWith('。')).toBe(true);
    }
  });

  it('所有童谣互不重复（避免多个数字共用同一文案）', () => {
    const rhymes = RHYME_NUMBERS.map((n) => numberRhyme(n));
    expect(new Set(rhymes).size).toBe(rhymes.length);
  });

  it('字数落在合理区间内（太长或太短都可能是数据错误）', () => {
    for (const n of RHYME_NUMBERS) {
      const rhyme = numberRhyme(n);
      expect(rhyme.length).toBeGreaterThanOrEqual(12);
      expect(rhyme.length).toBeLessThanOrEqual(50);
    }
  });
});

describe('numberRhymes 兜底稳定性', () => {
  it('0-9 之外的所有数字返回同一兜底童谣', () => {
    const a = numberRhyme(10);
    const b = numberRhyme(100);
    const c = numberRhyme(999);
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(a.length).toBeGreaterThan(8);
    expect(a.endsWith('。')).toBe(true);
  });

  it('非正整数（负数/小数）也安全返回兜底，不抛错', () => {
    expect(() => numberRhyme(-1)).not.toThrow();
    expect(() => numberRhyme(3.14)).not.toThrow();
    expect(numberRhyme(-1)).toBe(numberRhyme(100));
  });
});