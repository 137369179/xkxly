/**
 * 轻量音效引擎（Web Audio 合成，零资源文件、零加载延迟）
 * 幼儿产品的即时反馈非常依赖声音，但又不能引入几百 KB 的音频资源。
 */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});

  return ctx;
}

export function setMuted(v: boolean): void {
  muted = v;
}
export function isMuted(): boolean {
  return muted;
}

interface ToneSpec {
  freq: number;
  /** 相对于 start 的延迟（秒） */
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
}

function playTones(tones: ToneSpec[]): void {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  for (const t of tones) {
    const { freq, at = 0, dur = 0.16, type = 'sine', gain = 0.16 } = t;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + at);
    g.gain.setValueAtTime(0.0001, now + at);
    g.gain.exponentialRampToValueAtTime(gain, now + at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(now + at);
    osc.stop(now + at + dur + 0.02);
  }
}

/** 轻点：任意可点击元素 */
export function sfxTap(): void {
  playTones([{ freq: 880, dur: 0.07, type: 'triangle', gain: 0.09 }]);
}

/**
 * P2-1: 答对音效变种池
 * ------------------------------------------------------------
 * 每次答对都播同一个大三和弦会腻。这里准备 5 个变体，
 * 每次随机抽一个播放，让"答对"这件高频事件保持听觉新鲜感。
 * 所有变体都是和谐的上行音型，听感都是"开心/成功"，不会变成噪音。
 */
const CORRECT_VARIANTS: ToneSpec[][] = [
  // 变种 A：C 大三和弦琶音（C-E-G-C，原版，最经典）
  [
    { freq: 523.25, at: 0, dur: 0.14, type: 'triangle', gain: 0.15 },
    { freq: 659.25, at: 0.09, dur: 0.14, type: 'triangle', gain: 0.15 },
    { freq: 783.99, at: 0.18, dur: 0.2, type: 'triangle', gain: 0.16 },
    { freq: 1046.5, at: 0.27, dur: 0.26, type: 'sine', gain: 0.13 },
  ],
  // 变种 B：F 大三和弦琶音（F-A-C-F，更明亮）
  [
    { freq: 349.23, at: 0, dur: 0.14, type: 'triangle', gain: 0.15 },
    { freq: 440, at: 0.09, dur: 0.14, type: 'triangle', gain: 0.15 },
    { freq: 523.25, at: 0.18, dur: 0.2, type: 'triangle', gain: 0.16 },
    { freq: 698.46, at: 0.27, dur: 0.26, type: 'sine', gain: 0.13 },
  ],
  // 变种 C：G 大三和弦琶音（G-B-D-G，更稳重）
  [
    { freq: 392, at: 0, dur: 0.14, type: 'triangle', gain: 0.15 },
    { freq: 493.88, at: 0.09, dur: 0.14, type: 'triangle', gain: 0.15 },
    { freq: 587.33, at: 0.18, dur: 0.2, type: 'triangle', gain: 0.16 },
    { freq: 783.99, at: 0.27, dur: 0.26, type: 'sine', gain: 0.13 },
  ],
  // 变种 D：五声音阶上行（C-D-E-G-A，中国风，亲切）
  [
    { freq: 523.25, at: 0, dur: 0.1, type: 'triangle', gain: 0.14 },
    { freq: 587.33, at: 0.07, dur: 0.1, type: 'triangle', gain: 0.14 },
    { freq: 659.25, at: 0.14, dur: 0.1, type: 'triangle', gain: 0.14 },
    { freq: 783.99, at: 0.21, dur: 0.1, type: 'triangle', gain: 0.14 },
    { freq: 880, at: 0.28, dur: 0.24, type: 'sine', gain: 0.13 },
  ],
  // 变种 E：D 大三和弦 + 高八度收尾（D-F#-A-D，欢快跳跃）
  [
    { freq: 587.33, at: 0, dur: 0.12, type: 'triangle', gain: 0.14 },
    { freq: 739.99, at: 0.08, dur: 0.12, type: 'triangle', gain: 0.14 },
    { freq: 880, at: 0.16, dur: 0.16, type: 'triangle', gain: 0.15 },
    { freq: 1174.7, at: 0.24, dur: 0.28, type: 'sine', gain: 0.12 },
  ],
];

/** 答对：从变种池随机抽一个上行和弦琶音播放 */
export function sfxCorrect(): void {
  const variant = CORRECT_VARIANTS[Math.floor(Math.random() * CORRECT_VARIANTS.length)]!
  playTones(variant);
}

/** 答错：柔和的下行二音（不吓人，不打击信心） */
export function sfxWrong(): void {
  playTones([
    { freq: 392, at: 0, dur: 0.14, type: 'sine', gain: 0.12 },
    { freq: 311.13, at: 0.11, dur: 0.2, type: 'sine', gain: 0.11 },
  ]);
}

/** 获得星星 */
export function sfxStar(): void {
  playTones([
    { freq: 1318.5, at: 0, dur: 0.1, type: 'sine', gain: 0.12 },
    { freq: 1567.98, at: 0.07, dur: 0.1, type: 'sine', gain: 0.12 },
    { freq: 2093, at: 0.14, dur: 0.22, type: 'sine', gain: 0.1 },
  ]);
}

/** 通关 / 解锁徽章：欢快的小旋律 */
export function sfxWin(): void {
  playTones([
    { freq: 523.25, at: 0, dur: 0.13, type: 'triangle', gain: 0.15 },
    { freq: 659.25, at: 0.12, dur: 0.13, type: 'triangle', gain: 0.15 },
    { freq: 783.99, at: 0.24, dur: 0.13, type: 'triangle', gain: 0.15 },
    { freq: 1046.5, at: 0.36, dur: 0.18, type: 'triangle', gain: 0.16 },
    { freq: 783.99, at: 0.54, dur: 0.12, type: 'sine', gain: 0.12 },
    { freq: 1046.5, at: 0.64, dur: 0.34, type: 'sine', gain: 0.16 },
  ]);
}

/** 翻牌 */
export function sfxFlip(): void {
  playTones([{ freq: 660, dur: 0.06, type: 'square', gain: 0.05 }]);
}
