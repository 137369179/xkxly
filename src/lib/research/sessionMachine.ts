import type { ResearchSession, ResearchEvent, KnowledgeCard } from './types';

/**
 * 研究会话有限状态机 · 纯 reducer（lib 层）
 * ------------------------------------------------------------
 * 铁律（ADR-001 / §2.4）：
 *   - 零 React、零 `@/store/*` 依赖 → 可脱离 UI 单测（T1/T2）。
 *   - 纯函数：禁调 practice() / contentClient / 任何副作用；
 *     仅 Date.now() 用于 updatedAt 时间戳（ADR 明确允许的唯二副作用）。
 *   - C3：难度只在 START_QUIZ 时快照一次（frozenDifficulty），reducer 绝不重算。
 *   - C2：QUIZ 段是 AI 盲区 —— 任何内容请求事件（REQUEST_CARD 等）在 QUIZ 态一律 no-op。
 */

export const RESEARCH_SESSION_VERSION = 1;

export function createInitialSession(ageRange: string): ResearchSession {
  const now = Date.now();
  return {
    sessionId: `rs_${now.toString(36)}_${(Math.random() * 1e6 | 0).toString(36)}`,
    version: RESEARCH_SESSION_VERSION,
    status: 'IDLE',
    topicId: null,
    ageRange,
    exploreRevealLevel: 0,
    exploreActions: 0,
    exploreMs: 0,
    knowledgeCard: null,
    quizRef: null,
    attempts: [],
    srsRef: null,
    sessionDiscoveries: [],
    createdAt: now,
    updatedAt: now,
  };
}

function bump(state: ResearchSession, patch: Partial<ResearchSession>): ResearchSession {
  return { ...state, ...patch, updatedAt: Date.now() };
}

const LOADING_CARD = (): KnowledgeCard => ({
  kvId: null,
  title: '',
  body: '',
  source: 'fallback',
  revealed: 1,
  status: 'loading',
  createdAt: Date.now(),
});

/**
 * 核心 reducer。非法事件（状态不匹配 / 结构损坏）一律 no-op 返回原 state，绝不抛错（T1）。
 */
export function reducer(state: ResearchSession, event: ResearchEvent): ResearchSession {
  if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
    return state;
  }

  switch (state.status) {
    case 'IDLE':
      switch (event.type) {
        case 'ENTER':
          return bump(state, { status: 'TOPIC_SELECT', ageRange: event.ageRange });
        case 'RESUME_DRAFT':
          return bump(event.draft, {
            status: event.draft.status === 'IDLE' ? 'TOPIC_SELECT' : event.draft.status,
          });
        default:
          return state;
      }

    case 'TOPIC_SELECT':
      switch (event.type) {
        case 'SELECT_TOPIC':
          return bump(state, {
            status: 'EXPLORE',
            topicId: event.topicId,
            exploreRevealLevel: 1,
            exploreActions: 0,
            exploreMs: 0,
          });
        case 'ABORT':
          return bump(state, { status: 'IDLE' });
        default:
          return state;
      }

    case 'EXPLORE':
      switch (event.type) {
        case 'REVEAL_MORE':
          return bump(state, { exploreRevealLevel: state.exploreRevealLevel + 1 });
        case 'EXPLORE_ACTION':
          return bump(state, {
            exploreActions: state.exploreActions + 1,
            exploreMs: state.exploreMs + (event.deltaMs ?? 0),
          });
        case 'REQUEST_CARD':
          return bump(state, { status: 'KNOWLEDGE_CARD', knowledgeCard: LOADING_CARD() });
        case 'CHANGE_TOPIC':
          return bump(state, { status: 'TOPIC_SELECT', topicId: null });
        case 'ABORT':
          // ABORT 保留草稿：仅回 IDLE，其余字段（topicId / knowledgeCard 等）原样保留供钩子层落盘
          return bump(state, { status: 'IDLE' });
        default:
          return state;
      }

    case 'KNOWLEDGE_CARD':
      switch (event.type) {
        case 'CARD_READY':
          return bump(state, { knowledgeCard: { ...event.card, status: 'ready' } });
        case 'CARD_FAILED':
          // 降级为一等公民：status='degraded'，但仍允许 START_QUIZ（闭环不断）
          return bump(state, {
            knowledgeCard: {
              kvId: null,
              title: state.knowledgeCard?.title ?? '',
              body: state.knowledgeCard?.body ?? '',
              source: 'fallback',
              revealed: state.knowledgeCard?.revealed ?? 1,
              status: 'degraded',
              createdAt: state.knowledgeCard?.createdAt ?? Date.now(),
            },
          });
        case 'BACK_TO_EXPLORE':
          return bump(state, { status: 'EXPLORE' });
        case 'START_QUIZ':
          // C3：冻结 quizRef（含 frozenDifficulty 快照），之后 reducer 永不重算
          return bump(state, { status: 'QUIZ', quizRef: event.quizRef });
        case 'FAVORITE_CARD': {
          const next =
            state.sessionDiscoveries.includes(event.kvId)
              ? state.sessionDiscoveries
              : [...state.sessionDiscoveries, event.kvId];
          return bump(state, { sessionDiscoveries: next });
        }
        case 'ABORT':
          return bump(state, { status: 'IDLE' });
        default:
          return state;
      }

    case 'QUIZ':
      // C2：QUIZ 段是 AI 盲区，仅允许作答记录 / 回合完成 / 中止；其余一律 no-op
      switch (event.type) {
        case 'RECORD_ATTEMPT':
          return bump(state, { attempts: [...state.attempts, event.attempt] });
        case 'ROUND_COMPLETE':
          return bump(state, { status: 'REVIEW' });
        case 'ABORT':
          return bump(state, { status: 'IDLE' });
        default:
          return state;
      }

    case 'REVIEW':
      switch (event.type) {
        case 'CONFIRM':
          return bump(state, { status: 'COMPLETE' });
        case 'EXPLORE_AGAIN':
          return bump(state, { status: 'EXPLORE' });
        case 'ABORT':
          return bump(state, { status: 'IDLE' });
        default:
          return state;
      }

    case 'COMPLETE':
      switch (event.type) {
        case 'RESTART':
          return bump(state, {
            status: 'TOPIC_SELECT',
            topicId: null,
            exploreRevealLevel: 0,
            exploreActions: 0,
            exploreMs: 0,
            knowledgeCard: null,
            quizRef: null,
            attempts: [],
            srsRef: null,
            sessionDiscoveries: [],
          });
        case 'ABORT':
          return bump(state, { status: 'IDLE' });
        default:
          return state;
      }

    default:
      return state;
  }
}
