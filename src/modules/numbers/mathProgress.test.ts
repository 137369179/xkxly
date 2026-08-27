// @vitest-environment node
/**
 * calcMathSubProgress 单元测试
 * 覆盖 R56 回顾审计发现的缺陷修复：
 *  - F1：进度需 0-100 平滑（原实现 /6 上限卡 17%）；
 *       且需匹配子项后缀键（math:trace:N / math:ladder:N），否则恒为 0%。
 *  - F2：vertical 不应与「加法(math:add)」假相等，应走算术分类聚合。
 */
import { describe, it, expect } from 'vitest';
import { calcMathSubProgress } from './mathProgress';
import type { MasteryItem } from '@/types';

type M = Record<string, MasteryItem | undefined>;
const mk = (lv: number): MasteryItem => ({ lv, due: 0, ok: 1, ng: 0, last: 0 });

describe('calcMathSubProgress · F1 进度平滑（0-100）', () => {
  it('单键 lv0 或未回写 → 0%', () => {
    expect(calcMathSubProgress({}, 'tenframe', ['tenframe', 'trace', 'skip'])).toBe(0);
    expect(
      calcMathSubProgress({ 'math:tenframe': mk(0) }, 'tenframe', ['tenframe', 'trace', 'skip']),
    ).toBe(0);
  });

  it('单键 lv1 → 20%（1/5）', () => {
    expect(
      calcMathSubProgress({ 'math:tenframe': mk(1) }, 'tenframe', ['tenframe', 'trace', 'skip']),
    ).toBe(20);
  });

  it('单键 lv5（已掌握）→ 100%', () => {
    expect(
      calcMathSubProgress({ 'math:tenframe': mk(5) }, 'tenframe', ['tenframe', 'trace', 'skip']),
    ).toBe(100);
  });

  it('单键 lv3 → 60%（3/5）', () => {
    expect(
      calcMathSubProgress({ 'math:skip': mk(3) }, 'skip', ['tenframe', 'trace', 'skip']),
    ).toBe(60);
  });
});

describe('calcMathSubProgress · F1 子项后缀键匹配', () => {
  it('trace 按数字拆分键 math:trace:0..9，平均等级驱动进度', () => {
    const mastery: M = {
      'math:trace:0': mk(5),
      'math:trace:1': mk(5),
      'math:trace:2': mk(0),
    };
    // 3 个键、平均 lv = (5+5+0)/3 ≈ 3.33 → 3.33/5 = 66.6% → 67%
    expect(calcMathSubProgress(mastery, 'trace', ['tenframe', 'trace', 'skip'])).toBe(67);
  });

  it('ladder 按关卡拆分键 math:ladder:1..8，全部 lv5 → 100%', () => {
    const mastery: M = {
      'math:ladder:1': mk(5),
      'math:ladder:2': mk(5),
      'math:ladder:3': mk(5),
    };
    expect(calcMathSubProgress(mastery, 'ladder', ['math', 'extra', 'vertical', 'ladder', 'run'])).toBe(100);
  });

  it('trace/ladder 在「精确相等」旧逻辑下会恒为 0：确保新逻辑非 0', () => {
    const mastery: M = {
      'math:trace:0': mk(5),
      'math:ladder:1': mk(4),
    };
    expect(calcMathSubProgress(mastery, 'trace', ['tenframe', 'trace', 'skip'])).toBeGreaterThan(0);
    expect(calcMathSubProgress(mastery, 'ladder', ['math', 'extra', 'vertical', 'ladder', 'run'])).toBeGreaterThan(0);
  });
});

describe('calcMathSubProgress · F2 vertical 不应等于加法', () => {
  it('vertical 无独立键 → 走算术分类聚合，而非 math:add 精确值', () => {
    // 算术分类子功能：math/add/extra/vertical/ladder/run，其中 mapped：math→math:add, extra→math:mul, ladder→math:ladder, run→math:rabbit
    const catIds = ['math', 'extra', 'vertical', 'ladder', 'run'];
    // 仅加法(math:add)有数据：4 个 mapped 键中 1 个 touched → 25%
    const mastery: M = { 'math:add': mk(5) };
    expect(calcMathSubProgress(mastery, 'vertical', catIds)).toBe(25);
    // 与「加法」卡自身进度（单键 lv5 → 100%）不同，证明不再假相等
    expect(calcMathSubProgress(mastery, 'math', catIds)).toBe(100);
  });

  it('vertical 在算术分类全回写时 → 100%', () => {
    const catIds = ['math', 'extra', 'vertical', 'ladder', 'run'];
    const mastery: M = {
      'math:add': mk(5),
      'math:mul': mk(5),
      'math:ladder': mk(5),
      'math:rabbit': mk(5),
    };
    expect(calcMathSubProgress(mastery, 'vertical', catIds)).toBe(100);
  });
});

describe('calcMathSubProgress · 分类聚合回退', () => {
  it('未映射子功能（如 balance）按同分类已回写占比近似', () => {
    // sensory 分类 mapped：tenframe/trace/skip；wall/balance/count 未映射
    const catIds = ['wall', 'balance', 'tenframe', 'count', 'trace', 'skip'];
    const mastery: M = { 'math:tenframe': mk(5) }; // 3 个 mapped 中 1 个 touched → 33%
    expect(calcMathSubProgress(mastery, 'balance', catIds)).toBe(33);
  });

  it('分类无任何 mapped 键 → 0%', () => {
    expect(calcMathSubProgress({}, 'wall', ['wall', 'balance'])).toBe(0);
  });
});
