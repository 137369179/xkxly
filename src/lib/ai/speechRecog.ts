/**
 * Web Speech Recognition (STT 语音识别) 封装
 * 面向 3-6 岁儿童：支持长按/点击说话、实时语音转文字、静音检测、麦克风感知与双重优雅降级。
 */

export interface SpeechRecogOptions {
  lang?: string;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
}

/**
 * 严格能力检测：是否具备【真正的语音识别】能力（Safari 只有麦克风、无 SpeechRecognition，
 * 旧实现因 getUserMedia 存在而误报 true，导致语音按钮"看似可用实则假"）。
 * 需要麦克风但不需要识别能力的场景请用 isMicAvailable()。
 */
export function isSpeechRecogSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

/** 仅检测麦克风可用性（与识别能力解耦，Safari 也支持） */
export function isMicAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

type RecogInstance = InstanceType<NonNullable<Window['SpeechRecognition']>>;

/**
 * 获取当前浏览器可用的 SpeechRecognition 构造器（无则 null）。
 * 注意：Chrome/Edge 的识别走 Google 语音服务，国内网络不可达时会「点击后立即失败/
 * 静默结束」，因此调用方必须准备「大声朗读即通过」的降级路径。
 */
export function getSpeechRecognitionCtor(): (new () => RecogInstance) | null {
  if (typeof window === 'undefined') return null;
  return (window.SpeechRecognition || window.webkitSpeechRecognition || null) as (new () => RecogInstance) | null;
}

export type MicPermission = 'granted' | 'denied' | 'unsupported';

/**
 * 预请求麦克风硬件权限（在 start() 之前调用，可提前捕获「拒绝授权」并给出友好提示，
 * 而不是等 onerror('not-allowed') 才处理；同时确保 start 时麦克风已就绪）。
 */
export async function requestMicPermission(): Promise<MicPermission> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return 'unsupported';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return 'granted';
  } catch {
    return 'denied';
  }
}

/** 识别失败原因归类（供 UI 选择友好提示 / 自动降级） */
export type RecogFailure =
  | 'no-speech' // 没听到声音（真·长时间静默）
  | 'denied' // 麦克风权限被拒
  | 'no-mic' // 无可用麦克风
  | 'service-unavailable' // 识别服务不可用（网络/服务端问题，如 Google 服务被墙）
  | 'unknown';

export function classifyRecogError(errCode: string): RecogFailure {
  switch (errCode) {
    case 'no-speech':
      return 'no-speech';
    case 'not-allowed':
      return 'denied';
    case 'audio-capture':
      return 'no-mic';
    case 'network':
    case 'service-not-allowed':
    case 'language-not-supported':
      return 'service-unavailable';
    default:
      return 'unknown';
  }
}

/** 「大声朗读即通过」降级模式的音量检测句柄 */
export interface VoiceDetector {
  /** 检测完成：检测到明显人声 → true；超时/被主动 stop → false */
  promise: Promise<boolean>;
  /** 立即停止并释放麦克风/音频上下文，promise 会 resolve(false)。幂等，可安全重复调用 */
  stop: () => void;
}

/**
 * 监听麦克风音量，检测孩子是否真的开口朗读（「大声朗读即通过」降级模式的判定）。
 * 返回 { promise, stop }：检测到明显人声 → true；超时无声音 → false。
 * 结束（无论成功/超时/主动 stop）都会自动释放麦克风与音频上下文。
 * 浏览器不支持时返回恒 false 且 stop 无操作的句柄。
 */
export function detectVoiceOnce(
  timeoutMs = 20_000,
  onLevel?: (level: number) => void,
): VoiceDetector {
  const notSupported: VoiceDetector = { promise: Promise.resolve(false), stop: () => {} };
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return notSupported;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return notSupported;

  let resolve!: (v: boolean) => void;
  const done = new Promise<boolean>((r) => { resolve = r; });

  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let cancelled = false;

  const cleanup = () => {
    if (cancelled) return;
    cancelled = true;
    clearTimeout(timer);
    try { stream?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { void ctx?.close(); } catch { /* noop */ }
  };

  const timer = setTimeout(() => {
    cleanup();
    resolve(false);
  }, timeoutMs);

  const stop = () => {
    cleanup();
    resolve(false);
  };

  (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      cleanup();
      resolve(false);
      return;
    }
    ctx = new AudioCtx();
    // A(高)：iOS Safari 的 AudioContext 创建即 suspended，必须 resume 才能产出音频数据；
    // 此处 ctx 在 await getUserMedia 之后创建，用户手势窗口通常已关闭，best-effort resume，
    // 失败则音量恒为 0 → 走超时分支（报"没有听到声音"），绝不挂起。
    void ctx.resume().catch(() => {});
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let loudFrames = 0;
    const check = () => {
      if (cancelled) return;
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] ?? 0;
      const avg = sum / data.length;
      onLevel?.(avg);
      // 连续 2 帧音量达标才判定为「开口了」，避免环境噪声误判
      if (avg > 25) {
        loudFrames++;
        if (loudFrames >= 2) {
          cleanup();
          resolve(true);
          return;
        }
      } else {
        loudFrames = Math.max(0, loudFrames - 1);
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  })();

  return { promise: done, stop };
}

