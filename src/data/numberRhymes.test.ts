// @vitest-environment node
/**
 * 数字离线童谣数据完整性校验
 */
import { describe, it, expect } from 'vitest';
import { numberRhyme, RHYME_NUMBERS } from './numberRhymes';

describe('numberRhymes 离线童谣数据', () => {
  it('覆盖数字 0-9', () => {
    expect([...RHYME_NUMBERS].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('每条童谣非空且包含对应中文数字', () => {
    const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    for (const n of RHYME_NUMBERS) {
      const rhyme = numberRhyme(n);
      expect(rhyme.trim().length).toBeGreaterThan(5);
      expect(rhyme.includes(CN[n]!)).toBe(true);
    }
  });

  it('超出 0-9 的数字返回兜底童谣（始终有内容）', () => {
    for (const n of [10, 100, 999]) {
      expect(numberRhyme(n).trim().length).toBeGreaterThan(5);
    }
  });
});