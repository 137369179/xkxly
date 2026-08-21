/**
 * 🐱 游戏级宠物 Web Audio 参数化合成音效库 (50+ 种音效变体)
 * ─────────────────────────────────────────────────────────────
 * 零静态资源依赖，纯浏览器 Web Audio API 物理建模合成，延迟 < 30ms。
 *
 * 包含 6 大类共 52 种音效：
 * 1. 喵叫叫声库 (Meow Library - 12 种)
 * 2. 呼噜与亲昵库 (Purr & Affection - 8 种)
 * 3. 动作与物理碰撞库 (Action & Physics - 10 种)
 * 4. 魔法与粒子闪光库 (Magic & Sparkles - 8 种)
 * 5. 快乐与赞扬风铃库 (Joy & Praise - 8 种)
 * 6. 趣味环境与生理音效 (Fun & Biological - 6 种)
 */

let ctx: AudioContext | null = null;
let muted = false;

function getAudioContext(): AudioContext | null {
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
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  return ctx;
}

export function setPetAudioMuted(v: boolean): void {
  muted = v;
}

export function isPetAudioMuted(): boolean {
  return muted;
}

interface ToneParams {
  freq: number;
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  endFreq?: number;
}

function playSynthesizedTones(tones: ToneParams[]): void {
  if (muted) return;
  const ac = getAudioContext();
  if (!ac) return;
  const now = ac.currentTime;

  for (const t of tones) {
    const { freq, at = 0, dur = 0.15, type = 'sine', gain = 0.15, endFreq } = t;
    const osc = ac.createOscillator();
    const g = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), now + at);
    if (endFreq && endFreq > 20) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + at + dur);
    }

    g.gain.setValueAtTime(0.0001, now + at);
    g.gain.exponentialRampToValueAtTime(gain, now + at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);

    osc.connect(g).connect(ac.destination);
    osc.start(now + at);
    osc.stop(now + at + dur + 0.02);
  }
}

// ═════════════════════════════════════════════════════════════
// 1. 喵叫声效库 (12 种变体)
// ═════════════════════════════════════════════════════════════

/** 01. 清脆幼猫叫 (Kitten Hello) */
export function petMeowHello(): void {
  playSynthesizedTones([
    { freq: 580, endFreq: 820, at: 0, dur: 0.12, type: 'triangle', gain: 0.14 },
    { freq: 820, endFreq: 640, at: 0.1, dur: 0.16, type: 'sine', gain: 0.15 },
  ]);
}

/** 02. 软萌撒娇叫 (Cute Soft Meow) */
export function petMeowCute(): void {
  playSynthesizedTones([
    { freq: 650, endFreq: 950, at: 0, dur: 0.1, type: 'sine', gain: 0.12 },
    { freq: 950, endFreq: 720, at: 0.08, dur: 0.22, type: 'sine', gain: 0.16 },
  ]);
}

/** 03. 开心呼唤叫 (Joyful Call) */
export function petMeowJoy(): void {
  playSynthesizedTones([
    { freq: 520, endFreq: 780, at: 0, dur: 0.08, type: 'triangle', gain: 0.13 },
    { freq: 780, endFreq: 1040, at: 0.07, dur: 0.15, type: 'sine', gain: 0.15 },
    { freq: 1040, endFreq: 880, at: 0.2, dur: 0.14, type: 'sine', gain: 0.11 },
  ]);
}

/** 04. 好奇探头短促叫 (Chirp / Trill) */
export function petMeowChirp(): void {
  playSynthesizedTones([
    { freq: 800, endFreq: 1200, at: 0, dur: 0.06, type: 'sine', gain: 0.12 },
    { freq: 1200, endFreq: 1400, at: 0.05, dur: 0.08, type: 'triangle', gain: 0.14 },
  ]);
}

/** 05. 饿了想吃小鱼干叫 (Feed Request) */
export function petMeowHungry(): void {
  playSynthesizedTones([
    { freq: 480, endFreq: 750, at: 0, dur: 0.14, type: 'triangle', gain: 0.15 },
    { freq: 750, endFreq: 500, at: 0.12, dur: 0.24, type: 'sine', gain: 0.13 },
  ]);
}

/** 06. 满足奶哼 (Content Murmur) */
export function petMeowMurmur(): void {
  playSynthesizedTones([
    { freq: 350, endFreq: 450, at: 0, dur: 0.08, type: 'sine', gain: 0.1 },
    { freq: 450, endFreq: 320, at: 0.07, dur: 0.18, type: 'sine', gain: 0.12 },
  ]);
}

