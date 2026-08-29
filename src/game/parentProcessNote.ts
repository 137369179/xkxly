/**
 * 家长端反依赖提示（R166）—— 把家长注意力从「星星/徽章」引向「过程行为」
 * ------------------------------------------------------------------
 * 【要解决的问题】
 * 家长周报的 strengths 段默认会写「获得 N 颗星星」「解锁 N 枚徽章」——
 * 这是结果导向的奖励语言。Deci 过度理由效应指出：当家长把注意力放在
 * 奖励数字上，回家后会无意识地用「今天赚了几颗星？」来询问孩子，
 * 从而把孩子的动机从「学本领」扭回「赚奖励」。
 *
 * 【设计思路】
 * 从 progress 里提取**过程行为**（主动复习、坚持天数、错题消灭、
 * 新知识点掌握），生成一句「设计意图说明」，让周报的 strengths 段
 * 从「赚了 N 颗星」变成「本周孩子主动复习了 N 次错题」。
 *
 * 【定位】
 * 纯函数、零副作用、零存储 —— 只做「数据 → 一句话」的翻译，
 * 由 AiReport 组件在 strengths 段之前渲染。
 */
import type { MasteryItem, WrongHistory } from '@/types';
import { dateKey } from '@/lib/dailyPlan';
import { newlyMasteredThisWeek } from './masteryNarrative';

/** 统计窗口：近 7 天（含今天） */
const WEEK_DAYS = 7;

/** 提示句所需的最小数据切片（Progress 的子集，便于细粒度订阅） */
export interface ProcessNoteInput {
  mastery: Record<string, MasteryItem | undefined>;
  wrongHistory?: WrongHistory;
  streak: number;
}

/**
 * 本周是否有过错题主动训练（lastTrainDate 落在近 7 天窗口内）
 */
function trainedThisWeek(p: ProcessNoteInput, now: Date = new Date()): boolean {
  const last = p.wrongHistory?.lastTrainDate ?? '';
  if (!last) return false;
  const weekStart = dateKey(now.getTime() - (WEEK_DAYS - 1) * 86400000);
  return last >= weekStart;
}

/**
 * 统计本周新掌握的知识点数（复用 masteryNarrative 的 newlyMasteredThisWeek）
 */
function countNewlyMastered(p: ProcessNoteInput, now: Date): number {
  return newlyMasteredThisWeek(p.mastery, ['hanzi', 'word', 'math', 'poem', 'logic', 'letter', 'number', 'pinyin'], now);
}

/**
 * 统计错题本消灭数（历史累计 cleared）
 */
function countClearedWrongs(p: ProcessNoteInput): number {
  return p.wrongHistory?.cleared ?? 0;
}

/**
 * 生成家长端反依赖提示句。
 * 返回 null 表示数据不足，不渲染该行（宁缺毋滥）。
 *
 * 句式刻意用「本周孩子……」而非「获得 N 颗星星」——
 * 陈述过程行为，不描述奖励数字。
 */
export function parentProcessNote(p: ProcessNoteInput, now: Date = new Date()): string | null {
  const newMastered = countNewlyMastered(p, now);
  const clearedWrongs = countClearedWrongs(p);
  const trainStreak = p.wrongHistory?.dailyStreak ?? 0;
  const streak = p.streak ?? 0;

  const parts: string[] = [];
  if (newMastered > 0) parts.push(`新掌握了 ${newMastered} 个知识点`);
  if (trainedThisWeek(p, now) && clearedWrongs > 0) parts.push(`主动回炉消灭了 ${clearedWrongs} 道错题`);
  else if (trainStreak >= 2) parts.push(`连续 ${trainStreak} 天主动练错题`);
  if (streak >= 3) parts.push(`坚持每天学习，已经连了 ${streak} 天`);

  // 一个过程行为都没有就不写，避免空句
  if (parts.length === 0) return null;

  // 取前 2 个最具体的行为（避免句子过长）
  return `本周孩子${parts.slice(0, 2).join('，')}——这些过程比星星更值得看见。`;
}
