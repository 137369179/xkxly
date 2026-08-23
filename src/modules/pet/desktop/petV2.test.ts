import { describe, it, expect } from 'vitest';
import {
  emptyAttributes, attrLevel, gainAttr, ATTR_SOURCES, ATTR_MAX_EXP,
} from './lib/attributes';
import {
  totalLevel, stageOf, checkEvolution, accessorySlots, STAGES, emptyEvolution, type FiveLevels,
} from './lib/evolution';
import { decide, utility, emptyBehavior, type BehaviorCtx, type BehaviorState } from './lib/behavior';

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

describe('行为引擎 behavior', () => {
  const ctx = (over: Partial<BehaviorCtx> = {}): BehaviorCtx => ({
    hour: 14, atHome: false, affinityLv: 2, lowestIsInt: true,
    now: 1_000_000, night: false, ...over,
  });

  it('深夜未在家：sleep 最高且 goHome 次之', () => {
    const st = emptyBehavior();
    const r = decide(st, ctx({ hour: 23, night: true }));
    expect(r.action).toBe('sleep');
    expect(utility('goHome', st, ctx({ hour: 23, night: true }))).toBeGreaterThan(0.5);
  });

  it('夜晚已在家：sleep 得 +0.3', () => {
    const c = ctx({ hour: 23, night: true, atHome: true });
    expect(utility('sleep', emptyBehavior(), c)).toBeCloseTo(1.25);
  });

  it('invite 冷却 10min 内强制 0，超时且久未互动得高分', () => {
    let st: BehaviorState = { ...emptyBehavior(), lastInviteAt: 900_000, lastInteractAt: 0 };
    expect(utility('invite', st, ctx({ now: 1_000_000 }))).toBe(0);
    st = { ...emptyBehavior(), lastInviteAt: 0, lastInteractAt: 0 };
    expect(utility('invite', st, ctx({ now: 1_000_000 }))).toBe(0.7);
    expect(utility('invite', st, ctx({ now: 3_000_000 }))).toBe(0.85);
  });

  it('study：智力最低+白天 0.7；冷却 20min 内 0；夜里低分', () => {
    let st = emptyBehavior();
    expect(utility('study', st, ctx())).toBe(0.7);
    expect(utility('study', st, ctx({ lowestIsInt: false }))).toBeLessThan(0.7);
    expect(utility('study', st, ctx({ night: true }))).toBeLessThan(0.1);
    st = { ...emptyBehavior(), lastStudyAt: 1_000_000 - 60_000 };
    expect(utility('study', st, ctx())).toBe(0);
  });

  it('迟滞：当前行为 +0.15 决策防抖', () => {
    const st: BehaviorState = { ...emptyBehavior(), current: 'idle' };
    const r = decide(st, ctx());
    expect(r.utilities.idle).toBeCloseTo(0.55);
    expect(Object.keys(r.utilities)).toHaveLength(8);
  });

  it('白天无特殊条件：决策确定性', () => {
    const st = emptyBehavior();
    expect(decide(st, ctx()).action).toBe(decide(st, ctx()).action);
  });
});
