/**
 * TTS 引擎抽象层 · 类型定义
 * ------------------------------------------------------------
 * 目标：把「朗读」与具体引擎解耦。无论是系统语音（Web Speech）、
 * 神经网络本地模型（Kokoro / Piper），都实现同一 TtsEngine 接口，
 * 上层（诗词范读、字母发音、诊断页）只依赖接口，切换引擎对调用方透明。
 */

export type TtsEngineKind = 'os' | 'neural-local' | 'cloud';

export interface TtsOptions {
  /** 语速 0.5–2，1=正常（幼儿场景通常 <1 更慢） */
  rate?: number;
  /** 音高 0–2，1=正常 */
  pitch?: number;
  /** 音量 0–1 */
  volume?: number;
  /** 情绪基调 key（如 homesick / frontier），用于驱动 rate/pitch 预设 */
  emotion?: string;
  /** 具体音色（系统引擎按 voiceURI 选；神经网络引擎按 voice 名选） */
  voiceURI?: string;
  /**
   * 神经引擎「情感化语速曲线」（P9 · ②）：传入后 Kokoro 逐段以不同 speed 生成
   * 并拼接成一条音频，实现古诗/故事的抑扬顿挫与句末拖腔。
   * 系统语音（Web Speech）不支持分段，传了也忽略。
   */
  segments?: NeuralSegment[];
}

/** 神经引擎情感曲线的一段：单独以 speed 生成，段末留 pauseMs 静音 */
export interface NeuralSegment {
  /** 该段文本 */
  text: string;
  /** 相对请求的语速倍率（<1 更慢，制造拖腔/舒缓） */
  speed?: number;
  /** 段末静音（毫秒），用于句读呼吸 */
  pauseMs?: number;
}

export interface TtsPlayHandle {
  stop(): void;
  pause(): void;
  resume(): void;
  /** 跳转到 0..1 进度（神经网络引擎支持；系统语音为最佳努力） */
  seek?(fraction: number): void;
  readonly state: 'playing' | 'paused' | 'stopped';
  /** 0..1 播放进度 */
  readonly progress: number;
  done: Promise<void>;
}

/** 供 UI 展示的引擎静态信息（不含运行时状态） */
export interface TtsEngineStatic {
  id: string;
  name: string;
  kind: TtsEngineKind;
  /** 是否可完全离线运行 */
  offline: boolean;
  /** 能否按拼音精确控制多音字 */
  heteronymControl: boolean;
  /** 首次加载成本描述（模型大小 / 是否需联网） */
  loadNote: string;
}

export interface TtsEngineInfo extends TtsEngineStatic {
  available: boolean;
  loaded: boolean;
  error?: string;
}

/** 可独立微调朗读的内容模块 */
export type TtsModuleKey = 'poem' | 'quiz' | 'praise' | 'number' | 'letter' | 'story' | 'ai';

/** 单个模块的朗读微调：作为「倍率 / 偏移」叠加在全局偏好之上 */
export interface TtsModulePreset {
  /** 语速倍率，1=跟随全局，0.7–1.3（<1 更慢，留给幼儿跟读） */
  rateMul?: number;
  /** 音高微调，0=跟随全局，±0.2 */
  pitchDelta?: number;
}

export type TtsModulePresets = Partial<Record<TtsModuleKey, TtsModulePreset>>;

/** 家长「保存为我的场景」的快照（P7）：完整记录当前全局 + 各模块微调，可原样还原 */
export interface TtsCustomScene {
  /** 槽位编号（1..N），同一套设置可存多套，互不复盖 */
  slot: number;
  name: string;
  emoji: string;
  rate: number;
  pitch: number;
  volume: number;
  modulePresets: TtsModulePresets;
}

/** 一键套用的朗读场景预设包（P6）：同时设定全局语速/音高/音量 + 全模块统一微调 */
export interface TtsScenePreset {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** 全局语速目标（直接写入 settings.rate） */
  rate: number;
  /** 全局音高目标 */
  pitch: number;
  /** 全局音量目标 */
  volume: number;
  /** 套用到所有内容模块的语速倍率（1=不额外微调） */
  moduleRateMul: number;
  /** 套用到所有内容模块的音高偏移（0=不额外微调） */
  modulePitchDelta: number;
  /** 联动的中文神经音色（开启神经网络朗读时自动切换，如睡前→温柔女声） */
  neuralVoice?: string;
  /** 套用该场景时是否自动启用神经网络朗读（如睡前，用更柔的自然音色） */
  preferNeural?: boolean;
}

export interface TtsEngine extends TtsEngineStatic {
  /** 首次使用前准备（系统语音等待 voices；神经网络下载/初始化模型） */
  init(): Promise<void>;
  /** 是否已就绪可立即播放 */
  ready(): boolean;
  /** 引擎运行时状态 */
  status(): TtsEngineInfo;
  /** 播放文本；返回可控句柄。onLine 在每句开始时回调（i, total），-1 表示结束 */
  play(text: string, opts: TtsOptions, onLine?: (i: number, total: number) => void): Promise<TtsPlayHandle>;
}

/** 用户级语音设置（localStorage 持久化） */
export interface TtsSettings {
  /** 当前主引擎 id */
  engine: string;
  rate: number;
  pitch: number;
  volume: number;
  emotion: string;
  /** 系统语音具体音色 URI（空=自动优选） */
  voiceURI: string;
  /** 多音字纠音：按标注拼音替换同音字送进 TTS（仅影响发音，不改显示） */
  polyphone: boolean;
  /** 分模块朗读微调（古诗/识字/鼓励/数字/字母/故事/讲解），叠加在全局偏好之上 */
  modulePresets: TtsModulePresets;
  /** 家长保存的专属场景槽位（P7 / P9·④ 多套）；空数组表示尚未保存 */
  customScenes: TtsCustomScene[];
  /* —— 微软超拟真 Neural 真人音色配置 —— */
  /** Edge 超拟真 Neural 音色 (如 zh-CN-XiaoxiaoNeural / zh-CN-YunxiNeural / en-US-AnaNeural) */
  edgeVoice: string;
  /* —— 神经网络引擎配置 —— */
  /** Kokoro 模型地址（ONNX 目录 URL，需自托管到可访问的 CDN/R2） */
  kokoroModelUrl: string;
  /** kokoro-js 库地址（ESM 构建，建议自托管） */
  kokoroLibUrl: string;
  /** Kokoro 音色名（如 af_heart / 中文模型对应的 voice key） */
  kokoroVoice: string;
  kokoroDtype: 'q4f16' | 'fp32' | 'fp16';
  device: 'webgpu' | 'wasm';
}
