/**
 * AI 服务层 · Prompt 库（统一出口）
 * ------------------------------------------------------------
 * 本文件为向后兼容的薄包装层，真实实现已拆分至子模块：
 *   - @/lib/ai/prompts/core     —— PERSONA 常量与 sys/user 工厂
 *   - @/lib/ai/prompts/learning —— 古诗/数学/逻辑/字母/数字/汉字/拼音/单词/绘本/成语
 *   - @/lib/ai/prompts/path-companion —— 路径规划/陪伴/歌曲/音乐/节日/安全
 *   - @/lib/ai/prompts/parent   —— 家长端学情报告/错题分析/推荐练习
 *
 * 设计原则：
 *   1. 前缀稳定 —— 实测 Agnes 有 prompt cache（cached_tokens: 256），
 *      把不变的人格设定放最前，变量一律后置，能吃到缓存、降低延迟。
 *   2. 人格统一 —— 全站同一个角色「小茜」，语气一致。
 *   3. 硬约束前置 —— 面向 5 岁儿童的边界写死在 system 里，不靠模型自觉。
 *   4. 输出可解析 —— 结构化任务明确给出 JSON schema 与示例。
 */
export {
  PERSONA,
  PERSONA_PARENT,
} from './prompts/core';

export type { AiMessage } from './types';

// ── Learning domain ──────────────────────────────────────────
export type {
  PoemCtx,
  ReciteGrade,
  GenMathQuestion,
  PoemCompareInput,
  HanziStoryCtx,
  HanziSentenceCtx,
  PinyinTutorCtx,
  WordStoryCtx,
  WordPhonicsCtx,
  StoryBookPageData,
  StoryBookData,
  StoryBranchData,
  GenCountQuestion,
  GenLetterMatch,
} from './prompts/learning';

export {
  poemTutorSystem,
  poemTutorAsk,
  poemTutorOpening,
  reciteGradeMessages,
  mathExplainMessages,
  mathGenerateMessages,
  logicExplainMessages,
  letterStoryMessages,
  numberStoryMessages,
  countGenerateMessages,
  letterMatchMessages,
  poemImagineMessages,
  poemCompareMessages,
  poemProsodyMessages,
  poetStoryMessages,
  hanziStoryMessages,
  hanziSentenceMessages,
  pinyinTutorMessages,
  wordStoryMessages,
  wordPhonicsMessages,
  storybookMessages,
  storybookBranchMessages,
  quizExtendMessages,
  adventureEncourageMessages,
  idiomStoryMessages,
  idiomSentenceMessages,
  idiomHintMessages,
  scienceAskMessages,
  scienceExperimentMessages,
  hanziMnemonicMessages,
  wordQuizMessages,
  safetyRoleplayMessages,
  wrongVariantMessages,
  logicDetectiveMessages,
  rhymeCreateMessages,
  type WrongVariantQuestion,
} from './prompts/learning';

// ── Path & Companion domain ──────────────────────────────────
export type { TodayPlan, SongRecommendData } from './prompts/path-companion';

export {
  planTodayMessages,
  praiseMessages,
  dailySummaryMessages,
  pathNarrateMessages,
  pathWeeklyMessages,
  pathCoachMessages,
  companionChatMessages,
  companionExplainMessages,
  buddyQuizMessages,
  companionComfortMessages,
  companionCelebrateMessages,
  companionFollowUpMessages,
  dailyQuestMessages,
  songRecommendMessages,
  songExplainMessages,
  musicCreateMessages,
  musicRhythmMessages,
  festivalTalkMessages,
  safetySceneMessages,
} from './prompts/path-companion';

// ── Parent reports domain ────────────────────────────────────
export type { DeepReport, WrongAnalyze, RecommendPractice, ParentActionCard, ParentActionPlan } from './prompts/parent';

export {
  parentReportMessages,
  deepReportMessages,
  wrongAnalyzeMessages,
  recommendPracticeMessages,
  parentActionsMessages,
} from './prompts/parent';