/** 07. 唱歌欢快长音 (Singing Meow) */
export function petMeowSinging(): void {
  playSynthesizedTones([
    { freq: 523.25, at: 0, dur: 0.12, type: 'sine', gain: 0.12 },
    { freq: 659.25, at: 0.1, dur: 0.12, type: 'sine', gain: 0.14 },
    { freq: 783.99, at: 0.2, dur: 0.22, type: 'sine', gain: 0.15 },
  ]);
}

/** 08. 惊讶呆萌叫声 (Surprised Squeak) */
export function petMeowSurprised(): void {
  playSynthesizedTones([
    { freq: 700, endFreq: 1350, at: 0, dur: 0.09, type: 'sine', gain: 0.16 },
  ]);
}

/** 09. 困倦小哈欠哈气 (Sleepy Yawn) */
export function petMeowYawn(): void {
  playSynthesizedTones([
    { freq: 420, endFreq: 300, at: 0, dur: 0.28, type: 'sine', gain: 0.09 },
    { freq: 280, endFreq: 220, at: 0.24, dur: 0.32, type: 'sine', gain: 0.07 },
  ]);
}

/** 10. 傲娇轻哼 (Proud Hmph) */
export function petMeowProud(): void {
  playSynthesizedTones([
    { freq: 600, endFreq: 880, at: 0, dur: 0.07, type: 'triangle', gain: 0.11 },
    { freq: 880, endFreq: 750, at: 0.06, dur: 0.12, type: 'sine', gain: 0.13 },
  ]);
}

/** 11. 撒娇小颤音 (Affectionate Trill) */
export function petMeowTrill(): void {
  playSynthesizedTones([
    { freq: 750, at: 0, dur: 0.04, type: 'sine', gain: 0.12 },
    { freq: 880, at: 0.04, dur: 0.04, type: 'sine', gain: 0.13 },
    { freq: 1020, at: 0.08, dur: 0.05, type: 'sine', gain: 0.14 },
    { freq: 880, at: 0.13, dur: 0.08, type: 'sine', gain: 0.1 },
  ]);
}

/** 12. 兴奋连声小呼 (Excited Chirps) */
export function petMeowExcited(): void {
  playSynthesizedTones([
    { freq: 820, endFreq: 1100, at: 0, dur: 0.06, type: 'triangle', gain: 0.14 },
    { freq: 950, endFreq: 1250, at: 0.09, dur: 0.08, type: 'sine', gain: 0.15 },
  ]);
}

// ═════════════════════════════════════════════════════════════
// 2. 咕噜呼噜与亲昵声效库 (8 种变体)
// ═════════════════════════════════════════════════════════════

/** 13. 温柔慢速呼噜 (Gentle Purr) */
export function petPurrGentle(): void {
  playSynthesizedTones([
    { freq: 95, at: 0, dur: 0.18, type: 'sine', gain: 0.14 },
    { freq: 110, at: 0.08, dur: 0.18, type: 'sine', gain: 0.15 },
    { freq: 90, at: 0.22, dur: 0.2, type: 'sine', gain: 0.12 },
  ]);
}

/** 14. 极度舒适深层呼噜 (Deep Rhythmic Purr) */
export function petPurrDeep(): void {
  playSynthesizedTones([
    { freq: 75, at: 0, dur: 0.25, type: 'triangle', gain: 0.16 },
    { freq: 85, at: 0.12, dur: 0.25, type: 'sine', gain: 0.16 },
    { freq: 80, at: 0.28, dur: 0.28, type: 'sine', gain: 0.14 },
  ]);
}

/** 15. 抚摸额头升调呼噜 (Forehead Head-rub Purr) */
export function petPurrHeadRub(): void {
  playSynthesizedTones([
    { freq: 120, endFreq: 180, at: 0, dur: 0.16, type: 'sine', gain: 0.13 },
    { freq: 180, endFreq: 140, at: 0.14, dur: 0.22, type: 'sine', gain: 0.15 },
  ]);
}

/** 16. 下巴抓痒呼噜 (Chin Scratch Purr) */
export function petPurrChin(): void {
  playSynthesizedTones([
    { freq: 140, at: 0, dur: 0.12, type: 'sine', gain: 0.13 },
    { freq: 160, at: 0.08, dur: 0.14, type: 'sine', gain: 0.14 },
    { freq: 130, at: 0.18, dur: 0.2, type: 'sine', gain: 0.11 },
  ]);
}

