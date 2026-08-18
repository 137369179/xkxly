export type Tone = 'pink' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange';

export const TONES: Tone[] = ['pink', 'blue', 'yellow', 'green', 'purple', 'orange'];

interface ToneStyle {
  /** 主色 */
  main: string;
  /** 深色（按压阴影/边框） */
  deep: string;
  /** 浅色背景 */
  soft: string;
  /** 主色上的文字颜色 */
  on: string;
}

export const TONE_STYLE: Record<Tone, ToneStyle> = {
  pink: { main: '#ff6b96', deep: '#e05a80', soft: '#ffe4ee', on: '#FFFFFF' },
  blue: { main: '#55aee0', deep: '#2e93c9', soft: '#dcecfa', on: '#FFFFFF' },
  yellow: { main: '#ffc93c', deep: '#e5ac2e', soft: '#fff4d6', on: '#5a4408' },
  green: { main: '#5fd68b', deep: '#33a863', soft: '#f0faf4', on: '#FFFFFF' },
  purple: { main: '#8b6ef0', deep: '#6631c7', soft: '#ece5ff', on: '#FFFFFF' },
  orange: { main: '#ff9f5a', deep: '#c2410c', soft: '#fff3ec', on: '#FFFFFF' },
};

/** 按索引循环取色，用于列表着色 */
export function toneAt(i: number): Tone {
  return TONES[Math.abs(i) % TONES.length] ?? 'pink';
}

/** 由字符串稳定映射到一个色调（同一个字母/汉字总是同色） */
export function toneOf(key: string): Tone {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length] ?? 'pink';
}
