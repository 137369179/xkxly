// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DinoArchaeology } from '../DinoArchaeology';

vi.mock('@/lib/speech', () => ({
  speak: vi.fn(),
  stopSpeaking: vi.fn(),
}));

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxMagic: vi.fn(),
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

describe('DinoArchaeology', () => {
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

  it('renders excavation stage and dinosaur selectors', () => {
    act(() => {
      root?.render(createElement(DinoArchaeology));
    });
    expect(container?.textContent).toContain('恐龙化石挖掘地质层');
    expect(container?.textContent).toContain('霸王龙');
    expect(container?.textContent).toContain('三角龙');
  });

  it('uncovers all parts and advances to assembly stage', () => {
    vi.useFakeTimers();
    act(() => {
      root?.render(createElement(DinoArchaeology));
    });

    const digButtons = Array.from(container?.querySelectorAll('button') ?? []).filter(
      (b) => b.textContent?.includes('轻触挖掘')
    );
    expect(digButtons.length).toBe(4);

    digButtons.forEach((btn) => {
      act(() => {
        btn.click();
      });
    });

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(container?.textContent).toContain('复原拼装台');
    vi.useRealTimers();
  });
});
