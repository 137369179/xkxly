/**
 * skillRouting.ts 单元测试
 * ------------------------------------------------------------------
 * 覆盖 skillToTarget 各命名空间映射（hanzi / pinyin / letter / word /
 * math / logic / poem）、未知 key 返回 null，以及 paramToTarget 反向解析。
 * openTraining 需操作 window.location.hash，用 vi.hoisted 提前 mock。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mock = vi.hoisted(() => {
  const hashchangeListeners = new Set<(e: { type: string }) => void>();
  let currentHash = '';

  const fakeWindow = {
    location: {
      get hash() {
        return currentHash;
      },
      set hash(v: string) {
        const old = currentHash;
        currentHash = v;
        if (old !== v) {
          setTimeout(() => {
            hashchangeListeners.forEach((l) => l({ type: 'hashchange' }));
          }, 0);
        }
      },
    },
    addEventListener(event: string, listener: (e: { type: string }) => void) {
      if (event === 'hashchange') hashchangeListeners.add(listener);
    },
    removeEventListener(event: string, listener: (e: { type: string }) => void) {
      if (event === 'hashchange') hashchangeListeners.delete(listener);
    },
  };

  (globalThis as unknown as { window: typeof fakeWindow }).window = fakeWindow;

  return {
    setHash(h: string) {
      currentHash = h;
    },
    getHash() {
      return currentHash;
    },
    resetHash() {
      currentHash = '';
    },
  };
});

import { skillToTarget, paramToTarget, openTraining } from './skillRouting';

beforeEach(() => {
  mock.resetHash();
});

afterEach(() => {
  mock.resetHash();
});

/* ------------------------------------------------------------------ */
/* skillToTarget · hanzi                                              */
/* ------------------------------------------------------------------ */
describe('skillToTarget · hanzi', () => {
  it('hanzi:<char> → hanzi 路由 + 认读标签', () => {
    expect(skillToTarget('hanzi:木')).toEqual({ route: 'hanzi', param: '木', label: '识字·木' });
  });

  it('hanzi-stroke:<char> → 笔顺模式', () => {
    expect(skillToTarget('hanzi-stroke:水')).toEqual({ route: 'hanzi', param: 'stroke:水', label: '识字·笔顺' });
  });

  it('hanzi-build:<char> → 组词模式', () => {
    expect(skillToTarget('hanzi-build:好')).toEqual({ route: 'hanzi', param: 'build:好', label: '识字·组词' });
  });
});

/* ------------------------------------------------------------------ */
/* skillToTarget · pinyin                                             */
/* ------------------------------------------------------------------ */
describe('skillToTarget · pinyin', () => {
  it('pinyin:tone → 声调', () => {
    expect(skillToTarget('pinyin:tone')).toEqual({ route: 'pinyin', param: 'tone', label: '拼音·声调' });
  });

  it('pinyin:blend:* → 拼读', () => {
    expect(skillToTarget('pinyin:blend:ao')).toEqual({ route: 'pinyin', param: 'blend', label: '拼音·拼读' });
  });

  it('pinyin:dictation → 听写', () => {
    expect(skillToTarget('pinyin:dictation')).toEqual({ route: 'pinyin', param: 'dictation', label: '拼音·听写' });
  });

  it('pinyin:group:* → 归类', () => {
    expect(skillToTarget('pinyin:group:single')).toEqual({ route: 'pinyin', param: 'group', label: '拼音·归类' });
  });

  it('其他 pinyin:* → 综合练习（无参数）', () => {
    expect(skillToTarget('pinyin:shengmu')).toEqual({ route: 'pinyin', label: '拼音练习' });
  });
});

/* ------------------------------------------------------------------ */
/* skillToTarget · letter                                             */
/* ------------------------------------------------------------------ */
describe('skillToTarget · letter', () => {
  it('letter-trace:<A> → 书写', () => {
    expect(skillToTarget('letter-trace:A')).toEqual({ route: 'letters', param: 'trace:A', label: '字母·书写 A' });
  });

  it('letter-order → 排序', () => {
    expect(skillToTarget('letter-order')).toEqual({ route: 'letters', param: 'order', label: '字母·排序' });
  });

  it('letter-study:<A> → 认读', () => {
    expect(skillToTarget('letter-study:B')).toEqual({ route: 'letters', param: 'B', label: '字母·B' });
  });

  it('letter:<A> → 认读', () => {
    expect(skillToTarget('letter:C')).toEqual({ route: 'letters', param: 'C', label: '字母·C' });
  });
});

