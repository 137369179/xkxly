// @vitest-environment node
/**
 * 数字趣闻数据完整性校验
 */
import { describe, it, expect } from 'vitest';
import { numberFact, FACT_NUMBERS } from './numberFacts';

describe('numberFacts 数字趣闻数据', () => {
  it('覆盖数字 0-9', () => {
    expect([...FACT_NUMBERS].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('每条趣闻非空且与数字相关', () => {
    for (const n of FACT_NUMBERS) {
      const fact = numberFact(n);
      expect(fact.trim().length).toBeGreaterThan(5);
      expect(String(fact).includes(n.toString())).toBe(true);
    }
  });

  it('超出 0-9 的数字返回兜底文案（始终有内容）', () => {
    for (const n of [10, 20, 100]) {
      expect(numberFact(n).trim().length).toBeGreaterThan(5);
    }
  });
});