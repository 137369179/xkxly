import { motion } from 'motion/react';
import { useRef } from 'react';
import { NAV_ITEMS, type NavItem } from '@/data/nav';
import { navigate, type RouteId } from '@/lib/router';
import { TONE_STYLE } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { sfxTap } from '@/lib/sfx';
import { useStars, useBadgeCount, useStreak } from '@/store/useStore';
import { StarIcon } from '@/components/ui/Stars';
import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { useTranslation } from '@/i18n/useTranslation';
import { announceToScreenReader, useKeyboardNavigation } from '@/components/Accessibility';

/**
 * 主导航（改版 Phase B4）
 * 只保留 4 个核心入口（首页 / 乐园地图 / 游戏乐园 / 成长荣誉馆），
 * 其余 38 个模块全部交给乐园地图 hall —— 替代原来的 8 品类 × 32 项平铺。
 */
export function Sidebar({ active }: { active: RouteId }) {
  const { t: translate } = useTranslation();
  const stars = useStars();
  const badgeCount = useBadgeCount();
  const streak = useStreak();
  const btnRefs = useRef<Map<string, HTMLElement>>(new Map());
  /** 核心 4 入口：复用 NAV_ITEMS 的 bottom 标记，与移动端底栏同一数据源 */
  const items = NAV_ITEMS.filter((i) => i.bottom);

  // 键盘方向键导航
  const { containerRef } = useKeyboardNavigation({
    items: items.map((item) => ({
      id: item.id,
      element: btnRefs.current.get(item.id),
    })),
    onNavigate: (idx) => {
      if (items[idx]) {
        sfxTap();
        navigate(items[idx]?.id ?? 'home');
        const label = translate(`nav.${items[idx]?.id}.label`) || items[idx]?.label || ""; announceToScreenReader(`${label}，已切换`);
      }
    },
  });

  const renderItem = (item: NavItem) => {
    const t = TONE_STYLE[item.tone] ?? TONE_STYLE.pink;
    const isActive = active === item.id;
    return (
      <button
        key={item.id}
        ref={(el) => { if (el) btnRefs.current.set(item.id, el); }}
        onClick={() => {
          sfxTap();
          navigate(item.id);
          announceToScreenReader(`${translate(`nav.${item.id}.label`) || item.label}，已切换`);
        }}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'no-select group relative flex min-h-[52px] items-center gap-3 rounded-[1.3rem] px-3.5 py-2.5 text-left',
          'transition-all duration-150 active:translate-y-[2px]',
          'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-purple/50',
        )}
        style={{
          background: isActive ? t.main : 'rgba(255,255,255,0.6)',
          color: isActive ? t.on : '#8a7a7e',
          boxShadow: isActive ? `0 5px 0 0 ${t.deep}` : '0 3px 0 0 rgba(0,0,0,0.04)',
        }}
      >
        <FluffyIcon type={item.id} size="sm" className="group-hover:scale-110 shrink-0 border-white shadow-sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] leading-tight font-extrabold">
            {translate(`nav.${item.id}.label`) || item.label}
          </span>
          <span
            className={cn('block truncate text-xs font-semibold', !isActive && 'text-ink-soft')}
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
  };

  const coreItems = items;

  return (
    <aside ref={containerRef} className="hidden w-[248px] shrink-0 flex-col gap-3 p-4 lg:flex xl:w-[276px] rounded-[2.2rem] border-4 border-pink-200/90 bg-white/95 shadow-fluffy"
      role="navigation"
      aria-label={translate('nav.sidebarLabel') || '侧边导航'}
    >
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

      {/* 导航：核心入口 + 品类分组 */}
      <nav className="flex flex-col gap-2.5 overflow-y-auto pr-1">
        {coreItems.map(renderItem)}

        {/* 其余模块统一走乐园地图：一个大入口替代 32 项平铺 */}
        <button
          onClick={() => {
            sfxTap();
            navigate('hall');
          }}
          className={cn(
            'no-select mt-1 flex min-h-[52px] items-center gap-3 rounded-[1.3rem] px-3.5 py-2.5 text-left',
            'bg-candy-purple-soft transition-all duration-150 active:translate-y-[2px]',
          )}
        >
          <span className="text-2xl" aria-hidden="true">🗺️</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] leading-tight font-extrabold text-candy-purple-deep">
              全部乐园
            </span>
            <span className="block truncate text-xs font-semibold text-ink-soft">42 个乐园都在地图里</span>
          </span>
        </button>
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
