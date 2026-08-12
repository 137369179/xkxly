import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

/** 统一以“猫咪”为主题设计的纯矢量 Icon 系列 Component (No Emojis) */

/** 1. 猫咪金黄小鱼干 (Cat Fish Snack) */
export const CatFishIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fishGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <linearGradient id="tailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
    {/* 鱼尾 - 猫耳造型 */}
    <path d="M48 32 L60 20 C62 26 62 38 60 44 Z" fill="url(#tailGrad)" />
    {/* 鱼身 */}
    <path d="M8 32 C8 18 36 14 50 32 C36 50 8 46 8 32 Z" fill="url(#fishGrad)" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round" />
    {/* 猫咪脚印饼干压痕 */}
    <circle cx="26" cy="32" r="3.5" fill="#78350F" />
    <circle cx="21" cy="27" r="1.5" fill="#78350F" />
    <circle cx="26" cy="25" r="1.5" fill="#78350F" />
    <circle cx="31" cy="27" r="1.5" fill="#78350F" />
    {/* 鱼眼 */}
    <circle cx="16" cy="28" r="2.5" fill="#FFFFFF" />
    <circle cx="16" cy="28" r="1.2" fill="#78350F" />
    {/* 高光 */}
    <path d="M18 20 C26 18 36 20 42 24" stroke="#FFE4E6" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** 2. 猫耳爱心 / 亲密度 (Cat Ear Heart) */
export const CatHeartIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="heartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FF6B95" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    {/* 左猫耳 */}
    <path d="M14 26 L22 10 L28 20 Z" fill="#F472B6" />
    {/* 右猫耳 */}
    <path d="M50 26 L42 10 L36 20 Z" fill="#F472B6" />
    {/* 主爱心 */}
    <path
      d="M32 56 C32 56 10 40 10 26 C10 17.5 17.5 12 25 15 C30 17 32 21 32 21 C32 21 34 17 39 15 C46.5 12 54 17.5 54 26 C54 40 32 56 32 56 Z"
      fill="url(#heartGrad)"
      stroke="#BE185D"
      strokeWidth="2.5"
    />
    {/* 高光 */}
    <path d="M16 24 C14 28 15 34 18 38" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
  </svg>
);

/** 3. 猫咪头香皂泡泡 / 洗澡 (Cat Soap & Bubbles) */
export const CatBathIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="soapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
    {/* 香皂托盘 */}
    <ellipse cx="32" cy="48" rx="26" ry="8" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="2" />
    {/* 猫头造型香皂 */}
    <path d="M18 24 L24 12 L30 22 H34 L40 12 L46 24 C50 28 50 42 32 44 C14 42 14 28 18 24 Z" fill="url(#soapGrad)" stroke="#1D4ED8" strokeWidth="2.5" />
    {/* 猫腮红印 */}
    <circle cx="24" cy="34" r="3" fill="#93C5FD" opacity="0.6" />
    <circle cx="40" cy="34" r="3" fill="#93C5FD" opacity="0.6" />
    {/* 泡泡 */}
    <circle cx="44" cy="16" r="6" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1.5" opacity="0.9" />
    <circle cx="20" cy="14" r="4.5" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1.5" opacity="0.9" />
    <circle cx="48" cy="28" r="3.5" fill="#E0F2FE" stroke="#38BDF8" strokeWidth="1.5" opacity="0.8" />
  </svg>
);

/** 4. 猫爪梳毛 brush / 抚摸 (Cat Paw Brush & Pet) */
export const CatCombIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="combGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="100%" stopColor="#DB2777" />
      </linearGradient>
    </defs>
    {/* 梳子手柄 */}
    <rect x="28" y="38" width="8" height="20" rx="4" fill="#FCE7F3" stroke="#DB2777" strokeWidth="2" />
    {/* 猫爪头刷面 */}
    <path d="M20 20 C20 12 44 12 44 20 C48 26 48 36 32 38 C16 36 16 26 20 20 Z" fill="url(#combGrad)" stroke="#9D174D" strokeWidth="2.5" />
    {/* 爪垫 */}
    <circle cx="32" cy="28" r="5" fill="#FFFFFF" opacity="0.9" />
    <circle cx="24" cy="20" r="2.5" fill="#FFFFFF" opacity="0.9" />
    <circle cx="32" cy="18" r="2.5" fill="#FFFFFF" opacity="0.9" />
    <circle cx="40" cy="20" r="2.5" fill="#FFFFFF" opacity="0.9" />
  </svg>
);

