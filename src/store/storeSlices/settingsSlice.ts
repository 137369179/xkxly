import { setAiEnabled as aiSetEnabled } from '@/lib/ai/client';
import { useSettingsStore } from '../useSettingsStore';
import { type SliceCreator } from '../storeShared';
import type { StoreState } from '../useStore';

export const createSettingsSlice: SliceCreator<
  Pick<
    StoreState,
    | 'setSound'
    | 'setShowPinyin'
    | 'setParentPin'
    | 'recordPinFail'
    | 'recordPinSuccess'
    | 'clearPin'
    | 'setDailyLimit'
    | 'setEyeCare'
    | 'setAiEnabled'
    | 'setVoiceGuide'
  >
> = () => ({
  // —— 设置路由：委托到 useSettingsStore，不再在主 store 维护 settings 状态 ——
  setSound: (v) => useSettingsStore.getState().setSound(v),
  setShowPinyin: (v) => useSettingsStore.getState().setShowPinyin(v),
  setParentPin: (pin) => useSettingsStore.getState().setParentPin(pin),
  recordPinFail: () => useSettingsStore.getState().recordPinFail(),
  recordPinSuccess: () => useSettingsStore.getState().recordPinSuccess(),
  clearPin: () => useSettingsStore.getState().clearPin(),
  setDailyLimit: (min) => useSettingsStore.getState().setDailyLimit(min),
  setEyeCare: (min) => useSettingsStore.getState().setEyeCare(min),
  setAiEnabled: (v) => {
    aiSetEnabled(v);
    useSettingsStore.getState().setAiEnabled(v);
  },
  setVoiceGuide: (v) => useSettingsStore.getState().setVoiceGuide(v),
});
