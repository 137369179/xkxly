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

vi.mock('@/lib/ai/useAi', () => ({
  useAiStream: () => ({
    status: 'idle',
    text: '',
    run: vi.fn(),
  }),
}));

const fakeState = { practice: vi.fn(), addStars: vi.fn(), addFish: vi.fn() };
vi.mock('@/store/useStore', () => ({
  useStore: (sel?: any) => (sel ? sel(fakeState) : fakeState),
}));

const { LogicDetective } = await import('@/modules/logic/LogicDetective');

let roots: Root[] = [];
afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
});

function renderDetective() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(createElement(LogicDetective)));
  roots.push(root);
  return container;
}

describe('LogicDetective 探案馆', () => {
  it('渲染案件标题与线索板', () => {
    const c = renderDetective();
    expect(c.textContent).toContain('谁吃了森林大蛋糕？');
    expect(c.textContent).toContain('现场搜集到的关键线索');
    expect(c.textContent).toContain('小猫咪');
    expect(c.textContent).toContain('小狐狸');
  });

  it('点击正确嫌疑人触发破案与奖励', () => {
    const c = renderDetective();
    const catBtn = Array.from(c.querySelectorAll('button')).find((b) => b.textContent?.includes('小猫咪'));
    expect(catBtn).toBeDefined();

    act(() => {
      catBtn?.click();
    });

    expect(fakeState.addStars).toHaveBeenCalledWith(3);
    expect(fakeState.addFish).toHaveBeenCalledWith(1);
    expect(c.textContent).toContain('破案成功');
  });

  it('点击错误嫌疑人提示线索不符', () => {
    const c = renderDetective();
    const foxBtn = Array.from(c.querySelectorAll('button')).find((b) => b.textContent?.includes('小狐狸'));
    expect(foxBtn).toBeDefined();

    act(() => {
      foxBtn?.click();
    });

    expect(c.textContent).toContain('不是【小狐狸】哦');
  });
});