/** 17. 踩奶踩爪节奏音 (Kneading Rhythm) */
export function petPurrKneading(): void {
  playSynthesizedTones([
    { freq: 110, at: 0, dur: 0.1, type: 'triangle', gain: 0.12 },
    { freq: 130, at: 0.12, dur: 0.1, type: 'triangle', gain: 0.13 },
    { freq: 110, at: 0.24, dur: 0.12, type: 'sine', gain: 0.11 },
  ]);
}

/** 18. 贴贴蹭脸呼噜 (Snuggle Purr) */
export function petPurrSnuggle(): void {
  playSynthesizedTones([
    { freq: 130, endFreq: 220, at: 0, dur: 0.18, type: 'sine', gain: 0.14 },
    { freq: 220, endFreq: 160, at: 0.15, dur: 0.22, type: 'sine', gain: 0.12 },
  ]);
}

/** 19. 双重谐波共振呼噜 (Harmonic Purr) */
export function petPurrHarmonic(): void {
  playSynthesizedTones([
    { freq: 88, at: 0, dur: 0.3, type: 'sine', gain: 0.13 },
    { freq: 176, at: 0.05, dur: 0.25, type: 'triangle', gain: 0.09 },
  ]);
}

/** 20. 睡梦沉浸微呼噜 (Dreaming Purr) */
export function petPurrDreaming(): void {
  playSynthesizedTones([
    { freq: 80, at: 0, dur: 0.35, type: 'sine', gain: 0.08 },
    { freq: 92, at: 0.15, dur: 0.3, type: 'sine', gain: 0.07 },
  ]);
}

// ═════════════════════════════════════════════════════════════
// 3. 动作与物理碰撞声效库 (10 种变体)
// ═════════════════════════════════════════════════════════════

/** 21. 弹簧高跳 (Boing High) */
export function petActionBoingHigh(): void {
  playSynthesizedTones([
    { freq: 240, endFreq: 620, at: 0, dur: 0.08, type: 'sine', gain: 0.17 },
    { freq: 620, endFreq: 420, at: 0.06, dur: 0.14, type: 'triangle', gain: 0.15 },
  ]);
}

/** 22. 弹簧轻弹 (Boing Light) */
export function petActionBoingLight(): void {
  playSynthesizedTones([
    { freq: 320, endFreq: 540, at: 0, dur: 0.06, type: 'sine', gain: 0.14 },
    { freq: 540, endFreq: 380, at: 0.05, dur: 0.1, type: 'sine', gain: 0.12 },
  ]);
}

/** 23. 爪子肉垫击掌 (Paw High Five) */
export function petActionPawHighFive(): void {
  playSynthesizedTones([
    { freq: 440, endFreq: 880, at: 0, dur: 0.05, type: 'triangle', gain: 0.16 },
    { freq: 880, endFreq: 1320, at: 0.03, dur: 0.08, type: 'sine', gain: 0.15 },
  ]);
}

/** 24. 爪子连续轻拍 (Paw Tap-Tap) */
export function petActionPawTapTap(): void {
  playSynthesizedTones([
    { freq: 520, at: 0, dur: 0.04, type: 'triangle', gain: 0.13 },
    { freq: 620, at: 0.07, dur: 0.04, type: 'triangle', gain: 0.14 },
    { freq: 740, at: 0.14, dur: 0.06, type: 'sine', gain: 0.15 },
  ]);
}

/** 25. 毛线球回弹 (Yarn Ball Bounce) */
export function petActionYarnBounce(): void {
  playSynthesizedTones([
    { freq: 280, endFreq: 460, at: 0, dur: 0.05, type: 'sine', gain: 0.15 },
    { freq: 460, endFreq: 340, at: 0.04, dur: 0.08, type: 'triangle', gain: 0.13 },
    { freq: 340, endFreq: 240, at: 0.1, dur: 0.1, type: 'sine', gain: 0.1 },
  ]);
}

/** 26. 快速飞扑 (Pounce Strike) */
export function petActionPounce(): void {
  playSynthesizedTones([
    { freq: 220, endFreq: 580, at: 0, dur: 0.07, type: 'sine', gain: 0.15 },
    { freq: 580, endFreq: 320, at: 0.06, dur: 0.12, type: 'triangle', gain: 0.14 },
  ]);
}

