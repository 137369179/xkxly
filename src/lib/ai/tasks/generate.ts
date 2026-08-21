/**
 * AI 任务 · 生成类
 * 字母小故事（流式）/ 数学应用题（结构化）/ 今日课程排课（结构化）
 * v6 新增：数字小故事（流式）/ AI 情景数数题（结构化）/ AI 字母配对出题（结构化）
 */
import type { Progress, Question, QuestionKind } from '@/types';
import { makeMathQuestion, makeCountQuestion } from '@/lib/questions';
import { skillLabel, weakSkills } from '@/lib/srs';
import { chat } from '../client';
import { extractJson } from '../guard';
import {
  letterStoryMessages,
  mathGenerateMessages,
  planTodayMessages,
  numberStoryMessages,
  countGenerateMessages,
  letterMatchMessages,
  hanziSentenceMessages,
  wordStoryMessages,
  rhymeCreateMessages,
  wrongVariantMessages,
  type GenMathQuestion,
  type GenCountQuestion,
  type GenLetterMatch,
  type TodayPlan,
  type HanziSentenceCtx,
  type WordStoryCtx,
  type WrongVariantQuestion,
} from '../prompts';
import { pick, type StreamTask, type TaskResult } from './types';

/* ================================================================== */
/* 字母小故事（流式，短）                                              */
/* ================================================================== */
export function letterStoryTask(letter: string, word: string, zh: string): StreamTask {
  return {
    scene: 'letter.story',
    messages: letterStoryMessages(letter, word, zh),
    // 26 个字母的顺口溜生成一次就够，长期缓存
    cacheKey: `letter:${letter}`,
    fallback: `${letter} 像小拱门，站得稳又直。\n${word} 就是${zh}，跟着念一遍！`,
    title: '字母顺口溜',
    hint: '小茜正在编顺口溜…',
  };
}

/* ================================================================== */
/* 数学应用题（结构化 → 转成站内 Question）                            */
/* ================================================================== */

/** 生活化主题池：让 AI 出的题有画面感，而不是干巴巴的算式 */
export const MATH_THEMES = [
  '在水果店买苹果',
  '小动物开运动会',
  '和好朋友分糖果',
  '停车场里的小汽车',
  '花园里飞来的蝴蝶',
  '书包里的铅笔',
  '池塘里的小鸭子',
  '生日会上的气球',
] as const;

let genSeq = 0;

function toQuestion(g: GenMathQuestion, skill: string): Question | null {
  if (!g || !Array.isArray(g.options) || g.options.length < 2) return null;
  const idx = Number(g.answer);
  if (!Number.isInteger(idx) || idx < 0 || idx >= g.options.length) return null;

  const base = `ai-${Date.now().toString(36)}-${genSeq++}`;
  const options = g.options.map((label, i) => ({ id: `${base}-${i}`, label: String(label) }));
  return {
    id: base,
    kind: 'math' as QuestionKind,
    prompt: String(g.prompt || '').slice(0, 60),
    display: String(g.display || '').slice(0, 24),
    speak: String(g.prompt || '').slice(0, 60),
    speakLang: 'zh-CN',
    options,
    answerId: options[idx]!.id,
    hint: String(g.hint || '').slice(0, 40),
    why: String(g.why || '').slice(0, 40),
    skill,
  };
}

/**
 * 让 AI 出一道情景应用题。失败时无缝退回本地题库。
 * @param max 数字上限（10 / 15 / 20，与站内难度分级一致）
 */
export async function genMathQuestion(
  op: 'add' | 'sub',
  max: number,
  theme?: string,
): Promise<TaskResult<Question>> {
  const skill = op === 'add' ? 'math:add' : 'math:sub';
  const local = () => makeMathQuestion(max <= 10 ? 1 : max <= 15 ? 2 : 3, op);
  const t = theme || pick(MATH_THEMES, Date.now());

  const r = await chat({
    scene: 'math.generate',
    messages: mathGenerateMessages(t, op === 'add' ? '加法' : '减法', max),
    json: true,
  });

  if (!r.ok) return { ok: false, data: local(), fallback: true, error: r.error, ms: r.ms };

  const parsed = extractJson<GenMathQuestion>(r.text);
  const q = parsed ? toQuestion(parsed, skill) : null;
  if (!q) {
    return {
      ok: false,
      data: local(),
      fallback: true,
      error: { code: 'bad_output', message: '题目格式不对', retryable: true },
      ms: r.ms,
    };
  }
  return { ok: true, data: q, fallback: false, ms: r.ms };
}

/* ================================================================== */
/* 今日课程 AI 排课（结构化）                                          */
/* ================================================================== */

function localPlan(streak: number, weak: string[]): TodayPlan {
  return {
    greeting: streak > 1 ? `已经连续学习 ${streak} 天啦，真棒！` : '今天也要开开心心学新东西！',
    focus: weak.length ? `重点复习：${weak[0]}` : '认认真真过一遍今日课程',
    steps: [
      { title: '暖身复习', reason: '先把学过的捡回来' },
      { title: '学新内容', reason: '每天进步一点点' },
      { title: '闯关挑战', reason: '检验今天的成果' },
    ],
    cheer: '小茜在这里陪着你，加油！',
  };
}

