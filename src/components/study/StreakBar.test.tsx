// @vitest-environment jsdom
/**
 * 闯关里程碑条（StreakBar）渲染与达标庆祝单测
 * 覆盖：圆点数量/点亮、达标瞬间弹出 Combo 庆祝、仅触发一次。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StreakBar } from './StreakBar';

vi.mock('motion/react', () => ({
  motion: {
    span: (p: any) => createElement('span', p, p.children),
    div: (p: any) => createElement('div', p, p.children),
  },
  AnimatePresence: ({ children }: any) => children,
}));
vi.mock('@/lib/celebrate', () => ({ celebrateSmall: vi.fn(() => Promise.resolve()) }));
import { celebrateSmall } from '@/lib/celebrate';

let host: HTMLDivElement;
let root: Root;
function render(props: Parameters<typeof StreakBar>[0]) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(StreakBar, props)));
}
const dotsOn = () => host?.querySelectorAll('[data-testid^="streak-dot-"][data-on="1"]').length ?? 0;
const combo = () => host?.querySelector('[data-testid="streak-combo"]');

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

afterEach(() => {
  // 卸载组件，清理达标庆祝的计时器，避免 act 警告
  act(() => root?.unmount());
  document.body.innerHTML = '';
});

describe('StreakBar 渲染', () => {
  it('渲染 target 个圆点，点亮 streak 个', () => {
    render({ streak: 2, target: 4 });
    expect(host!.querySelectorAll('[data-testid^="streak-dot-"]').length).toBe(4);
    expect(dotsOn()).toBe(2);
  });

  it('streak=0 时无点亮，且不出现庆祝', () => {
    render({ streak: 0, target: 3 });
    expect(dotsOn()).toBe(0);
    expect(combo()).toBeNull();
  });

  it('超出 target 安全截断', () => {
    render({ streak: 9, target: 3 });
    expect(host!.querySelectorAll('[data-testid^="streak-dot-"]').length).toBe(3);
    expect(dotsOn()).toBe(3);
  });
});

describe('StreakBar 达标庆祝', () => {
  it('streak 达到 target 时弹出 Combo 庆祝并触发 celebrate', () => {
    render({ streak: 3, target: 3 });
    expect(combo()).toBeTruthy();
    expect(combo()!.textContent).toContain('3');
    expect(celebrateSmall).toHaveBeenCalledTimes(1);
  });

  it('庆祝内容可用 celebrateText 定制（{n} 插值）', () => {
    render({ streak: 3, target: 3, celebrateText: '🔥 {n} 连击小达人' });
    expect(combo()!.textContent).toBe('🔥 3 连击小达人');
  });
});