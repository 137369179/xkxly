/**
 * speech 轻量核心（speech.ts 拆分 · Part B）
 * ------------------------------------------------------------------
 * 职责：只承载「朗读调度与停止」中**不依赖任何 TTS 引擎**的部分：
 *   - SpeechSynthesis 句柄与能力探测
 *   - 优先级队列 / 当前朗读状态（pendingQueue / currentPriority / currentUtterance）
 *   - 优先级常量与默认语速音高
 *   - store 桥接（registerTtsBridge / pushTtsState）
 *   - stopSpeaking / clearPendingQueue
 *   - 引擎 stop 回调注册（registerStopAction）
 *
 * 设计要点：
 *   1. **零引擎依赖**：本模块绝不 import realVoice / edgeNeuralTts / kokoro 等，
 *      保证主包引用它不会把整套 TTS 引擎拖进首屏。
 *   2. **单一状态源**：speech.ts（门面）import 本模块共享同一份队列/优先级状态，
 *      杜绝「各自复制一份状态」导致的停止失效。
 *   3. **stopSpeaking 兜底**：即使 speech.ts 尚未加载（引擎未注册），本模块也能
 *      通过 synth.cancel() 停止系统语音，行为不会比拆分前更差。
 */

/** 朗读状态上报（UI 订阅用），由 store 层经 registerTtsBridge 注入 */
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

/** 由 store 层在初始化时调用，把 TTS 状态推送与语音引导开关判断接回全局 store */
export function registerTtsBridge(reporter: TtsStateReporter, checker: VoiceGuideChecker): void {
  ttsStateReporter = reporter;
  voiceGuideChecker = checker;
}

/** 推送朗读状态到全局 store（UI 订阅用） */
export function pushTtsState(isSpeaking: boolean, snippet = '', module = ''): void {
  ttsStateReporter?.({
    isSpeaking,
    snippet: snippet ? snippet.slice(0, 20) : '',
    startedAt: isSpeaking ? Date.now() : 0,
    module,
  });
}

/** 是否允许朗读语音引导（受静音与语音引导开关双重约束） */
export function voiceGuideEnabled(): boolean {
  return voiceGuideChecker ? voiceGuideChecker() : true;
}

/* ------------------------------------------------------------------ */
/* SpeechSynthesis 句柄（轻量，不携带任何引擎）                        */
/* ------------------------------------------------------------------ */
const synth: SpeechSynthesis | null =
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

export const speechSupported = !!synth;

export { synth };

/* ------------------------------------------------------------------ */
/* 优先级调度（P2-7/P2-8）：常量 + 当前状态 + 队列                      */
/* ------------------------------------------------------------------ */
/** 朗读优先级：数值越大越优先；高优先级会打断当前低优先级朗读 */
export type SpeakPriority = 'praise' | 'quiz' | 'poem' | 'story' | 'general';
export const PRIORITY_RANK: Record<SpeakPriority, number> = {
  praise: 5, // 表扬/鼓励语最高，孩子答对瞬间立即反馈
  quiz: 4, // 答题反馈次之
  poem: 3, // 古诗范读
  story: 2, // 故事/讲解
  general: 1, // 一般朗读最低
};

/** 把模块 key 推断为优先级 */
export function moduleToPriority(module?: string): SpeakPriority {
  if (module === 'praise') return 'praise';
  if (module === 'quiz') return 'quiz';
  if (module === 'poem') return 'poem';
  if (module === 'story' || module === 'ai') return 'story';
  return 'general';
}

/** 默认中文语速（按声优） */
export function defaultZhRate(teacher: string): number {
  if (teacher === 'xiaoxiao') return 0.92;
  if (teacher === 'yunxi') return 0.9;
  return 0.88;
}

/** 默认中文音调（按声优） */
export function defaultZhPitch(teacher: string): number {
  if (teacher === 'xiaoxiao') return 1.25;
  if (teacher === 'yunxi') return 0.95;
  return 1.05;
}

export interface QueueItem {
  text: string;
  options: unknown;
  priority: SpeakPriority;
  resolve: () => void;
}

/** 当前正在朗读项的优先级（用于判断新请求是否可打断） */
let currentPriority: SpeakPriority | null = null;
/** 排队等待的低优先级朗读（FIFO，仅在当前朗读结束后才会处理） */
const pendingQueue: QueueItem[] = [];

/** 当前正在播放的 utterance（用于停止时同步清空引用） */
let currentUtterance: SpeechSynthesisUtterance | null = null;

/** 供 speech.ts 读写当前朗读状态（门面与原实现同状态，避免分裂） */
export const speechState = {
  get currentPriority() {
    return currentPriority;
  },
  set currentPriority(v: SpeakPriority | null) {
    currentPriority = v;
  },
  get currentUtterance() {
    return currentUtterance;
  },
  set currentUtterance(v: SpeechSynthesisUtterance | null) {
    currentUtterance = v;
  },
  get pendingQueue() {
    return pendingQueue;
  },
};

/* ------------------------------------------------------------------ */
/* 引擎 stop 回调注册：TTS 引擎在 speech.ts 加载时把自己的停止逻辑挂进来 */
/* ------------------------------------------------------------------ */
type StopAction = () => void;
const stopActions: StopAction[] = [];

/** 注册一个引擎级停止动作（如 stopRealVoice / stopEdgeNeuralAudio） */
export function registerStopAction(fn: StopAction): void {
  if (typeof fn === 'function' && !stopActions.includes(fn)) stopActions.push(fn);
}

/** 立刻停止所有朗读，并清空排队项 */
export function stopSpeaking(): void {
  // 清空等待队列，避免停止后又被队列里的项触发
  while (pendingQueue.length) {
    const item = pendingQueue.shift();
    item?.resolve();
  }
  currentPriority = null;
  currentUtterance = null;
  // 调用已注册的引擎停止动作（speech.ts 加载后为 realVoice / edgeNeural）
  for (const action of stopActions) {
    try {
      action();
    } catch {
      /* 单个引擎停止失败不阻断整体停止 */
    }
  }
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
    const item = pendingQueue.shift();
    item?.resolve();
    n++;
  }
  return n;
}
