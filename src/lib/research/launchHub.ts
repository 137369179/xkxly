import type { Progress } from '@/types';
import { RESEARCH_TOPICS } from './researchTopics';
import { MAX_LEVEL } from '@/lib/srs';

/**
 * 研究出发台 · 纯逻辑派生层（Sprint 5 · 连续性入口数据源）
 * ------------------------------------------------------------------
 * 不引入任何新存储字段——全部复用既有 progress：
 *   - researchStats.topicsExplored：是否探索过该主题
 *   - mastery['research:<id>'].lv：SRS 掌握度（0..MAX_LEVEL），CMML「精熟」真相源
 *   - researchNotes[<id>]：是否留过研究笔记
 *   - discoveries / researchStats.sessionsCompleted：总览计数
 *
 * 目的：把扁平选题网格升级为「看得见成长」的出发台，
 * 强化 CMML 的「游戏化回流」——孩子看到自己越研究越懂，愿意回来深化。
 */

export const MAX_MASTERY = MAX_LEVEL; // 5

export interface TopicResearchState {
  /** 是否曾进入过该主题的完整研究闭环 */
  explored: boolean;
  /** SRS 掌握度等级 0..MAX_MASTERY */
  masteryLv: number;
  /** 是否留下过非空笔记 */
  hasNote: boolean;
  /** 是否达到精通（满级） */
  mastered: boolean;
}

export interface LaunchSummary {
  exploredCount: number;
  totalTopics: number;
  discoveryCount: number;
  noteCount: number;
  sessionsCompleted: number;
}

/** 派生单个主题的研究状态（纯函数，便于单测） */
export function topicResearchState(p: Progress, topicId: string): TopicResearchState {
  const explored = (p.researchStats?.topicsExplored ?? []).includes(topicId);
  const masteryLv = p.mastery?.[`research:${topicId}`]?.lv ?? 0;
  const noteRaw = p.researchNotes?.[topicId];
  const hasNote = typeof noteRaw === 'string' && noteRaw.trim().length > 0;
  return {
    explored,
    masteryLv,
    hasNote,
    mastered: masteryLv >= MAX_MASTERY,
  };
}

/** 派生出发台总览（纯函数，便于单测） */
export function launchSummary(p: Progress): LaunchSummary {
  const exploredSet = new Set(p.researchStats?.topicsExplored ?? []);
  const exploredCount = RESEARCH_TOPICS.filter((t) => exploredSet.has(t.id)).length;
  const discoveryCount = (p.discoveries ?? []).length;
  const noteCount = Object.values(p.researchNotes ?? {}).filter(
    (v) => typeof v === 'string' && v.trim().length > 0,
  ).length;
  const sessionsCompleted = p.researchStats?.sessionsCompleted ?? 0;
  return {
    exploredCount,
    totalTopics: RESEARCH_TOPICS.length,
    discoveryCount,
    noteCount,
    sessionsCompleted,
  };
}
