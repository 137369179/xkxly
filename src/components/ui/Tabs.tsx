import { motion } from 'motion/react';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap } from '@/lib/sfx';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  emoji?: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  tone = 'purple',
  layoutId = 'tabs',
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (v: T) => void;
  tone?: Tone;
  layoutId?: string;
}) {
  const { t: translate } = useTranslation();
  const ts = TONE_STYLE[tone]!!

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      newIndex = currentIndex === items.length - 1 ? 0 : currentIndex + 1;
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = items.length - 1;
    }
    if (newIndex !== currentIndex) {
      sfxTap();
      onChange(items[newIndex]!.id);
    }
  };

  return (
    <div
      className="scrollbar-none mb-5 flex gap-2 overflow-x-auto rounded-[1.4rem] bg-white/60 p-1.5 shadow-candy-sm"
      role="tablist"
      aria-label={translate('tabs.ariaLabel')}
    >
      {items.map((item, index) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            onClick={() => {
              sfxTap();
              onChange(item.id);
            }}
            onKeyDown={(e) => handleKeyDown(e, index)}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={cn(
              'no-select relative min-h-[48px] flex-1 shrink-0 rounded-[1.1rem] px-4 text-[15px] font-extrabold whitespace-nowrap',
              'transition-colors duration-150',
            )}
            style={{ color: active ? ts.on : '#8B7F96' }}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[1.1rem]"
                style={{ background: ts.main, boxShadow: `0 4px 0 0 ${ts.deep}` }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center justify-center gap-1.5">
              {item.emoji && <span className="text-lg">{item.emoji}</span>}
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
