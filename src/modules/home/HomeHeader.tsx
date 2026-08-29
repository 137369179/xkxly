import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useStars, useStreak, useStreakFreezes, useBadgeCount, useStore } from '@/store/useStore';
import { navigate } from '@/lib/router';
import { sfxTap } from '@/lib/sfx';

/**
 * 顶部状态栏：星星 + Streak + 徽章三指标横排
 * 紧凑 56px 高，药丸式指标，点击跳转
 */
export default function HomeHeader() {
  const { t } = useTranslation();
  const stars = useStars();
  const streak = useStreak();
  const freezes = useStreakFreezes();
  const badgeCount = useBadgeCount();

  // R163：断签被保护卡救回时，一次性温和提示（不惩罚、不焦虑），消费后清除
  const [protectedToast, setProtectedToast] = useState(false);
  const streakEvent = useStore((s) => s.progress.streakEvent);
  const clearStreakEvent = useStore((s) => s.clearStreakEvent);
  useEffect(() => {
    if (streakEvent !== 'protected') return;
    setProtectedToast(true);
    clearStreakEvent();
    const timer = window.setTimeout(() => setProtectedToast(false), 4000);
    return () => window.clearTimeout(timer);
  }, [streakEvent, clearStreakEvent]);

  const pills = [
    {
      icon: '⭐',
      value: stars,
      label: t('homeHeader.stars'),
      tone: { bg: 'bg-candy-yellow-soft', text: 'text-candy-yellow-deep' },
      onClick: () => navigate('rewards'),
    },
    {
      icon: '🔥',
      value: streak,
      label: freezes > 0 ? t('homeHeader.freezeCount', { n: freezes }) : t('homeHeader.streak'),
      tone: { bg: 'bg-candy-orange-soft', text: 'text-candy-orange-deep' },
      onClick: () => navigate('today'),
    },
    {
      icon: '🏅',
      value: badgeCount,
      label: t('homeHeader.badges'),
      tone: { bg: 'bg-candy-purple-soft', text: 'text-candy-purple-deep' },
      onClick: () => navigate('passport'),
    },
  ] as const;

  return (
    <header
      className="animate-hero-fade-up relative flex h-14 items-center gap-2 rounded-2xl border-2 border-white/80 bg-gradient-to-r from-pink-100 via-purple-50 to-pink-50 px-3 shadow-sm sm:gap-3 sm:px-4"
    >
      {pills.map((p, _i) => (
        <button
          key={p.label}
          onClick={() => {
            sfxTap();
            p.onClick();
          }}
          className={`no-select flex flex-1 items-center justify-center gap-1.5 rounded-full ${p.tone.bg} px-3 py-2 transition-transform active:scale-95 sm:flex-none sm:min-w-[100px]`}
          style={{ minHeight: 40 }}
        >
          <span className="text-lg sm:text-xl">{p.icon}</span>
          <span className={`text-base font-extrabold tabular-nums ${p.tone.text} sm:text-lg`}>
            {p.value}
          </span>
          <span className={`hidden text-xs font-bold ${p.tone.text} sm:inline`}>{p.label}</span>
        </button>
      ))}

      {protectedToast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-candy-orange-deep px-4 py-2 text-sm font-bold text-white shadow-lg"
        >
          {t('homeHeader.protectedToast')}
        </div>
      )}
    </header>
  );
}
