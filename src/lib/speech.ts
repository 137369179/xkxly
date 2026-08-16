/**
 * Web Speech API 语音引擎
 * ------------------------------------------------------------
 * 幼儿场景的三个关键点：
 * 1. voices 在部分浏览器是异步加载的，需要等待 voiceschanged
 * 2. 中文 onboundary 事件在多数浏览器不可靠 —— 逐句高亮改为「按句排队播放」实现
 * 3. 语速要慢（幼儿跟读），中文尤其要慢
 */

import type { ChantSegment } from './chant';
import { isSingleHanziVoice, playHanziVoice } from './hanziAudio';
import { playLetterVoice, playPhonicsVoice, playWordVoice } from './letterAudio';
import { playMultiChannelRealVoice, stopRealVoice } from './tts/realVoice';
import { playEdgeNeuralVoice, stopEdgeNeuralAudio } from './tts/edgeNeuralTts';
import { pinyinToSpoken } from './pinyinAudio';
import { applyUserPrefs, getSettings } from './tts/settings';
import { correctText } from './tts/polyphone';
import { buildNeuralSegments } from './tts/neuralCurve';
import { tts } from './tts/manager';
import type { SpeakLang } from '@/types';

export {
  playLetterVoice,
  playPhonicsVoice,
  playWordVoice,
  playEdgeNeuralVoice,
  stopEdgeNeuralAudio,
  playMultiChannelRealVoice,
  stopRealVoice,
  pinyinToSpoken,
};
export type { SpeakLang };

/* ------------------------------------------------------------------ */
/* Store 桥接（解耦：lib 不反向依赖 store）                            */
/* ------------------------------------------------------------------ */
export interface TtsReport {
  isSpeaking: boolean;
  snippet: string;
  startedAt: number;
  module: string;
}
type TtsStateReporter = (report: TtsReport) => void;
type VoiceGuideChecker = () => boolean;
let ttsStateReporter: TtsStateReporter | null = null;
let voiceGuideChecker: VoiceGuideChecker | null = null;
/** 由 store 层在初始化时调用，把 TTS 状态推送与语音引导开关判断接回全局 store，
 *  从而让 lib/speech 保持对 store 的零依赖（消除 lib→store 层倒置循环依赖）。 */
export function registerTtsBridge(reporter: TtsStateReporter, checker: VoiceGuideChecker): void {
  ttsStateReporter = reporter;
  voiceGuideChecker = checker;
}

// 表扬/鼓励语库已拆至 ./praise（保持 re-export 兼容既有 import）
export {
  randomPraise,
  randomEncourage,
  praiseByScene,
  encourageByScene,
  skillToPraiseScene,
  skillToEncourageScene,
} from './praise';
// PraiseScene, EncourageScene from ./praise


const synth: SpeechSynthesis | null =
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

export const speechSupported = !!synth;

let voicesCache: SpeechSynthesisVoice[] = [];
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!synth) return Promise.resolve([]);
  if (voicesReady) return voicesReady;

  voicesReady = new Promise((resolve) => {
    const immediate = synth.getVoices();
    if (immediate.length) {
      voicesCache = immediate;
      resolve(immediate);
      return;
    }
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      voicesCache = synth.getVoices();
      resolve(voicesCache);
    };
    synth.addEventListener('voiceschanged', done, { once: true });
    // 兜底：某些 WebView 永远不触发 voiceschanged
    setTimeout(done, 1200);
  });

  return voicesReady;
}

// 预热
if (synth) void loadVoices();

/**
 * 为指定语言挑选最合适的声音。
 * 优先级：用户在家长中心选定的音色 > 神经/增强音色 > 儿童友好女声 > 本地音色。
 *
 * 「神经/增强音色」优先级很关键：同一台设备上 Windows 的
 * "Microsoft Xiaoxiao Online (Natural)"、macOS/iOS 的 Siri 音色，
 * 与老式拼接式音色（Ting-Ting 等）自然度差了整整一代，
 * 但 getVoices() 的默认顺序并不会把它们排在前面 —— 必须主动识别。
 */
