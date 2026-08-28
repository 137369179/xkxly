// @vitest-environment jsdom
/**
 * 🛡️ SafetyPage.test.tsx
 * 单元测试：安全生活防护馆主页与紧急电话模拟
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SafetyPage from '../SafetyPage';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
  sfxBubble: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  speak: vi.fn().mockResolvedValue(undefined),
  stopSpeaking: vi.fn(),
}));

vi.mock('@/lib/ai/useAi', () => ({
  useAiStream: () => ({
    status: 'idle',
    text: '',
    run: vi.fn(),
  }),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function mkDiv() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

describe('SafetyPage Component', () => {
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

  it('renders emergency dialer and safety scenes', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<SafetyPage />);
    });

    expect(container.textContent).toContain('safety.pageTitle');
    expect(container.textContent).toContain('safety.dialTitle');
    expect(container.textContent).toContain('safety.aiTitle');
  });

  it('dials emergency number 110 properly', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<SafetyPage />);
    });

    const dial110Btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '110'
    );
    expect(dial110Btn).toBeTruthy();

    await act(async () => {
      dial110Btn?.click();
    });

    expect(container.textContent).toContain('110');
    expect(container.textContent).toContain('警察叔叔警报电话');
  });
});
