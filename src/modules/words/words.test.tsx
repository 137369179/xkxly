// @vitest-environment jsdom
/**
 * 英语单词（words）子系统分批补测 · R7
 * 覆盖范围内现有逻辑，不引入任何新功能：
 *   1. WORD_FAMILIES 词族数据契约 —— 词族迁移练习的数据正确性（id 唯一/词数下限/level 覆盖）
 *   2. Phonics 发音规则数据契约 —— 26 字母 + 组合规则唯一性与示例完整性
 *   3. BodyParts 数据契约 + 组件冒烟/交互 —— 部位数据完整性与学习/点一点模式
 *   4. WordFamilyGame 冒烟/交互 —— 词族选择 → 练习页 → 判题回写 SRS
 *   5. PhonicsListen 冒烟 —— 开始界面渲染（不挂载重量级 Runner）
 * 复用既有 mock 范式（motion Proxy / sfx / speech / i18n / store），celebrate 补 mock。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Mock motion/react 用 Proxy 自动支持任何 motion.xxx 标签
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => {
        return ({ children, className, style, onClick, disabled }: any) =>
          createElement(tag, { className, style, onClick, disabled }, children);
      },
    }
  ),
  AnimatePresence: ({ children }: any) => children,
  MotionConfig: ({ children }: any) => children,
}));

vi.mock('@/lib/sfx', () => ({
  sfxTap: vi.fn(),
  sfxCorrect: vi.fn(),
  sfxWrong: vi.fn(),
  sfxStar: vi.fn(),
  sfxWin: vi.fn(),
  setMuted: vi.fn(),
}));

vi.mock('@/lib/speech', () => ({ speak: vi.fn(() => Promise.resolve()) }));

vi.mock('@/lib/celebrate', () => ({
  celebrateSmall: vi.fn(),
  celebrateBig: vi.fn(),
}));

vi.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => ({ t: (k: any) => (typeof k === 'string' ? k : '') }),
}));

const fakeStore = { practice: vi.fn() };
vi.mock('@/store/useStore', () => ({
  useStore: Object.assign((sel?: any) => (sel ? sel(fakeStore) : fakeStore), {
    getState: () => fakeStore,
  }),
}));

import { PARTS, BodyParts } from './BodyParts';
import { WordFamilyGame } from './WordFamilyGame';
import { PhonicsListen } from './PhonicsListen';
import {
  WORD_FAMILIES,
  getFamiliesOfWord,
} from '@/data/wordFamilies';
import { LETTER_SOUNDS, COMBO_SOUNDS, getAllPhonicsRules } from '@/data/phonics';

describe('WORD_FAMILIES 词族数据契约', () => {
  it('词族总量与阶段覆盖正确（当前 38 族，level 1/2/3 均有）', () => {
    expect(WORD_FAMILIES.length).toBe(38);
    expect(new Set(WORD_FAMILIES.map((f) => f.level))).toEqual(new Set([1, 2, 3]));
    expect(WORD_FAMILIES.filter((f) => f.level === 1).length).toBeGreaterThan(0);
    expect(WORD_FAMILIES.filter((f) => f.level === 2).length).toBeGreaterThan(0);
    expect(WORD_FAMILIES.filter((f) => f.level === 3).length).toBeGreaterThan(0);
  });

  it('id 全局唯一，pattern/sound/desc/emoji 均非空', () => {
    const ids = WORD_FAMILIES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    WORD_FAMILIES.forEach((f) => {
      expect(f.pattern.startsWith('-')).toBe(true);
      expect(f.sound.trim()).not.toBe('');
      expect(f.desc.trim()).not.toBe('');
      expect(f.emoji.trim()).not.toBe('');
    });
  });

  it('每族成员词 >= 3 个且不重复（支撑 target 轮换与选项生成）', () => {
    WORD_FAMILIES.forEach((f) => {
      expect(f.words.length).toBeGreaterThanOrEqual(3);
      expect(new Set(f.words).size).toBe(f.words.length);
      f.words.forEach((w) => expect(w).toMatch(/^[a-z]+$/));
    });
  });

  it('getFamiliesOfWord 大小写不敏感且支持反查', () => {
    expect(getFamiliesOfWord('cat').map((f) => f.id)).toContain('at');
    expect(getFamiliesOfWord('CAT').map((f) => f.id)).toContain('at');
    expect(getFamiliesOfWord('pizza')).toEqual([]);
  });
});

describe('Phonics 发音规则数据契约', () => {
  it('26 个字母基础发音覆盖 a-z', () => {
    expect(LETTER_SOUNDS.length).toBe(26);
    expect([...LETTER_SOUNDS.map((r) => r.letter)].sort().join('')).toBe('abcdefghijklmnopqrstuvwxyz');
  });

  it('组合规则 letter 唯一', () => {
    const letters = COMBO_SOUNDS.map((r) => r.letter);
    expect(new Set(letters).size).toBe(letters.length);
  });

  it('全部规则 letter 无跨表冲突且 examples 非空', () => {
    const all = getAllPhonicsRules();
    const letters = all.map((r) => r.letter);
    expect(new Set(letters).size).toBe(letters.length);
    all.forEach((r) => {
      expect(r.examples.length).toBeGreaterThan(0);
      expect(r.sound.trim()).not.toBe('');
      expect(r.rule.trim()).not.toBe('');
    });
  });
});

describe('BodyParts 数据契约', () => {
  it('12 个部位，id 唯一，中英文与描述均非空', () => {
    expect(PARTS.length).toBe(12);
    expect(new Set(PARTS.map((p) => p.id)).size).toBe(PARTS.length);
    PARTS.forEach((p) => {
      expect(p.name.trim()).not.toBe('');
      expect(p.en.trim()).not.toBe('');
      expect(p.desc.trim()).not.toBe('');
      expect(p.emoji.trim()).not.toBe('');
    });
  });

  it('区域分布正确：head 5 / torso 3 / limb 4', () => {
    const count = (z: string) => PARTS.filter((p) => p.zone === z).length;
    expect(count('head')).toBe(5);
    expect(count('torso')).toBe(3);
    expect(count('limb')).toBe(4);
  });
});

describe('BodyParts 组件渲染与交互', () => {
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

  it('学习模式渲染 12 个部位按钮', async () => {
    await act(async () => {
      root.render(createElement(BodyParts));
    });
    expect(container.textContent).toContain('body.title');
    expect(container.querySelectorAll('button').length).toBeGreaterThanOrEqual(12);
    expect(container.textContent).toContain('Head');
    expect(container.textContent).toContain('Foot');
  });

  it('点击部位显示描述说明', async () => {
    await act(async () => {
      root.render(createElement(BodyParts));
    });
    const eye = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent || '').includes('眼睛')
    );
    await act(async () => {
      eye!.click();
    });
    expect(container.textContent).toContain('用来看世界的窗户');
  });

  it('切换「点一点」模式出现题目提示', async () => {
    await act(async () => {
      root.render(createElement(BodyParts));
    });
    const quiz = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent || '').includes('body.point')
    );
    await act(async () => {
      quiz!.click();
    });
    expect(container.textContent).toContain('body.pointYours');
    expect(container.textContent).toContain('body.next');
  });
});

describe('WordFamilyGame 组件渲染与交互', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fakeStore.practice.mockClear();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('默认渲染当前阶段词族选择卡片（数量与数据一致）', async () => {
    await act(async () => {
      root.render(createElement(WordFamilyGame));
    });
    expect(container.textContent).toContain('words.wordFamily.title');
    const lv1 = WORD_FAMILIES.filter((f) => f.level === 1);
    // 卡片按钮 = 词族数（含阶段切换按钮，故用 >= 精确计数卡片文本）
    const cards = lv1.filter((f) =>
      [...container.querySelectorAll('button')].some((b) => (b.textContent || '').includes(f.pattern))
    );
    expect(cards.length).toBe(lv1.length);
  });

  it('点击词族进入练习页：显示目标词与 4 个选项', async () => {
    await act(async () => {
      root.render(createElement(WordFamilyGame));
    });
    const card = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent || '').includes('-at')
    );
    await act(async () => {
      card!.click();
    });
    expect(container.textContent).toContain('words.wordFamily.question');
    // 目标词 + 3 个异族干扰词 = 4 个小写单词选项按钮
    const opts = [...container.querySelectorAll('button')].filter((b) =>
      /^[a-z]+$/.test((b.textContent || '').trim())
    );
    expect(opts.length).toBe(4);
  });

  it('答对目标词后回写 SRS 并显示正确反馈', async () => {
    await act(async () => {
      root.render(createElement(WordFamilyGame));
    });
    const card = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent || '').includes('-at')
    );
    await act(async () => {
      card!.click();
    });
    const target = WORD_FAMILIES.find((f) => f.id === 'at')!.words[0]!;
    const correctBtn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent === target
    );
    await act(async () => {
      correctBtn!.click();
    });
    expect(fakeStore.practice).toHaveBeenCalledWith('word:family:at', true, 1);
    expect(container.textContent).toContain('words.wordFamily.correct');
  });
});

describe('PhonicsListen 组件冒烟', () => {
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

  it('默认渲染开始界面（标题 + 开始按钮），不触发练习', async () => {
    await act(async () => {
      root.render(createElement(PhonicsListen));
    });
    expect(container.textContent).toContain('phonicsListen.title');
    expect(container.textContent).toContain('phonicsListen.start');
    expect(container.textContent).not.toContain('phonicsListen.soundInfo');
  });
});
