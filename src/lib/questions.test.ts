import { describe, it, expect } from 'vitest';
import {
  makeMathQuestion,
  makeCountQuestion,
  makeNumberQuestion,
  makeLetterQuestion,
  makePatternQuestion,
  makeMatchQuestion,
  makeOrderQuestion,
  makeMulQuestion,
  makeDivQuestion,
  makeShapeQuestion,
  makeTimeQuestion,
  makeCoinQuestion,
  makeCompareQuestion,
  makeCategoryQuestion,
  makeOppositeQuestion,
  makeSimilarHanziQuestion,
  makePinyinQuestion,
  makeWordQuestion,
  makeMixedQuestion,
  makeDailyMixedQuestion,
  makePoemQuestion,
  makePoemFillQuestion,
  wrongReason,
  questionForSkill,
  type Difficulty,
} from './questions';
import POEMS from '@/data/poems';
import type { Question } from '@/types';

/** 通用断言：每个题目必须有 2-4 个选项，且正确答案在选项中 */
function expectValidQuestion(q: Question | null) {
  expect(q).not.toBeNull();
  if (!q) return;
  expect(q.id).toBeTruthy();
  expect(q.prompt).toBeTruthy();
  // 大多数题型 4 选项；排序 max/min 模式按数字个数定（难度 1 为 3）
  expect(q.options.length).toBeGreaterThanOrEqual(2);
  expect(q.options.length).toBeLessThanOrEqual(4);
  expect(q.options.some((o) => o.id === q.answerId)).toBe(true);
  expect(q.skill).toBeTruthy();
  // 选项 id 不重复
  expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
}

describe('questions · makeMathQuestion()', () => {
  it('生成合法的加减法题', () => {
    for (let i = 0; i < 50; i++) {
      const q = makeMathQuestion(1);
      expectValidQuestion(q);
      expect(['math:add', 'math:sub']).toContain(q.skill);
    }
  });

  it('forceOp 强制加法', () => {
    for (let i = 0; i < 20; i++) {
      expect(makeMathQuestion(1, 'add').skill).toBe('math:add');
    }
  });

  it('forceOp 强制减法', () => {
    for (let i = 0; i < 20; i++) {
      expect(makeMathQuestion(1, 'sub').skill).toBe('math:sub');
    }
  });

  it('难度 1 的答案不超过 10', () => {
    for (let i = 0; i < 50; i++) {
      const q = makeMathQuestion(1);
      const ans = q!.options.find((o) => o.id === q!.answerId)!.label;
      // 加法的和或减法的差
      const num = Number(ans);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(10);
    }
  });
});

describe('questions · makeCountQuestion()', () => {
  it('生成合法的数数题', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeCountQuestion(1);
      expectValidQuestion(q);
      expect(q!.skill).toBe('number:count');
      expect(q!.displayShapes).toBeDefined();
      expect(q!.displayShapes!.length).toBeGreaterThan(0);
    }
  });
});

describe('questions · makeNumberQuestion()', () => {
  it('生成合法的数字认知题', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeNumberQuestion(1);
      expectValidQuestion(q);
      expect(q!.skill).toMatch(/^number:/);
    }
  });

  it('forceN 强制指定数字', () => {
    const q = makeNumberQuestion(1, 7);
    expect(q!.skill).toBe('number:7');
  });
});

describe('questions · makeLetterQuestion()', () => {
  it('生成合法的字母题', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeLetterQuestion(1);
      expectValidQuestion(q);
      expect(q!.skill).toMatch(/^letter:/);
    }
  });

  it('forceLetter 强制指定字母', () => {
    const q = makeLetterQuestion(1, 'A');
    expect(q!.skill).toBe('letter:A');
  });
});

describe('questions · makePatternQuestion()', () => {
  it('生成合法的找规律题', () => {
    for (let i = 0; i < 20; i++) {
      const q = makePatternQuestion(1);
      expectValidQuestion(q);
      expect(q!.skill).toBe('logic:pattern');
    }
  });
});

describe('questions · makeMatchQuestion()', () => {
  it('生成合法的图形配对题', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeMatchQuestion(1);
      expectValidQuestion(q);
      expect(q!.skill).toBe('logic:match');
    }
  });
});

describe('questions · makeOrderQuestion()', () => {
  it('生成合法的排序题', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeOrderQuestion(1);
      expectValidQuestion(q);
      expect(q!.skill).toBe('logic:order');
    }
  });
});

