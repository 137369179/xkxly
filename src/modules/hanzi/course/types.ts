/**
 * 洪恩级五步闭环识字课程类型系统 (Hanzi 5-Step Literacy Course Types)
 * ------------------------------------------------------------
 * 玩 (play) -> 认 (recognize) -> 练 (practice) -> 写 (write) -> 说 (speak)
 */

import type { HanziEntry } from '@/data/hanzi';

export type HanziCourseStep = 'play' | 'recognize' | 'practice' | 'write' | 'speak';

export interface StepConfig {
  id: HanziCourseStep;
  titleKey: string;
  emoji: string;
  descKey: string;
  bgGradient: string;
}

export const COURSE_STEPS: StepConfig[] = [
  { id: 'play', titleKey: '玩·象形演变', emoji: '🎬', descKey: '看动画，探寻汉字秘密', bgGradient: 'from-amber-400 to-orange-500' },
  { id: 'recognize', titleKey: '认·字音字理', emoji: '💡', descKey: '读拼音，拆部件明字理', bgGradient: 'from-sky-400 to-blue-500' },
  { id: 'practice', titleKey: '练·趣味过关', emoji: '🎯', descKey: '玩游戏，多维巩固记忆', bgGradient: 'from-emerald-400 to-teal-500' },
  { id: 'write', titleKey: '写·笔顺描红', emoji: '✍️', descKey: '按笔顺，规范工整临摹', bgGradient: 'from-purple-400 to-indigo-500' },
  { id: 'speak', titleKey: '说·大声朗读', emoji: '🗣️', descKey: '大声读，AI 伴学正音', bgGradient: 'from-pink-400 to-rose-500' },
];

export interface StepResult {
  step: HanziCourseStep;
  stars: number;
  completed: boolean;
  score?: number;
  audioBlobUrl?: string;
}

export interface CourseSessionState {
  char: HanziEntry;
  currentStepIndex: number;
  results: Record<HanziCourseStep, StepResult>;
  totalStarsEarned: number;
  totalFishEarned: number;
  isFinished: boolean;
}
