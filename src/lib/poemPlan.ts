/**
 * 个性化复习计划引擎
 * ------------------------------------------------------------
 * 综合「用户难点标记（难字 / 难句）」与「背诵成绩（ReciteStat）」，
 * 为单首诗生成一份量身复习路线：先听范读热身，再针对难点跟读，
 * 接自测与分关遮挡背诵，最后复盘。难度关卡依据历史最佳自动递进。
 *
 * 纯函数、无副作用；调用方（PoemsPage）负责把结果落盘 / 回写 SRS。
 */
import type { DeepPoem, PoemMark, ReciteStat } from '@/types';

export type PlanStepType = 'listen' | 'read' | 'mark' | 'quiz' | 'recite' | 'review';

export interface PlanStep {
  type: PlanStepType;
  title: string;
  desc: string;
  /** 对应 tone 色键（与 Card / CandyButton 一致） */
  tone: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'yellow';
}

export interface PoemPlan {
  poemId: string;
  steps: PlanStep[];
  /** 重点攻克对象（难字 + 难句文本） */
  focus: string[];
  /** 建议的下一背诵关卡 1-4 */
  nextStage: number;
  priority: 'high' | 'mid' | 'low';
  note: string;
}

const DAY = 24 * 3600 * 1000;

/** 生成单首诗的复习计划 */
export function buildPlan(
  poem: DeepPoem,
  mark?: PoemMark,
  recite?: ReciteStat,
): PoemPlan {
  const focus: string[] = [];
  if (mark) {
    if (mark.chars.length) focus.push(...mark.chars.map((c) => `难字「${c}」`));
    if (mark.lines.length) {
      mark.lines.forEach((li) => {
        const line = poem.lines[li];
        if (line) focus.push(`难句：「${line.chars.map((c) => c.c).join('')}」`);
      });
    }
  }

  const nextStage = Math.min(4, (recite?.stage ?? 0) + 1);
  const steps: PlanStep[] = [];

  steps.push({
    type: 'listen',
    title: '听范读 · 入意境',
    desc: `先听一遍《${poem.title}》的范读 / 吟诵，感受平仄节奏与韵脚落腔。`,
    tone: 'blue',
  });

  steps.push({
    type: 'read',
    title: '跟读 · 正字音',
    desc: '逐句跟读，重点校正平翘舌、前后鼻音与入声短促处。',
    tone: 'green',
  });

  if (focus.length) {
    steps.push({
      type: 'mark',
      title: '专攻难点',
      desc: `你标记的重点：${focus.join('；')}。先单独读熟再串入全篇。`,
      tone: 'orange',
    });
  }

  steps.push({
    type: 'quiz',
    title: '自测 · 固记忆',
    desc: '做几道作者 / 接句 / 填空自测题，检验是否真的记住了。',
    tone: 'purple',
  });

  steps.push({
    type: 'recite',
    title: `遮挡背诵 · 第 ${nextStage} 关`,
    desc:
      nextStage >= 4
        ? '全隐默写，纯回忆通篇——这是通关前的最后一关。'
        : `本关隐去部分字词（关卡 ${nextStage}/4），看着提示把空缺补出来。`,
    tone: 'pink',
  });

  steps.push({
    type: 'review',
    title: '复盘 · 再听对照',
    desc: '背完对照原文与范读，标记仍不熟处，纳入下次复习。',
    tone: 'yellow',
  });

  // 优先级判定
  const stale = recite ? Date.now() - recite.lastAt > 7 * DAY : true;
  const weak = recite ? recite.best < 60 : false;
  const hasMark = !!(mark && (mark.chars.length || mark.lines.length));
  let priority: PoemPlan['priority'] = 'low';
  let reason = '尚属熟练，按计划周期复习即可。';
  if (hasMark || weak || (recite && stale)) {
    priority = 'high';
    reason = weak
      ? '上次背诵得分偏低，建议优先重练并降低遮挡关卡。'
      : hasMark
        ? '存在你标记的难点，优先针对攻克。'
        : '距上次背诵已超一周，间隔重复防遗忘。';
  } else if (recite && recite.best >= 80) {
    priority = 'mid';
    reason = '掌握较好，可拉长按息周期，偶尔复盘。';
  }

  return {
    poemId: poem.id,
    steps,
    focus,
    nextStage,
    priority,
    note: reason,
  };
}

/** 计划步骤的中文短标签（UI 用）；tr 可选：传入后输出翻译文案 */
export function stepLabel(t: PlanStepType, tr?: (k: string, p?: Record<string, string | number>) => string): string {
  if (tr) {
    const map: Record<PlanStepType, string> = {
      listen: tr('poem.stepListen'),
      read: tr('poem.stepRead'),
      mark: tr('poem.stepMark'),
      quiz: tr('poem.stepQuiz'),
      recite: tr('poem.stepRecite'),
      review: tr('poem.stepReview'),
    };
    return map[t];
  }
  return (
    {
      listen: '听读',
      read: '跟读',
      mark: '难点',
      quiz: '自测',
      recite: '背诵',
      review: '复盘',
    } as Record<PlanStepType, string>
  )[t];
}
