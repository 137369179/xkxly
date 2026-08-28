// M层 · 音乐与韵律学习层（十维商用上线矩阵之 M）——纯函数旋律/节奏反馈生成
//
// 设计依据（2026.8 实证）：
//  - MURHUM2026：歌唱法识字 9% → 81.8% → 95.5%，旋律+节奏=记忆钥匙；
//  - 音乐=记忆时间脚手架；歌曲构建语音意识（阅读成功最强预测因子）；动觉+音乐双编码。
//  - 宝宝巴士 V9.91.22「古诗编成曲边唱边背」、帮帮 v3.50「130 古诗玩唱读」印证诗词韵律化方向。
//
// 本模块仅产出【结构化旋律数据】(Note[])，不触达 AudioContext / 不发任何网络请求，
// 由 useSound 或调用方端侧播放，满足 A 层（无障碍·reduced-motion 可对应静音）与
// L 层（儿童隐私·零上传）基线。深路径可达：import { resultMelody } from '@/game/melody'。

export interface Note {
  /** 频率 Hz */
  freq: number;
  /** 时值（拍） */
  dur: number;
}

export interface Melody {
  notes: Note[];
  /** 速度（拍/分钟） */
  bpm: number;
  /** 语义标签：供无障碍 aria-live 播报与测试断言 */
  label: string;
}

/** C 大调五声音阶频率比（宫商角徵羽），儿童友好、无半音紧张感 */
const PENTATONIC_RATIOS: number[] = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];

/** C4 基准频率 (Hz) */
const BASE_FREQ = 261.63;

/**
 * 将五声音阶度数映射为频率。度数可越界/为负，按五声折叠并跨八度进位。
 * 例：degree 0 → C4(261.63)；degree 5 → 高八度宫音(523.26)。
 */
export function pentatonicFreq(degree: number): number {
  const len = PENTATONIC_RATIOS.length;
  const octave = Math.floor(degree / len);
  const idx = ((degree % len) + len) % len;
  return BASE_FREQ * Math.pow(2, octave) * PENTATONIC_RATIOS[idx];
}

function makeNote(degree: number, dur: number): Note {
  return { freq: pentatonicFreq(degree), dur };
}

export type ResultKind = 'correct' | 'wrong' | 'levelup' | 'streak';

/**
 * 即时反馈旋律（任务#3 即时反馈的音频侧，与 GentleFeedback 文案正交互补）：
 *  - correct：上行小琶音，明亮肯定；
 *  - wrong：低回两音，温和无刺耳不协和，避免红叉式负强化（印证"错误是学习时刻"）；
 *  - levelup：号角式五音，成就解锁庆祝；
 *  - streak：随连击数递增的上行音阶（封顶 8 音），激励持续投入。
 */
export function resultMelody(kind: ResultKind, streak = 0): Melody {
  let notes: Note[] = [];
  let bpm = 120;
  let label: string = kind;
  switch (kind) {
    case 'correct':
      notes = [makeNote(0, 0.5), makeNote(2, 0.5), makeNote(4, 1)];
      bpm = 132;
      break;
    case 'wrong':
      notes = [makeNote(0, 0.75), makeNote(-1, 1.25)];
      bpm = 96;
      break;
    case 'levelup':
      notes = [
        makeNote(0, 0.4),
        makeNote(2, 0.4),
        makeNote(4, 0.4),
        makeNote(7, 0.8),
        makeNote(4, 1.2),
      ];
      bpm = 120;
      break;
    case 'streak': {
      const run = Math.min(8, 3 + Math.max(0, streak));
      for (let i = 0; i < run; i += 1) notes.push(makeNote(i, 0.35));
      bpm = 144;
      label = `streak-${streak}`;
      break;
    }
  }
  return { notes, bpm, label };
}

/**
 * 唱诗韵律映射（M层核心·诗词模块）：将一行文本按字符映射为五声音阶旋律。
 * 规则：以字符序号为度数，每 5 字循环一组五声，末字延长收束，形成"朗朗上口"的吟唱轮廓。
 * 纯确定性、无随机，保证同一诗句旋律稳定（利于记忆锚定）。
 */
export function poemToMelody(text: string): Melody {
  const chars = Array.from(text.trim()).filter((c) => c.length > 0);
  if (chars.length === 0) {
    return { notes: [makeNote(0, 1)], bpm: 80, label: 'empty' };
  }
  const notes: Note[] = chars.map((_, i) => makeNote(i % 5, 0.5));
  notes[notes.length - 1] = { ...notes[notes.length - 1], dur: 1.5 };
  return { notes, bpm: 80, label: `poem-${chars.length}` };
}

/** 将 Melody 转为带毫秒时值的播放序列（供 useSound / Web Audio 端侧消费） */
export function melodyToSequence(m: Melody): Array<{ freq: number; durMs: number }> {
  const beatMs = 60000 / m.bpm;
  return m.notes.map((n) => ({ freq: n.freq, durMs: Math.round(n.dur * beatMs) }));
}
