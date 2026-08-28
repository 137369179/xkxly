import { describe, it, expect } from 'vitest';
import {
  MAX_STARS,
  NOTICE_THRESHOLD,
  describeDivergence,
  needsMigration,
  parseMigrationMarker,
  reconcileLedgers,
  sanitizeAmount,
  LEDGER_MIGRATION_VERSION,
  type LedgerSnapshot,
} from './starLedger';

describe('sanitizeAmount · 脏值清洗', () => {
  it('正常值原样返回', () => {
    expect(sanitizeAmount(0)).toBe(0);
    expect(sanitizeAmount(7)).toBe(7);
  });

  it('NaN 与非数字归零（NaN 会让所有比较失效，界面直接空白）', () => {
    expect(sanitizeAmount(Number.NaN)).toBe(0);
    expect(sanitizeAmount(Number.parseFloat('abc'))).toBe(0);
  });

  it('负数归零 —— 负余额对孩子是无法理解的概念', () => {
    expect(sanitizeAmount(-1)).toBe(0);
    expect(sanitizeAmount(-9999)).toBe(0);
  });

  it('Infinity 钳到上界（区分于 NaN：这是越界不是无效）', () => {
    expect(sanitizeAmount(Number.POSITIVE_INFINITY)).toBe(MAX_STARS);
    expect(sanitizeAmount(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it('超界值钳到 MAX_STARS', () => {
    expect(sanitizeAmount(MAX_STARS + 1)).toBe(MAX_STARS);
    expect(sanitizeAmount(Number.MAX_SAFE_INTEGER)).toBe(MAX_STARS);
  });

  it('小数向下取整（星星是离散单位，不该出现半颗）', () => {
    expect(sanitizeAmount(3.9)).toBe(3);
    expect(sanitizeAmount(0.5)).toBe(0);
  });
});

describe('reconcileLedgers · 两本合一', () => {
  const store: LedgerSnapshot = { earned: 0, spent: 0 };
  const reward: LedgerSnapshot = { earned: 0, spent: 0 };

  it('两边都是零时无偏离', () => {
    const r = reconcileLedgers(store, reward);
    expect(r.divergence).toBe('none');
    expect(r.unified.available).toBe(0);
    expect(r.toMigrate).toBe(0);
  });

  it('store 领先是正常态：学习任务直接 addStars，不经过星星经济层', () => {
    const r = reconcileLedgers({ earned: 100, spent: 20 }, { earned: 30, spent: 0 });
    // 赚得取大，绝不把 store 记到的 70 颗抹掉
    expect(r.unified.earned).toBe(100);
    // 花掉取大，已兑走的贴纸不会「白送」
    expect(r.unified.spent).toBe(20);
    expect(r.unified.available).toBe(80);
    expect(r.divergence).toBe('store-ahead');
    expect(r.gap).toBe(70);
    expect(r.toMigrate).toBe(0);
  });

  it('reward 领先是异常态：算出的差额必须补回主账本', () => {
    const r = reconcileLedgers({ earned: 10, spent: 0 }, { earned: 40, spent: 5 });
    expect(r.unified.earned).toBe(40);
    expect(r.unified.spent).toBe(5);
    expect(r.unified.available).toBe(35);
    expect(r.divergence).toBe('reward-ahead');
    expect(r.gap).toBe(30);
    expect(r.toMigrate).toBe(30);
  });

  it('两边相等时无偏离', () => {
    const r = reconcileLedgers({ earned: 50, spent: 10 }, { earned: 50, spent: 10 });
    expect(r.divergence).toBe('none');
    expect(r.gap).toBe(0);
    expect(r.unified.available).toBe(40);
  });

  it('花掉超过赚得时不出现负余额（存档损坏的兜底）', () => {
    const r = reconcileLedgers({ earned: 5, spent: 50 }, { earned: 0, spent: 0 });
    expect(r.unified.available).toBe(0);
  });

  it('脏值入参被清洗后再合并，不产出 NaN', () => {
    const r = reconcileLedgers(
      { earned: Number.NaN, spent: -5 },
      { earned: Number.POSITIVE_INFINITY, spent: 3.7 },
    );
    expect(Number.isFinite(r.unified.earned)).toBe(true);
    expect(Number.isFinite(r.unified.spent)).toBe(true);
    expect(Number.isFinite(r.unified.available)).toBe(true);
    expect(r.unified.available).toBeGreaterThanOrEqual(0);
  });

  it('不变式：合并结果绝不丢掉任何一本记到的成果（随机 500 组）', () => {
    // 用确定性伪随机，失败可复现
    let seed = 20260828;
    const rand = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 500; i += 1) {
      const s: LedgerSnapshot = {
        earned: Math.floor(rand() * 500),
        spent: Math.floor(rand() * 500),
      };
      const w: LedgerSnapshot = {
        earned: Math.floor(rand() * 500),
        spent: Math.floor(rand() * 500),
      };
      const r = reconcileLedgers(s, w);
      expect(r.unified.earned).toBeGreaterThanOrEqual(s.earned);
      expect(r.unified.earned).toBeGreaterThanOrEqual(w.earned);
      expect(r.unified.spent).toBeGreaterThanOrEqual(s.spent);
      expect(r.unified.spent).toBeGreaterThanOrEqual(w.spent);
      expect(r.unified.available).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('parseMigrationMarker · 幂等标记解析', () => {
  it('合法结构正常解析并取整', () => {
    expect(parseMigrationMarker({ version: 1, migrated: 12 })).toEqual({
      version: 1,
      migrated: 12,
    });
    expect(parseMigrationMarker({ version: 2.7, migrated: 3.2 })).toEqual({
      version: 2,
      migrated: 3,
    });
  });

  it('损坏结构一律视为未迁移（宁可多查一次，也不能误判为已迁移而丢星）', () => {
    expect(parseMigrationMarker(null)).toBeNull();
    expect(parseMigrationMarker(undefined)).toBeNull();
    expect(parseMigrationMarker('1')).toBeNull();
    expect(parseMigrationMarker({})).toBeNull();
    expect(parseMigrationMarker({ version: '1', migrated: 2 })).toBeNull();
    expect(parseMigrationMarker({ version: 1, migrated: 'x' })).toBeNull();
    expect(parseMigrationMarker({ version: Number.NaN, migrated: 1 })).toBeNull();
  });
});

describe('needsMigration · 迁移判据', () => {
  const baseline = reconcileLedgers({ earned: 0, spent: 0 }, { earned: 10, spent: 0 });

  it('没有差额就不迁移', () => {
    const none = reconcileLedgers({ earned: 10, spent: 0 }, { earned: 10, spent: 0 });
    expect(needsMigration(none, null)).toBe(false);
  });

  it('有差额且无标记 → 需要迁移', () => {
    expect(needsMigration(baseline, null)).toBe(true);
  });

  it('已有当前版本标记 → 不再迁移（防重复印星）', () => {
    expect(
      needsMigration(baseline, { version: LEDGER_MIGRATION_VERSION, migrated: 10 }),
    ).toBe(false);
  });

  it('标记版本落后 → 需要重新迁移', () => {
    expect(
      needsMigration(baseline, { version: LEDGER_MIGRATION_VERSION - 1, migrated: 5 }),
    ).toBe(true);
  });
});

describe('describeDivergence · 给孩子看的话术', () => {
  it('无偏离时不打扰', () => {
    const r = reconcileLedgers({ earned: 10, spent: 0 }, { earned: 10, spent: 0 });
    expect(describeDivergence(r)).toBeNull();
  });

  it('差额低于阈值不打断学习心流', () => {
    const r = reconcileLedgers({ earned: 0, spent: 0 }, {
      earned: NOTICE_THRESHOLD - 1,
      spent: 0,
    });
    expect(describeDivergence(r)).toBeNull();
  });

  it('有找回时给「找回来」而非「补发」—— 前者尊重孩子的努力', () => {
    const r = reconcileLedgers({ earned: 0, spent: 0 }, { earned: 15, spent: 0 });
    const notice = describeDivergence(r);
    expect(notice).not.toBeNull();
    expect(notice?.tone).toBe('gained');
    expect(notice?.message).toContain('15');
    expect(notice?.message).toContain('找回');
  });

  it('文案不含成人系统术语（异常 / 同步 / 失败 / 错误）', () => {
    const r = reconcileLedgers({ earned: 0, spent: 0 }, { earned: 20, spent: 0 });
    const message = describeDivergence(r)?.message ?? '';
    for (const word of ['异常', '同步', '失败', '错误', '数据']) {
      expect(message).not.toContain(word);
    }
  });
});