/** 5. 猫爪抚摸 (Cat Paw Petting) */
export const CatPawPetIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M16 48 C16 34 22 28 32 28 C42 28 48 34 48 48 C48 56 16 56 16 48 Z" fill="#FCE7F3" stroke="#F472B6" strokeWidth="2.5" />
    {/* 肉垫 */}
    <ellipse cx="32" cy="44" rx="8" ry="6" fill="#F472B6" />
    <circle cx="22" cy="34" r="3.5" fill="#F472B6" />
    <circle cx="28" cy="30" r="3.5" fill="#F472B6" />
    <circle cx="36" cy="30" r="3.5" fill="#F472B6" />
    <circle cx="42" cy="34" r="3.5" fill="#F472B6" />
    {/* 抚摸星光 */}
    <path d="M22 16 L24 20 L28 22 L24 24 L22 28 L20 24 L16 22 L20 20 Z" fill="#FBBF24" />
    <path d="M42 12 L43.5 15 L46.5 16.5 L43.5 18 L42 21 L40.5 18 L37.5 16.5 L40.5 15 Z" fill="#FBBF24" />
  </svg>
);

/** 6. 猫耳礼盒 / 每日领小鱼干 (Cat Gift Box) */
export const CatGiftIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="boxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#C084FC" />
        <stop offset="100%" stopColor="#9333EA" />
      </linearGradient>
    </defs>
    {/* 猫耳盖子 */}
    <path d="M16 22 L22 10 L28 20 H36 L42 10 L48 22 Z" fill="#E9D5FF" />
    <rect x="12" y="20" width="40" height="10" rx="3" fill="#A855F7" stroke="#6B21A8" strokeWidth="2" />
    {/* 盒子主体 */}
    <rect x="16" y="30" width="32" height="26" rx="4" fill="url(#boxGrad)" stroke="#6B21A8" strokeWidth="2.5" />
    {/* 丝带与缎带 */}
    <rect x="29" y="20" width="6" height="36" fill="#F472B6" />
    {/* 猫爪吊牌 */}
    <circle cx="32" cy="25" r="4" fill="#FBBF24" stroke="#B45309" strokeWidth="1" />
  </svg>
);

/** 7. 学霸猫耳皇冠 (Cat Crown Outfit) */
export const CatCrownIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FCD34D" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
    {/* 皇冠 - 带有猫耳尖角造型 */}
    <path d="M12 48 L10 22 L22 34 L32 14 L42 34 L54 22 L52 48 Z" fill="url(#crownGrad)" stroke="#B45309" strokeWidth="2.5" strokeLinejoin="round" />
    {/* 底边白毛边绒布 */}
    <rect x="10" y="44" width="44" height="8" rx="4" fill="#FFFFFF" stroke="#B45309" strokeWidth="2" />
    {/* 中央猫咪印记红宝石 */}
    <path d="M32 28 L36 34 L32 40 L28 34 Z" fill="#EF4444" />
    <circle cx="16" cy="22" r="3" fill="#EC4899" />
    <circle cx="48" cy="22" r="3" fill="#EC4899" />
  </svg>
);

/** 8. 猫耳眼镜 (Cat Glasses Outfit) */
export const CatGlassesIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 左镜框 - 带有猫耳飞角 */}
    <path d="M10 24 L16 16 L22 24 H30 C30 36 10 36 10 24 Z" fill="#FCE7F3" stroke="#DB2777" strokeWidth="3" />
    {/* 右镜框 - 带有猫耳飞角 */}
    <path d="M34 24 H42 L48 16 L54 24 C54 36 34 36 34 24 Z" fill="#FCE7F3" stroke="#DB2777" strokeWidth="3" />
    {/* 中间鼻梁桥杆 */}
    <path d="M30 26 H34" stroke="#DB2777" strokeWidth="3" strokeLinecap="round" />
    {/* 镜片反光 */}
    <path d="M14 26 L22 22" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    <path d="M38 26 L46 22" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** 9. 猫耳蝴蝶结 (Cat Bow Outfit) */
