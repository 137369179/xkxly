import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { NAV_ITEMS } from '@/data/nav';
import { navigate, type RouteId } from '@/lib/router';
import { TONE_STYLE } from '@/lib/tones';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';
import type { NavCategory } from '@/data/nav';

// 首页极简组件（同步导入，首屏必需）
import HomeHeader from '@/modules/home/HomeHeader';
import { HomeHero } from '@/modules/home/HomeHero';
import { AiAvatar } from '@/components/ai/AiAvatar';

// 非首屏必需组件懒加载：折叠区、浮层、每日挑战
const ExploreMore = lazy(() => import('@/modules/home/ExploreMore'));
const CategorySheet = lazy(() => import('@/components/layout/CategorySheet').then((m) => ({ default: m.CategorySheet })));
const DailyChallenge = lazy(() => import('@/components/quiz/DailyChallenge').then((m) => ({ default: m.DailyChallenge })));

const FEATURED_SPECIALTIES = [
  { id: 'logic', name: '🤖 CodeBot编程', desc: '积木指令迷宫', tone: 'green' as const },
  { id: 'geography', name: '🧭 环球3D探险', desc: '七大洲护照打卡', tone: 'blue' as const },
  { id: 'vehicles', name: '🚒 城市应急救援', desc: '消防特警救护', tone: 'orange' as const },
  { id: 'art', name: '🖍️ 魔力填色本', desc: '恐龙城堡填色', tone: 'pink' as const },
  { id: 'pinyin', name: '🛝 拼音滑滑梯', desc: '声韵合体大冒险', tone: 'blue' as const },
  { id: 'poems', name: '🌸 国学飞花令', desc: '诗词九宫格对决', tone: 'pink' as const },
  { id: 'science', name: '🌱 自然科学馆', desc: '恐龙考古与生命', tone: 'green' as const },
  { id: 'safety', name: '🚨 避险情景剧场', desc: '地震火灾防走失', tone: 'pink' as const },
] as const;

