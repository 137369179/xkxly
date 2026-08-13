// ============================================================
// AI 个性化学习路径 · 核心引擎
// 纯规则分析（永远可用），AI 增强可选
// ============================================================

import type { Progress } from '@/types';
import {
  weakSkills,
  dueSkills,
  touchedCount,
  subjectLabel,
  subjectEmoji,
  SKILL,
  skillCategory,
} from '@/lib/srs';
import { nextWord } from '@/lib/dailyPlan';
import { nextHanzi } from '@/data/hanziIndex';
import { nextPinyin } from '@/data/pinyinIndex';
/* ------------------------------------------------------------------ */
/* 类型定义                                                            */
/* ------------------------------------------------------------------ */

export interface FocusItem {
  skill: string;
  label: string;
  emoji: string;
  reason: string;           // 为什么练这个（儿童友好）
  priority: 'high' | 'medium' | 'low';
  estMinutes: number;       // 建议时长
  source: 'weak' | 'due' | 'new';  // 来源
}

export interface WeeklyGoal {
  skill: string;
  label: string;
  emoji: string;
  target: string;           // 目标描述，如「掌握 5 个新汉字」
  progress: number;         // 当前进度 0-1
  estDays: number;          // 预估需要天数
}

export interface CoachAdvice {
  summary: string;          // 一句话总结
  strengths: string[];      // 做得好的
  gaps: string[];           // 需要加强的
  suggestion: string;       // 家长建议
}

export interface LearningPath {
  focus: FocusItem[];
  weekly: WeeklyGoal[];
  coach: CoachAdvice;
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/* 辅助：学习速度 / 学科统计 / 近7天活力                                 */
/* ------------------------------------------------------------------ */

/** 近7天有效学习天数 */
function activeDays7(p: Progress): number {
  const now = Date.now();
  const DAY = 86400000;
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const key = dateKey(now - i * DAY);
    const d = p.dailyLog[key];
    if (d && d.sec >= 60) count++; // 至少1分钟才算有效学习
  }
  return count;
}

/** 近7天平均每日学习分钟数 */
function avgDailyMinutes(p: Progress): number {
  const now = Date.now();
  const DAY = 86400000;
  let total = 0;
  let days = 0;
  for (let i = 0; i < 7; i++) {
    const key = dateKey(now - i * DAY);
    const d = p.dailyLog[key];
    if (d) { total += d.sec / 60; days++; }
  }
  return days > 0 ? Math.round(total / days) : 0;
}

/** 学科掌握率 */
function subjectRate(p: Progress, key: string): number {
  let ok = 0, ng = 0;
  for (const [skill, m] of Object.entries(p.mastery)) {
    if (skill.startsWith(`${key}:`)) {
      ok += m.ok;
      ng += m.ng;
    }
  }
  const total = ok + ng;
  return total > 0 ? ok / total : 0;
}

/** 学科覆盖数量（已接触的 skill 数） */
function subjectCount(p: Progress, key: string): number {
  let count = 0;
  for (const skill of Object.keys(p.mastery)) {
    if (skill.startsWith(`${key}:`)) count++;
  }
  return count;
}

/** 薄弱学科（掌握率 < 0.5 且有过练习记录） */
function weakSubjects(p: Progress): string[] {
  const keys = ['letter', 'number', 'hanzi', 'pinyin', 'word', 'math', 'poem', 'logic', 'idiom', 'sentence'];
  return keys.filter((k) => {
    const rate = subjectRate(p, k);
    const count = subjectCount(p, k);
    return count >= 3 && rate < 0.5; // 至少练过3次且正确率<50%
  });
}

/* ------------------------------------------------------------------ */
/* 今日焦点生成                                                        */
/* ------------------------------------------------------------------ */

function buildFocus(p: Progress, now = Date.now()): FocusItem[] {
  const items: FocusItem[] = [];
  const used = new Set<string>();

  // 1. 最薄弱 2 项（weakSkills 取3，去重取2）
  const weak = weakSkills(p, 5);
  for (const w of weak) {
    if (items.length >= 2) break;
    if (used.has(w.skill)) continue;
    used.add(w.skill);
    const cat = skillCategory(w.skill);
    items.push({
      skill: w.skill,
      label: cat.label,
      emoji: cat.emoji,
      reason: w.m.lv <= 1 ? '刚学过，多练几遍就记住了' : '再练练就完全掌握啦',
      priority: 'high',
      estMinutes: 5,
      source: 'weak',
    });
  }

  // 2. 到期复习 1-2 项
  const due = dueSkills(p, now, 5);
  for (const s of due) {
    if (items.length >= 4) break;
    if (used.has(s)) continue;
    used.add(s);
    const cat = skillCategory(s);
    items.push({
      skill: s,
      label: cat.label,
      emoji: cat.emoji,
      reason: '好久没练了，复习一下记得更牢',
      priority: items.length < 2 ? 'high' : 'medium',
      estMinutes: 3,
      source: 'due',
    });
  }

  // 3. 新内容推荐 1 项
  const newItem = suggestNew(p);
  if (newItem && !used.has(newItem.skill)) {
    items.push(newItem);
  }

  return items.slice(0, 5);
}

