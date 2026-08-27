// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HANZI_DATA } from '@/data/hanzi';

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

const { HanziEtymologyPlay } = await import('../HanziEtymologyPlay');
const { HanziPhonicsExplain } = await import('../HanziPhonicsExplain');
const { HanziGamePractice } = await import('../HanziGamePractice');
const { HanziStrokeCanvas } = await import('../HanziStrokeCanvas');
const { HanziSpeechReview } = await import('../HanziSpeechReview');

let host: HTMLDivElement;
let root: Root;

describe('Hanzi 5 Steps Individual Components (五步精学各环节单测)', () => {
  const char = HANZI_DATA.find((h) => h.c === '日') || HANZI_DATA[0]!;

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

  it('Step 1 (HanziEtymologyPlay): 渲染象形演变与四阶段切换', () => {
    const onComplete = vi.fn();
    act(() => {
      root.render(createElement(HanziEtymologyPlay, { char, onComplete }));
    });

    expect(host.textContent).toContain('「日」字的奇妙诞生记');
    expect(host.textContent).toContain('原始具象');
    expect(host.textContent).toContain('甲骨文');

    const nextBtn = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('进入「认字理」')
    );
    expect(nextBtn).toBeTruthy();
    act(() => {
      nextBtn!.click();
    });
    expect(onComplete).toHaveBeenCalledWith(3);
  });

  it('Step 2 (HanziPhonicsExplain): 渲染拼音、部首与常用组词', () => {
    const onComplete = vi.fn();
    act(() => {
      root.render(createElement(HanziPhonicsExplain, { char, onComplete }));
    });

    expect(host.textContent).toContain('认字音 · 明字理');
    expect(host.textContent).toContain(char.pd);
    expect(host.textContent).toContain(`部首：${char.radical}`);

    const nextBtn = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('进入「趣味练」')
    );
    expect(nextBtn).toBeTruthy();
    act(() => {
      nextBtn!.click();
    });
    expect(onComplete).toHaveBeenCalledWith(3);
  });

  it('Step 3 (HanziGamePractice): 渲染投喂萌宠小游戏并支持点击作答', () => {
    const onComplete = vi.fn();
    act(() => {
      root.render(createElement(HanziGamePractice, { char, onComplete }));
    });

    expect(host.textContent).toContain('投喂萌宠识汉字');
    expect(host.textContent).toContain('关卡 1/3');

    // 找到包含目标字符的按钮并点击
    const targetBtn = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(char.c)
    );
    expect(targetBtn).toBeTruthy();
    act(() => {
      targetBtn!.click();
    });
  });

  it('Step 4 (HanziStrokeCanvas): 渲染田字格画板与笔顺操作按钮', () => {
    const onComplete = vi.fn();
    act(() => {
      root.render(createElement(HanziStrokeCanvas, { char, onComplete }));
    });

    const cvs = host.querySelector('canvas');
    expect(cvs).toBeTruthy();
    expect(host.textContent).toContain('演示笔顺');
    expect(host.textContent).toContain('清空重写');
  });

  it('Step 5 (HanziSpeechReview): 渲染录音麦克风并能完成大通关', () => {
    const onComplete = vi.fn();
    act(() => {
      root.render(createElement(HanziSpeechReview, { char, totalStars: 12, onComplete }));
    });

    expect(host.textContent).toContain('大声朗读 · AI 伴学正音');
    const micBtn = host.querySelector('button') as HTMLButtonElement;
    expect(micBtn).toBeTruthy();
  });
});
