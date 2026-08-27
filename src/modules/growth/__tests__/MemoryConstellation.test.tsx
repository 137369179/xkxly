// @vitest-environment jsdom
/**
 * 🌌 MemoryConstellation.test.tsx
 * 单元测试：全景记忆星图与星际卡片
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryConstellation } from '../MemoryConstellation';

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

describe('MemoryConstellation Component', () => {
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

  it('renders overall constellation statistics and category tabs', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<MemoryConstellation />);
    });

    expect(container.textContent).toContain('熟练掌握');
    expect(container.textContent).toContain('正在学习');
    expect(container.textContent).toContain('遗忘预警');
    expect(container.textContent).toContain('待点亮');
    expect(container.textContent).toContain('全景星空');
    expect(container.textContent).toContain('汉字星系');
    expect(container.textContent).toContain('数学星系');
  });

  it('switches category to 汉字星系', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<MemoryConstellation />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const hanziTab = buttons.find((b) => b.textContent?.includes('汉字星系'));
    await act(async () => { hanziTab?.click(); });

    expect(container.textContent).toContain('人');
    expect(container.textContent).toContain('天');
  });

  it('clicks star node to display star detail card', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<MemoryConstellation />);
    });

    const allButtons = Array.from(container.querySelectorAll('button'));
    const starBtn = allButtons.find((b) => b.textContent?.includes('人'));
    await act(async () => { starBtn?.click(); });

    expect(container.textContent).toContain('汉字星系');
    expect(container.textContent).toContain('再听发音');
  });
});
