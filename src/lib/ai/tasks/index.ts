/** AI 任务层统一出口 */
export type { StreamTask, TaskResult } from './types';
export { logicExplainTask, logicDetectiveTask, mathExplainTask, poemTutorTask, poemImagineTask, poemCompareTask, poemProsodyTask, poetStoryTask, quizExtendTask, hanziStoryTask, pinyinTutorTask, wordPhonicsTask, scienceAskTask, scienceExperimentTask, hanziMnemonicTask, wordQuizTask } from './explain';
export { MATH_THEMES, genMathQuestion, genTodayPlan, letterStoryTask, numberStoryTask, genCountQuestion, genLetterMatch, hanziSentenceTask, wordStoryTask, rhymeCreateTask, wrongVariantTask, localWrongVariant } from './generate';
export { gradeRecite } from './grade';
export { buildReportData, parentReportTask, parentDeepReportTask, buildDeepReportData, praiseTask, dailySummaryTask, adventureEncourageTask, wrongAnalyzeTask, recommendPracticeTask, parentActionsTask, localParentActions } from './report';
export { storybookTask, createStorybookTask, fallbackStorybook, createStoryBranchTask, fallbackStoryBranch } from './storybook';
export { pathNarrateTask, pathWeeklyTask, pathCoachTask } from './path';
export { companionChatTask, companionExplainTask, localChatReply, buddyQuizTask, dailyQuestTask, companionComfortTask, companionCelebrateTask, companionFollowUpTask, localDailyQuestPlan } from './companion';
export type { BuddyQuizData, DailyQuestPlan } from './companion';
export { idiomStoryTask, idiomSentenceTask, idiomHintTask, localIdiomStory, localIdiomSentences, localIdiomHint } from './idiom';
export type { IdiomSentenceData, IdiomHintData } from './idiom';
export { songRecommendTask, songExplainTask } from './song';
export type { SongRecommendData } from './song';
export { masteryCue } from './personalize';
export { musicCreateTask, musicRhythmTask, localMusicCreate, localMusicRhythm } from './music';
export { festivalTalkTask, safetySceneTask, safetyRoleplayTask, localFestivalTalk, localSafetyScene } from './culture';
