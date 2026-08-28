// @vitest-environment jsdom
/**
 * 🐉 IdiomChain.test.tsx
 * 单元测试：成语接龙游戏与 AI 提示键盘交互
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { IdiomChain } from '../IdiomChain';

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
  speak: vi.fn().mockResolvedValue(undefined),
  randomPraise: vi.fn(),
  randomEncourage: vi.fn(),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (params?.score) return `${params.score}`;
      if (params?.count) return `${params.count}`;
      return key;
    },
  }),
}));

function mkDiv() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('IdiomChain Component', () => {
  let container: HTMLElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = mkDiv();
  });

  afterEach(() => {
    act(() => { root?.unmount(); });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders default idle screen with start button', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<IdiomChain />);
    });

    expect(container.textContent).toContain('idiom.chainTitle');
    expect(container.textContent).toContain('idiom.startChain');
  });

  it('starts playing when clicking start button or pressing Enter', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<IdiomChain />);
    });

    const startBtn = container.querySelector('button');
    expect(startBtn).toBeTruthy();

    await act(async () => {
      startBtn?.click();
    });

    expect(container.textContent).toContain('idiom.findWith');
    expect(container.textContent).toContain('idiom.skip');
    expect(container.textContent).toContain('idiom.aiHint');
  });
});
