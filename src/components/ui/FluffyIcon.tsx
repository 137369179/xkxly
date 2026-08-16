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
 */
export const FluffyIcon: React.FC<FluffyIconProps> = ({ type, size = 'md', className }) => (
  <div
    className={cn(
      'jelly-shine relative overflow-hidden shrink-0 transform hover:scale-105 transition-transform duration-300',
      SIZE_MAP[size],
      className
    )}
  >
    <BabyIcon id={type} className="w-full h-full" />
  </div>
);
