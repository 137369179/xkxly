/**
 * 诵读节奏引擎（范读 / 吟诵）
 * ------------------------------------------------------------
 * 依据「平长仄短、入声短促、句读分明、韵脚拖腔」的传统诵读规律，
 * 为一首诗生成逐字节奏方案（ChantPlan），用于：
 *   1. 可视化「节奏条」——平仄长短、停顿一目了然；
 *   2. 范读 / 吟诵 的时长参照（Web Speech 逐句朗读时按此调度停顿）；
 *   3. 录音对照——将用户逐句录音时长与期望时长比对，给出契合度评分。
 *
 * 注：浏览器 speechSynthesis 无法逐字控调音高，故「吟诵」的音高起伏仅在
 * 节奏条上以相对音高标记呈现，实际发声仍走逐句 TTS；真·吟诵音频建议由
 * 名家录音资源提供（见 PoemAudio 资源位）。
 */
import type { DeepPoem } from '@/types';
import { levelOfChar } from './prosody';
import { correctChar, correctChars, polyphoneFixes, type PolyphoneFix } from './tts/polyphone';

export type ChantMode = 'fan' | 'yin';

export interface ChantToken {
  /** 汉字或标点 */
  c: string;
  /** 拼音 */
  p: string;
  /** 平仄（标点为空串） */
  level: '平' | '仄' | '';
  /** 角色：平 / 仄 / 入（古入声，今读平但短促）/ 标（标点停顿） */
  role: '平' | '仄' | '入' | '标';
  /** 本字占用时长（毫秒） */
  holdMs: number;
  /** 相对音高（1=中；平高、仄低、入最低），仅用于吟诵可视化 */
  pitch: number;
  /** 是否韵脚字（末字且为平/入声，朗读时单独拖腔落韵） */
  rhyme?: boolean;
}

export interface ChantLine {
  tokens: ChantToken[];
  /** 整句期望时长（毫秒） */
  expectedMs: number;
  /** 是否押韵句（末字平收） */
  rhyme: boolean;
}

export interface ChantPlan {
  mode: ChantMode;
  lines: ChantLine[];
  totalMs: number;
}

export interface ChantModeInfo {
  key: ChantMode;
  name: string;
  desc: string;
  /** 平声基础时长 */
  ping: number;
  /** 仄声基础时长 */
  ze: number;
  /** 入声基础时长 */
  ru: number;
  /** 韵脚延长系数 */
  rhymeMul: number;
  /** 逗号 / 顿号停顿 */
  comma: number;
  /** 分号停顿 */
  semi: number;
  /** 句号 / 叹号 / 问号停顿 */
  period: number;
}

const MODES: Record<ChantMode, ChantModeInfo> = {
  fan: {
    key: 'fan',
    name: '范读',
    desc: '字正腔圆、从容清晰的现代朗读，平长仄短、句读分明，适合跟读与录音对照。',
    ping: 300,
    ze: 200,
    ru: 150,
    rhymeMul: 1.35,
    comma: 200,
    semi: 320,
    period: 460,
  },
  yin: {
    key: 'yin',
    name: '吟诵',
    desc: '依字行腔、拖韵摇曳的传统吟调，平仄长短对比更夸张，韵脚大幅拖长，重意境回环。',
    ping: 380,
    ze: 240,
    ru: 170,
    rhymeMul: 1.7,
    comma: 300,
    semi: 440,
    period: 640,
  },
};

export function chantModeInfo(mode: ChantMode): ChantModeInfo {
  return MODES[mode];
}

function isHan(c: string): boolean {
  return /[一-龥]/.test(c);
}

function pauseOf(ch: string, m: ChantModeInfo): number {
  if (ch === '，' || ch === '、' || ch === '丶') return m.comma;
  if (ch === '；' || ch === '：') return m.semi;
  if (ch === '。' || ch === '！' || ch === '？') return m.period;
  return 120; // 其他标点：轻微气口
}

/**
 * 生成一首诗的诵读节奏方案。
 * @param poem   古诗（需含 lines，逐字拼音）
 * @param mode   范读 / 吟诵
 */