describe('questions · 乘除法', () => {
  it('乘法题答案 = a × b', () => {
    const q = makeMulQuestion(1);
    expectValidQuestion(q);
    expect(q!.skill).toBe('math:mul');
  });

  it('除法题答案 = total ÷ b', () => {
    const q = makeDivQuestion(1);
    expectValidQuestion(q);
    expect(q!.skill).toBe('math:div');
  });
});

describe('questions · 图形/时间/钱币', () => {
  it('图形题', () => {
    const q = makeShapeQuestion(1);
    expectValidQuestion(q);
    expect(q!.skill).toBe('shape:recognize');
  });

  it('时间题', () => {
    const q = makeTimeQuestion(1);
    expectValidQuestion(q);
    expect(q!.skill).toBe('time:clock');
  });

  it('钱币题', () => {
    const q = makeCoinQuestion(1);
    expectValidQuestion(q);
    expect(q!.skill).toBe('coin:recognize');
  });
});

describe('questions · questionForSkill()', () => {
  it('letter 类别派发', () => {
    const q = questionForSkill('letter:A', 1);
    expectValidQuestion(q);
    expect(q!.skill).toBe('letter:A');
  });

  it('math:add 类别派发', () => {
    const q = questionForSkill('math:add', 1);
    expectValidQuestion(q);
    expect(q!.skill).toBe('math:add');
  });

  it('count 类别派发', () => {
    const q = questionForSkill('count', 1);
    expectValidQuestion(q);
    expect(q!.skill).toBe('number:count');
  });

  it('logic:pattern 类别派发', () => {
    const q = questionForSkill('logic:pattern', 1);
    expectValidQuestion(q);
    expect(q!.skill).toBe('logic:pattern');
  });

  it('未知类别返回 null', () => {
    expect(questionForSkill('unknown:x', 1)).toBeNull();
  });
});

/* ============================================================
   拆分后各学科模块的集成测试
   ------------------------------------------------------------
   覆盖 concept / pinyin / word / poem / mixed / wrongReason，
   验证每个文件独立 import 后都能正常生成合法题目。
   ============================================================ */

describe('questions · 拆分模块 · math.ts · makeCompareQuestion()', () => {
  it('生成合法的比大小题', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeCompareQuestion(1);
      expectValidQuestion(q);
      expect(q!.skill).toBe('compare:size');
      expect(q!.kind).toBe('compare');
    }
  });
});

describe('questions · 拆分模块 · concept.ts', () => {
  it('makeCategoryQuestion 生成合法的归类题', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeCategoryQuestion(1);
      expectValidQuestion(q);
      expect(q!.skill).toBe('sort:category');
      expect(q!.kind).toBe('sort');
    }
  });

  it('makeOppositeQuestion 生成合法的反义词题', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeOppositeQuestion(1);
      expectValidQuestion(q);
      expect(q!.skill).toBe('pair:opposite');
      expect(q!.kind).toBe('pair');
    }
  });

  it('makeSimilarHanziQuestion 生成合法的形近字题', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeSimilarHanziQuestion(1);
      expectValidQuestion(q);
      expect(q!.skill).toMatch(/^similar:/);
      expect(q!.kind).toBe('similar');
    }
  });
});

describe('questions · 拆分模块 · pinyin.ts · makePinyinQuestion()', () => {
  it('难度 1 生成顺口溜题', () => {
    for (let i = 0; i < 10; i++) {
      const q = makePinyinQuestion(1);
      expectValidQuestion(q);
      expect(q!.skill).toMatch(/^pinyin:/);
      expect(q!.kind).toBe('pinyin-rhyme');
    }
  });

  it('难度 2 生成示例字题', () => {
    const q = makePinyinQuestion(2);
    expectValidQuestion(q);
    expect(q!.kind).toBe('pinyin-char');
  });

  it('难度 3 生成类型识别题', () => {
    const q = makePinyinQuestion(3);
    expectValidQuestion(q);
    expect(q!.kind).toBe('pinyin-type');
  });
});

describe('questions · 拆分模块 · word.ts · makeWordQuestion()', () => {
  it('难度 1 生成看图选词题', () => {
    for (let i = 0; i < 10; i++) {
      const q = makeWordQuestion(1);
      expectValidQuestion(q);
      expect(q!.skill).toMatch(/^word:/);
      expect(q!.kind).toBe('word-emoji');
    }
  });

  it('难度 2 生成看英文选中文题', () => {
    const q = makeWordQuestion(2);
    expectValidQuestion(q);
    expect(q!.kind).toBe('word-zh');
  });

  it('难度 3 生成看中文选英文题', () => {
    const q = makeWordQuestion(3);
    expectValidQuestion(q);
    expect(q!.kind).toBe('word-en');
  });
});

