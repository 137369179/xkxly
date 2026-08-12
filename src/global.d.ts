// 全局类型补充：为 TS DOM 库未内置的浏览器厂商前缀 API 提供最小声明，
// 以收敛 `as any` 强转（P3-3）。仅声明本项目实际用到的成员。
export {};

declare global {
  /** Web Speech Recognition 事件——仅声明项目实际访问的成员，避免引入完整 SDK 类型 */
  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
  }

  interface Window {
    SpeechRecognition?: new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      continuous: boolean;
      onresult: ((e: SpeechRecognitionEvent) => void) | null;
      onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
      onend: (() => void) | null;
      onstart: (() => void) | null;
      start(): void;
      stop(): void;
      abort(): void;
    };
    webkitSpeechRecognition?: Window['SpeechRecognition'];
    webkitAudioContext?: typeof AudioContext;
    /** beforeinstallprompt 事件在 window 上触发，类型为 BeforeInstallPromptEvent */
    addEventListener<K extends keyof WindowEventMap>(
      type: K,
      listener: (ev: WindowEventMap[K]) => void,
      options?: boolean | AddEventListenerOptions,
    ): void;
  }
}
