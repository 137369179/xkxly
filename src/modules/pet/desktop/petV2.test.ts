import { describe, it, expect } from 'vitest';
import {
  emptyAttributes, attrLevel, gainAttr, ATTR_SOURCES, ATTR_MAX_EXP,
} from './lib/attributes';

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
