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

vi.mock('@/lib/audioContext', () => ({
  getAudioContext: () => ({
    currentTime: 0,
    createOscillator: () => ({
      type: 'sine',
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
    createGain: () => ({
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }),
    destination: {},
  }),
}));

const fakeState = { practice: vi.fn(), addStars: vi.fn() };
vi.mock('@/store/useStore', () => ({
  useStore: (sel?: any) => (sel ? sel(fakeState) : fakeState),
}));

const { InstrumentExplorer } = await import('../InstrumentExplorer');

let roots: Root[] = [];
afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
});

function renderExplorer() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(createElement(InstrumentExplorer)));
  roots.push(root);
  return container;
}

describe('InstrumentExplorer 中西乐器博览馆', () => {
  it('渲染 8 大中西乐器选择器与钢琴默认详情', () => {
    const c = renderExplorer();
    expect(c.textContent).toContain('钢琴');
    expect(c.textContent).toContain('中国古筝');
    expect(c.textContent).toContain('小提琴');
    expect(c.textContent).toContain('中国琵琶');
    expect(c.textContent).toContain('架子鼓');
    expect(c.textContent).toContain('中国竹笛');
    expect(c.textContent).toContain('萨克斯风');
    expect(c.textContent).toContain('七彩木琴');
    expect(c.textContent).toContain('键盘乐器之王');
  });

  it('点击乐器切换至中国古筝并展示五声音阶', () => {
    const c = renderExplorer();
    const guzhengBtn = Array.from(c.querySelectorAll('button')).find((b) => b.textContent?.includes('中国古筝'));
    expect(guzhengBtn).toBeDefined();

    act(() => {
      guzhengBtn?.click();
    });

    expect(c.textContent).toContain('中华传统筝乐');
    expect(c.textContent).toContain('宫 (1)');
    expect(c.textContent).toContain('商 (2)');
    expect(c.textContent).toContain('角 (3)');
  });

  it('点击琴键试弹触发加星奖励', () => {
    const c = renderExplorer();
    const doBtn = Array.from(c.querySelectorAll('button')).find((b) => b.textContent?.includes('Do'));
    expect(doBtn).toBeDefined();

    act(() => {
      doBtn?.click();
    });

    expect(fakeState.addStars).toHaveBeenCalledWith(1);
  });
});
