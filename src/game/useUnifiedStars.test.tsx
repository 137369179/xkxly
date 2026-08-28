// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useUnifiedStars, type UnifiedStarsApi } from './useUnifiedStars';
import {
  REWARD_STORAGE_KEY,
  REWARD_STATE_VERSION,
  rewardDayKey,
  type UseRewardEconomyOptions,
} from './useRewardEconomy';
import { LEDGER_MIGRATION_KEY, LEDGER_MIGRATION_VERSION } from './starLedger';
import type { SessionOutcome } from './rewardEconomy';
import { useStore } from '@/store/useStore';
import { initialProgress } from '@/store/storeShared';
import { clearMemoryFallback, safeGetJSON, safeSetJSON } from '@/lib/safeStorage';

interface Mounted {
  api: () => UnifiedStarsApi;
  unmount: () => void;
}

function mount(options?: UseRewardEconomyOptions): Mounted {
  const apiRef: { current: UnifiedStarsApi | null } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  function Harness() {
    apiRef.current = useUnifiedStars(options ?? {});
    return null;
  }

  act(() => {
    root.render(createElement(Harness));
  });

  return {
    api: () => {
      const current = apiRef.current;
      if (!current) throw new Error('hook 尚未挂载');
      return current;
    },
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

/** 把主账本（store）重置到指定余额 */
function setStoreLedger(stars: number, spent: number): void {
  useStore.setState({ progress: { ...initialProgress, stars, spent } });
}

/**
 * 构造一节课结果。
 * `module` 是必填字段 —— 早期版本漏传它时 vitest 仍能跑通（vitest 不做类型检查），
 * 实际是在拿 undefined 模块做断言，属于测试失真；现按真实契约补齐。
 */
function session(overrides: Partial<SessionOutcome> = {}): SessionOutcome {
  return { module: 'hanzi', total: 5, correct: 5, bestCombo: 0, ...overrides };
}

/** 直接铺一份星星经济层存档，用于构造「两本不一致」的场景 */
function seedRewardState(partial: Partial<Record<string, unknown>>): void {
  safeSetJSON(REWARD_STORAGE_KEY, {
    version: REWARD_STATE_VERSION,
    balance: 0,
    lifetime: 0,
    owned: [],
    collection: [],
    pity: 0,
    earnedToday: 0,
    day: rewardDayKey(),
    ...partial,
  });
}

describe('useUnifiedStars · 星星账本统一层', () => {
  beforeEach(() => {
    localStorage.clear();
    clearMemoryFallback();
    setStoreLedger(0, 0);
  });

  afterEach(() => {
    localStorage.clear();
    clearMemoryFallback();
    setStoreLedger(0, 0);
  });

  describe('余额唯一真源', () => {
    it('可用星星取自 store 统一口径（store 100 / 花 20 → 80）', () => {
      setStoreLedger(100, 20);
      const view = mount();
      try {
        expect(view.api().available).toBe(80);
        expect(view.api().lifetime).toBe(100);
      } finally {
        view.unmount();
      }
    });

    it('即使星星经济层另有余额，对外也只给一个数字', () => {
      // 这是本层存在的全部意义：两个账本并存时，界面永远只看到一个余额。
      setStoreLedger(100, 20);
      seedRewardState({ balance: 7, lifetime: 7 });
      const view = mount();
      try {
        const api = view.api();
        expect(api.available).toBe(80);
        // 持续对账把 store-ahead 的差额补进玩法层后，两本账重新对齐：
        // 偏离归零，孩子不会再从任何界面看到第二个数字
        expect(api.divergence).toBe('none');
        expect(api.gap).toBe(0);
        expect(api.notice).toBeNull();
      } finally {
        view.unmount();
      }
    });

    it('存档损坏（花掉多于赚得）时不出现负余额', () => {
      setStoreLedger(5, 50);
      const view = mount();
      try {
        expect(view.api().available).toBe(0);
      } finally {
        view.unmount();
      }
    });
  });

  describe('收入双写', () => {
    it('一节课的星星同时进主账本与玩法层（挣得到也花得掉）', () => {
      const view = mount();
      try {
        // 必须包 act：否则 setState 延迟刷新，api() 读到的是上一轮渲染的旧快照。
        // （R161 已踩过同一个坑：延迟的更新还会污染后续用例。）
        let granted = 0;
        act(() => {
          granted = view.api().recordSession(session()).granted;
        });
        expect(granted).toBeGreaterThan(0);
        // 主账本必须同步入账，否则孩子挣的星在成长荣誉馆里看不到
        expect(useStore.getState().progress.stars).toBe(granted);
        expect(view.api().lifetime).toBe(granted);
      } finally {
        view.unmount();
      }
    });

    it('每日上限触顶后当日入账不再增长（护栏不被绕过）', () => {
      const view = mount();
      try {
        const cap = view.api().dailyCap;
        let total = 0;
        for (let i = 0; i < cap + 5; i += 1) {
          act(() => {
            total += view.api().recordSession(session()).granted;
          });
        }
        expect(total).toBeGreaterThan(0);
        // 上限是防刷护栏：无论记多少次，当日入账都不该越过去
        expect(view.api().earnedToday).toBeLessThanOrEqual(cap);
        // 玩法层记的「今日所得」不该超过主账本真实入账，否则口径又分叉了
        expect(view.api().earnedToday).toBeLessThanOrEqual(
          useStore.getState().progress.stars,
        );
      } finally {
        view.unmount();
      }
    });
  });

  describe('一次性迁移（永不丢星）', () => {
    it('星星经济层领先时，把差额补记进主账本', () => {
      setStoreLedger(0, 0);
      seedRewardState({ balance: 40, lifetime: 40 });
      const view = mount();
      try {
        // 孩子在星星经济层挣的 40 颗必须回到主账本，否则等于成果被抹掉
        expect(useStore.getState().progress.stars).toBe(40);
        expect(view.api().available).toBe(40);
      } finally {
        view.unmount();
      }
    });

    it('迁移只做一次 —— 重复挂载不会反复印星', () => {
      setStoreLedger(0, 0);
      seedRewardState({ balance: 40, lifetime: 40 });

      const first = mount();
      first.unmount();
      expect(useStore.getState().progress.stars).toBe(40);

      // 手动把主账本清零，模拟「外部把余额改坏了」的最坏情况；
      // 迁移标记仍在，因此**不应该**再次补记 —— 否则等于凭空印星。
      setStoreLedger(0, 0);
      const second = mount();
      try {
        expect(useStore.getState().progress.stars).toBe(0);
      } finally {
        second.unmount();
      }
    });

    it('迁移标记落盘且版本正确', () => {
      setStoreLedger(0, 0);
      seedRewardState({ balance: 12, lifetime: 12 });
      const view = mount();
      view.unmount();

      const marker = safeGetJSON<{ version: number; migrated: number } | null>(
        LEDGER_MIGRATION_KEY,
        null,
      );
      expect(marker).not.toBeNull();
      expect(marker?.version).toBe(LEDGER_MIGRATION_VERSION);
      expect(marker?.migrated).toBe(12);
    });

    it('没有差额时不写入迁移标记（避免无意义的状态膨胀）', () => {
      setStoreLedger(30, 0);
      seedRewardState({ balance: 0, lifetime: 0 });
      const view = mount();
      view.unmount();
      expect(safeGetJSON<unknown>(LEDGER_MIGRATION_KEY, null)).toBeNull();
    });
  });

  describe('支出走既有通道', () => {
    it('贴纸消费仍走 store 通道，不另建一套账本', () => {
      setStoreLedger(50, 0);
      const view = mount();
      try {
        let ok = false;
        act(() => {
          ok = view.api().buySticker('sticker-a', 10);
        });
        expect(ok).toBe(true);
        expect(useStore.getState().progress.spent).toBe(10);
        expect(view.api().available).toBe(40);
      } finally {
        view.unmount();
      }
    });

    it('星星不够时贴纸消费失败，且不产生负余额', () => {
      setStoreLedger(5, 0);
      const view = mount();
      try {
        let ok = true;
        act(() => {
          ok = view.api().buySticker('sticker-a', 10);
        });
        expect(ok).toBe(false);
        expect(useStore.getState().progress.spent).toBe(0);
        expect(view.api().available).toBe(5);
      } finally {
        view.unmount();
      }
    });
  });

  describe('儿童向护栏（防回退）', () => {
    it('概率公示与保底进度始终可读', () => {
      const view = mount();
      try {
        const api = view.api();
        expect(api.odds.length).toBeGreaterThan(0);
        for (const o of api.odds) {
          expect(o.percent).toMatch(/^\d+\.\d{2}%$/);
        }
        expect(api.pityRemaining).toBeGreaterThanOrEqual(0);
      } finally {
        view.unmount();
      }
    });

    it('任何账本组合下可用星星都不会是负数（随机 200 组）', () => {
      let seed = 987654321;
      const rand = (): number => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
      };
      for (let i = 0; i < 200; i += 1) {
        const stars = Math.floor(rand() * 100);
        const spent = Math.floor(rand() * 150);
        setStoreLedger(stars, spent);
        const view = mount();
        try {
          expect(view.api().available).toBeGreaterThanOrEqual(0);
        } finally {
          view.unmount();
        }
      }
    });
  });
});
