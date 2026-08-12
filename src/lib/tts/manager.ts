/**
 * TTS 总控（引擎选择 / 设置持久化 / 自动降级 / 诊断）
 * ------------------------------------------------------------
 * 上层只与 TtsManager 打交道：
 *   - 切换引擎（系统语音 / 神经网络）对调用方透明；
 *   - 设置（音色/语速/音高/音量/情绪）存 localStorage，跨会话保留；
 *   - play() 优先用当前引擎，失败自动降级到系统语音，保证「永远能出声」；
 *   - getStatus() 暴露 WebGPU 支持、可用音色数、各引擎加载状态，供诊断页展示。
 */
import type { TtsEngine, TtsEngineInfo, TtsOptions, TtsSettings, TtsPlayHandle } from './types';
import { WebSpeechEngine } from './webSpeechEngine';
// 仅引入类型，编译期擦除，不把 Kokoro 引擎（及其依赖的 pinyin-pro 词典）
// 拖入首屏主包。实际实例在 ensureEngine('kokoro') 内按需动态加载。
import type { KokoroEngine } from './kokoroEngine';
import {
  DEFAULT_SETTINGS,
  getSettings,
  subscribeSettings,
  updateSettings as writeSettings,
} from './settings';

// 设置已下沉到 ./settings（speech.ts 也依赖它），这里保留同名导出以兼容既有引用
export { DEFAULT_SETTINGS };
export { getSettings as loadSettings } from './settings';

export class TtsManager {
  private ws = new WebSpeechEngine();
  private kokoro: KokoroEngine | null = null;

  private get settings(): TtsSettings {
    return getSettings();
  }

  getSettings(): TtsSettings {
    return getSettings();
  }

  updateSettings(patch: Partial<TtsSettings>): void {
    // 改动 Kokoro 相关配置后，已实例化的引擎参数就失效了，丢弃重建
    const reinit =
      patch.kokoroModelUrl !== undefined ||
      patch.kokoroVoice !== undefined ||
      patch.kokoroDtype !== undefined ||
      patch.kokoroLibUrl !== undefined ||
      patch.device !== undefined;
    writeSettings(patch);
    if (reinit) this.kokoro = null;
  }

  subscribe(fn: () => void): () => void {
    return subscribeSettings(fn);
  }

  webgpu(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  listZhVoices(): { name: string; uri: string; local: boolean }[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    return window.speechSynthesis
      .getVoices()
      .filter((v) => v.lang?.toLowerCase().startsWith('zh'))
      .map((v) => ({ name: v.name, uri: v.voiceURI, local: !!v.localService }));
  }

  engines(): TtsEngine[] {
    const list: TtsEngine[] = [this.ws];
    if (this.kokoro) list.push(this.kokoro);
    return list;
  }

  getKokoro(): KokoroEngine | null {
    return this.kokoro;
  }

  /** 确保指定引擎已加载（神经网络引擎首次触发下载） */
  async ensureEngine(id: string): Promise<TtsEngineInfo> {
    if (id === 'webspeech') {
      await this.ws.init();
      return this.ws.status();
    }
    if (id === 'kokoro') {
      const s = this.settings;
      if (!s.kokoroModelUrl) {
        return {
          id: 'kokoro',
          name: '神经网络语音（Kokoro）',
          kind: 'neural-local',
          offline: true,
          heteronymControl: true,
          loadNote: '首次加载模型（约 80–150MB），缓存后可离线复读',
          available: true,
          loaded: false,
          error: '请先在「神经网络设置」中填写 Kokoro 模型地址',
        };
      }
      if (!this.kokoro) {
        // 动态加载：Kokoro 引擎 + pinyin-pro 词典作为独立 chunk 进入按需异步包，
        // 不进首屏主包。ensureEngine 本身为 async，可在方法体内 await。
        const { KokoroEngine } = await import('./kokoroEngine');
        this.kokoro = new KokoroEngine(
          s.kokoroModelUrl,
          s.kokoroVoice,
          s.kokoroDtype,
          s.device,
          s.kokoroLibUrl,
        );
      }
      try {
        await this.kokoro.init();
        return this.kokoro.status();
      } catch {
        return this.kokoro.status();
      }
    }
    throw new Error('未知引擎 ' + id);
  }

  /**
   * 兼容性播放：优先当前引擎，失败自动降级到系统语音。
   * 调用方无需关心降级细节。返回 TtsPlayHandle 用于暂停/停止/跳转。
   */
  async play(
    text: string,
    opts?: Partial<TtsOptions>,
    onLine?: (i: number, total: number) => void,
  ): Promise<TtsPlayHandle> {
    const o: TtsOptions = {
      rate: this.settings.rate,
      pitch: this.settings.pitch,
      volume: this.settings.volume,
      emotion: this.settings.emotion,
      voiceURI: this.settings.voiceURI,
      ...opts,
    };
    const id = this.settings.engine;
    try {
      if (id === 'kokoro') {
        // 首次触发模型加载；加载失败/未配置则降级系统语音（保证出声）
        try {
          await this.ensureEngine('kokoro');
        } catch {
          /* 落到下面的系统语音降级 */
        }
        if (this.kokoro) return await this.kokoro.play(text, o, onLine);
      }
      await this.ws.init();
      return this.ws.play(text, o, onLine);
    } catch {
      // 任何异常（包括推理失败）→ 降级系统语音
      await this.ws.init();
      return this.ws.play(text, o, onLine);
    }
  }

  getStatus(): { webgpu: boolean; zhVoiceCount: number; engines: TtsEngineInfo[] } {
    return {
      webgpu: this.webgpu(),
      zhVoiceCount: this.listZhVoices().length,
      engines: this.engines().map((e) => e.status()),
    };
  }
}

/** 单例，全站共享同一套设置与已加载的引擎 */
export const tts = new TtsManager();
