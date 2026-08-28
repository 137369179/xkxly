/**
 * 系统语音引擎（Web Speech API）
 * ------------------------------------------------------------
 * 设备/系统自带的 TTS：零加载、瞬时可用、完全离线、免费。
 * 关键改进（相比旧 speakChant）：
 *   - 整句用「单个 utterance」朗读，不再按平仄/韵脚切成多个片段，
 *     避免每段重置语速音高、插入不可控间隙造成的「机械拼接感」；
 *   - 句间仅做轻顿，保留自然句读；
 *   - 支持按 voiceURI 精确选音色。
 * 局限：不接受拼音输入 → 多音字只能靠系统 G2P（heteronymControl=false）。
 */
import type { TtsEngine, TtsEngineInfo, TtsOptions, TtsPlayHandle } from './types';
import { splitSentences } from './g2p';

const synth: SpeechSynthesis | null =
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

function pickByURI(uri?: string): SpeechSynthesisVoice | undefined {
  if (!synth || !uri) return undefined;
  return synth.getVoices().find((v) => v.voiceURI === uri);
}

function bestZhVoice(): SpeechSynthesisVoice | undefined {
  if (!synth) return undefined;
  const vs = synth.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('zh'));
  if (!vs.length) return undefined;
  const pref = ['tingting', 'meijia', 'sinji', 'huihui', 'xiaoxiao', 'female', 'yaoyao'];
  return (
    vs.find((v) => pref.some((n) => v.name.toLowerCase().includes(n))) ??
    vs.find((v) => v.localService) ??
    vs[0]
  );
}

export class WebSpeechEngine implements TtsEngine {
  readonly id = 'webspeech';
  readonly name = '系统语音（Web Speech）';
  readonly kind = 'os' as const;
  readonly offline = true;
  readonly heteronymControl = false;
  readonly loadNote = '零加载，调用设备/系统自带 TTS，瞬时可用';

  private readyFlag = false;

  async init(): Promise<void> {
    if (!synth) return;
    const vs = synth.getVoices();
    if (vs.length) {
      this.readyFlag = true;
      return;
    }
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => resolve(), 1200);
      synth.addEventListener(
        'voiceschanged',
        () => {
          clearTimeout(t);
          this.readyFlag = true;
          resolve();
        },
        { once: true },
      );
    });
  }

  ready(): boolean {
    return this.readyFlag;
  }

  status(): TtsEngineInfo {
    return {
      ...this,
      available: !!synth,
      loaded: this.readyFlag,
      error: synth ? undefined : '当前浏览器/WebView 不支持 Web Speech API',
    };
  }

  async play(text: string, opts: TtsOptions, onLine?: (i: number, total: number) => void): Promise<TtsPlayHandle> {
    const sentences = splitSentences(text);
    const total = sentences.length || 1;
    let cancelled = false;
    let paused = false;
    let idx = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let resolveDone!: () => void;
    let resolvePauseWait: (() => void) | undefined;
    const done = new Promise<void>((res) => {
      resolveDone = res;
    });

    const speakOne = (s: string) =>
      new Promise<void>((res) => {
        if (!synth) {
          res();
          return;
        }
        const u = new SpeechSynthesisUtterance(s);
        u.lang = 'zh-CN';
        u.rate = opts.rate ?? 0.8;
        u.pitch = opts.pitch ?? 1.1;
        u.volume = opts.volume ?? 1;
        const v = opts.voiceURI ? pickByURI(opts.voiceURI) : bestZhVoice();
        if (v) u.voice = v;
        let ended = false;
        let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
        const end = () => {
          if (ended) return;
          ended = true;
          clearTimeout(fallbackTimer);
          res();
        };
        u.onend = end;
        u.onerror = end;
        try {
          synth.resume();
        } catch {
          /* noop */
        }
        synth.speak(u);
        // 兜底超时：避免极端情况下 Promise 永久挂起
        const est = Math.max(2000, s.length * 420 + 1500);
        fallbackTimer = setTimeout(() => {
          if (!ended) end();
        }, est);
      });

    const loop = async () => {
      for (idx = 0; idx < total; idx++) {
        if (cancelled) break;
        onLine?.(idx, total);
        if (paused && !cancelled) {
          await new Promise<void>((resolve) => {
            resolvePauseWait = resolve;
          });
        }
        if (cancelled) break;
        await speakOne(sentences[idx] ?? '');
        if (cancelled) break;
        await new Promise<void>((r) => {
          timer = setTimeout(r, idx < total - 1 ? 220 : 0);
        });
      }
      onLine?.(-1, total);
      resolveDone();
    };
    void loop();

    return {
      stop() {
        cancelled = true;
        if (timer) clearTimeout(timer);
        if (resolvePauseWait) { resolvePauseWait(); resolvePauseWait = undefined; }
        try {
          synth?.cancel();
        } catch {
          /* noop */
        }
        resolveDone();
      },
      pause() {
        paused = true;
        try {
          synth?.pause();
        } catch {
          /* noop */
        }
      },
      resume() {
        paused = false;
        if (resolvePauseWait) { resolvePauseWait(); resolvePauseWait = undefined; }
        try {
          synth?.resume();
        } catch {
          /* noop */
        }
      },
      get state() {
        return cancelled ? 'stopped' : paused ? 'paused' : 'playing';
      },
      get progress() {
        return total ? idx / total : 0;
      },
      done,
    };
  }
}
