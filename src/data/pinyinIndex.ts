/**
 * 拼音索引文件 — 宝贝学习乐园
 *
 * 从 pinyin.ts 导出所有数据和工具函数，提供统一的导入入口
 */

import { getAllPinyin } from './pinyin';
import type { PinyinEntry } from './pinyin';

export type {
  PinyinEntry,
  PinyinGroup,
  SyllableCombo,
} from './pinyin';

export {
  PINYIN_GROUPS,
  COMBOS_BASIC,
  COMBOS_DTNL,
  COMBOS_GKH,
  COMBOS_JQX,
  COMBOS_ZHCHSHR,
  COMBOS_ZCS,
  ALL_COMBOS,
  getAllPinyin,
  getPinyinByType,
  searchPinyin,
} from './pinyin';

/**
 * 推荐下一个要学的拼音（按 order 升序 + 未在 mastery 中）
 *
 * 遍历所有拼音（按 order 升序），返回第一个尚未掌握的：
 * 即 mastery['pinyin:' + p] 不存在或 lv < 1。
 * 若全部学完则返回 null。
 */
export function nextPinyin(mastery: Record<string, { lv: number }>): PinyinEntry | null {
  // 按 order 升序遍历所有拼音
  const all = getAllPinyin().slice().sort((a, b) => a.order - b.order);
  for (const item of all) {
    const m = mastery[`pinyin:${item.p}`]!
    // 未记录或等级不足 1，视为待学
    if (!m || m.lv < 1) return item;
  }
  return null;
}