function pickVoice(lang: SpeakLang, preferURI?: string, teacher?: string): SpeechSynthesisVoice | undefined {
  if (!voicesCache.length) voicesCache = synth?.getVoices() ?? [];
  const list = voicesCache;
  if (!list.length) return undefined;

  // 用户显式指定的音色最优先
  if (preferURI) {
    const chosen = list.find((v) => v.voiceURI === preferURI);
    if (chosen) return chosen;
  }

  const prefix = lang === 'zh-CN' ? 'zh' : 'en';
  const candidates = list.filter((v) => v.lang?.toLowerCase().startsWith(prefix));
  if (!candidates.length) return undefined;

  const currentTeacher = teacher || (typeof localStorage !== 'undefined' ? localStorage.getItem('baby_park_selected_teacher') : null) || 'tiantian';

  if (lang === 'zh-CN') {
    if (currentTeacher === 'yunxi') {
      // 阳光少年男声
      const boyVoice = candidates.find((v) => {
        const n = v.name.toLowerCase();
        return n.includes('yunxi') || n.includes('yunjian') || n.includes('kangkang') || n.includes('male') || n.includes('男');
      });
      if (boyVoice) return boyVoice;
    } else if (currentTeacher === 'xiaoxiao') {
      // 活泼少儿女声
      const girlVoice = candidates.find((v) => {
        const n = v.name.toLowerCase();
        return n.includes('xiaoxiao') || n.includes('yaoyao') || n.includes('sinji') || n.includes('siri');
      });
      if (girlVoice) return girlVoice;
    }
  }

  // 默认优先挑神经网络 / 增强 / Siri 音色
  const NEURAL = ['natural', 'neural', 'siri', 'online', 'enhanced', 'premium', '晓', '云'];
  const neural = candidates.find((v) => {
    const n = v.name.toLowerCase();
    return NEURAL.some((k) => n.includes(k));
  });
  if (neural) return neural;

  const preferredNames =
    lang === 'zh-CN'
      ? ['tingting', 'ting-ting', 'meijia', 'sinji', 'huihui', 'yaoyao', 'xiaoxiao', 'female']
      : ['samantha', 'karen', 'moira', 'tessa', 'victoria', 'zira', 'female', 'google us english'];

  const byName = candidates.find((v) =>
    preferredNames.some((n) => v.name.toLowerCase().includes(n)),
  );
  if (byName) return byName;

  const exact = candidates.find((v) => v.lang.replace('_', '-') === lang);
  if (exact) return exact;

  const local = candidates.find((v) => v.localService);
  return local ?? candidates[0];
}