/* ------------------------------------------------------------------ */
/* skillToTarget · word                                               */
/* ------------------------------------------------------------------ */
describe('skillToTarget · word', () => {
  it('word:sentence:* → 句子', () => {
    expect(skillToTarget('word:sentence:s1')).toEqual({ route: 'words', param: 'sentence', label: '单词·句子' });
  });

  it('word:dialogue:* → 对话', () => {
    expect(skillToTarget('word:dialogue:d1')).toEqual({ route: 'words', param: 'dialogue', label: '单词·对话' });
  });

  it('word:phonics:* → 自然拼读', () => {
    expect(skillToTarget('word:phonics:a')).toEqual({ route: 'words', param: 'phonics', label: '单词·自然拼读' });
  });

  it('word:family:* → 自然拼读', () => {
    expect(skillToTarget('word:family:at')).toEqual({ route: 'words', param: 'phonics', label: '单词·自然拼读' });
  });

  it('其他 word:* → 词汇练习', () => {
    expect(skillToTarget('word:cat')).toEqual({ route: 'words', param: 'practice', label: '单词·词汇' });
    expect(skillToTarget('word:review:cat')).toEqual({ route: 'words', param: 'practice', label: '单词·词汇' });
  });
});

/* ------------------------------------------------------------------ */
/* skillToTarget · math / number / compare / time                     */
/* ------------------------------------------------------------------ */
describe('skillToTarget · math', () => {
  it('math:<sub> 已知子技能 → 对应中文标签', () => {
    expect(skillToTarget('math:fraction')).toEqual({ route: 'numbers', param: 'fraction', label: '数学·披萨分数' });
    expect(skillToTarget('math:money')).toEqual({ route: 'numbers', param: 'money', label: '数学·认识钱币' });
    expect(skillToTarget('math:shape')).toEqual({ route: 'numbers', param: 'shape', label: '数学·形状认知' });
    expect(skillToTarget('math:skip')).toEqual({ route: 'numbers', param: 'skip', label: '数学·跳数规律' });
    expect(skillToTarget('math:time')).toEqual({ route: 'numbers', param: 'time', label: '数学·认识时钟' });
    expect(skillToTarget('math:compare')).toEqual({ route: 'numbers', param: 'compare', label: '数学·比较测量' });
    expect(skillToTarget('math:ladder')).toEqual({ route: 'numbers', param: 'ladder', label: '数学·算术梯' });
    expect(skillToTarget('math:word')).toEqual({ route: 'numbers', param: 'word', label: '数学·图文应用题' });
    expect(skillToTarget('math:rabbit')).toEqual({ route: 'numbers', param: 'rabbit', label: '数学·玉兔快跑' });
    expect(skillToTarget('math:tenframe')).toEqual({ route: 'numbers', param: 'tenframe', label: '数学·十格阵' });
    expect(skillToTarget('math:trace')).toEqual({ route: 'numbers', param: 'trace', label: '数学·数字描红' });
  });

  it('math:<未知子技能> → 数学·计算', () => {
    expect(skillToTarget('math:custom')).toEqual({ route: 'numbers', param: 'custom', label: '数学·计算' });
  });

  it('number:count → 数学·数数', () => {
    expect(skillToTarget('number:count')).toEqual({ route: 'numbers', param: 'count', label: '数学·数数乐' });
  });

  it('裸 compare / time → numbers 路由', () => {
    expect(skillToTarget('compare')).toEqual({ route: 'numbers', param: 'compare', label: '数学·比较测量' });
    expect(skillToTarget('time')).toEqual({ route: 'numbers', param: 'time', label: '数学·认识时钟' });
  });
});

/* ------------------------------------------------------------------ */
/* skillToTarget · logic / poem                                       */
/* ------------------------------------------------------------------ */
describe('skillToTarget · logic / poem', () => {
  it('logic:<sub> → 对应中文标签', () => {
    expect(skillToTarget('logic:maze')).toEqual({ route: 'logic', param: 'maze', label: '逻辑·迷宫挑战' });
    expect(skillToTarget('logic:sudoku')).toEqual({ route: 'logic', param: 'sudoku', label: '逻辑·趣味数独' });
    expect(skillToTarget('logic:codebot')).toEqual({ route: 'logic', param: 'codebot', label: '逻辑·编程机器人' });
    expect(skillToTarget('logic:pattern')).toEqual({ route: 'logic', param: 'pattern', label: '逻辑·找规律' });
  });

  it('poem:<id> → 古诗', () => {
    expect(skillToTarget('poem:12')).toEqual({ route: 'poems', param: '12', label: '古诗' });
  });
});