export const CatBowIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    {/* 左结翅 - 带猫耳形 */}
    <path d="M32 32 L12 18 C8 26 8 38 12 46 Z" fill="url(#bowGrad)" stroke="#BE185D" strokeWidth="2.5" strokeLinejoin="round" />
    {/* 右结翅 - 带猫耳形 */}
    <path d="M32 32 L52 18 C56 26 56 38 52 46 Z" fill="url(#bowGrad)" stroke="#BE185D" strokeWidth="2.5" strokeLinejoin="round" />
    {/* 中央铃铛/圆形包结 */}
    <circle cx="32" cy="32" r="7" fill="#FBBF24" stroke="#B45309" strokeWidth="2" />
    <circle cx="32" cy="34" r="1.5" fill="#78350F" />
  </svg>
);

/** 10. 猫爪印领结 (Cat Tie Outfit) */
export const CatTieIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 领结结扣 */}
    <polygon points="26,14 38,14 36,22 28,22" fill="#3B82F6" stroke="#1E40AF" strokeWidth="2" />
    {/* 领带下垂领身 */}
    <polygon points="28,22 36,22 40,48 32,56 24,48" fill="#2563EB" stroke="#1E40AF" strokeWidth="2.5" />
    {/* 领带上的猫爪花纹 */}
    <ellipse cx="32" cy="36" rx="3" ry="2.5" fill="#FDE047" />
    <circle cx="29" cy="32" r="1" fill="#FDE047" />
    <circle cx="32" cy="31" r="1" fill="#FDE047" />
    <circle cx="35" cy="32" r="1" fill="#FDE047" />
  </svg>
);

/** 11. 猫耳羊毛毡窝 (Cat Bed Outfit) */
export const CatBedIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 猫窝主体 - 带有两个大猫耳轮廓 */}
    <path d="M12 36 L18 16 L28 28 H36 L46 16 L52 36 C56 46 8 46 12 36 Z" fill="#FED7AA" stroke="#C2410C" strokeWidth="2.5" />
    {/* 窝篮下半部垫子 */}
    <ellipse cx="32" cy="44" rx="24" ry="12" fill="#FDBA74" stroke="#EA580C" strokeWidth="2.5" />
    {/* 柔软粉色猫垫内里 */}
    <ellipse cx="32" cy="42" rx="18" ry="8" fill="#FCE7F3" />
  </svg>
);

/** 12. 羽毛逗猫棒 (Cat Feather Wand Toy) */
export const CatWandIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 手柄棒子 */}
    <path d="M12 52 L36 28" stroke="#06B6D4" strokeWidth="4" strokeLinecap="round" />
    {/* 顶端猫头星木珠 */}
    <circle cx="38" cy="26" r="5" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
    {/* 飘逸羽毛 */}
    <path d="M42 22 C52 14 56 8 58 10 C56 18 46 24 42 22 Z" fill="#EC4899" />
    <path d="M40 28 C52 28 58 24 60 27 C56 32 44 32 40 28 Z" fill="#F43F5E" />
    <path d="M36 32 C42 42 46 48 44 50 C40 46 36 38 36 32 Z" fill="#A855F7" />
  </svg>
);

/** 13. 猫咪毛线球 (Cat Yarn Ball Toy) */
export const CatYarnIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="yarnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="100%" stopColor="#A855F7" />
      </linearGradient>
    </defs>
    {/* 猫耳造型突出的毛线球 */}
    <path d="M20 22 L26 12 L32 20 H36 L42 12 L48 22 Z" fill="#EC4899" />
    <circle cx="32" cy="36" r="20" fill="url(#yarnGrad)" stroke="#831843" strokeWidth="2.5" />
    {/* 毛线线条 */ }
    <path d="M16 32 C24 24 40 44 48 34" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
    <path d="M20 42 C32 30 44 36 46 26" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    {/* 拖出的毛线头 */}
    <path d="M48 44 C54 50 48 58 58 58" stroke="#EC4899" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/** 14. 猫薄荷盆栽 (Catnip Plant Toy) */