function validPlan(p: TodayPlan | null): p is TodayPlan {
  return !!p && typeof p.greeting === 'string' && Array.isArray(p.steps) && p.steps.length > 0;
}

/** 基于掌握度与连续天数，让 AI 给出今天的学习主线 */
export async function genTodayPlan(progress: Progress): Promise<TaskResult<TodayPlan>> {
  const weak = weakSkills(progress, 4).map((w) => skillLabel(w.skill));
  const fallback = localPlan(progress.streak, weak);

  const r = await chat({
    scene: 'plan.today',
    messages: planTodayMessages(weak.join('、'), progress.streak, progress.stars),
    json: true,
    // 同一天同样的薄弱项，只算一次
    cacheKey: `${new Date().toDateString()}|${weak.join(',')}|${progress.streak}`,
    cacheTtl: 12 * 60 * 60 * 1000,
  });

  if (!r.ok) return { ok: false, data: fallback, fallback: true, error: r.error, ms: r.ms };

  const parsed = extractJson<TodayPlan>(r.text);
  if (!validPlan(parsed)) {
    return {
      ok: false,
      data: fallback,
      fallback: true,
      error: { code: 'bad_output', message: '排课格式不对', retryable: true },
      ms: r.ms,
    };
  }
  return {
    ok: true,
    data: { ...parsed, steps: parsed.steps.slice(0, 3) },
    fallback: false,
    ms: r.ms,
  };
}

/* ================================================================== */
/* v6 新增：数字小故事（流式）                                         */
/* ================================================================== */
const NUMBER_FALLBACKS: Record<number, string> = {
  0: '零像个大鸭蛋，圆滚滚地转。\n零就是没有，但少它不行！',
  1: '一像小铅笔，直直站起来。\n一就是开始，第一个最棒！',
  2: '二像小鸭子，水里游啊游。\n二就是一对，好朋友不分开！',
  3: '三像小耳朵，弯弯真好看。\n三就是很多，三颗糖够甜！',
  5: '五像小手掌，五根手指头。\n五就是一掌，数数最方便！',
  10: '十像小棍子加个圈。\n十就是满满，两手都数完！',
};

export function numberStoryTask(n: number): StreamTask {
  return {
    scene: 'number.story',
    messages: numberStoryMessages(n),
    cacheKey: `number:${n}`,
    fallback: NUMBER_FALLBACKS[n] || `${n} 个东西排一排，数一数真好玩。\n记住 ${n} 这个数，生活中到处都有它！`,
    title: '数字儿歌',
    hint: '小茜正在编儿歌…',
  };
}

/* ================================================================== */
/* v6 新增：AI 情景数数题（结构化）                                    */
/* ================================================================== */
const COUNT_THEMES = [
  '果园里的水果',
  '池塘里的小蝌蚪',
  '天上的星星',
  '花园里的蝴蝶',
  '草地上的小蘑菇',
  '篮子里的鸡蛋',
  '树上的小鸟',
  '桌上的糖果',
] as const;

let countSeq = 0;

export async function genCountQuestion(
  max: number,
): Promise<TaskResult<Question>> {
  const local = () => makeCountQuestion(max <= 9 ? 1 : max <= 14 ? 2 : 3);
  const theme = pick(COUNT_THEMES, Date.now());

  const r = await chat({
    scene: 'count.generate',
    messages: countGenerateMessages(max, theme),
    json: true,
  });

  if (!r.ok) return { ok: false, data: local(), fallback: true, error: r.error, ms: r.ms };

  const parsed = extractJson<GenCountQuestion>(r.text);
  if (!parsed || !Array.isArray(parsed.options) || parsed.options.length < 3) {
    return {
      ok: false,
      data: local(),
      fallback: true,
      error: { code: 'bad_output', message: '数数题格式不对', retryable: true },
      ms: r.ms,
    };
  }

  const idx = Number(parsed.answer);
  if (!Number.isInteger(idx) || idx < 0 || idx >= parsed.options.length) {
    return {
      ok: false,
      data: local(),
      fallback: true,
      error: { code: 'bad_output', message: '答案下标不对', retryable: true },
      ms: r.ms,
    };
  }

  const base = `ai-count-${Date.now().toString(36)}-${countSeq++}`;
  const options = parsed.options.map((label, i) => ({ id: `${base}-${i}`, label: String(label) }));
  return {
    ok: true,
    data: {
      id: base,
      kind: 'count' as QuestionKind,
      prompt: String(parsed.prompt || '').slice(0, 60),
      displayShapes: Array.from({ length: parsed.count }, () => parsed.emoji || '🍎'),
      speak: String(parsed.prompt || '').slice(0, 60),
      speakLang: 'zh-CN',
      options,
      answerId: options[idx]!.id,
      hint: String(parsed.hint || '').slice(0, 40),
      why: String(parsed.hint || '').slice(0, 40),
      skill: 'number:count',
    },
    fallback: false,
    ms: r.ms,
  };
}

