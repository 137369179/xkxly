/**
 * 陪伴伙伴 Progress 相关辅助函数
 */
import type { Progress } from '@/types';
import { dateKey } from '@/lib/dailyPlan';

const EXPLAINED_PREFIX = 'explained_';
const CHAT_COUNT_PREFIX = 'chatCount_';

// chatHistory 值的类型
type ExplainedArr = string[];
type ChatCountNum = number;

/** 把 topicId 标记为已讲解过（去重） */
export function markTopicExplained(p: Progress, topicId: string): Progress {
  const today = dateKey();
  const key = `${EXPLAINED_PREFIX}${today}`;
  const prev = p.chatHistory ?? {};
  const existing: ExplainedArr = (prev[key] as unknown as ExplainedArr | undefined) ?? [];
  if (existing.includes(topicId)) return p; // already marked
  const next: Record<string, ExplainedArr | ChatCountNum> = {
    ...(prev as Record<string, ExplainedArr | ChatCountNum>),
    [key]: [...existing, topicId],
  };
  return { ...p, chatHistory: next as Progress['chatHistory'] };
}

/** 今天已讲解过的主题 ID 集合 */
export function todayExplainedTopics(p: Progress): Set<string> {
  const today = dateKey();
  const key = `${EXPLAINED_PREFIX}${today}`;
  const arr: ExplainedArr = (p.chatHistory?.[key] as ExplainedArr | undefined) ?? [];
  return new Set(arr);
}

export function todayExplainedCount(p: Progress): number {
  return todayExplainedTopics(p).size;
}

export function isTopicExplainedToday(p: Progress, topicId: string): boolean {
  return todayExplainedTopics(p).has(topicId);
}

/** 今天陪伴聊天轮数 */
export function todayChatCount(p: Progress): number {
  const today = dateKey();
  const key = `${CHAT_COUNT_PREFIX}${today}`;
  const v = p.chatHistory?.[key];
  return typeof v === 'number' ? v : 0;
}

/** 增加一轮聊天计数 */
export function incrementChatCount(p: Progress): Progress {
  const today = dateKey();
  const key = `${CHAT_COUNT_PREFIX}${today}`;
  const prev = p.chatHistory ?? {};
  const current = todayChatCount(p);
  const next: Record<string, ExplainedArr | ChatCountNum> = {
    ...(prev as Record<string, ExplainedArr | ChatCountNum>),
    [key]: (current + 1) as ChatCountNum,
  };
  return { ...p, chatHistory: next as Progress['chatHistory'] };
}
