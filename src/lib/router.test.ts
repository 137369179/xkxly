/**
 * router.ts 单元测试
 * ------------------------------------------------------------------
 * 覆盖 navigate 函数和 hash 同步逻辑：
 *   1. navigate 设置 location.hash
 *   2. navigate 同步通知 listeners（不等异步 hashchange）
 *   3. hashchange 事件触发通知（浏览器前进/后退、地址栏输入）
 *   4. parseHash 路由解析（无效路由回退、param 解析）
 *   5. 边界情况
 *
 * 测试环境为 node，router.ts 依赖 window，因此用 vi.hoisted
 * 在 import 之前 mock 全局 window 对象。
 */
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';

/* ------------------------------------------------------------------ */
/* 用 vi.hoisted 在所有 import 之前 mock window                        */
/* ------------------------------------------------------------------ */
const mock = vi.hoisted(() => {
  /** 模拟浏览器的 hashchange 事件监听器集合 */
  const hashchangeListeners = new Set<(e: { type: string }) => void>();
  /** 当前 hash 值 */
  let currentHash = '';

  /** 模拟 window 对象 */
  const fakeWindow = {
    location: {
      get hash() {
        return currentHash;
      },
      set hash(v: string) {
        const old = currentHash;
        currentHash = v;
        if (old !== v) {
          // 模拟浏览器的异步 hashchange 事件（下一个事件循环触发）
          setTimeout(() => {
            hashchangeListeners.forEach((l) => l({ type: 'hashchange' }));
          }, 0);
        }
      },
    },
    addEventListener(event: string, listener: (e: { type: string }) => void) {
      if (event === 'hashchange') hashchangeListeners.add(listener);
    },
    removeEventListener(event: string, listener: (e: { type: string }) => void) {
      if (event === 'hashchange') hashchangeListeners.delete(listener);
    },
  };

  // 注入到全局，让 router.ts 模块加载时 typeof window !== 'undefined'
  (globalThis as unknown as { window: typeof fakeWindow }).window = fakeWindow;

  return {
    /** 直接设置 hash（不触发 hashchange，模拟程序内部设置） */
    setHash(h: string) {
      currentHash = h;
    },
    /** 获取当前 hash */
    getHash() {
      return currentHash;
    },
    /** 手动触发 hashchange 事件（模拟浏览器前进/后退） */
    fireHashchange() {
      hashchangeListeners.forEach((l) => l({ type: 'hashchange' }));
    },
    /** 重置 hash 为空（不清空 hashchangeListeners，保留 router.ts 注册的监听器） */
    resetHash() {
      currentHash = '';
    },
  };
});

/* 在 mock window 之后 import router（vi.hoisted 保证顺序） */
import { navigate, subscribe, ROUTES } from './router';

/* ------------------------------------------------------------------ */
/* 测试                                                                */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  mock.resetHash();
});

afterEach(() => {
  mock.resetHash();
});

