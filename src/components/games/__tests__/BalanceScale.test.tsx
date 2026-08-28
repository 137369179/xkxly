// @vitest-environment jsdom
/**
 * ⚖️ BalanceScale.test.tsx
 * 单元测试：天平平衡与数感比较游戏
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BalanceScale } from '../BalanceScale';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  speak: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const dict: Record<string, string> = {
        'balanceScale.title': '天平称重小专家',
        'balanceScale.subtitle': '看看两边一样重吗？',
        'balanceScale.balanced': '平衡',
        'balanceScale.unbalanced': '不平衡',
      };
      if (params?.level !== undefined) {
        return `关卡: ${params.level} | 得分: ${params.score}`;
      }
      return dict[key] ?? key;
    },
  }),
}));

describe('BalanceScale Component', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
  });

  it('renders title, balance scale, and choice buttons', () => {
    act(() => {
      root?.render(createElement(BalanceScale));
    });

    expect(container?.textContent).toContain('天平称重小专家');
    expect(container?.textContent).toContain('平衡');
    expect(container?.textContent).toContain('不平衡');
    expect(container?.textContent).toContain('左=');
    expect(container?.textContent).toContain('右=');
  });

  it('handles clicking choice button without crashing', () => {
    act(() => {
      root?.render(createElement(BalanceScale));
    });

    const balancedBtn = Array.from(container?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('平衡')
    );
    expect(balancedBtn).toBeDefined();

    act(() => {
      balancedBtn?.click();
    });

    expect(container?.textContent).toBeDefined();
  });
});
