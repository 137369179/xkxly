/**
 * 🎙️ 1:1 洪恩/小莤拼音真人发音与声学变频合成引擎 (Hong'en Pinyin Speech & Tone Synthesizer)
 * -----------------------------------------------------------------------------------
 * 核心功能：
 * 1. 📢 拼音三段式教学拼读法 (speakPhonicsSpellOut)：声母、韵母逐个发音后滑行相撞合体发音；
 * 2. 🎢 4 种声调过山车声学变频与儿歌朗读 (speakToneCoasterAudio)：
 *    - 1声（55阴平高平调）：440Hz 平稳高速行车音 + "一声平，平平开小车"
 *    - 2声（35阳平中升调）：330Hz→490Hz 冲天爬坡音 + "二声扬，加油爬上坡"
 *    - 3声（214上声曲折调）：350Hz→240Hz→440Hz 峡谷回旋音 + "三声转，下坡又上坡"
 *    - 4声（51去声高降调）：500Hz→220Hz 极速大俯冲音 + "四声降，从上往下冲"
 * 3. 🧚 拟人化小精灵童声登场自述 (speakMascotChant)；
 * 4. 👄 标准发音口型要领指导播报 (speakMouthGuide)；
 * 5. ✍️ 四线三格笔顺拆解点播朗读 (speakStrokeGuide)；
 * 6. 🏆 纯正普通话发音映射，杜绝浏览器将声母读成英文字母。
 */

import { speak, stopSpeaking } from './speech';
import { getAudioContext } from './audioContext';
import { pinyinToSpoken, SHENGMU_MAP, YUNMU_MAP, PINYIN_SYLLABLE_MAP } from './pinyinAudio';
import { type KingdomPinyinLevel, type ToneCarItem } from '@/data/pinyinKingdomData';

/**
 * 播放 WebAudio 物理声调曲线音（4 种声调声学音高扫频合成）
 */
export function playAcousticToneSweep(toneNum: 1 | 2 | 3 | 4, durationMs = 450) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle'; // 三角波，温润柔和适合儿童听觉
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const durSec = durationMs / 1000;

    // 平滑淡入淡出防止爆音
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.001, now + durSec);

    switch (toneNum) {
      case 1: // 55 高平调
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(440, now + durSec);
        break;
      case 2: // 35 中升调
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(490, now + durSec);
        break;
      case 3: // 214 曲折调
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.linearRampToValueAtTime(240, now + durSec * 0.45);
        osc.frequency.exponentialRampToValueAtTime(440, now + durSec);
        break;
      case 4: // 51 高降调
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + durSec);
        break;
    }

    osc.start(now);
    osc.stop(now + durSec + 0.05);
  } catch (e) {
    console.warn('Acoustic tone sweep failed:', e);
  }
}

/**
 * 单个拼音音素纯正发音朗读
 */
export function speakPinyinPhoneme(symbol: string, options?: { rate?: number; pitch?: number }) {
  const spoken = pinyinToSpoken(symbol);
  speak(spoken, {
    lang: 'zh-CN',
    rate: options?.rate ?? 0.65,
    pitch: options?.pitch ?? 1.05,
  });
}

/**
 * 1:1 声调过山车站台与儿歌口诀朗读 (含 WebAudio 变频与真人口诀)
 */
export function speakToneCoasterAudio(t: ToneCarItem, _pinyinLetter?: string) {
  stopSpeaking();
  // 1. 同步触发声学音高扫频
  playAcousticToneSweep(t.toneNum, 500);

  // 2. 播报 1:1 洪恩四声调趣味口诀
  const spokenLetter = pinyinToSpoken(t.symbol);
  const actionChant =
    t.toneNum === 1
      ? '一声平，平平走'
      : t.toneNum === 2
      ? '二声扬，爬上坡'
      : t.toneNum === 3
      ? '三声转，拐个弯'
      : '四声降，滑下坡';

  const fullChant = `${spokenLetter}，${t.toneName}，${actionChant}！${t.word}的${t.hanzi}`;
  speak(fullChant, { lang: 'zh-CN', rate: 0.7, pitch: 1.05 });
}

/**
 * 1:1 三段式声韵相撞拼读法（声母、韵母、两拼音节）
 * 例如：b... ā... bā! 八只鸭子的八！
 */
export function speakPhonicsSpellOut(
  initial: string,
  final: string,
  combined: string,
  exampleWord?: string,
  hanzi?: string
) {
  stopSpeaking();

  const spokenInitial = SHENGMU_MAP[initial.toLowerCase()] || initial;
  const spokenFinal = YUNMU_MAP[final.toLowerCase()] || pinyinToSpoken(final);
  const spokenCombined = PINYIN_SYLLABLE_MAP[combined.toLowerCase()] || pinyinToSpoken(combined);

  let chant = `${spokenInitial}——${spokenFinal}——${spokenCombined}！`;
  if (exampleWord && hanzi) {
    chant += `${exampleWord}的${hanzi}！`;
  }

  speak(chant, { lang: 'zh-CN', rate: 0.65, pitch: 1.1 });
}

/**
 * 1:1 拟人小精灵自述与情境口诀朗读
 */
export function speakMascotChant(level: KingdomPinyinLevel) {
  stopSpeaking();
  const spoken = pinyinToSpoken(level.p);
  const text = `${level.personification.character}来啦！${level.rhyme}，${spoken}、${spoken}、${spoken}！`;
  speak(text, { lang: 'zh-CN', rate: 0.68, pitch: 1.15 });
}

/**
 * 标准发音口型要领指导语播报
 */
export function speakMouthGuide(level: KingdomPinyinLevel) {
  stopSpeaking();
  const spoken = pinyinToSpoken(level.p);
  const text = `拼音 ${spoken} 的发音要领：${level.mouthGuide}`;
  speak(text, { lang: 'zh-CN', rate: 0.68, pitch: 1.0 });
}

/**
 * 四线三格笔顺分步朗读
 */
export function speakStrokeGuide(symbol: string, strokeIndex: number, strokeName: string, strokeGuide: string) {
  stopSpeaking();
  const spoken = pinyinToSpoken(symbol);
  const text = `写拼音 ${spoken}，第${strokeIndex + 1}笔，${strokeName}：${strokeGuide}`;
  speak(text, { lang: 'zh-CN', rate: 0.7, pitch: 1.05 });
}