/* ------------------------------------------------------------------ */
/* skillToTarget · 未知 key                                            */
/* ------------------------------------------------------------------ */
describe('skillToTarget · 未知 key', () => {
  it('无法识别的键返回 null', () => {
    expect(skillToTarget('unknown:thing')).toBeNull();
    expect(skillToTarget('math')).toBeNull();
    expect(skillToTarget('letter')).toBeNull();
    expect(skillToTarget('')).toBeNull();
    expect(skillToTarget('hanzi-stroke:')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* paramToTarget · 反向解析                                            */
/* ------------------------------------------------------------------ */
describe('paramToTarget · 反向解析', () => {
  it('hanzi 参数 → 认读 / 笔顺 / 组词', () => {
    expect(paramToTarget('hanzi', '木')).toEqual({ route: 'hanzi', param: '木', label: '识字·木' });
    expect(paramToTarget('hanzi', 'stroke:水')).toEqual({ route: 'hanzi', param: 'stroke:水', label: '识字·笔顺' });
    expect(paramToTarget('hanzi', 'build:好')).toEqual({ route: 'hanzi', param: 'build:好', label: '识字·组词' });
  });

  it('pinyin 参数 → 声调 / 拼读 / 听写 / 归类', () => {
    expect(paramToTarget('pinyin', 'tone')).toEqual({ route: 'pinyin', param: 'tone', label: '拼音·声调' });
    expect(paramToTarget('pinyin', 'blend')).toEqual({ route: 'pinyin', param: 'blend', label: '拼音·拼读' });
    expect(paramToTarget('pinyin', 'dictation')).toEqual({ route: 'pinyin', param: 'dictation', label: '拼音·听写' });
    expect(paramToTarget('pinyin', 'group')).toEqual({ route: 'pinyin', param: 'group', label: '拼音·归类' });
  });

  it('letters 参数 → 书写 / 排序 / 认读', () => {
    expect(paramToTarget('letters', 'trace:A')).toEqual({ route: 'letters', param: 'trace:A', label: '字母·书写 A' });
    expect(paramToTarget('letters', 'order')).toEqual({ route: 'letters', param: 'order', label: '字母·排序' });
    expect(paramToTarget('letters', 'B')).toEqual({ route: 'letters', param: 'B', label: '字母·B' });
  });

  it('words 参数 → 句子 / 对话 / 自然拼读 / 词汇', () => {
    expect(paramToTarget('words', 'sentence')).toEqual({ route: 'words', param: 'sentence', label: '单词·句子' });
    expect(paramToTarget('words', 'dialogue')).toEqual({ route: 'words', param: 'dialogue', label: '单词·对话' });
    expect(paramToTarget('words', 'phonics')).toEqual({ route: 'words', param: 'phonics', label: '单词·自然拼读' });
    expect(paramToTarget('words', 'practice')).toEqual({ route: 'words', param: 'practice', label: '单词·词汇' });
  });

  it('numbers 参数 → 数学标签，未知回退计算', () => {
    expect(paramToTarget('numbers', 'count')).toEqual({ route: 'numbers', param: 'count', label: '数学·数数乐' });
    expect(paramToTarget('numbers', 'fraction')).toEqual({ route: 'numbers', param: 'fraction', label: '数学·披萨分数' });
    expect(paramToTarget('numbers', 'custom')).toEqual({ route: 'numbers', param: 'custom', label: '数学·计算' });
  });

  it('logic / poems 参数', () => {
    expect(paramToTarget('logic', 'maze')).toEqual({ route: 'logic', param: 'maze', label: '逻辑·迷宫挑战' });
    expect(paramToTarget('logic', 'custom')).toEqual({ route: 'logic', param: 'custom', label: '逻辑·思维' });
    expect(paramToTarget('poems', '12')).toEqual({ route: 'poems', param: '12', label: '古诗' });
  });

  it('无参数 / 无法解出 → null', () => {
    expect(paramToTarget('hanzi')).toBeNull();
    expect(paramToTarget('pinyin')).toBeNull();
    expect(paramToTarget('pinyin', 'foo')).toBeNull();
    expect(paramToTarget('words', 'foo')).toBeNull();
    expect(paramToTarget('home', 'x')).toBeNull();
    expect(paramToTarget('parent', 'tone')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* openTraining · 一键导航                                             */
/* ------------------------------------------------------------------ */
describe('openTraining', () => {
  it('已知 skill → 导航到对应路由并返回 true', () => {
    expect(openTraining('hanzi:木')).toBe(true);
    expect(mock.getHash()).toBe('#/hanzi/木');

    expect(openTraining('pinyin:tone')).toBe(true);
    expect(mock.getHash()).toBe('#/pinyin/tone');
  });

  it('未知 skill → 不导航并返回 false', () => {
    expect(openTraining('unknown:thing')).toBe(false);
    expect(mock.getHash()).toBe('');
  });
});