/* ------------------------------------------------------------------ */
/* 1. navigate · hash 设置                                             */
/* ------------------------------------------------------------------ */
describe('navigate · hash 设置', () => {
  it('navigate 到有效路由会设置 location.hash', () => {
    navigate('numbers');
    expect(mock.getHash()).toBe('#/numbers');
  });

  it('navigate 带 param 会拼接在 hash 中', () => {
    navigate('poems', '42');
    expect(mock.getHash()).toBe('#/poems/42');
  });

  it('navigate 不带 param 时 hash 不含尾部斜杠', () => {
    navigate('hanzi');
    expect(mock.getHash()).toBe('#/hanzi');
  });

  it('navigate 到相同 hash 不重复设置 location.hash', () => {
    mock.setHash('#/numbers');
    navigate('numbers');
    expect(mock.getHash()).toBe('#/numbers');
  });

  it('navigate 到所有已注册路由都能正确设置 hash', () => {
    for (const route of ROUTES) {
      navigate(route);
      expect(mock.getHash()).toBe(`#/${route}`);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 2. navigate · 通知（经 hashchange 异步通道）                          */
/* 实现说明：navigate 仅设置 location.hash，通知统一由 hashchange       */
/* 单一通道异步触发，避免「导航一次、副作用触发两次」的脆弱性。         */
/* ------------------------------------------------------------------ */
describe('navigate · 通知（hashchange 通道）', () => {
  it('navigate 到新路由会经 hashchange 异步通知 listeners', async () => {
    const calls: string[] = [];
    const unsub = subscribe((loc) => calls.push(loc.route));

    navigate('numbers');
    expect(mock.getHash()).toBe('#/numbers');
    // 尚未到事件循环，hashchange 未触发
    expect(calls).not.toContain('numbers');

    await new Promise((r) => setTimeout(r, 10));
    expect(calls).toContain('numbers');
    unsub();
  });

  it('navigate 带 param 会异步通知完整路由信息', async () => {
    const calls: { route: string; param?: string }[] = [];
    const unsub = subscribe((loc) => calls.push({ route: loc.route, param: loc.param }));

    navigate('poems', '12');
    await new Promise((r) => setTimeout(r, 10));
    expect(calls.at(-1)).toEqual({ route: 'poems', param: '12' });
    unsub();
  });

  it('navigate 到相同 hash 不重复设置也不通知（no-op）', async () => {
    mock.setHash('#/numbers');
    const calls: string[] = [];
    const unsub = subscribe((loc) => calls.push(loc.route));

    navigate('numbers'); // hash 没变，navigate 不设置 → 无 hashchange
    await new Promise((r) => setTimeout(r, 10));
    expect(calls.length).toBe(0);
    unsub();
  });

  it('subscribe 返回的取消函数能正确移除 listener', async () => {
    const calls: string[] = [];
    const unsub = subscribe((loc) => calls.push(loc.route));

    navigate('numbers');
    await new Promise((r) => setTimeout(r, 10));
    expect(calls.length).toBe(1);

    unsub();
    navigate('poems');
    await new Promise((r) => setTimeout(r, 10));
    expect(calls.length).toBe(1); // 不再收到通知
  });

  it('多个 listener 同时订阅时都会收到通知', async () => {
    const callsA: string[] = [];
    const callsB: string[] = [];
    const unsubA = subscribe((loc) => callsA.push(loc.route));
    const unsubB = subscribe((loc) => callsB.push(loc.route));

    navigate('hanzi');
    await new Promise((r) => setTimeout(r, 10));
    expect(callsA).toContain('hanzi');
    expect(callsB).toContain('hanzi');

    unsubA();
    unsubB();
  });
});

/* ------------------------------------------------------------------ */
/* 3. hash 同步 · hashchange 事件                                      */
/* ------------------------------------------------------------------ */
describe('hash 同步 · hashchange 事件', () => {
  it('浏览器前进/后退触发 hashchange 时会通知 listeners', () => {
    const calls: { route: string; param?: string }[] = [];
    const unsub = subscribe((loc) => calls.push({ route: loc.route, param: loc.param }));

    mock.setHash('#/poems');
    mock.fireHashchange();

    expect(calls.at(-1)).toEqual({ route: 'poems', param: undefined });
    unsub();
  });

  it('直接修改 location.hash 后触发 hashchange 会通知 listeners', () => {
    const calls: string[] = [];
    const unsub = subscribe((loc) => calls.push(loc.route));

    mock.setHash('#/hanzi');
    mock.fireHashchange();

    expect(calls.at(-1)).toBe('hanzi');
    unsub();
  });

  it('navigate 设置 hash 后异步触发 hashchange 通知', async () => {
    const calls: string[] = [];
    const unsub = subscribe((loc) => calls.push(loc.route));

    navigate('numbers');
    // navigate 同步只设置 hash，通知由 hashchange 异步触发
    expect(mock.getHash()).toBe('#/numbers');
    expect(calls).not.toContain('numbers');

    await new Promise((r) => setTimeout(r, 10));
    expect(calls).toContain('numbers');
    expect(calls.filter((r) => r === 'numbers').length).toBe(1); // 仅一次（单一通道）
    unsub();
  });

  it('navigate 到相同 hash 不会触发 hashchange（避免重复通知）', async () => {
    mock.setHash('#/numbers');
    const calls: string[] = [];
    const unsub = subscribe((loc) => calls.push(loc.route));

    navigate('numbers'); // hash 没变，navigate 不设置 hash → 无 hashchange
    await new Promise((r) => setTimeout(r, 10));
    // 没有任何通知（navigate no-op，且 hashchange 未触发）
    expect(calls.length).toBe(0);
    unsub();
  });
});

/* ------------------------------------------------------------------ */
/* 4. parseHash · 路由解析                                             */
/* ------------------------------------------------------------------ */
describe('parseHash · 路由解析', () => {
  it('无效路由回退到 home', () => {
    const calls: { route: string }[] = [];
    const unsub = subscribe((loc) => calls.push({ route: loc.route }));

    mock.setHash('#/invalid-route');
    mock.fireHashchange();

    expect(calls.at(-1)?.route).toBe('home');
    unsub();
  });

  it('空 hash 回退到 home', () => {
    const calls: { route: string }[] = [];
    const unsub = subscribe((loc) => calls.push({ route: loc.route }));

    mock.setHash('');
    mock.fireHashchange();

    expect(calls.at(-1)?.route).toBe('home');
    unsub();
  });

  it('带 param 的路由正确解析 param', () => {
    const calls: { route: string; param?: string }[] = [];
    const unsub = subscribe((loc) => calls.push({ route: loc.route, param: loc.param }));

    mock.setHash('#/poems/42');
    mock.fireHashchange();

    expect(calls.at(-1)).toEqual({ route: 'poems', param: '42' });
    unsub();
  });

  it('多段路径只取第一段作为 param', () => {
    const calls: { route: string; param?: string }[] = [];
    const unsub = subscribe((loc) => calls.push({ route: loc.route, param: loc.param }));

    mock.setHash('#/adventure/level/3');
    mock.fireHashchange();

    expect(calls.at(-1)).toEqual({ route: 'adventure', param: 'level' });
    unsub();
  });

  it('hash 以 #/ 开头时正确去除前缀', () => {
    const calls: string[] = [];
    const unsub = subscribe((loc) => calls.push(loc.route));

    mock.setHash('#/letters');
    mock.fireHashchange();

    expect(calls.at(-1)).toBe('letters');
    unsub();
  });

  it('hash 以 # 不带斜杠时也能解析', () => {
    const calls: string[] = [];
    const unsub = subscribe((loc) => calls.push(loc.route));

    mock.setHash('#words');
    mock.fireHashchange();

    expect(calls.at(-1)).toBe('words');
    unsub();
  });
});

/* ------------------------------------------------------------------ */
/* 5. navigate · 边界情况                                              */
/* ------------------------------------------------------------------ */
describe('navigate · 边界情况', () => {
  it('连续 navigate 不同路由都能正确切换', async () => {
    const calls: string[] = [];
    const unsub = subscribe((loc) => calls.push(loc.route));

    navigate('numbers');
    await new Promise((r) => setTimeout(r, 10));
    navigate('poems');
    await new Promise((r) => setTimeout(r, 10));
    navigate('hanzi');
    await new Promise((r) => setTimeout(r, 10));

    expect(calls).toEqual(['numbers', 'poems', 'hanzi']);
    expect(mock.getHash()).toBe('#/hanzi');
    unsub();
  });

  it('navigate 相同路由带不同 param 会更新 hash', () => {
    navigate('poems', '1');
    expect(mock.getHash()).toBe('#/poems/1');

    navigate('poems', '2');
    expect(mock.getHash()).toBe('#/poems/2');
  });

  it('navigate 从带 param 到不带 param 会更新 hash', () => {
    mock.setHash('#/poems/42');
    navigate('poems');
    expect(mock.getHash()).toBe('#/poems');
  });

  it('navigate 到 home 路由设置 #/home', () => {
    navigate('home');
    expect(mock.getHash()).toBe('#/home');
  });

  it('navigate 到 today 路由设置 #/today', () => {
    navigate('today');
    expect(mock.getHash()).toBe('#/today');
  });
});
