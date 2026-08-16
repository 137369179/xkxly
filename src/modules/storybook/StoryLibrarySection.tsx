import { useMemo } from 'react';
import { motion } from 'motion/react';
import { NAV_MAP } from '@/data/nav';
import { navigate, type RouteId } from '@/lib/router';
import { useProgress } from '@/store/useStore';
import { TONE_STYLE } from '@/lib/tones';
import { moduleStat } from '@/lib/moduleStats';
import { sfxTap } from '@/lib/sfx';
import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { useTranslation } from '@/i18n/useTranslation';

interface Shelf {
  key: RouteId;
  titleKey: string;
  emoji: string;
  tone: 'pink' | 'purple' | 'blue' | 'green';
  spine: string;
}

const SHELVES: Shelf[] = [
  { key: 'songs', titleKey: 'storylib.shelf.songs', emoji: '🎵', tone: 'pink', spine: '#ec4899' },
  { key: 'idioms', titleKey: 'storylib.shelf.idioms', emoji: '🏯', tone: 'blue', spine: '#3b82f6' },
  { key: 'poems', titleKey: 'storylib.shelf.poems', emoji: '🌸', tone: 'green', spine: '#22c55e' },
];

export function StoryLibrarySection() {
  const { t } = useTranslation();
  const p = useProgress();

  const shelves = useMemo(
    () =>
      SHELVES.map((shelf) => {
        const item = NAV_MAP.get(shelf.key);
        const stat = moduleStat(shelf.key, p);
        const readCount =
          shelf.key === 'poems'
            ? p.poemsRead.length
            : stat.done;
        return { ...shelf, item, stat, readCount };
      }),
    [p],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-amber-50/80 border-2 border-amber-200 p-3 text-xs font-bold text-amber-900">
        💡 这里汇集了儿歌童谣、成语故事与古诗意境，随时进入专属分馆沉浸式阅读与伴读！
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {shelves.map((shelf, si) => {
          const tone = TONE_STYLE[shelf.tone]!;
          const pct = Math.round(shelf.stat.rate * 100);
          return (
            <motion.div
              key={shelf.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.08 }}
              className="flex flex-col justify-between overflow-hidden rounded-[2rem] border-3 border-pink-100 bg-gradient-to-b from-white to-pink-50/50 p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{ background: shelf.spine }}
                >
                  <FluffyIcon type={shelf.key} size="sm" className="border-white/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-extrabold" style={{ color: tone.deep }}>
                    {t(shelf.titleKey)}
                  </h3>
                  <p className="text-xs font-bold text-ink-soft">
                    {t('storylib.read')} {shelf.readCount} / {shelf.stat.total}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-ink-soft">学习进度</span>
                  <span style={{ color: tone.deep }}>{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: tone.main }}
                  />
                </div>

                <button
                  onClick={() => {
                    sfxTap();
                    navigate(shelf.key);
                  }}
                  className="no-select mt-2 w-full rounded-xl py-2 text-center text-xs font-black text-white shadow-xs transition-transform active:scale-95"
                  style={{ background: tone.main }}
                >
                  📖 进入分馆 ➔
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
