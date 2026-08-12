import type { Tone } from '@/lib/tones';
import type { AiContentType } from '@/lib/ai/contentClient';

/**
 * 研究模式（CMML）核心类型 · 纯类型模块（lib 层，零 React / 零 store 依赖）
 * 与主架构 §3 状态图一一对应。索引访问（density / 注册表）一律用 `?? DEFAULT` 兜底，
 * 禁止 `!` 断言（项目已开 noUncheckedIndexedAccess）。
 */

/** FSM 状态（与 §2.1 状态图一一对应） */
export type ResearchStatus =
  | 'IDLE'
  | 'TOPIC_SELECT'
  | 'EXPLORE'
  | 'KNOWLEDGE_CARD'
  | 'QUIZ'
  | 'REVIEW'
  | 'COMPLETE';

/** 媒体槽标识 —— 指向既有 Explore 组件的注册表键，而非组件引用本身 */
export type ExploreSlotKey =
  | 'color' // src/components/ColorExplore.tsx
  | 'vehicle' // src/components/VehicleExplore.tsx
  | 'job' // src/components/JobExplore.tsx
  | 'dino' // src/modules/science/components/DinoWorld.tsx
  | 'space' // src/modules/science/components/SpaceExplorer.tsx
  | 'body'; // src/modules/science/components/BodyAdventure.tsx

/** 静态选题注册项（F2）—— 数据驱动，禁内联中文（C7） */
export interface ResearchTopic {
  id: string; // 'color' | 'dino' | 'space' …（与 skill 键拼接）
  /** i18n 点键前缀，取 `${i18nKey}.label` / `.desc`；禁止直接写中文 */
  i18nKey: string;
  emoji: string;
  tone: Tone;
  exploreSlot: ExploreSlotKey;
  /** 知识卡走哪个既有 AI 类型（Sprint 4 起统一走 explainer 专属讲解端点，带主题上下文 hint） */
  aiContentType: AiContentType;
  /** explainer 生成的主题上下文一句话（如「恐龙为什么消失了」），注入 worker prompt（Sprint 4-A） */
  explainerHint: string;
  /** KV 复用匹配用的关键词（list-first 策略） */
  cardMatchTags: string[];
  /** AI 全线不可用时的静态兜底知识点 i18n 键（降级） */
  fallbackFactsI18nKey: string;
  /** SRS 技能键前缀，最终为 `research:<id>` */
  quizSkillKey: string;
  /** F18 认知负荷阈值：按 ageRange 取；core=首屏事实条数，extended=每次揭示增量 */
  density: Record<string, { core: number; extended: number; maxReveal: number }>;
}

/** AI 知识卡（精细加工段） */
export interface KnowledgeCard {
  /** KV 主键；null = 未生成 / 降级 / KV 不可用（此时不允许收藏） */
  kvId: string | null;
  title: string;
  /** 与 AiContentItem.content 同形：story 为段落文本，riddle/science 为条目数组 */
  body: string | string[];
  /** 来源：ai=新生成，kv=复用已有，fallback=静态兜底 */
  source: 'ai' | 'kv' | 'fallback';
  /** F18 渐进揭示：已揭示到第几层（1 = 仅核心层） */
  revealed: number;
  status: 'idle' | 'loading' | 'ready' | 'degraded';
  createdAt: number;
}

/** 单次作答留痕（与 adaptChain.AttemptInput 字段对齐，便于直接转发） */
export interface ResearchAttempt {
  correct: boolean;
  ms: number;
  hintUsed: boolean;
  errorType?: string;
  /** 本题实际出题难度（RoundRunner.onAnswered 第 3 参，经 calibrateDifficulty 后） */
  difficulty: 1 | 2 | 3;
  t: number;
}

/** 小测段冻结引用 —— 一旦进入 QUIZ 即不可变（C3） */
export interface QuizRef {
  /** 完整 SRS 技能键，如 'research:dino' */
  skillKey: string;
  /** CMML 规定 3–5 题的轻量收尾（缓解 R6） */
  questionsPerRound: 3 | 4 | 5;
  /** START_QUIZ 时对 DDA 锁存值的快照，仅供展示与核对，不作为出题源 */
  frozenDifficulty: 1 | 2 | 3;
}

/** 会话主体 —— 易变态，存 safeStorage 草稿，不进 Progress（ADR-004） */
export interface ResearchSession {
  sessionId: string;
  /** 草稿结构版本，bump 后旧草稿直接丢弃 */
  version: number;
  status: ResearchStatus;
  topicId: string | null;
  /** 驱动 F18 密度阈值与 AI ageRange 入参 */
  ageRange: string;

  /* —— 探索段（F18/F19 数据源）—— */
  exploreRevealLevel: number;
  exploreActions: number;
  exploreMs: number;

  /* —— 知识卡段 —— */
  knowledgeCard: KnowledgeCard | null;

  /* —— 小测段 —— */
  quizRef: QuizRef | null;
  attempts: ResearchAttempt[];

  /* —— 巩固段：仅存引用，掌握度真相源恒为 progress.mastery —— */
  srsRef: { skill: string; lastReviewedAt: number } | null;

  /** 本会话内收藏的知识卡 kvId（结算时并入 Progress.discoveries） */
  sessionDiscoveries: string[];

  createdAt: number;
  updatedAt: number;
}

/** FSM 事件（reducer 的全部合法输入） */
export type ResearchEvent =
  | { type: 'ENTER'; ageRange: string }
  | { type: 'RESUME_DRAFT'; draft: ResearchSession }
  | { type: 'SELECT_TOPIC'; topicId: string }
  | { type: 'CHANGE_TOPIC' }
  | { type: 'EXPLORE_ACTION'; deltaMs?: number }
  | { type: 'REVEAL_MORE' }
  | { type: 'REQUEST_CARD' }
  | { type: 'CARD_READY'; card: KnowledgeCard }
  | { type: 'CARD_FAILED'; reason: 'cooldown' | 'rate_limited' | 'upstream' | 'offline' }
  | { type: 'FAVORITE_CARD'; kvId: string }
  | { type: 'BACK_TO_EXPLORE' }
  | { type: 'START_QUIZ'; quizRef: QuizRef }
  | { type: 'RECORD_ATTEMPT'; attempt: ResearchAttempt }
  | { type: 'ROUND_COMPLETE'; stars: number }
  | { type: 'CONFIRM' }
  | { type: 'EXPLORE_AGAIN' }
  | { type: 'RESTART' }
  | { type: 'ABORT' };
