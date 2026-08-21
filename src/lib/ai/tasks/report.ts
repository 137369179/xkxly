/**
 * AI 任务 · 表扬与报告（流式）
 * AI 夸夸（孩子端）/ 家长学情周报（家长端）
 * v6 新增：每日学习总结 / 闯关失败鼓励 / AI 错题分析 / AI 个性化复习推荐
 */
import type { Progress } from '@/types';
import { dateKey } from '@/lib/dailyPlan';
import { masteredCount, masteryRate, skillLabel, touchedCount, weakSkills, dueSkills, SUBJECTS, subjectLabel } from '@/lib/srs';
import {
  parentReportMessages,
  deepReportMessages,
  praiseMessages,
  dailySummaryMessages,
  adventureEncourageMessages,
  wrongAnalyzeMessages,
  recommendPracticeMessages,
  parentActionsMessages,
  type WrongAnalyze,
  type RecommendPractice,
  type DeepReport,
  type ParentActionPlan,
} from '../prompts';
import { chat } from '../client';
import { extractJson } from '../guard';
import { pick, type StreamTask, type TaskResult } from './types';

/** 报告层学科映射单一真相源：取 @/lib/srs 的 8 个学科，消除本地重复定义 */
const REPORT_KEYS = ['letter', 'number', 'math', 'poem', 'hanzi', 'pinyin', 'word', 'logic'];
const REPORT_SUBJECTS = REPORT_KEYS.map((key) => {
  const def = SUBJECTS.find((s) => s.key === key) ?? { key, label: key };
  return { key, label: def.label };
});

/* ================================================================== */
/* AI 夸夸                                                             */
/* ================================================================== */
const PRAISE_FALLBACK = [
  '哇，你真的做到了，小茜给你竖大拇指！',
  '这么难都被你搞定了，太厉害啦！',
  '每天进步一点点，你已经很棒了！',
  '坚持下来的人最帅气，就是你！',
];

/**
 * @param achievement 具体成就描述，越具体夸得越准，例：连续答对 8 道 10 以内加法
 */
export function praiseTask(achievement: string): StreamTask {
  return {
    scene: 'praise',
    messages: praiseMessages(achievement),
    fallback: pick(PRAISE_FALLBACK, achievement.length),
    title: '小茜夸夸你',
    hint: '小茜正在想夸你的话…',
  };
}

/* ================================================================== */
/* 家长学情周报                                                        */
/* ================================================================== */

/** 把 store 里的进度整理成一段紧凑的事实描述，喂给模型 */
export function buildReportData(p: Progress): string {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const k = dateKey(Date.now() - i * 86400000);
    const d = p.dailyLog[k];
    days.push(
      d
        ? `${k.slice(5)} 学习${Math.round(d.sec / 60)}分钟/做题${d.items}道/对${d.ok}道`
        : `${k.slice(5)} 未学习`,
    );
  }
  const weak = weakSkills(p, 6).map((w) => `${skillLabel(w.skill)}(等级${w.m.lv})`);
  const mathRate = p.mathTotal ? Math.round((p.mathCorrect / p.mathTotal) * 100) : 0;
  const logicRate = p.logicTotal ? Math.round((p.logicCorrect / p.logicTotal) * 100) : 0;

  return [
    `【近七天】\n${days.join('\n')}`,
    `【总览】连续学习 ${p.streak} 天，累计星星 ${p.stars} 颗，徽章 ${p.badges.length} 枚`,
    `【知识点】接触 ${touchedCount(p)} 个，已掌握 ${masteredCount(p)} 个，掌握率 ${masteryRate(p)}%`,
    `【分项正确率】数学 ${mathRate}%（${p.mathCorrect}/${p.mathTotal}）；逻辑 ${logicRate}%（${p.logicCorrect}/${p.logicTotal}）`,
    `【薄弱知识点】${weak.length ? weak.join('、') : '暂无'}`,
    `【错题本】${p.wrongBook.length} 条`,
    `【古诗】已读 ${p.poemsRead.length} 首，背诵训练 ${Object.keys(p.poemRecite).length} 首`,
  ].join('\n\n');
}

