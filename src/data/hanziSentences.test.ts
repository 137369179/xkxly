import { describe, it, expect } from 'vitest';
import {
  HANZI_SENTENCES,
  HANZI_SENTENCES_COUNT,
  getSentenceByChar,
  type HanziSentence,
} from './hanziSentences';

describe('hanziSentences (融合自 luomor-web/hanzi-study)', () => {
  it('生成了足量广度汉字（应 >= 1200）', () => {
    expect(HANZI_SENTENCES.length).toBeGreaterThanOrEqual(1200);
    expect(HANZI_SENTENCES.length).toBe(HANZI_SENTENCES_COUNT);
  });

  it('每条都有汉字 / 拼音 / 组词 / 例句', () => {
    for (const h of HANZI_SENTENCES as HanziSentence[]) {
      expect(h.c.length).toBeGreaterThan(0);
      expect(h.pinyin.length).toBeGreaterThan(0);
      expect(h.word.length).toBeGreaterThan(0);
      expect(h.sentence.length).toBeGreaterThan(0);
    }
  });

  it('汉字不重复且均为单个汉字', () => {
    const seen = new Set<string>();
    for (const h of HANZI_SENTENCES) {
      expect(h.c.length).toBe(1);
      expect(seen.has(h.c)).toBe(false);
      seen.add(h.c);
    }
  });

  it('常见字可被按字检索到', () => {
    expect(getSentenceByChar('一')?.pinyin).toBe('yī');
    expect(getSentenceByChar('爱')?.word).toBeTruthy();
    expect(getSentenceByChar('不存在的字')).toBeUndefined();
  });

  it('拼音字段携带声调（含韵母与声调符号，非空）', () => {
    const sample = getSentenceByChar('水');
    expect(sample?.pinyin).toMatch(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜǹńňü]/);
  });
});
