// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HANZI_DATA } from '@/data/hanzi';
import { COURSE_STEPS } from '../types';

vi.mock('@/lib/speech', () => ({
  speak: vi.fn(() => Promise.resolve()),
  stopSpeaking: vi.fn(),
}));

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxStar: vi.fn(),
  sfxPurr: vi.fn(),
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
      whileHover: _wh,
      whileTap: _wt,
      whileFocus: _wf,
      whileDrag: _wd,
      whileInView: _wiv,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      variants: _v,
      layout: _l,
      layoutId: _lid,
      ...rest
    } = props || {};
    return rest;
  };

  return {
    motion: new Proxy(
      {},
      {
        get: (_target: any, tag: string) => {
          return ({ children, ...props }: any) =>
            createElement(tag, filterMotionProps(props), children);
        },
      }
    ),
    AnimatePresence: ({ children }: any) => children,
  };
});

const { HanziCourseRunner } = await import('../HanziCourseRunner');

let host: HTMLDivElement;
let root: Root;

describe('HanziCourseRunner (洪恩五步精学闭环主控)', () => {
  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    host.remove();
  });

  it('COURSE_STEPS 包含完整的 玩/认/练/写/说 五大环节', () => {
    expect(COURSE_STEPS.map((s) => s.id)).toEqual([
      'play',
      'recognize',
      'practice',
      'write',
      'speak',
    ]);
  });

  it('初始挂载渲染第一步「玩·象形演变」并展示目标汉字', () => {
    const char = HANZI_DATA.find((h) => h.c === '山') || HANZI_DATA[0]!;
    const onClose = vi.fn();

    act(() => {
      root.render(createElement(HanziCourseRunner, { char, onClose }));
    });

    expect(host.textContent).toContain('洪恩五步精学');
    expect(host.textContent).toContain('「山」字的奇妙诞生记');
    expect(host.textContent).toContain('象形溯源与互动探险');
  });

  it('点击关闭按钮触发 onClose 回调', () => {
    const char = HANZI_DATA.find((h) => h.c === '山') || HANZI_DATA[0]!;
    const onClose = vi.fn();

    act(() => {
      root.render(createElement(HanziCourseRunner, { char, onClose }));
    });

    const closeBtn = host.querySelector('button[aria-label="关闭精学课程"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    act(() => {
      closeBtn.click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
