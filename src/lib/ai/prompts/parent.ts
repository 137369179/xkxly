/**
 * AI Prompt · 家长端（学情报告 / 错题分析 / 推荐练习）
 */
import type { AiMessage } from '../types';
import { PERSONA_PARENT } from './core';

function sys(c: string): AiMessage { return { role: 'system', content: c }; }
function user(c: string): AiMessage { return { role: 'user', content: c }; }

/* ================================================================== */
/* 家长学情周报                                                         */
/* ================================================================== */
export function parentReportMessages(data: string): AiMessage[] {
  return [
    sys(
      `${PERSONA_PARENT}

现在你要基于孩子近期的学习数据，给家长写一份简短的学情分析。

输出结构（严格 4 段，每段前面加小标题，不要用 markdown 符号）：
一句话总评：（30字内）
做得好的：（1-2条，要具体到数据）
需要关注的：（1-2条，指出薄弱点和可能的原因）
本周建议：（2条可立刻执行的动作，每条不超过30字）

注意：数据不足时直说"数据还太少"，不要硬编结论。`,
    ),
    user(data),
  ];
}

/* ================================================================== */
/* AI 深度学情报告（结构化 JSON）                                       */
/* ================================================================== */
export function deepReportMessages(data: string): AiMessage[] {
  return [
    sys(
      `${PERSONA_PARENT}

现在你要基于孩子近期的多维度学习数据，给家长写一份结构化的深度学情报告。

只输出 JSON，严格如下格式（不要任何 markdown 符号、不要多余字段）：
{
  "summary": "一句话总评，不超过40字，要具体到数据",
  "strengths": ["亮点1，具体到数据", "亮点2"],
  "weaknesses": ["需关注1，指出薄弱点并给可能原因", "需关注2"],
  "trend": "趋势解读，不超过40字，结合近两周掌握率变化",
  "suggestions": ["可立刻执行的建议1，不超过30字", "可立刻执行的建议2"]
}

规则：
- strengths / weaknesses / suggestions 各 2-3 条，数组不要为空
- 数据不足时也要基于已有数据给最合理的判断，不要写"无法判断"
- 语气温暖、鼓励为主，给家长可操作的动作，不要空话
- R166 反依赖：strengths 优先写"过程行为"（主动复习错题、坚持打卡天数、新掌握知识点、消灭错题数），星星/徽章等奖励数字最多提一条且不要放在第一条——家长照着周报夸孩子时，注意力才会落在努力上而不是奖励上`,
    ),
    user(data),
  ];
}

export interface DeepReport {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  trend: string;
  suggestions: string[];
}

/* ================================================================== */
/* AI 错题分析                                                          */
/* ================================================================== */
export function wrongAnalyzeMessages(wrongList: string, totalWrong: number, skillDist: string): AiMessage[] {
  return [
    sys(
      `${PERSONA_PARENT}

现在你要分析孩子的错题分布，给出针对性建议。

只输出 JSON，格式：
{"pattern":"错误模式描述，不超过30字","suggest":"建议练习，不超过30字","priority":"最该先攻克的知识点，不超过15字","encourage":"给家长的鼓励，不超过25字"}

规则：
- 基于错题分布找规律，不要泛泛而谈
- suggest 要具体可执行`,
    ),
    user(`错题列表：${wrongList}\n错题总数：${totalWrong}\n分类分布：${skillDist}`),
  ];
}

export interface WrongAnalyze {
  pattern: string;
  suggest: string;
  priority: string;
  encourage: string;
}

/* ================================================================== */
/* AI 个性化复习推荐                                                    */
/* ================================================================== */
export function recommendPracticeMessages(weakList: string, dueList: string, streak: number, masteryRate: number): AiMessage[] {
  return [
    sys(
      `${PERSONA_PARENT}

现在你要基于孩子的学习数据，推荐今天最该练的 3 个知识点。

只输出 JSON，格式：
{"greeting":"一句话，不超过20字","items":[{"skill":"知识点名","reason":"为什么推荐，不超过15字"}]}

规则：
- items 恰好 3 条
- 优先推荐薄弱和到期的知识点
- reason 要说清楚为什么选这个`,
    ),
    user(`薄弱知识点：${weakList || '暂无'}\n到期复习：${dueList || '暂无'}\n连续学习：${streak} 天\n掌握率：${Math.round(masteryRate * 100)}%`),
  ];
}

export interface RecommendPractice {
  greeting: string;
  items: { skill: string; reason: string }[];
}

/* ================================================================== */
/* 家长 5 分钟亲子行动指南卡                                           */
/* ================================================================== */
export interface ParentActionCard {
  title: string;
  tag: string;
  duration: string;
  guide: string;
  benefit: string;
}

export interface ParentActionPlan {
  greeting: string;
  cards: ParentActionCard[];
}

export function parentActionsMessages(statsSummary: string): AiMessage[] {
  return [
    sys(
      `${PERSONA_PARENT}

现在你要为家长生成 3 张【5分钟亲子行动指南卡】，帮助家长在日常生活与睡前游戏中陪伴孩子巩固学习。

只输出 JSON，严格如下格式：
{
  "greeting": "给家长的温暖问候（20字内）",
  "cards": [
    {
      "title": "行动卡名称（如：餐桌上的反义词大作战）",
      "tag": "汉字/数学/思维/习惯",
      "duration": "5分钟",
      "guide": "具体怎么玩/怎么做，步骤清晰（40字内）",
      "benefit": "对孩子有什么帮助（20字内）"
    }
  ]
}

规则：
- cards 必须恰好 3 张，覆盖不同学科或习惯
- 简单好操作，随手取材（如筷子、积木、睡前故事）
- 严禁空洞说教，必须是具体的互动小游戏`,
    ),
    user(`孩子近期学情概要：\n${statsSummary}`),
  ];
}

