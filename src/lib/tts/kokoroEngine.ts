/**
 * 神经网络语音引擎（Kokoro / Kokoro-82M 系列，浏览器本地推理）
 * ------------------------------------------------------------
 * 通过 ONNX Runtime Web 在浏览器内本地合成语音：自然度显著高于系统语音，
 * 完全离线、免费、可控音高/语速，且（中文模型 + 拼音→音素映射就绪后）
 * 可精确控制多音字。模型较大（约 80–150MB），首次按需加载并缓存，
 * 之后可离线复读。
 *
 * 架构要点：
 *   - 引擎库（kokoro-js）与模型均「运行时动态加载」，不进主包，保持首页轻量；
 *   - 生成的是 Float32 音频，用 Web Audio（AudioContext）播放，支持可靠
 *     的暂停/继续/跳转（比 Web Speech 的 pause/resume 稳得多）；
 *   - 任何加载/推理异常都向上抛出，由 TtsManager 自动降级到系统语音。
 *
 * 注意：基础 Kokoro-82M 仅含英文音色；中文需使用中文模型（社区微调）。
 * P1-5 已落地拼音→音素映射（pinyinG2p.ts），中文文本自动转拼音送入引擎，
 * 精确控制多音字读音。
 */
import type { TtsEngine, TtsEngineInfo, TtsOptions, TtsPlayHandle } from './types';
import { textToPinyin } from './pinyinG2p';

/** 允许动态加载 kokoro-js 的受信 CDN 域名（P1-2 安全白名单） */
const KOKORO_LIB_ALLOWLIST = ['cdn.jsdelivr.net', 'huggingface.co', 'unpkg.com'];

/**
 * 校验 kokoro-js 动态加载地址，防止配置项被篡改为任意远程 JS 造成代码注入。
 * - 必须是 https 协议
 * - 域名必须在白名单内（dev 环境额外允许 localhost / 127.0.0.1 便于本地调试）
 */
function assertSafeLibUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('kokoro-js 库地址格式非法');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('kokoro-js 库地址必须为 https');
  }
  const host = parsed.hostname;
  const devLocal = import.meta.env.DEV && (host === 'localhost' || host === '127.0.0.1');
  if (!devLocal && !KOKORO_LIB_ALLOWLIST.includes(host)) {
    throw new Error(`kokoro-js 库地址域名不被信任：${host}`);
  }
}

interface KokoroTTSInstance {
  generate(text: string, opts: { voice: string; speed?: number }): Promise<{
    audio: Float32Array;
    sampling_rate: number;
  }>;
}

/** kokoro-js 动态加载模块的边界类型（收敛 `as any`，P3-3） */
interface KokoroLibModule {
  KokoroTTS: {
    from_pretrained: (
      modelUrl: string,
      opts: { dtype: string; device: string },
    ) => Promise<KokoroTTSInstance>;
  };
  default?: KokoroLibModule;
}

export class KokoroEngine implements TtsEngine {
  readonly id = 'kokoro';
  readonly name = '神经网络语音（Kokoro）';
  readonly kind = 'neural-local' as const;
  readonly offline = true;
  // P1-5：拼音→音素映射已落地，支持按拼音精确控制多音字读音
  readonly heteronymControl = true;
  readonly loadNote = '首次加载模型（约 80–150MB），缓存后可离线复读';

  private tts: KokoroTTSInstance | null = null;
  private loading: Promise<void> | null = null;
  private loadError: string | undefined;

  private ctx: AudioContext | null = null;
  private src: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private startedAt = 0;
  private offset = 0;
  private playing = false;
  private stopped = false;
  private suppressEnd = false;
  /** 情感曲线拼接用的采样率（首段生成后确定） */
  private curveSr = 0;

  private modelUrl: string;
  private voice: string;
  private dtype: string;
  private devicePref: 'webgpu' | 'wasm';
  private libUrl: string;

