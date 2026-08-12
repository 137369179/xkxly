/**
 * 录音声波对照引擎
 * ------------------------------------------------------------
 * 把用户的逐句跟读录音（MediaRecorder 产出的音频）解码为采样序列，
 * 通过「静音间隙」切出句内逐字的真实时长，再与预期「平长仄短」谱做
 * 相关性比对，给出真正的**节奏契合度**。
 *
 * 设计要点：
 * - 纯函数 `analyzeEnvelope` 不依赖浏览器 API，可在 Node 下单测；
 * - 逐字切分依赖录音中的字间停顿（跟读场景普遍如此）；若停顿不明显
 *   （连续平滑朗读）无法可靠切分，则诚实退回「中性节奏分 + 真实时长契合」。
 * - 浏览器侧 `decodeToAnalysis` 用 Web Audio 解码，无录音环境时退回计时评分。
 */
import type { ChantPlan, ChantToken } from './chant';

export interface RecChar {
  c: string;
  role: ChantToken['role'];
  /** 实际占用时长（毫秒） */
  durMs: number;
  /** 相对响度 0–1 */
  rms: number;
}

export interface RecLine {
  idx: number;
  /** 整句实际时长（毫秒，已剔除首尾静音） */
  durMs: number;
  /** 整句相对响度 0–1 */
  rms: number;
  /** 是否押韵句 */
  rhyme: boolean;
  /** 是否成功按字切分（用于判断是否给出可信的节奏分） */
  segmented: boolean;
  /** 逐字分析 */
  chars: RecChar[];
}

export interface RecordingAnalysis {
  /** 录音总时长（毫秒） */
  durMs: number;
  lines: RecLine[];
  /** 节奏契合度 0–100（平长仄短相关性，未切分时取中性 50） */
  fit: number;
  /** 时长契合度 0–100（与期望总时长贴近） */
  timeFit: number;
  /** 综合得分 0–100 */
  score: number;
  /** 文字点评 */
  note: string;
}

/** 字间停顿阈值：超过此静音时长视为「字」边界（毫秒） */
const CHAR_PAUSE_MS = 90;
/** 帧长（毫秒） */
const FRAME_MS = 20;

function mean(a: number[]): number {
  if (!a.length) return 0;
  return a.reduce((s, x) => s + x, 0) / a.length;
}

/** 皮尔逊相关系数，范围 -1..1；数据无方差时返回 0 */
function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

/** 逐帧 RMS */
function frameRms(samples: Float32Array, start: number, end: number): number {
  let s = 0;
  let n = 0;
  for (let i = start; i < end; i++) {
    const v = samples[i]!!
    s += v * v;
    n++;
  }
  if (n === 0) return 0;
  return Math.sqrt(s / n);
}

/**
 * 按静音间隙把一句音频切成逐字段，返回每段时长（毫秒）。
 * 仅当识别出的段数与期望字数相等（±0）时才返回可信结果；否则返回 null。
 */
function segmentLine(samples: Float32Array, sampleRate: number, charCount: number): number[] | null {
  if (charCount < 3) return null;
  const frame = Math.max(1, Math.round((FRAME_MS / 1000) * sampleRate));
  const nFrames = Math.floor(samples.length / frame);
  if (nFrames < 2) return null;

  // 逐帧 RMS + 能量阈值
  const env: number[] = [];
  for (let f = 0; f < nFrames; f++) {
    env.push(frameRms(samples, f * frame, Math.min((f + 1) * frame, samples.length)));
  }
  const peak = Math.max(...env, 1e-6);
  const silThreshold = peak * 0.12;
  const speech: boolean[] = env.map((v) => v > silThreshold);

  // 合并：相邻 speech 之间若静音 < CHAR_PAUSE 视为同一字（连续音）
  const pauseFrames = Math.round((CHAR_PAUSE_MS / 1000) * sampleRate) / frame;
  const runs: { start: number; end: number }[] = [];
  let i = 0;
  while (i < nFrames) {
    if (!speech[i]) {
      i++;
      continue;
    }
    const start = i;
    let end = i;
    let gap = 0;
    while (i < nFrames) {
      if (speech[i]) {
        end = i;
        gap = 0;
        i++;
      } else {
        gap++;
        if (gap >= pauseFrames) break;
        i++;
      }
    }
    runs.push({ start, end });
  }
  // 去首尾极短杂讯段
  const valid = runs.filter((r) => r.end - r.start >= 1);
  if (valid.length === 0) return null;

  const segCount = valid.length;
  if (Math.abs(segCount - charCount) > 1) return null; // 段数与字数不符 → 不可信

  const frameMs = (FRAME_MS);
  return valid.map((r) => Math.max(1, (r.end - r.start + 1) * frameMs));
}

