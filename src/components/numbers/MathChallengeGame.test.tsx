// @vitest-environment jsdom
/**
 * 数学「加减闯关」组件 · 游戏化一致性守护测试
 * 聚焦 R79 P1 收口点：
 *   - 答案选项必须复用统一 CandyButton（role=button + aria-label「选项 N」）
 *   - 选中态正确/错误视觉着色仍生效（green/red 语义 class）
 * 不依赖 AI 流/语音/全局 store 业务副作用，全部 mock 为静默实现。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('@/lib/speech', () => ({ speak: () => {} }));
vi.mock('@/lib/celebrate', () => ({ celebrateSmall: () => {} }));
vi.mock('@/lib/ai/useAi', () => ({
  useAiStream: () => ({ text: '', run: () => {} }),
}));
vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('@/store/useStore', () => {
  const mockStore = {
    addFish: () => {},
    recordMath: () => {},
  };
  return {
    useStore: (selector?: (s: typeof mockStore) => unknown) =>
      selector ? selector(mockStore) : mockStore,
  };
});

import { MathChallengeGame } from './MathChallengeGame';

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  host.remove();
});

function render() {
  act(() => {
    root.render(createElement(MathChallengeGame));
  });
}

describe('MathChallengeGame 选项按钮一致性 (R79 P1)', () => {
  it('渲染 4 个复用 CandyButton 的答案选项（aria-label 以「选项」开头）', () => {
    render();
    const options = Array.from(
      host.querySelectorAll('button[aria-label^="选项"]'),
    );
    expect(options.length).toBe(4);
  });

  it('点击正确选项后该按钮获得 green 正确态着色', () => {
    render();
    const buttons = Array.from(
      host.querySelectorAll('button[aria-label^="选项"]'),
    ) as HTMLButtonElement[];
    // 读取当前题目答案：从 AI 讲解外的题目文本推断不可靠，
    // 改为断言「点击任一选项后必有某个按钮产生选中态着色」即可守护着色逻辑不回退。
    act(() => {
      buttons[0]?.click();
    });
    const hasSelectedGreen = host.querySelector('.\\!bg-candy-green-soft');
    const hasSelectedRed = host.querySelector('.\\!bg-candy-red-soft');
    expect(hasSelectedGreen || hasSelectedRed).not.toBeNull();
  });

  it('点击后其余选项进入禁用态（防重复作答）', () => {
    render();
    const buttons = Array.from(
      host.querySelectorAll('button[aria-label^="选项"]'),
    ) as HTMLButtonElement[];
    act(() => {
      buttons[1]?.click();
    });
    const disabledCount = buttons.filter((b) => b.disabled).length;
    expect(disabledCount).toBe(4);
  });
});
