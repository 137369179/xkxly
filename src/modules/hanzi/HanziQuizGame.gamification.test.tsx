// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('@/lib/speech', () => ({ speak: vi.fn(() => Promise.resolve()) }));
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

const fakeState = {
  addFish: vi.fn(),
  practice: vi.fn(),
  addStars: vi.fn(),
  setDiffOverride: vi.fn(),
  progress: {
    mastery: {},
    diffOverrides: {},
  },
};
vi.mock('@/store/useStore', () => ({
  useStore: (sel?: any) => (sel ? sel(fakeState) : fakeState),
}));

const { HanziQuizGame } = await import('./HanziQuizGame');

let roots: Root[] = [];
afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
});

function renderGame() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(createElement(HanziQuizGame)));
  roots.push(root);
  return container;
}

describe('HanziQuizGame 游戏化接线（R147）', () => {
  it('挂载 ComboMeter 连击能量条 + GentleFeedback 容器（任务 #1/#3）', () => {
    const c = renderGame();
    // ComboMeter 在 count=0 时渲染引导文案，证明生产级连击组件已接入汉字练习闭环
    expect(c.textContent).toContain('连续答对积累连击');
    expect(c.querySelector('[aria-label="当前连击 0"]')).not.toBeNull();
  });
});