function localReport(p: Progress): string {
  const weak = weakSkills(p, 3).map((w) => skillLabel(w.skill));
  return [
    `一句话总评：近七天连续学习 ${p.streak} 天，累计掌握 ${masteredCount(p)} 个知识点。`,
    `做得好的：累计获得 ${p.stars} 颗星星，解锁 ${p.badges.length} 枚徽章。`,
    `需要关注的：${weak.length ? `${weak.join('、')} 掌握度偏低，建议优先复习。` : '数据还太少，多练几天才好判断。'}`,
    '本周建议：每天固定 15 分钟学习时间；优先做错题本里的题目。',
  ].join('\n');
}

export function parentReportTask(p: Progress): StreamTask {
  return {
    scene: 'parent.report',
    messages: parentReportMessages(buildReportData(p)),
    // 同一天同样的数据不重复生成（周报是长文，2.5-pro 生成较慢）
    cacheKey: `${dateKey()}|${p.stars}|${p.wrongBook.length}|${touchedCount(p)}`,
    cacheTtl: 6 * 60 * 60 * 1000,
    fallback: localReport(p),
    title: 'AI 学情分析',
    hint: '正在分析近七天数据…',
  };
}

/* ================================================================== */
/* AI 深度学情报告（结构化）                                          */
/* ================================================================== */

/** 把进度整理成更丰富的多维事实，喂给深度报告模型 */
export function buildDeepReportData(p: Progress): string {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const k = dateKey(Date.now() - i * 86400000);
    const d = p.dailyLog[k];
    days.push(
      d
        ? `${k.slice(5)} 学习${Math.round(d.sec / 60)}分钟/做题${d.items}道/对${d.ok}道`
        : `${k.slice(5)} 未学习`,
    );
  }

  // 学科掌握率（单一真相源，取 8 个学科）
  const subLines = REPORT_SUBJECTS.map((s) => {
    const items = Object.entries(p.mastery).filter(([k]) => k.startsWith(s.key + ':'));
    const pct = items.length ? Math.round((items.reduce((a, [, m]) => a + (m.lv ?? 0), 0) / (items.length * 5)) * 100) : 0;
    return `${s.label} ${pct}%（${items.length}个知识点）`;
  }).join('；');

  // 成长趋势（近 14 天掌握率）
  const g = p.growth.slice(-14);
  const trendLine = g.length
    ? `近14天掌握率：起点 ${Math.round((g[0]?.rate ?? 0) * 100)}% → 最新 ${Math.round((g[g.length - 1]?.rate ?? 0) * 100)}%`
    : '暂无趋势数据';

  // 错题类别分布
  const catCount: Record<string, number> = {};
  for (const skill of p.wrongBook) {
    const c = skill.split(':')[0] ?? '';
    catCount[c] = (catCount[c] ?? 0) + 1;
  }
  const wrongDist = Object.entries(catCount)
    .map(([k, v]) => `${subjectLabel(k)}:${v}题`)
    .join('、');

  const weak = weakSkills(p, 6).map((w) => `${skillLabel(w.skill)}(等级${w.m.lv})`);
  const mathRate = p.mathTotal ? Math.round((p.mathCorrect / p.mathTotal) * 100) : 0;
  const logicRate = p.logicTotal ? Math.round((p.logicCorrect / p.logicTotal) * 100) : 0;

  return [
    `【近七天】\n${days.join('\n')}`,
    `【总览】连续学习 ${p.streak} 天，累计星星 ${p.stars} 颗，徽章 ${p.badges.length} 枚`,
    `【知识点】接触 ${touchedCount(p)} 个，已掌握 ${masteredCount(p)} 个，掌握率 ${masteryRate(p)}%`,
    `【分项正确率】数学 ${mathRate}%（${p.mathCorrect}/${p.mathTotal}）；逻辑 ${logicRate}%（${p.logicCorrect}/${p.logicTotal}）`,
    `【学科掌握率】${subLines}`,
    `【成长趋势】${trendLine}`,
    `【薄弱知识点】${weak.length ? weak.join('、') : '暂无'}`,
    `【错题本】${p.wrongBook.length} 条（${wrongDist || '无'}）`,
    `【古诗】已读 ${p.poemsRead.length} 首，背诵训练 ${Object.keys(p.poemRecite).length} 首`,
  ].join('\n\n');
}

