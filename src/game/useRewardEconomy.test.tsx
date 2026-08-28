// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  useRewardEconomy,
  createRewardState,
  normalizeRewardState,
  rewardDayKey,
  REWARD_STORAGE_KEY,
  REWARD_STATE_VERSION,
  type RewardEconomyApi,
  type UseRewardEconomyOptions,
} from './useRewardEconomy';
import { CAPSULE_PRIZES, PITY_THRESHOLD, REWARD_CATALOG } from './rewardEconomy';
import type { SessionOutcome } from './rewardEconomy';
import { clearMemoryFallback, safeGetJSON } from '@/lib/safeStorage';

const KEY = REWARD_STORAGE_KEY;

function Harness({
  apiRef,
  options,
}: {
  apiRef: { current: RewardEconomyApi | null };
  options?: UseRewardEconomyOptions;
}) {
  apiRef.current = useRewardEconomy(options ?? {});
  return null;
}

interface Mounted {
  /** 读取最新一次渲染的 API 快照 */
  api: () => RewardEconomyApi;
  rerender: (next?: UseRewardEconomyOptions) => void;
  unmount: () => void;
}

function mount(options?: UseRewardEconomyOptions): Mounted {
  const apiRef: { current: RewardEconomyApi | null } = { current: null };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(createElement(Harness, { apiRef, options }));
  });
  return {
    api: () => {
      const current = apiRef.current;
      if (!current) throw new Error('hook 尚未挂载');
      return current;
    },
    rerender: (next?: UseRewardEconomyOptions) => {
      act(() => {
        root.render(createElement(Harness, { apiRef, options: next }));
      });
    },
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

/**
 * 在 act 内执行变更并取回返回值。
 *
 * 必须包 act：否则 setState 不会同步刷新，读到的会是上一次渲染的旧快照，
 * 更糟的是被延迟的更新会在后续用例里才落盘，造成跨用例状态污染。
 */
function capture<T>(fn: () => T): T {
  const box: { value: T }[] = [];
  act(() => {
    box.push({ value: fn() });
  });
  const head = box[0];
  if (!head) throw new Error('act 未同步执行回调');
  return head.value;
}

function readStored(): Record<string, unknown> {
  const raw = safeGetJSON<unknown>(KEY, null);
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function seed(partial: Record<string, unknown>): void {
  localStorage.setItem(KEY, JSON.stringify({ ...createRewardState('2020-01-01'), ...partial }));
}

/** 一节课结果：5 题全对、最长连击 5 */
const PERFECT_SESSION: SessionOutcome = { module: 'hanzi', total: 5, correct: 5, bestCombo: 5 };

describe('useRewardEconomy · 水合与持久化', () => {
  beforeEach(() => {
    localStorage.clear();
    clearMemoryFallback();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('首次挂载 → 空状态并落盘一份合法存档', () => {
    const h = mount();
    expect(h.api().balance).toBe(0);
    expect(h.api().owned).toEqual([]);
    const stored = readStored();
    expect(stored['version']).toBe(REWARD_STATE_VERSION);
    expect(stored['balance']).toBe(0);
    h.unmount();
  });

  it('已有存档 → 水合出余额与已解锁列表', () => {
    seed({ balance: 42, owned: ['theme-candy'], collection: ['cap-flower'], pity: 2 });
    const h = mount();
    expect(h.api().balance).toBe(42);
    expect(h.api().owned).toEqual(['theme-candy']);
    expect(h.api().collection).toEqual(['cap-flower']);
    expect(h.api().pity).toBe(2);
    h.unmount();
  });

  it('记录一节课 → 余额增加、明细可读、并写盘', () => {
    const h = mount();
    // 评级 3（全对）+ 连击 2（≥5）+ 全对 1 = 6
    const result = capture(() => h.api().recordSession(PERFECT_SESSION));
    expect(result.granted).toBe(6);
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(h.api().balance).toBe(6);
    expect(h.api().lifetime).toBe(6);
    expect(readStored()['balance']).toBe(6);
    h.unmount();
  });

  it('重新挂载（模拟刷新页面）→ 余额与收集册不丢', () => {
    const first = mount();
    capture(() => first.api().recordSession(PERFECT_SESSION));
    expect(first.api().balance).toBe(6);
    first.unmount();

    const second = mount();
    expect(second.api().balance).toBe(6);
    expect(second.api().lifetime).toBe(6);
    second.unmount();
  });

  it('状态未变化 → 不重复写盘（StrictMode 双调用安全）', () => {
    const spy = vi.spyOn(window.localStorage, 'setItem');
    const h = mount();
    const writesAfterMount = spy.mock.calls.filter((call) => call[0] === KEY).length;
    expect(writesAfterMount).toBeGreaterThan(0);

    // resetAll 在空状态下算出的 state 与已落盘内容一致 → 不应再写一次
    capture(() => h.api().resetAll());
    const writesAfterReset = spy.mock.calls.filter((call) => call[0] === KEY).length;
    expect(writesAfterReset).toBe(writesAfterMount);
    h.unmount();
  });
});

describe('useRewardEconomy · 跨天翻转', () => {
  beforeEach(() => {
    localStorage.clear();
    clearMemoryFallback();
  });

  it('跨天只重置当日入账，余额 / 已解锁 / 收集册 / 保底全部保留', () => {
    seed({
      balance: 88,
      lifetime: 200,
      owned: ['theme-candy', 'pet-snack'],
      collection: ['cap-flower', 'cap-note'],
      pity: 3,
      earnedToday: 30,
      day: '2020-01-01',
    });
    const h = mount();
    expect(h.api().earnedToday).toBe(0);
    expect(h.api().balance).toBe(88);
    expect(h.api().lifetime).toBe(200);
    expect(h.api().owned).toEqual(['theme-candy', 'pet-snack']);
    expect(h.api().collection).toEqual(['cap-flower', 'cap-note']);
    expect(h.api().pity).toBe(3);
    h.unmount();
  });

  it('跨天后当日上限重新计账（昨天刷满，今天仍能拿到星星）', () => {
    seed({ balance: 500, earnedToday: 30, day: '2020-01-01' });
    const h = mount();
    const result = capture(() => h.api().recordSession(PERFECT_SESSION));
    expect(result.capped).toBe(0);
    expect(result.granted).toBe(6);
    h.unmount();
  });

  it('同一天内超过每日上限 → 截断，被截断的部分不入账', () => {
    const h = mount({ dailyCap: 4 });
    const result = capture(() => h.api().recordSession(PERFECT_SESSION));
    expect(result.raw).toBe(6);
    expect(result.granted).toBe(4);
    expect(result.capped).toBe(2);
    expect(h.api().balance).toBe(4);
    h.unmount();
  });

  it('rewardDayKey 使用本地日期而非 UTC', () => {
    // 本地时间 2026-01-01 00:30 —— 按 UTC 换算会退回 2025-12-31
    expect(rewardDayKey(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
  });
});

describe('useRewardEconomy · 损坏存档自愈', () => {
  beforeEach(() => {
    localStorage.clear();
    clearMemoryFallback();
  });

  it('balance 类型非法 → 回落 0，但其余字段照样抢救回来', () => {
    seed({ balance: '很多颗', owned: ['theme-candy'], collection: ['cap-flower'] });
    const h = mount();
    expect(h.api().balance).toBe(0);
    // 关键：不能因为一个字段坏掉就丢掉整份存档
    expect(h.api().owned).toEqual(['theme-candy']);
    expect(h.api().collection).toEqual(['cap-flower']);
    h.unmount();
  });

  it('owned 含非法 / 已下架 id → 过滤，合法项保留', () => {
    seed({ owned: ['theme-candy', '不存在的奖励', 42, null, 'theme-ocean'] });
    const h = mount();
    expect(h.api().owned).toEqual(['theme-candy', 'theme-ocean']);
    h.unmount();
  });

  it('重复 id → 去重', () => {
    seed({ owned: ['theme-candy', 'theme-candy', 'theme-candy'] });
    const h = mount();
    expect(h.api().owned).toEqual(['theme-candy']);
    h.unmount();
  });

  it('负数钳到 0；非数字回落默认（NaN 经 JSON 落盘后为 null，同样安全）', () => {
    seed({ balance: -50, lifetime: Number.NaN });
    const h = mount();
    expect(h.api().balance).toBe(0);
    expect(h.api().lifetime).toBe(0);
    h.unmount();
  });

  it('Infinity 视为越界而非无效 → 钳到上界（JSON 无法承载 Infinity，直接校验纯函数）', () => {
    // 保底计数被写成 Infinity 时，正确做法是钳到保底阈值让孩子下一次就触发
    // 保底，而不是清零后让他再抽五次普通档。
    const state = normalizeRewardState({
      balance: Number.POSITIVE_INFINITY,
      pity: Number.POSITIVE_INFINITY,
    });
    expect(state.pity).toBe(PITY_THRESHOLD);
    expect(state.balance).toBe(9999);
  });

  it('存档不是对象（null / 数组 / 字符串 / 空串 / 残缺 JSON）→ 空状态且不抛错', () => {
    for (const bad of ['null', '[]', '"字符串"', '""', '{', '123']) {
      localStorage.setItem(KEY, bad);
      const h = mount();
      expect(h.api().balance).toBe(0);
      expect(h.api().owned).toEqual([]);
      h.unmount();
    }
  });

  it('版本字段缺失 / 不认识 → 仍逐字段抢救（绝不因版本号清空存档）', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ balance: 77, owned: ['badge-brave'], collection: ['cap-cloud'] }),
    );
    const missing = mount();
    expect(missing.api().balance).toBe(77);
    expect(missing.api().owned).toEqual(['badge-brave']);
    missing.unmount();

    localStorage.setItem(
      KEY,
      JSON.stringify({ version: 999, balance: 77, owned: ['badge-brave'] }),
    );
    const future = mount();
    expect(future.api().balance).toBe(77);
    expect(future.api().owned).toEqual(['badge-brave']);
    future.unmount();
  });

  it('normalizeRewardState 为纯函数，可脱离 React 直接校验', () => {
    expect(normalizeRewardState({ balance: 12, owned: ['pet-hat'] }, '2026-08-28')).toEqual({
      version: REWARD_STATE_VERSION,
      balance: 12,
      lifetime: 0,
      owned: ['pet-hat'],
      collection: [],
      pity: 0,
      earnedToday: 0,
      day: '2026-08-28',
    });
  });
});

describe('useRewardEconomy · 解锁与扭蛋', () => {
  beforeEach(() => {
    localStorage.clear();
    clearMemoryFallback();
  });

  it('余额足够 → 解锁成功、扣款、写入已解锁列表', () => {
    seed({ balance: 20 });
    const h = mount();
    const result = capture(() => h.api().unlock('theme-candy')); // cost 12
    expect(result.ok).toBe(true);
    expect(result.balance).toBe(8);
    expect(h.api().balance).toBe(8);
    expect(h.api().owned).toEqual(['theme-candy']);
    expect(readStored()['owned']).toEqual(['theme-candy']);
    h.unmount();
  });

  it('余额不足 → 目标型文案而非否定型，且余额纹丝不动', () => {
    seed({ balance: 5 });
    const h = mount();
    const result = capture(() => h.api().unlock('theme-candy')); // cost 12
    expect(result.ok).toBe(false);
    expect(result.shortfall).toBe(7);
    expect(result.message).toContain('再集 7 颗星');
    expect(result.message).not.toContain('不够');
    expect(h.api().balance).toBe(5);
    h.unmount();
  });

  it('重复解锁同一奖励 → 拒绝（不重复扣款）', () => {
    seed({ balance: 100, owned: ['theme-candy'] });
    const h = mount();
    const result = capture(() => h.api().unlock('theme-candy'));
    expect(result.ok).toBe(false);
    expect(h.api().balance).toBe(100);
    expect(h.api().owned).toEqual(['theme-candy']);
    h.unmount();
  });

  it('解锁不存在的 id → 安全失败，不抛错、不扣款', () => {
    seed({ balance: 100 });
    const h = mount();
    const result = capture(() => h.api().unlock('这个奖励不存在'));
    expect(result.ok).toBe(false);
    expect(h.api().balance).toBe(100);
    h.unmount();
  });

  it('扭蛋：余额不足 → 温和目标型提示，且不扣费', () => {
    const h = mount();
    const outcome = capture(() => h.api().drawCapsule(1));
    expect(outcome.ok).toBe(false);
    expect(outcome.draw).toBeNull();
    expect(outcome.message).toContain('再集');
    expect(h.api().balance).toBe(0);
    h.unmount();
  });

  it('扭蛋：余额足够 → 扣费并入册', () => {
    seed({ balance: 30 });
    const h = mount();
    const outcome = capture(() => h.api().drawCapsule(1));
    expect(outcome.ok).toBe(true);
    expect(outcome.draw).not.toBeNull();
    const cost = REWARD_CATALOG[0].cost;
    expect(h.api().balance).toBe(30 - cost + (outcome.draw?.refund ?? 0));
    if (outcome.draw && !outcome.draw.duplicate) {
      expect(h.api().collection).toContain(outcome.draw.prize.id);
    }
    h.unmount();
  });

  it('扭蛋：相同 seed → 相同结果（确定性，便于回归）', () => {
    seed({ balance: 100 });
    const first = mount();
    const a = capture(() => first.api().drawCapsule(20260828));
    first.unmount();

    localStorage.clear();
    clearMemoryFallback();
    seed({ balance: 100 });
    const second = mount();
    const b = capture(() => second.api().drawCapsule(20260828));
    second.unmount();

    expect(a.draw?.prize.id).toBe(b.draw?.prize.id);
  });

  it('扭蛋：重复奖品 → 返还星星，绝不出现「白抽一次」', () => {
    const allIds = CAPSULE_PRIZES.map((prize) => prize.id);
    seed({ balance: 100, collection: allIds });
    const h = mount();
    const outcome = capture(() => h.api().drawCapsule(3));
    expect(outcome.ok).toBe(true);
    expect(outcome.draw?.duplicate).toBe(true);
    expect(outcome.draw?.refund).toBeGreaterThan(0);
    expect(h.api().balance).toBeGreaterThan(100 - REWARD_CATALOG[0].cost);
    h.unmount();
  });

  it('解锁后下一个目标自动前移（永远看得见下一个够得着的目标）', () => {
    seed({ balance: 100 });
    const h = mount();
    const before = h.api().goal?.item.id;
    capture(() => h.api().unlock(before ?? ''));
    expect(h.api().goal?.item.id).not.toBe(before);
    h.unmount();
  });

  it('resetAll 清空全部进度（仅家长中心可用）', () => {
    seed({ balance: 300, owned: ['theme-candy'], collection: ['cap-flower'] });
    const h = mount();
    capture(() => h.api().resetAll());
    expect(h.api().balance).toBe(0);
    expect(h.api().lifetime).toBe(0);
    expect(h.api().owned).toEqual([]);
    expect(h.api().collection).toEqual([]);
    h.unmount();
  });
});

describe('useRewardEconomy · 降级与多标签页', () => {
  beforeEach(() => {
    localStorage.clear();
    clearMemoryFallback();
  });

  it('存储不可用（storage-error）→ degraded=true，游戏照常进行', () => {
    const h = mount();
    expect(h.api().degraded).toBe(false);
    act(() => {
      window.dispatchEvent(new CustomEvent('storage-error', { detail: { name: KEY } }));
    });
    expect(h.api().degraded).toBe(true);
    // 降级后依然能正常记分，只是进度不保证跨会话保留
    const result = capture(() => h.api().recordSession(PERFECT_SESSION));
    expect(result.granted).toBeGreaterThan(0);
    expect(h.api().balance).toBe(6);
    h.unmount();
  });

  it('其他键的存储错误不会误报为当前模块降级', () => {
    const h = mount();
    act(() => {
      window.dispatchEvent(new CustomEvent('storage-error', { detail: { name: '别的键' } }));
    });
    expect(h.api().degraded).toBe(false);
    h.unmount();
  });

  it('另一标签页写入 → 本页跟随同步（家长中心 + 学习页并存场景）', () => {
    const h = mount();
    expect(h.api().balance).toBe(0);
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: KEY,
          newValue: JSON.stringify({ ...createRewardState(), balance: 55, owned: ['pet-snack'] }),
        }),
      );
    });
    expect(h.api().balance).toBe(55);
    expect(h.api().owned).toEqual(['pet-snack']);
    h.unmount();
  });

  it('另一标签页清空 → 本页不跟随（避免一次误触抹掉两处进度）', () => {
    seed({ balance: 66 });
    const h = mount();
    expect(h.api().balance).toBe(66);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: null }));
    });
    expect(h.api().balance).toBe(66);
    h.unmount();
  });

  it('切换 storageKey → 重新水合新槽位，且不会把旧数据写进新键', () => {
    seed({ balance: 77 });
    localStorage.setItem('bb:reward-other', JSON.stringify({ ...createRewardState(), balance: 9 }));

    const h = mount();
    expect(h.api().balance).toBe(77);
    h.rerender({ storageKey: 'bb:reward-other' });
    expect(h.api().balance).toBe(9);
    expect(safeGetJSON<{ balance: number }>('bb:reward-other', { balance: -1 }).balance).toBe(9);
    h.unmount();
  });
});

