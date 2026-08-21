import { describe, it, expect, beforeEach } from 'vitest';
import {
  getClaimedMap,
  isExplored,
  claimExplore,
  DEFAULT_EXPLORE_STARS,
} from './exploreReward';

// Node 测试环境无 localStorage，提供最小 shim（与 backup.test.ts 一致）
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

describe('exploreReward（探索打卡激励助手）', () => {
  beforeEach(() => storage.clear());

  it('默认每个探索内容授予 2 颗星', () => {
    expect(DEFAULT_EXPLORE_STARS).toBe(2);
  });

  it('初始状态：无任何探索记录', () => {
    expect(getClaimedMap()).toEqual({});
    expect(isExplored('hanzi-evolve')).toBe(false);
  });

  it('claimExplore 写入时间戳且幂等（重复调用不更新时间戳）', () => {
    claimExplore('hanzi-evolve');
    expect(isExplored('hanzi-evolve')).toBe(true);
    const ts1 = getClaimedMap()['hanzi-evolve'];
    expect(typeof ts1).toBe('number');
    claimExplore('hanzi-evolve'); // 重复调用
    const ts2 = getClaimedMap()['hanzi-evolve'];
    expect(ts2).toBe(ts1);
  });

  it('多个探索内容互不干扰并持久化到 localStorage', () => {
    claimExplore('a');
    claimExplore('b');
    expect(isExplored('a')).toBe(true);
    expect(isExplored('b')).toBe(true);
    expect(isExplored('c')).toBe(false);
    const raw = storage.get('bb-explore-claimed');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.a).toBeTruthy();
    expect(parsed.b).toBeTruthy();
  });

  it('localStorage 不可用时优雅降级（不抛错，本次奖励仍由调用方授予）', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        /* noop */
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: broken,
      configurable: true,
    });
    expect(() => claimExplore('x')).not.toThrow();
    expect(() => isExplored('x')).not.toThrow();
  });
});