function localDeepReport(p: Progress): DeepReport {
  const subs = REPORT_SUBJECTS
    .map((s) => {
      const items = Object.entries(p.mastery).filter(([k]) => k.startsWith(s.key + ':'));
      const pct = items.length ? items.reduce((a, [, m]) => a + (m.lv ?? 0), 0) / (items.length * 5) : 1;
      return { ...s, pct, count: items.length };
    })
    .filter((s) => s.count > 0);
  const weakSub = [...subs].sort((a, b) => a.pct - b.pct)[0];

  const g = p.growth.slice(-14);
  const delta = g.length >= 2 ? ((g[g.length - 1]?.rate ?? 0) - (g[0]?.rate ?? 0)) : 0;
  const trend =
    g.length < 2
      ? '多练几天，成长趋势就会显现啦'
      : delta > 0.05
        ? `近两周掌握率提升约 ${Math.round(delta * 100)} 个百分点，进步明显`
        : delta < -0.02
          ? '最近掌握率略有回落，可能是题目变难了，多鼓励'
          : '掌握率保持平稳，继续保持节奏';

  const strengths: string[] = [];
  if (p.streak >= 3) strengths.push(`已连续学习 ${p.streak} 天，规律打卡习惯很好`);
  if (masteredCount(p) > 0) strengths.push(`累计掌握 ${masteredCount(p)} 个知识点，基础在打牢`);
  if (p.stars >= 10) strengths.push(`获得 ${p.stars} 颗星星，学习很有热情`);

  const weaknesses: string[] = [];
  if (weakSub && weakSub.pct < 0.6) weaknesses.push(`${weakSub.label}掌握率只有 ${Math.round(weakSub.pct * 100)}%，建议多加练习`);
  const weak = weakSkills(p, 6).map((w) => skillLabel(w.skill));
  if (weak.length) weaknesses.push(`${weak.slice(0, 2).join('、')} 等知识点较薄弱，需复习`);
  if (p.wrongBook.length > 5) weaknesses.push(`错题本已有 ${p.wrongBook.length} 条，建议安排回炉`);

  const suggestions: string[] = [];
  if (weakSub && weakSub.pct < 0.6) suggestions.push(`每天给 ${weakSub.label} 加 2 道练习`);
  if (p.wrongBook.length > 0) suggestions.push('本周挑错题本里最多的类别做一次专项');
  if (p.streak < 3) suggestions.push('固定一个时间段学习，先连续 3 天养成习惯');

  return {
    summary:
      touchedCount(p) === 0
        ? '宝贝还没怎么练习，多引导入门就好'
        : `已接触 ${touchedCount(p)} 个知识点，掌握率 ${masteryRate(p)}%${weakSub && weakSub.pct < 0.6 ? `，${weakSub.label}偏薄弱` : ''}`,
    strengths: strengths.length ? strengths : ['保持现在的节奏，每天进步一点点'],
    weaknesses: weaknesses.length ? weaknesses : ['暂时没有明显的薄弱点'],
    trend,
    suggestions: suggestions.length ? suggestions : ['每天固定 15 分钟学习时间，优先做错题本'],
  };
}

export async function parentDeepReportTask(p: Progress): Promise<TaskResult<DeepReport>> {
  const fallback = localDeepReport(p);
  const r = await chat({
    scene: 'parent.deepReport',
    messages: deepReportMessages(buildDeepReportData(p)),
    json: true,
    cacheKey: `deep:${dateKey()}|${p.stars}|${p.wrongBook.length}|${touchedCount(p)}|${masteredCount(p)}`,
    cacheTtl: 6 * 60 * 60 * 1000,
  });

  if (!r.ok) return { ok: false, data: fallback, fallback: true, error: r.error, ms: r.ms };

  const parsed = extractJson<DeepReport>(r.text);
  const okStruct =
    parsed &&
    typeof parsed.summary === 'string' &&
    Array.isArray(parsed.strengths) &&
    Array.isArray(parsed.weaknesses) &&
    typeof parsed.trend === 'string' &&
    Array.isArray(parsed.suggestions);
  if (!okStruct) {
    return {
      ok: false,
      data: fallback,
      fallback: true,
      error: { code: 'bad_output', message: '报告格式不对', retryable: true },
      ms: r.ms,
    };
  }

  return {
    ok: true,
    data: {
      summary: String(parsed.summary).slice(0, 60),
      strengths: parsed.strengths.slice(0, 3).map((s) => String(s).slice(0, 40)),
      weaknesses: parsed.weaknesses.slice(0, 3).map((s) => String(s).slice(0, 40)),
      trend: String(parsed.trend).slice(0, 40),
      suggestions: parsed.suggestions.slice(0, 3).map((s) => String(s).slice(0, 30)),
    },
    fallback: false,
    ms: r.ms,
  };
}

