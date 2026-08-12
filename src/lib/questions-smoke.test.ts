/**
 * 拆分后各学科模块出题冒烟验证
 * ------------------------------------------------------------
 * 用 vitest 跑（已配置 TS + 路径别名），通过 console.table 直观打印
 * 每个模块 3 档难度生成的题目样例，方便人眼核对题型/选项/答案是否合理。
 *
 * 运行：npx vitest run src/lib/questions-smoke.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  makeMathQuestion,
  makeCountQuestion,
  makeNumberQuestion,
  makeMulQuestion,
  makeDivQuestion,
  makeShapeQuestion,
  makeTimeQuestion,
  makeCoinQuestion,
  makeCompareQuestion,
  makePatternQuestion,
  makeMatchQuestion,
  makeOrderQuestion,
  makeLetterQuestion,
  makeCategoryQuestion,
  makeOppositeQuestion,
  makeSimilarHanziQuestion,
  makePinyinQuestion,
  makeWordQuestion,
  makeMixedQuestion,
  makeDailyMixedQuestion,
  makePoemQuestion,
  makePoemFillQuestion,
  questionForSkill,
  type Difficulty,
} from './questions';
import POEMS from '@/data/poems';
import type { Question } from '@/types';

/** 把 Question 压成一行可读摘要，便于 console.table 展示 */
function summary(q: Question | null, tag: string): Record<string, string> {
  if (!q) return { tag, result: '❌ null（出题失败）', kind: '-', prompt: '-', answer: '-' };
  const ans = q.options.find((o) => o.id === q.answerId);
  const answerLabel =
    ans?.label ?? ans?.emoji ?? (ans?.shapes ? ans.shapes.join('') : '-');
  const display =
    q.display ??
    (q.displayShapes ? q.displayShapes.join(' ') : '') ??
    '-';
  return {
    tag,
    result: '✅',
    kind: q.kind ?? '-',
    skill: q.skill ?? '-',
    prompt: q.prompt.slice(0, 18),
    display: String(display).slice(0, 22),
    answer: String(answerLabel).slice(0, 14),
    options: q.options.map((o) => o.label ?? o.emoji ?? '').join('|').slice(0, 30),
  };
}

const DIFFS: Difficulty[] = [1, 2, 3];