export function analyzeChant(poem: DeepPoem, mode: ChantMode = 'fan'): ChantPlan {
  const m = MODES[mode]!

  const lines: ChantLine[] = poem.lines.map((line) => {
    const tokens: ChantToken[] = [];

    // 末字（内容字）下标，用于韵脚拖长判定
    let lastHan = -1;
    line.chars.forEach((ch, i) => {
      if (isHan(ch.c)) lastHan = i;
    });

    line.chars.forEach((ch, i) => {
      if (!isHan(ch.c)) {
        // 标点 → 停顿 token
        tokens.push({
          c: ch.c,
          p: '',
          level: '',
          role: '标',
          holdMs: pauseOf(ch.c, m),
          pitch: 1,
        });
        return;
      }
      const { level, ru } = levelOfChar(ch.c, ch.p);
      const atTail = i === lastHan;
      const isRhymeTail = atTail && (level === '平' || ru);
      let base: number;
      let role: ChantToken['role'];
      let pitch: number;
      if (ru) {
        base = m.ru;
        role = '入';
        pitch = 0.8;
      } else if (level === '平') {
        base = m.ping;
        role = '平';
        pitch = 1.15;
      } else {
        base = m.ze;
        role = '仄';
        pitch = 0.9;
      }
      // 韵脚（末字平/入声收）拖腔
      const holdMs = isRhymeTail ? Math.round(base * m.rhymeMul) : base;
      tokens.push({ c: ch.c, p: ch.p, level: level || '', role, holdMs, pitch, rhyme: isRhymeTail });
    });

    const expectedMs = tokens.reduce((s, t) => s + t.holdMs, 0);
    const rhyme = lastHan >= 0 && tokens[lastHan]!.level === '平';
    return { tokens, expectedMs, rhyme };
  });

  const totalMs = lines.reduce((s, l) => s + l.expectedMs, 0);
  return { mode, lines, totalMs };
}

/** 供 Web Speech 逐句朗读使用：返回每行文本（保留标点以触发自然停顿） */
export function chantLinesText(poem: DeepPoem): string[] {
  return poem.lines.map((l) => l.chars.map((c) => c.c).join(''));
}

/**
 * 逐句「送进 TTS 的文本」：多音字已按标注拼音替换为同音单读字。
 * 页面显示请继续用 chantLinesText，两者一一对应、长度可能不同但读音一致。
 */
export function chantLinesSpoken(poem: DeepPoem): string[] {
  return poem.lines.map((l) => correctChars(l.chars));
}

/** 诊断用：整首诗被纠正的多音字明细（逐句） */
export function poemPolyphoneFixes(poem: DeepPoem): { line: number; fixes: PolyphoneFix[] }[] {
  return poem.lines
    .map((l, line) => ({ line, fixes: polyphoneFixes(l.chars) }))
    .filter((x) => x.fixes.length > 0);
}

export interface RecordScore {
  /** 综合契合度 0-100 */
  score: number;
  /** 逐句偏差（用户时长 / 期望时长，1 为完美） */
  ratios: number[];
  /** 哪几句明显偏快 / 偏慢 */
  fast: number[];
  slow: number[];
}

/**
 * 录音对照评分：将用户逐句录音时长与节奏方案期望时长比对。
 * 以「相对时长比」的贴近度（对数尺度，避免长句被惩罚）估算契合度。
 * @param plan            节奏方案
 * @param lineDurationsMs 用户每句录音时长（毫秒），可与 plan.lines 对齐
 */
export function scoreRecording(plan: ChantPlan, lineDurationsMs: number[]): RecordScore {
  const ratios: number[] = [];
  const fast: number[] = [];
  const slow: number[] = [];
  let totalPenalty = 0;
  let n = 0;

  plan.lines.forEach((ln, i) => {
    const user = lineDurationsMs[i]!
    if (!user || user <= 0) return;
    n++;
    const ratio = user / ln.expectedMs;
    ratios[i] = ratio;
    // 偏差度：以 ln(比值) 衡量，±0 最佳，越大越偏
    const dev = Math.abs(Math.log(ratio));
    totalPenalty += dev;
    if (ratio > 1.25) fast.push(i); // 偏慢
    else if (ratio < 0.8) slow.push(i); // 偏快
  });

  const avgDev = n ? totalPenalty / n : 1;
  // 将平均偏差映射到 0-100：dev=0 → 100，dev≈0.7 → 50，dev≥1.4 → 0
  const score = n ? Math.max(0, Math.round(100 * Math.exp(-avgDev / 0.7))) : 0;
  return { score, ratios: ratios.map((r) => (r ? +r.toFixed(2) : 0)), fast, slow };
}

