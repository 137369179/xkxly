import { useState, useEffect } from 'react';
import type { FC } from 'react';
import {
  CatCrownIcon,
  CatGlassesIcon,
  CatBowIcon,
  CatTieIcon,
  CatBedIcon,
  CatPinyinQuestIcon,
  CatMathQuestIcon,
  CatHanziQuestIcon,
} from '@/modules/pet/PetIcons';

export type CatAction = 'idle' | 'dance' | 'stretch' | 'roll' | 'jump' | 'purr';

export interface Outfit {
  id: string;
  name: string;
  icon: FC<{ size?: number; className?: string }>;
  type: 'hat' | 'neck' | 'decor';
  cost: number;
  emoji: string;
}

export const OUTFITS: Outfit[] = [
  { id: 'crown', name: 'pet.crown', icon: CatCrownIcon, type: 'hat', cost: 10, emoji: '👑' },
  { id: 'glasses', name: 'pet.glasses', icon: CatGlassesIcon, type: 'hat', cost: 5, emoji: '👓' },
  { id: 'bow', name: 'pet.bow', icon: CatBowIcon, type: 'neck', cost: 5, emoji: '🎀' },
  { id: 'tie', name: 'pet.tie', icon: CatTieIcon, type: 'neck', cost: 8, emoji: '👔' },
  { id: 'bed', name: 'pet.bed', icon: CatBedIcon, type: 'decor', cost: 12, emoji: '🛏️' },
];

/** 猫咪动作 → 统一羊毛毡图片映射 */
export const ACTION_IMG: Record<CatAction, string> = {
  idle: '/cat/cat-idle-default.jpg',
  dance: '/cat/cat-dance-celebrate.jpg',
  stretch: '/cat/cat-stretch-yoga.jpg',
  roll: '/cat/cat-roll-playful.jpg',
  jump: '/cat/cat-jump-excited.jpg',
  purr: '/cat/cat-purr-love.jpg',
};

/** 猫咪进化等级 → 统一羊毛毡图片映射 */
export const EVOLVE_IMG: Record<number, string> = {
  1: '/cat/cat-evolve-level1.jpg',
  2: '/cat/cat-evolve-level2.jpg',
  3: '/cat/cat-evolve-level3.jpg',
  4: '/cat/cat-evolve-level4.jpg',
};

/** 进化等级标题和描述 */
export const EVOLVE_INFO: Record<number, { title: string; desc: string; emoji: string }> = {
  1: { title: 'pet.evolve1Title', desc: 'pet.evolve1Desc', emoji: '🍼' },
  2: { title: 'pet.evolve2Title', desc: 'pet.evolve2Desc', emoji: '🧣' },
  3: { title: 'pet.evolve3Title', desc: 'pet.evolve3Desc', emoji: '📖' },
  4: { title: 'pet.evolve4Title', desc: 'pet.evolve4Desc', emoji: '👑' },
};

export const EMPTY_OUTFITS: Record<string, string> = Object.freeze({});
export const EMPTY_UNLOCKED: readonly string[] = Object.freeze([]);
export const EMPTY_QUESTS: readonly { id: string; name: string; endAt: number; reward: number }[] = Object.freeze([]);
export const EMPTY_MASTERY: Readonly<Record<string, any>> = Object.freeze({});

/** 探险任务配置（id 唯一，用于 store 中去重） */
export interface QuestConfig {
  id: string;
  name: string;
  durationSec: number;
  reward: number;
  Icon: FC<{ size?: number; className?: string }>;
}

export const QUESTS: QuestConfig[] = [
  { id: 'pinyin', name: 'pet.questPinyin', durationSec: 30, reward: 10, Icon: CatPinyinQuestIcon },
  { id: 'math', name: 'pet.questMath', durationSec: 60, reward: 25, Icon: CatMathQuestIcon },
  { id: 'hanzi', name: 'pet.questHanzi', durationSec: 90, reward: 40, Icon: CatHanziQuestIcon },
];

/** 进化阈值：每个等级升级所需的星星 + 亲密度（与 store.evolveCat 保持一致） */
export const EVOLVE_THRESHOLDS: Record<number, { stars: number; affection: number; title: string }> = {
  1: { stars: 50, affection: 50, title: 'pet.evolve1to2' },
  2: { stars: 200, affection: 80, title: 'pet.evolve2to3' },
  3: { stars: 500, affection: 100, title: 'pet.evolve3to4' },
};

/** 场景氛围 → 主舞台 Panel 背景/边框组合（提到模块级，避免每次渲染重建） */
export const STAGE_THEME: Record<'sunlight' | 'nebula' | 'starry', { panel: string; frame: string; glow: string }> = {
  nebula: {
    panel: 'border-2 border-pink-300 bg-gradient-to-tr from-fuchsia-50 via-pink-50 to-violet-50',
    frame: 'border-fuchsia-400 shadow-[0_10px_40px_-10px_rgba(217,70,239,0.55)]',
    glow: 'radial-gradient(circle at 50% 30%, rgba(244,114,182,0.35), transparent 65%)',
  },
  sunlight: {
    panel: 'border-2 border-amber-300 bg-gradient-to-tr from-amber-50 via-yellow-50 to-orange-50',
    frame: 'border-orange-400 shadow-[0_10px_40px_-10px_rgba(251,146,60,0.6)]',
    glow: 'radial-gradient(circle at 30% 20%, rgba(253,224,71,0.45), transparent 65%)',
  },
  starry: {
    panel: 'border-2 border-indigo-300 bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900 text-white',
    frame: 'border-indigo-400 shadow-[0_10px_40px_-10px_rgba(99,102,241,0.7)]',
    glow: 'radial-gradient(circle at 70% 20%, rgba(129,140,248,0.55), transparent 65%)',
  },
};

/** 把秒数格式化为 m:ss */
export function formatDuration(sec: number, t: (k: string, p?: Record<string, string | number>) => string): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? t('pet.minSec', { m, s }) : t('pet.sec', { s });
}

/** 探险倒计时 hook：返回剩余秒数（每秒刷新） */
export function useCountdown(endAt: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endAt]);
  if (!endAt) return 0;
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}
