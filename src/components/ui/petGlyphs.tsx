import React from 'react';
import { Face, Glint } from './babyIconParts';

/**
 * 宠物图标图形库（统一注册表）
 * 与主系统 BabyModuleIcons 的 GLYPHS 合并后，宠物图标即可通过 <BabyIcon id="cat_*" bare /> 渲染。
 * 宠物图标为多彩独立插画（非单色调），故统一以 bare 模式渲染，不带圆角软底。
 */

export const PET_GLYPHS: Record<string, React.ReactNode> = {
  // 1. 猫咪金黄小鱼干
  cat_fish: (
    <>
      <path d="M48 32 L60 22 C61 27 61 37 60 42 Z" fill="#FF9F5A" />
      <path d="M8 32 C8 19 36 15 50 32 C36 49 8 45 8 32 Z" fill="#FFC93C" />
      <circle cx="26" cy="32" r="2.6" fill="#FFE7B0" />
      <circle cx="21" cy="27" r="1.4" fill="#FFE7B0" />
      <circle cx="26" cy="25" r="1.4" fill="#FFE7B0" />
      <circle cx="31" cy="27" r="1.4" fill="#FFE7B0" />
      <Face cx={18} cy={31} gap={4} dot={2.4} cheekTone="pink" />
      <Glint cx={20} cy={22} rx={4} ry={2} />
    </>
  ),
  // 2. 猫耳爱心 / 亲密度
  cat_heart: (
    <>
      <path d="M14 26 L22 10 L28 20 Z" fill="#FF9CC4" />
      <path d="M50 26 L42 10 L36 20 Z" fill="#FF9CC4" />
      <path d="M32 56 C32 56 11 41 11 27 C11 19 18 14 25 17 C30 19 32 23 32 23 C32 23 34 19 39 17 C46 14 53 19 53 27 C53 41 32 56 32 56 Z" fill="#ff6b96" />
      <Face cx={32} cy={34} gap={5} dot={2.6} cheekTone="pink" />
      <Glint cx={21} cy={25} rx={4} ry={2} />
    </>
  ),
  // 3. 猫咪头香皂泡泡 / 洗澡
  cat_bath: (
    <>
      <ellipse cx="32" cy="48" rx="26" ry="8" fill="#dcecfa" />
      <path d="M18 24 L24 12 L30 22 H34 L40 12 L46 24 C50 28 50 42 32 44 C14 42 14 28 18 24 Z" fill="#55aee0" />
      <circle cx="44" cy="16" r="6" fill="#E6F6FE" stroke="#7FD3F5" strokeWidth={1.5} />
      <circle cx="20" cy="14" r="4.5" fill="#E6F6FE" stroke="#7FD3F5" strokeWidth={1.5} />
      <circle cx="48" cy="28" r="3.5" fill="#E6F6FE" stroke="#7FD3F5" strokeWidth={1.5} />
      <Face cx={32} cy={34} gap={5} dot={2.6} cheekTone="pink" />
      <Glint cx={22} cy={26} rx={4} ry={2} />
    </>
  ),
  // 4. 猫爪梳毛 brush / 抚摸
  cat_comb: (
    <>
      <rect x="28" y="38" width="8" height="20" rx="4" fill="#FFE0EF" />
      <path d="M20 20 C20 12 44 12 44 20 C48 26 48 36 32 38 C16 36 16 26 20 20 Z" fill="#ff6b96" />
      <circle cx="32" cy="28" r="5" fill="#FFFFFF" opacity={0.92} />
      <circle cx="24" cy="20" r="2.5" fill="#FFFFFF" opacity={0.92} />
      <circle cx="32" cy="18" r="2.5" fill="#FFFFFF" opacity={0.92} />
      <circle cx="40" cy="20" r="2.5" fill="#FFFFFF" opacity={0.92} />
      <Glint cx={27} cy={16} rx={4} ry={2} />
    </>
  ),
  // 5. 猫爪抚摸
  cat_pawpet: (
    <>
      <path d="M16 48 C16 34 22 28 32 28 C42 28 48 34 48 48 C48 56 16 56 16 48 Z" fill="#FFE0EF" />
      <ellipse cx="32" cy="44" rx="8" ry="6" fill="#ff6b96" />
      <circle cx="22" cy="34" r="3.5" fill="#ff6b96" />
      <circle cx="28" cy="30" r="3.5" fill="#ff6b96" />
      <circle cx="36" cy="30" r="3.5" fill="#ff6b96" />
      <circle cx="42" cy="34" r="3.5" fill="#ff6b96" />
      <path d="M22 16 L24 20 L28 22 L24 24 L22 28 L20 24 L16 22 L20 20 Z" fill="#FFC93C" />
      <path d="M42 12 L43.5 15 L46.5 16.5 L43.5 18 L42 21 L40.5 18 L37.5 16.5 L40.5 15 Z" fill="#FFC93C" />
    </>
  ),
  // 6. 猫耳礼盒 / 每日领小鱼干
  cat_gift: (
    <>
      <path d="M16 22 L22 10 L28 20 H36 L42 10 L48 22 Z" fill="#E0CCFF" />
      <rect x="12" y="20" width="40" height="10" rx="3" fill="#8b6ef0" />
      <rect x="16" y="30" width="32" height="26" rx="6" fill="#8b6ef0" />
      <rect x="29" y="20" width="6" height="36" fill="#FF9CC4" />
      <circle cx="32" cy="25" r="4" fill="#FFC93C" />
      <Face cx={32} cy={43} gap={5} dot={2.6} cheek={false} />
      <Glint cx={22} cy={36} rx={4} ry={2} />
    </>
  ),
  // 7. 学霸猫耳皇冠
  cat_crown: (
    <>
      <path d="M12 48 L10 22 L22 34 L32 14 L42 34 L54 22 L52 48 Z" fill="#FFC93C" strokeLinejoin="round" />
      <rect x="10" y="44" width="44" height="8" rx="4" fill="#FFE0A3" />
      <path d="M32 26 L36 32 L32 38 L28 32 Z" fill="#ff6b96" />
      <circle cx="16" cy="22" r="3" fill="#FF9CC4" />
      <circle cx="48" cy="22" r="3" fill="#FF9CC4" />
      <Face cx={32} cy={40} gap={5} dot={2.4} cheek={false} />
      <Glint cx={20} cy={24} rx={4} ry={2} />
    </>
  ),
  // 8. 猫耳眼镜
  cat_glasses: (
    <>
      <path d="M10 24 L16 16 L22 24 H30 C30 36 10 36 10 24 Z" fill="#FFE0EF" stroke="#ff6b96" strokeWidth={3} strokeLinejoin="round" />
      <path d="M34 24 H42 L48 16 L54 24 C54 36 34 36 34 24 Z" fill="#FFE0EF" stroke="#ff6b96" strokeWidth={3} strokeLinejoin="round" />
      <path d="M30 26 H34" stroke="#ff6b96" strokeWidth={3} strokeLinecap="round" />
      <path d="M14 26 L22 22" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
      <path d="M38 26 L46 22" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  // 9. 猫耳蝴蝶结
  cat_bow: (
    <>
      <path d="M32 32 L12 18 C8 26 8 38 12 46 Z" fill="#ff6b96" strokeLinejoin="round" />
      <path d="M32 32 L52 18 C56 26 56 38 52 46 Z" fill="#ff6b96" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="7" fill="#FFC93C" />
      <Face cx={32} cy={32} gap={3.4} dot={1.8} cheek={false} />
      <Glint cx={20} cy={26} rx={3.5} ry={1.8} />
    </>
  ),
  // 10. 猫爪印领结
  cat_tie: (
    <>
      <polygon points="26,14 38,14 36,22 28,22" fill="#55aee0" />
      <polygon points="28,22 36,22 40,48 32,56 24,48" fill="#55aee0" />
      <ellipse cx="32" cy="36" rx="3" ry="2.5" fill="#FFFFFF" />
      <circle cx="29" cy="32" r="1" fill="#FFFFFF" />
      <circle cx="32" cy="31" r="1" fill="#FFFFFF" />
      <circle cx="35" cy="32" r="1" fill="#FFFFFF" />
      <Glint cx={30} cy={20} rx={3} ry={1.6} />
    </>
  ),
  // 11. 猫耳羊毛毡窝
  cat_bed: (
    <>
      <path d="M12 36 L18 16 L28 28 H36 L46 16 L52 36 C56 46 8 46 12 36 Z" fill="#FFB877" strokeLinejoin="round" />
      <ellipse cx="32" cy="44" rx="24" ry="12" fill="#FF9F5A" />
      <ellipse cx="32" cy="42" rx="18" ry="8" fill="#FFE0EF" />
      <Face cx={32} cy={40} gap={5} dot={2.4} cheek={false} />
      <Glint cx={20} cy={26} rx={4} ry={2} />
    </>
  ),
  // 12. 羽毛逗猫棒
  cat_wand: (
    <>
      <path d="M12 52 L36 28" stroke="#55aee0" strokeWidth={4} strokeLinecap="round" />
      <circle cx="38" cy="26" r="5" fill="#FFC93C" />
      <Face cx={38} cy={26} gap={3} dot={1.7} cheek={false} />
      <path d="M42 22 C52 14 56 8 58 10 C56 18 46 24 42 22 Z" fill="#ff6b96" />
      <path d="M40 28 C52 28 58 24 60 27 C56 32 44 32 40 28 Z" fill="#8b6ef0" />
      <path d="M36 32 C42 42 46 48 44 50 C40 46 36 38 36 32 Z" fill="#FF9F5A" />
      <Glint cx={36} cy={17} rx={3} ry={1.6} />
    </>
  ),
  // 13. 猫咪毛线球
  cat_yarn: (
    <>
      <path d="M20 22 L26 12 L32 20 H36 L42 12 L48 22 Z" fill="#FF9CC4" />
      <circle cx="32" cy="36" r="20" fill="#ff6b96" />
      <path d="M16 32 C24 24 40 44 48 34" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" opacity={0.85} />
      <path d="M20 42 C32 30 44 36 46 26" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.75} />
      <path d="M48 44 C54 50 48 58 58 58" stroke="#FF9CC4" strokeWidth={3} strokeLinecap="round" />
      <Face cx={32} cy={38} gap={5} dot={2.4} cheek={false} />
      <Glint cx={24} cy={28} rx={4} ry={2} />
    </>
  ),
  // 14. 猫薄荷盆栽
  catnip: (
    <>
      <path d="M20 38 L16 32 L24 34 H40 L48 32 L44 38 L42 56 H22 Z" fill="#FFFFFF" />
      <circle cx="28" cy="46" r="1.5" fill="#ff6b96" />
      <circle cx="36" cy="46" r="1.5" fill="#ff6b96" />
      <path d="M30 49 C32 51 34 51 34 49" stroke="#ff6b96" strokeWidth={1.5} fill="none" />
      <path d="M32 34 C32 22 22 18 16 22 C18 30 28 34 32 34 Z" fill="#5FD68B" />
      <path d="M32 34 C32 22 42 18 48 22 C46 30 36 34 32 34 Z" fill="#5FD68B" />
      <path d="M32 28 C32 14 32 8 32 8 C32 8 26 14 32 28 Z" fill="#7FE3A0" />
      <Glint cx={22} cy={26} rx={3} ry={1.6} />
    </>
  ),
  // 15. 招财舞 / 舞蹈
  cat_dance: (
    <>
      <circle cx="32" cy="36" r="18" fill="#FFC93C" />
      <path d="M16 20 V12 L28 8 V16 M28 8 L16 12" stroke="#FF9F5A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="38" cy="30" r="4" fill="#ff6b96" />
      <Face cx={32} cy={38} gap={5} dot={2.4} cheek={false} />
      <Glint cx={24} cy={28} rx={4} ry={2} />
    </>
  ),
  // 16. 伸懒腰
  cat_stretch: (
    <>
      <path d="M10 40 Q 24 24 54 44" stroke="#FF9F5A" strokeWidth={5} strokeLinecap="round" fill="none" />
      <circle cx="16" cy="42" r="5" fill="#FFB877" />
      <circle cx="50" cy="44" r="5" fill="#FFB877" />
      <circle cx="16" cy="41" r="1.6" fill="#FFFFFF" />
      <circle cx="50" cy="43" r="1.6" fill="#FFFFFF" />
      <path d="M52 24 L58 20 M56 30 L62 30" stroke="#FFB877" strokeWidth={2.5} strokeLinecap="round" />
      <Glint cx={14} cy={40} rx={2.5} ry={1.4} op={0.7} />
    </>
  ),
  // 17. 翻滚打滚
  cat_roll: (
    <>
      <circle cx="32" cy="32" r="22" fill="#dcecfa" stroke="#55aee0" strokeWidth={2.5} strokeDasharray="6 5" />
      <ellipse cx="32" cy="34" rx="8" ry="6" fill="#55aee0" />
      <circle cx="24" cy="24" r="3" fill="#55aee0" />
      <circle cx="32" cy="20" r="3" fill="#55aee0" />
      <circle cx="40" cy="24" r="3" fill="#55aee0" />
      <Face cx={32} cy={34} gap={3.4} dot={1.7} cheek={false} />
      <Glint cx={24} cy={26} rx={3} ry={1.6} />
    </>
  ),
  // 18. 蹭蹭卖萌
  cat_purr: (
    <>
      <path d="M16 28 L24 16 L30 26 H34 L40 16 L48 28 C52 32 52 46 32 48 C12 46 12 32 16 28 Z" fill="#FFE0EF" />
      <path d="M22 34 Q 26 38 30 34" stroke="#ff6b96" strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <path d="M34 34 Q 38 38 42 34" stroke="#ff6b96" strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <circle cx="20" cy="40" r="3.5" fill="#FF9CC4" opacity={0.8} />
      <circle cx="44" cy="40" r="3.5" fill="#FF9CC4" opacity={0.8} />
      <Glint cx={22} cy={24} rx={4} ry={2} op={0.7} />
    </>
  ),
  // 19. 拼音森林探险
  cat_pinyinquest: (
    <>
      <path d="M16 36 L24 20 L32 30 H36 L44 20 L52 36 C54 42 10 42 16 36 Z" fill="#5FD68B" strokeLinejoin="round" />
      <rect x="28" y="38" width="8" height="18" rx="3" fill="#A77B4F" />
      <path d="M24 28 Q28 25 32 28" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M32 28 Q36 25 40 28" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M30 33 Q32 36 34 33" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Glint cx={24} cy={26} rx={4} ry={2} />
    </>
  ),
  // 20. 数学城堡宝藏
  cat_mathquest: (
    <>
      <rect x="14" y="28" width="36" height="24" rx="6" fill="#FFC93C" />
      <path d="M12 28 L18 16 L26 26 H38 L46 16 L52 28 Z" fill="#FF9F5A" strokeLinejoin="round" />
      <circle cx="32" cy="38" r="4" fill="#ff6b96" />
      <rect x="29" y="36" width="6" height="2" rx="1" fill="#FFFFFF" />
      <rect x="31" y="34" width="2" height="6" rx="1" fill="#FFFFFF" />
      <Face cx={32} cy={44} gap={4} dot={2.2} cheek={false} />
      <Glint cx={22} cy={34} rx={4} ry={2} />
    </>
  ),
  // 21. 汉字古镇打工
  cat_hanziquest: (
    <>
      <rect x="16" y="16" width="32" height="38" rx="6" fill="#FFE0C2" />
      <path d="M22 16 L28 8 L34 16" fill="#FF9F5A" />
      <path d="M30 16 L36 8 L42 16" fill="#FF9F5A" />
      <path d="M26 26 H38 M26 32 H38 M26 38 H38" stroke="#FF9F5A" strokeWidth={3} strokeLinecap="round" />
      <Face cx={32} cy={46} gap={4} dot={2} cheek={false} />
      <Glint cx={22} cy={22} rx={3.5} ry={1.8} />
    </>
  ),
  // 22. 猫咪装扮试衣间标题
  cat_wardrobe: (
    <>
      <rect x="14" y="22" width="36" height="36" rx="6" fill="#E0CCFF" />
      <path d="M14 22 L22 10 L30 20 H34 L42 10 L50 22 Z" fill="#8b6ef0" strokeLinejoin="round" />
      <line x1="32" y1="22" x2="32" y2="58" stroke="#8b6ef0" strokeWidth={2} />
      <circle cx="27" cy="40" r="2.5" fill="#FFFFFF" />
      <circle cx="37" cy="40" r="2.5" fill="#FFFFFF" />
      <Glint cx={20} cy={30} rx={4} ry={2} />
    </>
  ),
  // 23. 猫咪打工庄园标题
  cat_manor: (
    <>
      <path d="M12 30 L20 14 L28 26 H36 L44 14 L52 30 Z" fill="#c2a8ef" strokeLinejoin="round" />
      <rect x="16" y="30" width="32" height="26" rx="4" fill="#d9c6f5" />
      <path d="M26 56 V42 C26 38 38 38 38 42 V56 Z" fill="#8b6ef0" />
      <Face cx={32} cy={48} gap={4} dot={2.2} cheek={false} />
      <Glint cx={22} cy={36} rx={4} ry={2} />
    </>
  ),
  // 24. 猫咪玩具箱标题
  cat_toybox: (
    <>
      <rect x="12" y="24" width="40" height="32" rx="8" fill="#FFE0EF" />
      <path d="M10 24 C10 16 26 16 32 24 C38 16 54 16 54 24 Z" fill="#ff6b96" strokeLinejoin="round" />
      <ellipse cx="32" cy="40" rx="6" ry="4.5" fill="#FFFFFF" />
      <circle cx="25" cy="34" r="2" fill="#FFFFFF" />
      <circle cx="32" cy="32" r="2" fill="#FFFFFF" />
      <circle cx="39" cy="34" r="2" fill="#FFFFFF" />
      <Glint cx={20} cy={30} rx={4} ry={2} />
    </>
  ),
};
