/**
 * 出题器共享层
 * ------------------------------------------------------------
 * 这里集中放各学科出题器共用的类型、工具与素材池，避免每个 subject
 * 文件各自重造轮子；具体题型实现放在同级 math.ts / logic.ts / ... 中。
 */
import type { QuizOption } from '@/types';

/** 难度档：1 入门 / 2 进阶 / 3 挑战 */
export type Difficulty = 1 | 2 | 3;

let seq = 0;
/** 生成全局唯一 id（前缀 + 时间戳 + 自增序号），用于 Question / Option */
export const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${seq++}`;

/** 选项构造器：省去每次手写 id 的样板代码 */
export const opt = (o: Omit<QuizOption, 'id'> & { id?: string }): QuizOption => ({
  id: o.id ?? nextId('o'),
  ...o,
});

/** 去重小工具（题型内部用） */
export function distinct<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/* ============================================================
   图形素材池（逻辑题、数数题等共用）
   ============================================================ */
export const COLOR_SHAPES = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'];
export const GEO_SHAPES = ['⭐', '❤️', '🔺', '🔶', '🔷', '⬛', '⬜', '💠'];
export const FRUITS = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍉', '🍐', '🍒'];
export const ANIMALS = ['🐱', '🐶', '🐰', '🐼', '🦁', '🐯', '🐸', '🐵'];
export const THINGS = ['🚗', '✈️', '🚀', '⚽', '🎈', '🎁', '🌸', '🌻'];

export const ALL_POOLS = [COLOR_SHAPES, GEO_SHAPES, FRUITS, ANIMALS, THINGS];
