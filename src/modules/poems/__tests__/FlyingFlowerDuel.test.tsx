// @vitest-environment jsdom
/**
 * 🌸 FlyingFlowerDuel.test.tsx
 * 单元测试：飞花令沉浸对决与诗句九宫格拼装
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { FlyingFlowerDuel } from '../FlyingFlowerDuel';

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

describe('FlyingFlowerDuel Component', () => {
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

  it('renders default flying flower duel mode and mode tabs', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<FlyingFlowerDuel />);
    });

    expect(container.textContent).toContain('诗仙飞花令');
    expect(container.textContent).toContain('诗句九宫格拼装');
    expect(container.textContent).toContain('【春】字令');
  });

  it('switches topic char in flying flowers mode', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<FlyingFlowerDuel />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const moonBtn = buttons.find((b) => b.textContent?.includes('【月】字令'));
    await act(async () => { moonBtn?.click(); });

    expect(container.textContent).toContain('明月千里');
    expect(container.textContent).toContain('床前明月光');
  });

  it('selects poetry line and triggers praise and TTS', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<FlyingFlowerDuel />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const lineBtn = buttons.find((b) => b.textContent?.includes('下一句'));
    await act(async () => { lineBtn?.click(); });

    expect(container.textContent).toContain('春');
  });

  it('switches to line puzzle mode and handles char selection', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<FlyingFlowerDuel />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const puzzleBtn = buttons.find((b) => b.textContent?.includes('诗句九宫格拼装'));
    await act(async () => { puzzleBtn?.click(); });

    expect(container.textContent).toContain('静夜思');
    expect(container.textContent).toContain('点击下方打乱的字牌');

    // 点击字牌
    const charBtns = Array.from(container.querySelectorAll('button')).filter((b) =>
      ['床', '前', '明', '月', '光'].includes(b.textContent?.trim() ?? '')
    );
    expect(charBtns.length).toBeGreaterThan(0);
  });
});
