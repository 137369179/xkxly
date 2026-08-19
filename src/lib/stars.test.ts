import { describe, it, expect } from 'vitest';
import { starsByRate, starsByCorrect, starsByMistakes } from './stars';

describe('starsByRate', () => {
  it('按正确率分档 3/2/1', () => {
    expect(starsByRate(1)).toBe(3);
    expect(starsByRate(0.9)).toBe(3);
    expect(starsByRate(0.8)).toBe(2);
    expect(starsByRate(0.7)).toBe(2);
    expect(starsByRate(0.5)).toBe(1);
    expect(starsByRate(0)).toBe(1);
  });
  it('支持自定义阈值', () => {
    expect(starsByRate(0.8, { topRate: 0.95, midRate: 0.6 })).toBe(2);
    expect(starsByRate(0.96, { topRate: 0.95, midRate: 0.6 })).toBe(3);
  });
});

describe('starsByCorrect', () => {
  it('默认按 topRate', () => {
    expect(starsByCorrect(9, 10)).toBe(3);
    expect(starsByCorrect(8, 10)).toBe(2);
    expect(starsByCorrect(5, 10)).toBe(1);
  });
  it('perfectOnly3 时全对才 3 星', () => {
    expect(starsByCorrect(10, 10, { perfectOnly3: true })).toBe(3);
    expect(starsByCorrect(9, 10, { perfectOnly3: true })).toBe(2);
    expect(starsByCorrect(5, 10, { perfectOnly3: true })).toBe(1);
  });
  it('total 非法时给 1 星', () => {
    expect(starsByCorrect(3, 0)).toBe(1);
  });
});

describe('starsByMistakes', () => {
  it('0 错满分，错误容忍度随总数放宽', () => {
    expect(starsByMistakes(0, 6)).toBe(3);
    expect(starsByMistakes(1, 6)).toBe(2); // ceil(6/3)=2
    expect(starsByMistakes(2, 6)).toBe(2);
    expect(starsByMistakes(3, 6)).toBe(1);
    expect(starsByMistakes(3, 9)).toBe(2); // ceil(9/3)=3
  });
});
