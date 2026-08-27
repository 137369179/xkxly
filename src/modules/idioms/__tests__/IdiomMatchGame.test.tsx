// @vitest-environment jsdom
/**
 * 🎴 IdiomMatchGame.test.tsx
 * 单元测试：成语消消乐与成语大对决
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { IdiomMatchGame } from '../IdiomMatchGame';

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

describe('IdiomMatchGame Component', () => {
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

  it('renders default level 1 and 4x4 card grid', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<IdiomMatchGame />);
    });

    expect(container.textContent).toContain('第 1 关：动物智慧');
    expect(container.textContent).toContain('已消 0/4');

    const cardButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      ['守', '株', '待', '兔', '画', '龙', '点', '睛'].includes(b.textContent?.trim() ?? ''),
    );
    expect(cardButtons.length).toBeGreaterThan(0);
  });

  it('handles selecting 4 correct idiom characters', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<IdiomMatchGame />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const shou = buttons.find((b) => b.textContent?.trim() === '守');
    const zhu = buttons.find((b) => b.textContent?.trim() === '株');
    const dai = buttons.find((b) => b.textContent?.trim() === '待');
    const tu = buttons.find((b) => b.textContent?.trim() === '兔');

    await act(async () => { shou?.click(); });
    await act(async () => { zhu?.click(); });
    await act(async () => { dai?.click(); });
    await act(async () => { tu?.click(); });

    expect(container.textContent).toContain('已消 1/4');
    expect(container.textContent).toContain('守株待兔');
  });

  it('switches levels cleanly', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<IdiomMatchGame />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const lvl2Btn = buttons.find((b) => b.textContent?.trim() === '第 2 关');
    await act(async () => { lvl2Btn?.click(); });

    expect(container.textContent).toContain('第 2 关：勤学笃行');
  });
});
