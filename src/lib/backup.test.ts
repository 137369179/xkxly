import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeProgress,
  buildBackup,
  parseBackup,
  validateBackup,
} from './backup';
import { createInitialProgress } from './progress';

// Node 测试环境无 localStorage，为签名路径提供最小 shim
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => {
      storage.set(k, String(v));
    },
    removeItem: (k: string) => {
      storage.delete(k);
    },
  },
  configurable: true,
});

const settings = {
  sound: true,
  showPinyin: true,
  parentPin: '',
  pinFails: 0,
  pinLockUntil: 0,
  dailyLimitMin: 30,
  eyeCareMin: 15,
  aiEnabled: true,
};

describe('backup · sanitizeProgress', () => {
  it('丢弃未知字段（含 __proto__ 原型污染尝试）', () => {
    const raw = JSON.parse('{"stars":5,"evilField":"x","__proto__":{"pollute":true}}');
    const out = sanitizeProgress(raw);
    expect(out.stars).toBe(5);
    expect('evilField' in out).toBe(false);
    expect((Object.prototype as Record<string, unknown>).pollute).toBeUndefined();
  });

  it('数值钳位到 [0, 1000000] 并取整', () => {
    const out = sanitizeProgress({
      ...createInitialProgress(),
      stars: 9_000_000_000,
      spent: -5,
      mathTotal: 3.7,
    } as unknown);
    expect(out.stars).toBe(1_000_000);
    expect(out.spent).toBe(0);
    expect(out.mathTotal).toBe(4);
  });

  it('数组条数封顶', () => {
    const big = Array.from({ length: 5000 }, (_, i) => `b${i}`);
    const out = sanitizeProgress({ ...createInitialProgress(), badges: big });
    expect(out.badges.length).toBe(2000);
  });

  it('非法输入回退初始进度', () => {
    expect(sanitizeProgress('garbage')).toEqual(createInitialProgress());
    expect(sanitizeProgress(null)).toEqual(createInitialProgress());
  });
});

describe('backup · 签名与导入', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('导出→导入签名校验通过', async () => {
    const payload = await buildBackup(createInitialProgress(), settings);
    expect(typeof payload.sig).toBe('string');
    expect(payload.sig).toMatch(/^[0-9a-f]{64}$/i);
    const parsed = await parseBackup(JSON.stringify(payload));
    expect(parsed).not.toBeNull();
    expect(parsed?.progress.stars).toBe(0);
  });

  it('篡改 payload 后验签失败', async () => {
    const payload = await buildBackup(createInitialProgress(), settings);
    const tampered = { ...payload, progress: { ...payload.progress, stars: 999999 } };
    expect(await parseBackup(JSON.stringify(tampered))).toBeNull();
  });

  it('无签名历史备份降级接受并净化', async () => {
    const legacy = {
      app: 'baby-learning-park',
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: { ...createInitialProgress(), stars: 42, hacker: true },
      settings,
    };
    const parsed = await parseBackup(JSON.stringify(legacy));
    expect(parsed).not.toBeNull();
    expect(parsed?.progress.stars).toBe(42);
    expect('hacker' in (parsed?.progress ?? {})).toBe(false);
  });

  it('validateBackup 拒绝非法载荷', () => {
    expect(validateBackup(null)).toBe(false);
    expect(validateBackup({ app: 'x' })).toBe(false);
    expect(validateBackup({ app: 'baby-learning-park', version: 2 })).toBe(false);
  });
});
