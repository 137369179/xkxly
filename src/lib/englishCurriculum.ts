/**
 * 英语课程体系（5 阶段进阶模型）
 * ------------------------------------------------------------
 * 字母启蒙 → 自然拼读 → 高频词 → 句子跟读 → 情景对话
 * 每个阶段有明确的掌握目标（skill 计数），完成前一阶段自动解锁下一阶段。
 * 供 WordsPage 课程首页、dailyPlan 阶段推荐、字母/单词模块串联使用。
 */
import type { Progress } from '@/types';
import { getAllWords } from '@/data/wordIndex';
import { SENTENCES } from '@/data/sentences';
import { getAllDialogues } from '@/data/dialogues';
import { LETTERS } from '@/data/letters';
import { getAllSightWords } from '@/data/sightWords';

export type EnglishStage = 1 | 2 | 3 | 4 | 5;

export interface EnglishStageDef {
  stage: EnglishStage;
  name: string;
  emoji: string;
  tone: 'blue' | 'purple' | 'pink' | 'green' | 'orange';
  desc: string;
  goal: string;
  /** 完成判定：掌握（lv>=1）的 skill 数达到目标 */
  targetCount: number;
  /** 判定依据的 skill 池大小 */
  totalCount: number;
  /** 用于统计的 skill 前缀（word: 同时服务拼读与高频词阶段） */
  skillPrefix: 'letter:' | 'word:' | 'sentence:' | 'dialogue:';
  unlockHint: string;
}

/** 阶段顺序定义 */
export const ENGLISH_STAGES: EnglishStageDef[] = [
  {
    stage: 1, name: '字母启蒙', emoji: '🔤', tone: 'blue',
    desc: '认识 26 个字母的样子和发音',
    goal: '认读大小写字母',
    targetCount: 10, totalCount: LETTERS.length, skillPrefix: 'letter:',
    unlockHint: '完成字母学习后解锁自然拼读',
  },
  {
    stage: 2, name: '自然拼读', emoji: '🎵', tone: 'purple',
    desc: '学会字母和组合的发音，见词能拼',
    goal: '掌握 30 个单词的拼读',
    targetCount: 30, totalCount: getAllWords().length, skillPrefix: 'word:',
    unlockHint: '掌握 30 个单词后解锁高频词',
  },
  {
    stage: 3, name: '高频词', emoji: '✨', tone: 'pink',
    desc: '高频词见词能读，扫清阅读障碍',
    goal: '累计掌握 80 个单词',
    targetCount: 80, totalCount: getAllSightWords().length, skillPrefix: 'word:',
    unlockHint: '累计掌握 80 个单词后解锁句子',
  },
  {
    stage: 4, name: '句子跟读', emoji: '🗣️', tone: 'green',
    desc: '读会说日常句子，语调自然',
    goal: '跟读掌握 10 个句子',
    targetCount: 10, totalCount: SENTENCES.length, skillPrefix: 'sentence:',
    unlockHint: '掌握 10 个句子后解锁对话',
  },
  {
    stage: 5, name: '情景对话', emoji: '💬', tone: 'orange',
    desc: '在情景中开口交流，学以致用',
    goal: '完成 3 个情景对话',
    targetCount: 3, totalCount: getAllDialogues().length, skillPrefix: 'dialogue:',
    unlockHint: '终极阶段：大胆开口说英语',
  },
];

/** 统计某前缀的已掌握（lv>=1）skill 数 */
export function masteredCount(progress: Progress, prefix: string): number {
  return Object.entries(progress.mastery).filter(([k, m]) => k.startsWith(prefix) && m && m.lv >= 1).length;
}

/** 某阶段是否完成 */
export function isStageDone(progress: Progress, stage: EnglishStage): boolean {
  const def = ENGLISH_STAGES.find((s) => s.stage === stage);
  if (!def) return false;
  return masteredCount(progress, def.skillPrefix) >= def.targetCount;
}

/** 当前所在阶段（第一个未完成的阶段，全部完成返回 5） */
export function currentStage(progress: Progress): EnglishStage {
  for (const def of ENGLISH_STAGES) {
    if (!isStageDone(progress, def.stage)) return def.stage;
  }
  return 5;
}

/** 当前阶段是否已解锁（前序阶段全部完成） */
export function isStageUnlocked(progress: Progress, stage: EnglishStage): boolean {
  for (let s = 1; s < stage; s++) {
    if (!isStageDone(progress, s as EnglishStage)) return false;
  }
  return true;
}

/** 阶段完成度 0-1（用于进度条） */
export function stageProgress(progress: Progress, stage: EnglishStage): number {
  const def = ENGLISH_STAGES.find((s) => s.stage === stage);
  if (!def) return 0;
  return Math.min(1, masteredCount(progress, def.skillPrefix) / def.targetCount);
}

/** 课程总览：每阶段的完成数/目标数 */
export function stageOverview(progress: Progress) {
  return ENGLISH_STAGES.map((def) => ({
    def,
    done: masteredCount(progress, def.skillPrefix),
    progress: stageProgress(progress, def.stage),
    unlocked: isStageUnlocked(progress, def.stage),
    completed: isStageDone(progress, def.stage),
  }));
}