describe('questions · 拆分模块 · poem.ts', () => {
  it('makePoemQuestion 用真实诗库生成合法古诗题', () => {
    // 真实 POEMS 数据量足够，直接喂入
    for (let i = 0; i < 10; i++) {
      const q = makePoemQuestion(POEMS, 1);
      expectValidQuestion(q);
      expect(q!.skill).toMatch(/^poem:/);
      expect(q!.kind).toBe('poem');
    }
  });

  it('makePoemFillQuestion 生成古诗填字题', () => {
    const q = makePoemFillQuestion(POEMS, 1);
    expectValidQuestion(q);
    expect(q!.kind).toBe('poem');
    expect(q!.display).toContain('＿');
  });

  it('诗库不足 4 首时返回 null', () => {
    expect(makePoemQuestion([POEMS[0]!], 1)).toBeNull();
  });
});

describe('questions · 拆分模块 · mixed.ts', () => {
  it('makeMixedQuestion 覆盖全部题型并生成合法题', () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const q = makeMixedQuestion(1);
      expectValidQuestion(q);
      kinds.add(q!.kind ?? '');
    }
    // 60 次随机抽样应至少命中 5 种以上题型
    expect(kinds.size).toBeGreaterThanOrEqual(5);
  });
});

describe('questions · 拆分模块 · index.ts · makeDailyMixedQuestion()', () => {
  it('无任何来源时降级到全题型混合', () => {
    const q = makeDailyMixedQuestion([], 1);
    expectValidQuestion(q);
  });

  it('当天学习内容驱动出题', () => {
    const skills = ['math:add', 'letter:A', 'number:5'];
    for (let i = 0; i < 20; i++) {
      const q = makeDailyMixedQuestion(skills, 1);
      expectValidQuestion(q);
    }
  });

  it('错题本 + 薄弱知识点驱动出题', () => {
    const q = makeDailyMixedQuestion([], 1, {
      wrongBook: ['math:sub', 'letter:B'],
      weakSkills: ['number:count'],
    });
    expectValidQuestion(q);
  });
});

describe('questions · 拆分模块 · wrongReason.ts · wrongReason()', () => {
  it('math 题给出大小方向提示', () => {
    const q = makeMathQuestion(1, 'add');
    const wrong = q!.options.find((o) => o.id !== q!.answerId)!;
    const reason = wrongReason(q!, wrong.label ?? '');
    expect(reason).toBeTruthy();
    expect(reason.length).toBeGreaterThan(5);
  });

  it('poem 题给出多读两遍提示', () => {
    const q = makePoemQuestion(POEMS, 1);
    if (q) {
      const wrong = q.options.find((o) => o.id !== q.answerId)!;
      const reason = wrongReason(q, wrong.label ?? '');
      expect(reason).toContain('多读两遍');
    }
  });

  it('无法识别题型时返回通用兜底提示', () => {
    const q: Question = {
      id: 'x',
      kind: 'unknown-kind',
      prompt: '测试',
      options: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      answerId: 'a',
      skill: 'unknown:x',
    };
    const reason = wrongReason(q, 'B');
    expect(reason).toContain('正确答案');
  });
});

describe('questions · 拆分模块 · 难度梯度回归', () => {
  // 对每个学科模块都跑 3 档难度，确保拆分后难度梯度未丢失
  const difficulties: Difficulty[] = [1, 2, 3];

  for (const d of difficulties) {
    it(`math.ts 各难度（${d}）均能出题`, () => {
      expectValidQuestion(makeMathQuestion(d));
      expectValidQuestion(makeMulQuestion(d));
      expectValidQuestion(makeDivQuestion(d));
      expectValidQuestion(makeCountQuestion(d));
      expectValidQuestion(makeNumberQuestion(d));
      expectValidQuestion(makeCompareQuestion(d));
    });

    it(`logic.ts 各难度（${d}）均能出题`, () => {
      expectValidQuestion(makePatternQuestion(d));
      expectValidQuestion(makeMatchQuestion(d));
      expectValidQuestion(makeOrderQuestion(d));
    });

    it(`concept.ts 各难度（${d}）均能出题`, () => {
      expectValidQuestion(makeCategoryQuestion(d));
      expectValidQuestion(makeOppositeQuestion(d));
      expectValidQuestion(makeSimilarHanziQuestion(d));
    });

    it(`pinyin.ts / word.ts / poem.ts 各难度（${d}）均能出题`, () => {
      expectValidQuestion(makePinyinQuestion(d));
      expectValidQuestion(makeWordQuestion(d));
      expectValidQuestion(makePoemQuestion(POEMS, d));
    });
  }
});
