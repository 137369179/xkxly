import { useTranslation } from '@/i18n/useTranslation';
import { useStars, useStreak, useBadgeCount } from '@/store/useStore';
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
  const badgeCount = useBadgeCount();

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
      label: t('homeHeader.streak'),
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
      className="animate-hero-fade-up flex h-14 items-center gap-2 rounded-2xl border-2 border-white/80 bg-gradient-to-r from-pink-100 via-purple-50 to-pink-50 px-3 shadow-sm sm:gap-3 sm:px-4"
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
    </header>
  );
}
