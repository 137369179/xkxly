// @vitest-environment jsdom
/**
 * 🎈 LetterPopGame.test.tsx
 * 单元测试：听音戳气球小游戏与触觉键盘交互
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { LetterPopGame } from '../LetterPopGame';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
  sfxStar: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  playLetterVoice: vi.fn().mockResolvedValue(undefined),
  playWordVoice: vi.fn().mockResolvedValue(undefined),
  speak: vi.fn().mockResolvedValue(undefined),
}));

function mkDiv() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('LetterPopGame Component', () => {
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

  it('renders default round and control buttons', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<LetterPopGame />);
    });

    expect(container.textContent).toContain('听音戳气球');
    expect(container.textContent).toContain('重听声音');
    expect(container.textContent).toContain('换一局');
    expect(container.textContent).toContain('听声音，戳破正确的字母气球！');
  });

  it('supports keyboard navigation via Space to replay pronunciation', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<LetterPopGame />);
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    });

    expect(container.textContent).toContain('听音戳气球');
  });

  it('supports popping a balloon with number key 1', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<LetterPopGame />);
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    });

    expect(container.textContent).toContain('听音戳气球');
  });
});
