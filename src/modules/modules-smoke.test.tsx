// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Mock motion/react 用 Proxy 自动支持任何 motion.xxx 标签
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, className, style, onClick, disabled }: any) =>
          createElement(tag, { className, style, onClick, disabled }, children);
      },
    }
  ),
  AnimatePresence: ({ children }: any) => children,
  MotionConfig: ({ children }: any) => children,
}));

// Mock sfx
vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxStar: vi.fn(),
  sfxWin: vi.fn(),
  setMuted: vi.fn(),
}));

import NumbersPage from './numbers/NumbersPage';
import PinyinPage from './pinyin/PinyinPage';
import WordsPage from './words/WordsPage';
import StorybookPage from './storybook/StorybookPage';
import ArtPage from './art/ArtPage';
import LettersPage from './letters/LettersPage';
import GameCenterPage from './game/GameCenterPage';

describe('核心页面架构与渲染冒烟测试', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('NumbersPage 正常渲染 4 大分类', async () => {
    await act(async () => {
      root.render(createElement(NumbersPage));
    });
    expect(container.textContent).toContain('数感启蒙');
    expect(container.textContent).toContain('算术工坊');
    expect(container.textContent).toContain('口算应用');
    expect(container.textContent).toContain('几何度量');
  });

  it('PinyinPage 正常渲染 4 大核心阶段导航', async () => {
    await act(async () => {
      root.render(createElement(PinyinPage));
    });
    expect(container.textContent).toContain('拼音字母表');
    expect(container.textContent).toContain('声韵滑滑梯');
    expect(container.textContent).toContain('易混大辨析');
    expect(container.textContent).toContain('闯关与听写');
  });

  it('WordsPage 正常渲染主导航', async () => {
    await act(async () => {
      root.render(createElement(WordsPage));
    });
    expect(container.textContent).toMatch(/课程|Course/i);
  });

  it('StorybookPage 正常渲染三大核心 Tab', async () => {
    await act(async () => {
      root.render(createElement(StorybookPage));
    });
    expect(container.textContent).toMatch(/AI 绘本工坊|绘本书架|经典故事分馆/i);
  });

  it('ArtPage 正常渲染色彩与画板工坊', async () => {
    await act(async () => {
      root.render(createElement(ArtPage));
    });
    expect(container.textContent).toContain('色彩认知');
    expect(container.textContent).toContain('魔法调色盘');
    expect(container.textContent).toContain('自由画板');
  });

  it('LettersPage 正常渲染', async () => {
    await act(async () => {
      root.render(createElement(LettersPage));
    });
    expect(container.textContent).toMatch(/字母乐园|Alphabet/i);
  });

  it('GameCenterPage 正常渲染', async () => {
    await act(async () => {
      root.render(createElement(GameCenterPage));
    });
    expect(container.textContent).toMatch(/游戏中心|Game/i);
  });
});
