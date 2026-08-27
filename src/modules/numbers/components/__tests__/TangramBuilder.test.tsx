// @vitest-environment jsdom
/**
 * 🧩 TangramBuilder.test.tsx
 * 单元测试：七巧板空间几何与创意工坊
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { TangramBuilder } from '../TangramBuilder';

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

describe('TangramBuilder Component', () => {
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

  it('renders default puzzle and all puzzle level buttons', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<TangramBuilder />);
    });

    expect(container.textContent).toContain('机灵小猫');
    expect(container.textContent).toContain('乘风帆船');
    expect(container.textContent).toContain('太空火箭');
    expect(container.textContent).toContain('自由拼图');
  });

  it('switches puzzle to 乘风帆船', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<TangramBuilder />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const boatBtn = buttons.find((b) => b.textContent?.includes('乘风帆船'));
    await act(async () => { boatBtn?.click(); });

    expect(container.textContent).toContain('高高的三角白帆');
  });

  it('switches to free drawing mode', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<TangramBuilder />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const freeBtn = buttons.find((b) => b.textContent?.includes('自由拼图'));
    await act(async () => { freeBtn?.click(); });

    expect(container.textContent).toContain('自由创意拼图工坊');
  });

  it('snaps and completes the puzzle with success feedback', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<TangramBuilder />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const snapBtn = buttons.find((b) => b.textContent?.includes('吸附拼装'));
    await act(async () => { snapBtn?.click(); });

    expect(container.textContent).toContain('小猫拼好啦');
    expect(container.textContent).toContain('小小空间建筑师');
  });
});
