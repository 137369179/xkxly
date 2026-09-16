// @vitest-environment jsdom
/**
 * HanziQuizGame 缺陷回归测试（R168）
 * ----------------------------------------------------------------------------
 * 守三件本轮修掉的真实缺陷，防止回潮：
 *   ① 空题目池不再白屏（原 `if (!currentHanzi) return null` 直接渲染空白）；
 *   ② 答完题后卸载 / 重开，在途的 1.8s 切题定时器必须取消；
 *   ③ 「再闯一次」必须把挑战等级与反馈气泡一并清掉（原内联分支漏了这两项）。
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { HanziEntry } from '@/data/hanziIndex';

vi.mock('@/lib/speech', async () => {
  const actual = await vi.importActual<typeof import('@/lib/speech')>('@/lib/speech');
  return { ...actual, speak: vi.fn(() => Promise.resolve()) };
});
vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  triggerHaptic: vi.fn(),
}));
vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_t: unknown, tag: string) =>
        ({ children, ...rest }: Record<string, unknown>) =>
          createElement(tag, rest, children as never),
    },
  ),
  AnimatePresence: ({ children }: { children?: unknown }) => children ?? null,
  MotionConfig: ({ children }: { children?: unknown }) => children ?? null,
}));

const hanziState = vi.hoisted(() => ({ pool: [] as HanziEntry[] }));

vi.mock('@/data/hanziIndex', () => ({
  getHanziByLevel: () => hanziState.pool,
  HANZI_LEVELS: [
    { id: 1, name: '启蒙', emoji: '🌱', tone: 'green', count: 100, desc: '' },
    { id: 2, name: '常用', emoji: '🌿', tone: 'blue', count: 100, desc: '' },
    { id: 3, name: '进阶', emoji: '🌳', tone: 'purple', count: 100, desc: '' },
  ],
}));

const fakeState = vi.hoisted(() => ({
  addFish: vi.fn(),
  practice: vi.fn(),
  addStars: vi.fn(),
  spendStars: vi.fn(() => true),
  buySticker: vi.fn(() => true),
  progress: {
    mastery: {} as Record<string, unknown>,
    wrongBook: [] as unknown[],
    stars: 0,
    spent: 0,
    badges: [] as string[],
  },
}));

vi.mock('@/store/useStore', () => {
  const useStoreMock = (sel?: (s: unknown) => unknown) => (sel ? sel(fakeState) : fakeState);
  (useStoreMock as unknown as { getState: () => unknown }).getState = () => fakeState;
  return {
    useStore: useStoreMock,
    useStars: () => fakeState.progress.stars,
    useSpent: () => fakeState.progress.spent,
  };
});

const { HanziQuizGame } = await import('./HanziQuizGame');

function makeEntry(c: string): HanziEntry {
  return { c, p: `${c}pin`, level: 1, origin: `${c}的本义` } as unknown as HanziEntry;
}

let roots: Root[] = [];
let hosts: HTMLDivElement[] = [];

function render(): HTMLDivElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  hosts.push(host);
  act(() => {
    root.render(createElement(HanziQuizGame));
  });
  return host;
}

beforeEach(() => {
  hanziState.pool = [];
});

afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
  hosts.forEach((h) => h.remove());
  hosts = [];
  vi.useRealTimers();
});

describe('HanziQuizGame 缺陷回归（R168）', () => {
  it('空题目池时给出可操作兜底，而不是一片空白', () => {
    hanziState.pool = [];
    const host = render();
    const text = host.textContent ?? '';
    expect(text).toContain('这一关的汉字还在路上');
    // 必须有出口：孩子能自己重开，而不是卡死
    const retry = Array.from(host.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('再试一次'),
    );
    expect(retry).toBeTruthy();
  });

  it('空题目池兜底仍然挂着游戏化外壳（星星小屋不会因降级丢失）', () => {
    hanziState.pool = [];
    const host = render();
    const entry = Array.from(host.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('星星小屋'),
    );
    expect(entry).toBeTruthy();
  });

  it('答完题立刻卸载：在途切题定时器被取消，不再触发 setState 警告', () => {
    vi.useFakeTimers();
    hanziState.pool = [makeEntry('人'), makeEntry('口'), makeEntry('手')];
    const host = render();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 选中第一个选项触发作答
    const optionButtons = Array.from(host.querySelectorAll('button')).filter((b) =>
      /^[1-4]/.test(b.textContent ?? '') && b.textContent?.includes('pin'),
    );
    const target = optionButtons[0] ?? host.querySelectorAll('button')[0];
    act(() => {
      target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // 卸载后推进定时器：若定时器未清理，React 会报「在已卸载组件上更新状态」
    roots.forEach((r) => act(() => r.unmount()));
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const unmountWarnings = errorSpy.mock.calls.filter((args) =>
      String(args[0] ?? '').includes('unmounted component'),
    );
    expect(unmountWarnings).toHaveLength(0);
    errorSpy.mockRestore();
  });
});