/** 一句话节奏提示（用于 UI 副标题）；tr 可选：传入后输出翻译文案 */
export function chantHint(plan: ChantPlan, tr?: (k: string, p?: Record<string, string | number>) => string): string {
  const rhymeLines = plan.lines.filter((l) => l.rhyme).length;
  const secs = (plan.totalMs / 1000).toFixed(1);
  if (tr) {
    return tr('poem.chantHint', { lines: plan.lines.length, secs, rhyme: rhymeLines, yin: plan.mode === 'yin' ? '、入声促、韵脚拖' : '' });
  }
  return `共 ${plan.lines.length} 句，约 ${secs} 秒；${rhymeLines} 句押韵落腔。平声长、仄声短${plan.mode === 'yin' ? '、入声促、韵脚拖' : ''}。`;
}

/* ---------------- 情绪基调 + 有感情朗读调度 ---------------- */

/**
 * 有感情朗读的「分段」：speak 片段按字/标点切分，pause 片段为句读停顿。
 * rateMul / pitchAdd 是相对基础参数的微调，由 buildChantSegments 依据平仄与韵脚算出。
 */
export interface ChantSegment {
  type: 'speak' | 'pause';
  /** speak 片段文本（原文，用于显示与对照） */
  text: string;
  /**
   * 送进 TTS 的文本：多音字已按标注拼音替换为同音单读字。
   * 与 text 分离是刻意的 —— 页面永远显示原文，只有语音引擎拿到替换版。
   */
  spoken: string;
  /** pause 片段时长（毫秒） */
  ms: number;
  /** 相对基础语速的乘法微调（<1 更慢，制造拖腔/舒缓） */
  rateMul: number;
  /** 相对基础音高的加法偏移 */
  pitchAdd: number;
}

/** 诗歌情绪基调：整体决定范读/吟诵的语速、音高、音量色彩 */
export interface PoemMood {
  key: string;
  name: string;
  rate: number;
  pitch: number;
  volume: number;
}

const MOOD_TABLE: { match: string[]; mood: PoemMood }[] = [
  { match: ['边塞', '战争', '军旅', '征战'], mood: { key: 'frontier', name: '苍凉雄浑', rate: 0.82, pitch: 0.96, volume: 1 } },
  { match: ['思乡', '乡愁', '羁旅', '归隐'], mood: { key: 'homesick', name: '低回婉转', rate: 0.7, pitch: 1.04, volume: 0.95 } },
  { match: ['送别', '离别', '赠答'], mood: { key: 'farewell', name: '依依惜别', rate: 0.72, pitch: 1.0, volume: 0.94 } },
  { match: ['山水', '田园', '隐逸', '闲适', '自然'], mood: { key: 'nature', name: '清新闲适', rate: 0.74, pitch: 1.12, volume: 1 } },
  { match: ['咏史', '怀古', '讽喻', '咏怀古迹'], mood: { key: 'history', name: '沉郁顿挫', rate: 0.76, pitch: 0.98, volume: 1 } },
  { match: ['爱情', '闺怨', '相思', '宫怨'], mood: { key: 'love', name: '缠绵悱恻', rate: 0.7, pitch: 1.1, volume: 0.92 } },
  { match: ['豪放', '言志', '壮志', '咏怀'], mood: { key: 'bold', name: '豪迈奔放', rate: 0.84, pitch: 1.08, volume: 1 } },
  { match: ['节令', '喜庆', '童趣', '咏物', '春', '秋'], mood: { key: 'joy', name: '欢快明朗', rate: 0.8, pitch: 1.15, volume: 1 } },
];

