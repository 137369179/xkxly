import React from 'react';
import { cn } from '@/lib/utils';

export type FluffyIconType =
  | 'home'
  | 'today'
  | 'letters'
  | 'poems'
  | 'numbers'
  | 'hanzi'
  | 'pinyin'
  | 'words'
  | 'logic'
  | 'fun'
  | 'adventure'
  | 'rewards'
  | 'passport'
  | 'parent'
  | 'songs'
  | 'star'
  | 'heart'
  | 'crown'
  | 'book'
  | 'apple'
  | 'medal'
  | 'box'
  | 'album'
  | 'pet'
  | 'wand'
  | 'room'
  | 'storybook'
  | 'phonics'
  | 'town'
  | 'sight'
  | 'gamecenter'
  | 'story'
  | 'growth'
  | 'content';

interface FluffyIconProps {
  type: FluffyIconType | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// 全量高端统一 3D 羊毛毡描金真实图标库（无 Emoji 降级，全真实图集）
const ICON_IMAGE_MAP: Record<FluffyIconType, string> = {
  apple: '/icons/apple.jpg',
  home: '/icons/icon-192.png',
  today: '/icons/icon-192.png',
  letters: '/icons/letters.jpg',
  poems: '/icons/poem.jpg',
  numbers: '/icons/math.jpg',
  hanzi: '/icons/hanzi.jpg',
  pinyin: '/icons/pinyin.jpg',
  words: '/icons/words.jpg',
  logic: '/icons/logic.jpg',
  fun: '/icons/fun.jpg',
  adventure: '/icons/adventure.jpg',
  rewards: '/icons/parent.jpg',
  passport: '/icons/crown.jpg',
  parent: '/icons/parent.jpg',
  songs: '/icons/storybook.jpg',
  star: '/icons/star.jpg',
  heart: '/icons/heart.jpg',
  crown: '/icons/crown.jpg',
  book: '/icons/words.jpg',
  medal: '/icons/felt_medal.jpg',
  box: '/icons/felt_box.jpg',
  album: '/icons/felt_album.jpg',
  pet: '/icons/felt_pet.jpg',
  wand: '/icons/felt_wand.jpg',
  room: '/icons/felt_room.jpg',
  storybook: '/icons/felt_storybook.jpg',
  phonics: '/icons/felt_phonics.jpg',
  town: '/icons/felt_town.jpg',
  sight: '/icons/felt_sight.jpg',
  gamecenter: '/icons/fun.jpg',
  story: '/icons/felt_storybook.jpg',
  growth: '/icons/felt_album.jpg',
  content: '/icons/felt_storybook.jpg',
};






const SIZE_MAP = {
  sm: 'w-8 h-8 rounded-xl',
  md: 'w-12 h-12 rounded-2xl',
  lg: 'w-16 h-16 rounded-[1.2rem]',
  xl: 'w-24 h-24 rounded-[1.8rem]',
};

export const FluffyIcon: React.FC<FluffyIconProps> = ({
  type,
  size = 'md',
  className,
}) => {
  const imgSrc = ICON_IMAGE_MAP[type as FluffyIconType] || '/icons/icon-192.png';

  return (
    <div
      className={cn(
        'relative overflow-hidden border-2 border-white/90 shadow-fluffy bg-pink-100 flex items-center justify-center shrink-0 transform hover:scale-105 transition-transform duration-300',
        SIZE_MAP[size],
        className
      )}
    >
      <img
        src={imgSrc}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        draggable={false}
        className="w-full h-full object-cover rounded-[inherit] select-none pointer-events-none"
      />

      <div className="absolute inset-0 ring-1 ring-inset ring-white/40 pointer-events-none rounded-[inherit]" />
    </div>
  );
};
