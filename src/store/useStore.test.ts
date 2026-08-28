import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import type { Progress } from '@/types';
import { PIN_FAIL_LIMIT } from '@/lib/pin';

/**
 * node 环境下 zustand persist 初始化会访问 localStorage，
 * 先提供一个最小内存垫片，避免模块加载即抛错。
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

// 在 localStorage 垫片就绪后再加载 store（其模块初始化会触发 persist 读盘）
let useStore: typeof import('./useStore').useStore;
let useSettingsStore: typeof import('./useSettingsStore').useSettingsStore;
beforeAll(async () => {
  const { useStore: us } = await import('./useStore');
  useStore = us;
  ({ useSettingsStore } = await import('./useSettingsStore'));
}, 30000);

beforeEach(() => {
  // 每个用例前把进度复位到干净基线
  useStore.getState().resetAll();
  // settings 已迁移至 useSettingsStore，同步重置 PIN 状态
  useSettingsStore.getState().clearPin();
});

describe('useStore · 练习掌握度回写', () => {
  it('答对后 mastery / stars / wrongBook 正确回写', () => {
    const before = useStore.getState().progress.stars;
    useStore.getState().practice('letter:A', true, 2);
    const { progress } = useStore.getState();

    expect(progress.mastery['letter:A']).toBeDefined();
    expect(progress.mastery['letter:A']!.lv).toBe(1);

    /*
     * 星星断言说明：
     * applyProgress 在结算后会检测新解锁勋章并自动补发绑定奖励（见 data/medals.ts），
     * 因此 progress.stars 的增量 = practice 本次发放 + 勋章补发，不是恒定值。
     * 这里用两条稳定断言替代脆弱的「等于 2」：
     *   1. dailyLog 只记录 practice 自身发放的星星，勋章补发不写入 → 可精确校验为 2；
     *   2. 总星数至少涨到 practice 发放量，避免回写丢失。
     */
    const today = Object.keys(progress.dailyLog).sort().pop()!;
    expect(progress.dailyLog[today]!.stars).toBe(2);
    expect(progress.dailyLog[today]!.items).toBe(1);
    expect(progress.dailyLog[today]!.ok).toBe(1);
    expect(progress.stars).toBeGreaterThanOrEqual(before + 2);

    expect(Array.isArray(progress.wrongBook)).toBe(true);
    expect(progress.wrongBook).not.toContain('letter:A');
  });

  it('答错后该知识点进入错题本', () => {
    useStore.getState().practice('math:add', false);
    const { progress } = useStore.getState();

    expect(progress.mastery['math:add']).toBeDefined();
    expect(progress.wrongBook).toContain('math:add');
  });
});

describe('useStore · restoreProgress 兜底', () => {
  it('缺字段老数据合并不抛错且字段完整', () => {
    expect(() => useStore.getState().restoreProgress({ stars: 9 } as Progress)).not.toThrow();
    const { progress } = useStore.getState();

    expect(progress.stars).toBe(9);
    expect(progress.mastery).toBeDefined();
    expect(Array.isArray(progress.wrongBook)).toBe(true);
  });
});

describe('useStore · PIN 锁定（委托 useSettingsStore）', () => {
  it('连续失败达到上限触发锁定（pinLockUntil 被设置）', () => {
    for (let i = 0; i < PIN_FAIL_LIMIT - 1; i++) {
      useStore.getState().recordPinFail();
    }
    // 未达到上限前不应锁定
    expect(useSettingsStore.getState().settings.pinLockUntil).toBe(0);

    useStore.getState().recordPinFail();
    const { settings } = useSettingsStore.getState();
    expect(settings.pinFails).toBe(PIN_FAIL_LIMIT);
    expect(settings.pinLockUntil).toBeGreaterThan(0);
  });
});
