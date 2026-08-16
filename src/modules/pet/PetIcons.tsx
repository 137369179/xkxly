import React from 'react';
import { BabyIcon } from '@/components/ui/BabyModuleIcons';

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * 宠物图标（薄壳层）
 * 图形已统一收进 BabyModuleIcons 的 GLYPHS 注册表（键名 cat_*），此处仅做命名导出，
 * 渲染全部由统一的 BabyIcon 引擎完成（bare 模式 = 不带圆角软底的多彩插画）。
 * 10 个引用页按原组件名导入，零改动。
 */

export const CatFishIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_fish" bare size={size} className={className} />;
export const CatHeartIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_heart" bare size={size} className={className} />;
export const CatBathIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_bath" bare size={size} className={className} />;
export const CatCombIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_comb" bare size={size} className={className} />;
export const CatPawPetIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_pawpet" bare size={size} className={className} />;
export const CatGiftIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_gift" bare size={size} className={className} />;
export const CatCrownIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_crown" bare size={size} className={className} />;
export const CatGlassesIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_glasses" bare size={size} className={className} />;
export const CatBowIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_bow" bare size={size} className={className} />;
export const CatTieIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_tie" bare size={size} className={className} />;
export const CatBedIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_bed" bare size={size} className={className} />;
export const CatWandIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_wand" bare size={size} className={className} />;
export const CatYarnIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_yarn" bare size={size} className={className} />;
export const CatnipIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="catnip" bare size={size} className={className} />;
export const CatDanceIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_dance" bare size={size} className={className} />;
export const CatStretchIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_stretch" bare size={size} className={className} />;
export const CatRollIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_roll" bare size={size} className={className} />;
export const CatPurrIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_purr" bare size={size} className={className} />;
export const CatPinyinQuestIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_pinyinquest" bare size={size} className={className} />;
export const CatMathQuestIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_mathquest" bare size={size} className={className} />;
export const CatHanziQuestIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_hanziquest" bare size={size} className={className} />;
export const CatWardrobeIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_wardrobe" bare size={size} className={className} />;
export const CatManorIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_manor" bare size={size} className={className} />;
export const CatToyboxIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => <BabyIcon id="cat_toybox" bare size={size} className={className} />;
