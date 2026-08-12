import { motion } from 'motion/react';
import { NAV_ITEMS } from '@/data/nav';
import { navigate, type RouteId } from '@/lib/router';
import { TONE_STYLE } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { sfxTap } from '@/lib/sfx';
import { useStars, useBadgeCount, useStreak } from '@/store/useStore';
import { StarIcon } from '@/components/ui/Stars';
import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { useTranslation } from '@/i18n/useTranslation';


export function Sidebar({ active }: { active: RouteId }) {
  const { t: translate } = useTranslation();
  // 核心加强 O：细粒度 selector，避免 useProgress() 全量订阅导致每次答题都重渲染
  const stars = useStars();
  const badgeCount = useBadgeCount();
  const streak = useStreak();

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col gap-3 p-5 lg:flex xl:w-[276px]">
      {/* Logo */}
      <button
        aria-label="返回首页"
        onClick={() => {
          sfxTap();
          navigate('home');
        }}
        className="no-select mb-2 flex items-center gap-3 rounded-[1.5rem] px-2 py-3 text-left"
      >
        <img src="/icons/icon-512.png" alt="App Logo" decoding="async" className="h-14 w-14 rounded-[1.2rem] shadow-candy-sm border-2 border-pink-200 object-cover shrink-0" />
        <span className="min-w-0">

          <span className="block text-xl leading-tight font-extrabold text-rainbow">宝贝学习乐园</span>
          <span className="block text-xs font-semibold text-ink-soft">快乐学习每一天</span>
        </span>
      </button>

      {/* 导航 */}
      <nav className="flex flex-col gap-2.5">
        {NAV_ITEMS.map((item) => {
          const t = TONE_STYLE[item.tone]!
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                sfxTap();
                navigate(item.id);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'no-select group relative flex min-h-[60px] items-center gap-3 rounded-[1.3rem] px-3.5 py-3 text-left',
                'transition-all duration-150 active:translate-y-[2px]',
                'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-purple/50',
              )}
              style={{
                background: isActive ? t.main : 'rgba(255,255,255,0.6)',
                color: isActive ? t.on : '#6B6076',
                boxShadow: isActive ? `0 5px 0 0 ${t.deep}` : '0 3px 0 0 rgba(0,0,0,0.04)',
              }}
            >
              <FluffyIcon type={item.id} size="sm" className="group-hover:scale-110 shrink-0 border-white shadow-sm" />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] leading-tight font-extrabold">
                  {translate(`nav.${item.id}.label`) || item.label}
                </span>
                <span
                  className={cn('block truncate text-[11px] font-semibold', !isActive && 'text-ink-soft')}
                  style={isActive ? { color: 'rgba(255,255,255,0.85)' } : undefined}
                >
                  {translate(`nav.${item.id}.desc`) || item.desc}
                </span>
              </span>
              {isActive && (
                <motion.span
                  layoutId="sidebar-dot"
                  className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/90"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* 底部星星统计 */}
      <div className="mt-auto rounded-[1.5rem] bg-white/70 p-4 shadow-candy-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-ink-soft">我的星星</span>
          <span className="flex items-center gap-1">
            <StarIcon size={20} />
            <span className="text-lg font-extrabold text-candy-yellow-deep tabular-nums">
              {stars}
            </span>
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-sm font-bold text-ink-soft">徽章</span>
          <span className="text-lg font-extrabold text-candy-purple-deep tabular-nums">
            🏅 {badgeCount}
          </span>
        </div>
        {streak > 0 && (
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-sm font-bold text-ink-soft">连续学习</span>
            <span className="text-lg font-extrabold text-candy-orange tabular-nums">
              🔥 {streak} 天
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