  constructor(
    modelUrl: string,
    voice: string,
    dtype: string,
    devicePref: 'webgpu' | 'wasm',
    libUrl: string,
  ) {
    this.modelUrl = modelUrl;
    this.voice = voice;
    this.dtype = dtype;
    this.devicePref = devicePref;
    this.libUrl = libUrl;
  }

  async init(): Promise<void> {
    if (this.tts || this.loading) return this.loading ?? Promise.resolve();
    this.loading = this.doLoad();
    return this.loading;
  }

  private async doLoad(): Promise<void> {
    try {
      if (!this.libUrl) throw new Error('未配置 kokoro-js 库地址');
      assertSafeLibUrl(this.libUrl);
      const mod = (await import(/* @vite-ignore */ this.libUrl)) as KokoroLibModule;
      const KokoroTTS = mod?.KokoroTTS ?? mod?.default?.KokoroTTS ?? mod?.default;
      if (!KokoroTTS) throw new Error('kokoro-js 未导出 KokoroTTS');
      const device = this.devicePref === 'webgpu' && 'gpu' in navigator ? 'webgpu' : 'wasm';
      this.tts = await KokoroTTS.from_pretrained(this.modelUrl, { dtype: this.dtype, device });
      this.loadError = undefined;
    } catch (e) {
      this.loadError = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  ready(): boolean {
    return !!this.tts;
  }

  status(): TtsEngineInfo {
    return { ...this, available: true, loaded: this.ready(), error: this.loadError };
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  private toBuffer(float32: Float32Array, sr: number): AudioBuffer {
    const ctx = this.ensureCtx();
    const buf = ctx.createBuffer(1, float32.length, sr);
    buf.getChannelData(0).set(float32);
    return buf;
  }

  async play(text: string, opts: TtsOptions, _onLine?: (i: number, total: number) => void): Promise<TtsPlayHandle> {
    if (!this.tts) await this.init();
    if (!this.tts) throw new Error('Kokoro 未加载');

    // P1-5：拼音直接输入。Kokoro 中文模型可接受拼音串（如 ni3 hao3），
    // 精确控制多音字读音，不依赖引擎自带 G2P 猜测。
    const inputText = await this.toPinyinIfChinese(text);

    // 情感化分段曲线（P9 · ②）：逐段以不同 speed 生成，段末补静音，拼接成一条音频。
    // 古诗/故事因此有了抑扬顿挫、句末拖腔，而不是全程一个死速度。
    if (opts.segments && opts.segments.length > 0) {
      this.buffer = await this.generateCurve(opts);
      return this.startPlayback(opts);
    }

    const speed = opts.rate ? Math.min(2, Math.max(0.3, opts.rate)) : 1;
    const audio = await this.tts.generate(inputText, { voice: this.voice, speed });
    this.buffer = this.toBuffer(audio.audio, audio.sampling_rate);
    return this.startPlayback(opts);
  }

  /**
   * P1-5：中文文本 → 拼音串。Kokoro 中文社区模型接受拼音直接输入，
   * 多音字按 pinyin-pro 词库自动消歧，比引擎自带 G2P 更准。
   * 非中文文本（英文/纯数字）原样返回。
   */
  private async toPinyinIfChinese(text: string): Promise<string> {
    if (!text || !/[\u4e00-\u9fff]/.test(text)) return text;
    try {
      return await textToPinyin(text);
    } catch {
      // pinyin-pro 异常时降级到原文
      return text;
    }
  }

  /** 按情感曲线逐段生成并拼接为一条 AudioBuffer（含段末静音） */
  private async generateCurve(opts: TtsOptions): Promise<AudioBuffer> {
    const ctx = this.ensureCtx();
    const segs = opts.segments ?? [];
    const chunks: Float32Array[] = [];

    for (const seg of segs) {
      const t = (seg.text || '').trim();
      if (t) {
        // P1-5：分段文本也走拼音转换
        const segInput = await this.toPinyinIfChinese(t);
        const speed = Math.min(2, Math.max(0.3, (seg.speed ?? 1) * (opts.rate ?? 1)));
        const out = await this.tts!.generate(segInput, { voice: this.voice, speed });
        if (chunks.length === 0) {
          // 首段确定采样率（Kokoro 固定 24k），后续段必须同率才能拼接
          this.curveSr = out.sampling_rate;
        }
        chunks.push(out.audio);
      }
      // 段末静音（句读呼吸）：按 pauseMs 塞入静音样本
      const pause = seg.pauseMs ?? 0;
      if (pause > 0) {
        const sr = this.curveSr || 24000;
        chunks.push(new Float32Array(Math.round((pause / 1000) * sr)));
      }
    }

    const sr = this.curveSr || 24000;
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const merged = ctx.createBuffer(1, Math.max(1, total), sr);
    const data = merged.getChannelData(0);
    let off = 0;
    for (const c of chunks) {
      data.set(c, off);
      off += c.length;
    }
    return merged;
  }

  private startPlayback(opts: TtsOptions): TtsPlayHandle {
    const ctx = this.ensureCtx();
    const total = this.buffer!.duration;
    this.playing = true;
    this.stopped = false;
    this.offset = 0;

    let resolveDone!: () => void;
    const done = new Promise<void>((res) => {
      resolveDone = res;
    });

    const playFrom = (startSec: number) => {
      if (!this.buffer) return;
      const src = ctx.createBufferSource();
      src.buffer = this.buffer;
      const gain = ctx.createGain();
      gain.gain.value = opts.volume ?? 1;
      src.connect(gain).connect(ctx.destination);
      this.src = src;
      this.startedAt = ctx.currentTime;
      this.offset = startSec;
      src.onended = () => {
        if (this.suppressEnd) {
          this.suppressEnd = false;
          return;
        }
        this.playing = false;
        resolveDone();
      };
      src.start(0, startSec);
    };

    if (ctx.state === 'suspended') void ctx.resume();
    playFrom(0);

    const stopInternal = () => {
      this.stopped = true;
      this.playing = false;
      this.suppressEnd = true;
      try {
        this.src?.stop();
      } catch {
        /* noop */
      }
      this.src = null;
      resolveDone();
    };

    // 返回对象的方法/取值器需捕获外层 player 实例；取值器(getter)无法用箭头函数捕获 this，必须保留别名
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      stop: stopInternal,
      pause() {
        if (!self.src) return;
        const elapsed = ctx.currentTime - self.startedAt;
        self.offset = Math.min(total, self.offset + elapsed);
        self.suppressEnd = true;
        try {
          self.src.stop();
        } catch {
          /* noop */
        }
        self.src = null;
        self.playing = false;
      },
      resume() {
        if (self.playing || self.stopped) return;
        self.playing = true;
        if (ctx.state === 'suspended') void ctx.resume();
        playFrom(self.offset);
      },
      seek(fraction: number) {
        const f = Math.min(1, Math.max(0, fraction));
        self.offset = f * total;
        self.suppressEnd = true;
        if (self.src) {
          try {
            self.src.stop();
          } catch {
            /* noop */
          }
          self.src = null;
        }
        if (self.playing) playFrom(self.offset);
      },
      get state() {
        return self.stopped ? 'stopped' : self.playing ? 'playing' : 'paused';
      },
      get progress() {
        return total ? self.offset / total : 0;
      },
      done,
    };
  }

  /** 释放资源：关闭 AudioContext，防止移动设备电池消耗 */
  dispose(): void {
    if (this.src) {
      try {
        this.src.stop();
      } catch {
        /* noop */
      }
      this.src = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {/* noop */});
      this.ctx = null;
    }
    this.buffer = null;
    this.tts = null;
    this.loading = null;
  }
}