export const CatnipIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 猫脸花盆 */}
    <path d="M20 38 L16 32 L24 34 H40 L48 32 L44 38 L42 56 H22 Z" fill="#FFFFFF" stroke="#475569" strokeWidth="2.5" />
    <circle cx="28" cy="46" r="1.5" fill="#334155" />
    <circle cx="36" cy="46" r="1.5" fill="#334155" />
    <path d="M30 49 C32 51 34 51 34 49" stroke="#334155" strokeWidth="1.5" />
    {/* 猫薄荷绿叶 */}
    <path d="M32 34 C32 22 22 18 16 22 C18 30 28 34 32 34 Z" fill="#34D399" stroke="#059669" strokeWidth="2" />
    <path d="M32 34 C32 22 42 18 48 22 C46 30 36 34 32 34 Z" fill="#10B981" stroke="#059669" strokeWidth="2" />
    <path d="M32 28 C32 14 32 8 32 8 C32 8 26 14 32 28 Z" fill="#6EE7B7" stroke="#059669" strokeWidth="2" />
  </svg>
);

/** 15. 招财舞 / 舞蹈 (Cat Dance) */
export const CatDanceIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="36" r="18" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2.5" />
    {/* 音符 */}
    <path d="M16 20 V12 L28 8 V16 M28 8 L16 12" stroke="#EAB308" strokeWidth="3" strokeLinecap="round" />
    {/* 猫咪招财爪 */}
    <path d="M38 30 C44 24 50 28 46 36 Z" fill="#F472B6" />
    <circle cx="32" cy="34" r="2" fill="#713F12" />
    <circle cx="40" cy="34" r="2" fill="#713F12" />
    <path d="M34 39 C36 41 38 41 40 39" stroke="#713F12" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** 16. 伸懒腰 (Cat Stretch) */
export const CatStretchIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M10 40 Q 24 24 54 44" stroke="#FB923C" strokeWidth="5" strokeLinecap="round" />
    <circle cx="16" cy="42" r="5" fill="#FED7AA" />
    <circle cx="50" cy="44" r="5" fill="#FED7AA" />
    {/* 伸展线条 */}
    <path d="M52 24 L58 20 M56 30 L62 30" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/** 17. 翻滚打滚 (Cat Roll) */
export const CatRollIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="22" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2.5" strokeDasharray="6 4" />
    {/* 猫爪翻滚中心 */}
    <ellipse cx="32" cy="34" rx="8" ry="6" fill="#38BDF8" />
    <circle cx="24" cy="24" r="3" fill="#38BDF8" />
    <circle cx="32" cy="20" r="3" fill="#38BDF8" />
    <circle cx="40" cy="24" r="3" fill="#38BDF8" />
  </svg>
);

/** 18. 蹭蹭卖萌 (Cat Purr) */
export const CatPurrIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M16 28 L24 16 L30 26 H34 L40 16 L48 28 C52 32 52 46 32 48 C12 46 12 32 16 28 Z" fill="#FCE7F3" stroke="#EC4899" strokeWidth="2.5" />
    {/* 咪咪眼与粉爱心 */}
    <path d="M22 34 Q 26 38 30 34" stroke="#BE185D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M34 34 Q 38 38 42 34" stroke="#BE185D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <circle cx="20" cy="40" r="3.5" fill="#F472B6" opacity="0.7" />
    <circle cx="44" cy="40" r="3.5" fill="#F472B6" opacity="0.7" />
  </svg>
);

