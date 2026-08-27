// @vitest-environment jsdom
/**
 * ⚡ ConfusionBuster.test.tsx
 * 单元测试：平翘舌 / 前后鼻音 / n-l / f-h 专项辨析大冒险
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { ConfusionBuster } from '../ConfusionBuster';

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

describe('ConfusionBuster Component', () => {
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

  it('renders all 4 confusion topic tabs', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<ConfusionBuster />);
    });

    expect(container.textContent).toContain('平舌音 vs 翘舌音');
    expect(container.textContent).toContain('前鼻音 vs 后鼻音');
    expect(container.textContent).toContain('鼻音 n vs 边音 l');
    expect(container.textContent).toContain('唇齿音 f vs 舌根音 h');
  });

  it('renders rhyme and mouth tips in card mode', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<ConfusionBuster />);
    });

    expect(container.textContent).toContain('发音秘诀与口诀卡');
    expect(container.textContent).toContain('口型秘诀');
  });

  it('switches to quiz mode and renders listening duel game', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<ConfusionBuster />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const quizBtn = buttons.find((b) => b.textContent?.includes('听音捉迷藏'));
    await act(async () => { quizBtn?.click(); });

    expect(container.textContent).toContain('仔细听！哪个是老师读的字？');
    expect(container.textContent).toContain('再听一遍读音');
  });

  it('switches topic to 前后鼻音 on tab click', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<ConfusionBuster />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const topicBtn = buttons.find((b) => b.textContent?.includes('前鼻音 vs 后鼻音'));
    await act(async () => { topicBtn?.click(); });

    expect(container.textContent).toContain('-n vs -ng');
  });
});
