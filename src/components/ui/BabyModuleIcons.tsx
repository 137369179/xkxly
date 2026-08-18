import React from 'react';
import { NAV_MAP } from '@/data/nav';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { Face, Glint } from './babyIconParts';
import { PET_GLYPHS } from './petGlyphs';

/**
 * 宝贝学习乐园 · 6 岁宝宝图标系统（BabyModuleIcons）· 儿童风格精修版
 *
 * 设计原则（专为 6 岁左右宝宝，在 v1 基础上深度打磨）：
 * - 造型圆润：统一圆角方块底（rx≈25%）+ 圆角/果冻状图形，无尖角。
 * - 色彩明快：底用 tone.soft 浅色，图形用 tone.main 亮色，对比强、好认。
 * - 儿童感核心 · 拟人化：给物体加小眼睛 + 微笑 + 腮红（Face 零件），
 *   让图标变成宝宝的“朋友”，而非冷冰冰的符号——这是低龄识别与好感的关键。
 * - 玩具光泽：每个主体加一小块白色高光（Glint），像气球/塑料玩具的反光。
 * - 线条简单：1–3 个色块/路径，零渐变、零投影、无细碎爪印等纹理。
 * - 易于识别：贴近生活实物（房子、书、猫、地球…），不用抽象符号。
 *
 * 用法：<BabyIcon id="hanzi" /> —— id 与 nav.ts 的模块 id 一致。
 */

/** nav 里没有、但 FluffyIconType 仍会用到的小图标，给一个兜底色调 */
const FALLBACK_TONE: Record<string, Tone> = {
  star: 'yellow',
  heart: 'pink',
  crown: 'purple',
  book: 'purple',
  medal: 'yellow',
  box: 'pink',
  apple: 'pink',
  album: 'green',
  pet: 'pink',
  wand: 'purple',
  room: 'orange',
  storybook: 'purple',
  phonics: 'blue',
  town: 'orange',
  sight: 'blue',
  gamecenter: 'purple',
  story: 'pink',
  growth: 'green',
  content: 'purple',
};

function toneOf(id: string): Tone {
  const nav = NAV_MAP.get(id as never);
  return (nav?.tone as Tone) ?? FALLBACK_TONE[id] ?? 'pink';
}

/* ── 儿童风格可复用小零件 ─────────────────────────────────────────── */



