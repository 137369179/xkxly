/**
 * 音效同步 Hook
 * 统一管理音效开关状态与同步逻辑
 */

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { setMuted } from '@/lib/sfx';

/**
 * 同步音效设置到音效引擎
 */
export function useSoundSync() {
  const sound = useSettingsStore((s) => s.settings.sound);

  useEffect(() => {
    setMuted(!sound);
  }, [sound]);

  return sound;
}

export default useSoundSync;
