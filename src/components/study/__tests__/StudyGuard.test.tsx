// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StudyGuard } from '../StudyGuard';

let mockClockState = {
  todaySec: 1800,
  overLimit: false,
  needBreak: true,
  snooze: vi.fn(),
  takeBreak: vi.fn(),
};

vi.mock('@/store/studyClock', () => ({
  useStudyClock: () => mockClockState,
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (k: string) => {
      const dict: Record<string, string> = {
        'studyGuard.breakTitle': '休息一下眼睛吧',
        'studyGuard.breakBody': '看屏幕有一会儿啦，眨眨眼，看看窗外绿植～',
        'studyGuard.limitTitle': '今日学习达标啦',
        'studyGuard.limitBody': '今天学了 30 分钟，太棒啦！',
        'studyGuard.limitBtn': '知道了，明天再学',
      };
      return dict[k] ?? k;
    },
  }),
}));

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  triggerHaptic: vi.fn(),
}));

describe('StudyGuard Component', () => {
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

  it('renders eye relaxation mode when needBreak is true', () => {
    mockClockState = {
      todaySec: 900,
      overLimit: false,
      needBreak: true,
      snooze: vi.fn(),
      takeBreak: vi.fn(),
    };

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(createElement(StudyGuard));
    });

    expect(container.textContent).toContain('休息一下眼睛吧');
    expect(container.textContent).toContain('我休息好啦');

    const breakBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('我休息好啦')
    );
    expect(breakBtn).toBeDefined();

    act(() => {
      breakBtn?.click();
    });

    expect(mockClockState.takeBreak).toHaveBeenCalled();
  });

  it('renders limit guard mode when overLimit is true', () => {
    mockClockState = {
      todaySec: 1800,
      overLimit: true,
      needBreak: false,
      snooze: vi.fn(),
      takeBreak: vi.fn(),
    };

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root?.render(createElement(StudyGuard));
    });

    expect(container.textContent).toContain('今日学习达标啦');
  });
});
