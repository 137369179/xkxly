/**
 * 掌握回路文案层（R164）—— 把 mastery 数据翻译成「我会了什么」的能力叙事
 * ------------------------------------------------------------------
 * 【要解决的问题】
 * 结算卡目前只回答「得了几颗星」，孩子的注意力被引向奖励数字本身。
 * Deci / Koestner / Ryan 元分析（过度理由效应）指出：6-10 岁儿童对
 * 「本来有趣的活动」发外部奖励会削弱内在动机，对冲手段是把成就描述成
 * **胜任感信息**（"你新学会了 3 个汉字"）而非交易记录（"你赚了 3 颗星"）。
 * mastery 数据（lv + firstSeen）全站已记录，只差最后一步呈现。
 *
 * 【定位】
 * 纯函数、零副作用、零存储 —— 只做「数据 → 一句话」的翻译，
 * 由 StarSettlementCard 以可选 prop 呈现，不改变结算卡「不计算不存储」的契约。
 */
import type { MasteryItem } from '@/types';
import { dateKey } from '@/lib/dailyPlan';

/** 统计窗口：近 7 天（含今天） */
export const MASTERY_WEEK_DAYS = 7;

/** 本周（近 7 天，含今天）内首次达到「已掌握」（lv>=1）的 skill 数量 */
export function newlyMasteredThisWeek(
  mastery: Record<string, MasteryItem | undefined>,
  prefixes: string[],
  now: Date = new Date(),
): number {
  // dateKey 为 yyyy-mm-dd，字典序即时间序；窗口起点 = 今天 - 6 天
  const weekStart = dateKey(now.getTime() - (MASTERY_WEEK_DAYS - 1) * 86400000);
  let count = 0;
  for (const [key, item] of Object.entries(mastery)) {
    if (!item) continue;
    if (!prefixes.some((prefix) => key.startsWith(`${prefix}:`))) continue;
    if ((item.lv ?? 0) < 1) continue;
    // 旧数据缺失 firstSeen 视为非本周（与 DailyGoal「新掌握」统计同口径）
    if (item.firstSeen && item.firstSeen >= weekStart) count += 1;
  }
  return count;
}

/**
 * 生成儿童向能力叙事句。count 为 0 时返回 null（宁缺毋滥，不制造空句）。
 * 句式刻意用「你学会了」而非「奖励你」—— 陈述能力，不描述交易。
 */
export function masteryNoteFor(count: number, unit: string): string | null {
  if (!(count > 0)) return null;
  return `这周你新学会了 ${count} ${unit}，这些本领已经是你自己的啦！`;
}
