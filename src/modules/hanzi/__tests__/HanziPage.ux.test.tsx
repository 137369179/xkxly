// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, className, style, onClick, ...props }: any) =>
          createElement(tag, { className, style, onClick, ...props }, children);
      },
    }
  ),
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, className, style, onClick, ...props }: any) =>
          createElement(tag, { className, style, onClick, ...props }, children);
      },
    }
  ),
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxStar: vi.fn(),
  sfxWin: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  triggerHaptic: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({
  speak: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/celebrate', () => ({
  celebrateBig: vi.fn(),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (k: string, opt?: any) => {
      if (k === 'hanzi.pageTitle') return '汉字乐园';
      if (k === 'hanzi.subtitle') return '识字启蒙与国学字理探秘';
      if (k === 'hanzi.recommend') return '今日推荐';
      if (k === 'hanzi.backToWall') return '返回字库';
      if (opt?.name) return opt.name;
      return k;
    },
  }),
}));

const mockProgress = {
  stars: 20,
  streak: 5,
  badges: ['hanzi_master'],
  mastery: {
    'hanzi:一': { lv: 1, last: Date.now() },
    'hanzi:二': { lv: 2, last: Date.now() },
  },
  dailyLog: {},
};

vi.mock('@/store/useStore', () => ({
  useStore: (selector: any) =>
    selector
      ? selector({
          progress: mockProgress,
          learnSkill: vi.fn(),
          practice: vi.fn(),
          markTraced: vi.fn(),
          addStars: vi.fn(),
          addFish: vi.fn(),
        })
      : {
          progress: mockProgress,
          learnSkill: vi.fn(),
          practice: vi.fn(),
          markTraced: vi.fn(),
          addStars: vi.fn(),
          addFish: vi.fn(),
        },
  useMastery: () => mockProgress.mastery,
  useStars: () => 20,
  useStreak: () => 5,
}));

vi.mock('@/store/useProfilesStore', () => ({
  useProfilesStore: (s: any) =>
    s ? s({ activeProfileId: 'default', meta: { default: { name: '乐乐', ageRange: '4-6' } } }) : {},
  useActiveProfileMeta: () => ({ name: '乐乐', avatar: '🐱', ageRange: '4-6' }),
  AGE_RANGES: [{ key: '4-6', label: '4-6岁' }],
}));

import HanziPage from '../HanziPage';
import { HanziLearn } from '../HanziLearn';
import { getHanziByChar, type HanziEntry } from '@/data/hanziIndex';

describe('HanziPage 汉字乐园 4 大专区与 6 步学习闭环 UX 测试', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('正确渲染 4 大主专区标签栏与键盘快捷提示', async () => {
    await act(async () => {
      root.render(createElement(HanziPage));
    });

    expect(container.textContent).toContain('今日闯关');
    expect(container.textContent).toContain('汉字宝库');
    expect(container.textContent).toContain('游乐工坊');
    expect(container.textContent).toContain('字帖复习');
    expect(container.textContent).toContain('键盘快捷操作');
  });

  it('键盘 1-4 快捷键无缝切换四大专区', async () => {
    await act(async () => {
      root.render(createElement(HanziPage));
    });

    // 切换到专区 2: 汉字宝库
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    });
    expect(container.textContent).toContain('启蒙');
    expect(container.textContent).toContain('常用');

    // 切换到专区 3: 游乐工坊
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    });
    expect(container.textContent).toContain('组词造句');
    expect(container.textContent).toContain('听音识字');

    // 切换到专区 4: 字帖复习
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));
    });
    expect(container.textContent).toContain('字帖打印');
    expect(container.textContent).toContain('艾宾浩斯闪卡');
  }, 15000);

  it('单字学习页 HanziLearn 具备完整的 6 步阶梯流', async () => {
    const entry: HanziEntry = getHanziByChar('日') ?? {
      c: '日',
      p: 'ri',
      pd: 'rì',
      tone: 4,
      strokes: 4,
      radical: '日',
      origin: '像太阳之形',
      evolve: '甲骨文像太阳之形',
      freq: 1,
      words: ['太阳', '日子'],
      sentence: '红红的太阳升起来了。',
      level: 1,
    };

    const onDone = vi.fn();

    await act(async () => {
      root.render(createElement(HanziLearn, { hanzi: entry, onDone }));
    });

    expect(container.textContent).toContain('1. 玩·象形探秘');
    expect(container.textContent).toContain('古代物象');
    expect(container.textContent).toContain('键盘快捷操作');
  });
});
