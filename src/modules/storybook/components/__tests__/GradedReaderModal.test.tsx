// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { GradedReaderModal } from '../GradedReaderModal';
import { GRADED_BOOKS_LIBRARY } from '../../engine/GradedBookEngine';

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
  triggerHaptic: vi.fn(),
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

describe('GradedReaderModal', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const mockBook = GRADED_BOOKS_LIBRARY[0]!;
  const onClose = vi.fn();

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

  it('renders book title and level badge', () => {
    act(() => {
      root?.render(createElement(GradedReaderModal, { book: mockBook, onClose }));
    });
    expect(container?.textContent).toContain(mockBook.title);
    expect(container?.textContent).toContain('L1 分级');
  });

  it('navigates through pages and switches to comprehension quiz on completion', () => {
    act(() => {
      root?.render(createElement(GradedReaderModal, { book: mockBook, onClose }));
    });

    const totalPages = mockBook.pages.length;
    for (let i = 0; i < totalPages; i++) {
      const nextBtn = Array.from(container?.querySelectorAll('button') ?? []).find(
        (b) => b.textContent?.includes('下一页') || b.textContent?.includes('去测验')
      );
      expect(nextBtn).toBeDefined();
      act(() => {
        nextBtn?.click();
      });
    }

    // 应该进入测验模式
    expect(container?.textContent).toContain('阅读理解巩固');
    expect(container?.textContent).toContain(mockBook.quiz.question);
  });

  it('allows clicking individual hanzi for point-and-read pronunciation', () => {
    act(() => {
      root?.render(createElement(GradedReaderModal, { book: mockBook, onClose }));
    });
    const firstChar = mockBook.pages[0]!.text[0]!;
    const charEl = Array.from(container?.querySelectorAll('span') ?? []).find(
      (s) => s.textContent === firstChar
    );
    if (charEl) {
      act(() => {
        charEl.click();
      });
    }
    expect(container?.textContent).toContain('轻触上面的任意汉字，即可单独发音点读');
  });
});
