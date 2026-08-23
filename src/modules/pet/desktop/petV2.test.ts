import { describe, it, expect } from 'vitest';
import {
  emptyAttributes, attrLevel, gainAttr, ATTR_SOURCES, ATTR_MAX_EXP,
} from './lib/attributes';
import {
  totalLevel, stageOf, checkEvolution, accessorySlots, STAGES, emptyEvolution, type FiveLevels,
} from './lib/evolution';

describe('属性引擎 attributes', () => {
  it('等级公式：每 50exp 一级，封顶 10', () => {
    expect(attrLevel(0)).toBe(1);
    expect(attrLevel(49)).toBe(1);
    expect(attrLevel(50)).toBe(2);
    expect(attrLevel(450)).toBe(10);
    expect(attrLevel(9999)).toBe(10);
  });

  it('来源映射表：15 个 kind 全覆盖且数值符合设计', () => {
    expect(ATTR_SOURCES.numbers).toEqual({ dim: 'int', exp: 10, dailyCap: 6 });
    expect(ATTR_SOURCES.pomodoro).toEqual({ dim: 'vit', exp: 15, dailyCap: 5 });
    expect(ATTR_SOURCES.pixel).toEqual({ dim: 'cre', exp: 10, dailyCap: 4 });
    expect(Object.keys(ATTR_SOURCES)).toHaveLength(15);
  });

  it('gainAttr 正常加经验并计数', () => {
    const now = new Date('2026-08-22T10:00:00').getTime();
    const r = gainAttr(emptyAttributes(), 'letters', now);
    expect(r.gained).toBe(8);
    expect(r.dim).toBe('int');
    expect(r.capped).toBe(false);
    expect(r.state.exp.int).toBe(8);
  });

  it('gainAttr 每日上限拦截', () => {
    const now = new Date('2026-08-22T10:00:00').getTime();
    let st = emptyAttributes();
    for (let i = 0; i < 6; i++) st = gainAttr(st, 'letters', now + i * 61_000).state;
    const blocked = gainAttr(st, 'letters', now + 500_000);
    expect(blocked.capped).toBe(true);
    expect(blocked.gained).toBe(0);
    expect(blocked.state).toBe(st);
  });

  it('gainAttr 同来源 60s 内去重', () => {
    const t0 = new Date('2026-08-22T10:00:00').getTime();
    const st = gainAttr(emptyAttributes(), 'letters', t0).state;
    expect(gainAttr(st, 'letters', t0 + 30_000).gained).toBe(0);
    expect(gainAttr(st, 'letters', t0 + 61_000).gained).toBe(8);
  });

  it('跨日重置上限、ATTR_MAX_EXP=450', () => {
    const d1 = new Date('2026-08-22T10:00:00').getTime();
    const d2 = new Date('2026-08-23T10:00:00').getTime();
    let st = emptyAttributes();
    for (let i = 0; i < 6; i++) st = gainAttr(st, 'art', d1 + i * 61_000).state;
    expect(gainAttr(st, 'art', d1 + 500_000).capped).toBe(true);
    expect(gainAttr(st, 'art', d2).capped).toBe(false);
    expect(ATTR_MAX_EXP).toBe(450);
  });
});

describe('进化引擎 evolution', () => {
  const lv = (n: number): FiveLevels => ({ int: n, vit: n, cha: n, cre: n, aff: n });

  it('总等级 = 5 维均值四舍五入', () => {
    expect(totalLevel(lv(1))).toBe(1);
    expect(totalLevel({ int: 2, vit: 1, cha: 1, cre: 1, aff: 1 })).toBe(1);
    expect(totalLevel({ int: 3, vit: 2, cha: 1, cre: 1, aff: 1 })).toBe(2);
    expect(totalLevel(lv(10))).toBe(10);
  });

  it('阶段判定：1 / 2-3 / 4-6 / 7-10，槽位 2/4/5/7', () => {
    expect(stageOf(1)).toBe(1);
    expect(stageOf(2)).toBe(2);
    expect(stageOf(3)).toBe(2);
    expect(stageOf(4)).toBe(3);
    expect(stageOf(6)).toBe(3);
    expect(stageOf(7)).toBe(4);
    expect(accessorySlots(1)).toBe(2);
    expect(accessorySlots(2)).toBe(4);
    expect(accessorySlots(3)).toBe(5);
    expect(accessorySlots(4)).toBe(7);
    expect(STAGES).toHaveLength(4);
  });

  it('checkEvolution 只前进不回退', () => {
    expect(checkEvolution(1, 2)).toEqual({ stage: 2, evolved: true });
    expect(checkEvolution(3, 3)).toEqual({ stage: 3, evolved: false });
    expect(checkEvolution(4, 2)).toEqual({ stage: 4, evolved: false });
  });

  it('emptyEvolution 初始为蛋阶段', () => {
    expect(emptyEvolution()).toEqual({ stage: 1, dex: {} });
  });
});
