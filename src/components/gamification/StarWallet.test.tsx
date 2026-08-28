// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createElement, act, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { StarWallet, StarWalletConnected, type StarWalletProps } from './StarWallet';
import {
  CAPSULE_PRIZES,
  DEFAULT_DAILY_CAP,
  REWARD_CATALOG,
  capsuleOdds,
  capsuleStats,
  drawCapsule as rollCapsule,
  earnStars,
  nextRewardGoal,
  pityRemaining,
  redeem,
  rewardStage,
} from '@/game/rewardEconomy';
import type { RewardEconomyApi } from '@/game/useRewardEconomy';
import { clearMemoryFallback, safeGetJSON } from '@/lib/safeStorage';

// ─────────────────────────────────────────────────────────────
// 测试替身：用真实纯函数 + 内存态构造 api，行为与生产一致且完全可控
// ─────────────────────────────────────────────────────────────

function createFakeApi(init: {
  balance?: number;
  lifetime?: number;
  earnedToday?: number;
  dailyCap?: number;
  owned?: string[];
  collection?: string[];
  pity?: number;
  masteredCount?: number;
} = {}) {
  const s = {
    balance: init.balance ?? 0,
    lifetime: init.lifetime ?? 0,
    earnedToday: init.earnedToday ?? 0,
    dailyCap: init.dailyCap ?? DEFAULT_DAILY_CAP,
    owned: init.owned ?? [],
    collection: init.collection ?? [],
    pity: init.pity ?? 0,
  };
  const log = { unlocks: [] as string[], draws: [] as (number | undefined)[] };

  const api: RewardEconomyApi = {
    get balance() { return s.balance; },
    get lifetime() { return s.lifetime; },
    get earnedToday() { return s.earnedToday; },
    get dailyCap() { return s.dailyCap; },
    get owned() { return s.owned; },
    get collection() { return s.collection; },
    get pity() { return s.pity; },
    get odds() { return capsuleOdds(); },
    get pityRemaining() { return pityRemaining(s.pity); },
    get stage() { return rewardStage(init.masteredCount ?? 0); },
    get goal() { return nextRewardGoal(s.balance, s.owned); },
    get stats() { return capsuleStats(s.collection); },
    degraded: false,

    recordSession: (outcome) => {
      const r = earnStars(outcome, { earnedToday: s.earnedToday, dailyCap: s.dailyCap });
      s.balance += r.granted;
      s.lifetime += r.granted;
      s.earnedToday += r.granted;
      return r;
    },
    unlock: (id) => {
      log.unlocks.push(id);
      const item = REWARD_CATALOG.find((entry) => entry.id === id);
      if (!item) {
        return { ok: false, balance: s.balance, unlocked: [], message: '这个奖励暂时找不到啦，换一个试试！', shortfall: 0 };
      }
      const r = redeem(s.balance, item, s.owned);
      if (r.ok) {
        s.balance = r.balance;
        s.owned = [...s.owned, id];
      }
      return r;
    },
    drawCapsule: (seed) => {
      log.draws.push(seed);
      const cost = REWARD_CATALOG[0].cost;
      if (s.balance < cost) {
        return { ok: false, draw: null, balance: s.balance, message: `再集 ${cost - s.balance} 颗星，就能转一次扭蛋啦！` };
      }
      const d = rollCapsule({ pity: s.pity, owned: s.collection, ...(seed === undefined ? {} : { seed }) });
      s.balance = s.balance - cost + d.refund;
      if (!d.duplicate) s.collection = [...s.collection, d.prize.id];
      s.pity = d.pityAfter;
      return { ok: true, draw: d, balance: s.balance, message: d.message };
    },
    resetAll: () => {
      s.balance = 0;
      s.lifetime = 0;
      s.earnedToday = 0;
      s.owned = [];
      s.collection = [];
      s.pity = 0;
    },
  };

  return { api, log, state: s };
}

