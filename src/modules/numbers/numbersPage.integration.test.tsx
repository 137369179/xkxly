// @vitest-environment jsdom
/**
 * 数字王国 · 端到端集成测试
 * ------------------------------------------------------------------
 * 驱动真实 NumbersPage 的完整用户旅程（真实 i18n，固定 zh-CN）：
 *   ① 智能推荐卡：根据 mastery 弱项推荐「图文应用题」，点击直达对应子玩法
 *   ② 分类导航 + 子标签联动（切分类 → 子标签重置）
 * 通过 data-testid / aria-pressed 做稳定断言，聚焦页面外壳与推荐-导航联动。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useStore } from '@/store/useStore';

// 复用冒烟测试的 proxy，避免 motion/sfx 副作用
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
  MotionConfig: ({ children }: any) => children,
}));
vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxStar: vi.fn(),
  sfxWin: vi.fn(),
  setMuted: vi.fn(),
}));

import NumbersPage from './NumbersPage';

let host: HTMLDivElement;
let root: Root;

const byId = (id: string) => host?.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
const pressed = (id: string) => byId(id)?.getAttribute('aria-pressed');
const text = () => host?.textContent ?? '';
const buttonByText = (txt: string) =>
  Array.from(host?.querySelectorAll('button') ?? []).find((b) => b.textContent?.includes(txt));

function render() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(NumbersPage)));
}

beforeEach(() => {
  localStorage.setItem('baby-learning-locale', 'zh-CN');
  // 构造确定性的数字域掌握度：图文应用题(math:word)是明显弱项
  act(() =>
    useStore.setState((s) => ({
      progress: {
        ...s.progress,
        mastery: {
          'math:word': { lv: 1, due: 0, ok: 5, ng: 10 },
          'math:skip': { lv: 1, due: 0, ok: 8, ng: 2 },
        },
      },
    })),
  );
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  localStorage.clear();
});

describe('数字王国 · 智能推荐卡 → 直达', () => {
  it('按弱项(mastery)推荐图文应用题，点击「去练习」切到对应分类与子玩法', () => {
    render();

    // 推荐卡存在且指向「图文应用题」（word 错误率最高）
    expect(byId('number-recommend')).toBeTruthy();
    expect(text()).toContain('图文应用题');

    // 初始：默认在「数感启蒙」、子玩法「数字墙」
    expect(pressed('cat-sensory')).toBe('true');
    expect(pressed('sub-wall')).toBe('true');

    // 点「去练习 →」
    const goBtn = buttonByText('去练习');
    expect(goBtn).toBeTruthy();
    act(() => goBtn!.click());

    // 应切到「口算应用 / 图文应用题」
    expect(pressed('cat-practice')).toBe('true');
    expect(pressed('sub-word')).toBe('true');
    expect(byId('sub-word')).toBeTruthy();
  });
});

describe('数字王国 · 分类与子标签联动', () => {
  it('切换一级分类后，二级子标签重置为该分类首个玩法', () => {
    render();

    // 切到「算术工坊」
    act(() => byId('cat-arithmetic')!.click());
    expect(pressed('cat-arithmetic')).toBe('true');
    // 子标签重置为该分类第一个「加减法」
    expect(pressed('sub-math')).toBe('true');

    // 手动切子玩法「算术梯」
    act(() => byId('sub-ladder')!.click());
    expect(pressed('sub-ladder')).toBe('true');
    expect(pressed('sub-math')).toBe('false');
  });

  it('回到「数感启蒙」仍是其自己的首个子玩法', () => {
    render();
    act(() => byId('cat-geometry')!.click());
    expect(pressed('sub-shape')).toBe('true');

    act(() => byId('cat-sensory')!.click());
    expect(pressed('cat-sensory')).toBe('true');
    expect(pressed('sub-wall')).toBe('true');
  });
});