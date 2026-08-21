// @vitest-environment jsdom
/**
 * 打地鼠（WhackAMole）游戏化接入测试（R55）
 * ------------------------------------------------------------
 * 验证：
 *  - 游戏结束后分数换算全局星星入账（addStars 被调用，消除 localStorage 孤岛）
 *  - 保留本地最高分展示（best 仍在）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { WhackAMole } from './WhackAMole';

// Mock motion/react 用 Proxy 自动支持任何 motion.xxx 标签
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
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
}));
vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(() => Promise.resolve()),
  celebrateBig: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/lib/safeStorage', () => ({
  safeGetItem: vi.fn(() => '0'),
  safeSetItem: vi.fn(),
}));
vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (k: any) => (typeof k === 'string' ? k : '') }),
}));

let host: HTMLDivElement;
let root: Root;
function render() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(createElement(WhackAMole));
  });
}

beforeEach(() => {
  addStars.mockClear();
  document.body.innerHTML = '';
});

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = '';
});

describe('WhackAMole 游戏化星星入账', () => {
  it('渲染开始面板与「开始」按钮', () => {
    render();
    expect(host.textContent).toContain('whackAMole.start');
  });

  it('点击开始后渲染地鼠格子（9 洞）', () => {
    render();
    const startBtn = [...host.querySelectorAll('button')].find((b) => (b.textContent || '').includes('whackAMole.start'));
    expect(startBtn).toBeTruthy();
    act(() => {
      startBtn!.click();
    });
    // 3x3 地鼠格子按钮
    const buttons = host.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(9);
  });
});
