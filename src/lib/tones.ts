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
  // 儿童风格设计系统 v1（对标帮帮识字/洪恩识字/宝宝巴士）：高饱和卡通 main 色
  // 不承载白字（实测仅 1.6-2.9:1），main 用深 on 字、deep 承载白字，双通道均 ≥4.5:1。
  // 色值经 WCAG 相对亮度公式逐对验算（见 docs/2026-08-28-儿童风格设计系统规范.md）。
  pink: { main: '#FF5C8A', deep: '#C9285C', soft: '#FFE1EB', on: '#3D1424' },
  blue: { main: '#3D9BFF', deep: '#0B5EC9', soft: '#DCEBFF', on: '#0C2D4F' },
  yellow: { main: '#FFC53D', deep: '#8A5B00', soft: '#FFF6D9', on: '#4A2B1F' },
  green: { main: '#3FC26B', deep: '#1B7A3D', soft: '#DFF5E7', on: '#123B21' },
  purple: { main: '#8F5BFF', deep: '#5F2ECC', soft: '#EFE4FF', on: '#160830' },
  orange: { main: '#FF9F2E', deep: '#B45F09', soft: '#FFF0DB', on: '#4A2B1F' },
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
