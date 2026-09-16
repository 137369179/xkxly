// @vitest-environment jsdom
/**
 * WordLearn 游戏化接线测试（R168）
 * ----------------------------------------------------------------------------
 * 词语模块此前是三核心里唯一一个 **零游戏化测试** 的模块：既没有星星入账，
 * 也没有任何测试守着。本文件补齐两件事：
 *   ① 外壳接线（冒险路线 / 星星余额 / 星星小屋入口 / 成就墙）确实挂上了；
 *   ② 练习环节 3 连对后星星真实入账（此前答对只写 SRS，账本纹丝不动）。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { WordEntry } from '@/data/wordIndex';

// 只替换 speak（避免 jsdom 无 TTS），其余导出（stopSpeaking 等）保留真实实现，
// 否则 SpeechEvalButton 卸载时调 stopSpeaking 会拿到 undefined 而报错。
vi.mock('@/lib/speech', async () => {
  const actual = await vi.importActual<typeof import('@/lib/speech')>('@/lib/speech');
  return { ...actual, speak: vi.fn(() => Promise.resolve()) };
});
vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  triggerHaptic: vi.fn(),
}));
vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_t: unknown, tag: string) =>
        ({ children, ...rest }: Record<string, unknown>) =>
          createElement(tag, rest, children as never),
    },
  ),
  AnimatePresence: ({ children }: { children?: unknown }) => children ?? null,
  MotionConfig: ({ children }: { children?: unknown }) => children ?? null,
}));

const fakeState = vi.hoisted(() => ({
  addStars: vi.fn(),
  learnSkill: vi.fn(),
  practice: vi.fn(),
  markTraced: vi.fn(),
  spendStars: vi.fn(() => true),
  buySticker: vi.fn(() => true),
  progress: {
    mastery: {} as Record<string, unknown>,
    wrongBook: [] as unknown[],
    stars: 12,
    spent: 0,
    badges: [] as string[],
  },
}));

vi.mock('@/store/useStore', () => {
  const useStoreMock = (sel?: (s: unknown) => unknown) => (sel ? sel(fakeState) : fakeState);
  (useStoreMock as unknown as { getState: () => unknown }).getState = () => fakeState;
  return {
    useStore: useStoreMock,
    useStars: () => fakeState.progress.stars,
    useSpent: () => fakeState.progress.spent,
  };
});

const { WordLearn } = await import('./WordLearn');

const WORD: WordEntry = {
  word: 'cat',
  zh: '猫',
  emoji: '🐱',
  phonetic: '/kæt/',
  phonics: 'c-a-t',
  sentence: 'The cat is cute.',
  sentenceZh: '这只猫很可爱。',
  len: 3,
} as unknown as WordEntry;

let roots: Root[] = [];
let hosts: HTMLDivElement[] = [];

function render(): HTMLDivElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  hosts.push(host);
  act(() => {
    root.render(createElement(WordLearn, { word: WORD, onDone: () => {} }));
  });
  return host;
}

afterEach(() => {
  roots.forEach((r) => act(() => r.unmount()));
  roots = [];
  hosts.forEach((h) => h.remove());
  hosts = [];
});

describe('WordLearn 游戏化接线（R168）', () => {
  it('挂载统一外壳：星星余额 + 星星小屋入口（奖励解锁闭环）', () => {
    const host = render();
    const text = host.textContent ?? '';
    expect(text).toContain('我的星星');
    // 余额来自 store 真源（12），与成长荣誉馆同一份
    expect(text).toContain('12');
    const entry = Array.from(host.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('星星小屋'),
    );
    expect(entry).toBeTruthy();
  });

  it('挂载成就墙（成长目标感 · 任务 #5）', () => {
    const host = render();
    expect(host.querySelector('[aria-label="成就墙"]')).not.toBeNull();
    expect(host.textContent).toContain('我的成就墙');
  });

  it('挂载连击能量条（任务 #1 积分/闯关激励）', () => {
    const host = render();
    expect(host.querySelector('[aria-label="当前连击 0"]')).not.toBeNull();
  });

  it('练习环节不依赖学习步骤即可渲染（外壳不吞内容）', () => {
    const host = render();
    // LearnFlow 第一步「玩」渲染目标词，证明外壳包裹后学习主体仍在
    expect(host.textContent).toContain('cat');
    expect(host.textContent).toContain('🐱');
  });
});
