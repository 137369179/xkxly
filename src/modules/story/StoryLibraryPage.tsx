import { useMemo } from 'react';
import { motion } from 'motion/react';
import { NAV_MAP } from '@/data/nav';
import { navigate, type RouteId } from '@/lib/router';
import { useProgress } from '@/store/useStore';
import { TONE_STYLE } from '@/lib/tones';
import { moduleStat } from '@/lib/moduleStats';
import { sfxTap } from '@/lib/sfx';
import { PageHeader } from '@/components/ui/Card';
import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { StorybookShelf } from '@/modules/storybook/StorybookShelf';
import { useTranslation } from '@/i18n/useTranslation';

interface Shelf {
  key: RouteId;
  titleKey: string;
  emoji: string;
  tone: 'pink' | 'purple' | 'blue' | 'green';
  spine: string;
}

// 故事馆分架：绘本 / 儿歌 / 成语 / 古诗
const SHELVES: Shelf[] = [
  { key: 'storybook', titleKey: 'storylib.shelf.storybook', emoji: '📖', tone: 'purple', spine: '#a855f7' },
  { key: 'songs', titleKey: 'storylib.shelf.songs', emoji: '🎵', tone: 'pink', spine: '#ec4899' },
  { key: 'idioms', titleKey: 'storylib.shelf.idioms', emoji: '🏯', tone: 'blue', spine: '#3b82f6' },
  { key: 'poems', titleKey: 'storylib.shelf.poems', emoji: '🌸', tone: 'green', spine: '#22c55e' },
];

export default function StoryLibraryPage() {
  const { t } = useTranslation();
  const p = useProgress();

  const shelves = useMemo(
    () =>
      SHELVES.map((shelf) => {
        const item = NAV_MAP.get(shelf.key);
        const stat = moduleStat(shelf.key, p);
        const readCount =
          shelf.key === 'storybook'
            ? (p.storybooks ?? []).length
            : shelf.key === 'poems'
              ? p.poemsRead.length
              : stat.done;
        return { ...shelf, item, stat, readCount };
      }),
    [p],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="📚"
        title={t('storylib.title')}
        subtitle={t('storylib.subtitle')}
        tone="pink"
      />

      {shelves.map((shelf, si) => {
        const tone = TONE_STYLE[shelf.tone]!;
        const pct = Math.round(shelf.stat.rate * 100);
        const isStorybook = shelf.key === 'storybook';
        return (
          <motion.section
            key={shelf.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.08 }}
            className="overflow-hidden rounded-[2rem] border-4 border-pink-200 bg-gradient-to-b from-white to-pink-50/70 shadow-fluffy"
          >
            {/* 书架木顶板 */}
            <div className="flex items-center gap-3 border-b-2 border-pink-100 bg-white/60 px-4 py-3">
              <span className="text-2xl">{shelf.emoji}</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-extrabold" style={{ color: tone.deep }}>
                  {t(shelf.titleKey)}
                </h2>
                <p className="truncate text-xs font-bold text-ink-soft">
                  {isStorybook
                    ? `${t('storylib.saved')} ${shelf.readCount} · ${t('storylib.create')}`
                    : `${t('storylib.read')} ${shelf.readCount} / ${shelf.stat.total}`}
                </p>
              </div>
              <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black text-white shadow-sm" style={{ background: tone.main }}>
                {pct}%
              </span>
            </div>

            {isStorybook ? (
              /* 绘本架：内嵌真实书架（分类/收藏/年龄推荐筛选 + 阅读器） */
              <div className="p-4">
                <StorybookShelf showFilters />
              </div>
            ) : (
            <div className="flex items-stretch gap-3 p-4">
              {/* 书脊 */}
              <button
                onClick={() => {
                  sfxTap();
                  navigate(shelf.key);
                }}
                className="no-select group relative flex w-20 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl py-4 text-white shadow-md transition-transform active:scale-95"
                style={{ background: `linear-gradient(160deg, ${shelf.spine}, ${shelf.spine}cc)` }}
              >
                <FluffyIcon type={shelf.key} size="md" className="border-white/70" />
                <span className="px-1 text-center text-xs font-black leading-tight drop-shadow">
                  {t(`nav.${shelf.key}.label`) || shelf.item?.label}
                </span>
              </button>

              {/* 进度与入口 */}
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
                <div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: tone.main }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    sfxTap();
                    navigate(shelf.key);
                  }}
                  className="no-select flex w-fit items-center gap-1 rounded-full border-2 border-white px-4 py-2 text-sm font-extrabold text-white shadow-sm transition-transform active:scale-95"
                  style={{ background: tone.main }}
                >
                  {isStorybook ? `✏️ ${t('storylib.create')}` : `📖 ${t('storylib.open')}`}
                </button>
              </div>
            </div>
            )}
          </motion.section>
        );
      })}
    </div>
  );
}
