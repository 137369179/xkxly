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
  pink: { main: '#FF6FA5', deep: '#D9457B', soft: '#FFE4EF', on: '#FFFFFF' },
  blue: { main: '#4FC3F7', deep: '#2196C9', soft: '#DDF2FD', on: '#FFFFFF' },
  yellow: { main: '#FFC93C', deep: '#D99C0E', soft: '#FFF3D2', on: '#5A4408' },
  green: { main: '#5FD68B', deep: '#33A863', soft: '#DDF7E7', on: '#FFFFFF' },
  purple: { main: '#A78BFA', deep: '#7B57E8', soft: '#ECE5FF', on: '#FFFFFF' },
  orange: { main: '#FF9F5A', deep: '#E0742B', soft: '#FFEBDB', on: '#FFFFFF' },
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
