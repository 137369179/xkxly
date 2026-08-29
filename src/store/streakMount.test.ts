import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

/**
 * R163：streakProtection 挂载回归测试。
 * 验证 checkIn 经统一安全网推进连胜：同日幂等、隔天续接、断签用保护卡续接、
 * 保护卡不足时归 1 重计但保留卡片、grantStreakFreeze 封顶 5。
 */
const mem = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      mem.set(k, v);
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  },
  configurable: true,
});

let useStore: typeof import('./useStore').useStore;
beforeAll(async () => {
  useStore = (await import('./useStore')).useStore;
}, 30000);

/** 把进度直接铺到指定连胜状态（绕过 checkIn 的时间判定） */
function seedStreak(streak: number, lastVisit: string, freezes = 0): void {
  useStore.setState((s) => ({
    progress: { ...s.progress, streak, lastVisit, streakFreezes: freezes },
  }));
}

/** 本地日期偏移 yyyy-mm-dd */
function dayOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

beforeEach(() => {
  useStore.getState().resetAll();
});

describe('R163 · checkIn 挂载 streakProtection', () => {
  it('首次打卡 → streak=1', () => {
    useStore.getState().checkIn();
    const p = useStore.getState().progress;
    expect(p.streak).toBe(1);
    expect(p.lastVisit).toBe(dayOffset(0));
  });

  it('同日重复打卡幂等，不重复 +1', () => {
    useStore.getState().checkIn();
    useStore.getState().checkIn();
    expect(useStore.getState().progress.streak).toBe(1);
  });

  it('昨天打过 → 今天续接 +1 并刷新 longestStreak', () => {
    seedStreak(4, dayOffset(-1), 0);
    useStore.getState().checkIn();
    const p = useStore.getState().progress;
    expect(p.streak).toBe(5);
    expect(p.longestStreak).toBe(5);
  });

  it('断签 1 天且有保护卡 → 温和续接，消耗 1 张', () => {
    seedStreak(6, dayOffset(-2), 2);
    useStore.getState().checkIn();
    const p = useStore.getState().progress;
    expect(p.streak).toBe(7);
    expect(p.streakFreezes).toBe(1);
    expect(p.streakEvent).toBe('protected');
  });

  it('断签超出保护能力 → 归 1 重计，但保留已有保护卡（不惩罚式清空）', () => {
    seedStreak(9, dayOffset(-10), 2);
    useStore.getState().checkIn();
    const p = useStore.getState().progress;
    expect(p.streak).toBe(1);
    expect(p.longestStreak).toBe(9);
    expect(p.streakFreezes).toBe(2);
    expect(p.streakEvent).toBeUndefined();
  });

  it('clearStreakEvent 消费后清除标记', () => {
    seedStreak(6, dayOffset(-2), 2);
    useStore.getState().checkIn();
    expect(useStore.getState().progress.streakEvent).toBe('protected');
    useStore.getState().clearStreakEvent();
    expect(useStore.getState().progress.streakEvent).toBeUndefined();
  });
});

describe('R163 · grantStreakFreeze', () => {
  it('默认 +1，封顶 5', () => {
    useStore.setState((s) => ({ progress: { ...s.progress, streakFreezes: 4 } }));
    useStore.getState().grantStreakFreeze();
    expect(useStore.getState().progress.streakFreezes).toBe(5);
    useStore.getState().grantStreakFreeze(3);
    expect(useStore.getState().progress.streakFreezes).toBe(5);
  });
});
