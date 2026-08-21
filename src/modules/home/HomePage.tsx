import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { NAV_ITEMS } from '@/data/nav';
import { navigate, type RouteId } from '@/lib/router';
import { TONE_STYLE } from '@/lib/tones';
import { sfxTap } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';

// 首页极简组件
import HomeHeader from '@/modules/home/HomeHeader';
import { HomeHero } from '@/modules/home/HomeHero';
import ExploreMore from '@/modules/home/ExploreMore';
import { CategorySheet } from '@/components/layout/CategorySheet';
import type { NavCategory } from '@/data/nav';
import { DailyChallenge } from '@/components/quiz/DailyChallenge';
import { AiAvatar } from '@/components/ai/AiAvatar';

export default function HomePage() {
  const { t } = useTranslation();
  const [catOpen, setCatOpen] = useState(false);
  const [catInit] = useState<NavCategory | undefined>(undefined);

  // 知识画卷专题封面列表（排除核心学科）
  const coverItems = useMemo(
    () =>
      NAV_ITEMS.filter(
        (n) =>
          n.imageIcon?.includes('/icons/cover-') &&
          !['hanzi', 'numbers', 'letters', 'storybook'].includes(n.id),
      ),
    [],
  );

  // 探索更多区域需要排除的已展示模块 id
  const excludeFromMore = useMemo(
    () => [
      'hanzi',
      'numbers',
      'letters',
      'storybook',
      'companion',
      'home',
      'today',
      ...coverItems.map((n) => n.id),
    ],
    [coverItems],
  );

  return (
    <div className="space-y-6">
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
              <motion.button
                key={k.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  sfxTap();
                  navigate(k.id as RouteId);
                }}
                className="no-select text-left relative overflow-hidden rounded-[2.2rem] border-4 p-5 sm:p-6 shadow-fluffy transition-all flex flex-col justify-between min-h-[160px]"
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
              </motion.button>
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
              <motion.button
                key={m.id}
                onClick={() => {
                  sfxTap();
                  navigate(m.id);
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="no-select group relative flex flex-col overflow-hidden rounded-[1.4rem] border-2 border-white/80 bg-white shadow-candy-sm"
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
                  className="px-2 py-1.5 text-center text-[11px] font-black leading-tight"
                  style={{ color: tk.deep }}
                >
                  {m.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* 3. 小茜伙伴与每日挑战 (Companion & Daily Challenge) */}
      <section className="space-y-4">
        <motion.button
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            sfxTap();
            navigate('companion');
          }}
          className="no-select relative w-full overflow-hidden rounded-[2.2rem] border-4 border-white bg-gradient-to-br from-candy-purple-soft to-candy-blue-soft p-5 text-left shadow-fluffy"
        >
          <div className="flex items-center gap-4">
            <AiAvatar size={56} />
            <div className="min-w-0 flex-1">
              <div className="text-base font-extrabold text-candy-purple-deep">🌟 {t('home.companionPark')}</div>
              <p className="mt-0.5 text-xs font-bold text-ink-soft">{t('home.companionParkDesc')}</p>
            </div>
            <span className="text-2xl font-black text-candy-purple-deep">→</span>
          </div>
        </motion.button>

        <DailyChallenge compact />
        <ExploreMore excludeIds={excludeFromMore} />
      </section>

      {/* 分类浏览浮层 */}
      <CategorySheet open={catOpen} onClose={() => setCatOpen(false)} initialCategory={catInit} />
    </div>
  );
}