function render(ui: ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    rerender: (next: ReactElement) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function mount(props: Omit<StarWalletProps, 'api'> & { api?: RewardEconomyApi }, fake = createFakeApi()) {
  const api = props.api ?? fake.api;
  const view = render(createElement(StarWallet, { ...props, api }));
  return { ...view, fake, api };
}

function text(container: HTMLElement, testId: string): string {
  return container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
}

function click(el: Element | null): void {
  if (!el) throw new Error('找不到可点击元素');
  act(() => {
    (el as HTMLElement).click();
  });
}

function query<T extends Element>(container: HTMLElement, selector: string): T {
  const el = container.querySelector<T>(selector);
  if (!el) throw new Error(`找不到元素：${selector}`);
  return el;
}

beforeEach(() => {
  localStorage.clear();
  clearMemoryFallback();
});

describe('StarWallet · 余额与目标', () => {
  it('渲染余额、当日与累计', () => {
    const { container } = mount({}, createFakeApi({ balance: 42, lifetime: 300, earnedToday: 12 }));
    const body = container.textContent ?? '';
    expect(body).toContain('42');
    expect(body).toContain('今天收集');
    expect(body).toContain('累计');
    expect(body).toContain('300');
  });

  it('目标进度条带完整 ARIA，文案是「还差 N 颗星」而非否定式', () => {
    const { container } = mount({}, createFakeApi({ balance: 3 }));
    const bar = query<HTMLElement>(container, '[role="progressbar"]');
    expect(bar.getAttribute('aria-valuenow')).toBe('3');
    expect(bar.getAttribute('aria-valuemax')).toBe(String(REWARD_CATALOG[0].cost));
    expect(bar.getAttribute('aria-valuetext')).toContain('还差 2 颗星');
    expect(container.textContent).toContain('还差 2 颗星');
    expect(container.textContent).not.toContain('不足');
  });

  it('刚好够解锁时播报「可以解锁啦」而非「还差 0 颗星」', () => {
    const { container } = mount({}, createFakeApi({ balance: REWARD_CATALOG[0].cost }));
    const bar = query<HTMLElement>(container, '[role="progressbar"]');
    expect(bar.getAttribute('aria-valuetext')).toContain('可以解锁啦');
    expect(bar.getAttribute('aria-valuetext')).not.toContain('还差 0');
    expect(container.textContent).toContain('可以解锁啦');
  });

  it('全部奖励解锁后给出成就式收尾，而不是空白', () => {
    const all = REWARD_CATALOG.map((item) => item.id);
    const { container } = mount({}, createFakeApi({ balance: 999, owned: all }));
    expect(container.textContent).toContain('全部奖励都解锁啦');
  });

  it('当日触顶给认可式收尾（「今天够多啦」而非「已达上限」）', () => {
    const { container } = mount({}, createFakeApi({ earnedToday: DEFAULT_DAILY_CAP }));
    expect(container.textContent).toContain('今天收集的星星够多啦');
    expect(container.textContent).not.toContain('已达上限');
    expect(container.textContent).not.toContain('超限');
  });

  it('每日上限可通过 api 覆盖，触顶判断跟随 api 而非硬编码', () => {
    const { container } = mount({}, createFakeApi({ earnedToday: 4, dailyCap: 4 }));
    expect(container.textContent).toContain('今天收集的星星够多啦');
  });
});

describe('StarWallet · 奖励小屋', () => {
  it('列出全部目录奖励，已拥有的标记为已拥有', () => {
    const { container } = mount({}, createFakeApi({ owned: ['theme-candy'] }));
    for (const item of REWARD_CATALOG) {
      expect(container.querySelector(`[data-testid="reward-${item.id}"]`)).not.toBeNull();
    }
    const owned = query<HTMLElement>(container, '[data-testid="reward-theme-candy"]');
    expect(owned.getAttribute('aria-label')).toContain('已拥有');
    expect(owned.textContent).toContain('已拥有');
  });

  it('星星足够 → 点击解锁并播报成功文案', () => {
    const { container, fake } = mount({}, createFakeApi({ balance: 20 }));
    click(container.querySelector('[data-testid="reward-theme-candy"]'));
    expect(fake.log.unlocks).toEqual(['theme-candy']);
    expect(text(container, 'wallet-notice')).toContain('解锁成功');
    expect(fake.state.balance).toBe(8);
  });

  it('星星不足 → 保持可点并给目标型文案，余额不变（不足不惩罚）', () => {
    const { container, fake } = mount({}, createFakeApi({ balance: 3 }));
    const btn = query<HTMLElement>(container, '[data-testid="reward-theme-candy"]');
    expect(btn.hasAttribute('disabled')).toBe(false);
    click(btn);
    expect(text(container, 'wallet-notice')).toContain('再集 9 颗星');
    expect(fake.state.balance).toBe(3);
  });

  it('重复点击已拥有的奖励 → 温和提示且不重复扣款', () => {
    const { container, fake } = mount({}, createFakeApi({ balance: 100, owned: ['theme-candy'] }));
    click(container.querySelector('[data-testid="reward-theme-candy"]'));
    expect(fake.state.balance).toBe(100);
    expect(text(container, 'wallet-notice')).toContain('已经拥有');
  });
});

describe('StarWallet · 扭蛋机与概率公示（合规）', () => {
  it('概率公示常驻可见：三档齐全、百分比两位小数', () => {
    const { container } = mount({}, createFakeApi({ balance: 100 }));
    const oddsText = text(container, 'capsule-odds');
    for (const label of ['普通', '稀有', '史诗']) {
      expect(oddsText).toContain(label);
    }
    for (const o of capsuleOdds()) {
      expect(oddsText).toContain(o.percent);
      expect(o.percent).toMatch(/^\d+\.\d{2}%$/);
    }
  });

  it('保底剩余次数常驻可见', () => {
    const { container } = mount({}, createFakeApi({ balance: 100, pity: 2 }));
    expect(container.textContent).toContain('再抽 3 次必出稀有');
  });

  it('星星不足 → 扭蛋按钮禁用并给「再集 N 颗星」', () => {
    const { container, fake } = mount({}, createFakeApi({ balance: 2 }));
    const btn = query<HTMLButtonElement>(container, '[data-testid="capsule-draw"]');
    expect(btn.disabled).toBe(true);
    expect(container.textContent).toContain('再集 3 颗星就能转啦');
    click(btn);
    expect(fake.log.draws).toHaveLength(0);
  });

  it('星星足够 → 转一次扣费、入册、播报奖品；相同 seed 结果可复现', () => {
    const first = mount({ seed: 20260828 }, createFakeApi({ balance: 100 }));
    click(first.container.querySelector('[data-testid="capsule-draw"]'));
    expect(first.fake.state.balance).toBe(100 - REWARD_CATALOG[0].cost);
    expect(first.fake.state.collection).toHaveLength(1);
    expect(text(first.container, 'wallet-notice')).toContain('抽到了');
    const firstPrize = first.fake.state.collection[0];

    const second = mount({ seed: 20260828 }, createFakeApi({ balance: 100 }));
    click(second.container.querySelector('[data-testid="capsule-draw"]'));
    expect(second.fake.state.collection[0]).toBe(firstPrize);
  });

  it('抽到重复奖品 → 返星，绝不出现「白抽一次」', () => {
    const all = CAPSULE_PRIZES.map((prize) => prize.id);
    const { container, fake } = mount({ seed: 7 }, createFakeApi({ balance: 100, collection: all }));
    click(container.querySelector('[data-testid="capsule-draw"]'));
    expect(fake.state.balance).toBeGreaterThan(100 - REWARD_CATALOG[0].cost);
    expect(text(container, 'wallet-notice')).toContain('已经有了');
  });
});

describe('StarWallet · 收集册与奖励淡出', () => {
  it('收集册展示三档进度，空态给引导而非空白', () => {
    const empty = mount({}, createFakeApi());
    expect(empty.container.textContent).toContain('0/');
    expect(empty.container.textContent).toContain('还没有收集到小礼物');

    const filled = mount({}, createFakeApi({ collection: ['cap-flower', 'cap-star-sticker'] }));
    expect(filled.container.textContent).toContain('2/');
  });

  it('奖励淡出到自主期：标题转向「我学会啦」，但星星依然可见', () => {
    const { container } = mount({ masteredCount: 500 }, createFakeApi({ balance: 88, masteredCount: 500 }));
    const body = container.textContent ?? '';
    expect(body).toContain('我学会啦');
    expect(body).toContain('已经掌握');
    // 完全撤除认可会让低龄儿童失去「被看见」的感觉 —— 星星必须仍在
    expect(body).toContain('88');
  });

  it('起步期标题为「我的星星」', () => {
    const { container } = mount({ masteredCount: 0 }, createFakeApi({ balance: 5, masteredCount: 0 }));
    expect(container.textContent).toContain('我的星星');
  });
});

describe('StarWallet · 无障碍与存储降级', () => {
  it('全部可点元素都是真实 button，且带 aria-label', () => {
    const { container } = mount({}, createFakeApi({ balance: 500 }));
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.tagName).toBe('BUTTON');
      expect(btn.getAttribute('type')).toBe('button');
      expect(btn.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('操作结果走 aria-live，屏幕阅读器能即时播报', () => {
    const { container } = mount({}, createFakeApi({ balance: 500 }));
    const notice = query<HTMLElement>(container, '[data-testid="wallet-notice"]');
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.getAttribute('aria-live')).toBe('polite');

    click(container.querySelector('[data-testid="reward-theme-candy"]'));
    expect(text(container, 'wallet-notice')).toContain('解锁成功');
  });

  it('存储降级时给温和提示，且不阻断学习', () => {
    const fake = createFakeApi({ balance: 10 });
    const degradedApi: RewardEconomyApi = { ...fake.api, degraded: true };
    const { container } = mount({ api: degradedApi });
    expect(container.textContent).toContain('暂时存不住进度');
    // 降级下奖励依然可解锁
    click(container.querySelector('[data-testid="reward-capsule-basic"]'));
    expect(text(container, 'wallet-notice')).toContain('解锁成功');
  });

  it('reducedMotion 时不挂动画', () => {
    const { container } = mount({ reducedMotion: true }, createFakeApi({ balance: 500 }));
    const btn = query<HTMLElement>(container, '[data-testid="capsule-draw"]');
    expect(btn.style.animation).toBe('');
    const reward = query<HTMLElement>(container, '[data-testid="reward-theme-candy"]');
    expect(reward.style.animation).toBe('');
  });

  it('可通过开关关闭奖励小屋 / 扭蛋机 / 收集册', () => {
    const { container } = mount(
      { showRewards: false, showCapsule: false, showCollection: false },
      createFakeApi({ balance: 500 }),
    );
    expect(container.querySelector('[data-testid="reward-theme-candy"]')).toBeNull();
    expect(container.querySelector('[data-testid="capsule-draw"]')).toBeNull();
    expect(container.textContent).not.toContain('收集册');
  });
});

describe('StarWallet · 儿童向护栏（防回退断言）', () => {
  it('界面全量文案不含付费 / 排名 / 惩罚话术', () => {
    const { container } = mount({}, createFakeApi({ balance: 3 }));
    click(container.querySelector('[data-testid="reward-theme-candy"]'));
    click(container.querySelector('[data-testid="capsule-draw"]'));
    const body = container.textContent ?? '';
    expect(body).not.toMatch(/购买|付费|充值|会员|VIP|人民币|价格/);
    expect(body).not.toMatch(/排名|排行|对战|击败|第一名|输了|失败/);
  });
});

describe('StarWalletConnected · drop-in 集成', () => {
  it('挂载后读取存档，解锁后写回 localStorage', () => {
    localStorage.setItem(
      'bb:reward-economy',
      JSON.stringify({ version: 1, balance: 40, owned: [], collection: [], pity: 0, earnedToday: 0, day: '2026-08-28' }),
    );
    const view = render(createElement(StarWalletConnected, {}));
    expect(view.container.textContent).toContain('40');

    click(view.container.querySelector('[data-testid="reward-theme-candy"]'));
    expect(text(view.container, 'wallet-notice')).toContain('解锁成功');

    const stored = safeGetJSON<{ balance: number; owned: string[] }>('bb:reward-economy', {
      balance: -1,
      owned: [],
    });
    expect(stored.balance).toBe(28);
    expect(stored.owned).toEqual(['theme-candy']);
    view.unmount();
  });

  it('掌握量传入时驱动奖励淡出（端到端连通 hook → UI）', () => {
    const view = render(createElement(StarWalletConnected, { masteredCount: 500 }));
    expect(view.container.textContent).toContain('我学会啦');
    expect(view.container.textContent).toContain('已经掌握');
    view.unmount();
  });
});
