import { describe, it, expect } from 'vitest';
import {
  INITIAL_STREAK,
  registerActivity,
  grantFreeze,
  daysBetween,
  todayISO,
  type StreakState,
} from './streakProtection';

describe('streakProtection 纯函数', () => {
  it('todayISO 返回本地 yyyy-mm-dd', () => {
    expect(todayISO(new Date(2026, 7, 28))).toBe('2026-08-28');
  });

  it('daysBetween 计算整天数差', () => {
    expect(daysBetween('2026-08-27', '2026-08-28')).toBe(1);
    expect(daysBetween('2026-08-28', '2026-08-28')).toBe(0);
    expect(daysBetween('2026-08-25', '2026-08-28')).toBe(3);
  });

  it('首次激活 → initialized，current=1', () => {
    const r = registerActivity(INITIAL_STREAK, '2026-08-28');
    expect(r.event).toBe('initialized');
    expect(r.state.current).toBe(1);
    expect(r.state.lastActiveDate).toBe('2026-08-28');
    expect(r.freezeUsed).toBe(false);
  });

  it('同一天重复激活 → unchanged', () => {
    const s: StreakState = { current: 5, longest: 9, lastActiveDate: '2026-08-28', freezesRemaining: 2 };
    const r = registerActivity(s, '2026-08-28');
    expect(r.event).toBe('unchanged');
    expect(r.state.current).toBe(5);
  });

  it('隔 1 天 → extended，current+1 且刷新最长', () => {
    const s: StreakState = { current: 5, longest: 5, lastActiveDate: '2026-08-27', freezesRemaining: 0 };
    const r = registerActivity(s, '2026-08-28');
    expect(r.event).toBe('extended');
    expect(r.state.current).toBe(6);
    expect(r.state.longest).toBe(6);
  });

  it('断签 1 天且有保护卡 → protected，消耗 1 张续接', () => {
    const s: StreakState = { current: 5, longest: 9, lastActiveDate: '2026-08-26', freezesRemaining: 2 };
    const r = registerActivity(s, '2026-08-28'); // gap = 2，需 1 张
    expect(r.event).toBe('protected');
    expect(r.freezeUsed).toBe(true);
    expect(r.state.current).toBe(6);
    expect(r.state.freezesRemaining).toBe(1);
  });

  it('断签超过保护卡能力 → broken，current 归 1 但保留保护卡', () => {
    const s: StreakState = { current: 12, longest: 20, lastActiveDate: '2026-08-20', freezesRemaining: 1 };
    const r = registerActivity(s, '2026-08-28'); // gap = 8，需 7 张 > 1
    expect(r.event).toBe('broken');
    expect(r.state.current).toBe(1);
    expect(r.state.longest).toBe(20); // 历史最长保留
    expect(r.state.freezesRemaining).toBe(1); // 保护卡不惩罚式清空
  });

  it('日期解析异常时保守维持，不破坏进度', () => {
    const s: StreakState = { current: 4, longest: 8, lastActiveDate: 'not-a-date', freezesRemaining: 0 };
    const r = registerActivity(s, '2026-08-28');
    expect(r.event).toBe('unchanged');
    expect(r.state.current).toBe(4);
  });

  it('grantFreeze 发放保护卡并封顶 5 张', () => {
    const s: StreakState = { current: 3, longest: 8, lastActiveDate: '2026-08-27', freezesRemaining: 4 };
    const r = grantFreeze(s, 3);
    expect(r.freezesRemaining).toBe(5); // 4+3 封顶 5
  });

  it('grantFreeze 容错：count<=0 时原样返回', () => {
    const s: StreakState = { current: 3, longest: 8, lastActiveDate: '2026-08-27', freezesRemaining: 1 };
    expect(grantFreeze(s, 0).freezesRemaining).toBe(1);
  });

  it('断签 2 天但有 2 张保护卡 → protected 全消耗', () => {
    const s: StreakState = { current: 7, longest: 10, lastActiveDate: '2026-08-25', freezesRemaining: 2 };
    const r = registerActivity(s, '2026-08-28'); // gap = 3，需 2 张
    expect(r.event).toBe('protected');
    expect(r.state.freezesRemaining).toBe(0);
    expect(r.state.current).toBe(8);
  });
});
