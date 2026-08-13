import { useState } from 'react';
import { navigate } from '@/lib/router';
import { sfxTap } from '@/lib/sfx';
import { useStars, useBadgeCount } from '@/store/useStore';
import { useActiveProfileMeta } from '@/store/useProfilesStore';
import { StarCounter } from '@/components/ui/Stars';
import { OfflineBadge } from '@/components/OfflineIndicator';
import { useTranslation } from '@/i18n/useTranslation';
import { ProfileSwitcher } from './ProfileSwitcher';
import { CategorySheet } from './CategorySheet';

export function TopBar() {
  const stars = useStars();
  const badgeCount = useBadgeCount();
  const activeProfile = useActiveProfileMeta();
  const { t, locale, setLocale } = useTranslation();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const toggleLocale = () => {
    sfxTap();
    setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN');
  };

  return (
    <header className="pt-safe sticky top-0 z-30 px-3 py-2 sm:px-6 sm:py-3 transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2.5 rounded-[2.2rem] border-4 border-pink-200/90 bg-white/95 px-3 py-2 sm:px-5 sm:py-2.5 shadow-fluffy backdrop-blur-xl">
        <button
          onClick={() => {
            sfxTap();
            navigate('home');
          }}
          aria-label="返回首页"
          className="no-select flex min-h-[44px] items-center gap-2 transition-transform active:scale-95"
        >
          <img src="/icons/icon-192.png" alt="宝贝学习乐园图标" decoding="async" className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl shadow-candy-sm border-2 border-pink-200" />
          <span className="text-lg sm:text-xl font-extrabold text-rainbow hidden sm:inline-block">{t('common.appName')}</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* 离线状态徽章 */}
          <OfflineBadge />

          {/* 语言切换 */}
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={locale === 'zh-CN' ? '切换到英文' : 'Switch to Chinese'}
            className="flex min-h-[42px] items-center gap-1 rounded-full bg-candy-purple-soft/80 px-3 py-1.5 text-xs sm:text-sm font-black text-candy-purple-deep shadow-sm border border-candy-purple/30 active:scale-95 transition-all"
          >
            <span>🌐</span>
            <span>{locale === 'zh-CN' ? 'EN' : '中'}</span>
          </button>

          {/* 分类浏览入口 */}
          <button
            type="button"
            onClick={() => { sfxTap(); setCatOpen(true); }}
            aria-label={t('categories.title')}
            className="flex min-h-[42px] items-center gap-1 rounded-full bg-candy-pink-soft/80 px-3 py-1.5 text-xs sm:text-sm font-black text-candy-pink-deep shadow-sm border border-candy-pink/30 active:scale-95 transition-all"
          >
            <span>🔎</span>
            <span className="hidden sm:inline">{t('categories.title')}</span>
          </button>
          {catOpen && <CategorySheet open={catOpen} onClose={() => setCatOpen(false)} />}

          {/* 孩子头像标识 */}
          <button
            type="button"
            onClick={() => { sfxTap(); setSwitcherOpen((v) => !v); }}
            aria-label={t('profile.switchHint')}
            aria-expanded={switcherOpen}
            className="flex items-center gap-1.5 rounded-full bg-candy-yellow-soft/90 px-3 py-1.5 text-xs font-black text-candy-orange-deep shadow-sm border border-candy-orange/30 active:scale-95 transition-all"
          >
            <span className="text-base">{activeProfile?.avatar ?? '👦'}</span>
            <span className="max-w-[4rem] sm:max-w-[6rem] truncate">{activeProfile?.name ?? '宝贝'}</span>
          </button>
          {switcherOpen && <ProfileSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />}

          <span className="rounded-full bg-candy-purple-soft px-3 py-1.5 text-xs sm:text-sm font-extrabold text-candy-purple-deep border border-candy-purple/20">
            🏅 {badgeCount}
          </span>
          <StarCounter count={stars} />
        </div>
      </div>
    </header>
  );
}