export default function HomePage() {
  const { t } = useTranslation();
  const [catOpen, setCatOpen] = useState(false);
  const [catInit] = useState<NavCategory | undefined>(undefined);

  // 全局键盘快捷键响应 (1-9 快速直达各大学习专区)
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

  const featuredIds = useMemo(() => FEATURED_SPECIALTIES.map((s) => s.id), []);

  // 知识画卷专题封面列表（排除核心4大学科与特色特色专区，杜绝模块重复）
  const coverItems = useMemo(
    () =>
      NAV_ITEMS.filter(
        (n) =>
          n.imageIcon?.includes('/icons/cover-') &&
          !['hanzi', 'numbers', 'letters', 'storybook', ...featuredIds].includes(n.id),
      ),
    [featuredIds],
  );

  // 探索更多区域需要排除的所有已展示模块 id（实现全页零重复）
  const excludeFromMore = useMemo(
    () => [
      'hanzi',
      'numbers',
      'letters',
      'storybook',
      'companion',
      'home',
      'today',
      ...featuredIds,
      ...coverItems.map((n) => n.id),
    ],
    [featuredIds, coverItems],
  );

  return (
    <div className="space-y-6">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-purple-900 font-bold bg-white/90 px-3.5 py-1.5 rounded-2xl border border-purple-200 shadow-sm">
          ⌨️ 键盘快捷操作：数字 1-4 核心学科 · 5 伴学 · 6 任务 · 7 喵屋 · 8 游戏 · 9 荣誉 · 0/P 家长
        </span>
      </div>

      {/* 1. 顶部状态与极简关卡卡片 (Top Status & Super Hero) */}
      <HomeHeader />
      <HomeHero />

      {/* 2. 4 大核心学科巨型入口 (4 Clean Core Subject Cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌈</span>
            <h2 className="text-xl font-black text-rainbow">探索学习乐园</h2>
          </div>
          <span className="text-xs font-black text-candy-purple-deep bg-candy-purple-soft px-3 py-1 rounded-full border border-candy-purple/30">
            一键启程
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {[
            { id: 'hanzi', name: '🀄 汉字乐园', desc: '看图识字 · 字源故事 · 组词游戏', tone: 'green' as const, tag: '必学关卡' },
            { id: 'numbers', name: '🔢 数学城堡', desc: '趣味数感 · 10内加减 · 逻辑推理', tone: 'yellow' as const, tag: '思维训练' },
            { id: 'letters', name: '🔤 英语启蒙', desc: '26 字母大冒险 · Phonics 自然拼读', tone: 'pink' as const, tag: '双语启蒙' },
            { id: 'storybook', name: '📚 故事绘本', desc: '经典成语 · 寓言故事 · AI绘本', tone: 'purple' as const, tag: '听故事' },
          ].map((k) => {
            const tk = TONE_STYLE[k.tone] ?? TONE_STYLE.pink;
            return (
              <button
                key={k.id}
                onClick={() => {
                  sfxTap();
                  triggerHaptic(20);
                  navigate(k.id as RouteId);
                }}
                className="no-select text-left relative overflow-hidden rounded-[2.2rem] border-4 p-5 sm:p-6 shadow-fluffy transition-all duration-200 hover:scale-[1.02] active:scale-[0.96] flex flex-col justify-between min-h-[160px]"
                style={{
                  borderColor: tk.soft,
                  background: `linear-gradient(135deg, ${tk.soft} 0%, #ffffff 80%)`,
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex items-center gap-2 text-xl sm:text-2xl font-black" style={{ color: tk.deep }}>
                      {k.id === 'storybook' && (
                        <img
                          src="/icons/jelly-storybook.jpg"
                          alt=""
                          className="h-8 w-8 rounded-full object-cover shadow-candy-sm"
                        />
                      )}
                      {k.id === 'storybook' ? k.name.replace(/^\S+\s*/, '') : k.name}
                    </span>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-white/90 shadow-sm" style={{ color: tk.deep }}>
                      {k.tag}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-ink-soft leading-relaxed">{k.desc}</p>
                </div>
                <div className="mt-4 sm:mt-5 flex items-center justify-between">
                  <span className="text-sm font-black text-white px-4 py-2 rounded-2xl shadow-candy-sm flex items-center gap-1.5" style={{ background: tk.main }}>
                    🚀 马上开始
                  </span>
                  <span className="text-3xl">✨</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2.2 🌟 工业级热门启蒙精选 (Featured Specialty Hubs) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <h2 className="text-xl font-black text-rainbow">大厂专业级 · 特色启蒙</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">沉浸互动 · 一键直达</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-3.5">
          {FEATURED_SPECIALTIES.map((item) => {
            const tk = TONE_STYLE[item.tone] ?? TONE_STYLE.blue;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  sfxTap();
                  triggerHaptic(20);
                  navigate(item.id as RouteId);
                }}
                className="no-select flex flex-col justify-between p-3.5 rounded-2xl border-2 text-left shadow-sm transition-all duration-200 hover:scale-[1.03] active:scale-[0.96]"
                style={{
                  borderColor: tk.soft,
                  background: `linear-gradient(135deg, ${tk.soft} 0%, #ffffff 85%)`,
                }}
              >
                <div>
                  <div className="text-sm font-black" style={{ color: tk.deep }}>
                    {item.name}
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-0.5">
                    {item.desc}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs font-black" style={{ color: tk.main }}>
                  <span>进入体验</span>
                  <span>→</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2.5 模块封面墙 · 专题百科一览（精选拓展专题，不与核心4大学科重复） */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <img
            src="/icons/jelly-canvas.jpg"
            alt=""
            className="h-8 w-8 rounded-full object-cover shadow-candy-sm"
          />
          <h2 className="text-xl font-black text-rainbow">探索专题 · 知识画卷</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4">
          {coverItems.map((m) => {
            const tk = TONE_STYLE[m.tone] ?? TONE_STYLE.pink;
            return (
              <button
                key={m.id}
                onClick={() => {
                  sfxTap();
                  navigate(m.id);
                }}
                className="no-select group relative flex flex-col overflow-hidden rounded-[1.4rem] border-2 border-white/80 bg-white shadow-candy-sm transition-all duration-200 hover:scale-[1.04] active:scale-[0.96]"
                style={{ boxShadow: `0 6px 18px ${tk.soft}` }}
              >
                <img
                  src={m.imageIcon}
                  alt={m.label}
                  loading="lazy"
                  decoding="async"
                  // P1-9 响应式：1920px 原图只在宽屏/高清设备下载，移动端/小卡走 480px 变体
                  srcSet={m.imageIconSmall ? `${m.imageIcon} 1920w, ${m.imageIconSmall} 480w` : undefined}
                  sizes="(min-width: 640px) 20vw, 33vw"
                  className="aspect-square w-full object-cover"
                />
                <span
                  className="px-2 py-1.5 text-center text-xs font-black leading-tight"
                  style={{ color: tk.deep }}
                >
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. 小茜伙伴与每日挑战 (Companion & Daily Challenge) */}
      <section className="space-y-4">
        <button
          onClick={() => {
            sfxTap();
            navigate('companion');
          }}
          className="no-select relative w-full overflow-hidden rounded-[2.2rem] border-4 border-white bg-gradient-to-br from-candy-purple-soft to-candy-blue-soft p-5 text-left shadow-fluffy transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <AiAvatar size={56} />
            <div className="min-w-0 flex-1">
              <div className="text-base font-extrabold text-candy-purple-deep">🌟 {t('home.companionPark')}</div>
              <p className="mt-0.5 text-xs font-bold text-ink-soft">{t('home.companionParkDesc')}</p>
            </div>
            <span className="text-2xl font-black text-candy-purple-deep">→</span>
          </div>
        </button>

        <Suspense fallback={null}>
          <DailyChallenge compact />
        </Suspense>
        <Suspense fallback={null}>
          <ExploreMore excludeIds={excludeFromMore} />
        </Suspense>
      </section>

      {/* 分类浏览浮层 */}
      <Suspense fallback={null}>
        <CategorySheet open={catOpen} onClose={() => setCatOpen(false)} initialCategory={catInit} />
      </Suspense>
    </div>

  );
}