export interface SpeakOptions {
  lang?: SpeakLang;
  rate?: number;
  pitch?: number;
  volume?: number;
  /** 内容模块 key，用于套用家长中心的「分模块朗读微调」 */
  module?: import('./tts/types').TtsModuleKey | string;
  /** 诗歌情绪 key（古诗范读时传入，神经引擎据此做情感化语速曲线） */
  moodKey?: string;
  /** 播放结束（或被打断）时回调 */
  onEnd?: () => void;
  onStart?: () => void;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

// ============================================================
// P2-7 / P2-8：全局朗读状态推送 + 优先级朗读队列
// ------------------------------------------------------------
// 现状：speak() 直接 synth.cancel() 打断上一条，多组件并发朗读时
// 会出现「表扬语把古诗打断」「连击提示把讲解打断」等混乱。而且
// ttsState 没有任何地方推送，UI 的全局朗读指示器拿不到数据。
//
// 方案：
//  1. 引入优先级队列（praise > quiz > poem > story > general），
//     高优先级打断低优先级；同/低优先级排队，避免重叠；
//  2. speak() 在真正开始/结束时把状态推给 store.ttsState，
//     UI 可订阅 isSpeaking 显示全局指示器、自动停止按钮。
// ============================================================

/** 朗读优先级：数值越大越优先；高优先级会打断当前低优先级朗读 */
export type SpeakPriority = 'praise' | 'quiz' | 'poem' | 'story' | 'general';
const PRIORITY_RANK: Record<SpeakPriority, number> = {
  praise: 5, // 表扬/鼓励语最高，孩子答对瞬间立即反馈
  quiz: 4, // 答题反馈次之
  poem: 3, // 古诗范读
  story: 2, // 故事/讲解
  general: 1, // 一般朗读最低
};

/** 把模块 key 推断为优先级 */
function moduleToPriority(module?: string): SpeakPriority {
  if (module === 'praise') return 'praise';
  if (module === 'quiz') return 'quiz';
  if (module === 'poem') return 'poem';
  if (module === 'story' || module === 'ai') return 'story';
  return 'general';
}

/** 默认中文语速（按声优） */
function defaultZhRate(teacher: string): number {
  if (teacher === 'xiaoxiao') return 0.92;
  if (teacher === 'yunxi') return 0.90;
  return 0.88;
}

/** 默认中文音调（按声优） */
function defaultZhPitch(teacher: string): number {
  if (teacher === 'xiaoxiao') return 1.25;
  if (teacher === 'yunxi') return 0.95;
  return 1.05;
}

interface QueueItem {
  text: string;
  options: SpeakOptions;
  priority: SpeakPriority;
  resolve: () => void;
}

/** 当前正在朗读项的优先级（用于判断新请求是否可打断） */
let currentPriority: SpeakPriority | null = null;
/** 排队等待的低优先级朗读（FIFO，仅在当前朗读结束后才会处理） */
const pendingQueue: QueueItem[] = [];

/** 推送朗读状态到全局 store（UI 订阅用），经桥接注入，lib 不依赖 store */
function pushTtsState(isSpeaking: boolean, snippet = '', module = ''): void {
  ttsStateReporter?.({
    isSpeaking,
    snippet: snippet ? snippet.slice(0, 20) : '',
    startedAt: isSpeaking ? Date.now() : 0,
    module,
  });
}

/** 立刻停止所有朗读，并清空排队项 */
export function stopSpeaking(): void {
  // 清空等待队列，避免停止后又被队列里的项触发
  while (pendingQueue.length) {
    const item = pendingQueue.shift()!;
    item.resolve();
  }
  currentPriority = null;
  currentUtterance = null;
  stopRealVoice();
  stopEdgeNeuralAudio();
  if (synth) {
    try {
      synth.cancel();
    } catch {
      /* noop */
    }
  }
  pushTtsState(false);
}

/** 仅清空等待队列（不打断当前朗读），返回被丢弃的项数 */
export function clearPendingQueue(): number {
  let n = 0;
  while (pendingQueue.length) {
    const item = pendingQueue.shift()!;
    item.resolve();
    n++;
  }
  return n;
}

/**
 * 朗读一段文本。返回 Promise，在朗读结束 / 被取消 / 出错时 resolve。
 *
 * P2-8：内置优先级调度——
 *  - 高于或等于当前优先级：立即打断当前并播放（保证表扬语第一时间反馈）；
 *  - 低于当前优先级：进入排队，当前朗读结束后自动播放（避免故事/讲解互相打断）；
 *  - 队列最多保留 1 项，溢出时丢弃最旧的同级排队项，防止堆积。
 */
export function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  const { lang = 'zh-CN', onEnd, onStart } = options;

  if (!text.trim()) {
    onEnd?.();
    return Promise.resolve();
  }