const DEFAULT_MOOD: PoemMood = { key: 'plain', name: '从容舒缓', rate: 0.74, pitch: 1.1, volume: 1 };

/** 依据 themes / imagery 推断诗歌情绪基调，用于朗读的语速/音高/音量调度 */
export function moodOfPoem(poem: { themes?: string[]; imagery?: string[] }): PoemMood {
  const hay = [...(poem.themes ?? []), ...(poem.imagery ?? [])].join(' ');
  for (const e of MOOD_TABLE) {
    if (e.match.some((k) => hay.includes(k))) return e.mood;
  }
  return DEFAULT_MOOD;
}

/**
 * 把节奏方案转成「有感情」的朗读分段，交 speakChant 调度播放：
 *  1. 按标点切分朗读单元，标点处插入对应时长的停顿（句读分明：逗号轻顿、句号长歇）；
 *  2. 韵脚字单独慢读 + 略高音，制造拖腔落韵；
 *  3. 平声片段略慢、仄声略快，形成抑扬顿挫（吟诵模式下对比更夸张）。
 * 返回「每行一个分段数组」，结构稳定，可在 useMemo 中缓存。
 */
export function buildChantSegments(poem: DeepPoem, mode: ChantMode = 'fan'): ChantSegment[][] {
  const plan = analyzeChant(poem, mode);
  const PING_MUL = mode === 'yin' ? 0.86 : 0.92;
  const ZE_MUL = mode === 'yin' ? 1.12 : 1.06;
  const RHYME_RATE = mode === 'yin' ? 0.5 : 0.6;
  const RHYME_PITCH = 0.12;

  return plan.lines.map((line) => {
    const segs: ChantSegment[] = [];
    let buf = '';
    let spokenBuf = '';
    let bufMul = 1;
    let bufPitch = 0;
    const flush = () => {
      if (buf) {
        segs.push({
          type: 'speak',
          text: buf,
          spoken: spokenBuf,
          ms: 0,
          rateMul: bufMul,
          pitchAdd: bufPitch,
        });
        buf = '';
        spokenBuf = '';
        bufMul = 1;
        bufPitch = 0;
      }
    };
    line.tokens.forEach((t) => {
      if (t.role === '标') {
        flush();
        segs.push({
          type: 'pause',
          text: '',
          spoken: '',
          ms: Math.min(950, Math.max(140, Math.round(t.holdMs))),
          rateMul: 1,
          pitchAdd: 0,
        });
        return;
      }
      if (t.rhyme) {
        // 韵脚：先 flush 前面的字，再单独拖腔朗读
        flush();
        segs.push({
          type: 'speak',
          text: t.c,
          spoken: correctChar(t.c, t.p),
          ms: 0,
          rateMul: RHYME_RATE,
          pitchAdd: RHYME_PITCH,
        });
        return;
      }
      if (!buf) {
        bufMul = t.role === '平' ? PING_MUL : ZE_MUL;
        bufPitch = t.role === '平' ? 0.03 : -0.03;
      } else {
        // 同一缓冲内取「更慢 / 更低」的一端，避免忽快忽慢
        bufMul = Math.min(bufMul, t.role === '平' ? PING_MUL : ZE_MUL);
        bufPitch = Math.min(bufPitch, t.role === '平' ? 0.03 : -0.03);
      }
      buf += t.c;
      spokenBuf += correctChar(t.c, t.p);
    });
    flush();
    return segs;
  });
}

export interface TimedToken {
  char: string;
  pinyin: string;
  role: '平' | '仄' | '入' | '标';
  startMs: number;
  durationMs: number;
}

/**
 * 计算单句中每个字符的理论时间戳区间（供卡拉OK单字流动光标使用）
 */
export function calculateTokenTimeOffsets(line: ChantLine): TimedToken[] {
  let currentMs = 0;
  const result: TimedToken[] = [];

  line.tokens.forEach((t) => {
    const duration = Math.max(120, Math.round(t.holdMs));
    result.push({
      char: t.c,
      pinyin: t.p,
      role: t.role,
      startMs: currentMs,
      durationMs: duration,
    });
    currentMs += duration;
  });

  return result;
}
