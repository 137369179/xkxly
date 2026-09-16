// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createElement, act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ModuleGameShell, moduleLabel } from './ModuleGameShell';
import type { Progress } from '@/types';
import { clearMemoryFallback } from '@/lib/safeStorage';

// ─────────────────────────────────────────────────────────────
// 测试替身：store 只提供外壳真正用到的三个出口（星星余额 / 已花费 / 命令态）
// ─────────────────────────────────────────────────────────────
const storeState = vi.hoisted(() => ({
  stars: 7,
  spent: 0,
}));

const storeShape = {
  get progress() {
    return { stars: storeState.stars, spent: storeState.spent };
  },
  addStars: () => {},
  spendStars: () => true,
  buySticker: () => true,
};

vi.mock('@/store/useStore', () => {
  const useStore = (sel?: (s: unknown) => unknown) => (sel ? sel(storeShape) : storeShape);
  (useStore as unknown as { getState: () => unknown }).getState = () => storeShape;
  return {
    useStore,
    useStars: () => storeState.stars,
    useSpent: () => storeState.spent,
  };
});

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_t: unknown, tag: string) =>
        ({ children, ...rest }: Record<string, unknown>) =>
          createElement(tag, rest, children as never),
    },
  ),
  AnimatePresence: ({ children }: { children?: ReactElement }) => children ?? null,
  MotionConfig: ({ children }: { children?: ReactElement }) => children ?? null,
}));

function makeProgress(): Progress {
  return {
    mastery: {},
    diffOverrides: {},
    wrongBook: [],
    stars: storeState.stars,
    spent: storeState.spent,
    badges: [],
  } as unknown as Progress;
}

let roots: Root[] = [];
let hosts: HTMLDivElement[] = [];

function mount(node: ReactElement): HTMLDivElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  hosts.push(host);
  act(() => {
    root.render(node);
  });
  return host;
}

function click(el: Element | null | undefined): void {
  if (!el) throw new Error('click target missing');
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  storeState.stars = 7;
  storeState.spent = 0;
});

afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
  hosts.forEach((h) => h.remove());
  hosts = [];
  clearMemoryFallback();
});

describe('ModuleGameShell', () => {
  it('一行包裹即同时给出冒险路线、星星余额与星星小屋入口（奖励解锁闭环）', () => {
    const host = mount(
      createElement(ModuleGameShell, {
        module: 'hanzi',
        level: 1,
        progress: makeProgress(),
        children: createElement('p', null, '练习闭环'),
      }),
    );
    const text = host.textContent ?? '';
    expect(text).toContain('练习闭环');
    // 星星余额可见 —— 赚到的星星孩子必须看得见
    expect(text).toContain('我的星星');
    expect(text).toContain('7');
    // 星星小屋入口存在 —— 否则星星只能赚不能花，闭环断裂
    const entry = Array.from(host.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('星星小屋'),
    );
    expect(entry).toBeTruthy();
    expect(entry?.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('点击星星小屋入口展开兑换面板，关闭态不渲染面板内容', () => {
    const host = mount(
      createElement(ModuleGameShell, {
        module: 'words',
        level: 2,
        progress: makeProgress(),
        children: createElement('p', null, '词语练习'),
      }),
    );
    expect(host.textContent).not.toContain('星星银行');

    const entry = Array.from(host.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('星星小屋'),
    );
    click(entry);

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(host.textContent).toContain('星星银行');
  });

  it('showReward=false 时不渲染星星小屋入口（家长极简模式可关闭）', () => {
    const host = mount(
      createElement(ModuleGameShell, {
        module: 'numbers',
        level: 3,
        progress: makeProgress(),
        showReward: false,
        children: createElement('p', null, '数学练习'),
      }),
    );
    expect(host.textContent).not.toContain('星星小屋');
  });

  it('showAdventure=false 时仍渲染 children（外壳不因降级丢内容）', () => {
    const host = mount(
      createElement(ModuleGameShell, {
        module: 'numbers',
        level: 1,
        progress: makeProgress(),
        showAdventure: false,
        showReward: false,
        showHud: false,
        children: createElement('p', null, '纯练习'),
      }),
    );
    expect(host.textContent).toContain('纯练习');
  });

  it('同种子渲染出同一条冒险路线（课堂可复现）', () => {
    const mk = (seed: number) =>
      createElement(ModuleGameShell, {
        module: 'hanzi',
        level: 2,
        progress: makeProgress(),
        seed,
        showReward: false,
        children: createElement('p', null, 'x'),
      });
    const a = mount(mk(20260916)).textContent;
    const b = mount(mk(20260916)).textContent;
    const c = mount(mk(999)).textContent;
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('moduleLabel 返回学科中文名', () => {
    expect(moduleLabel('hanzi')).toBe('识字');
    expect(moduleLabel('words')).toBe('词语');
    expect(moduleLabel('numbers')).toBe('数学');
  });
});
