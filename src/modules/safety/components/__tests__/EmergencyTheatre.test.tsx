// @vitest-environment jsdom
/**
 * 🚨 EmergencyTheatre.test.tsx
 * 单元测试：生活安全与突发避险演练剧场
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { EmergencyTheatre } from '../EmergencyTheatre';

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

describe('EmergencyTheatre Component', () => {
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

  it('renders all 4 safety scenario categories', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<EmergencyTheatre />);
    });

    expect(container.textContent).toContain('居家防意外');
    expect(container.textContent).toContain('出行防走失');
    expect(container.textContent).toContain('户外防溺水');
    expect(container.textContent).toContain('灾害大逃生');
  });

  it('switches category to 灾害大逃生', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<EmergencyTheatre />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const disasterBtn = buttons.find((b) => b.textContent?.includes('灾害大逃生'));
    await act(async () => { disasterBtn?.click(); });

    expect(container.textContent).toContain('地震避险三步法');
    expect(container.textContent).toContain('伏地、护头、钻入结实桌下抓牢桌腿');
  });

  it('handles choosing safe option with feedback and streak progress', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<EmergencyTheatre />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const safeBtn = buttons.find((b) => b.textContent?.includes('把手擦干'));
    await act(async () => { safeBtn?.click(); });

    expect(container.textContent).toContain('牢记口诀');
    expect(container.textContent).toContain('演练下一幕场景');
  });

  it('handles choosing danger option with danger alert', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<EmergencyTheatre />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const dangerBtn = buttons.find((b) => b.textContent?.includes('湿着手直接'));
    await act(async () => { dangerBtn?.click(); });

    expect(container.textContent).toContain('非常危险');
    expect(container.textContent).toContain('演练下一幕场景');
  });
});
