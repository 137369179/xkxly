// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SocialEmotionGame } from '../SocialEmotionGame';

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

describe('SocialEmotionGame', () => {
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

  it('renders emotion recognition mode and cards', () => {
    act(() => {
      root?.render(createElement(SocialEmotionGame));
    });
    expect(container?.textContent).toContain('情绪识别与舒缓');
    expect(container?.textContent).toContain('开心快乐');
    expect(container?.textContent).toContain('难过伤心');
    expect(container?.textContent).toContain('生气愤怒');
  });

  it('switches to social manners mode when tab clicked', () => {
    act(() => {
      root?.render(createElement(SocialEmotionGame));
    });
    const socialTab = Array.from(container?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('礼貌与社交小达人')
    );
    expect(socialTab).toBeDefined();
    act(() => {
      socialTab?.click();
    });
    expect(container?.textContent).toContain('社交情境判断题');
    expect(container?.textContent).toContain('换一题');
  });
});
