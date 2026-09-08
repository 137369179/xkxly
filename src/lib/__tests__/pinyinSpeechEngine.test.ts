import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  playAcousticToneSweep,
  speakPinyinPhoneme,
  speakToneCoasterAudio,
  speakPhonicsSpellOut,
  speakMascotChant,
  speakMouthGuide,
  speakStrokeGuide,
} from '../pinyinSpeechEngine';
import * as speechModule from '../speech';
import * as audioContextModule from '../audioContext';

describe('1:1 洪恩拼音真人发音与声学物理合成引擎', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('能正确触发 WebAudio 4 种声调音高扫频物理合成', () => {
    const mockOsc = {
      type: '',
      connect: vi.fn(),
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockGain = {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
    };
    const mockCtx = {
      createOscillator: vi.fn(() => mockOsc),
      createGain: vi.fn(() => mockGain),
      destination: {},
      currentTime: 0,
    };

    vi.spyOn(audioContextModule, 'getAudioContext').mockReturnValue(mockCtx as any);

    // 1声
    playAcousticToneSweep(1);
    expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);

    // 2声
    playAcousticToneSweep(2);
    expect(mockOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(490, 0.45);

    // 3声
    playAcousticToneSweep(3);
    expect(mockOsc.frequency.setValueAtTime).toHaveBeenCalledWith(360, 0);

    // 4声
    playAcousticToneSweep(4);
    expect(mockOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(220, 0.45);
  });

  it('单音素发音正确映射为标准普通话代表字', () => {
    const speakSpy = vi.spyOn(speechModule, 'speak').mockImplementation(async () => {});
    speakPinyinPhoneme('b');
    expect(speakSpy).toHaveBeenCalledWith('玻', expect.objectContaining({ lang: 'zh-CN' }));

    speakPinyinPhoneme('zh');
    expect(speakSpy).toHaveBeenCalledWith('知', expect.objectContaining({ lang: 'zh-CN' }));
  });

  it('声调过山车触发标准四声调儿歌朗读与变频', () => {
    const speakSpy = vi.spyOn(speechModule, 'speak').mockImplementation(async () => {});
    speakToneCoasterAudio(
      {
        symbol: 'ā',
        toneNum: 1,
        toneName: '一声平',
        carAction: '平坦高速路',
        word: '鸭子',
        hanzi: '鸭',
        emoji: '🦆',
      },
      'a'
    );
    expect(speakSpy).toHaveBeenCalledWith(
      expect.stringContaining('一声平'),
      expect.objectContaining({ lang: 'zh-CN' })
    );
  });

  it('三段式拼读教学法正确组装声母、韵母与拼读字词', () => {
    const speakSpy = vi.spyOn(speechModule, 'speak').mockImplementation(async () => {});
    speakPhonicsSpellOut('b', 'a', 'ba', '八只鸭子', '八');
    expect(speakSpy).toHaveBeenCalledWith(
      expect.stringContaining('玻——啊——八！八只鸭子的八！'),
      expect.objectContaining({ lang: 'zh-CN' })
    );
  });

  it('拟人小精灵自述与口型要领指导播报正确执行', () => {
    const speakSpy = vi.spyOn(speechModule, 'speak').mockImplementation(async () => {});
    const mockLevel: any = {
      p: 'a',
      rhyme: '张大嘴巴 a a a',
      mouthGuide: '发音时嘴巴张大，舌位居中',
      personification: { character: '大嘴巴天使' },
    };

    speakMascotChant(mockLevel);
    expect(speakSpy).toHaveBeenCalledWith(
      expect.stringContaining('大嘴巴天使来啦！张大嘴巴 a a a'),
      expect.objectContaining({ lang: 'zh-CN' })
    );

    speakMouthGuide(mockLevel);
    expect(speakSpy).toHaveBeenCalledWith(
      expect.stringContaining('发音时嘴巴张大'),
      expect.objectContaining({ lang: 'zh-CN' })
    );
  });
});

  it('四线三格笔顺分步朗读正确执行', () => {
    const speakSpy = vi.spyOn(speechModule, 'speak').mockImplementation(async () => {});
    speakStrokeGuide('a', 0, '左半圆', '从右往左画半圆');
    expect(speakSpy).toHaveBeenCalledWith(
      expect.stringContaining('第1笔，左半圆'),
      expect.objectContaining({ lang: 'zh-CN' })
    );
  });
