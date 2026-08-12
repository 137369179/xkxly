import { describe, it, expect } from 'vitest';
import { createInitialProgress } from '@/lib/progress';

/**
 * progress.test.ts
 * ------------------------------------------------------------------
 * T3（C4 硬门槛）：Progress 接口新增字段必须与 createInitialProgress() 双处同步登记。
 * 漏登记会导致 useStore 初始化时字段为 undefined → findNewBadges 等读取处崩全站。
 * 本测试锁死 research 三字段的默认结构，任何一侧漂移立即红灯。
 */

describe('createInitialProgress · C4 研究模式字段登记', () => {
  const p = createInitialProgress();

  it('researchNotes 已登记为对象', () => {
    expect(p.researchNotes).toEqual({});
  });

  it('discoveries 已登记为空数组', () => {
    expect(p.discoveries).toEqual([]);
  });

  it('researchStats 已登记且五字段默认值齐全', () => {
    expect(p.researchStats).toEqual({
      topicsExplored: [],
      exploreActions: 0,
      cardsRead: 0,
      sessionsCompleted: 0,
      exploreSeconds: 0,
    });
  });

  it('researchStats 子字段均为持久化值类型（非 undefined）', () => {
    const s = p.researchStats;
    expect(Array.isArray(s.topicsExplored)).toBe(true);
    expect(typeof s.exploreActions).toBe('number');
    expect(typeof s.cardsRead).toBe('number');
    expect(typeof s.sessionsCompleted).toBe('number');
    expect(typeof s.exploreSeconds).toBe('number');
  });

  it('mastery 仍为通用记录（研究模式不新增掌握度字段，ADR-004）', () => {
    expect(p.mastery).toEqual({});
  });

  it('原有字段未被破坏（回归防线）', () => {
    expect(p.stars).toBe(0);
    expect(p.badges).toEqual([]);
    expect(p.unlockedLevel).toBe(1);
    expect(p.mastery).toEqual({});
    expect(p.wrongBook).toEqual([]);
  });
});
