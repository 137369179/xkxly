/**
 * AI Prompt 统一出口
 * ------------------------------------------------------------
 * 所有 domain 子文件在这里重新导出，调用方只需 import 这一个路径，
 * 便于后续维护（新增函数只需在对应 domain 文件中添加，这里同步 export）。
 */

// Core
export { PERSONA, PERSONA_PARENT } from './core';
export type { AiMessage } from '../types';

// Learning (poems, math, logic, letters, numbers, hanzi, pinyin, words, storybook, idioms)
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
} from './learning';
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
} from './learning';

// Path & Companion
export type { TodayPlan, SongRecommendData } from './path-companion';
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
} from './path-companion';

// Parent reports
export type { DeepReport, WrongAnalyze, RecommendPractice, ParentActionCard, ParentActionPlan } from './parent';
export {
  parentReportMessages,
  deepReportMessages,
  wrongAnalyzeMessages,
  recommendPracticeMessages,
  parentActionsMessages,
} from './parent';