  // 本地发音旁路：内容为单个已收录汉字时，直接播放本地 mp3（离线、稳定、
  // 避免系统 TTS 多音字漂移）。加载失败自动回退到下方 Web Speech / Kokoro 链路。
  if (lang === 'zh-CN' && isSingleHanziVoice(text)) {
    pushTtsState(true, text, options.module ?? '');
    return playHanziVoice(text, onEnd)
      .catch(() => {
        // 本地资源不可用 → 回退系统 TTS（需 synth 可用）
        if (!synth) {
          onEnd?.();
          return;
        }
        return fallbackSingleChar(text, options, onEnd, onStart);
      })
      .finally(() => {
        pushTtsState(false);
      });
  }

  if (!synth) {
    onEnd?.();
    return Promise.resolve();
  }

  // 拼音符号转中文发音：如果传入的是拼音（如 "b", "zh", "ai", "bā"），自动转为标准代表字发音
  if (lang === 'zh-CN') {
    text = pinyinToSpoken(text);
  }

  // 日常词库纠音（P9 · ①）：自由文本（故事/讲解/跟读）无逐字拼音，引擎易把
  // 「银行/重新/音乐」等高频多音词读错。开启纠音时整词替换成同音词送进 TTS。
  // 古诗走 correctChars（单字+拼音），不在此处理，避免双重替换。
  const usePoly = getSettings().polyphone;
  if (usePoly && lang === 'zh-CN' && options.module !== 'poem') {
    text = correctText(text);
  }

  const priority = moduleToPriority(options.module);

  // 优先级调度：若当前有更高优先级朗读在进行，且本项优先级更低 → 排队
  if (currentPriority !== null && PRIORITY_RANK[priority] < PRIORITY_RANK[currentPriority]) {
    return new Promise<void>((resolve) => {
      // 队列上限 1：丢弃最旧的低优先级排队项，防止堆积后孩子听到一长串过时内容
      if (pendingQueue.length >= 1) {
        const dropped = pendingQueue.shift()!;
        dropped.resolve();
      }
      pendingQueue.push({ text, options, priority, resolve });
    });
  }

  return loadVoices().then(() => runSpeak(text, options, priority, onEnd, onStart));
}

/**
 * 本地发音缺失时的单字回退：直接走系统语音（绕过排队，独立播放一次）。
 * 与 runSpeak 逻辑等价但入参更简，供 speak() 的本地旁路 catch 分支调用。
 */
function fallbackSingleChar(
  text: string,
  options: SpeakOptions,
  onEnd?: () => void,
  onStart?: () => void,
): Promise<void> {
  const { lang = 'zh-CN', rate, pitch = 1.15, volume = 1 } = options;
  if (!synth) {
    onEnd?.();
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    try {
      synth.cancel();
    } catch {
      /* noop */
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const base = rate ?? (lang === 'zh-CN' ? 0.78 : 0.82);
    const prefs = applyUserPrefs({ rate: base, pitch, volume, lang, module: options.module });
    u.rate = prefs.rate ?? base;
    u.pitch = prefs.pitch ?? pitch;
    u.volume = prefs.volume ?? volume;
    const voice = pickVoice(lang, prefs.voiceURI);
    if (voice) u.voice = voice;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (currentUtterance === u) currentUtterance = null;
      onEnd?.();
      resolve();
    };
    u.onstart = () => onStart?.();
    u.onend = finish;
    u.onerror = finish;
    currentUtterance = u;
    try {
      synth.resume();
    } catch {
      /* noop */
    }
    synth.speak(u);
    const est = Math.max(2500, text.length * 420 + 2000);
    setTimeout(() => {
      if (!finished) finish();
    }, est);
  });
}

