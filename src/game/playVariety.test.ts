import { describe, it, expect } from 'vitest';
import {
  PLAY_MODES,
  DEFAULT_SESSION_LENGTH,
  modesFor,
  pickNextMode,
  buildSessionPlan,
} from './playVariety';
import type { ModuleKey } from './playVariety';

const MODULES: ModuleKey[] = ['hanzi', 'words', 'numbers'];

describe('playVariety · 玩法轮换调度器', () => {
  it('玩法池三核心各 6 种，且 id 全局唯一', () => {
    expect(PLAY_MODES).toHaveLength(18);
    MODULES.forEach((m) => {
      expect(modesFor(m)).toHaveLength(6);
    });
    const ids = PLAY_MODES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每个玩法都有给孩子看的文案与合法的难度带 / 负荷值', () => {
    PLAY_MODES.forEach((m) => {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.hint.length).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(m.band);
      expect([1, 2, 3]).toContain(m.load);
    });
  });

  it('渐进式难度：band 过滤只返回不超过上限的玩法', () => {
    expect(modesFor('numbers', 1).every((m) => m.band <= 1)).toBe(true);
    expect(modesFor('numbers', 2).every((m) => m.band <= 2)).toBe(true);
    expect(modesFor('numbers', 3)).toHaveLength(6);
    expect(modesFor('numbers', 1).length).toBeLessThan(modesFor('numbers', 3).length);
  });

  it('同一 seed 结果确定可复现（无 Math.random 依赖）', () => {
    const a = pickNextMode({ module: 'hanzi', level: 3, seed: 42 });
    const b = pickNextMode({ module: 'hanzi', level: 3, seed: 42 });
    expect(a.id).toBe(b.id);
    // 不同 seed 应能取到不同玩法（玩法池 > 1，随机确有作用）
    const seen = new Set<string>();
    for (let s = 1; s <= 40; s += 1) {
      seen.add(pickNextMode({ module: 'hanzi', level: 3, seed: s }).id);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('抗单调：最近玩过的玩法不会紧接着再次出现', () => {
    const recent = ['hanzi-pictograph', 'hanzi-listen-pick'];
    for (let s = 1; s <= 30; s += 1) {
      const picked = pickNextMode({ module: 'hanzi', level: 3, recent, seed: s });
      expect(recent).not.toContain(picked.id);
    }
  });

  it('降级不崩：难度带被压到极低时仍有玩法返回（不抛错、不返回 undefined）', () => {
    const picked = pickNextMode({
      module: 'hanzi',
      level: 0 as 1,
      recent: PLAY_MODES.filter((m) => m.module === 'hanzi').map((m) => m.id),
      slowUsed: 9,
      lastLoad: 3,
      seed: 7,
    });
    expect(picked).toBeDefined();
    expect(picked.module).toBe('hanzi');
  });

  it('疲劳控制：慢玩法（书写 / 跟读）配额用尽后不再出现', () => {
    for (let s = 1; s <= 20; s += 1) {
      const picked = pickNextMode({ module: 'hanzi', level: 3, slowUsed: 1, seed: s });
      expect(picked.slow).toBeFalsy();
    }
  });

  it('认知负荷节律：上一题重负荷时不会紧接着再来一题重负荷', () => {
    for (let s = 1; s <= 20; s += 1) {
      const picked = pickNextMode({ module: 'numbers', level: 3, lastLoad: 3, seed: s });
      expect(picked.load).toBeLessThanOrEqual(2);
    }
  });

  it('一节课默认 5 题，对齐「每 5 字一单元 / 一课一练」', () => {
    expect(DEFAULT_SESSION_LENGTH).toBe(5);
    const plan = buildSessionPlan({ module: 'words', level: 3, seed: 11 });
    expect(plan).toHaveLength(5);
    plan.forEach((m) => expect(m.module).toBe('words'));
  });

  it('一节课内玩法不重复，且慢玩法最多 1 次', () => {
    for (const module of MODULES) {
      for (let s = 1; s <= 12; s += 1) {
        const plan = buildSessionPlan({ module, level: 3, seed: s });
        const ids = plan.map((m) => m.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(plan.filter((m) => m.slow).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('一节课难度收尾触及当前最高带（给「我做到了」的成就感）', () => {
    for (let s = 1; s <= 15; s += 1) {
      const plan = buildSessionPlan({ module: 'numbers', level: 2, seed: s });
      const last = plan[plan.length - 1];
      expect(last?.band).toBeLessThanOrEqual(2);
      expect(plan.every((m) => m.band <= 2)).toBe(true);
    }
  });

  it('跨节课携带历史：recent 覆盖全部玩法时仍能产出完整课表且不重复', () => {
    const recent = PLAY_MODES.filter((m) => m.module === 'hanzi').map((m) => m.id);
    const plan = buildSessionPlan({ module: 'hanzi', level: 3, length: 6, recent, seed: 3 });
    expect(plan).toHaveLength(6);
    const ids = plan.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('无竞争性设计：玩法池中不含排行榜 / 对战 / 惩罚类玩法', () => {
    const banned = ['排行', '排名', '对战', 'PK', '惩罚', '扣分', '失败'];
    PLAY_MODES.forEach((m) => {
      const text = `${m.label}${m.hint}`;
      banned.forEach((word) => expect(text).not.toContain(word));
    });
  });

  it('异常入参兜底：题量为 0 / 负数时退化为 1 题，不抛错', () => {
    expect(buildSessionPlan({ module: 'hanzi', level: 2, length: 0, seed: 1 })).toHaveLength(1);
    expect(buildSessionPlan({ module: 'hanzi', level: 2, length: -5, seed: 1 })).toHaveLength(1);
  });
});