/** 27. 尾巴快速破风甩动 (Tail Swoosh) */
export function petActionTailSwoosh(): void {
  playSynthesizedTones([
    { freq: 280, endFreq: 180, at: 0, dur: 0.12, type: 'sine', gain: 0.1 },
    { freq: 360, endFreq: 200, at: 0.08, dur: 0.15, type: 'sine', gain: 0.08 },
  ]);
}

/** 28. 小碎步奔跑脚步 (Quick Footsteps) */
export function petActionFootsteps(): void {
  playSynthesizedTones([
    { freq: 420, at: 0, dur: 0.03, type: 'triangle', gain: 0.1 },
    { freq: 460, at: 0.06, dur: 0.03, type: 'triangle', gain: 0.1 },
    { freq: 420, at: 0.12, dur: 0.03, type: 'triangle', gain: 0.1 },
    { freq: 480, at: 0.18, dur: 0.04, type: 'triangle', gain: 0.11 },
  ]);
}

/** 29. 伸懒腰骨骼舒展 (Stretch Relax) */
export function petActionStretch(): void {
  playSynthesizedTones([
    { freq: 260, endFreq: 440, at: 0, dur: 0.22, type: 'sine', gain: 0.12 },
    { freq: 440, endFreq: 330, at: 0.18, dur: 0.24, type: 'sine', gain: 0.1 },
  ]);
}

/** 30. 欢快翻滚落地 (Roll & Tumble) */
export function petActionRoll(): void {
  playSynthesizedTones([
    { freq: 320, endFreq: 480, at: 0, dur: 0.08, type: 'sine', gain: 0.13 },
    { freq: 480, endFreq: 280, at: 0.07, dur: 0.14, type: 'triangle', gain: 0.14 },
    { freq: 280, endFreq: 360, at: 0.18, dur: 0.12, type: 'sine', gain: 0.11 },
  ]);
}

// ═════════════════════════════════════════════════════════════
// 4. 魔法与粒子闪光声效库 (8 种变体)
// ═════════════════════════════════════════════════════════════

/** 31. 奇迹换装魔杖升调 (Magic Wardrobe Up) */
export function petMagicTransform(): void {
  playSynthesizedTones([
    { freq: 987.77, at: 0, dur: 0.08, type: 'triangle', gain: 0.12 },
    { freq: 1174.66, at: 0.05, dur: 0.08, type: 'sine', gain: 0.13 },
    { freq: 1318.51, at: 0.1, dur: 0.1, type: 'triangle', gain: 0.14 },
    { freq: 1760.0, at: 0.16, dur: 0.14, type: 'sine', gain: 0.15 },
    { freq: 2349.32, at: 0.22, dur: 0.25, type: 'sine', gain: 0.12 },
  ]);
}

/** 32. 小星光聚集闪烁 (Sparkle Cluster) */
export function petMagicSparkle(): void {
  playSynthesizedTones([
    { freq: 1567.98, at: 0, dur: 0.06, type: 'sine', gain: 0.11 },
    { freq: 2093.0, at: 0.04, dur: 0.07, type: 'sine', gain: 0.13 },
    { freq: 2637.0, at: 0.09, dur: 0.12, type: 'sine', gain: 0.14 },
  ]);
}

/** 33. 宝石皇冠金芒 (Golden Crown Glimmer) */
export function petMagicCrownGleam(): void {
  playSynthesizedTones([
    { freq: 1318.51, at: 0, dur: 0.1, type: 'sine', gain: 0.12 },
    { freq: 1975.53, at: 0.08, dur: 0.18, type: 'triangle', gain: 0.15 },
  ]);
}

/** 34. 魔法帽星河盘旋 (Wizard Hat Galaxy) */
export function petMagicGalaxy(): void {
  playSynthesizedTones([
    { freq: 880, endFreq: 1400, at: 0, dur: 0.14, type: 'sine', gain: 0.12 },
    { freq: 1400, endFreq: 2200, at: 0.1, dur: 0.2, type: 'triangle', gain: 0.14 },
  ]);
}

/** 35. 爱心爆发粉红音 (Heart Burst) */
export function petMagicHeartBurst(): void {
  playSynthesizedTones([
    { freq: 659.25, at: 0, dur: 0.08, type: 'sine', gain: 0.13 },
    { freq: 880.0, at: 0.06, dur: 0.1, type: 'sine', gain: 0.15 },
    { freq: 1174.66, at: 0.12, dur: 0.18, type: 'sine', gain: 0.14 },
  ]);
}

