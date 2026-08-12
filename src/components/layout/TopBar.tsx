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
  // 核心加强 O：细粒度 selector，避免 useProgress() 全量订阅导致每次答题都重渲染
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
    <header className="pt-safe sticky top-0 z-20 border-b-2 border-white/70 bg-cream/85 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <button
          onClick={() => {
            sfxTap();
            navigate('home');
          }}
          aria-label="返回首页"
          className="no-select flex min-h-[44px] items-center gap-2"
        >
          <img src="/icons/icon-192.png" alt="宝贝学习乐园图标" decoding="async" className="h-10 w-10 rounded-2xl shadow-candy-sm border-2 border-pink-200" />
          <span className="text-lg font-extrabold text-rainbow">{t('common.appName')}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* 离线状态徽章（核心加强 R） */}
          <OfflineBadge />
          {/* 语言切换（i18n 接通）：点击在中/英间切换，应用名等文案随之更新 */}
          <button
            type="button"
            onClick={toggleLocale}
            aria-label={locale === 'zh-CN' ? '切换到英文' : 'Switch to Chinese'}
            className="flex min-h-[44px] items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-sm font-black text-candy-purple shadow-sm border border-candy-purple/30 active:translate-y-[1px]"
          >
            <span>🌐</span>
            <span>{locale === 'zh-CN' ? 'EN' : '中'}</span>
          </button>
          {/* 分类浏览入口（规格四：导航按品类重组） */}
          <button
            type="button"
            onClick={() => { sfxTap(); setCatOpen(true); }}
            aria-label={t('categories.title')}
            className="flex min-h-[44px] items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-sm font-black text-candy-purple shadow-sm border border-candy-purple/30 active:translate-y-[1px]"
          >
            <span>🔎</span>
            <span>{t('categories.title')}</span>
          </button>
          {catOpen && <CategorySheet open={catOpen} onClose={() => setCatOpen(false)} />}
          {/* 孩子头像标识（P1-2 多档案切换入口） */}
          <button
            type="button"
            onClick={() => { sfxTap(); setSwitcherOpen((v) => !v); }}
            aria-label={t('profile.switchHint')}
            aria-expanded={switcherOpen}
            className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-candy-purple shadow-sm border border-candy-purple/30 active:translate-y-[1px]"
          >
            <span>{activeProfile?.avatar ?? '👦'}</span>
            <span className="max-w-[5rem] truncate">{activeProfile?.name ?? '宝贝'}</span>
          </button>
          {switcherOpen && <ProfileSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />}

          <span className="rounded-full bg-candy-purple-soft px-3 py-2 text-sm font-extrabold text-candy-purple-deep">
            🏅 {badgeCount}
          </span>
          <StarCounter count={stars} />
        </div>
      </div>
    </header>
  );
}
