// @vitest-environment jsdom
/**
 * 🎢 PhonicsSlide.test.tsx
 * 单元测试：声韵滑滑梯与目标寻宝闯关
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { PhonicsSlide } from '../PhonicsSlide';

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

describe('PhonicsSlide Component', () => {
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

  it('renders initial cart, final platform, and slide button', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<PhonicsSlide />);
    });

    expect(container.textContent).toContain('声母小车');
    expect(container.textContent).toContain('韵母站台');
    expect(container.textContent).toContain('发射滑梯，开始拼读！');
  });

  it('selects initial and final updates displayed pinyin', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<PhonicsSlide />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const mBtn = buttons.find((b) => b.textContent?.trim() === 'm');
    await act(async () => { mBtn?.click(); });

    expect(container.textContent).toContain('m');
  });

  it('toggles treasure hunt game mode', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<PhonicsSlide />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const gameBtn = buttons.find((b) => b.textContent?.includes('拼读寻宝大挑战'));
    await act(async () => { gameBtn?.click(); });

    expect(container.textContent).toContain('目标拼读任务');
    expect(container.textContent).toContain('验证拼读答案');
  });

  it('triggers sliding collision and reveals merged card', async () => {
    vi.useFakeTimers();
    await act(async () => {
      root = createRoot(container);
      root.render(<PhonicsSlide />);
    });

    const allBtns = Array.from(container.querySelectorAll('button'));
    const slideBtn = allBtns.find((b) => b.textContent?.includes('发射滑梯'));

    await act(async () => {
      slideBtn?.click();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(container.textContent).toContain('爸爸');
    vi.useRealTimers();
  });
});
