import { lazy, Suspense, useState } from 'react';
import { navigate } from '@/lib/router';
import { sfxTap } from '@/lib/sfx';
import { useStars, useBadgeCount } from '@/store/useStore';
import { useActiveProfileMeta } from '@/store/useProfilesStore';
import { StarCounter } from '@/components/ui/Stars';
import { OfflineBadge } from '@/components/OfflineIndicator';
import { useTranslation } from '@/i18n/useTranslation';
import type { Locale } from '@/i18n/config';
import { ProfileSwitcher } from './ProfileSwitcher';
import { CategorySheet } from './CategorySheet';

// Part B · 懒加载 SoundMuteToggle：其依赖的 sound.ts（真实语音引擎链）只在
// 首帧之后按需拉取，不再进入首屏主包（TopBar 仍即时渲染，仅静音钮稍后出现）。
const SoundMuteToggle = lazy(() =>
  import('@/components/feedback/SoundMuteToggle').then((m) => ({ default: m.SoundMuteToggle })),
);

export function TopBar() {
  const stars = useStars();
  const badgeCount = useBadgeCount();
  const activeProfile = useActiveProfileMeta();
  const { t, locale, setLocale } = useTranslation();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const toggleLocale = () => {
    sfxTap();
    const next: Record<string, Locale> = {
      'zh-CN': 'zh-TW',
      'zh-TW': 'en-US',
      'en-US': 'zh-CN',
    };
    setLocale(next[locale] ?? 'zh-CN');
  };

  const localeLabel: Record<string, string> = {
    'zh-CN': '简',
    'zh-TW': '繁',
    'en-US': 'EN',
  };

  return (
    <header className="pt-safe sticky top-0 z-30 px-2.5 py-1.5 sm:px-6 sm:py-2 transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-[1.8rem] border-[3px] border-white bg-white/90 px-2.5 py-1.5 shadow-jelly backdrop-blur-xl sm:px-5 sm:py-2">
        {/* 左侧：Logo 与应用名 */}
        <button
          onClick={() => {
            sfxTap();
            navigate('home');
          }}
          aria-label="返回首页"
          className="no-select flex shrink-0 items-center gap-1.5 transition-transform active:scale-95"
          >
            <img
              src="/icons/icon-192.png"
              alt="宝贝学习乐园图标"
              decoding="async"
              className="h-9 w-9 rounded-2xl border-2 border-white shadow-jelly"
            />
          <span className="hidden bg-gradient-to-r from-candy-pink-deep via-candy-purple-deep to-candy-blue-deep bg-clip-text text-base font-extrabold text-transparent sm:inline-block">
            {t('common.appName')}
          </span>
        </button>

        {/* 右侧：工具组 + 身份组 */}
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {/* 工具组：静音 · 语言 · 分类 */}
          <div className="hidden items-center gap-0.5 rounded-full bg-white/60 p-0.5 shadow-inner sm:flex">
            <Suspense fallback={null}>
              <SoundMuteToggle className="[&>button]:h-9 [&>button]:px-2 [&>button]:py-0" />
            </Suspense>
            <button
              type="button"
              onClick={toggleLocale}
              aria-label={locale === 'zh-CN' ? '切换到繁体中文' : locale === 'zh-TW' ? 'Switch to English' : '切换到简体中文'}
              className="flex h-9 items-center gap-1 rounded-full px-2 text-xs font-black text-candy-purple-deep transition-all active:scale-95"
            >
              <span className="text-sm">🌐</span>
              <span>{localeLabel[locale] ?? '简'}</span>
            </button>
            <button
              type="button"
              onClick={() => { sfxTap(); setCatOpen(true); }}
              aria-label={t('categories.title')}
              className="flex h-9 items-center gap-1 rounded-full px-2 text-xs font-black text-candy-pink-deep transition-all active:scale-95"
            >
              <span className="text-sm">🔎</span>
              <span>{t('categories.title')}</span>
            </button>
          </div>
          {catOpen && <CategorySheet open={catOpen} onClose={() => setCatOpen(false)} />}

          {/* 移动端精简工具条：分类 + 静音（语言切换低频，仅桌面展示） */}
          <div className="flex shrink-0 items-center gap-1 sm:hidden">
            <button
              type="button"
              onClick={() => { sfxTap(); setCatOpen(true); }}
              aria-label={t('categories.title')}
              className="grid h-9 w-9 place-items-center rounded-full bg-candy-pink-soft text-lg shadow-candy-sm active:scale-95 transition-all"
            >
              🔎
            </button>
            <Suspense fallback={null}>
              <SoundMuteToggle className="sm:hidden [&>button]:h-9 [&>button]:w-9 [&>button]:px-0" />
            </Suspense>
          </div>

          {/* 身份组视觉分隔（桌面） */}
          <div className="hidden h-6 w-0.5 rounded-full bg-candy-pink/30 sm:block" />

          {/* 离线状态 */}
          <OfflineBadge />

          {/* 身份组：孩子头像(移动端) / 孩子+名字+勋章(桌面) */}
          <button
            type="button"
            onClick={() => { sfxTap(); setSwitcherOpen((v) => !v); }}
            aria-label={t('profile.switchHint')}
            aria-expanded={switcherOpen}
            className="flex shrink-0 items-center rounded-full bg-gradient-to-r from-candy-yellow to-amber-200 shadow-candy-sm border-2 border-white active:scale-95 transition-all"
          >
            {/* 移动端：纯头像圆钮；桌面：头像+名字+勋章胶囊 */}
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-lg shadow-sm">
              {activeProfile?.avatar ?? '👦'}
            </span>
            <span className="hidden min-w-0 pr-2.5 pl-1 text-xs font-black text-candy-orange-deep sm:inline">
              <span className="block max-w-[5rem] truncate leading-tight">{activeProfile?.name ?? '宝贝'}</span>
              <span className="mt-0.5 flex items-center gap-1 rounded-full bg-gradient-to-r from-candy-purple-deep to-candy-purple px-2 py-0.5 text-[10px] font-extrabold text-white">
                🏅 {badgeCount}
              </span>
            </span>
          </button>
          {switcherOpen && <ProfileSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />}

          {/* 星星 */}
          <StarCounter count={stars} className="h-9 border-2 border-white" />
        </div>
      </div>
    </header>
  );
}
