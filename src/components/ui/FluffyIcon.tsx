import React from 'react';
import { cn } from '@/lib/utils';
import { BabyIcon } from './BabyModuleIcons';

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

const SIZE_MAP = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

/**
 * 统一图标入口：渲染数据驱动的「宝宝图标」矢量系统（BabyModuleIcons）。
 * 旧版 ICON_IMAGE_MAP（JPG 位图）已废弃——所有模块改用圆角、明快、单概念的矢量图标，
 * 颜色自动取自各模块的 tone（见 tones.ts），辨识度与一致性大幅提升。
 *
 * 样式：圆形容器 (rounded-full) + 果冻软阴影 + object-cover
 */
export const FluffyIcon: React.FC<FluffyIconProps> = ({ type, size = 'md', className }) => {
  const sizeClass = SIZE_MAP[size];
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full border-2 border-white/90 shadow-jelly-sm transform hover:scale-105 active:scale-95 transition-all duration-200',
        sizeClass,
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
      <BabyIcon id={type} className="w-full h-full object-cover" />
    </div>
  );
};
