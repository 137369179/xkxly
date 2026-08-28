/**
 * 宝贝学习乐园 · 极简全域真人声音总管 (Kids Pure-RealVoice Facade)
 * -----------------------------------------------------------------
 * 专为 6 岁儿童（学龄前 & 幼小衔接）量身打造：
 * 1. 极简直接：一行代码播放任何汉字、拼音、英语、古诗或鼓励语音；
 * 2. 100% 权威纯正：权威拼音注音、纯正美式字母、温润名师朗读；
 * 3. 毫秒级秒出：内置 LRU 内存缓存与流式优先调度；
 * 4. 移动端/iOS 自动交互激活与并发点击保护；
 * 5. 零技术负担：角色化主播体系（甜甜名师 👩‍🏫、云希哥哥 👦、晓晓姐姐 👧）。
 */

import { playMultiChannelRealVoice, stopRealVoice } from './tts/realVoice';
import { pinyinToSpoken } from './pinyinAudio';
import { playLetterVoice } from './letterAudio';
import { isSingleHanziVoice, playHanziVoice } from './hanziAudio';
import { stopSpeaking as legacyStopSpeaking } from './speech';
import { unlockAudioContext } from './audioContext';

export type TeacherId = 'tiantian' | 'yunxi' | 'xiaoxiao';

export interface TeacherInfo {
  id: TeacherId;
  name: string;
  avatar: string;
  tag: string;
  desc: string;
  sampleText: string;
  edgeVoice: string;
}

export const TEACHERS: TeacherInfo[] = [
  {
    id: 'tiantian',
    name: '甜甜名师 👩‍🏫',
    avatar: '👩‍🏫',
    tag: '默认推荐',
    desc: '温柔亲切的标准普通话名师，声音字正腔圆、温润饱满',
    sampleText: '小朋友你好呀，我是甜甜老师！今天我们一起快乐学习吧！',
    edgeVoice: 'zh-CN-XiaoxiaoNeural',
  },
  {
    id: 'xiaoxiao',
    name: '晓晓姐姐 👧',
    avatar: '👧',
    tag: '活泼甜美',
    desc: '少儿播音员音色，活泼生动、富有感染力',
    sampleText: '哈喽小朋友，我是晓晓姐姐，今天你表现得真棒！',
    edgeVoice: 'zh-CN-XiaoxiaoNeural',
  },
  {
    id: 'yunxi',
    name: '云希哥哥 👦',
    avatar: '👦',
    tag: '阳光活力',
    desc: '大哥哥般清爽阳光的少年音色，陪伴闯关充满能量',
    sampleText: '加油小勇士，我是云希哥哥，跟着我一起冲关吧！',
    edgeVoice: 'zh-CN-YunxiNeural',
  },
];

const PRAISE_PHRASES = [
  '太棒啦！你真聪明！',
  '回答完全正确！太厉害了！',
  '哇，你进步得好快呀！',
  '给你点一个大大的赞！',
  '真棒！继续加油哦！',
];

const ENCOURAGE_PHRASES = [
  '没关系，再仔细想一想哦～',
  '差一点就对啦，再试一次吧！',
  '不要灰心，你一定可以的！',
  '再听一遍老师的声音吧～',
];

const STORAGE_KEY_TEACHER = 'baby_park_selected_teacher';
const STORAGE_KEY_MUTED = 'baby_park_sound_muted';
const STORAGE_KEY_VOLUME = 'baby_park_sound_volume';

