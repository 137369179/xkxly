import { describe, it, expect } from 'vitest';
import { cn, randInt, shuffle, sample, sampleMany, range, clamp, makeNumberOptions } from './utils';

describe('utils · cn()', () => {
  it('合并 truthy 字符串', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('过滤 falsy 值', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('全 falsy 返回空串', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});

describe('utils · randInt()', () => {
  it('返回值在 [min, max] 闭区间内', () => {
    for (let i = 0; i < 100; i++) {
      const v = randInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it('min === max 时返回该值', () => {
    expect(randInt(5, 5)).toBe(5);
  });
});

describe('utils · shuffle()', () => {
  it('不修改原数组', () => {
    const orig = [1, 2, 3, 4, 5];
    const copy = [...orig];
    shuffle(orig);
    expect(orig).toEqual(copy);
  });

  it('返回包含相同元素的数组', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr);
    expect(shuffled.sort()).toEqual([...arr].sort());
    expect(shuffled.length).toBe(arr.length);
  });

  it('空数组返回空数组', () => {
    expect(shuffle([])).toEqual([]);
  });
});

describe('utils · sample()', () => {
  it('返回数组中的元素', () => {
    const arr = ['a', 'b', 'c'];
    expect(arr).toContain(sample(arr));
  });
});

describe('utils · sampleMany()', () => {
  it('返回 n 个不重复元素', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const picked = sampleMany(arr, 4);
    expect(picked.length).toBe(4);
    expect(new Set(picked).size).toBe(4);
    picked.forEach((v) => expect(arr).toContain(v));
  });

  it('n 超过数组长度时返回全部', () => {
    const arr = [1, 2, 3];
    expect(sampleMany(arr, 10).length).toBe(3);
  });
});

describe('utils · range()', () => {
  it('生成 [start, end) 整数数组', () => {
    expect(range(1, 5)).toEqual([1, 2, 3, 4]);
  });

  it('start === end 返回空数组', () => {
    expect(range(3, 3)).toEqual([]);
  });
});

describe('utils · clamp()', () => {
  it('值在范围内返回原值', () => {
    expect(clamp(5, 1, 10)).toBe(5);
  });

  it('小于 min 返回 min', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('大于 max 返回 max', () => {
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('utils · makeNumberOptions()', () => {
  it('返回 count 个元素', () => {
    expect(makeNumberOptions(5, 4).length).toBe(4);
  });

  it('包含正确答案', () => {
    expect(makeNumberOptions(7, 4)).toContain(7);
  });

  it('元素都在 [min, max] 范围内', () => {
    const opts = makeNumberOptions(5, 4, 0, 10);
    opts.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
    });
  });

  it('元素不重复', () => {
    const opts = makeNumberOptions(5, 4, 0, 20);
    expect(new Set(opts).size).toBe(4);
  });
});
