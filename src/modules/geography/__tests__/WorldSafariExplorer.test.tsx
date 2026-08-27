// @vitest-environment jsdom
/**
 * 🧭 WorldSafariExplorer.test.tsx
 * 单元测试：全球七大洲五大洋 3D 环球探险与护照打卡
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { WorldSafariExplorer } from '../WorldSafariExplorer';

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

describe('WorldSafariExplorer Component', () => {
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

  it('renders default continent Asia and facts', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<WorldSafariExplorer />);
    });

    expect(container.textContent).toContain('亚洲');
    expect(container.textContent).toContain('万里长城与喜马拉雅山脉');
    expect(container.textContent).toContain('国宝大熊猫与孟加拉虎');
    expect(container.textContent).toContain('环球护照集章问答');
  });

  it('answers quiz correctly and collects stamp', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<WorldSafariExplorer />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const asiaAnswerBtn = buttons.find((b) => b.textContent?.trim() === '亚洲');

    await act(async () => { asiaAnswerBtn?.click(); });

    expect(container.textContent).toContain('已集 1/12 处印章');
  });

  it('switches continent to Africa cleanly', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<WorldSafariExplorer />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const africaBtn = buttons.find((b) => b.textContent?.includes('非洲'));
    await act(async () => { africaBtn?.click(); });

    expect(container.textContent).toContain('非洲');
    expect(container.textContent).toContain('古埃及金字塔与东非大草原');
    expect(container.textContent).toContain('草原之王狮子与长颈鹿');
  });
});