/** 推荐一个新内容 */
function suggestNew(p: Progress): FocusItem | null {
  // 按字母→汉字→拼音→英语→古诗→数学的顺序推荐
  const candidates: { skill: string; label: string; emoji: string }[] = [];

  // 字母
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (const l of LETTERS) {
    if (!p.mastery[SKILL.letter(l)] || p.mastery[SKILL.letter(l)]!.lv < 1) {
      candidates.push({ skill: SKILL.letter(l), label: `字母 ${l}`, emoji: '🔤' });
      break;
    }
  }

  // 汉字
  const h = nextHanzi(p.mastery);
  if (h) {
    candidates.push({ skill: SKILL.hanzi(h.c), label: `汉字「${h.c}」`, emoji: '🀄' });
  }

  // 拼音
  const py = nextPinyin(p.mastery);
  if (py) {
    candidates.push({ skill: SKILL.pinyin(py.p), label: `拼音「${py.p}」`, emoji: '📋' });
  }

  // 英语
  const w = nextWord(p.mastery);
  if (w) {
    candidates.push({ skill: SKILL.word(w.word), label: `单词「${w.word}」`, emoji: '💬' });
  }

  if (candidates.length === 0) return null;
  const pick = candidates[0]!;
  return {
    skill: pick.skill,
    label: pick.label,
    emoji: pick.emoji,
    reason: '学一个新本领吧',
    priority: 'medium',
    estMinutes: 5,
    source: 'new',
  };
}

/* ------------------------------------------------------------------ */
/* 本周目标生成                                                        */
/* ------------------------------------------------------------------ */

function buildWeekly(p: Progress): WeeklyGoal[] {
  const goals: WeeklyGoal[] = [];
  const weakSubs = weakSubjects(p);

  // 薄弱学科优先
  for (const key of weakSubs) {
    goals.push({
      skill: `${key}:*`,
      label: subjectLabel(key),
      emoji: subjectEmoji(key),
      target: mkWkTarget(p, key),
      progress: subjectRate(p, key),
      estDays: 3,
    });
    if (goals.length >= 3) break;
  }

  // 补充学科
  const allKeys = ['letter', 'number', 'hanzi', 'pinyin', 'word', 'math', 'poem', 'logic', 'idiom', 'sentence'];
  for (const key of allKeys) {
    if (goals.length >= 5) break;
    if (weakSubs.includes(key)) continue;
    const rate = subjectRate(p, key);
    if (rate < 0.7) {
      goals.push({
        skill: `${key}:*`,
        label: subjectLabel(key),
        emoji: subjectEmoji(key),
        target: mkWkTarget(p, key),
        progress: rate,
        estDays: 3,
      });
    }
  }

  return goals.slice(0, 5);
}

function mkWkTarget(p: Progress, key: string): string {
  const count = subjectCount(p, key);
  const rate = Math.round(subjectRate(p, key) * 100);
  if (count < 5) return `开始学习 ${subjectLabel(key)}`;
  if (rate < 60) return `提高 ${subjectLabel(key)} 正确率`;
  return `巩固 ${subjectLabel(key)}，挑战新内容`;
}

/* ------------------------------------------------------------------ */
/* 教练建议生成                                                        */
/* ------------------------------------------------------------------ */

function buildCoach(p: Progress): CoachAdvice {
  const strengths: string[] = [];
  const gaps: string[] = [];

  const allKeys = ['letter', 'number', 'hanzi', 'pinyin', 'word', 'math', 'poem', 'logic'];
  for (const key of allKeys) {
    const rate = subjectRate(p, key);
    const count = subjectCount(p, key);
    if (count >= 3 && rate >= 0.8) strengths.push(subjectLabel(key));
    if (count >= 3 && rate < 0.5) gaps.push(subjectLabel(key));
  }

  let summary: string;
  const avgMin = avgDailyMinutes(p);
  const aDays = activeDays7(p);
  const totalLearned = touchedCount(p);
  if (totalLearned === 0) {
    summary = '宝贝还没开始学习，快陪 TA 开启第一课吧！';
  } else if (aDays >= 5) {
    summary = `最近一周坚持学习 ${aDays} 天，每天约 ${avgMin} 分钟，非常棒！`;
  } else if (aDays >= 3) {
    summary = `最近一周学习了 ${aDays} 天，继续保持每天的节奏会更好哦。`;
  } else {
    summary = `最近一周学习 ${aDays} 天，建议每天固定时间学习 15 分钟效果更好。`;
  }

  let suggestion: string;
  if (gaps.length > 0) {
    suggestion = `${gaps[0]} 是当前最需要加强的，建议每天安排 5 分钟专门练习。`;
  } else if (strengths.length >= 3) {
    suggestion = '宝贝各科表现都不错，可以挑战新领域了！';
  } else {
    suggestion = '建议保持每天 15 分钟的学习节奏，周末可以适当加量。';
  }

  return { summary, strengths, gaps, suggestion };
}

/* ------------------------------------------------------------------ */
/* 主入口                                                              */
/* ------------------------------------------------------------------ */

export function buildLearningPath(p: Progress, now = Date.now()): LearningPath {
  return {
    focus: buildFocus(p, now),
    weekly: buildWeekly(p),
    coach: buildCoach(p),
    updatedAt: now,
  };
}

/* ------------------------------------------------------------------ */
/* 工具函数                                                            */
/* ------------------------------------------------------------------ */

function dateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
