// ============================================================
// AI 个性化学习路径 · 任务层
// 本地引擎永远可用；AI 只增强叙事，失败静默降级
// ============================================================

import type { Progress } from '@/types';
import { chat } from '@/lib/ai/client';
import type { AiError } from '../types';
import type { TaskResult } from './types';
import { pathNarrateMessages, pathWeeklyMessages, pathCoachMessages } from '@/lib/ai/prompts';
import {
  buildLearningPath,
  type CoachAdvice,
  type FocusItem,
  type WeeklyGoal,
} from '@/lib/learningPath';

/* ------------------------------------------------------------------ */
/* 本地兜底文案（AI 失败时使用，保证孩子永远有内容可看）               */
/* ------------------------------------------------------------------ */

function localNarrate(focus: FocusItem[]): string {
  const top = focus[0]!
  if (!top) return '今天先开心地玩一玩，明天再一起学习吧！';
  return `今天我们先练${top.label}，${top.reason}。练完就有小星星啦！`;
}

function localWeekly(goals: WeeklyGoal[]): string[] {
  if (goals.length === 0) return ['每天开心学习 15 分钟，坚持就是胜利！'];
  return goals.map((g) => `${g.emoji} ${g.label}：${g.target}`);
}

function localCoach(coach: CoachAdvice): string {
  return coach.suggestion;
}

/* ------------------------------------------------------------------ */
/* TaskResult 构造辅助（exactOptionalPropertyTypes 兼容）               */
/* ------------------------------------------------------------------ */

function errResult<T>(data: T, error?: AiError, ms?: number): TaskResult<T> {
  return {
    ok: false,
    data,
    fallback: true,
    ...(error ? { error } : {}),
    ...(ms !== undefined ? { ms } : {}),
  };
}

function okResult<T>(data: T, ms?: number): TaskResult<T> {
  return {
    ok: true,
    data,
    fallback: false,
    ...(ms !== undefined ? { ms } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* 对外任务                                                            */
/* ------------------------------------------------------------------ */

/** 今日焦点叙事（流式，孩子端） */
export async function pathNarrateTask(p: Progress): Promise<TaskResult<{ text: string }>> {
  const path = buildLearningPath(p);
  const fallbackText = localNarrate(path.focus);

  const r = await chat({
    scene: 'path.narrate',
    messages: pathNarrateMessages(path.focus.map((f) => f.label)),
    cacheKey: `pathNarrate:${dateKey()}`,
    cacheTtl: 6 * 60 * 60 * 1000, // 6 小时
  });

  if (!r.ok) return errResult({ text: fallbackText }, r.error, r.ms);

  const text = r.text.trim().replace(/[「」]/g, '').slice(0, 60);
  return okResult({ text: text || fallbackText }, r.ms);
}

/** 本周目标文案（孩子端） */
export async function pathWeeklyTask(p: Progress): Promise<TaskResult<{ lines: string[] }>> {
  const path = buildLearningPath(p);
  const fallback = localWeekly(path.weekly);

  const r = await chat({
    scene: 'path.weekly',
    messages: pathWeeklyMessages(path.weekly.map((g) => `${g.label}：${g.target}`)),
    cacheKey: `pathWeekly:${dateKey()}`,
    cacheTtl: 24 * 60 * 60 * 1000, // 24 小时
  });

  if (!r.ok) return errResult({ lines: fallback }, r.error, r.ms);

  // 按换行切分，取前 5 条
  const lines = r.text
    .split(/\n|•|-/)
    .map((s) => s.trim().replace(/^[-•*]\s*/, ''))
    .filter((s) => s.length > 0 && s.length <= 30)
    .slice(0, 5);

  return okResult({ lines: lines.length > 0 ? lines : fallback }, r.ms);
}

/** 家长教练点评（家长端） */
export async function pathCoachTask(p: Progress): Promise<TaskResult<{ text: string }>> {
  const path = buildLearningPath(p);
  const coach = path.coach;
  const fallbackText = localCoach(coach);

  const r = await chat({
    scene: 'path.coach',
    messages: pathCoachMessages({
      summary: coach.summary,
      strengths: coach.strengths.join('、'),
      gaps: coach.gaps.join('、'),
      suggestion: coach.suggestion,
      rate: masteryRate(p),
      streak: p.streak,
      avgMin: avgMinutes(p),
    }),
    cacheKey: `pathCoach:${dateKey()}`,
    cacheTtl: 12 * 60 * 60 * 1000, // 12 小时
  });

  if (!r.ok) return errResult({ text: fallbackText }, r.error, r.ms);

  const text = r.text.trim().slice(0, 500);
  return okResult({ text: text || fallbackText }, r.ms);
}

/* ------------------------------------------------------------------ */
/* 辅助                                                                */
/* ------------------------------------------------------------------ */

function masteryRate(p: Progress): number {
  let sum = 0, count = 0;
  for (const m of Object.values(p.mastery)) {
    sum += m.lv;
    count++;
  }
  return count > 0 ? sum / (count * 5) : 0;
}

function avgMinutes(p: Progress): number {
  const now = Date.now();
  const DAY = 86400000;
  let total = 0, days = 0;
  for (let i = 0; i < 7; i++) {
    const d = p.dailyLog[dateKey2(now - i * DAY)];
    if (d) { total += d.sec / 60; days++; }
  }
  return days > 0 ? Math.round(total / days) : 0;
}

function dateKey(): string {
  return dateKey2(Date.now());
}

function dateKey2(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
