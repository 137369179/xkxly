import { useEffect } from 'react';
import { navigate, type RouteId } from '@/lib/router';
import { TONE_STYLE } from '@/lib/tones';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';

// 首页极简组件（同步导入，首屏必需）
import HomeHeader from '@/modules/home/HomeHeader';
import { HomeHero } from '@/modules/home/HomeHero';

/**
 * 首页（改版 Phase C1 · 一屏一事）
 * ------------------------------------------------------------------
 * 对标帮帮识字 / 洪恩识字 / 宝宝巴士：首页只回答一个问题「今天做什么」，
 * 其余全部交给乐园地图 hall，不再在首页堆叠入口。
 *
 * - 首屏可点目标：主任务 CTA 1 个 + 次要快捷位 3 个 + 乐园地图 1 个（改版前 20+）
 * - 核心任务 ≤1 步：首页 → 今日课程（Hero 大按钮直达）
 * - 键盘快捷键（1-9 / 0 / P）行为保留给桌面与家长，但移除儿童读不懂的纯文本提示条
 */

/** 3 个次要快捷位：只留最高频的三个去向（对标洪恩「可跳过冗余环节」） */
const QUICK_SHORTCUTS = [
  { id: 'hanzi', label: '继续上次', desc: '汉字乐园', emoji: '🀄', tone: 'green' as const },
  { id: 'gamecenter', label: '益智游戏', desc: '闯关冒险', emoji: '🎮', tone: 'purple' as const },
  { id: 'growth', label: '我的成长', desc: '勋章星星', emoji: '🏆', tone: 'yellow' as const },
];

export default function HomePage() {
  const { t } = useTranslation();

  // 键盘快捷键直达（桌面/家长用；不再在页面上展示儿童无法理解的文本提示条）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const keyMap: Record<string, RouteId> = {
        '1': 'hanzi',
        '2': 'numbers',
        '3': 'letters',
        '4': 'storybook',
        '5': 'companion',
        '6': 'today',
        '7': 'cat_house',
        '8': 'gamecenter',
        '9': 'growth',
        '0': 'parent',
        'p': 'parent',
        'P': 'parent',
      };
      const dest = keyMap[e.key];
      if (dest) {
        e.preventDefault();
        sfxTap();
        triggerHaptic(20);
        navigate(dest);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. 顶部状态 + 主任务（今日课程 Hero，全页唯一主任务） */}
      <HomeHeader />
      <HomeHero />

      {/* 2. 仅 3 个次要快捷位（触控 ≥96px，图标 + 文字，不识字也能点） */}
      <section
        className="grid grid-cols-3 gap-3 sm:gap-4"
        aria-label={t('home.quickTitle') || '常用入口'}
      >
        {QUICK_SHORTCUTS.map((k) => {
          const tk = TONE_STYLE[k.tone] ?? TONE_STYLE.pink;
          return (
            <button
              key={k.id}
              onClick={() => {
                sfxTap();
                triggerHaptic(20);
                navigate(k.id as RouteId);
              }}
              aria-label={`${k.label} · ${k.desc}`}
              className="no-select flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-[1.5rem] border-4 bg-white shadow-candy transition-transform duration-100 active:translate-y-1"
              style={{ borderColor: tk.soft }}
            >
              <span className="text-3xl" aria-hidden="true">
                {k.emoji}
              </span>
              <span className="text-base font-black leading-tight" style={{ color: tk.deep }}>
                {k.label}
              </span>
              <span className="text-xs font-bold leading-tight text-ink-soft">{k.desc}</span>
            </button>
          );
        })}
      </section>

      {/* 3. 全部乐园统一入口：42 个模块零删减，只是从首页移到了地图 */}
      <button
        onClick={() => {
          sfxTap();
          navigate('hall');
        }}
        aria-label="去乐园地图"
        className="no-select flex min-h-[88px] w-full items-center gap-4 rounded-[2rem] border-4 border-white bg-gradient-to-br from-candy-purple-soft to-candy-blue-soft px-5 text-left shadow-fluffy transition-transform duration-100 active:translate-y-1"
      >
        <span className="text-4xl" aria-hidden="true">
          🗺️
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-black text-candy-purple-deep">
            {t('home.allParks') || '去乐园地图'}
          </span>
          <span className="block text-xs font-bold text-ink-soft">
            42 个乐园 · 四大岛屿随便逛
          </span>
        </span>
        <span className="text-2xl font-black text-candy-purple-deep" aria-hidden="true">
          →
        </span>
      </button>
    </div>
  );
}