/** 19. 拼音森林探险 (Cat Phonics Quest) */
export const CatPinyinQuestIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 树林 - 猫耳造型树冠 */}
    <path d="M16 36 L24 20 L32 30 H36 L44 20 L52 36 C54 42 10 42 16 36 Z" fill="#34D399" stroke="#059669" strokeWidth="2.5" />
    <rect x="28" y="38" width="8" height="18" fill="#78350F" rx="2" />
    {/* 字母 a */}
    <text x="32" y="30" fontSize="16" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">a</text>
  </svg>
);

/** 20. 数学城堡宝藏 (Cat Math Quest) */
export const CatMathQuestIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 猫头形状宝箱 */}
    <rect x="14" y="28" width="36" height="24" rx="4" fill="#FBBF24" stroke="#B45309" strokeWidth="2.5" />
    {/* 盖子 - 猫耳顶 */}
    <path d="M12 28 L18 16 L26 26 H38 L46 16 L52 28 Z" fill="#F59E0B" stroke="#B45309" strokeWidth="2.5" />
    {/* 锁扣猫爪 */}
    <circle cx="32" cy="38" r="4" fill="#EF4444" stroke="#991B1B" strokeWidth="1.5" />
    {/* 数字 */}
    <text x="32" y="50" fontSize="12" fontWeight="900" fill="#78350F" textAnchor="middle">+ - =</text>
  </svg>
);

/** 21. 汉字古镇打工 (Cat Hanzi Quest) */
export const CatHanziQuestIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 猫耳形毛笔卷轴 */}
    <rect x="16" y="16" width="32" height="38" rx="4" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.5" />
    <path d="M22 16 L28 8 L34 16" fill="#F59E0B" />
    <path d="M30 16 L36 8 L42 16" fill="#F59E0B" />
    {/* 汉字“文” */}
    <text x="32" y="40" fontSize="20" fontWeight="bold" fill="#78350F" textAnchor="middle">文</text>
  </svg>
);

/** 22. 猫咪装扮试衣间标题 Icon (Cat Wardrobe Header) */
export const CatWardrobeIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 猫头小衣柜 */}
    <rect x="14" y="22" width="36" height="36" rx="4" fill="#F3E8FF" stroke="#7E22CE" strokeWidth="2.5" />
    <path d="M14 22 L22 10 L30 20 H34 L42 10 L50 22 Z" fill="#C084FC" stroke="#7E22CE" strokeWidth="2.5" />
    {/* 柜门缝与猫手把 */}
    <line x1="32" y1="22" x2="32" y2="58" stroke="#7E22CE" strokeWidth="2" />
    <circle cx="27" cy="40" r="2.5" fill="#E9D5FF" stroke="#7E22CE" strokeWidth="1.5" />
    <circle cx="37" cy="40" r="2.5" fill="#E9D5FF" stroke="#7E22CE" strokeWidth="1.5" />
  </svg>
);

/** 23. 猫咪打工庄园标题 Icon (Cat Quest Manor Header) */
export const CatManorIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* 城堡猫耳屋顶 */}
    <path d="M12 30 L20 14 L28 26 H36 L44 14 L52 30 Z" fill="#C7D2FE" stroke="#3730A3" strokeWidth="2.5" />
    <rect x="16" y="30" width="32" height="26" rx="2" fill="#E0E7FF" stroke="#3730A3" strokeWidth="2.5" />
    {/* 拱形门面 */}
    <path d="M26 56 V42 C26 38 38 38 38 42 V56 Z" fill="#4338CA" />
  </svg>
);

/** 24. 猫咪玩具箱标题 Icon (Cat Toy Box Header) */
export const CatToyboxIcon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="24" width="40" height="32" rx="6" fill="#FCE7F3" stroke="#DB2777" strokeWidth="2.5" />
    <path d="M10 24 C10 16 26 16 32 24 C38 16 54 16 54 24 Z" fill="#F472B6" stroke="#DB2777" strokeWidth="2.5" />
    <ellipse cx="32" cy="40" rx="6" ry="4.5" fill="#FFFFFF" />
    <circle cx="25" cy="34" r="2" fill="#FFFFFF" />
    <circle cx="32" cy="32" r="2" fill="#FFFFFF" />
    <circle cx="39" cy="34" r="2" fill="#FFFFFF" />
  </svg>
);
