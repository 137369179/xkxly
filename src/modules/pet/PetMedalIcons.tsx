import React from 'react';
import { BabyMedal } from '@/components/ui/BabyMedal';

interface MedalProps {
  size?: number;
  className?: string;
  unlocked?: boolean;
}

/**
 * 荣誉勋章（薄壳层）
 * 图形已统一收进 BabyMedal 的 MEDAL_GLYPHS 注册表，此处仅做命名导出，
 * 渲染全部由统一的 BabyMedal 引擎完成（保留 unlocked 灰度语义）。引用页零改动。
 */

export const CatScholarMedal: React.FC<MedalProps> = ({ size = 64, className = '', unlocked = true }) => (
  <BabyMedal id="scholar" size={size} className={className} unlocked={unlocked} />
);
export const CatPinyinMedal: React.FC<MedalProps> = ({ size = 64, className = '', unlocked = true }) => (
  <BabyMedal id="pinyin" size={size} className={className} unlocked={unlocked} />
);
export const CatMathMedal: React.FC<MedalProps> = ({ size = 64, className = '', unlocked = true }) => (
  <BabyMedal id="math" size={size} className={className} unlocked={unlocked} />
);
export const CatNurtureMedal: React.FC<MedalProps> = ({ size = 64, className = '', unlocked = true }) => (
  <BabyMedal id="nurture" size={size} className={className} unlocked={unlocked} />
);