/** 36. 灵光一闪灯泡音 (Idea Ding) */
export function petMagicIdeaDing(): void {
  playSynthesizedTones([
    { freq: 1760.0, at: 0, dur: 0.04, type: 'sine', gain: 0.14 },
    { freq: 2637.02, at: 0.02, dur: 0.22, type: 'triangle', gain: 0.16 },
  ]);
}

/** 37. 彩虹升起旋律 (Rainbow Rise) */
export function petMagicRainbow(): void {
  playSynthesizedTones([
    { freq: 523.25, at: 0, dur: 0.08, type: 'sine', gain: 0.11 },
    { freq: 659.25, at: 0.06, dur: 0.08, type: 'sine', gain: 0.12 },
    { freq: 783.99, at: 0.12, dur: 0.08, type: 'sine', gain: 0.13 },
    { freq: 1046.5, at: 0.18, dur: 0.16, type: 'sine', gain: 0.15 },
  ]);
}

/** 38. 知识解密金币音 (Coin Collect) */
export function petMagicCoin(): void {
  playSynthesizedTones([
    { freq: 987.77, at: 0, dur: 0.06, type: 'triangle', gain: 0.14 },
    { freq: 1318.51, at: 0.05, dur: 0.18, type: 'sine', gain: 0.16 },
  ]);
}

// ═════════════════════════════════════════════════════════════
// 5. 快乐与赞扬风铃库 (8 种变体)
// ═════════════════════════════════════════════════════════════

/** 39. 大三和弦胜利欢呼 (Victory Chord) */
export function petJoyVictory(): void {
  playSynthesizedTones([
    { freq: 523.25, at: 0, dur: 0.12, type: 'triangle', gain: 0.15 },
    { freq: 659.25, at: 0.08, dur: 0.12, type: 'triangle', gain: 0.15 },
    { freq: 783.99, at: 0.16, dur: 0.16, type: 'triangle', gain: 0.16 },
    { freq: 1046.5, at: 0.24, dur: 0.28, type: 'sine', gain: 0.14 },
  ]);
}

/** 40. 鼓掌喝彩小风铃 (Applause Chime) */
export function petJoyApplause(): void {
  playSynthesizedTones([
    { freq: 880, at: 0, dur: 0.08, type: 'sine', gain: 0.12 },
    { freq: 1174.66, at: 0.06, dur: 0.1, type: 'sine', gain: 0.14 },
    { freq: 1567.98, at: 0.13, dur: 0.18, type: 'sine', gain: 0.15 },
  ]);
}

/** 41. 升级大礼花 (Level Up Fanfare) */
export function petJoyLevelUp(): void {
  playSynthesizedTones([
    { freq: 440, at: 0, dur: 0.1, type: 'triangle', gain: 0.14 },
    { freq: 554.37, at: 0.08, dur: 0.1, type: 'triangle', gain: 0.14 },
    { freq: 659.25, at: 0.16, dur: 0.12, type: 'triangle', gain: 0.15 },
    { freq: 880.0, at: 0.24, dur: 0.3, type: 'sine', gain: 0.16 },
  ]);
}

/** 42. 八音盒温润摇篮曲 (Music Box Lullaby) */
export function petJoyMusicBox(): void {
  playSynthesizedTones([
    { freq: 1046.5, at: 0, dur: 0.18, type: 'sine', gain: 0.13 },
    { freq: 1174.66, at: 0.14, dur: 0.18, type: 'sine', gain: 0.13 },
    { freq: 1318.51, at: 0.28, dur: 0.22, type: 'sine', gain: 0.14 },
    { freq: 1567.98, at: 0.44, dur: 0.35, type: 'sine', gain: 0.15 },
  ]);
}

/** 43. 欢快华尔兹三连音 (Waltz Triplet) */
export function petJoyWaltz(): void {
  playSynthesizedTones([
    { freq: 659.25, at: 0, dur: 0.1, type: 'sine', gain: 0.12 },
    { freq: 783.99, at: 0.1, dur: 0.1, type: 'sine', gain: 0.13 },
    { freq: 987.77, at: 0.2, dur: 0.18, type: 'sine', gain: 0.14 },
  ]);
}

/** 44. 阳光灿烂大笑和弦 (Sunny Laugh) */
export function petJoySunny(): void {
  playSynthesizedTones([
    { freq: 587.33, at: 0, dur: 0.08, type: 'triangle', gain: 0.13 },
    { freq: 739.99, at: 0.06, dur: 0.1, type: 'triangle', gain: 0.14 },
    { freq: 880.0, at: 0.13, dur: 0.16, type: 'sine', gain: 0.15 },
  ]);
}