class KidsSoundManager {
  private currentTeacher: TeacherId = 'tiantian';
  private muted: boolean = false;
  private volume: number = 1.0;
  private listeners: Set<() => void> = new Set();
  private isAudioUnlocked: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedTeacher = localStorage.getItem(STORAGE_KEY_TEACHER) as TeacherId | null;
        if (savedTeacher && TEACHERS.some((t) => t.id === savedTeacher)) {
          this.currentTeacher = savedTeacher;
        }
        const savedMuted = localStorage.getItem(STORAGE_KEY_MUTED);
        if (savedMuted !== null) {
          this.muted = savedMuted === 'true';
        }
        const savedVol = localStorage.getItem(STORAGE_KEY_VOLUME);
        if (savedVol !== null) {
          this.volume = Math.max(0, Math.min(1, parseFloat(savedVol) || 1));
        }
      } catch {
        /* storage unavailable */
      }

      // 注册移动端/iOS 首次触摸解锁音频
      this.initMobileAudioUnlock();
    }
  }

  /**
   * 移动端与 iOS 自动交互解锁
   */
  private initMobileAudioUnlock() {
    const unlock = () => {
      if (this.isAudioUnlocked) return;
      this.isAudioUnlocked = true;
      try {
        unlockAudioContext();
        const dummyAudio = new Audio();
        dummyAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        const p = dummyAudio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => dummyAudio.pause()).catch(() => {});
        }
      } catch {
        /* noop */
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        /* noop */
      }
    });
  }

  /** 获取当前主讲老师 */
  public getTeacher(): TeacherInfo {
    return TEACHERS.find((t) => t.id === this.currentTeacher) || TEACHERS[0]!;
  }

  /** 切换主讲老师 */
  public setTeacher(id: TeacherId) {
    this.currentTeacher = id;
    try {
      localStorage.setItem(STORAGE_KEY_TEACHER, id);
    } catch {
      /* noop */
    }
    this.notify();
  }

  /** 是否已静音 */
  public isMuted(): boolean {
    return this.muted;
  }

  /** 切换静音状态 */
  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stop();
    }
    try {
      localStorage.setItem(STORAGE_KEY_MUTED, String(this.muted));
    } catch {
      /* noop */
    }
    this.notify();
    return this.muted;
  }

  /** 设置静音 */
  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.stop();
    try {
      localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
    } catch {
      /* noop */
    }
    this.notify();
  }

  /** 获取全局音量 (0~100) */
  public getVolume(): number {
    return Math.round(this.volume * 100);
  }

  /** 设置全局音量 (0~100) */
  public setVolume(volPercent: number) {
    this.volume = Math.max(0, Math.min(1, volPercent / 100));
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(this.volume));
    } catch {
      /* noop */
    }
    this.notify();
  }

  /**
   * 朗读任何文本（长句/古诗/题目/解释）
   */
  public async speak(
    text: string,
    options?: {
      lang?: 'zh-CN' | 'en-US';
      rate?: number;
      onEnd?: () => void;
      onError?: () => void;
    }
  ): Promise<void> {
    if (this.muted || !text || !text.trim()) {
      options?.onEnd?.();
      return;
    }

    const trimmed = text.trim();

    // 1. 单个汉字优先离线音频
    if (isSingleHanziVoice(trimmed)) {
      try {
        await playHanziVoice(trimmed, options?.onEnd);
        return;
      } catch {
        /* fallback to multi-channel */
      }
    }

    // 2. 单个英文字母优先离线美音
    if (/^[A-Za-z]$/.test(trimmed)) {
      try {
        await playLetterVoice(trimmed, options?.onEnd);
        return;
      } catch {
        /* fallback to multi-channel */
      }
    }

    // 3. 拼音符号转写为权威发音字
    let spokenText = trimmed;
    if (/^[a-zA-ZāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜüÜ\s,]+$/.test(trimmed)) {
      spokenText = pinyinToSpoken(trimmed);
    }

    const teacher = this.getTeacher();
    const lang = options?.lang || (/^[a-zA-Z\s.,!?'"-]+$/.test(spokenText) ? 'en-US' : 'zh-CN');

    return playMultiChannelRealVoice(spokenText, {
      lang,
      rate: options?.rate || 0.95,
      teacher: teacher.id,
      voice: teacher.edgeVoice,
      volume: this.volume,
      onEnd: options?.onEnd,
      onError: options?.onError,
    }).catch(() => {
      // 兜底接入系统真人语音
      const legacySpeech = import('./speech').then((m) =>
        m.speak(spokenText, {
          lang,
          rate: options?.rate || 0.88,
          onEnd: options?.onEnd,
        })
      );
      return legacySpeech;
    });
  }

  /**
   * 播放标准拼音声母、韵母、带调音节（如 "b" 读 "玻", "bá" 读 "拔"）
   */
  public pinyin(syllable: string, onEnd?: () => void): Promise<void> {
    const spoken = pinyinToSpoken(syllable);
    return this.speak(spoken, { lang: 'zh-CN', rate: 0.7, onEnd });
  }

  /**
   * 播放 26 个英文字母纯正真人美音
   */
  public async letter(char: string, onEnd?: () => void): Promise<void> {
    if (this.muted) {
      onEnd?.();
      return;
    }
    try {
      await playLetterVoice(char, onEnd);
    } catch {
      await this.speak(char, { lang: 'en-US', rate: 0.8, onEnd });
    }
  }

  /**
   * 播放英文单词纯正真人美音
   */
  public word(wordStr: string, onEnd?: () => void): Promise<void> {
    return this.speak(wordStr, { lang: 'en-US', rate: 0.85, onEnd });
  }

  /**
   * 播放名师甜美夸奖（答对时）
   */
  public praise(onEnd?: () => void): Promise<void> {
    const phrase = PRAISE_PHRASES[Math.floor(Math.random() * PRAISE_PHRASES.length)]!;
    return this.speak(phrase, { rate: 1.0, onEnd });
  }

  /**
   * 播放温柔鼓励（答错时）
   */
  public encourage(onEnd?: () => void): Promise<void> {
    const phrase = ENCOURAGE_PHRASES[Math.floor(Math.random() * ENCOURAGE_PHRASES.length)]!;
    return this.speak(phrase, { rate: 0.9, onEnd });
  }

  /**
   * 一键立即停止全站所有声音
   */
  public stop() {
    stopRealVoice();
    legacyStopSpeaking();
  }
}

/** 全局单例极简声音对象 */
export const sound = new KidsSoundManager();

// 挂载到 window 方便调试与跨模块极简调用
if (typeof window !== 'undefined') {
  (window as unknown as { sound: KidsSoundManager }).sound = sound;
}
