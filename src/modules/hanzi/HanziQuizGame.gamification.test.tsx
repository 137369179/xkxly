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
    wrongBook: [],
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

  it('挂载渐进式难度指示（任务 #2）：初始挑战等级 1，accessible progressbar 存在', () => {
    const c = renderGame();
    // 难度指示文案 + 角色化进度条（A 层无障碍：progressbar + aria-valuenow/max）
    expect(c.textContent).toContain('挑战等级');
    const bar = c.querySelector('[role="progressbar"][aria-label^="当前挑战等级"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('aria-valuemax')).toBe('2');
    expect(bar?.getAttribute('aria-valuenow')).toBe('0');
  });

  it('挂载错字本（MistakeBookPanel·任务 #5 错题复习闭环·参考宝宝巴士/洪恩错字复习）', () => {
    const c = renderGame();
    // 错题本空态仍渲染「我的错题本」标题与可访问 aria-label，证明生产级复习入口已接入汉字练习闭环
    expect(c.textContent).toContain('我的错题本');
    expect(c.querySelector('[aria-label="错题本"]')).not.toBeNull();
  });
});
