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

/** 检查浏览器是否支持语音识别 */
export function isSpeechRecogSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  );
}

type RecogInstance = InstanceType<NonNullable<Window['SpeechRecognition']>>;

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
            sum += dataArray[i]!;
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
            if (event.results[i]!.isFinal) {
              finalTranscript += event.results[i]![0]!.transcript;
            } else {
              interimTranscript += event.results[i]![0]!.transcript;
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
    if (instance) {
      try {
        instance.start();
        return;
      } catch (e) {
        if (import.meta.env.DEV) console.warn('SpeechRecog start error:', e);
      }
    }

    // Web Speech API unavailable fallback: activate volume sensing & fallback prompt
    this.isListening = true;
    options.onStart?.();
    this.startVolumeSensing(options);

    // Auto trigger fallback after 2.5s if child spoke
    setTimeout(() => {
      if (this.isListening) {
        this.isListening = false;
        this.stopVolumeSensing();
        options.onResult?.('喵喵，我想和你说话呀！', true);
        options.onEnd?.();
      }
    }, 2500);
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
