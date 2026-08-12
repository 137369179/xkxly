/**
 * AI 任务 · 批改类
 * 古诗背诵讲评：AI 给出「哪里错了 + 为什么 + 怎么改」的人话点评。
 *
 * 注意：分数以本地 scoreRecite 为准（确定性、可复现），
 * AI 只负责 praise / wrong 解释 / advice，避免模型算错分导致成绩漂移。
 */
import { chat } from '../client';
import { extractJson } from '../guard';
import { reciteGradeMessages, type ReciteGrade } from '../prompts';
import type { TaskResult } from './types';

function localGrade(score: number): ReciteGrade {
  if (score >= 95) {
    return { score, praise: '一字不差，太厉害啦！', wrong: [], advice: '试试更难的遮挡等级吧！' };
  }
  if (score >= 80) {
    return { score, praise: '大部分都写对了，很棒！', wrong: [], advice: '把没记牢的那几个字多读两遍。' };
  }
  if (score >= 50) {
    return { score, praise: '已经记住一半啦，继续加油！', wrong: [], advice: '先看着原文读三遍，再来默写。' };
  }
  return { score, praise: '敢动笔就很勇敢！', wrong: [], advice: '我们先一句一句跟读，明天再默写。' };
}

function sane(g: ReciteGrade | null): g is ReciteGrade {
  return !!g && typeof g.praise === 'string' && Array.isArray(g.wrong);
}

/**
 * @param localScore 本地评分引擎算出的分数，作为最终分数
 */
export async function gradeRecite(
  title: string,
  original: string,
  answer: string,
  localScore: number,
): Promise<TaskResult<ReciteGrade>> {
  const fallback = localGrade(localScore);
  if (!answer.trim()) return { ok: false, data: fallback, fallback: true };

  const r = await chat({
    scene: 'poem.grade',
    messages: reciteGradeMessages(title, original, answer),
    json: true,
  });

  if (!r.ok) return { ok: false, data: fallback, fallback: true, error: r.error, ms: r.ms };

  const parsed = extractJson<ReciteGrade>(r.text);
  if (!sane(parsed)) {
    return {
      ok: false,
      data: fallback,
      fallback: true,
      error: { code: 'bad_output', message: '讲评格式不对', retryable: true },
      ms: r.ms,
    };
  }

  return {
    ok: true,
    fallback: false,
    ms: r.ms,
    data: {
      // 分数一律以本地引擎为准
      score: localScore,
      praise: parsed.praise.slice(0, 30),
      wrong: parsed.wrong
        .filter((w) => w && (w.got || w.want))
        .slice(0, 3)
        .map((w) => ({
          got: String(w.got ?? '').slice(0, 8),
          want: String(w.want ?? '').slice(0, 8),
          tip: String(w.tip ?? '').slice(0, 24),
        })),
      advice: String(parsed.advice ?? '').slice(0, 40),
    },
  };
}