/* ── 图形库（currentColor = tone.main 亮色，白色仅用于内部点缀/表情） ── */
const MODULE_GLYPHS: Record<string, React.ReactNode> = {
  // 首页 / 今日
  home: (
    <>
      <path d="M16 33 L32 19 L48 33 V48 H39 V38 H25 V48 H16 Z" fill="currentColor" strokeLinejoin="round" />
      <rect x="27" y="38" width="10" height="11" rx="3" fill="#FFFFFF" />
      <Glint cx={23} cy={28} rx={6} ry={3.5} />
      <Face cx={32} cy={30} gap={6} dot={3} />
    </>
  ),
  today: (
    <>
      <rect x="14" y="18" width="36" height="32" rx="9" fill="currentColor" />
      <rect x="14" y="18" width="36" height="11" rx="9" fill="#FFFFFF" opacity={0.4} />
      <path d="M24 37 L30 43 L41 30" stroke="#FFFFFF" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Glint cx={21} cy={25} rx={6} ry={3} />
    </>
  ),
  companion: (
    <>
      <rect x="20" y="22" width="24" height="24" rx="10" fill="currentColor" />
      <rect x="30" y="11" width="4" height="8" rx="2" fill="currentColor" />
      <Glint cx={26} cy={27} rx={5} ry={3} />
      <Face cx={32} cy={33} gap={6} dot={3.5} />
    </>
  ),

  // 语言学习
  letters: (
    <>
      <rect x="18" y="18" width="28" height="30" rx="9" fill="currentColor" />
      <path d="M32 24 L41 44 M23 44 L32 24 M27 36 H37" stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Glint cx={24} cy={23} rx={5} ry={3} />
    </>
  ),
  pinyin: (
    <>
      <rect x="15" y="19" width="34" height="30" rx="9" fill="currentColor" />
      <path d="M44 26 q7 -2 7 4 q0 6 -7 4" stroke="#FFFFFF" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <path d="M44 38 q7 -2 7 4 q0 6 -7 4" stroke="#FFFFFF" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <Glint cx={22} cy={24} rx={5} ry={3} />
      <Face cx={30} cy={34} gap={5.5} dot={3} />
    </>
  ),
  words: (
    <>
      <path d="M14 24 h30 a6 6 0 0 1 6 6 v11 a6 6 0 0 1 -6 6 h-17 l-7 7 v-7 h-6 a6 6 0 0 1 -6 -6 v-11 a6 6 0 0 1 6 -6 Z" fill="currentColor" />
      <Glint cx={21} cy={29} rx={6} ry={3} />
      <Face cx={31} cy={35} gap={6} dot={3} />
    </>
  ),
  hanzi: (
    <>
      <rect x="16" y="18" width="32" height="30" rx="8" fill="currentColor" />
      <rect x="30" y="18" width="4" height="30" fill="#FFFFFF" />
      <path d="M21 27 H29 M21 33 H29 M21 39 H29" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
      <Glint cx={22} cy={23} rx={5} ry={3} />
      <Face cx={38} cy={33} gap={5} dot={2.6} />
      {/* 微叙事：上方毛笔点 */}
      <circle cx="22" cy="13" r="1.6" fill="#FFFFFF" opacity={0.75} />
      <circle cx="42" cy="12" r="1.6" fill="#FFFFFF" opacity={0.75} />
      <circle cx="32" cy="9" r="1.3" fill="#FFFFFF" opacity={0.6} />
    </>
  ),
  'hanzi-listen': (
    <>
      <circle cx="23" cy="33" r="7" fill="currentColor" />
      <path d="M32 23 a12 12 0 0 1 0 20" stroke="currentColor" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M39 16 a20 20 0 0 1 0 33" stroke="currentColor" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Glint cx={20} cy={29} rx={4} ry={2.5} />
      <Face cx={23} cy={34} gap={4} dot={2.6} cheek={false} />
    </>
  ),
  phonics: (
    <>
      <circle cx="23" cy="33" r="7" fill="currentColor" />
      <path d="M32 23 a12 12 0 0 1 0 20" stroke="currentColor" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M39 16 a20 20 0 0 1 0 33" stroke="currentColor" strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M47 27 q5 -1 5 4 q0 5 -5 3" stroke="#FFFFFF" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <Glint cx={20} cy={29} rx={4} ry={2.5} />
      <Face cx={23} cy={34} gap={4} dot={2.6} cheek={false} />
    </>
  ),

  // 数理 / 逻辑
  numbers: (
    <>
      <rect x="16" y="20" width="14" height="14" rx="5" fill="currentColor" />
      <rect x="25" y="27" width="14" height="14" rx="5" fill="currentColor" />
      <rect x="34" y="34" width="14" height="14" rx="5" fill="currentColor" />
      <Glint cx={20} cy={24} rx={4} ry={2.5} />
      <Face cx={41} cy={41} gap={3.8} dot={2.4} />
    </>
  ),
  logic: (
    <path d="M20 15 h9 a4 4 0 0 1 8 0 h9 a6 6 0 0 1 0 12 a6 6 0 0 1 0 12 h-9 a4 4 0 0 1 -8 0 v-9 h-9 a6 6 0 0 1 0 -12 a6 6 0 0 1 0 -12 Z" fill="currentColor" strokeLinejoin="round" />
  ),
  wrongbook: (
    <>
      <rect x="16" y="18" width="32" height="30" rx="8" fill="currentColor" />
      <path d="M25 27 L39 41 M39 27 L25 41" stroke="#FFFFFF" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Glint cx={22} cy={23} rx={5} ry={3} />
    </>
  ),

  // 故事 / 绘本 / 成语
  storybook: (
    <>
      <path d="M13 22 C20 18 27 18 32 22 C37 18 44 18 51 22 V46 C44 42 37 42 32 46 C27 42 20 42 13 46 Z" fill="currentColor" strokeLinejoin="round" />
      <path d="M32 22 V46" stroke="#FFFFFF" strokeWidth={3} />
      <path d="M18 28 H28 M18 34 H28 M36 28 H46 M36 34 H46" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" />
      <Glint cx={19} cy={26} rx={4} ry={2.5} />
      <Face cx={32} cy={36} gap={5} dot={2.4} cheek={false} />
    </>
  ),
  story: (
    <>
      <rect x="16" y="40" width="32" height="6" rx="3" fill="currentColor" />
      <rect x="19" y="32" width="27" height="6" rx="3" fill="currentColor" />
      <rect x="22" y="24" width="22" height="6" rx="3" fill="currentColor" />
      <Glint cx={22} cy={27} rx={4} ry={2.2} />
      <Face cx={38} cy={43} gap={4} dot={2.4} />
    </>
  ),
  idioms: (
    <>
      <rect x="18" y="20" width="28" height="28" rx="8" fill="currentColor" />
      <rect x="13" y="17" width="9" height="34" rx="4" fill="currentColor" />
      <rect x="42" y="17" width="9" height="34" rx="4" fill="currentColor" />
      <path d="M24 29 H40 M24 35 H40" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
      <Glint cx={23} cy={24} rx={5} ry={3} />
    </>
  ),
  poems: (
    <>
      <circle cx="32" cy="25" r="7" fill="currentColor" />
      <circle cx="20" cy="32" r="7" fill="currentColor" />
      <circle cx="44" cy="32" r="7" fill="currentColor" />
      <circle cx="26" cy="42" r="7" fill="currentColor" />
      <circle cx="38" cy="42" r="7" fill="currentColor" />
      <circle cx="32" cy="33" r="6" fill="#FFFFFF" />
      <Glint cx={18} cy={29} rx={3} ry={2} op={0.5} />
    </>
  ),

  // 百科 / 音乐 / 艺术 / 安全 / 地理 / 交通 / 节气 / 植物
  science: (
    <>
      <path d="M21 46 C21 27 41 20 48 20 C48 39 33 47 21 46 Z" fill="currentColor" strokeLinejoin="round" />
      <path d="M26 42 C33 36 40 30 46 26" stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Glint cx={26} cy={28} rx={5} ry={3} op={0.45} />
      <Face cx={33} cy={38} gap={5.5} dot={3} />
      {/* 微叙事：上方小气泡 */}
      <circle cx="34" cy="11" r="1.8" fill="#FFFFFF" opacity={0.7} />
      <circle cx="42" cy="7" r="1.3" fill="#FFFFFF" opacity={0.6} />
      <circle cx="38" cy="15" r="1.1" fill="#FFFFFF" opacity={0.5} />
    </>
  ),
  songs: (
    <>
      <path d="M27 16 L46 12 V22 L33 25 V43 a7 7 0 1 1 -6 -7 L27 20 Z" fill="currentColor" strokeLinejoin="round" />
      <Glint cx={30} cy={20} rx={3.5} ry={2} op={0.5} />
      <Face cx={30} cy={37} gap={3.6} dot={2.4} cheek={false} />
    </>
  ),
  music: (
    <>
      <rect x="13" y="27" width="38" height="20" rx="8" fill="currentColor" />
      <rect x="19" y="27" width="3" height="11" fill="#FFFFFF" />
      <rect x="27" y="27" width="3" height="11" fill="#FFFFFF" />
      <rect x="35" y="27" width="3" height="11" fill="#FFFFFF" />
      <rect x="43" y="27" width="3" height="11" fill="#FFFFFF" />
      <Glint cx={19} cy={31} rx={5} ry={2.5} />
      <Face cx={32} cy={37} gap={5} dot={2.4} cheek={false} />
      {/* 微叙事：上方两个小音符 */}
      <circle cx="18" cy="14" r="2.2" fill="#FFFFFF" opacity={0.85} />
      <rect x="19.6" y="9" width="1.5" height="6" fill="#FFFFFF" opacity={0.85} />
      <circle cx="42" cy="18" r="1.8" fill="#FFFFFF" opacity={0.75} />
      <rect x="43.4" y="14" width="1.3" height="5" fill="#FFFFFF" opacity={0.75} />
    </>
  ),
  art: (
    <>
      <path d="M32 13 a19 19 0 1 0 17 27 a13 13 0 0 1 -17 -9 a7 7 0 0 1 5 -11 a5 5 0 0 1 7 -2 a16 16 0 0 0 -12 -5 Z" fill="currentColor" strokeLinejoin="round" />
      <circle cx="26" cy="27" r="3" fill="#FFFFFF" />
      <circle cx="38" cy="24" r="3" fill="#FFFFFF" />
      <circle cx="42" cy="34" r="3" fill="#FFFFFF" />
      <circle cx="29" cy="40" r="3" fill="#FFFFFF" />
      <Glint cx={23} cy={23} rx={4} ry={2.5} op={0.5} />
      <Face cx={32} cy={34} gap={5} dot={2.4} cheek={false} />
    </>
  ),
  safety: (
    <>
      <path d="M32 11 L51 20 V35 C51 45 42 51 32 55 C22 51 13 45 13 35 V20 Z" fill="currentColor" strokeLinejoin="round" />
      <path d="M32 23 h5 v5 h5 v5 h-5 v5 h-5 v-5 h-5 v-5 h5 Z" fill="#FFFFFF" />
      <Glint cx={20} cy={24} rx={4} ry={2.5} op={0.4} />
      <Face cx={32} cy={42} gap={5} dot={2.6} cheek={false} />
    </>
  ),
  geography: (
    <>
      <circle cx="32" cy="32" r="19" fill="currentColor" />
      <ellipse cx="32" cy="32" rx="7" ry="19" fill="#FFFFFF" opacity={0.45} />
      <path d="M13 26 H51 M13 38 H51" stroke="#FFFFFF" strokeWidth={3} opacity={0.45} />
      <Glint cx={24} cy={24} rx={5} ry={3} op={0.5} />
      <Face cx={32} cy={33} gap={6} dot={3} />
      {/* 微叙事：上方小飞机 */}
      <ellipse cx="32" cy="9" rx="9" ry="2" fill="#FFFFFF" opacity={0.8} />
      <ellipse cx="32" cy="9" rx="2.5" ry="4" fill="#FFFFFF" opacity={0.8} />
    </>
  ),
  vehicles: (
    <>
      <rect x="13" y="23" width="38" height="23" rx="10" fill="currentColor" />
      <rect x="18" y="28" width="10" height="9" rx="2.5" fill="#FFFFFF" />
      <rect x="36" y="28" width="10" height="9" rx="2.5" fill="#FFFFFF" />
      <circle cx="22" cy="48" r="3.5" fill="currentColor" />
      <circle cx="42" cy="48" r="3.5" fill="currentColor" />
      <Glint cx={19} cy={27} rx={5} ry={2.5} />
      <Face cx={32} cy={42} gap={5} dot={2.6} cheek={false} />
      {/* 微叙事：左侧速度线 */}
      <path d="M5 30 H10" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <path d="M3 38 H9" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <path d="M6 46 H11" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
    </>
  ),
  festivals: (
    <>
      <rect x="30" y="13" width="4" height="7" fill="currentColor" />
      <ellipse cx="32" cy="34" rx="15" ry="17" fill="currentColor" />
      <rect x="21" y="32" width="22" height="4" rx="2" fill="#FFFFFF" opacity={0.6} />
      <path d="M26 51 L32 57 L38 51" stroke="currentColor" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Glint cx={25} cy={28} rx={4} ry={2.5} op={0.5} />
      <Face cx={32} cy={36} gap={5.5} dot={3} />
    </>
  ),
  plants: (
    <>
      <path d="M32 47 V31" stroke="currentColor" strokeWidth={4} strokeLinecap="round" fill="none" />
      <path d="M32 35 C24 35 18 29 18 21 C28 21 34 27 32 35 Z" fill="currentColor" />
      <path d="M32 33 C40 33 46 27 46 19 C36 19 30 25 32 33 Z" fill="currentColor" />
      <Glint cx={22} cy={24} rx={3.5} ry={2} op={0.5} />
      <Face cx={32} cy={41} gap={4.5} dot={2.6} />
      {/* 微叙事：上方两滴小雨 */}
      <path d="M22 13 Q18 17 22 18 Q26 17 22 13 Z" fill="#FFFFFF" opacity={0.78} />
      <path d="M42 11 Q38 15 42 16 Q46 15 42 11 Z" fill="#FFFFFF" opacity={0.72} />
    </>
  ),

  // 养猫 / 写实猫
  'cat_house': (
    <>
      <path d="M17 27 L23 14 L32 25 H32 L41 14 L47 27 C51 31 51 47 32 49 C13 47 13 31 17 27 Z" fill="currentColor" strokeLinejoin="round" />
      {/* 眨眼：左眼闭合 + 右眼睁开，保留可爱小嘴 */}
      <path d="M23 35 Q26 38 29 35" stroke="#FFFFFF" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <circle cx="38" cy="35" r="3.2" fill="#FFFFFF" />
      <path d="M28 43 Q32 46 36 43" stroke="#FFFFFF" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <circle cx={20} cy={39} r={2.6} fill="#FFFFFF" opacity={0.55} />
      <circle cx={44} cy={39} r={2.6} fill="#FFFFFF" opacity={0.55} />
      <Glint cx={22} cy={24} rx={4} ry={2.5} op={0.4} />
    </>
  ),
  'realistic_cat': (
    <>
      <path d="M17 27 L23 14 L32 25 H32 L41 14 L47 27 C51 31 51 47 32 49 C13 47 13 31 17 27 Z" fill="currentColor" strokeLinejoin="round" />
      <circle cx="26" cy="35" r="3.2" fill="#FFFFFF" />
      <circle cx="38" cy="35" r="3.2" fill="#FFFFFF" />
      <path d="M28 43 Q32 46 36 43" stroke="#FFFFFF" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <path d="M32 30 l2 4 l-4 0 Z" fill="#FFFFFF" />
      <Glint cx={22} cy={24} rx={4} ry={2.5} op={0.4} />
    </>
  ),

  // 游戏 / 冒险 / 成长 / 内容 / 研究
  gamecenter: (
    <>
      <rect x="13" y="25" width="38" height="21" rx="10" fill="currentColor" />
      <circle cx={24} cy={36} r={3} fill="#FFFFFF" />
      <circle cx={30} cy={36} r={3} fill="#FFFFFF" />
      <path d="M40 31 v10 M35 36 h10" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
      <Glint cx={19} cy={29} rx={5} ry={2.5} />
      <Face cx={32} cy={32} gap={0} dot={0} smile={false} cheek={false} />
    </>
  ),
  fun: (
    <>
      <circle cx="32" cy="32" r="19" fill="currentColor" />
      <circle cx="25" cy="28" r="3" fill="#FFFFFF" />
      <circle cx="39" cy="28" r="3" fill="#FFFFFF" />
      <path d="M24 38 Q32 47 40 38" stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Glint cx={24} cy={24} rx={5} ry={3} op={0.5} />
    </>
  ),
  adventure: (
    <>
      <rect x="22" y="13" width="5" height="41" rx="2.5" fill="currentColor" />
      <path d="M27 15 L47 15 L41 26 L47 37 L27 37 Z" fill="currentColor" strokeLinejoin="round" />
      <Glint cx={31} cy={19} rx={4} ry={2} op={0.5} />
      <Face cx={35} cy={26} gap={4.5} dot={2.4} />
    </>
  ),
  growth: (
    <>
      <path d="M24 16 H40 V27 C40 35 34 39 32 39 H32 C30 39 24 35 24 27 Z" fill="currentColor" />
      <rect x="30" y="39" width="4" height="8" fill="currentColor" />
      <rect x="22" y="47" width="20" height="4" rx="2" fill="currentColor" />
      <path d="M24 18 C16 18 16 29 24 29" stroke="currentColor" strokeWidth={3} fill="none" />
      <path d="M40 18 C48 18 48 29 40 29" stroke="currentColor" strokeWidth={3} fill="none" />
      <Glint cx={28} cy={21} rx={4} ry={2.5} op={0.4} />
      <Face cx={32} cy={26} gap={4} dot={2.4} cheek={false} />
    </>
  ),
  content: (
    <path d="M32 13 L36 28 L51 32 L36 36 L32 51 L28 36 L13 32 L28 28 Z" fill="currentColor" strokeLinejoin="round" />
  ),
  research: (
    <>
      <circle cx="28" cy="28" r="12" fill="currentColor" />
      <circle cx="28" cy="28" r="5" fill="#FFFFFF" />
      <path d="M37 37 L48 48" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
      <Glint cx={23} cy={23} rx={4} ry={2.5} op={0.5} />
      <Face cx={28} cy={28} gap={0} dot={0} smile={false} cheek={false} />
    </>
  ),

  // 奖励 / 护照 / 家长
  rewards: (
    <>
      <rect x="18" y="30" width="28" height="21" rx="6" fill="currentColor" />
      <rect x="14" y="24" width="36" height="8" rx="4" fill="currentColor" />
      <rect x="29" y="24" width="6" height="27" fill="#FFFFFF" />
      <circle cx="32" cy="22" r="5" fill="#FFFFFF" />
      <Glint cx={20} cy={27} rx={4} ry={2.5} op={0.4} />
      <Face cx={32} cy={39} gap={5} dot={2.6} />
    </>
  ),
  passport: (
    <>
      <rect x="18" y="17" width="28" height="31" rx="7" fill="currentColor" />
      <rect x="18" y="17" width="10" height="31" rx="7" fill="#FFFFFF" opacity={0.35} />
      <circle cx="38" cy="33" r="7" fill="#FFFFFF" />
      <Glint cx={31} cy={23} rx={4} ry={2.5} op={0.4} />
      <Face cx={38} cy={33} gap={0} dot={0} smile={false} cheek={false} />
    </>
  ),
  parent: (
    <path d="M32 51 C32 51 16 39 16 27 C16 20 22 17 27 20 C31 23 32 23 32 23 C32 23 33 23 37 20 C42 17 48 20 48 27 C48 39 32 51 32 51 Z" fill="currentColor" strokeLinejoin="round" />
  ),

  // 通用小图标
  apple: (
    <>
      <path d="M32 24 C30 18 24 16 20 20 C14 26 16 40 24 47 C28 50 36 50 40 47 C48 40 50 26 44 20 C40 16 34 18 32 24 Z" fill="#ff5c7a" strokeLinejoin="round" />
      <path d="M32 24 C32 20 33 17 36 15" stroke="#7A4A2B" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <path d="M34 22 C37 15 45 15 46 21 C43 25 36 25 34 22 Z" fill="#5FB36A" />
      <Glint cx={24} cy={30} rx={4} ry={2.5} op={0.5} />
      <Face cx={32} cy={38} gap={5} dot={2.6} />
    </>
  ),
  star: (
    <>
      <path d="M32 13 L39 27 L54 29 L43 39 L46 54 L32 46 L18 54 L21 39 L10 29 L25 27 Z" fill="currentColor" strokeLinejoin="round" />
      <Glint cx={25} cy={25} rx={4} ry={2.5} op={0.4} />
      <Face cx={34} cy={35} gap={5} dot={2.6} mood="sleepy" />
    </>
  ),
  heart: (
    <>
      <path d="M32 51 C32 51 16 39 16 27 C16 20 22 17 27 20 C31 23 32 23 32 23 C32 23 33 23 37 20 C42 17 48 20 48 27 C48 39 32 51 32 51 Z" fill="currentColor" strokeLinejoin="round" />
      <Glint cx={24} cy={27} rx={4} ry={2.5} op={0.4} />
      <Face cx={32} cy={33} gap={5} dot={2.6} />
    </>
  ),
  crown: (
    <>
      <path d="M16 45 L16 24 L26 35 L32 17 L38 35 L48 24 L48 45 Z" fill="currentColor" strokeLinejoin="round" />
      <rect x="16" y="45" width="32" height="6" rx="3" fill="currentColor" />
      <Glint cx={21} cy={28} rx={4} ry={2} op={0.4} />
      <Face cx={32} cy={38} gap={5} dot={2.4} mood="shy" />
    </>
  ),
  book: (
    <>
      <path d="M13 22 C20 18 27 18 32 22 C37 18 44 18 51 22 V46 C44 42 37 42 32 46 C27 42 20 42 13 46 Z" fill="currentColor" strokeLinejoin="round" />
      <Glint cx={19} cy={26} rx={4} ry={2.5} />
      <Face cx={32} cy={35} gap={5} dot={2.4} cheek={false} />
    </>
  ),
  medal: (
    <>
      <circle cx="32" cy="37" r="14" fill="currentColor" />
      <circle cx="32" cy="37" r="6" fill="#FFFFFF" />
      <path d="M24 15 L28 31 L36 31 L40 15 Z" fill="currentColor" />
      <Glint cx={26} cy={32} rx={4} ry={2.5} op={0.5} />
      <Face cx={32} cy={37} gap={0} dot={0} smile={false} cheek={false} />
    </>
  ),
  box: (
    <>
      <rect x="16" y="24" width="32" height="27" rx="7" fill="currentColor" />
      <rect x="14" y="20" width="36" height="8" rx="4" fill="currentColor" />
      <Glint cx={20} cy={24} rx={5} ry={2.5} />
      <Face cx={32} cy={38} gap={5} dot={2.6} />
    </>
  ),
  album: (
    <>
      <rect x="16" y="19" width="32" height="29" rx="7" fill="currentColor" />
      <circle cx="26" cy="30" r="4" fill="#FFFFFF" />
      <path d="M18 45 L28 35 L36 43 L42 37 L46 45 Z" fill="#FFFFFF" />
      <Glint cx={21} cy={23} rx={4} ry={2.5} />
      <Face cx={38} cy={33} gap={4} dot={2.4} cheek={false} />
    </>
  ),
  pet: (
    <>
      <ellipse cx="32" cy="41" rx="12" ry="9" fill="currentColor" />
      <circle cx="22" cy="30" r="4" fill="currentColor" />
      <circle cx="32" cy="26" r="4" fill="currentColor" />
      <circle cx="42" cy="30" r="4" fill="currentColor" />
      <Glint cx={28} cy={38} rx={4} ry={2} op={0.5} />
      <Face cx={32} cy={42} gap={4} dot={2.4} cheek={false} />
    </>
  ),
  wand: (
    <>
      <path d="M20 45 L41 24" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
      <path d="M40 15 L43 24 L52 27 L43 30 L40 39 L37 30 L28 27 L37 24 Z" fill="currentColor" strokeLinejoin="round" />
      <Glint cx={40} cy={22} rx={3} ry={2} op={0.5} />
    </>
  ),
  room: (
    <path d="M14 30 L32 16 L50 30 V48 H42 V36 H22 V48 H14 Z" fill="currentColor" strokeLinejoin="round" />
  ),
  town: (
    <>
      <rect x="16" y="30" width="13" height="20" rx="4" fill="currentColor" />
      <rect x="32" y="22" width="16" height="28" rx="4" fill="currentColor" />
      <rect x="20" y="36" width="5" height="5" fill="#FFFFFF" />
      <rect x="36" y="30" width="5" height="5" fill="#FFFFFF" />
      <rect x="43" y="30" width="5" height="5" fill="#FFFFFF" />
      <Glint cx={35} cy={26} rx={4} ry={2.5} />
      <Face cx={40} cy={37} gap={4} dot={2.4} />
    </>
  ),
  sight: (
    <>
      <path d="M13 32 C24 20 40 20 51 32 C40 44 24 44 13 32 Z" fill="currentColor" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="7" fill="#FFFFFF" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
      <Glint cx={22} cy={26} rx={4} ry={2} op={0.5} />
    </>
  ),
};

/** 合并主系统模块图标 + 宠物图标，形成全站单一图标注册表 */
const GLYPHS: Record<string, React.ReactNode> = {
  ...MODULE_GLYPHS,
  ...PET_GLYPHS,
};

export interface BabyIconProps {
  id: string;
  size?: number;
  className?: string;
  /** bare：不加圆角软底，用于多彩独立插画（如宠物图标） */
  bare?: boolean;
}

/** 统一的宝宝图标：圆角浅色底 + 高识别亮色图形 + 儿童表情/光泽 */
export const BabyIcon: React.FC<BabyIconProps> = ({ id, size = 48, className = '', bare = false }) => {
  const tone = toneOf(id);
  const t = TONE_STYLE[tone];
  const glyph = GLYPHS[id] ?? GLYPHS.star;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: t.main }}
    >
      {!bare && <rect x="6" y="6" width="52" height="52" rx="16" fill={t.soft} />}
      <g>{glyph}</g>
    </svg>
  );
};

export default BabyIcon;