/** 真正执行朗读（已通过优先级判断），结束后处理排队项 */
function runSpeak(
  text: string,
  options: SpeakOptions,
  priority: SpeakPriority,
  onEnd?: () => void,
  onStart?: () => void,
): Promise<void> {
  const { lang = 'zh-CN', rate, pitch = 1.15, volume = 1 } = options;
  currentPriority = priority;
  pushTtsState(true, text, options.module ?? '');

  /** 朗读结束的统一收尾：触发回调、推送状态、处理排队项 */
  const cleanup = () => {
    if (currentPriority === priority) {
      currentPriority = null;
      pushTtsState(false);
    }
    // 处理排队项：取最早一个继续播放（其优先级必然 <= 本项，否则不会进队列）
    const next = pendingQueue.shift();
    if (next) {
      // 排队项可能在等待期间已不再需要（如页面切换），但 resolve 由其自身播放完成触发
      void loadVoices().then(() => runSpeak(next.text, next.options, next.priority).then(next.resolve));
    }
  };

  return new Promise<void>((resolve) => {
    // 系统语音回退兜底处理函数
    const fallbackToWebSpeech = () => {
      if (!synth) {
        onEnd?.();
        cleanup();
        resolve();
        return;
      }
      try {
        synth.cancel();
      } catch {
        /* noop */
      }
      const corrected = getSettings().polyphone ? correctText(text) : text;
      const u = new SpeechSynthesisUtterance(corrected);
      const teacher = (typeof localStorage !== 'undefined' ? localStorage.getItem('baby_park_selected_teacher') : null) || 'tiantian';
      const voice = pickVoice(lang, getSettings().voiceURI, teacher);
      if (voice) u.voice = voice;
      u.lang = lang;
      
      const baseRate = rate ?? (lang === 'zh-CN' ? defaultZhRate(teacher) : 0.82);
      const basePitch = pitch ?? (lang === 'zh-CN' ? defaultZhPitch(teacher) : 1.12);

      const prefs = applyUserPrefs({ rate: baseRate, pitch: basePitch, volume, lang, module: options.module });
      u.rate = prefs.rate ?? baseRate;
      u.pitch = prefs.pitch ?? basePitch;
      u.volume = prefs.volume ?? volume;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        currentUtterance = null;
        onEnd?.();
        cleanup();
        resolve();
      };
      u.onstart = () => onStart?.();
      u.onend = finish;
      u.onerror = finish;
      currentUtterance = u;
      try {
        synth.resume();
      } catch {
        /* noop */
      }
      synth.speak(u);
      const est = Math.max(2500, text.length * 450 + 2000);
      setTimeout(() => {
        if (!finished) finish();
      }, est);
    };

    // 1. 全域多通道真人语音路径（默认首选：有道少儿名师真人录音 + 微软 Neural 晓晓/云希 + 百度少儿真人流）
    const settings = getSettings();
    const useRealVoice = settings.engine === 'edge' || settings.engine === 'webspeech' || !settings.engine;
    if (useRealVoice) {
      const base = rate ?? 0.85;
      const prefs = applyUserPrefs({ rate: base, pitch, volume, lang, module: options.module });

      playMultiChannelRealVoice(text, {
        lang: lang as 'zh-CN' | 'en-US',
        volume: prefs.volume ?? volume,
        onStart,
        onEnd: () => {
          onEnd?.();
          cleanup();
          resolve();
        },
      }).catch((err) => {
        // 多通道失败时静默平滑降级至系统 WebSpeech
        if (import.meta.env.DEV) console.warn('[speech] 真人语音多通道降级到系统语音:', err);
        fallbackToWebSpeech();
      });
      return;
    }

    // 2. 神经网络本地推理朗读：中文且家长开启了 Kokoro 引擎
    const useKokoro = lang === 'zh-CN' && settings.engine === 'kokoro';
    if (useKokoro) {
      const base = rate ?? 0.78;
      const prefs = applyUserPrefs({ rate: base, pitch, volume, lang, module: options.module });
      const rateOut = prefs.rate ?? base;
      const segments = buildNeuralSegments(text, options.module, options.moodKey);
      tts
        .play(text, {
          rate: rateOut,
          pitch: prefs.pitch ?? pitch,
          volume: prefs.volume ?? volume,
          segments,
        })
        .then((handle) => handle.done)
        .then(() => {
          onEnd?.();
          cleanup();
          resolve();
        })
        .catch(() => {
          fallbackToWebSpeech();
        });
      return;
    }

    // 3. 系统 Web Speech API 原生模式
    fallbackToWebSpeech();
  });
}

