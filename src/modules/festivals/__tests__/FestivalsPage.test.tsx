// @vitest-environment jsdom
/**
 * 🏮 FestivalsPage.test.tsx
 * 单元测试：二十四节气与传统节日文化馆
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import FestivalsPage from '../FestivalsPage';

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

vi.mock('@/lib/ai/useAi', () => ({
  useAiStream: () => ({
    status: 'idle',
    text: '',
    run: vi.fn(),
  }),
}));

function mkDiv() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('FestivalsPage Component', () => {
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

  it('renders default 24 solar terms section and season filters', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<FestivalsPage />);
    });

    expect(container.textContent).toContain('24 节气四时风物长卷');
    expect(container.textContent).toContain('春季');
    expect(container.textContent).toContain('夏季');
    expect(container.textContent).toContain('秋季');
    expect(container.textContent).toContain('冬季');
    expect(container.textContent).toContain('立春');
  });

  it('filters terms when season button clicked (e.g. 夏季)', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<FestivalsPage />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const summerBtn = buttons.find((b) => b.textContent?.includes('夏季'));
    await act(async () => { summerBtn?.click(); });

    expect(container.textContent).toContain('立夏');
    expect(container.textContent).toContain('夏至');
  });

  it('starts festival quiz and handles answer option', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<FestivalsPage />);
    });

    const startBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('开始节日知识大挑战') || b.textContent?.includes('节日知识大挑战')
    );
    expect(startBtn).toBeDefined();

    await act(async () => {
      startBtn?.click();
    });

    expect(container.textContent).toContain('挑战下一道节日趣题');
  });
});
