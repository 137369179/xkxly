// @vitest-environment jsdom
/**
 * 游戏化功能卡（ModuleGameCard）单测
 * 覆盖：标题/描述渲染、未开始提示、掌握数、星星、锁定态、点击回调。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target: any, tag: string) => {
        return ({ children, ...rest }: any) => createElement(tag, rest, children);
      },
    }
  ),
  AnimatePresence: ({ children }: any) => children,
}));
vi.mock('@/components/ui/ProgressBar', () => ({
  ProgressBar: (p: any) => createElement('div', { 'data-testid': 'bar', 'data-value': p.value }),
}));
vi.mock('@/lib/utils', () => ({
  cn: (...parts: Array<string | false | null | undefined>) =>
    parts.filter(Boolean).join(' '),
}));

import { ModuleGameCard } from './ModuleGameCard';

let host: HTMLDivElement;
let root: Root;
function render(props: Parameters<typeof ModuleGameCard>[0]) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(ModuleGameCard, props)));
}
function byTest(id: string) {
  return host.querySelector(`[data-testid="${id}"]`);
}

describe('ModuleGameCard', () => {
  afterEach(() => {
    act(() => root?.unmount());
    host.remove();
  });

  it('渲染标题与描述', () => {
    render({
      emoji: '🔤',
      title: '字母墙',
      desc: '认字母',
      tone: 'blue',
      testId: 'card-letter-wall',
    });
    expect(host.textContent).toContain('字母墙');
    expect(host.textContent).toContain('认字母');
    expect(byTest('card-letter-wall')).toBeTruthy();
  });

  it('未开始时提示「还没开始哦」', () => {
    render({ emoji: '🔤', title: '字母墙', progress: 0 });
    expect(host.textContent).toContain('还没开始哦');
  });

  it('显示掌握数 masteredCount/totalCount', () => {
    render({
      emoji: '🔤',
      title: '字母墙',
      progress: 30,
      masteredCount: 8,
      totalCount: 26,
    });
    expect(host.textContent).toContain('已点亮 8/26');
  });

  it('显示星星数（仅 >0 且未锁定时）', () => {
    render({ emoji: '🔤', title: '字母墙', progress: 50, stars: 12 });
    expect(host.textContent).toContain('⭐ 12');
  });

  it('锁定态渲染锁图标且无点击', () => {
    const onEnter = vi.fn();
    render({ emoji: '🔤', title: '高级关', locked: true, onEnter, testId: 'card-locked' });
    expect(host.textContent).toContain('🔒');
    act(() => byTest('card-locked')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onEnter).not.toHaveBeenCalled();
  });

  it('未锁定时点击触发 onEnter', () => {
    const onEnter = vi.fn();
    render({ emoji: '🔤', title: '字母墙', onEnter, testId: 'card-enter' });
    act(() => byTest('card-enter')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onEnter).toHaveBeenCalledTimes(1);
  });
});