/**
 * 按序朗读多句，每句开始前触发 onLine（用于逐句高亮）。
 * 返回一个可取消的控制器。
 */
export interface SequenceController {
  cancel: () => void;
  done: Promise<void>;
}

export function speakSequence(
  lines: string[],
  options: SpeakOptions & {
    onLine?: (index: number) => void;
    /** 句间停顿（毫秒） */
    gap?: number;
    /** 内容模块 key（分模块微调） */
    module?: import('./tts/types').TtsModuleKey | string;
  } = {},
): SequenceController {
  const { onLine, gap = 260, ...speakOpts } = options;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const done = (async () => {
    for (let i = 0; i < lines.length; i++) {
      if (cancelled) break;
      onLine?.(i);
      await speak(lines[i]!, speakOpts);
      if (cancelled) break;
      if (gap > 0 && i < lines.length - 1) {
        await new Promise<void>((r) => {
          timer = setTimeout(r, gap);
        });
      }
    }
    if (!cancelled) onLine?.(-1);
  })();

  return {
    cancel() {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stopSpeaking();
    },
    done,
  };
}

/** 朗读单个英文字母（优先使用本地离线高保真标准音频） */
export async function speakLetter(letter: string): Promise<void> {
  try {
    await playLetterVoice(letter);
  } catch {
    return speak(letter.toUpperCase(), { lang: 'en-US', rate: 0.6, pitch: 1.2, module: 'letter' });
  }
}

/** 朗读自然拼读音或童谣助记（优先使用本地离线高保真标准音频） */
export async function speakPhonics(text: string, letterChar?: string): Promise<void> {
  const match = letterChar ?? text.match(/^[A-Za-z]/)?.[0];
  if (match) {
    try {
      await playPhonicsVoice(match);
      return;
    } catch {
      /* 降级走系统 TTS */
    }
  }
  return speak(text, { lang: 'en-US', rate: 0.72, pitch: 1.1, module: 'phonics' });
}

/** 朗读单个拼音声母/韵母/音节（权威普通话教学发音） */
export function speakPinyin(symbol: string, options: SpeakOptions = {}): Promise<void> {
  return speak(pinyinToSpoken(symbol), { lang: 'zh-CN', rate: 0.7, pitch: 1.15, module: 'pinyin', ...options });
}

/** 朗读数字（中文） */
export function speakNumber(n: number): Promise<void> {
  return speak(String(n), { lang: 'zh-CN', rate: 0.8, pitch: 1.2, module: 'number' });
}

/**
 * 有感情朗读一首古诗：按 buildChantSegments 生成的分段逐单元播放。
 * - speak 片段用 baseRate/basePitch/baseVolume 叠加该段的微调（平仄、韵脚）；
 * - pause 片段插入停顿，实现句读分明与韵脚拖腔；
 * - onLine 在每句开始时回调，用于逐句高亮。
 * 返回可取消的控制器。
 */
