// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BadgeUnlock } from '../BadgeUnlock';

const mockStore = {
  pendingBadges: [] as string[],
  consumeBadge: vi.fn(),
};

vi.mock('@/store/useStore', () => ({
  useStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

vi.mock('@/lib/sfx', () => ({
  sfxWin: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateBig: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  speak: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/ai/useAi', () => ({
  useAiStream: () => ({ text: '', loading: false, error: null }),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
  }),
}));

describe('BadgeUnlock Component', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = null;
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
      container = null;
    }
    vi.clearAllMocks();
  });

  it('renders nothing when pendingBadges is empty', () => {
    mockStore.pendingBadges = [];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(createElement(BadgeUnlock));
    });

    expect(container.innerHTML).toBe('');
  });

  it('renders celebration modal when a badge is unlocked', () => {
    mockStore.pendingBadges = ['first-step'];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(createElement(BadgeUnlock));
    });

    expect(document.body.textContent).toContain('badge.unlockNew');
    expect(document.body.textContent).toContain('启程小星');
  });
});
