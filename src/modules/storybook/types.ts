import type { Tone } from '@/lib/tones';
import type { StoryBookData } from '@/lib/ai/prompts';

export type StorybookTheme = 'animals' | 'space' | 'princess' | 'dinosaur' | 'ocean' | 'forest';
export type StorybookStyle = 'warm' | 'adventure' | 'funny';

export interface ThemePreset {
  id: StorybookTheme;
  label: string;
  emoji: string;
  tone: Tone;
  characters: string[];
  sceneEmojis: string[];
  bgGradient: string;
}

export interface StylePreset {
  id: StorybookStyle;
  label: string;
  emoji: string;
  desc: string;
  promptHint: string;
}

export interface SavedStorybook {
  id: string;
  /** 完整内容（P1-10 迁移后存 IndexedDB，progress 中不再携带以控制 localStorage 体积；
   *  老数据（迁移前）仍在 progress 内，读取方以 title/data 双路兼容） */
  data?: StoryBookData;
  /** 反规范化标题（封面/列表展示用，避免读取重数据） */
  title?: string;
  theme: StorybookTheme;
  style: StorybookStyle;
  character: string;
  createdAt: number;
  readCount: number;
  /** P1-收尾：是否已收藏（故事馆筛选用，老数据缺省 false） */
  favorite?: boolean;
}

export type { StoryBookData };
