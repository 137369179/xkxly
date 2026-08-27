// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxStar: vi.fn(),
}));
vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

const fakeState = {
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

const { WordMatch } = await import('../WordMatch');

let roots: Root[] = [];
afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
});

function renderMatch() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(createElement(WordMatch)));
  roots.push(root);
  return container;
}

describe('WordMatch 游戏化接线（R147）', () => {
  it('挂载 ComboMeter 连击能量条（即时反馈强化·任务 #1/#3）', () => {
    const c = renderMatch();
    // ComboMeter 在 count=0 时渲染引导文案，证明该生产级组件已接入词语练习闭环
    expect(c.textContent).toContain('连续答对积累连击');
    expect(c.querySelector('[aria-label="当前连击 0"]')).not.toBeNull();
  });
});
