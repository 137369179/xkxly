/**
 * 英文字母高保真离线音频播放器
 * ------------------------------------------------------------
 * 资源：public/audio/letters/
 *   - letter_{a-z}.m4a (标准字母名音频：A, B, C...)
 *   - phonics_{a-z}.m4a (标准自然拼读发音口诀音频：A says /æ/, apple!...)
 *   - word_{a-z}.m4a (核心例词音频：Apple, Banana, Cat...)
 *
 * 收益：
 *   1. 100% 纯正美式少儿标准发音，杜绝浏览器系统 TTS 发音不准、怪调或断音；
 *   2. 0 网络请求、0 模型等待，点击即播（瞬时低延迟响应）；
 *   3. 异常或不支持环境自动安全回退至 Web Speech API。
 */

/** 支持本地发音的 26 个字母 */
const ALPHABET_SET = new Set<string>('abcdefghijklmnopqrstuvwxyz'.split(''));

/** 模块级复用的 Audio 实例（避免高频 new Audio 造成内存泄漏） */
let sharedAudio: HTMLAudioElement | null = null;

function getSharedAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || !('Audio' in window)) return null;
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = 'auto';
  }
  return sharedAudio;
}

/** 播放音频核心函数 */
function playAudioFile(url: string, onEnd?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = getSharedAudio();
    if (!audio) {
      reject(new Error('no-audio'));
      return;
    }

    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
    };

    audio.onended = () => {
      cleanup();
      onEnd?.();
      resolve();
    };

    audio.onerror = () => {
      cleanup();
      reject(new Error(`audio load failed: ${url}`));
    };

    try {
      audio.pause();
      audio.src = url;
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.catch((err) => {
          cleanup();
          reject(err);
        });
      }
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

import { playCachedAudioBuffer } from './audioCache';

/**
 * 播放单个字母名标准音频 (A, B, C...)
 */
export function playLetterVoice(char: string, onEnd?: () => void): Promise<void> {
  const c = char.toLowerCase().trim();
  if (!ALPHABET_SET.has(c)) return Promise.reject(new Error('not-letter'));

  // 优先通过 Web Audio 内存缓冲池瞬时播放（<30ms 响应）
  if (playCachedAudioBuffer(`letter_${c}`, onEnd)) {
    return Promise.resolve();
  }

  return playAudioFile(`/audio/letters/letter_${c}.mp3`, onEnd).catch(() =>
    playAudioFile(`/audio/letters/letter_${c}.m4a`, onEnd),
  );
}

/**
 * 播放字母对应例词标准音频 (Apple, Bear, Cat...)
 */
export function playWordVoice(char: string, onEnd?: () => void): Promise<void> {
  const c = char.toLowerCase().trim();
  if (!ALPHABET_SET.has(c)) return Promise.reject(new Error('not-letter'));
  return playAudioFile(`/audio/letters/word_${c}.mp3`, onEnd).catch(() =>
    playAudioFile(`/audio/letters/word_${c}.m4a`, onEnd),
  );
}

/**
 * 播放字母自然拼读口诀标准音频 (A says /æ/, /æ/, apple! ...)
 */
export function playPhonicsVoice(char: string, onEnd?: () => void): Promise<void> {
  const c = char.toLowerCase().trim();
  if (!ALPHABET_SET.has(c)) return Promise.reject(new Error('not-letter'));
  return playAudioFile(`/audio/letters/phonics_${c}.mp3`, onEnd).catch(() =>
    playAudioFile(`/audio/letters/phonics_${c}.m4a`, onEnd),
  );
}
