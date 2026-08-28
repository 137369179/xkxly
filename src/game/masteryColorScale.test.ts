import { describe, it, expect } from 'vitest';
import {
  DEFAULT_THRESHOLDS,
  MASTERY_TIERS,
  getMasteryLevel,
  getMasteryTier,
  getMasteryTierByCount,
  nextTierProgress,
  type MasteryLevel,
} from './masteryColorScale';

const LEVELS: MasteryLevel[] = ['untouched', 'novice', 'skilled', 'master'];

/** 各档位对应的最低分数（untouched 用 0） */
const LEVEL_SCORES: Record<MasteryLevel, number> = {
  untouched: 0,
  novice: DEFAULT_THRESHOLDS.novice,
  skilled: DEFAULT_THRESHOLDS.skilled,
  master: DEFAULT_THRESHOLDS.master,
};

describe('getMasteryLevel', () => {
  it('将 0 与极小值归为 untouched', () => {
    expect(getMasteryLevel(0)).toBe('untouched');
    expect(getMasteryLevel(-1)).toBe('untouched');
    expect(getMasteryLevel(0.24)).toBe('untouched');
  });

  it('novice 阈值(含)起算', () => {
    expect(getMasteryLevel(0.25)).toBe('novice');
    expect(getMasteryLevel(0.59)).toBe('novice');
  });

  it('skilled 阈值(含)起算', () => {
    expect(getMasteryLevel(0.6)).toBe('skilled');
    expect(getMasteryLevel(0.89)).toBe('skilled');
  });

  it('master 阈值(含)起算，包含越界封顶', () => {
    expect(getMasteryLevel(0.9)).toBe('master');
    expect(getMasteryLevel(1)).toBe('master');
    expect(getMasteryLevel(99)).toBe('master');
  });

  it('非有限值安全降级', () => {
    expect(getMasteryLevel(NaN)).toBe('untouched');
    expect(getMasteryLevel(Number.POSITIVE_INFINITY)).toBe('untouched');
  });

  it('支持自定义阈值', () => {
    const t = { ...DEFAULT_THRESHOLDS, novice: 0.5, skilled: 0.7, master: 0.85 };
    expect(getMasteryLevel(0.5, t)).toBe('novice');
    expect(getMasteryLevel(0.7, t)).toBe('skilled');
    expect(getMasteryLevel(0.85, t)).toBe('master');
  });
});

describe('getMasteryTier', () => {
  it('返回四档完整令牌，且形状随档位变化（色不独依）', () => {
    const shapes = LEVELS.map((lv) => getMasteryTier(LEVEL_SCORES[lv]).shape);
    expect(shapes).toEqual(['circle', 'triangle', 'square', 'star']);
  });

  it('每档都提供色盲友好变体且非空', () => {
    for (const lv of LEVELS) {
      const tier = getMasteryTier(LEVEL_SCORES[lv]);
      expect(tier.colorblindHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(tier.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(tier.label).toBe(MASTERY_TIERS[lv].label);
      expect(tier.ariaLabel.length).toBeGreaterThan(0);
    }
  });

  it('tier.level 与 getMasteryLevel 一致', () => {
    expect(getMasteryTier(0.95).level).toBe('master');
    expect(getMasteryTier(0.3).level).toBe('novice');
  });
});

describe('getMasteryTierByCount', () => {
  it('掌握度 = 已掌握 / 目标', () => {
    expect(getMasteryTierByCount(0, 100).level).toBe('untouched');
    expect(getMasteryTierByCount(25, 100).level).toBe('novice');
    expect(getMasteryTierByCount(60, 100).level).toBe('skilled');
    expect(getMasteryTierByCount(90, 100).level).toBe('master');
  });

  it('目标为 0 时安全降级（避免 NaN/除零）', () => {
    expect(getMasteryTierByCount(5, 0).level).toBe('untouched');
  });
});

describe('nextTierProgress', () => {
  it('未满档时给出「下一档 + 进度(0–1)」', () => {
    const r = nextTierProgress(0.3); // novice，区间 0.25–0.6
    expect(r.from).toBe('novice');
    expect(r.to).toBe('skilled');
    expect(r.progress).toBeCloseTo((0.3 - 0.25) / (0.6 - 0.25), 5);
  });

  it('已到最高档 to=null、progress=1', () => {
    const r = nextTierProgress(1);
    expect(r.from).toBe('master');
    expect(r.to).toBeNull();
    expect(r.progress).toBe(1);
  });

  it('untouched→novice 区间从 0 起算', () => {
    const r = nextTierProgress(0.1);
    expect(r.from).toBe('untouched');
    expect(r.to).toBe('novice');
    expect(r.progress).toBeCloseTo(0.1 / 0.25, 5);
  });
});
