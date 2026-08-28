// @vitest-environment jsdom
/**
 * 🧩 RiddleGame.test.tsx
 * 单元测试：谜语猜猜与分类题库游戏
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RiddleGame } from '../RiddleGame';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxStar: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  randomPraise: vi.fn(),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const dict: Record<string, string> = {
        'riddle.pageTitle': '谜语大闯关',
        'riddle.subtitle': '动动脑筋猜谜语',
        'riddle.animal': '动物',
        'riddle.plant': '植物',
        'riddle.object': '物品',
        'riddle.char': '字谜',
        'riddle.mixed': '综合',
        'riddle.gotIt': '我知道了',
        'riddle.showAnswer': '看答案',
        'riddle.hint': '提示',
        'riddle.again': '再玩一次',
      };
      if (params?.count) return `${params.count}首`;
      if (params?.current) return `第${params.current}/${params.total}题 (答对${params.correct})`;
      if (params?.hint) return `提示：${params.hint}`;
      return dict[key] ?? key;
    },
  }),
}));

describe('RiddleGame Component', () => {
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
  });

  it('renders category selection view initially', () => {
    act(() => {
      root?.render(createElement(RiddleGame));
    });

    expect(container?.textContent).toContain('谜语大闯关');
    expect(container?.textContent).toContain('动物');
    expect(container?.textContent).toContain('植物');
    expect(container?.textContent).toContain('物品');
    expect(container?.textContent).toContain('字谜');
  });

  it('starts animal riddle when clicking animal category', () => {
    act(() => {
      root?.render(createElement(RiddleGame));
    });

    const animalBtn = Array.from(container?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('动物')
    );
    expect(animalBtn).toBeDefined();

    act(() => {
      animalBtn?.click();
    });

    expect(container?.textContent).toContain('动物');
    expect(container?.textContent).toContain('我知道了');
    expect(container?.textContent).toContain('看答案');
  });
});
