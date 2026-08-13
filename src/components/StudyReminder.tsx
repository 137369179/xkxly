/**
 * 学习提醒时钟 - 设定每日学习时间提醒
 */

import { useState, useEffect, useRef } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';
import { safeSetItem, safeGetItem, safeParseJSON } from '@/lib/safeStorage';
import { useTranslation } from '@/i18n/useTranslation';

const TIMES = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

export function StudyReminder() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('17:00');
  const [status, setStatus] = useState('');
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const saved = safeGetItem('study-reminder');
    if (saved) {
      const cfg = safeParseJSON<{ enabled?: boolean; time?: string }>(saved, {});
      setEnabled(cfg.enabled ?? false);
      setTime(cfg.time ?? '17:00');
    }
  }, []);

  // 卸载时清理定时器，避免多次进设置页产生多实例
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    safeSetItem('study-reminder', JSON.stringify({ enabled, time }));
  }, [enabled, time]);

  const requestPermission = async () => {
    sfxTap();
    if (!('Notification' in window)) {
      setStatus(t('studyReminder.unsupported'));
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setEnabled(true);
      setStatus(t('studyReminder.enabledAt', { time }));
      scheduleNotification(time);
    } else {
      setStatus(t('studyReminder.denied'));
    }
  };

  const handleToggle = () => {
    sfxTap();
    if (!enabled) {
      requestPermission();
    } else {
      setEnabled(false);
      setStatus(t('studyReminder.disabled'));
    }
  };

  const handleTimeChange = (timeVal: string) => {
    sfxTap();
    setTime(timeVal);
    if (enabled) {
      setStatus(t('studyReminder.updatedAt', { time: timeVal }));
      scheduleNotification(timeVal);
    }
  };

  // 简易实现：每分钟检查一次。使用组件级 timerRef，不再挂到 window，
  // 卸载时由上面的 effect 统一清理，避免多次进入设置页产生多实例。
  function scheduleNotification(time: string) {
    const check = () => {
      const now = new Date();
      const [h, m] = time.split(':').map(Number);
      if (now.getHours() === h && now.getMinutes() === m) {
        try {
          new Notification('🎯 宝贝学习乐园', {
            body: t('studyReminder.notifyBody'),
            icon: '/icon.png',
          });
        } catch (e) {
          if (import.meta.env.DEV) console.warn('[StudyReminder] 操作失败，已回退默认', e);
        }
      }
    };
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(check, 60000);
  }


  return (
    <Panel>
      <PanelTitle emoji="⏰" title={t('studyReminder.title')} subtitle={t('studyReminder.subtitle')} tone="blue" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-ink">{t('studyReminder.daily')}</span>
          <button
            onClick={handleToggle}
            className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? 'bg-candy-green-deep' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${enabled ? 'left-6' : 'left-1'}`}
            />
          </button>
        </div>

        {enabled && (
          <div>
            <div className="mb-2 text-sm font-extrabold text-ink">{t('studyReminder.time')}</div>
            <div className="flex flex-wrap gap-2">
              {TIMES.map(t => (
                <CandyButton
                  key={t}
                  tone={time === t ? 'blue' : 'purple'}
                  variant={time === t ? 'solid' : 'soft'}
                  size="sm"
                  onClick={() => handleTimeChange(t)}
                >
                  {t}
                </CandyButton>
              ))}
            </div>
          </div>
        )}

        {status && (
          <p className="text-xs font-bold text-ink-soft">{status}</p>
        )}

        {enabled && (
          <p className="text-xs font-bold text-ink-soft">
            {t('studyReminder.permissionHint')}
          </p>
        )}
      </div>
    </Panel>
  );
}