/* ================================================================== */
/* v6 新增：每日学习总结（流式）                                       */
/* ================================================================== */
export function dailySummaryTask(
  learnedItems: string,
  stars: number,
  streak: number,
): StreamTask {
  return {
    scene: 'daily.summary',
    messages: dailySummaryMessages(learnedItems, stars, streak),
    cacheKey: `summary:${dateKey()}`,
    cacheTtl: 24 * 60 * 60 * 1000,
    fallback: `今天又学会了新本领，真棒！已经连续学习 ${streak} 天了，明天继续加油！`,
    title: '今日总结',
    hint: '小茜在总结今天的收获…',
  };
}

/* ================================================================== */
/* v6 新增：闯关失败鼓励（流式）                                       */
/* ================================================================== */
const ENCOURAGE_FALLBACK = [
  '差一点点就三颗星了，再试一次一定行！',
  '已经很棒了，多练几道题下次就满分啦！',
  '不怕不怕，闯关就是不断尝试，你做得很好！',
];

export function adventureEncourageTask(
  levelTitle: string,
  weakTypes: string,
  stars: number,
): StreamTask {
  return {
    scene: 'adventure.encourage',
    messages: adventureEncourageMessages(levelTitle, weakTypes, stars),
    fallback: pick(ENCOURAGE_FALLBACK, levelTitle.length + stars),
    title: '小茜鼓励你',
    hint: '小茜正在给你加油…',
  };
}

/* ================================================================== */
/* v6 新增：AI 错题分析（结构化）                                      */
/* ================================================================== */
function localWrongAnalyze(p: Progress): WrongAnalyze {
  const weak = weakSkills(p, 3).map((w) => skillLabel(w.skill));
  return {
    pattern: weak.length ? `${weak[0]} 类题目错误较多` : '错误较分散',
    suggest: weak.length ? `建议多做 ${weak[0]} 相关练习` : '多做综合练习巩固',
    priority: weak[0] || '按顺序练习',
    encourage: '错题是进步的阶梯，多练几遍就好啦！',
  };
}

export async function wrongAnalyzeTask(p: Progress): Promise<TaskResult<WrongAnalyze>> {
  const fallback = localWrongAnalyze(p);
  const wrongList = p.wrongBook.map((s) => skillLabel(s)).join('、');
  const dist: Record<string, number> = {};
  p.wrongBook.forEach((s) => {
    const cat = s.split(':')[0] ?? '';
    dist[cat] = (dist[cat] || 0) + 1;
  });
  const skillDist = Object.entries(dist).map(([k, v]) => `${k}:${v}题`).join('、');

  const r = await chat({
    scene: 'wrong.analyze',
    messages: wrongAnalyzeMessages(wrongList, p.wrongBook.length, skillDist),
    json: true,
    cacheKey: `wrong:${dateKey()}|${p.wrongBook.length}`,
    cacheTtl: 6 * 60 * 60 * 1000,
  });

  if (!r.ok) return { ok: false, data: fallback, fallback: true, error: r.error, ms: r.ms };

  const parsed = extractJson<WrongAnalyze>(r.text);
  if (!parsed || typeof parsed.pattern !== 'string') {
    return {
      ok: false,
      data: fallback,
      fallback: true,
      error: { code: 'bad_output', message: '分析格式不对', retryable: true },
      ms: r.ms,
    };
  }

  return {
    ok: true,
    data: {
      pattern: String(parsed.pattern).slice(0, 30),
      suggest: String(parsed.suggest).slice(0, 30),
      priority: String(parsed.priority).slice(0, 15),
      encourage: String(parsed.encourage).slice(0, 25),
    },
    fallback: false,
    ms: r.ms,
  };
}

