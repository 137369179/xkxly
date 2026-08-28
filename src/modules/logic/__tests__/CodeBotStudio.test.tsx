// @vitest-environment jsdom
/**
 * 🤖 CodeBotStudio.test.tsx
 * 单元测试：CodeBot 积木编程与智能迷宫探险工坊
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { CodeBotStudio } from '../CodeBotStudio';

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
}));

function mkDiv() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('CodeBotStudio Component', () => {
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

  it('renders default level 1 and command palette blocks', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<CodeBotStudio />);
    });

    expect(container.textContent).toContain('第 1 关');
    expect(container.textContent).toContain('前进 1 格');
    expect(container.textContent).toContain('向左转 90°');
    expect(container.textContent).toContain('向右转 90°');
    expect(container.textContent).toContain('拾取晶石');
    expect(container.textContent).toContain('程序流水线');
  });

  it('adds commands into the execution pipeline', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<CodeBotStudio />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const fwdBtn = buttons.find((b) => b.textContent?.includes('前进 1 格'));
    await act(async () => { fwdBtn?.click(); });
    await act(async () => { fwdBtn?.click(); });

    expect(container.textContent).toContain('2 步');
  });

  it('switches levels cleanly', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<CodeBotStudio />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const lvl2Btn = buttons.find((b) => b.textContent?.trim() === '第 2 关');
    await act(async () => { lvl2Btn?.click(); });

    expect(container.textContent).toContain('拐弯转角');
  });

  it('handles pipeline clear and reset', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<CodeBotStudio />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const fwdBtn = buttons.find((b) => b.textContent?.includes('前进 1 格'));
    await act(async () => { fwdBtn?.click(); });

    const clearBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('清空流水线'),
    );
    await act(async () => { clearBtn?.click(); });

    expect(container.textContent).toContain('0 步');
  });
});
