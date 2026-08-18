import { describe, it, expect } from 'vitest';
import { rootCauseOf, clusterWrongBook } from './wrongCluster';

/**
 * wrongCluster.test.ts
 * ------------------------------------------------------------------
 * 错题因果聚类：rootCauseOf 逐条映射 + clusterWrongBook 按根因归并。
 * 覆盖：汉字 / 拼音 / 字母 / 单词 / 数学 / 逻辑 / 未知兜底，
 * 以及跨条目归并、空错题本、按 count 降序排序。
 */

describe('rootCauseOf · 汉字', () => {
  it('hanzi-stroke:* → 汉字·笔顺', () => {
    expect(rootCauseOf('hanzi-stroke:水')).toEqual({ key: 'hanzi:stroke', label: '汉字·笔顺' });
    expect(rootCauseOf('hanzi-stroke:山')).toEqual({ key: 'hanzi:stroke', label: '汉字·笔顺' });
  });

  it('hanzi-build:* → 汉字·组词', () => {
    expect(rootCauseOf('hanzi-build:日')).toEqual({ key: 'hanzi:build', label: '汉字·组词' });
  });

  it('hanzi:* → 汉字·认读', () => {
    expect(rootCauseOf('hanzi:水')).toEqual({ key: 'hanzi:read', label: '汉字·认读' });
  });
});

describe('rootCauseOf · 拼音', () => {
  it('pinyin:tone → 拼音·声调', () => {
    expect(rootCauseOf('pinyin:tone')).toEqual({ key: 'pinyin:tone', label: '拼音·声调' });
  });

  it('pinyin:blend:* → 拼音·拼读', () => {
    expect(rootCauseOf('pinyin:blend:ba')).toEqual({ key: 'pinyin:blend', label: '拼音·拼读' });
  });

  it('pinyin:dictation → 拼音·听写', () => {
    expect(rootCauseOf('pinyin:dictation')).toEqual({ key: 'pinyin:dictation', label: '拼音·听写' });
  });

  it('pinyin:group:* → 拼音·归类', () => {
    expect(rootCauseOf('pinyin:group:动物')).toEqual({ key: 'pinyin:group', label: '拼音·归类' });
  });

  it('其余 pinyin:* → 拼音·基础', () => {
    expect(rootCauseOf('pinyin:init:g')).toEqual({ key: 'pinyin', label: '拼音·基础' });
  });
});

describe('rootCauseOf · 字母', () => {
  it('letter-trace:* → 字母·书写', () => {
    expect(rootCauseOf('letter-trace:A')).toEqual({ key: 'letter:trace', label: '字母·书写' });
  });

  it('letter-order → 字母·排序', () => {
    expect(rootCauseOf('letter-order')).toEqual({ key: 'letter:order', label: '字母·排序' });
  });

  it('letter-study:* / letter:* → 字母·认读', () => {
    expect(rootCauseOf('letter-study:B')).toEqual({ key: 'letter:read', label: '字母·认读' });
    expect(rootCauseOf('letter:A')).toEqual({ key: 'letter:read', label: '字母·认读' });
  });
});

describe('rootCauseOf · 单词', () => {
  it('word:sentence:* → 单词·句子', () => {
    expect(rootCauseOf('word:sentence:hello')).toEqual({ key: 'word:sentence', label: '单词·句子' });
  });

  it('word:dialogue:* → 单词·对话', () => {
    expect(rootCauseOf('word:dialogue:greet')).toEqual({ key: 'word:dialogue', label: '单词·对话' });
  });

  it('word:phonics:* / word:family:* → 单词·自然拼读', () => {
    expect(rootCauseOf('word:phonics:a')).toEqual({ key: 'word:phonics', label: '单词·自然拼读' });
    expect(rootCauseOf('word:family:an')).toEqual({ key: 'word:phonics', label: '单词·自然拼读' });
  });

  it('word:review:* → 单词·复习', () => {
    expect(rootCauseOf('word:review:apple')).toEqual({ key: 'word:review', label: '单词·复习' });
  });

  it('其余 word:* → 单词·词汇', () => {
    expect(rootCauseOf('word:cat')).toEqual({ key: 'word', label: '单词·词汇' });
  });
});

