// @vitest-environment jsdom
/**
 * ⚡ DailySrsMission.test.tsx
 * 单元测试：每日 3 分钟艾宾浩斯极速复习中枢
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { DailySrsMission } from '../DailySrsMission';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  speak: vi.fn().mockResolvedValue(undefined),
}));

function mkDiv() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('DailySrsMission Component', () => {
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

  it('renders initial start prompt card', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<DailySrsMission />);
    });

    expect(container.textContent).toContain('每日 3 分钟艾宾浩斯极速复习');
    expect(container.textContent).toContain('立即开启 3 分钟复习');
  });

  it('starts mission and displays first question and options', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<DailySrsMission />);
    });

    const startBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('立即开启'),
    );
    await act(async () => { startBtn?.click(); });

    expect(container.textContent).toContain('第 1 / 5 题');
  });
});
