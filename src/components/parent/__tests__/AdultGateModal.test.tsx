// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AdultGateModal } from '../AdultGateModal';

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxWrong: vi.fn(),
  sfxWin: vi.fn(),
  triggerHaptic: vi.fn(),
}));

describe('AdultGateModal · Parental Security Gate', () => {
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
  });

  it('renders arithmetic challenge and cancel button', () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(
        createElement(AdultGateModal, {
          isOpen: true,
          onSuccess,
          onClose,
        })
      );
    });

    expect(container.textContent).toContain('家长专属验证');
    expect(container.textContent).toContain('换一道题');

    const cancelBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('取消')
    );
    expect(cancelBtn).toBeDefined();
    act(() => {
      cancelBtn?.click();
    });
    expect(onClose).toHaveBeenCalled();
  });
});