describe('拆分后各学科模块 · 出题冒烟验证', () => {
  it('math.ts · 加减/乘除/数数/数字/形状/时间/钱币/比大小', () => {
    const rows: ReturnType<typeof summary>[] = [];
    for (const d of DIFFS) {
      rows.push(summary(makeMathQuestion(d), `math:add/sub D${d}`));
      rows.push(summary(makeMulQuestion(d), `math:mul D${d}`));
      rows.push(summary(makeDivQuestion(d), `math:div D${d}`));
      rows.push(summary(makeCountQuestion(d), `count D${d}`));
      rows.push(summary(makeNumberQuestion(d), `number D${d}`));
      rows.push(summary(makeShapeQuestion(d), `shape D${d}`));
      rows.push(summary(makeTimeQuestion(d), `time D${d}`));
      rows.push(summary(makeCoinQuestion(d), `coin D${d}`));
      rows.push(summary(makeCompareQuestion(d), `compare D${d}`));
    }
    console.table(rows);
    // 全部应成功
    for (const r of rows) expect(r.result).toBe('✅');
  });

  it('logic.ts · 找规律/配对/排序', () => {
    const rows: ReturnType<typeof summary>[] = [];
    for (const d of DIFFS) {
      rows.push(summary(makePatternQuestion(d), `pattern D${d}`));
      rows.push(summary(makeMatchQuestion(d), `match D${d}`));
      rows.push(summary(makeOrderQuestion(d), `order D${d}`));
    }
    console.table(rows);
    for (const r of rows) expect(r.result).toBe('✅');
  });

  it('letter.ts · 字母题', () => {
    const rows: ReturnType<typeof summary>[] = [];
    for (const d of DIFFS) {
      rows.push(summary(makeLetterQuestion(d), `letter D${d}`));
    }
    console.table(rows);
    for (const r of rows) expect(r.result).toBe('✅');
  });

  it('poem.ts · 古诗题/填字（真实诗库）', () => {
    const rows: ReturnType<typeof summary>[] = [];
    for (const d of DIFFS) {
      rows.push(summary(makePoemQuestion(POEMS, d), `poem D${d}`));
      rows.push(summary(makePoemFillQuestion(POEMS, d), `poem-fill D${d}`));
    }
    console.table(rows);
    for (const r of rows) expect(r.result).toBe('✅');
  });

  it('concept.ts · 归类/反义词/形近字', () => {
    const rows: ReturnType<typeof summary>[] = [];
    for (const d of DIFFS) {
      rows.push(summary(makeCategoryQuestion(d), `category D${d}`));
      rows.push(summary(makeOppositeQuestion(d), `opposite D${d}`));
      rows.push(summary(makeSimilarHanziQuestion(d), `similar D${d}`));
    }
    console.table(rows);
    for (const r of rows) expect(r.result).toBe('✅');
  });

  it('pinyin.ts · 拼音题（3 档对应 3 种 kind）', () => {
    const rows: ReturnType<typeof summary>[] = [];
    for (const d of DIFFS) {
      rows.push(summary(makePinyinQuestion(d), `pinyin D${d}`));
    }
    console.table(rows);
    // 验证难度梯度：D1=rhyme / D2=char / D3=type
    expect(rows[0]!.kind).toBe('pinyin-rhyme');
    expect(rows[1]!.kind).toBe('pinyin-char');
    expect(rows[2]!.kind).toBe('pinyin-type');
  });

  it('word.ts · 英语单词题（3 档对应 3 种 kind）', () => {
    const rows: ReturnType<typeof summary>[] = [];
    for (const d of DIFFS) {
      rows.push(summary(makeWordQuestion(d), `word D${d}`));
    }
    console.table(rows);
    expect(rows[0]!.kind).toBe('word-emoji');
    expect(rows[1]!.kind).toBe('word-zh');
    expect(rows[2]!.kind).toBe('word-en');
  });

  it('mixed.ts · 综合混合（60 次抽样统计题型分布）', () => {
    const kindCount = new Map<string, number>();
    const samples: ReturnType<typeof summary>[] = [];
    for (let i = 0; i < 60; i++) {
      const q = makeMixedQuestion(1);
      const k = q.kind ?? '-';
      kindCount.set(k, (kindCount.get(k) ?? 0) + 1);
      if (i < 9) samples.push(summary(q, `mixed #${i + 1}`));
    }
    console.log('题型分布：');
    console.table(Object.fromEntries(kindCount));
    console.log('前 9 个样例：');
    console.table(samples);
    // 60 次随机抽样至少命中 5 种题型
    expect(kindCount.size).toBeGreaterThanOrEqual(5);
  });

  it('index.ts · makeDailyMixedQuestion 三种来源驱动', () => {
    const rows: ReturnType<typeof summary>[] = [
      summary(makeDailyMixedQuestion([], 1), '空来源(降级)'),
      summary(
        makeDailyMixedQuestion(['math:add', 'letter:A', 'number:5'], 1),
        '当天学习内容',
      ),
      summary(
        makeDailyMixedQuestion([], 1, {
          wrongBook: ['math:sub', 'letter:B'],
          weakSkills: ['number:count'],
        }),
        '错题本+薄弱点',
      ),
      summary(
        makeDailyMixedQuestion(['logic:pattern', 'poem:静夜思'], 2, {
          wrongBook: ['hanzi:山'],
          weakSkills: ['word:cat'],
        }),
        '全来源混合 D2',
      ),
    ];
    console.table(rows);
    for (const r of rows) expect(r.result).toBe('✅');
  });

  it('index.ts · questionForSkill 派发器覆盖全部 skill 类别', () => {
    const skills = [
      'math:add', 'math:sub', 'math:mul', 'math:div',
      'number:5', 'number:count', 'count',
      'letter:A', 'shape', 'time', 'coin', 'compare',
      'logic:pattern', 'logic:match', 'logic:order',
      'sort', 'pair', 'similar:山',
      'poem:静夜思',
    ];
    const rows = skills.map((s) => summary(questionForSkill(s, 1), `skill:${s}`));
    console.table(rows);
    // 全部应能派发出题（非 null）
    for (const r of rows) expect(r.result).toBe('✅');
  });
});
