/**
 * TTS 朗读状态 Store（从 useStore 拆分）
 * 
 * 职责：
 * - 管理全局朗读状态（不持久化）
 * - 提供统一的 TTS 状态查询接口
 * - 由 speech.ts 在 speak/stop 时推送状态更新
 */

import { create } from 'zustand';

export type TtsState = {
  /** 当前是否在朗读 */
  isSpeaking: boolean;
  /** 当前朗读的文本摘要（前 20 字），用于 UI 显示 */
  snippet: string;
  /** 朗读开始时间戳，用于显示已读时长 */
  startedAt: number;
  /** 朗读模块（quiz/poem/hanzi/letter/number/story/ai/praise），用于场景化 UI */
  module: string;
};

interface TtsStoreState extends TtsState {
  /** 设置朗读状态（speech.ts 调用） */
  setTtsState: (s: Partial<TtsState>) => void;
  /** 重置朗读状态 */
  resetTts: () => void;
  /** 全局「小茜语音对话」模态框是否打开（AiVoiceModal） */
  voiceModalOpen: boolean;
  /** 打开语音对话模态框（App.tsx 全局挂载，任何组件可触发） */
  openVoiceModal: () => void;
  /** 关闭语音对话模态框 */
  closeVoiceModal: () => void;
}

const initialState: TtsState = {
  isSpeaking: false,
  snippet: '',
  startedAt: 0,
  module: '',
};

export const useTtsStore = create<TtsStoreState>()((set) => ({
  ...initialState,

  setTtsState: (patch) =>
    set((state) => ({ ...state, ...patch })),

  resetTts: () =>
    set(initialState),

  voiceModalOpen: false,

  openVoiceModal: () =>
    set({ voiceModalOpen: true }),

  closeVoiceModal: () =>
    set({ voiceModalOpen: false }),
}));
