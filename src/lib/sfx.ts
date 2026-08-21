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

/** 触感震动辅助（移动端/平板设备支持时触发轻微触感） */
function haptic(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // 忽略部分浏览器对震动策略的安全限制
    }
  }
}

/** 答对：从变种池随机抽一个上行和弦琶音播放并触发轻触感 */
export function sfxCorrect(): void {
  const variant = CORRECT_VARIANTS[Math.floor(Math.random() * CORRECT_VARIANTS.length)] ?? CORRECT_VARIANTS[0]!;
  playTones(variant);
  haptic(40);
}

/** 答错：柔和的下行二音（不吓人，不打击信心）并触发双短震 */
export function sfxWrong(): void {
  playTones([
    { freq: 392, at: 0, dur: 0.14, type: 'sine', gain: 0.12 },
    { freq: 311.13, at: 0.11, dur: 0.2, type: 'sine', gain: 0.11 },
  ]);
  haptic([30, 40, 30]);
}

/** 获得星星 */
export function sfxStar(): void {
  playTones([
    { freq: 1318.5, at: 0, dur: 0.1, type: 'sine', gain: 0.12 },
    { freq: 1567.98, at: 0.07, dur: 0.1, type: 'sine', gain: 0.12 },
    { freq: 2093, at: 0.14, dur: 0.22, type: 'sine', gain: 0.1 },
  ]);
  haptic(50);
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
  haptic([60, 50, 60, 50, 80]);
}

/** 翻牌 */
export function sfxFlip(): void {
  playTones([{ freq: 660, dur: 0.06, type: 'square', gain: 0.05 }]);
}

/** 气泡轻弹/气泡音（发送消息、轻触反馈） */
export function sfxPop(): void {
  playTones([
    { freq: 440, at: 0, dur: 0.03, type: 'sine', gain: 0.08 },
    { freq: 880, at: 0.02, dur: 0.06, type: 'sine', gain: 0.12 },
  ]);
}

/** 小猫呼噜/亲昵音效（摸头、喂食、送爱心） */
export function sfxPurr(): void {
  playTones([
    { freq: 220, at: 0, dur: 0.12, type: 'triangle', gain: 0.1 },
    { freq: 240, at: 0.08, dur: 0.14, type: 'sine', gain: 0.12 },
    { freq: 260, at: 0.16, dur: 0.18, type: 'sine', gain: 0.1 },
  ]);
  haptic([30, 20]);
}

/** 互动夸夸与点赞小风铃 */
export function sfxPraise(): void {
  playTones([
    { freq: 987.77, at: 0, dur: 0.12, type: 'sine', gain: 0.1 },
    { freq: 1318.51, at: 0.08, dur: 0.14, type: 'sine', gain: 0.12 },
    { freq: 1760.0, at: 0.16, dur: 0.22, type: 'sine', gain: 0.14 },
  ]);
  haptic(45);
}

/** 魔法变身/星光闪烁音效（换装、奇迹变身） */
export function sfxMagic(): void {
  playTones([
    { freq: 1046.5, at: 0, dur: 0.09, type: 'triangle', gain: 0.12 },
    { freq: 1318.51, at: 0.05, dur: 0.09, type: 'sine', gain: 0.13 },
    { freq: 1567.98, at: 0.1, dur: 0.1, type: 'triangle', gain: 0.14 },
    { freq: 2093.0, at: 0.16, dur: 0.18, type: 'sine', gain: 0.15 },
    { freq: 2637.0, at: 0.22, dur: 0.25, type: 'sine', gain: 0.12 },
  ]);
  haptic([30, 40, 50]);
}

/** 弹簧蹦跳/毛线球弹跳音效 */
export function sfxBoing(): void {
  playTones([
    { freq: 260, at: 0, dur: 0.06, type: 'sine', gain: 0.16 },
    { freq: 520, at: 0.04, dur: 0.08, type: 'triangle', gain: 0.15 },
    { freq: 380, at: 0.1, dur: 0.12, type: 'sine', gain: 0.12 },
  ]);
  haptic(35);
}

/** 吹泡泡/戳破水泡音效 */
export function sfxBubble(): void {
  playTones([
    { freq: 650, at: 0, dur: 0.04, type: 'sine', gain: 0.12 },
    { freq: 1100, at: 0.02, dur: 0.07, type: 'sine', gain: 0.15 },
  ]);
  haptic(25);
}

/** 小猫咪开心叫声合成音 */
export function sfxMeow(): void {
  playTones([
    { freq: 600, at: 0, dur: 0.08, type: 'triangle', gain: 0.12 },
    { freq: 780, at: 0.06, dur: 0.14, type: 'sine', gain: 0.15 },
    { freq: 520, at: 0.18, dur: 0.16, type: 'sine', gain: 0.1 },
  ]);
  haptic([40, 30]);
}

/** 小八音盒/童年摇篮曲清脆音阶 */
export function sfxMusicBox(): void {
  playTones([
    { freq: 1046.5, at: 0, dur: 0.18, type: 'sine', gain: 0.14 },
    { freq: 1174.66, at: 0.14, dur: 0.18, type: 'sine', gain: 0.14 },
    { freq: 1318.51, at: 0.28, dur: 0.22, type: 'sine', gain: 0.15 },
    { freq: 1567.98, at: 0.44, dur: 0.35, type: 'sine', gain: 0.16 },
  ]);
  haptic([30, 30, 40]);
}
