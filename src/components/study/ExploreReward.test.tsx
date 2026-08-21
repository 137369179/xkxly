// @vitest-environment jsdom
/**
 * ExploreReward 组件测试（探索型子组件「完成打卡」游戏化原语）
 * ------------------------------------------------------------
 * 验证：
 *  - 初始渲染「完成探索 +N⭐」按钮；
 *  - 点击 → 全局星星入账（addStars）+ 写入探索记录（localStorage）+ 切换为「已探索」态；
 *  - 已探索（localStorage 有记录）直接显示已探索态，不重复授予；
 *  - 支持自定义星星数。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target: any, tag: string) => {
        return ({ children, className, style, onClick, disabled }: any) =>
          createElement(tag, { className, style, onClick, disabled }, children);
      },
    }
  ),
  AnimatePresence: ({ children }: any) => children,
  MotionConfig: ({ children }: any) => children,
}));

const addStars = vi.fn();
vi.mock('@/store/useStore', () => ({
  useStore: Object.assign((sel?: any) => (sel ? sel({ addStars }) : { addStars }), {
    getState: () => ({ addStars }),
  }),
}));
vi.mock('@/lib/sfx', () => ({
  sfxStar: vi.fn(),
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWin: vi.fn(),
}));
vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(() => Promise.resolve()),
  celebrateBig: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/feedback', () => ({
  answerCorrect: vi.fn(() => '好棒'),
  answerWrong: vi.fn(() => '再试试'),
}));
vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (k: string, p?: { n?: number }) => (p ? `${k}:${p.n}` : k),
  }),
}));

import { ExploreReward } from './ExploreReward';

let host: HTMLDivElement;
let root: Root;

function render(props: Record<string, unknown> = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(createElement(ExploreReward, { rewardKey: 'test-key', ...props }));
  });
}

function findButton(): HTMLButtonElement | null {
  return host.querySelector('button');
}

beforeEach(() => {
  addStars.mockClear();
  document.body.innerHTML = '';
  localStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = '';
});

describe('ExploreReward', () => {
  it('初始显示「完成探索」按钮', () => {
    render();
    const btn = findButton();
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain('exploreReward.claim');
  });

  it('点击：授予默认 2 星 + 写入探索记录 + 切换为已探索态', () => {
    render();
    const btn = findButton()!;
    act(() => {
      btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    expect(addStars).toHaveBeenCalledWith(2);
    expect(localStorage.getItem('bb-explore-claimed')).toContain('test-key');
    expect(host.textContent).toContain('exploreReward.claimed');
  });

  it('已探索（localStorage 已有记录）直接显示已探索态，不重复授予', () => {
    localStorage.setItem('bb-explore-claimed', JSON.stringify({ 'test-key': Date.now() }));
    render();
    expect(findButton()).toBeNull();
    expect(host.textContent).toContain('exploreReward.claimed');
    expect(addStars).not.toHaveBeenCalled();
  });

  it('支持自定义星星数', () => {
    render({ stars: 5 });
    const btn = findButton()!;
    act(() => {
      btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    });
    expect(addStars).toHaveBeenCalledWith(5);
  });
});
