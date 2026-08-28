import { describe, it, expect } from 'vitest';
import {
  diagnoseStartLevel,
  tierForCount,
  type DiagnosticInput,
  type Tier,
} from './diagnosticPlacement';

describe('tierForCount 阈值边界', () => {
  it('负数 / NaN / 0 归为层级 1', () => {
    expect(tierForCount(-5)).toBe(1);
    expect(tierForCount(NaN)).toBe(1);
    expect(tierForCount(0)).toBe(1);
  });

  it('1–9 落在层级 1（种子启蒙）', () => {
    expect(tierForCount(1)).toBe(1);
    expect(tierForCount(9)).toBe(1);
  });

  it('边界 10 进入层级 2', () => {
    expect(tierForCount(10)).toBe(2);
    expect(tierForCount(49)).toBe(2);
  });

  it('边界 50 进入层级 3', () => {
    expect(tierForCount(50)).toBe(3);
    expect(tierForCount(149)).toBe(3);
  });

  it('边界 150 进入层级 4（硕果 mastery）', () => {
    expect(tierForCount(150)).toBe(4);
    expect(tierForCount(9999)).toBe(4);
  });
});

describe('diagnoseStartLevel 先测后学', () => {
  it('零掌握数据 → 综合层级 1 + 明确先测后学建议', () => {
    const r = diagnoseStartLevel({ hanziKnown: 0, wordKnown: 0, mathCorrect: 0 });
    expect(r.overall).toBe(1);
    expect(r.label).toBe('种子启蒙');
    expect(r.modules).toHaveLength(3);
    expect(r.reason).toContain('先测后学');
  });

  it('各模块独立映射层级（汉字超前不影响数学起点）', () => {
    const r = diagnoseStartLevel({ hanziKnown: 200, wordKnown: 0, mathCorrect: 0 });
    const hanzi = r.modules.find((m) => m.module === 'hanzi');
    const numbers = r.modules.find((m) => m.module === 'numbers');
    expect(hanzi?.tier).toBe(4);
    expect(numbers?.tier).toBe(1);
  });

  it('综合层级取总量映射（单模块偏大不误推整体）', () => {
    // 汉字 200（层级4）但总量 200 → 整体仍是 4（等于单模块上限），符合预期
    const r = diagnoseStartLevel({ hanziKnown: 200, wordKnown: 0, mathCorrect: 0 });
    expect(r.overall).toBe(4);
    // 仅汉字 15 → 总量 15 → 整体层级 2，不会因模块名误判
    const r2 = diagnoseStartLevel({ hanziKnown: 15, wordKnown: 0, mathCorrect: 0 });
    expect(r2.overall).toBe(2);
  });

  it('streak 仅影响建议文案，不改变层级', () => {
    const base: DiagnosticInput = { hanziKnown: 5, wordKnown: 5, mathCorrect: 5 };
    const without = diagnoseStartLevel(base);
    const withStreak = diagnoseStartLevel({ ...base, streak: 12 });
    expect(withStreak.overall).toBe(without.overall);
    expect(withStreak.reason).toContain('连续学习 12 天');
  });

  it('reason 始终非空且可用于 UI 展示', () => {
    const r = diagnoseStartLevel({ hanziKnown: 60, wordKnown: 30, mathCorrect: 20 });
    expect(r.reason.length).toBeGreaterThan(0);
    expect(r.label).toBe('花开绽放');
    expect(r.modules.every((m) => m.label.length > 0)).toBe(true);
  });

  it('入参为浮点数时向下取整，保持确定性', () => {
    const r = diagnoseStartLevel({ hanziKnown: 9.9, wordKnown: 0, mathCorrect: 0 });
    expect(r.overall).toBe(1);
    const r2 = diagnoseStartLevel({ hanziKnown: 10.4, wordKnown: 0, mathCorrect: 0 });
    expect(r2.overall).toBe(2);
  });
});