describe('useRewardEconomy · 儿童向护栏（防回退断言）', () => {
  beforeEach(() => {
    localStorage.clear();
    clearMemoryFallback();
  });

  it('全部文案不含付费 / 排名 / 惩罚话术', () => {
    seed({ balance: 3 });
    const h = mount();
    const texts: string[] = [
      capture(() => h.api().unlock('theme-candy')).message,
      capture(() => h.api().unlock('theme-candy')).message,
      capture(() => h.api().drawCapsule(1)).message,
      capture(() => h.api().unlock('不存在')).message,
    ];
    for (const text of texts) {
      expect(text).not.toMatch(/购买|付费|充值|会员|VIP|人民币|价格/);
      expect(text).not.toMatch(/排名|排行|对战|击败|第一名|输了|失败/);
    }
    h.unmount();
  });

  it('余额永不为负：任何操作序列后 balance >= 0', () => {
    const h = mount();
    capture(() => h.api().unlock('badge-star')); // 200 星，余额 0 → 失败
    capture(() => h.api().drawCapsule(1)); // 5 星，余额 0 → 失败
    expect(h.api().balance).toBe(0);
    capture(() => h.api().recordSession({ module: 'numbers', total: 5, correct: 1, bestCombo: 1 }));
    expect(h.api().balance).toBeGreaterThanOrEqual(0);
    capture(() => h.api().unlock('badge-star'));
    expect(h.api().balance).toBeGreaterThanOrEqual(0);
    h.unmount();
  });

  it('答错也拿得到星星（错误不是惩罚）', () => {
    const h = mount();
    const result = capture(() =>
      h.api().recordSession({ module: 'words', total: 5, correct: 2, bestCombo: 1 }),
    );
    expect(result.granted).toBeGreaterThan(0);
    expect(h.api().balance).toBeGreaterThan(0);
    h.unmount();
  });

  it('奖励淡出：掌握量高时附加星折算，但基础评级星不打折', () => {
    const rookie = mount({ masteredCount: 0 });
    const rookieGain = capture(() => rookie.api().recordSession(PERFECT_SESSION)).granted;
    rookie.unmount();

    localStorage.clear();
    clearMemoryFallback();
    const veteran = mount({ masteredCount: 500 });
    const veteranResult = capture(() => veteran.api().recordSession(PERFECT_SESSION));
    const ratingStars = veteranResult.breakdown.find((item) => item.source === 'rating')?.stars ?? 0;
    expect(veteranResult.granted).toBeLessThan(rookieGain);
    // 评级星属于胜任感反馈，永不打折
    expect(ratingStars).toBe(3);
    expect(veteranResult.granted).toBeGreaterThan(0);
    veteran.unmount();
  });

  it('对外暴露概率公示：三档百分比两位小数且合计 100%（UI 原样展示即可合规）', () => {
    const h = mount();
    const odds = h.api().odds;
    expect(odds).toHaveLength(3);
    for (const o of odds) {
      expect(o.percent).toMatch(/^\d+\.\d{2}%$/);
      expect(o.total).toBeGreaterThan(0);
    }
    const sum = odds.reduce((acc, o) => acc + Number.parseFloat(o.percent), 0);
    expect(sum).toBeCloseTo(100, 6);
    h.unmount();
  });

  it('保底进度可见：抽到普通档后剩余次数递减，触发保底归零', () => {
    seed({ balance: 500 });
    const h = mount();
    expect(h.api().pityRemaining).toBe(PITY_THRESHOLD);

    // 连续抽，记录 pityRemaining 的变化；保底触发时应回到满值或 0
    const remainings: number[] = [];
    for (let i = 0; i < 6; i++) {
      capture(() => h.api().drawCapsule(100 + i));
      remainings.push(h.api().pityRemaining);
    }
    for (const value of remainings) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(PITY_THRESHOLD);
    }
    h.unmount();
  });

  it('收集册进度可展示（普通 / 稀有 / 史诗各已收几件）', () => {
    seed({ collection: ['cap-flower', 'cap-star-sticker'] });
    const h = mount();
    expect(h.api().stats.length).toBe(3);
    const common = h.api().stats.find((stat) => stat.tier === 'common');
    expect(common?.ownedCount).toBe(2);
    expect(common?.total).toBeGreaterThanOrEqual(2);
    h.unmount();
  });
});
