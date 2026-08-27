// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  speak: vi.fn(() => Promise.resolve()),
}));

const fakeState = { practice: vi.fn(), addStars: vi.fn(), addFish: vi.fn() };
vi.mock('@/store/useStore', () => ({
  useStore: (sel?: any) => (sel ? sel(fakeState) : fakeState),
}));

const { MasterpieceGallery } = await import('../MasterpieceGallery');

let roots: Root[] = [];
afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
});

function renderGallery() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(createElement(MasterpieceGallery)));
  roots.push(root);
  return container;
}

describe('MasterpieceGallery 世界名画馆', () => {
  it('渲染 6 幅世界名画选择器与星月夜详情', () => {
    const c = renderGallery();
    expect(c.textContent).toContain('《星月夜》');
    expect(c.textContent).toContain('《睡莲》');
    expect(c.textContent).toContain('《千里江山图》');
    expect(c.textContent).toContain('《神奈川冲浪里》');
    expect(c.textContent).toContain('《蒙娜丽莎》');
    expect(c.textContent).toContain('《向日葵》');
    expect(c.textContent).toContain('文森特·梵高');
  });

  it('点击名画碎片完成拼装并触发加星奖励', () => {
    const c = renderGallery();
    const pieceBtns = Array.from(c.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('点击拼装')
    );
    expect(pieceBtns.length).toBe(4);

    // 拼完 4 块
    pieceBtns.forEach((btn) => {
      act(() => {
        btn.click();
      });
    });

    expect(fakeState.addStars).toHaveBeenCalledWith(5);
    expect(fakeState.addFish).toHaveBeenCalledWith(2);
    expect(c.textContent).toContain('拼图大圆满');
  });
});
