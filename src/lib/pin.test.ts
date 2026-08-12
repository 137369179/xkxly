import { describe, it, expect } from 'vitest';
import {
  hashPin,
  verifyPin,
  isLegacyPin,
  isLocked,
  lockRemaining,
  formatLock,
  PIN_FAIL_LIMIT,
  PIN_LOCK_MS,
} from './pin';

describe('pin · hashPin()', () => {
  it('返回 sha256:<salt>:<hash> 格式', async () => {
    const hash = await hashPin('1234');
    expect(hash).toMatch(/^sha256:[0-9a-f]{16}:[0-9a-f]{64}$/);
  });

  it('相同 PIN 每次哈希不同（随机盐）', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a).not.toBe(b);
  });

  it('传入固定盐时结果确定', async () => {
    const a = await hashPin('1234', '0123456789abcdef');
    const b = await hashPin('1234', '0123456789abcdef');
    expect(a).toBe(b);
  });
});

describe('pin · verifyPin()', () => {
  it('正确 PIN 验证通过', async () => {
    const hash = await hashPin('2580');
    expect(await verifyPin('2580', hash)).toBe(true);
  });

  it('错误 PIN 验证不通过', async () => {
    const hash = await hashPin('2580');
    expect(await verifyPin('1234', hash)).toBe(false);
  });

  it('兼容旧明文格式：正确时返回 true', async () => {
    expect(await verifyPin('1234', '1234')).toBe(true);
  });

  it('兼容旧明文格式：错误时返回 false', async () => {
    expect(await verifyPin('9999', '1234')).toBe(false);
  });

  it('空 stored 返回 false', async () => {
    expect(await verifyPin('1234', '')).toBe(false);
  });

  it('格式错误返回 false', async () => {
    expect(await verifyPin('1234', 'garbage')).toBe(false);
  });
});

describe('pin · isLegacyPin()', () => {
  it('4 位数字为旧格式', () => {
    expect(isLegacyPin('1234')).toBe(true);
    expect(isLegacyPin('0000')).toBe(true);
  });

  it('哈希格式不是旧格式', async () => {
    const hash = await hashPin('1234');
    expect(isLegacyPin(hash)).toBe(false);
  });

  it('空串不是旧格式', () => {
    expect(isLegacyPin('')).toBe(false);
  });
});

describe('pin · isLocked()', () => {
  const NOW = 1700000000000;

  it('失败次数未达上限不锁定', () => {
    expect(isLocked(PIN_FAIL_LIMIT - 1, 0, NOW)).toBe(false);
  });

  it('失败次数达上限且未过锁定时间则锁定', () => {
    expect(isLocked(PIN_FAIL_LIMIT, NOW + 60000, NOW)).toBe(true);
  });

  it('失败次数达上限但锁定时间已过则解锁', () => {
    expect(isLocked(PIN_FAIL_LIMIT, NOW - 1000, NOW)).toBe(false);
  });

  it('0 次失败不锁定', () => {
    expect(isLocked(0, 0, NOW)).toBe(false);
  });
});

describe('pin · lockRemaining()', () => {
  const NOW = 1700000000000;

  it('未锁定返回 0', () => {
    expect(lockRemaining(0, NOW)).toBe(0);
    expect(lockRemaining(NOW - 1000, NOW)).toBe(0);
  });

  it('返回剩余秒数（向上取整）', () => {
    expect(lockRemaining(NOW + 30000, NOW)).toBe(30);
    expect(lockRemaining(NOW + 30500, NOW)).toBe(31); // 向上取整
  });
});

describe('pin · formatLock()', () => {
  it('0 秒返回空串', () => {
    expect(formatLock(0)).toBe('');
  });

  it('小于 60 秒显示「X 秒」', () => {
    expect(formatLock(45)).toBe('45 秒');
  });

  it('60 秒以上显示「X 分 XX 秒」', () => {
    expect(formatLock(125)).toBe('2 分 05 秒');
    expect(formatLock(60)).toBe('1 分 00 秒');
  });
});

describe('pin · 常量', () => {
  it('PIN_FAIL_LIMIT 为 5', () => {
    expect(PIN_FAIL_LIMIT).toBe(5);
  });

  it('PIN_LOCK_MS 为 5 分钟', () => {
    expect(PIN_LOCK_MS).toBe(5 * 60 * 1000);
  });
});
