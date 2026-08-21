import React from 'react';
import { cn } from '@/lib/utils';
import { LETTER_ICON_MAP } from '@/data/letters';
import { ExploreReward } from '@/components/study/ExploreReward';

export interface FluffyLetterVisualProps {
  upper: string;
  lower: string;
  word: string;
  zh: string;
  emoji: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FluffyLetterVisual: React.FC<FluffyLetterVisualProps> = ({
  upper,
  lower,
  word,
  zh,
  emoji,
  size = 'md',
  className,
}) => {
  const itemData = LETTER_ICON_MAP[upper] ?? {
    src: '/alphabet_felt_poster.jpg',
    badge: `${emoji} ${word}`,
    color: 'from-pink-500 to-rose-400',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[2.2rem] border-4 border-white bg-gradient-to-br from-pink-100 via-rose-50 to-pink-200 shadow-fluffy p-4 flex flex-col items-center justify-center text-center transform hover:scale-105 transition-all duration-300',
        size === 'sm' && 'min-h-[140px]',
        size === 'md' && 'min-h-[190px]',
        size === 'lg' && 'min-h-[260px]',
        className
      )}
    >
      {/* 背景羊毛毡缝线暗纹 */}
      <div className="absolute inset-2 border-2 border-dashed border-pink-300/60 rounded-[1.8rem] pointer-events-none" />

      {/* 3D 羊毛毡专属插画视觉展现区 */}
      <div className="relative w-full h-36 sm:h-44 overflow-hidden rounded-2xl border-2 border-white shadow-md mb-2 shrink-0 group bg-white/40">
        <img
          src={itemData.src}
          alt={`${upper} for ${word}`}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500 p-2"
        />
        <div
          className={cn(
            'absolute top-2 left-2 bg-gradient-to-r text-white font-black text-xl px-2.5 py-0.5 rounded-full shadow-md border border-white',
            itemData.color
          )}
        >
          {upper}{lower}
        </div>
        <div className="absolute bottom-1.5 right-2 bg-white/95 px-2.5 py-0.5 rounded-full text-[11px] font-black text-pink-600 shadow-sm border border-pink-100 flex items-center gap-1">
          <span>{itemData.badge}</span>
        </div>
      </div>

      {/* 拼读自然辅音与中文提示 */}
      <div className="z-10 mt-1 space-y-0.5">
        <div className="text-lg font-black text-pink-600 tracking-wide">
          {upper} is for <span className="underline decoration-pink-400 decoration-2">{word}</span>
        </div>
        <div className="text-xs font-bold text-ink-soft">
          {zh} {emoji}
        </div>
      </div>
    
      <ExploreReward rewardKey="letter-visual" scene="letter" tone="purple" /></div>
  );
};