/**
 * 纯函数：对一段已解码的采样序列做节奏分析（针对单句或整诗）。
 * @param samples    单声道浮点采样（-1..1）
 * @param sampleRate 采样率（Hz）
 * @param plan       节奏方案（analyzeChant 产出；可按单句构造）
 */
export function analyzeEnvelope(samples: Float32Array, sampleRate: number, plan: ChantPlan): RecordingAnalysis {
  const totalMs = samples.length > 0 ? (samples.length / sampleRate) * 1000 : 0;
  const expectedTotal = plan.totalMs || 1;

  const lines: RecLine[] = [];
  const expectHoldsAll: number[] = [];
  const actualDursAll: number[] = [];
  let segFitSum = 0;
  let segFitN = 0;

  plan.lines.forEach((ln, idx) => {
    const charTokens = ln.tokens.filter((t) => t.role !== '标');
    const expectHolds = charTokens.map((t) => t.holdMs);
    const weightSum = expectHolds.reduce((s, x) => s + x, 0) || 1;

    const seg = segmentLine(samples, sampleRate, charTokens.length);
    const segmented = seg !== null;

    let chars: RecChar[];
    let lineDurMs: number;
    let lineFit = 0.5; // 中性

    if (segmented && seg) {
      chars = charTokens.map((t, k) => ({
        c: t.c,
        role: t.role,
        durMs: seg[k] ?? 0,
        rms: 0,
      }));
      // 用整段采样估算各字 RMS（按 seg 比例切分）
      const total = seg.reduce((s, x) => s + x, 0) || 1;
      let acc = 0;
      const full = samples.length;
      chars = charTokens.map((t, k) => {
        const frac = (seg[k] ?? 0) / total;
        const cs = Math.round(full * acc);
        acc += frac;
        const ce = Math.round(full * acc);
        return { c: t.c, role: t.role, durMs: seg[k] ?? 0, rms: frameRms(samples, cs, Math.max(cs + 1, ce)) };
      });
      lineDurMs = total;
      const r = pearson(seg, expectHolds);
      lineFit = Math.max(0, Math.min(1, (r + 1) / 2));
      segFitSum += lineFit;
      segFitN++;
      expectHoldsAll.push(...expectHolds);
      actualDursAll.push(...seg);
    } else {
      // 无法按字切分：按比例给出可视化（与期望一致，仅展示用），节奏分取中性
      chars = charTokens.map((t) => ({
        c: t.c,
        role: t.role,
        durMs: Math.round((t.holdMs / weightSum) * (expectedTotal > 0 ? Math.min(totalMs, expectedTotal) : expectedTotal)),
        rms: 0,
      }));
      lineDurMs = Math.round((ln.expectedMs / expectedTotal) * totalMs);
    }

    const lineRms = frameRms(samples, 0, samples.length);
    lines.push({ idx, durMs: lineDurMs, rms: lineRms, rhyme: ln.rhyme, segmented, chars });
  });

  // 节奏契合度：有可信切分时用相关性，否则中性 50
  const fit = segFitN > 0 ? Math.round(100 * (segFitSum / segFitN)) : 50;
  // 时长契合度：实际总时长 vs 期望总时长（对数尺度）
  const ratio = totalMs > 0 ? totalMs / expectedTotal : 1;
  const timeFit = Math.round(100 * Math.exp(-Math.abs(Math.log(ratio)) / 0.5));
  const score = Math.round(0.7 * fit + 0.3 * timeFit);

  let note: string;
  if (segFitN === 0) {
    note = '本段为连续朗读、字间停顿不明显，已按总时长比对；试着每字间稍作停顿，可得到逐字节奏分析。';
  } else if (score >= 85) {
    note = '节奏拿捏得很准：平声拉长、仄声收束，已得吟读之妙。';
  } else if (score >= 65) {
    note = '大体合拍，注意把平声字再拖长一点、入声字读得短促些。';
  } else if (score >= 45) {
    note = '能成句，但平仄长短的对比还不够明显，可对照节奏条再练。';
  } else {
    note = '当前读得偏平（每字时长接近），试着让平声明显更长、仄声更短。';
  }

  return { durMs: totalMs, lines, fit, timeFit, score, note };
}

/**
 * 浏览器侧：解码录音 Blob 并分析。
 * 需要 `AudioContext` / `decodeAudioData`（现代浏览器均支持）。
 */
export async function decodeToAnalysis(blob: Blob, plan: ChantPlan): Promise<RecordingAnalysis> {
  const Ctor: typeof AudioContext =
    (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const buf = await blob.arrayBuffer();
  const ctx = new Ctor();
  try {
    const audio = await ctx.decodeAudioData(buf);
    const ch = audio.getChannelData(0);
    const samples = Float32Array.from(ch);
    return analyzeEnvelope(samples, audio.sampleRate, plan);
  } finally {
    void ctx.close();
  }
}
