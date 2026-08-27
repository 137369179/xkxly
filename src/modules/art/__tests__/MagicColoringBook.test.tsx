// @vitest-environment jsdom
/**
 * 🎨 MagicColoringBook.test.tsx
 * 单元测试：魔力分块填色本与创意填色工坊
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MagicColoringBook } from '../MagicColoringBook';

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

describe('MagicColoringBook Component', () => {
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

  it('renders default dinosaur coloring template and palette', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<MagicColoringBook />);
    });

    expect(container.textContent).toContain('萌趣小恐龙');
    expect(container.textContent).toContain('已涂 0 / 6 块');
    expect(container.textContent).toContain('点击选中的颜料：');

    const svgElements = container.querySelectorAll('rect, circle');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('colors SVG parts and increases progress', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<MagicColoringBook />);
    });

    const svgShapes = Array.from(container.querySelectorAll('rect, circle'));
    const firstShape = svgShapes[0];

    await act(async () => {
      firstShape?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('已涂 1 / 6 块');
  });

  it('switches templates cleanly (e.g. 太空探险火箭)', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<MagicColoringBook />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const rocketBtn = buttons.find((b) => b.textContent?.includes('太空探险火箭'));

    await act(async () => { rocketBtn?.click(); });

    expect(container.textContent).toContain('太空探险火箭');
    expect(container.textContent).toContain('浩瀚宇宙星空');
  });
});
