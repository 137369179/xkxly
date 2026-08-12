/**
 * 学习提醒时钟 - 设定每日学习时间提醒
 */

import { useState, useEffect, useRef } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';
import { safeSetItem, safeGetItem, safeParseJSON } from '@/lib/safeStorage';

const TIMES = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

export function StudyReminder() {
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
      setStatus('当前浏览器不支持通知');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setEnabled(true);
      setStatus('✅ 已开启，将在每天 ' + time + ' 提醒学习');
      scheduleNotification(time);
    } else {
      setStatus('❌ 通知权限被拒绝，请在浏览器设置中允许通知');
    }
  };

  const handleToggle = () => {
    sfxTap();
    if (!enabled) {
      requestPermission();
    } else {
      setEnabled(false);
      setStatus('已关闭提醒');
    }
  };

  const handleTimeChange = (t: string) => {
    sfxTap();
    setTime(t);
    if (enabled) {
      setStatus('✅ 已更新为每天 ' + t + ' 提醒');
      scheduleNotification(t);
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
            body: '该学习啦！今天的课程等着你呢～',
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
      <PanelTitle emoji="⏰" title="学习提醒" subtitle="每天定时提醒宝贝学习" tone="blue" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-ink">每日提醒</span>
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
            <div className="mb-2 text-sm font-extrabold text-ink">提醒时间</div>
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
            💡 提醒需要浏览器通知权限，且页面需保持打开状态
          </p>
        )}
      </div>
    </Panel>
  );
}

