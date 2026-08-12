import { describe, it, expect } from 'vitest';
import {
  makeHanziFormationQuestion,
  makeHanziComponentQuestion,
  makeHanziQuestion,
  makeHanziMixedQuestion,
} from '@/lib/hanziQuestions';
import { liushuOf, getEtymology, getComponents, componentUsers } from '@/lib/hanziEtymology';
import { getHanziByChar } from '@/data/hanziIndex';

const ALL_LEVELS = [1, 2, 3] as const;

describe('字理测评题型 · 六书识别', () => {
  it('答案等于该字的六书类型，且四选项覆盖四书', () => {
    for (const ch of ['清', '时', '江', '树', '玉', '采', '林', '明']) {
      const q = makeHanziFormationQuestion(getHanziByChar(ch)!);
      expect(q.kind).toBe('hanzi-formation');
      const expected = liushuOf(ch);
      expect(q.answerId).toBe(expected);
      // 四个选项 id 正好是四书键
      const ids = q.options.map((o) => o.id).sort();
      expect(ids).toEqual(['compound-ideographic', 'ideographic', 'pictographic', 'pictophonetic'].sort());
      // 正确答案在选项内
      expect(q.options.some((o) => o.id === q.answerId)).toBe(true);
    }
  });
});

describe('字理测评题型 · 部件识别（教学正确性护栏）', () => {
  it('形声字「清」：声旁题答案必为真实声旁「青」', () => {
    let sawPhonetic = false;
    for (let i = 0; i < 300; i++) {
      const q = makeHanziComponentQuestion(getHanziByChar('清')!);
      if (q.prompt.includes('声旁')) {
        sawPhonetic = true;
        expect(q.answerId).toBe('青');
      }
      if (q.prompt.includes('形旁')) {
        expect(q.answerId).toBe('氵');
      }
    }
    expect(sawPhonetic).toBe(true);
  });

  it('声旁不表音的字（时/江/树/地/池/银）绝不出「声旁」题，形旁题答案必为真实部件', () => {
    for (const ch of ['时', '江', '树', '地', '池', '银']) {
      const e = getEtymology(ch);
      // 这些字在 P2 数据层已被判定为无声旁表音关系
      expect(e?.phonetic === undefined || e?.soundRel === undefined).toBe(true);
      const comps = getComponents(ch);
      for (let i = 0; i < 200; i++) {
        const q = makeHanziComponentQuestion(getHanziByChar(ch)!);
        // 绝不声称声旁表音（核心教学正确性护栏）
        expect(q.prompt.includes('声旁')).toBe(false);
        // 形旁题的答案必是该字的真实拆解成员（不含 IDS 描述符与笔画碎片）
        if (q.prompt.includes('形旁')) {
          expect(comps).toContain(q.answerId);
        }
        // contains 题的答案本身是另一个含该部件的字（不在 target 拆解内是正常的）
      }
    }
  });

  it('象形字「玉」无部件 → 回退六书题', () => {
    const q = makeHanziComponentQuestion(getHanziByChar('玉')!);
    expect(q.kind).toBe('hanzi-formation');
    expect(q.answerId).toBe('pictographic');
  });

  it('会意/形声字：contains 子题的答案必为含该部件的字', () => {
    let sawContains = false;
    for (let i = 0; i < 300; i++) {
      const q = makeHanziComponentQuestion(getHanziByChar('清')!);
      if (q.prompt.includes('含有部件')) {
        sawContains = true;
        const m = q.prompt.match(/含有部件「(.+)」/);
        expect(m).not.toBeNull();
        const comp = m![1]!;
        expect(componentUsers(comp)).toContain(q.answerId!);
      }
    }
    expect(sawContains).toBe(true);
  });
});

describe('字理测评题型 · 接入 makeHanziQuestion / makeHanziMixedQuestion', () => {
  it('difficulty=1 永远是最易的拼音题（不给字理硬骨头）', () => {
    for (let i = 0; i < 100; i++) {
      const q = makeHanziQuestion(getHanziByChar('清')!, 1);
      expect(q.kind).toBe('hanzi-pinyin');
    }
  });

  it('difficulty=2/3 字理题不破坏教学正确性（声旁仅表音字才出）', () => {
    const comps = getComponents('时');
    for (const d of [2, 3] as const) {
      for (let i = 0; i < 200; i++) {
        const q = makeHanziQuestion(getHanziByChar('时')!, d);
        // 绝不声称声旁表音（核心教学正确性护栏）
        expect(q.prompt.includes('声旁')).toBe(false);
        // 形旁题答案必为真实拆解成员
        if (q.prompt.includes('形旁')) {
          expect(comps).toContain(q.answerId);
        }
      }
    }
  });

  it('混合题覆盖字理维度且不抛错', () => {
    for (let i = 0; i < 100; i++) {
      const q = makeHanziMixedQuestion(getHanziByChar('清')!);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.some((o) => o.id === q.answerId)).toBe(true);
    }
  });
});

describe('字理测评题型 · 全库可生成性', () => {
  it('每一关的字都能生成任意难度题（无 undefined / 无崩溃）', () => {
    const sample = ['清', '时', '江', '树', '玉', '采', '林', '明', '草', '河', '湖', '星', '花', '妈', '爸'];
    const present = sample.map((c) => getHanziByChar(c)).filter((h): h is NonNullable<typeof h> => Boolean(h));
    expect(present.length).toBeGreaterThan(8); // 样本绝大多数应在字库内
    for (const lv of ALL_LEVELS) {
      for (const h of present) {
        const q = makeHanziQuestion(h, lv);
        expect(q).toBeTruthy();
        expect(q.skill).toBe(`hanzi:${h.c}`);
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options.some((o) => o.id === q.answerId)).toBe(true);
      }
    }
  });
});
