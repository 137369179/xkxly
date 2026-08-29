import { motion } from 'motion/react';
import { TONE_STYLE } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { getTheme } from './constants';
import type { SavedStorybook } from './types';
import { useTranslation } from '@/i18n/useTranslation';

interface StorybookCoverProps {
  book: SavedStorybook;
  onOpen: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
}

export function StorybookCover({ book, onOpen, onDelete, onToggleFavorite }: StorybookCoverProps) {
  const { t } = useTranslation();
  const preset = getTheme(book.theme);
  const tone = TONE_STYLE[preset.tone];

  const date = new Date(book.createdAt);
  const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative cursor-pointer"
      onClick={onOpen}
    >
      <div
        className="rounded-2xl p-4 shadow-md flex flex-col items-center gap-2"
        style={{
          background: preset.bgGradient,
          border: `3px solid ${tone.main}`,
        }}
      >
        {/* 收藏按钮 */}
        {onToggleFavorite && (
          <button
            type="button"
            aria-label={book.favorite ? t('storybookCover.ariaLabelUnfavorite') : t('storybookCover.ariaLabelFavorite')}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={cn(
              'absolute -top-2 -left-2 grid h-7 w-7 place-items-center rounded-full text-sm shadow-md transition-transform active:scale-90',
              book.favorite ? 'bg-rose-500 text-candy-pink-on' : 'bg-white/95 text-rose-400',
            )}
          >
            {book.favorite ? '❤️' : '🤍'}
          </button>
        )}
        {/* 删除按钮 */}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-400 text-candy-pink-on text-xs flex items-center justify-center shadow-md"
          >
            ×
          </button>
        )}

        <span className="text-4xl">{preset.emoji}</span>
        <span
          className="text-sm font-bold text-center line-clamp-2"
          style={{ color: tone.deep }}
        >
          {book.title ?? book.data?.bookTitle ?? ''}
        </span>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>{dateStr}</span>
          {book.readCount > 0 && (
            <span className="ml-1">{t('storybookCover.readCount', { n: book.readCount })}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
