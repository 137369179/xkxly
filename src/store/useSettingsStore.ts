/**
 * 设置 Store（从 useStore 拆分）
 * 
 * 职责：
 * - 管理应用设置（声音、拼音显示、家长 PIN、护眼等）
 * - 设置持久化到 localStorage
 * - 提供 PIN 安全相关逻辑
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setAiEnabled as aiSetEnabled } from '@/lib/ai/client';
import { PIN_FAIL_LIMIT, PIN_LOCK_MS } from '@/lib/pin';
import { createThrottledStorage } from '@/store/storeHelpers';

/** 节流版 localStorage 包装：复用主 Store 的同一工厂实现，消除重复 */
const { storage: throttledLocalStorage } = createThrottledStorage();

export interface Settings {
  sound: boolean;
  /** 拼音显示开关 */
  showPinyin: boolean;
  /** 家长中心 PIN，'' 表示未设置；新格式为 `sha256:<salt>:<hash>`，旧明文 4 位数字自动兼容 */
  parentPin: string;
  /** PIN 连续失败次数，达到 PIN_FAIL_LIMIT 后锁定 */
  pinFails: number;
  /** PIN 锁定到期时间戳（ms），0 表示未锁定 */
  pinLockUntil: number;
  /** 每日学习时长上限（分钟），0 = 不限制 */
  dailyLimitMin: number;
  /** 护眼提醒间隔（分钟），0 = 关闭 */
  eyeCareMin: number;
  /** 全站 AI 总开关，关闭后所有 AI 点静默退回本地内容 */
  aiEnabled: boolean;
  /** 语音引导开关（页面/步骤切换时的引导朗读），默认开；仍受 sound 总开关约束 */
  voiceGuide: boolean;
  /** 是否已确认「隐私与数据说明」（P0-1 合规：首启引导要求父母确认后才可继续） */
  privacyAccepted: boolean;
}

interface SettingsStoreState {
  settings: Settings;
  
  // Actions
  setSound: (v: boolean) => void;
  setShowPinyin: (v: boolean) => void;
  setParentPin: (pin: string) => void;
  recordPinFail: () => void;
  recordPinSuccess: () => void;
  clearPin: () => void;
  setDailyLimit: (min: number) => void;
  setEyeCare: (min: number) => void;
  setAiEnabled: (v: boolean) => void;
  setVoiceGuide: (v: boolean) => void;
  setPrivacyAccepted: (v: boolean) => void;
}

const initialSettings: Settings = {
  sound: true,
  showPinyin: true,
  parentPin: '',
  pinFails: 0,
  pinLockUntil: 0,
  dailyLimitMin: 0,
  eyeCareMin: 20,
  aiEnabled: true,
  voiceGuide: true,
  privacyAccepted: false,
};

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set, get) => ({
      settings: initialSettings,

      setSound: (v) =>
        set((s) => ({ settings: { ...s.settings, sound: v } })),

      setShowPinyin: (v) =>
        set((s) => ({ settings: { ...s.settings, showPinyin: v } })),

      setParentPin: (pin) =>
        set((s) => ({ settings: { ...s.settings, parentPin: pin } })),

      recordPinFail: () => {
        const { pinFails } = get().settings;
        const newFails = pinFails + 1;
        if (newFails >= PIN_FAIL_LIMIT) {
          set((s) => ({
            settings: {
              ...s.settings,
              pinFails: newFails,
              pinLockUntil: Date.now() + PIN_LOCK_MS,
            },
          }));
        } else {
          set((s) => ({
            settings: { ...s.settings, pinFails: newFails },
          }));
        }
      },

      recordPinSuccess: () =>
        set((s) => ({
          settings: { ...s.settings, pinFails: 0, pinLockUntil: 0 },
        })),

      clearPin: () =>
        set((s) => ({
          settings: { ...s.settings, parentPin: '', pinFails: 0, pinLockUntil: 0 },
        })),

      setDailyLimit: (min) =>
        set((s) => ({ settings: { ...s.settings, dailyLimitMin: min } })),

      setEyeCare: (min) =>
        set((s) => ({ settings: { ...s.settings, eyeCareMin: min } })),

      setAiEnabled: (v) => {
        aiSetEnabled(v);
        set((s) => ({ settings: { ...s.settings, aiEnabled: v } }));
      },

      setVoiceGuide: (v) =>
        set((s) => ({ settings: { ...s.settings, voiceGuide: v } })),

      setPrivacyAccepted: (v) =>
        set((s) => ({ settings: { ...s.settings, privacyAccepted: v } })),
    }),
    {
      name: 'baby-learning-settings',
      storage: createJSONStorage(() => throttledLocalStorage),
    }
  )
);
