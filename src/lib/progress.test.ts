import { describe, it, expect } from 'vitest';
import { createInitialProgress } from '@/lib/progress';
import { findNewBadges } from '@/data/badges';

/**
 * progress.test.ts
 * ------------------------------------------------------------------
 * T3（C4 硬门槛）：Progress 接口新增字段必须与 createInitialProgress() 双处同步登记。
 * 漏登记会导致 useStore 初始化时字段为 undefined → findNewBadges 等读取处崩全站。
 * 本测试锁死 research 三字段的默认结构，任何一侧漂移立即红灯。
 * Sprint 3 追加：F19 研究徽章 check 依赖 researchStats/researchNotes 字段。
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

describe('F19 研究徽章 · findNewBadges 行为型规则', () => {
  const base = () => createInitialProgress();

  it('初始进度不触发任何研究徽章', () => {
    expect(findNewBadges(base())).not.toContain('research-first');
    expect(findNewBadges(base())).not.toContain('research-explore-20');
  });

  it('完成 1 次研究 → research-first', () => {
    const p = base();
    p.researchStats!.sessionsCompleted = 1;
    expect(findNewBadges(p)).toContain('research-first');
  });

  it('探索 20 次 → research-explore-20', () => {
    const p = base();
    p.researchStats!.exploreActions = 20;
    expect(findNewBadges(p)).toContain('research-explore-20');
  });

  it('探索 5 主题 → research-topics-5', () => {
    const p = base();
    p.researchStats!.topicsExplored = ['color', 'dino', 'space', 'body', 'vehicle'];
    expect(findNewBadges(p)).toContain('research-topics-5');
  });

  it('读 3 张卡 → research-cards-3', () => {
    const p = base();
    p.researchStats!.cardsRead = 3;
    expect(findNewBadges(p)).toContain('research-cards-3');
  });

  it('写 5 条笔记 → research-notes-5', () => {
    const p = base();
    p.researchNotes = { a: 'x', b: 'y', c: 'z', d: 'w', e: 'v' };
    expect(findNewBadges(p)).toContain('research-notes-5');
  });

  it('全部研究徽章 id 均被 BADGES 注册（徽章墙可见）', () => {
    const ids = findNewBadges({
      ...base(),
      researchStats: {
        topicsExplored: ['1', '2', '3', '4', '5'],
        exploreActions: 20,
        cardsRead: 3,
        sessionsCompleted: 1,
        exploreSeconds: 0,
      },
      researchNotes: { a: 'x', b: 'y', c: 'z', d: 'w', e: 'v' },
    });
    for (const id of ['research-first', 'research-explore-20', 'research-topics-5', 'research-cards-3', 'research-notes-5']) {
      expect(ids).toContain(id);
    }
  });
});