/* ================================================================== */
/* v6 新增：AI 字母配对出题（结构化）                                  */
/* ================================================================== */
export async function genLetterMatch(
  unlearned: string[],
  weak: string[],
  learned: string[],
): Promise<TaskResult<string[]>> {
  // 本地兜底：从未学中选 4 个，已学选 2 个
  const local = (): string[] => {
    const pool = [...unlearned, ...learned].slice(0, 6);
    while (pool.length < 6 && learned.length > 0) {
      pool.push(learned[pool.length % learned.length]!);
    }
    return pool.slice(0, 6);
  };

  const r = await chat({
    scene: 'letter.match',
    messages: letterMatchMessages(unlearned, weak, learned),
    json: true,
  });

  if (!r.ok) return { ok: false, data: local(), fallback: true, error: r.error, ms: r.ms };

  const parsed = extractJson<GenLetterMatch>(r.text);
  if (!parsed || !Array.isArray(parsed.letters) || parsed.letters.length < 6) {
    return {
      ok: false,
      data: local(),
      fallback: true,
      error: { code: 'bad_output', message: '字母列表不对', retryable: true },
      ms: r.ms,
    };
  }

  return {
    ok: true,
    data: parsed.letters.slice(0, 6),
    fallback: false,
    ms: r.ms,
  };
}

/* ================================================================== */
/* 汉字造句（流式）                                                */
/* ================================================================== */
export function hanziSentenceTask(ctx: HanziSentenceCtx): StreamTask {
  return {
    scene: 'hanzi.sentence',
    messages: hanziSentenceMessages(ctx),
    fallback:
      ctx.sentence?.slice(0, 60) ||
      (ctx.words?.length
        ? ctx.words.map((w) => `${w}真好玩。`).join('\n')
        : `用「${ctx.char}」字可以说好多话，你也试试看！`),
    title: '小茜造句',
    hint: '小茜正在想句子…',
  };
}

/* ================================================================== */
/* 英语单词故事（流式）                                            */
/* ================================================================== */
export function wordStoryTask(ctx: WordStoryCtx): StreamTask {
  return {
    scene: 'word.story',
    messages: wordStoryMessages(ctx),
    cacheKey: `word:${ctx.word}`,
    fallback: `The ${ctx.word} is here. ${ctx.meaning}就在身边，你也找找看吧！`,
    title: '单词小故事',
    hint: '小茜正在编故事…',
  };
}

/* ================================================================== */
/* AI 汉字/生词顺口溜创作（流式）                                      */
/* ================================================================== */
export function rhymeCreateTask(subject: string, type: 'hanzi' | 'word' = 'hanzi'): StreamTask {
  return {
    scene: 'rhyme.create',
    messages: rhymeCreateMessages(subject, type),
    cacheKey: `rhyme:${type}:${subject}`,
    fallback: type === 'hanzi'
      ? `「${subject}」字真奇妙，仔细观察记得牢。天天向上多练习，写得端正顶呱呱！🌟`
      : `Word "${subject}", cute and bright! Say it clearly, say it right! 🎈`,
    title: '顺口溜小儿歌',
    hint: '小茜正在创作儿歌顺口溜…',
  };
}

/* ================================================================== */
/* AI 错题名师变式题（结构化 JSON）                                      */
/* ================================================================== */
export function localWrongVariant(
  skillId: string,
  originalQuestion: string,
  originalAnswer: string,
): WrongVariantQuestion {
  return {
    question: `【名师变式题】小松鼠在收集松果，考察知识点「${skillId}」：${originalQuestion}`,
    options: [originalAnswer, '选项B', '选项C', '选项D'],
    answer: originalAnswer,
    explanation: '看清题目的关键数量关系，一步一步推导即可得出答案！',
    hint: '仔细读题，找找题目里的数字朋友哦！',
  };
}

export async function wrongVariantTask(
  skillId: string,
  originalQuestion: string,
  originalAnswer: string,
): Promise<TaskResult<WrongVariantQuestion>> {
  const fallback = localWrongVariant(skillId, originalQuestion, originalAnswer);

  const r = await chat({
    scene: 'wrong.variant',
    messages: wrongVariantMessages(skillId, originalQuestion, originalAnswer),
    json: true,
    cacheKey: `variant:${skillId}:${originalQuestion}`,
  });

  if (!r.ok) return { ok: false, data: fallback, fallback: true, error: r.error, ms: r.ms };

  const parsed = extractJson<WrongVariantQuestion>(r.text);
  if (!parsed || !parsed.question || !Array.isArray(parsed.options) || !parsed.answer) {
    return {
      ok: false,
      data: fallback,
      fallback: true,
      error: { code: 'bad_output', message: '变式题格式不对', retryable: true },
      ms: r.ms,
    };
  }

  return {
    ok: true,
    data: {
      question: String(parsed.question).slice(0, 60),
      options: parsed.options.slice(0, 4).map((o) => String(o).slice(0, 25)),
      answer: String(parsed.answer).slice(0, 25),
      explanation: String(parsed.explanation || '仔细分析题意即可解出').slice(0, 50),
      hint: String(parsed.hint || '认真思考').slice(0, 25),
    },
    fallback: false,
    ms: r.ms,
  };
}

