// @vitest-environment jsdom
/**
 * 🚂 LetterOrder.test.tsx
 * 单元测试：字母排序与 ABC 彩虹小火车
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { LetterOrder } from '../LetterOrder';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
  sfxStar: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  playLetterVoice: vi.fn().mockResolvedValue(undefined),
  speak: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      if (params?.current) return `${params.current}`;
      if (params?.seq) return `${params.seq}`;
      return key;
    },
  }),
}));

function mkDiv() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('LetterOrder Component', () => {
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

  it('renders default learn mode and 26 letters grid', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<LetterOrder />);
    });

    expect(container.textContent).toContain('letterOrder.title');
    expect(container.textContent).toContain('letterOrder.learn');
    expect(container.textContent).toContain('letterOrder.sort');
    expect(container.textContent).toContain('letterOrder.fill');
    expect(container.textContent).toContain('A');
    expect(container.textContent).toContain('Z');
  });

  it('supports cycling letters via ArrowLeft / ArrowRight in learn mode', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<LetterOrder />);
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });

    expect(container.textContent).toContain('B');
  });
});