describe('rootCauseOf · 数学 / 比较 / 时间', () => {
  it('math:已知子技能 → 数学·对应名', () => {
    expect(rootCauseOf('math:fraction')).toEqual({ key: 'math:fraction', label: '数学·分数' });
    expect(rootCauseOf('math:money')).toEqual({ key: 'math:money', label: '数学·钱币' });
    expect(rootCauseOf('math:shape')).toEqual({ key: 'math:shape', label: '数学·图形' });
    expect(rootCauseOf('math:skip')).toEqual({ key: 'math:skip', label: '数学·跳数' });
    expect(rootCauseOf('math:time')).toEqual({ key: 'math:time', label: '数学·时间' });
    expect(rootCauseOf('math:compare')).toEqual({ key: 'math:compare', label: '数学·比较' });
    expect(rootCauseOf('math:ladder')).toEqual({ key: 'math:ladder', label: '数学·阶梯' });
    expect(rootCauseOf('math:word')).toEqual({ key: 'math:word', label: '数学·应用题' });
    expect(rootCauseOf('math:rabbit')).toEqual({ key: 'math:rabbit', label: '数学·速算' });
    expect(rootCauseOf('math:tenframe')).toEqual({ key: 'math:tenframe', label: '数学·十格阵' });
    expect(rootCauseOf('math:trace')).toEqual({ key: 'math:trace', label: '数学·描数' });
  });

  it('math:未知子技能 → 数学·计算（保留子类 key）', () => {
    expect(rootCauseOf('math:weird')).toEqual({ key: 'math:weird', label: '数学·计算' });
  });

  it('number:count / compare / time 归入对应 math 子类', () => {
    expect(rootCauseOf('number:count')).toEqual({ key: 'math:count', label: '数学·数数' });
    expect(rootCauseOf('compare')).toEqual({ key: 'math:compare', label: '数学·比较' });
    expect(rootCauseOf('time')).toEqual({ key: 'math:time', label: '数学·时间' });
  });
});

describe('rootCauseOf · 逻辑', () => {
  it('logic:已知子技能 → 逻辑·对应名', () => {
    expect(rootCauseOf('logic:maze')).toEqual({ key: 'logic:maze', label: '逻辑·迷宫' });
    expect(rootCauseOf('logic:sudoku')).toEqual({ key: 'logic:sudoku', label: '逻辑·数独' });
    expect(rootCauseOf('logic:codebot')).toEqual({ key: 'logic:codebot', label: '逻辑·编程' });
  });

  it('logic:未知子技能 → 逻辑·思维', () => {
    expect(rootCauseOf('logic:xyz')).toEqual({ key: 'logic:xyz', label: '逻辑·思维' });
  });
});

describe('rootCauseOf · 未知兜底', () => {
  it('未知命名空间 → 首段（key 与 label 均为首段）', () => {
    expect(rootCauseOf('weird:key')).toEqual({ key: 'weird', label: 'weird' });
    expect(rootCauseOf('bare-skill')).toEqual({ key: 'bare-skill', label: 'bare-skill' });
  });
});

describe('clusterWrongBook', () => {
  it('空错题本 → 空数组', () => {
    expect(clusterWrongBook({ wrongBook: [] })).toEqual([]);
  });

  it('跨条目按根因归并，count 为组内条目数，skills 保留原顺序', () => {
    const clusters = clusterWrongBook({
      wrongBook: [
        'hanzi-stroke:水',
        'pinyin:tone',
        'hanzi-stroke:山',
        'pinyin:blend:ba',
      ],
    });
    expect(clusters).toEqual([
      { key: 'hanzi:stroke', label: '汉字·笔顺', count: 2, skills: ['hanzi-stroke:水', 'hanzi-stroke:山'] },
      { key: 'pinyin:tone', label: '拼音·声调', count: 1, skills: ['pinyin:tone'] },
      { key: 'pinyin:blend', label: '拼音·拼读', count: 1, skills: ['pinyin:blend:ba'] },
    ]);
  });

  it('compare 与 math:compare、time 与 math:time 归入同一根因组', () => {
    const clusters = clusterWrongBook({
      wrongBook: ['compare', 'math:compare', 'time', 'math:time'],
    });
    expect(clusters).toEqual([
      { key: 'math:compare', label: '数学·比较', count: 2, skills: ['compare', 'math:compare'] },
      { key: 'math:time', label: '数学·时间', count: 2, skills: ['time', 'math:time'] },
    ]);
  });

  it('按 count 降序排序（相同 count 时保持首次出现顺序）', () => {
    const clusters = clusterWrongBook({
      wrongBook: [
        'pinyin:tone',
        'hanzi-stroke:水',
        'word:cat',
        'hanzi:木',
        'hanzi-build:日',
        'math:fraction',
      ],
    });
    // hanzi:stroke(1) / pinyin:tone(1) / word(1) / hanzi:read(1) / hanzi:build(1) / math:fraction(1)
    expect(clusters.map((c) => c.count)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(clusters[0]!.key).toBe('pinyin:tone');
    expect(clusters.map((c) => c.key)).toEqual([
      'pinyin:tone',
      'hanzi:stroke',
      'word',
      'hanzi:read',
      'hanzi:build',
      'math:fraction',
    ]);
  });

  it('数量悬殊时稳定按 count 降序', () => {
    const clusters = clusterWrongBook({
      wrongBook: [
        'hanzi-stroke:水',
        'hanzi-stroke:山',
        'hanzi-stroke:石',
        'pinyin:tone',
        'word:cat',
        'word:dog',
      ],
    });
    expect(clusters.map((c) => c.key)).toEqual(['hanzi:stroke', 'word', 'pinyin:tone']);
    expect(clusters[0]!.count).toBe(3);
    expect(clusters[1]!.count).toBe(2);
  });
});
