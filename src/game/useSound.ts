/**
 * 音效反馈 Hook（M 层 · 音乐韵律 + S 语音层基础）
 * ------------------------------------------------------------
 * 端侧 Web Audio 合成轻量音效（无音频文件依赖、零上传、COPPA 友好），
 * 用于「正确 / 错误 / 成就 / 点击」即时听觉强化，呼应任务 #4 儿童审美。
 * 安全降级：无 AudioContext（SSR / 旧浏览器 / 测试环境）时静默 no-op，绝不抛错。
 * 家长可静音；静音偏好经 safeStorage 持久化（不写入任何 PII）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

export type SoundKind = 'success' | 'error' | 'achievement' | 'tap';

const MUTE_KEY = 'babystudy.sound.muted';

interface ToneSpec {
  freq: number;
  dur: number;
  type: OscillatorType;
  gain: number;
}

const TONES: Record<SoundKind, ToneSpec[]> = {
  tap: [{ freq: 660, dur: 0.06, type: 'sine', gain: 0.05 }],
  success: [
    { freq: 660, dur: 0.09, type: 'sine', gain: 0.08 },
    { freq: 880, dur: 0.12, type: 'sine', gain: 0.08 },
  ],
  error: [{ freq: 320, dur: 0.16, type: 'triangle', gain: 0.06 }],
  achievement: [
    { freq: 523, dur: 0.1, type: 'sine', gain: 0.09 },
    { freq: 659, dur: 0.1, type: 'sine', gain: 0.09 },
    { freq: 784, dur: 0.18, type: 'sine', gain: 0.09 },
  ],
};

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export interface UseSoundApi {
  muted: boolean;
  setMuted: (m: boolean) => void;
  play: (kind: SoundKind) => void;
}

export function useSound(initialMuted?: boolean): UseSoundApi {
  const [muted, setMutedState] = useState<boolean>(() => {
    if (initialMuted !== undefined) return initialMuted;
    return safeGetItem(MUTE_KEY) === '1';
  });
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    safeSetItem(MUTE_KEY, muted ? '1' : '0');
  }, [muted]);

  const setMuted = useCallback((m: boolean) => setMutedState(m), []);

  const play = useCallback((kind: SoundKind) => {
    if (mutedRef.current) return;
    const ctx = getAudioCtx();
    if (!ctx) return; // 安全降级：无 AudioContext 静默
    try {
      const start = ctx.currentTime;
      let t = start;
      for (const tone of TONES[kind]) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = tone.type;
        osc.frequency.value = tone.freq;
        g.gain.value = tone.gain;
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + tone.dur);
        t += tone.dur * 0.6; // 重叠衔接更自然
      }
      const release = window.setTimeout(() => {
        void ctx.close().catch(() => undefined);
      }, 400);
      void release;
    } catch {
      // 任何异常都静默，绝不阻塞学习流程
    }
  }, []);

  return { muted, setMuted, play };
}