/** 45. 五音连奏清泉音 (Pentatonic Spring) */
export function petJoyPentatonic(): void {
  playSynthesizedTones([
    { freq: 523.25, at: 0, dur: 0.07, type: 'sine', gain: 0.11 },
    { freq: 587.33, at: 0.05, dur: 0.07, type: 'sine', gain: 0.12 },
    { freq: 659.25, at: 0.1, dur: 0.07, type: 'sine', gain: 0.13 },
    { freq: 783.99, at: 0.15, dur: 0.08, type: 'sine', gain: 0.14 },
    { freq: 880.0, at: 0.21, dur: 0.18, type: 'sine', gain: 0.15 },
  ]);
}

/** 46. 完美满分铃音 (Perfect Score Bell) */
export function petJoyPerfect(): void {
  playSynthesizedTones([
    { freq: 1046.5, at: 0, dur: 0.08, type: 'sine', gain: 0.14 },
    { freq: 1318.51, at: 0.06, dur: 0.08, type: 'sine', gain: 0.14 },
    { freq: 1567.98, at: 0.12, dur: 0.1, type: 'triangle', gain: 0.15 },
    { freq: 2093.0, at: 0.18, dur: 0.28, type: 'sine', gain: 0.16 },
  ]);
}

// ═════════════════════════════════════════════════════════════
// 6. 趣味环境与生理声效库 (6 种变体)
// ═════════════════════════════════════════════════════════════

/** 47. 戳破大彩泡 (Bubble Pop Big) */
export function petFunBubbleBig(): void {
  playSynthesizedTones([
    { freq: 550, endFreq: 980, at: 0, dur: 0.04, type: 'sine', gain: 0.14 },
    { freq: 980, endFreq: 1400, at: 0.02, dur: 0.08, type: 'sine', gain: 0.16 },
  ]);
}

/** 48. 连环小水泡爆裂 (Bubble Pop Cluster) */
export function petFunBubbleCluster(): void {
  playSynthesizedTones([
    { freq: 750, at: 0, dur: 0.03, type: 'sine', gain: 0.11 },
    { freq: 920, at: 0.04, dur: 0.03, type: 'sine', gain: 0.12 },
    { freq: 1150, at: 0.08, dur: 0.04, type: 'sine', gain: 0.14 },
    { freq: 1350, at: 0.13, dur: 0.05, type: 'sine', gain: 0.15 },
  ]);
}

/** 49. 嚼小鱼干香脆咯吱 (Fish Crunch) */
export function petFunFishCrunch(): void {
  playSynthesizedTones([
    { freq: 380, endFreq: 240, at: 0, dur: 0.04, type: 'triangle', gain: 0.15 },
    { freq: 520, endFreq: 310, at: 0.05, dur: 0.05, type: 'triangle', gain: 0.16 },
    { freq: 440, endFreq: 260, at: 0.11, dur: 0.06, type: 'triangle', gain: 0.14 },
  ]);
}

/** 50. 打喷嚏阿啾声 (Cat Sneeze Choo) */
export function petFunSneeze(): void {
  playSynthesizedTones([
    { freq: 850, endFreq: 1300, at: 0, dur: 0.05, type: 'sine', gain: 0.12 },
    { freq: 1300, endFreq: 450, at: 0.04, dur: 0.12, type: 'triangle', gain: 0.17 },
  ]);
}

/** 51. 怕痒咯咯笑 (Giggle Wobble) */
export function petFunGiggle(): void {
  playSynthesizedTones([
    { freq: 650, at: 0, dur: 0.04, type: 'sine', gain: 0.13 },
    { freq: 780, at: 0.05, dur: 0.04, type: 'sine', gain: 0.14 },
    { freq: 650, at: 0.1, dur: 0.04, type: 'sine', gain: 0.13 },
    { freq: 840, at: 0.15, dur: 0.06, type: 'sine', gain: 0.15 },
  ]);
}

/** 52. 梦乡轻微打呼 (Quiet Snore) */
export function petFunSnore(): void {
  playSynthesizedTones([
    { freq: 70, endFreq: 95, at: 0, dur: 0.3, type: 'triangle', gain: 0.08 },
    { freq: 95, endFreq: 65, at: 0.25, dur: 0.35, type: 'sine', gain: 0.06 },
  ]);
}