class SpeechRecogManager {
  private recognition: RecogInstance | null = null;
  private isListening = false;
  private audioStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private hasAudioDetected = false;

  /** 请求麦克风硬件权限 */
  public async requestMicPermission(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Keep stream active briefly or stop tracks
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  /** 监测音频输入音量（Voice Activity Detection 兜底） */
  private startVolumeSensing(_options: SpeechRecogOptions) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    this.hasAudioDetected = false;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.audioStream = stream;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        this.audioCtx = new AudioCtx();
        const source = this.audioCtx.createMediaStreamSource(stream);
        const analyser = this.audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!this.isListening) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] ?? 0;
          }
          const average = sum / dataArray.length;
          if (average > 15) {
            this.hasAudioDetected = true;
          }
          if (this.isListening) {
            requestAnimationFrame(checkVolume);
          }
        };
        checkVolume();
      })
      .catch(() => {
        /* User denied mic or not available */
      });
  }

  private stopVolumeSensing() {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((t) => t.stop());
      this.audioStream = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        /* noop */
      }
      this.audioCtx = null;
    }
  }

  public init(options: SpeechRecogOptions = {}) {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = options.interimResults ?? true;
        this.recognition.lang = options.lang || 'zh-CN';

        this.recognition.onstart = () => {
          this.isListening = true;
          this.startVolumeSensing(options);
          options.onStart?.();
        };

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i]?.isFinal) {
              finalTranscript += event.results[i]?.[0]?.transcript ?? '';
            } else {
              interimTranscript += event.results[i]?.[0]?.transcript ?? '';
            }
          }

          const text = (finalTranscript || interimTranscript).trim();
          const isFinal = !!finalTranscript;
          if (text) {
            this.hasAudioDetected = true;
            options.onResult?.(text, isFinal);
          }
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          this.isListening = false;
          this.stopVolumeSensing();
          let errMsg = '语音识别遇到一点小问题';
          if (event.error === 'no-speech') {
            errMsg = '没有听到声音哦，请试着离麦克风近一点～';
          } else if (event.error === 'audio-capture') {
            errMsg = '未检测到麦克风，请检查设备设置';
          } else if (event.error === 'not-allowed') {
            errMsg = '麦克风权限被拒绝，请在浏览器中开启权限';
          }

          // 如果检测到孩子确实对着麦克风说话了，但原生服务没变文字（如某些网络环境下无连接）
          if (this.hasAudioDetected) {
            options.onResult?.('喵喵，我想和你说话呀！', true);
            return;
          }

          options.onError?.(errMsg);
        };

        this.recognition.onend = () => {
          const wereWeListening = this.isListening;
          const hadAudio = this.hasAudioDetected;
          this.isListening = false;
          this.stopVolumeSensing();

          if (wereWeListening && hadAudio) {
            // Guarantee fallback
            options.onResult?.('喵喵，我想和你说话呀！', true);
          }

          options.onEnd?.();
        };

        return this.recognition;
      } catch {
        this.recognition = null;
      }
    }

    return null;
  }

  public async start(options: SpeechRecogOptions = {}) {
    if (this.isListening) {
      this.stop();
    }

    // Pre-request hardware mic permission
    await this.requestMicPermission();

    const instance = this.init(options);
    if (!instance) {
      // C：Web Speech API 不可用（Safari 等）→ 不再产生 2.5s 假结果，
      // 直接提示用文字输入（调用方已用严格能力检测拦截，这里是最后一道兜底）。
      this.isListening = false;
      options.onError?.('当前浏览器不支持语音识别，请用文字输入～');
      options.onEnd?.();
      return;
    }
    try {
      instance.start();
      return;
    } catch (e) {
      if (import.meta.env.DEV) console.warn('SpeechRecog start error:', e);
    }

    // start 抛异常（状态冲突等）→ 没有 onerror/onend 会触发，直接提示用文字输入
    this.isListening = false;
    options.onError?.('语音识别暂时不可用，请用文字输入～');
    options.onEnd?.();
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        if (import.meta.env.DEV) console.warn('SpeechRecog stop error:', e);
      }
    }
    this.isListening = false;
    this.stopVolumeSensing();
  }

  public getActive() {
    return this.isListening;
  }
}

export const speechRecog = new SpeechRecogManager();
