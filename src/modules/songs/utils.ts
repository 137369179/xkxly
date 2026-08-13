import type { NurseryRhyme } from '@/data/nurseryRhymes';
import type { Tone } from '@/lib/tones';

/** 判断儿歌是否为英文（用于切换朗读语言） */
export function isEnglishRhyme(r: NurseryRhyme): boolean {
  return /[a-zA-Z]/.test(r.lyrics[0] ?? '');
}

/**
 * 把 NurseryRhyme 的 Tone 映射到 FollowRead/KaraokeReader 支持的 5 色。
 * 'yellow' / 'orange' 统一收敛到 'amber'（色系最接近）。
 */
export function mapReaderTone(t: Tone): 'purple' | 'pink' | 'green' | 'amber' | 'blue' {
  if (t === 'yellow' || t === 'orange') return 'amber';
  return t;
}
