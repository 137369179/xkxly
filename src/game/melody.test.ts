import { describe, it, expect } from 'vitest';
import {
  pentatonicFreq,
  resultMelody,
  poemToMelody,
  melodyToSequence,
  type Melody,
} from './melody';

const BASE_FREQ = 261.63;

describe('pentatonicFreq', () => {
  it('度数 0 映射到 C4 基准频率', () => {
    expect(pentatonicFreq(0)).toBeCloseTo(BASE_FREQ, 2);
  });

  it('度数 5 进位一个八度（宫音高八度）', () => {
    expect(pentatonicFreq(5)).toBeCloseTo(BASE_FREQ * 2, 2);
  });

  it('负度数按五声折叠不报错', () => {
    expect(pentatonicFreq(-1)).toBeGreaterThan(0);
    expect(pentatonicFreq(-1)).toBeCloseTo(pentatonicFreq(4) / 2, 2);
  });
});

describe('resultMelody', () => {
  it('correct 返回上行三音明亮琶音', () => {
    const m: Melody = resultMelody('correct');
    expect(m.notes).toHaveLength(3);
    expect(m.label).toBe('correct');
    expect(m.notes[2].freq).toBeGreaterThan(m.notes[0].freq);
  });

  it('wrong 返回温和两音（无刺耳不协和，末音低于首音）', () => {
    const m = resultMelody('wrong');
    expect(m.notes).toHaveLength(2);
    expect(m.notes[1].freq).toBeLessThan(m.notes[0].freq);
  });

  it('levelup 返回五音号角式成就旋律', () => {
    const m = resultMelody('levelup');
    expect(m.notes).toHaveLength(5);
    expect(m.label).toBe('levelup');
  });

  it('streak 连击 0 时至少 3 音，连击 10 时封顶 8 音', () => {
    expect(resultMelody('streak', 0).notes).toHaveLength(3);
    expect(resultMelody('streak', 10).notes).toHaveLength(8);
  });

  it('streak 标签携带连击数', () => {
    expect(resultMelody('streak', 7).label).toBe('streak-7');
  });
});

describe('poemToMelody', () => {
  it('空文本返回单音占位旋律', () => {
    const m = poemToMelody('   ');
    expect(m.notes).toHaveLength(1);
    expect(m.label).toBe('empty');
  });

  it('按字符数生成等长的五声音阶旋律', () => {
    const text = '床前明月光';
    const m = poemToMelody(text);
    expect(m.notes).toHaveLength(Array.from(text).length);
    expect(m.notes[m.notes.length - 1].dur).toBe(1.5);
  });

  it('同一诗句确定性映射（利于记忆锚定）', () => {
    const a = poemToMelody('春眠不觉晓');
    const b = poemToMelody('春眠不觉晓');
    expect(a.label).toBe(b.label);
    expect(a.notes.map((n) => n.freq)).toEqual(b.notes.map((n) => n.freq));
  });
});

describe('melodyToSequence', () => {
  it('将旋律转为正数毫秒时值序列', () => {
    const seq = melodyToSequence(resultMelody('correct'));
    expect(seq).toHaveLength(3);
    for (const s of seq) {
      expect(s.freq).toBeGreaterThan(0);
      expect(s.durMs).toBeGreaterThan(0);
    }
  });
});
