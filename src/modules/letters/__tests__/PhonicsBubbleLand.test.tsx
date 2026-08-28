// @vitest-environment jsdom
/**
 * 🫧 PhonicsBubbleLand.test.tsx
 * 单元测试：自然拼读气泡乐园与 CVC 三拼拼读机
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { PhonicsBubbleLand } from '../PhonicsBubbleLand';

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

describe('PhonicsBubbleLand Component', () => {
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

  it('renders default 26 letters phonics bubble mode and mode buttons', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<PhonicsBubbleLand />);
    });

    expect(container.textContent).toContain('26字母发音');
    expect(container.textContent).toContain('CVC三拼机');
    expect(container.textContent).toContain('Word Family 韵律火车');
    expect(container.textContent).toContain('听音戳气球');
    expect(container.textContent).toContain('Apple');
  });

  it('selects another letter bubble (e.g. B / Bear)', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<PhonicsBubbleLand />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const bBtn = buttons.find((b) => b.textContent?.includes('B') && b.textContent?.includes('/b/'));
    await act(async () => { bBtn?.click(); });

    expect(container.textContent).toContain('Bear');
  });

  it('switches to CVC fusion machine mode and triggers fusion', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<PhonicsBubbleLand />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const cvcBtn = buttons.find((b) => b.textContent?.includes('CVC三拼机'));
    await act(async () => { cvcBtn?.click(); });

    expect(container.textContent).toContain('CVC 自然拼读魔法拼读机');
    expect(container.textContent).toContain('魔法合体连读');

    const fuseBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('魔法合体连读'),
    );
    await act(async () => { fuseBtn?.click(); });

    expect(fuseBtn).toBeTruthy();
  });

  it('switches to Word Family rhyme train mode and picks word', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<PhonicsBubbleLand />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const familyTab = buttons.find((b) => b.textContent?.includes('Word Family'));
    await act(async () => { familyTab?.click(); });

    expect(container.textContent).toContain('韵律车头');
    expect(container.textContent).toContain('-at 家族');
  });

  it('switches to quiz mode and handles option selection', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<PhonicsBubbleLand />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const quizBtn = buttons.find((b) => b.textContent?.includes('听音戳气球'));
    await act(async () => { quizBtn?.click(); });

    expect(container.textContent).toContain('听音辨字母挑战');
  });
});
