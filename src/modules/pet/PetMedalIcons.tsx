import React from 'react';

interface MedalProps {
  size?: number;
  className?: string;
  unlocked?: boolean;
}

/** 统一猫咪主题 2D 金牌荣誉勋章 Component 系列 */

/** 1. 全科学霸猫咪金牌勋章 (Cat Scholar Medal) */
export const CatScholarMedal: React.FC<MedalProps> = ({ size = 64, className = '', unlocked = true }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={`${className} ${!unlocked ? 'grayscale opacity-50' : ''}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#B91C1C" />
      </linearGradient>
      <linearGradient id="goldBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="50%" stopColor="#EAB308" />
        <stop offset="100%" stopColor="#CA8A04" />
      </linearGradient>
    </defs>

    {/* 挂胸勋章缎带 */}
    <path d="M34 10 L26 44 L40 44 Z" fill="url(#goldRibbon)" />
    <path d="M62 10 L70 44 L56 44 Z" fill="url(#goldRibbon)" />
    <path d="M40 10 H56 L48 40 Z" fill="#F43F5E" />

    {/* 外圈金星齿轮底座 */}
    <circle cx="48" cy="56" r="32" fill="url(#goldBody)" stroke="#854D0E" strokeWidth="2.5" />
    <circle cx="48" cy="56" r="26" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2" strokeDasharray="3 3" />

    {/* 猫头花纹中心 */}
    <path d="M36 50 L40 40 L44 48 H52 L56 40 L60 50 C62 54 62 64 48 66 C34 64 34 54 36 50 Z" fill="#FFFFFF" stroke="#854D0E" strokeWidth="2" />
    <circle cx="42" cy="54" r="1.5" fill="#713F12" />
    <circle cx="54" cy="54" r="1.5" fill="#713F12" />
    <path d="M46 58 Q 48 60 50 58" stroke="#713F12" strokeWidth="1.5" strokeLinecap="round" />
    
    {/* 桂冠小金星 */}
    <path d="M48 28 L50 32 L54 33 L51 36 L52 40 L48 38 L44 40 L45 36 L42 33 L46 32 Z" fill="#F59E0B" />
  </svg>
);

/** 2. 拼音小探险家勋章 (Cat Pinyin Explorer Medal) */
export const CatPinyinMedal: React.FC<MedalProps> = ({ size = 64, className = '', unlocked = true }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={`${className} ${!unlocked ? 'grayscale opacity-50' : ''}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="emeraldRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <linearGradient id="greenRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6EE7B7" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    <path d="M34 10 L26 44 L40 44 Z" fill="url(#emeraldRibbon)" />
    <path d="M62 10 L70 44 L56 44 Z" fill="url(#emeraldRibbon)" />
    <circle cx="48" cy="56" r="32" fill="url(#greenRim)" stroke="#064E3B" strokeWidth="2.5" />
    <circle cx="48" cy="56" r="26" fill="#ECFDF5" stroke="#059669" strokeWidth="2" />
    {/* 猫耳朵形树冠 */}
    <path d="M32 58 L38 42 L44 50 H52 L58 42 L64 58 C66 64 30 64 32 58 Z" fill="#34D399" stroke="#047857" strokeWidth="2" />
    <text x="48" y="60" fontSize="16" fontWeight="900" fill="#064E3B" textAnchor="middle">a</text>
  </svg>
);

/** 3. 数学小魔法师勋章 (Cat Math Wizard Medal) */
export const CatMathMedal: React.FC<MedalProps> = ({ size = 64, className = '', unlocked = true }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={`${className} ${!unlocked ? 'grayscale opacity-50' : ''}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="amberRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </linearGradient>
    </defs>
    <path d="M34 10 L26 44 L40 44 Z" fill="url(#amberRibbon)" />
    <path d="M62 10 L70 44 L56 44 Z" fill="url(#amberRibbon)" />
    <circle cx="48" cy="56" r="32" fill="#FDE047" stroke="#78350F" strokeWidth="2.5" />
    <circle cx="48" cy="56" r="26" fill="#FEFCE8" stroke="#D97706" strokeWidth="2" />
    {/* 魔术猫耳帽 */}
    <path d="M32 60 L40 42 L48 52 H48 L56 42 L64 60 Z" fill="#A855F7" stroke="#581C87" strokeWidth="2" />
    <text x="48" y="64" fontSize="14" fontWeight="900" fill="#78350F" textAnchor="middle">1 2 3</text>
  </svg>
);

/** 4. 贴心铲屎官爱心勋章 (Cat Loving Nurture Medal) */
export const CatNurtureMedal: React.FC<MedalProps> = ({ size = 64, className = '', unlocked = true }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" fill="none" className={`${className} ${!unlocked ? 'grayscale opacity-50' : ''}`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pinkRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#9D174D" />
      </linearGradient>
    </defs>
    <path d="M34 10 L26 44 L40 44 Z" fill="url(#pinkRibbon)" />
    <path d="M62 10 L70 44 L56 44 Z" fill="url(#pinkRibbon)" />
    <circle cx="48" cy="56" r="32" fill="#F472B6" stroke="#831843" strokeWidth="2.5" />
    <circle cx="48" cy="56" r="26" fill="#FDF2F8" stroke="#DB2777" strokeWidth="2" />
    {/* 猫耳爱心 */}
    <path d="M34 46 L40 36 L44 42 H52 L56 36 L62 46 Z" fill="#F472B6" />
    <path d="M48 68 C48 68 34 56 34 48 C34 42 40 38 44 41 C48 44 48 44 48 44 C48 44 48 44 52 41 C56 38 62 42 62 48 C62 56 48 68 48 68 Z" fill="#E11D48" stroke="#9F1239" strokeWidth="2" />
  </svg>
);
