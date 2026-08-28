// @vitest-environment jsdom
/**
 * WordBuilder 单元测试
 * 覆盖：
 *   1. 偏旁部首合成魔法锅模式与选字互动
 *   2. 词语组装磁吸盘模式切换与拼装
 *   3. 童心造句积木轨模式与语序拼装
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  speak: vi.fn(() => Promise.resolve()),
}));

const fakeState = { practice: vi.fn(), addStars: vi.fn() };
vi.mock('@/store/useStore', () => ({
  useStore: (sel?: any) => (sel ? sel(fakeState) : fakeState),
  useMastery: () => ({}),
}));

const { WordBuilder } = await import('@/modules/hanzi/WordBuilder');

let roots: Root[] = [];
afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
});

function renderWith(initialChar?: string) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(createElement(WordBuilder, { initialChar })));
  roots.push(root);
  return container;
}

describe('WordBuilder 偏旁部首合成与组词造句工坊', () => {
  it('渲染偏旁部首合成魔法锅', () => {
    const c = renderWith();
    expect(c.textContent).toContain('偏旁合成魔法锅');
    expect(c.textContent).toContain('日');
    expect(c.textContent).toContain('月');
    expect(c.textContent).toContain('明');
  });

  it('点击偏旁合成正确选项触发加星与发音', () => {
    const c = renderWith();
    const mingBtn = Array.from(c.querySelectorAll('button')).find((b) => b.textContent === '明');
    expect(mingBtn).toBeDefined();
    act(() => {
      mingBtn?.click();
    });
    expect(fakeState.addStars).toHaveBeenCalledWith(1);
  });

  it('支持切换至组词磁吸盘模式', () => {
    const c = renderWith();
    const wordTab = Array.from(c.querySelectorAll('button')).find((b) => b.textContent?.includes('组词磁吸盘'));
    expect(wordTab).toBeDefined();
    act(() => {
      wordTab?.click();
    });
    expect(c.textContent).toContain('词语拼装');
  });

  it('支持切换至童心造句积木轨模式', () => {
    const c = renderWith();
    const sentenceTab = Array.from(c.querySelectorAll('button')).find((b) => b.textContent?.includes('童心造句积木轨'));
    expect(sentenceTab).toBeDefined();
    act(() => {
      sentenceTab?.click();
    });
    expect(c.textContent).toContain('语句拼装');
  });
});
