// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { GradedBooksSection } from '../GradedBooksSection';

vi.mock('@/lib/speech', () => ({
  speak: vi.fn(),
  stopSpeaking: vi.fn(),
}));

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxStar: vi.fn(),
  sfxWin: vi.fn(),
  sfxMagic: vi.fn(),
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

describe('GradedBooksSection', () => {
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

  it('renders section title and level tabs', () => {
    act(() => {
      root?.render(createElement(GradedBooksSection));
    });
    expect(container?.textContent).toContain('洪恩分级阅读与自集字绘本');
    expect(container?.textContent).toContain('L1 启蒙阶');
    expect(container?.textContent).toContain('L2 萌芽阶');
    expect(container?.textContent).toContain('L3 进阶阶');
  });

  it('switches to custom sub-book tab and renders generator prompt', () => {
    act(() => {
      root?.render(createElement(GradedBooksSection));
    });
    const customTab = Array.from(container?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('自集字定制')
    );
    expect(customTab).toBeDefined();
    act(() => {
      customTab?.click();
    });

    expect(container?.textContent).toContain('立即生成并开启朗读');
  });
});
