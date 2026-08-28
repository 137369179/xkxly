/**
 * 分类浏览浮层（规格四：导航按品类重组）
 * 按 学习 / 游戏 / 故事 / 创意 / AI小老师 / 家长中心 分组展示全部模块。
 * 纯展示层，点击直接 navigate，不改动任何页面路由。
 */
import { motion } from 'motion/react';
import { sfxTap } from '@/lib/sfx';
import { navigate, type RouteId } from '@/lib/router';
import { navByCategory, NAV_CATEGORY_META, type NavCategory } from '@/data/nav';
import { TONE_STYLE } from '@/lib/tones';
import { useTranslation } from '@/i18n/useTranslation';

export function CategorySheet({
  open,
  onClose,
  initialCategory,
}: {
  open: boolean;
  onClose: () => void;
  initialCategory?: NavCategory;
}) {
  const { t } = useTranslation();
  if (!open) return null;

  const groups = navByCategory().filter((g) => !initialCategory || g.key === initialCategory);

  return (
    <div className="fixed inset-0 z-50 flex justify-center" onClick={onClose} aria-hidden="true">
      <div
        role="dialog"
        aria-label={t('categories.title')}
        onClick={(e) => e.stopPropagation()}
        className="mt-16 flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2.5rem] border-4 border-pink-200/90 bg-white/95 shadow-fluffy backdrop-blur-xl"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-lg font-extrabold text-rainbow">{t('categories.title')}</h3>
          <button
            type="button"
            onClick={() => {
              sfxTap();
              onClose();
            }}
            aria-label={t('common.close')}
            className="rounded-full px-3 py-1 text-xl font-bold text-gray-400 active:translate-y-[1px]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-6">
          {groups.map((g) => {
            const meta = NAV_CATEGORY_META.find((m) => m.key === g.key) ?? { key: g.key, emoji: '📚', tone: 'blue' as const };
            const tone = TONE_STYLE[meta.tone] ?? TONE_STYLE.pink;
            return (
              <div key={g.key}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl">{meta.emoji}</span>
                  <h4 className="text-base font-extrabold" style={{ color: tone.deep }}>
                    {t(`categories.${g.key}`)}
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {g.items.map((it) => (
                    <motion.button
                      key={it.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        sfxTap();
                        navigate(it.id as RouteId);
                        onClose();
                      }}
                      className="flex items-center gap-2 rounded-2xl border-2 p-2.5 text-left transition"
                      style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#fff' }}
                    >
                      <span className="text-2xl">{it.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-gray-800">{it.label}</span>
                        <span className="block truncate text-xs font-bold text-ink-soft">{it.desc}</span>
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
