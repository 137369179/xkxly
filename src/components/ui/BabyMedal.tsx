import React from 'react';
import { MEDAL_GLYPHS } from './medalGlyphs';

export interface BabyMedalProps {
  id: string;
  size?: number;
  className?: string;
  unlocked?: boolean;
}

/** 统一的荣誉勋章渲染：96 栅格金牌 + 猫脸，未解锁时整体灰度 */
export const BabyMedal: React.FC<BabyMedalProps> = ({ id, size = 64, className = '', unlocked = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 96 96"
    fill="none"
    className={`${className} ${!unlocked ? 'grayscale opacity-50' : ''}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    {MEDAL_GLYPHS[id] ?? MEDAL_GLYPHS.scholar}
  </svg>
);

export default BabyMedal;