export function speakChant(
  lines: ChantSegment[][],
  options: SpeakOptions & {
    /** 基础语速（会被每个片段的 rateMul 缩放） */
    baseRate?: number;
    /** 基础音高（会被每个片段的 pitchAdd 偏移） */
    basePitch?: number;
    /** 基础音量 */
    baseVolume?: number;
    /** 每句开始时回调（下标），-1 表示结束 */
    onLine?: (index: number) => void;
    /** 内容模块 key（默认古诗 poem，分模块微调） */
    module?: import('./tts/types').TtsModuleKey | string;
    /** 诗歌情绪 key（神经引擎情感曲线用） */
    moodKey?: string;
  } = {},
): SequenceController {
  const { onLine, baseRate = 0.74, basePitch = 1.1, baseVolume = 1, module = 'poem', moodKey, ...speakOpts } = options;
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const wait = (ms: number) =>
    new Promise<void>((r) => {
      timer = setTimeout(r, ms);
    });

  const done = (async () => {
    for (let i = 0; i < lines.length; i++) {
      if (cancelled) break;
      onLine?.(i);
      // 关键修复：整句合为一个 utterance 朗读，不再按平仄/韵脚切成多个片段。
      // 旧实现每段都新建 SpeechSynthesisUtterance，会重置语速音高、插入不可控
      // 间隙，造成「一顿一顿的机械拼接感」。有感情改由整句 mood 级语速/音高体现。
      //
      // spoken 是多音字纠音后的文本（还→环、见→限），页面显示仍是原文；
      // 家长可在设置里关掉纠音回到原文发音。
      const usePoly = getSettings().polyphone;
      const text = lines[i]!
        .filter((s) => s.type === 'speak')
        .map((s) => (usePoly ? s.spoken || s.text : s.text))
        .join('');
      if (text.trim()) {
        await speak(text, {
          ...speakOpts,
          rate: baseRate,
          pitch: basePitch,
          volume: baseVolume,
          module,
          moodKey,
        });
      }
      if (cancelled) break;
      // 句末停顿：依据本句最后一个停顿片段（标点）时长，保留句读分明
      const last = lines[i]![lines[i]!.length - 1];
      const endMs = last && last.type === 'pause' ? last.ms : 220;
      if (endMs > 0 && i < lines.length - 1) await wait(endMs);
    }
    if (!cancelled) onLine?.(-1);
  })();

  return {
    cancel() {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stopSpeaking();
    },
    done,
  };
}

/** 表扬场景：通用 / 汉字 / 拼音 / 数字 / 古诗 / 数学 / 连击 */
export type PraiseScene = 'general' | 'hanzi' | 'pinyin' | 'number' | 'poem' | 'math' | 'combo';
/** 鼓励场景：通用 / 汉字 / 拼音 / 数字 / 古诗 / 数学 */
export type EncourageScene = 'general' | 'hanzi' | 'pinyin' | 'number' | 'poem' | 'math';

/* ============================================================
   语音引导（A2）：页面 / 步骤切换时朗读引导语
   ------------------------------------------------------------
   - 同时受「全局静音 settings.sound」与「语音引导开关 settings.voiceGuide」约束：
     任一关闭都不朗读，避免打扰。
   - 这里用 useStore.getState() 同步读取（非 hook），可在普通函数中调用；
     Zustand 的 getState() 在循环依赖场景下也安全——只在函数体运行时取值，
     不在模块加载阶段访问。
   - 引导语短促、语速略快于跟读，避免抢内容焦点。
   ============================================================ */

/** 是否允许朗读语音引导（受静音与语音引导开关双重约束），经桥接注入 */
function voiceGuideEnabled(): boolean {
  return voiceGuideChecker ? voiceGuideChecker() : true;
}

/** 页面引导语：进入新页面时朗读 */
export function announcePage(title: string, subtitle?: string): void {
  if (!voiceGuideEnabled()) return;
  const text = subtitle ? `${title}，${subtitle}` : title;
  // 引导语略快一点，避免拖沓；不传 onEnd，打断/出错由 speak 内部兜底
  void speak(text, { lang: 'zh-CN', rate: 0.9, pitch: 1.15, module: 'ai' });
}

/** 步骤引导语：步骤切换时朗读（如"现在我们来练习写一写"） */
export function announceStep(stepLabel: string): void {
  if (!voiceGuideEnabled()) return;
  void speak(stepLabel, { lang: 'zh-CN', rate: 0.88, pitch: 1.15, module: 'ai' });
}
