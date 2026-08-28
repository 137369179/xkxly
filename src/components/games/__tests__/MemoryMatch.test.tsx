// @vitest-environment jsdom
/**
 * 🃏 MemoryMatch.test.tsx
 * 单元测试：翻牌记忆配对游戏
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryMatch } from '../MemoryMatch';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  speak: vi.fn(),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const dict: Record<string, string> = {
        'memoryMatch.title': '翻牌记忆配对',
      };
      if (params?.count !== undefined) {
        if (key === 'memoryMatch.pairs') return `${params.count} 对`;
        if (key === 'memoryMatch.moves') return `步数: ${params.count}`;
        if (key === 'memoryMatch.allFound') return `太棒了！用 ${params.count} 步找到了全部配对！`;
      }
      return dict[key] ?? key;
    },
  }),
}));

describe('MemoryMatch Component', () => {
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

  it('renders memory match cards, pair count selector, and moves counter', () => {
    act(() => {
      root?.render(createElement(MemoryMatch));
    });

    expect(container?.textContent).toContain('翻牌记忆配对');
    expect(container?.textContent).toContain('4 对');
    expect(container?.textContent).toContain('6 对');
    expect(container?.textContent).toContain('8 对');
    expect(container?.textContent).toContain('步数: 0');
    expect(container?.textContent).toContain('0/4');

    const cards = container?.querySelectorAll('.grid button');
    expect(cards?.length).toBe(8); // 4 pairs * 2 = 8 cards
  });

  it('allows clicking cards to flip', () => {
    act(() => {
      root?.render(createElement(MemoryMatch));
    });

    const firstCard = container?.querySelectorAll('.grid button')[0] as HTMLButtonElement;
    expect(firstCard).toBeDefined();

    act(() => {
      firstCard?.click();
    });

    // The flipped card should not display '❓' anymore
    expect(firstCard.textContent?.trim()).not.toBe('❓');
  });
});
