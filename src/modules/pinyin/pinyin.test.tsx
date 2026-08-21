// @vitest-environment jsdom
/**
 * 拼音（pinyin）子系统分批补测 · R7
 * 覆盖范围内现有逻辑，不引入任何新功能：
 *   1. YUNMU 韵母分类数据契约 —— 单6/复9/前鼻5/后鼻4，教学正确性的核心
 *   2. Dictation.makeQuestion 听写出题纯逻辑 —— 4 选项含正确答案且不重复
 *   3. Dictation 冒烟 —— 渲染题目进度与选项
 *   4. PinyinPractice 冒烟/交互 —— 组合表渲染与选中后结果面板
 *   5. PinyinGroup 冒烟/交互 —— 待分类韵母 → 正确归类 → SRS 回写（fake timers）
 * 复用既有 mock 范式（motion Proxy / sfx / speech / i18n / store）。
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

vi.mock('@/lib/speech', () => ({
  speak: vi.fn(() => Promise.resolve()),
  randomPraise: vi.fn(),
  randomEncourage: vi.fn(),
}));

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

import { YUNMU, CATEGORIES, PinyinGroup } from './PinyinGroup';
import { makeQuestion, Dictation } from './Dictation';
import { PinyinPractice } from './PinyinPractice';
import { TonePractice } from './TonePractice';
import { BlendPractice } from './BlendPractice';
import { ALL_COMBOS, getAllPinyin } from '@/data/pinyinIndex';

const CAT_LABEL_KEY: Record<string, string> = {
  single: 'pinyinGroup.single',
  compound: 'pinyinGroup.compound',
  front_nasal: 'pinyinGroup.frontNasal',
  back_nasal: 'pinyinGroup.backNasal',
};

describe('YUNMU 韵母分类数据契约（教学正确性）', () => {
  it('共 24 个韵母，四类分布正确：单6/复9/前鼻5/后鼻4', () => {
    expect(YUNMU.length).toBe(24);
    const count = (type: string) => YUNMU.filter((y) => y.type === type).length;
    expect(count('single')).toBe(6);
    expect(count('compound')).toBe(9);
    expect(count('front_nasal')).toBe(5);
    expect(count('back_nasal')).toBe(4);
  });

  it('韵母唯一且类型均属于合法分类', () => {
    const ids = YUNMU.map((y) => y.p);
    expect(new Set(ids).size).toBe(ids.length);
    const validTypes = CATEGORIES.map((c) => c.id);
    YUNMU.forEach((y) => {
      expect(validTypes).toContain(y.type);
      expect(y.label.trim()).not.toBe('');
    });
  });

  it('单韵母为 a o e i u ü；前鼻音以 n 结尾；后鼻音以 ng 结尾', () => {
    const pOf = (type: string) => YUNMU.filter((y) => y.type === type).map((y) => y.p);
    expect(pOf('single').sort()).toEqual(['a', 'e', 'i', 'o', 'u', 'ü']);
    pOf('front_nasal').forEach((p) => expect(p.endsWith('n')).toBe(true));
    pOf('back_nasal').forEach((p) => expect(p.endsWith('ng')).toBe(true));
  });

  it('CATEGORIES 四类 id 唯一且提示信息完整', () => {
    expect(CATEGORIES.length).toBe(4);
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    CATEGORIES.forEach((c) => {
      expect(c.desc.trim()).not.toBe('');
      expect(c.hint.trim()).not.toBe('');
      expect(c.emoji.trim()).not.toBe('');
    });
  });
});

describe('Dictation.makeQuestion 听写出题纯逻辑', () => {
  const all = getAllPinyin();

  it('每题 4 个选项，必含正确答案且互不重复', () => {
    for (let i = 0; i < 10; i++) {
      const { correct, options } = makeQuestion(all);
      expect(options.length).toBe(4);
      const ps = options.map((o) => o.p);
      expect(new Set(ps).size).toBe(4);
      expect(ps).toContain(correct.p);
      options.forEach((o) => expect(all.map((x) => x.p)).toContain(o.p));
    }
  });

  it('多次出题存在随机性（20 次调用产生多组不同选项）', () => {
    const combos = new Set(
      Array.from({ length: 20 }, () => makeQuestion(all).options.map((o) => o.p).join(','))
    );
    expect(combos.size).toBeGreaterThan(1);
  });
});

describe('Dictation 组件冒烟', () => {
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

  it('渲染题目进度（1/20）、重听按钮与 4 个拼音选项', async () => {
    await act(async () => {
      root.render(createElement(Dictation));
    });
    expect(container.textContent).toContain('dictation.title');
    expect(container.textContent).toContain('1/20');
    expect(container.textContent).toContain('dictation.relisten');
    const optBtns = [...container.querySelectorAll('button')].filter((b) =>
      getAllPinyin().some((p) => p.p === b.textContent)
    );
    expect(optBtns.length).toBe(4);
  });
});

describe('PinyinPractice 组合表渲染与交互', () => {
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

  it('渲染全部声韵组合条目，点击后出现练习面板', async () => {
    await act(async () => {
      root.render(createElement(PinyinPractice));
    });
    expect(container.textContent).toContain('pinyin.comboTableTitle');
    // 组合条目按钮：文本包含 shengmu + yunmu + result
    const comboBtns = [...container.querySelectorAll('button')].filter((b) =>
      ALL_COMBOS.some((c) => (b.textContent || '').includes(c.result))
    );
    expect(comboBtns.length).toBe(ALL_COMBOS.length);

    await act(async () => {
      comboBtns[0]!.click();
    });
    expect(container.textContent).toContain('pinyin.listenCombo');
    expect(container.textContent).toContain('pinyin.aiExplainCombo');
  });
});

describe('PinyinGroup 韵母归类交互', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fakeStore.practice.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => root.unmount());
    container.remove();
  });

  it('渲染 4 个分类框与 8 个待分类韵母', async () => {
    await act(async () => {
      root.render(createElement(PinyinGroup));
    });
    const pendingBtns = [...container.querySelectorAll('button')].filter((b) =>
      YUNMU.some((y) => y.p === b.textContent)
    );
    expect(pendingBtns.length).toBe(8);
    CATEGORIES.forEach((c) => {
      expect(container.textContent).toContain(CAT_LABEL_KEY[c.id]);
    });
  });

  it('正确归类：选中韵母 → 点正确分类框 → 回写 SRS 并显示正确反馈', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await act(async () => {
      root.render(createElement(PinyinGroup));
    });
    const pendingBtns = [...container.querySelectorAll('button')].filter((b) =>
      YUNMU.some((y) => y.p === b.textContent)
    );
    const first = pendingBtns[0]!;
    const p = first.textContent!.trim();
    const type = YUNMU.find((y) => y.p === p)!.type;

    await act(async () => {
      first.click();
    });
    // 分类框按钮文本含对应 label key
    const catBtn = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent || '').includes(CAT_LABEL_KEY[type] ?? '')
    );
    await act(async () => {
      catBtn!.click();
    });

    expect(fakeStore.practice).toHaveBeenCalledWith(`pinyin:group:${type}`, true, 1);
    expect(container.textContent).toContain('pinyinGroup.correct');

    // 推进 1.3s：反馈清除、进入下一轮
    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
    expect(container.textContent).not.toContain('pinyinGroup.correct');
  });

  it('错误归类：回写 SRS false 并显示纠错反馈', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await act(async () => {
      root.render(createElement(PinyinGroup));
    });
    const pendingBtns = [...container.querySelectorAll('button')].filter((b) =>
      YUNMU.some((y) => y.p === b.textContent)
    );
    const first = pendingBtns[0]!;
    const p = first.textContent!.trim();
    const type = YUNMU.find((y) => y.p === p)!.type;
    const wrongType = CATEGORIES.find((c) => c.id !== type)!.id;

    await act(async () => {
      first.click();
    });
    const wrongBtn = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent || '').includes(CAT_LABEL_KEY[wrongType] ?? '')
    );
    await act(async () => {
      wrongBtn!.click();
    });

    expect(fakeStore.practice).toHaveBeenCalledWith(`pinyin:group:${type}`, false, 0);
    expect(container.textContent).toContain('pinyinGroup.wrong');

    await act(async () => {
      vi.advanceTimersByTime(1300);
    });
  });
});

describe('TonePractice / BlendPractice 闯关里程碑条（R53 游戏化接入）', () => {
  it('TonePractice 渲染 3 圆点闯关条（连对可视化）', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(TonePractice));
    });
    const dots = container.querySelectorAll('[data-testid^="streak-dot-"]');
    expect(dots.length).toBe(3);
    // 初始无点亮
    dots.forEach((d) => expect(d.getAttribute('data-on')).toBe('0'));
    await act(async () => root.unmount());
    document.body.removeChild(container);
  });

  it('BlendPractice 进入游戏后渲染 3 圆点闯关条（连对可视化）', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(BlendPractice));
    });
    // 开始面板：无闯关条（游戏未开始）
    expect(container.querySelectorAll('[data-testid^="streak-dot-"]').length).toBe(0);
    // 点击「开始」进入游戏
    const startBtn = [...container.querySelectorAll('button')].find((b) => (b.textContent || '').includes('blendPractice.start'));
    await act(async () => {
      startBtn!.click();
    });
    const dots = container.querySelectorAll('[data-testid^="streak-dot-"]');
    expect(dots.length).toBe(3);
    await act(async () => root.unmount());
    document.body.removeChild(container);
  });
});
