// @vitest-environment jsdom
/**
 * 🌟 ShadowMatch.test.tsx
 * 单元测试：影子配对游戏
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ShadowMatch } from '../ShadowMatch';

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

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const dict: Record<string, string> = {
        'shadowMatch.title': '影子配对',
        'shadowMatch.subtitle': '找物品和影子的对应关系',
        'shadowMatch.itemsLabel': '物品',
        'shadowMatch.shadowsLabel': '影子',
        'shadowMatch.newSet': '换一组',
        'shadowMatch.matchSuccess': '太棒了，配对成功！',
        'shadowMatch.matchWrong': '哎呀，不是这个影子哦，再试试！',
      };
      if (params?.matched !== undefined) {
        return `已配对: ${params.matched}/${params.total} (得分: ${params.score})`;
      }
      return dict[key] ?? key;
    },
  }),
}));

describe('ShadowMatch Component', () => {
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

  it('renders items, shadows, and status label', () => {
    act(() => {
      root?.render(createElement(ShadowMatch));
    });

    expect(container?.textContent).toContain('影子配对');
    expect(container?.textContent).toContain('物品');
    expect(container?.textContent).toContain('影子');
    expect(container?.textContent).toContain('已配对: 0/4');
    expect(container?.textContent).toContain('换一组');
  });

  it('allows clicking an item to select it', () => {
    act(() => {
      root?.render(createElement(ShadowMatch));
    });

    const firstItemBtn = container?.querySelectorAll('.flex.justify-center.gap-3 button')[0] as HTMLButtonElement;
    expect(firstItemBtn).toBeDefined();

    act(() => {
      firstItemBtn?.click();
    });

    // Selected item has ring / active styling
    expect(firstItemBtn.className).toContain('bg-candy-blue-deep');
  });
});
