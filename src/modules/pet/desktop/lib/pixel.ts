/**
 * 拼豆像素宠物（纯逻辑，可单测）
 * 网格用「调色板索引」存储；支持序列化/反序列化/校验/预设模板。
 */
import { PALETTE } from '../data';

export const PIXEL_W = 16;
export const PIXEL_H = 12;

export type PixelGrid = number[]; // 长 PIXEL_W*PIXEL_H，每格是 PALETTE 索引（-1=空）

export function blankGrid(w = PIXEL_W, h = PIXEL_H): PixelGrid {
  return new Array(w * h).fill(-1);
}

export function paletteAt(idx: number): string {
  return PALETTE[idx] ?? '#ffffff';
}

/** 从「颜色 hex」得到调色板索引；不在 51 色内返回 -1 */
export function colorIndex(hex: string): number {
  const c = hex.toLowerCase();
  return PALETTE.findIndex((p) => p.toLowerCase() === c);
}

/** 序列化：'w,h;idx,...' 便于存 localStorage */
export function serialize(grid: PixelGrid, w = PIXEL_W, h = PIXEL_H): string {
  return `${w},${h};${grid.join(',')}`;
}

/** 反序列化；格式非法或尺寸越界返回 null */
export function parse(data: string): { w: number; h: number; grid: PixelGrid } | null {
  const [meta, body] = data.split(';');
  if (!meta || body == null) return null;
  const parts = meta.split(',').map(Number);
  const w = parts[0];
  const h = parts[1];
  if (w == null || h == null) return null;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0 || w * h > 4096) return null;
  const cells = body.split(',').map(Number);
  if (cells.length !== w * h) return null;
  return { w, h, grid: cells };
}

/** 校验格内索引都在调色板范围内 */
export function validGrid(grid: PixelGrid): boolean {
  return grid.every((v) => v === -1 || (Number.isInteger(v) && v >= 0 && v < PALETTE.length));
}

/** 应用到宠物外观：返回是否发生可见变化（有任一非空格） */
export function hasContent(grid: PixelGrid): boolean {
  return grid.some((v) => v !== -1);
}

export interface PixelPreset {
  id: string;
  name: string;
  emoji: string;
  grid: PixelGrid;
}

export function createPresetGrid(pattern: string[]): PixelGrid {
  const grid = blankGrid();
  pattern.forEach((row, r) => {
    if (r >= PIXEL_H) return;
    for (let c = 0; c < Math.min(row.length, PIXEL_W); c++) {
      const ch = row[c];
      if (ch && ch !== '.') {
        const idx = Number.parseInt(ch, 16);
        grid[r * PIXEL_W + c] = Number.isNaN(idx) ? 4 : idx % PALETTE.length;
      }
    }
  });
  return grid;
}

export const PIXEL_PRESETS: PixelPreset[] = [
  {
    id: 'heart',
    name: '爱心',
    emoji: '💖',
    grid: createPresetGrid([
      '................',
      '..4444....4444..',
      '.444444..444444.',
      '4444444444444444',
      '4444444444444444',
      '.44444444444444.',
      '..444444444444..',
      '...4444444444...',
      '....44444444....',
      '.....444444.....',
      '......4444......',
      '.......44.......',
    ]),
  },
  {
    id: 'cat',
    name: '小猫',
    emoji: '🐱',
    grid: createPresetGrid([
      '..22........22..',
      '.2222......2222.',
      '.22222222222222.',
      '.22222222222222.',
      '.22002222220022.',
      '.22002222220022.',
      '.22222244222222.',
      '.22222444422222.',
      '..222222222222..',
      '..222222222222..',
      '..222222222222..',
      '................',
    ]),
  },
  {
    id: 'star',
    name: '星星',
    emoji: '⭐',
    grid: createPresetGrid([
      '.......66.......',
      '.......66.......',
      '......6666......',
      '.66666666666666.',
      '..666666666666..',
      '...6666666666...',
      '....66666666....',
      '...6666..6666...',
      '..6666....6666..',
      '.666........666.',
      '................',
      '................',
    ]),
  },
  {
    id: 'fish',
    name: '小鱼',
    emoji: '🐟',
    grid: createPresetGrid([
      '................',
      '....8888........',
      '...888888...8...',
      '..88088888.88...',
      '.8888888888888..',
      '888888888888888.',
      '.8888888888888..',
      '..88888888.88...',
      '...888888...8...',
      '....8888........',
      '................',
      '................',
    ]),
  },
];