/* ================================================================== */
/* v6 新增：AI 个性化复习推荐（结构化）                                */
/* ================================================================== */
function localRecommend(p: Progress): RecommendPractice {
  const due = dueSkills(p, 3);
  const weak = weakSkills(p, 3).map((w) => w.skill);
  const items = [...new Set([...weak, ...due])].slice(0, 3);
  return {
    greeting: p.streak > 1 ? `连续学习 ${p.streak} 天，真棒！` : '今天也要加油哦！',
    items: (items.length ? items : ['math:add', 'letter:A', 'number:count']).map((skill) => ({
      skill,
      reason: '多练几遍就更熟了',
    })),
  };
}

export async function recommendPracticeTask(p: Progress): Promise<TaskResult<RecommendPractice>> {
  const fallback = localRecommend(p);
  const weak = weakSkills(p, 5).map((w) => skillLabel(w.skill)).join('、');
  const due = dueSkills(p, 5).map((s) => skillLabel(s)).join('、');

  const r = await chat({
    scene: 'recommend.practice',
    messages: recommendPracticeMessages(weak, due, p.streak, masteryRate(p)),
    json: true,
    cacheKey: `recommend:${dateKey()}`,
    cacheTtl: 24 * 60 * 60 * 1000,
  });

  if (!r.ok) return { ok: false, data: fallback, fallback: true, error: r.error, ms: r.ms };

  const parsed = extractJson<RecommendPractice>(r.text);
  if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
    return {
      ok: false,
      data: fallback,
      fallback: true,
      error: { code: 'bad_output', message: '推荐格式不对', retryable: true },
      ms: r.ms,
    };
  }

  return {
    ok: true,
    data: {
      greeting: String(parsed.greeting || '').slice(0, 20),
      items: parsed.items.slice(0, 3).map((item) => ({
        skill: String(item.skill || '').slice(0, 20),
        reason: String(item.reason || '').slice(0, 15),
      })),
    },
    fallback: false,
    ms: r.ms,
  };
}

/* ================================================================== */
/* 家长 5 分钟亲子行动指南卡任务                                        */
/* ================================================================== */
export function localParentActions(_p: Progress): ParentActionPlan {
  return {
    greeting: `陪伴是最好的教育，每天 5 分钟游戏，宝贝进步看得见！🌟`,
    cards: [
      {
        title: '餐桌上的反义词大挑战',
        tag: '思维游戏',
        duration: '5分钟',
        guide: '家长说“大碗”，宝贝接“小碗”；家长说“多”，宝贝接“少”，轮流接龙。',
        benefit: '锻炼语言反应力与对立概念理解。',
      },
      {
        title: '生字寻宝大探险',
        tag: '汉字识字',
        duration: '5分钟',
        guide: '在绘本或食品包装上找出今天学过的生字，找到了就击掌庆祝！',
        benefit: '将静态识字融入生活场景，提升观察力。',
      },
      {
        title: '睡前悄悄话故事接龙',
        tag: '习惯表达',
        duration: '5分钟',
        guide: '家长开头：“森林里住着一只小动物…”，宝贝接下一句，一人一句编故事。',
        benefit: '激发天马行空的想象力与亲子亲密感。',
      },
    ],
  };
}

export async function parentActionsTask(p: Progress): Promise<TaskResult<ParentActionPlan>> {
  const fallback = localParentActions(p);
  const summary = buildDeepReportData(p);

  const r = await chat({
    scene: 'parent.actions',
    messages: parentActionsMessages(summary),
    json: true,
    cacheKey: `parent_actions:${dateKey()}|${p.stars}|${p.wrongBook.length}`,
    cacheTtl: 24 * 60 * 60 * 1000,
  });

  if (!r.ok) return { ok: false, data: fallback, fallback: true, error: r.error, ms: r.ms };

  const parsed = extractJson<ParentActionPlan>(r.text);
  if (!parsed || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    return {
      ok: false,
      data: fallback,
      fallback: true,
      error: { code: 'bad_output', message: '行动卡格式不对', retryable: true },
      ms: r.ms,
    };
  }

  return {
    ok: true,
    data: {
      greeting: String(parsed.greeting || '').slice(0, 30),
      cards: parsed.cards.slice(0, 3).map((c) => ({
        title: String(c.title || '亲子互动小游戏').slice(0, 25),
        tag: String(c.tag || '习惯').slice(0, 10),
        duration: String(c.duration || '5分钟').slice(0, 10),
        guide: String(c.guide || '').slice(0, 60),
        benefit: String(c.benefit || '').slice(0, 30),
      })),
    },
    fallback: false,
    ms: r.ms,
  };
}

