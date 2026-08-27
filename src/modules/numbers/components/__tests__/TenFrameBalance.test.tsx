// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { TenFrameBalance } from '../TenFrameBalance';

vi.mock('@/lib/speech', () => ({
  speak: vi.fn(),
  stopSpeaking: vi.fn(),
}));

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWin: vi.fn(),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

vi.mock('motion/react', () => {
  const filterMotionProps = (props: Record<string, unknown>) => {
    const {
      whileHover,
      whileTap,
      initial,
      animate,
      exit,
      transition,
      variants,
      ...rest
    } = props;
    void whileHover;
    void whileTap;
    void initial;
    void animate;
    void exit;
    void transition;
    void variants;
    return rest;
  };

  return {
    motion: {
      div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
        createElement('div', filterMotionProps(props), children),
      button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
        createElement('button', filterMotionProps(props), children),
      span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
        createElement('span', filterMotionProps(props), children),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren<unknown>) =>
      createElement('div', null, children),
  };
});

describe('TenFrameBalance', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root?.unmount();
      });
      container.remove();
    }
  });

  it('renders ten-frame mode and dot controls', () => {
    act(() => {
      root?.render(createElement(TenFrameBalance));
    });
    expect(container?.textContent).toContain('蒙台梭利十格阵');
    expect(container?.textContent).toContain('放入一个 🔵');
    expect(container?.textContent).toContain('验证凑十');
  });

  it('switches to balance mode when tab clicked', () => {
    act(() => {
      root?.render(createElement(TenFrameBalance));
    });
    const balanceTab = Array.from(container?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('重力平衡天平')
    );
    expect(balanceTab).toBeDefined();
    act(() => {
      balanceTab?.click();
    });
    expect(container?.textContent).toContain('空间重力平衡天平');
    expect(container?.textContent).toContain('清空右盘');
  });
});
