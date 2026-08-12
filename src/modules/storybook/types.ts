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
  data: StoryBookData;
  theme: StorybookTheme;
  style: StorybookStyle;
  character: string;
  createdAt: number;
  readCount: number;
  /** P1-收尾：是否已收藏（故事馆筛选用，老数据缺省 false） */
  favorite?: boolean;
}

export type { StoryBookData };
