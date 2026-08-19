import { useState, useMemo, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/store/useStore';
import { useProfilesStore } from '@/store/useProfilesStore';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import { StorybookCover } from './StorybookCover';
import { StorybookReader } from './StorybookReader';
import { THEMES } from './constants';
import type { SavedStorybook, StorybookTheme } from './types';
import type { StoryBookData } from '@/lib/ai/prompts';
import { getStorybookContent } from '@/lib/storybookStore';

const EMPTY_STORYBOOKS: readonly SavedStorybook[] = Object.freeze([]);

type ShelfFilter = 'all' | 'fav' | StorybookTheme;

/** P1-收尾：按年龄推荐主题（低龄动物/森林 → 中龄恐龙/太空 → 高龄太空/公主） */
const AGE_THEME_RECS: Record<string, StorybookTheme[]> = {
  '3-4': ['animals', 'forest'],
  '5-6': ['animals', 'dinosaur'],
  '7-8': ['dinosaur', 'space'],
  '9-10': ['space', 'ocean'],
  '11-12': ['space', 'princess'],
};

function recommendThemes(ageRange?: string): StorybookTheme[] {
  return (ageRange && AGE_THEME_RECS[ageRange]) || ['dinosaur', 'space'];
}

export function StorybookShelf({ showFilters = false }: { showFilters?: boolean } = {}) {
  const { t } = useTranslation();
  const storybooks = useStore((s) => s.progress.storybooks ?? EMPTY_STORYBOOKS);
  const removeStorybook = useStore((s) => s.removeStorybook);
  const incrementStorybookRead = useStore((s) => s.incrementStorybookRead);
  const toggleStorybookFavorite = useStore((s) => s.toggleStorybookFavorite);
  const ageRange = useProfilesStore(
    (s) => s.meta[s.activeProfileId]?.ageRange ?? '7-8',
  );
  const [reading, setReading] = useState<{
    data: StoryBookData;
    id: string;
    theme: StorybookTheme;
    style: StorybookStyle;
    character: string;
  } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState<ShelfFilter>('all');

  const recommended = useMemo(() => recommendThemes(ageRange), [ageRange]);

  const filtered = useMemo(() => {
    if (filter === 'all') return storybooks;
    if (filter === 'fav') return storybooks.filter((b) => b.favorite);
    return storybooks.filter((b) => b.theme === filter);
  }, [storybooks, filter]);

  const favCount = useMemo(() => storybooks.filter((b) => b.favorite).length, [storybooks]);

  // P1-10：绘本完整内容存 IndexedDB，打开时异步取回（老数据 data 仍在 progress 内兜底）
  const openBook = async (book: SavedStorybook) => {
    sfxTap();
    setOpeningId(book.id);
    const full = await getStorybookContent(book.id);
    setOpeningId(null);
    const data = full?.data ?? book.data;
    if (!data) return;
    setReading({
      data,
      id: book.id,
      theme: book.theme,
      style: book.style,
      character: book.character,
    });
  };

  if (reading) {
    return (
      <StorybookReader
        book={reading.data}
        theme={reading.theme}
        style={reading.style}
        character={reading.character}
        existingId={reading.id}
        onClose={() => {
          incrementStorybookRead(reading.id);
          setReading(null);
        }}
      />
    );
  }

  if (storybooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <span className="text-6xl">📚</span>
        <p className="text-lg text-gray-400 font-bold">
          {t('storybookShelf.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {/* 筛选 chips：全部 / 收藏 / 主题（⭐ 为按年龄推荐） */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            ✨ {t('storybookShelf.all')}
          </FilterChip>
          <FilterChip active={filter === 'fav'} onClick={() => setFilter('fav')}>
            ❤️ {t('storybookShelf.fav')} {favCount > 0 && `(${favCount})`}
          </FilterChip>
          {THEMES.map((t) => (
            <FilterChip
              key={t.id}
              active={filter === t.id}
              onClick={() => setFilter(t.id)}
              recommend={recommended.includes(t.id)}
            >
              {t.emoji} {t.label}
              {recommended.includes(t.id) && ' ⭐'}
            </FilterChip>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-14">
          <span className="text-5xl">{filter === 'fav' ? '🤍' : '🔍'}</span>
          <p className="text-sm font-bold text-gray-400">
            {filter === 'fav' ? t('storybookShelf.favEmpty') : t('storybookShelf.catEmpty')}
          </p>
        </div>
      ) : (
        <>
          {/* 打开中指示（IndexedDB 异步取回完整内容） */}
          {openingId && (
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-candy-purple-deep" role="status">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-candy-purple border-t-transparent" />
              {t('storybookShelf.opening')}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((book) => (
            <motion.div
              key={book.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <StorybookCover
                book={book}
                onOpen={() => void openBook(book)}
                onToggleFavorite={() => toggleStorybookFavorite(book.id)}
                onDelete={() => {
                  if (confirmDelete === book.id) {
                    removeStorybook(book.id);
                    setConfirmDelete(null);
                  } else {
                    setConfirmDelete(book.id);
                    setTimeout(() => setConfirmDelete(null), 2000);
                  }
                }}
              />
              {confirmDelete === book.id && (
                <p className="text-xs text-red-400 text-center mt-1">{t('storybookShelf.deleteConfirm')}</p>
              )}
            </motion.div>
          ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  recommend,
  onClick,
  children,
}: {
  active: boolean;
  recommend?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        sfxTap();
        onClick();
      }}
      className={cn(
        'no-select rounded-full border-2 px-3 py-1.5 text-xs font-extrabold shadow-sm transition-transform active:scale-95',
        active
          ? 'border-pink-400 bg-gradient-to-r from-pink-500 to-rose-400 text-white'
          : 'border-pink-200 bg-white text-ink-soft',
        recommend && !active && 'border-amber-300 bg-amber-50 text-amber-700',
      )}
    >
      {children}
    </button>
  );
}
