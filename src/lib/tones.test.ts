import { describe, it, expect } from 'vitest';
import { TONE_STYLE, TONES, type Tone } from './tones';

/** WCAG 相对亮度 */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
/** WCAG 对比度 ratio */
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

describe('TONE_STYLE 主按钮对比度（P1-6）', () => {
  it('实心按钮前景(on)叠背景(main)对比度 ≥ 3:1', () => {
    for (const tone of TONES as Tone[]) {
      const style = TONE_STYLE[tone];
      const ratio = contrast(style.main, style.on);
      // eslint-disable-next-line no-console
      expect(ratio, `${tone}: on=${style.on} on main=${style.main} → ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    }
  });
});