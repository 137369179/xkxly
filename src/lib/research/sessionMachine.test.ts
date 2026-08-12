import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialSession, reducer, RESEARCH_SESSION_VERSION } from './sessionMachine';
import type { ResearchSession, KnowledgeCard } from './types';

/**
 * sessionMachine 单元测试
 * ------------------------------------------------------------------
 * T1：非法事件（结构损坏 / 状态不匹配）一律 no-op 返回原 state，绝不抛错。
 * T2：FSM 全路径状态流转，含 C2（QUIZ 段 AI 盲区）与 C3（难度快照冻结）。
 * 纯 reducer 无副作用，无需 mock localStorage。
 */

function makeCard(over: Partial<KnowledgeCard> = {}): KnowledgeCard {
  return {
    kvId: 'kv:test:1',
    title: '恐龙小知识',
    body: ['霸王龙生活在白垩纪。'],
    source: 'ai',
    revealed: 1,
    status: 'ready',
    createdAt: 12345,
    ...over,
  };
}

describe('sessionMachine', () => {
  let s: ResearchSession;

  beforeEach(() => {
    s = createInitialSession('5-7');
  });

  describe('T1 非法输入防御', () => {
    it('null / undefined / 非对象事件 no-op', () => {
      expect(reducer(s, null as unknown as never)).toBe(s);
      expect(reducer(s, undefined as unknown as never)).toBe(s);
      expect(reducer(s, 'SELECT_TOPIC' as unknown as never)).toBe(s);
      expect(reducer(s, { foo: 1 } as unknown as never)).toBe(s);
    });

    it('IDLE 态拒绝非 ENTER/RESUME_DRAFT 事件', () => {
      expect(reducer(s, { type: 'SELECT_TOPIC', topicId: 'dino' }).status).toBe('IDLE');
      expect(reducer(s, { type: 'START_QUIZ', quizRef: { skillKey: 'research:dino', questionsPerRound: 3, frozenDifficulty: 1 } }).status).toBe('IDLE');
      expect(reducer(s, { type: 'REQUEST_CARD' }).status).toBe('IDLE');
    });

    it('TOPIC_SELECT 态拒绝未选主题就跳探索', () => {
      const t = reducer(s, { type: 'ENTER', ageRange: '5-7' });
      expect(t.status).toBe('TOPIC_SELECT');
      // REQUEST_CARD / REVEAL_MORE 在 TOPIC_SELECT 态一律 no-op
      expect(reducer(t, { type: 'REVEAL_MORE' }).exploreRevealLevel).toBe(0);
      expect(reducer(t, { type: 'REQUEST_CARD' }).status).toBe('TOPIC_SELECT');
    });

    it('ABORT 保留草稿字段，仅回 IDLE', () => {
      const t = reducer(s, { type: 'ENTER', ageRange: '5-7' });
      const u = reducer(t, { type: 'SELECT_TOPIC', topicId: 'dino' });
      expect(u.status).toBe('EXPLORE');
      const v = reducer(u, { type: 'ABORT' });
      expect(v.status).toBe('IDLE');
      expect(v.topicId).toBe('dino'); // 草稿字段原样保留供钩子层落盘
    });
  });

  describe('T2 FSM 全路径', () => {
    it('ENTER → TOPIC_SELECT → EXPLORE → KNOWLEDGE_CARD → QUIZ → REVIEW → COMPLETE', () => {
      let st = reducer(s, { type: 'ENTER', ageRange: '5-7' });
      expect(st.status).toBe('TOPIC_SELECT');
      expect(st.ageRange).toBe('5-7');

      st = reducer(st, { type: 'SELECT_TOPIC', topicId: 'dino' });
      expect(st.status).toBe('EXPLORE');
      expect(st.topicId).toBe('dino');
      expect(st.exploreRevealLevel).toBe(1);

      st = reducer(st, { type: 'REVEAL_MORE' });
      expect(st.exploreRevealLevel).toBe(2);

      st = reducer(st, { type: 'EXPLORE_ACTION', deltaMs: 300 });
      expect(st.exploreActions).toBe(1);
      expect(st.exploreMs).toBe(300);

      st = reducer(st, { type: 'REQUEST_CARD' });
      expect(st.status).toBe('KNOWLEDGE_CARD');
      expect(st.knowledgeCard?.status).toBe('loading');

      st = reducer(st, { type: 'CARD_READY', card: makeCard() });
      expect(st.knowledgeCard?.status).toBe('ready');
      expect(st.knowledgeCard?.source).toBe('ai');

      // 收藏（去重）
      st = reducer(st, { type: 'FAVORITE_CARD', kvId: 'kv:test:1' });
      st = reducer(st, { type: 'FAVORITE_CARD', kvId: 'kv:test:1' });
      expect(st.sessionDiscoveries).toEqual(['kv:test:1']);

      st = reducer(st, { type: 'START_QUIZ', quizRef: { skillKey: 'research:dino', questionsPerRound: 3, frozenDifficulty: 2 } });
      expect(st.status).toBe('QUIZ');
      expect(st.quizRef?.frozenDifficulty).toBe(2);

      // 3 次作答记录
      for (let i = 0; i < 3; i++) {
        st = reducer(st, { type: 'RECORD_ATTEMPT', attempt: { correct: true, ms: 2000, hintUsed: false, difficulty: 2, t: Date.now() } });
      }
      expect(st.attempts).toHaveLength(3);

      st = reducer(st, { type: 'ROUND_COMPLETE', stars: 3 });
      expect(st.status).toBe('REVIEW');

      st = reducer(st, { type: 'CONFIRM' });
      expect(st.status).toBe('COMPLETE');

      // RESTART 回到选题
      st = reducer(st, { type: 'RESTART' });
      expect(st.status).toBe('TOPIC_SELECT');
      expect(st.topicId).toBeNull();
      expect(st.attempts).toHaveLength(0);
      expect(st.sessionDiscoveries).toHaveLength(0);
    });

    it('C2：QUIZ 态是 AI 盲区，REQUEST_CARD / REVEAL_MORE 一律 no-op', () => {
      let st = reducer(s, { type: 'ENTER', ageRange: '5-7' });
      st = reducer(st, { type: 'SELECT_TOPIC', topicId: 'dino' });
      st = reducer(st, { type: 'REQUEST_CARD' });
      st = reducer(st, { type: 'CARD_READY', card: makeCard() });
      st = reducer(st, { type: 'START_QUIZ', quizRef: { skillKey: 'research:dino', questionsPerRound: 3, frozenDifficulty: 1 } });
      expect(st.status).toBe('QUIZ');

      const before = st.knowledgeCard?.revealed;
      st = reducer(st, { type: 'REQUEST_CARD' });
      st = reducer(st, { type: 'REVEAL_MORE' });
      expect(st.status).toBe('QUIZ'); // 状态不变
      expect(st.knowledgeCard?.revealed).toBe(before); // 揭示层级不变
      expect(st.attempts).toHaveLength(0); // 没有混入作答
    });

    it('C3：frozenDifficulty 在 START_QUIZ 冻结后 reducer 不再重算', () => {
      let st = reducer(s, { type: 'ENTER', ageRange: '5-7' });
      st = reducer(st, { type: 'SELECT_TOPIC', topicId: 'dino' });
      st = reducer(st, { type: 'REQUEST_CARD' });
      st = reducer(st, { type: 'CARD_READY', card: makeCard() });
      st = reducer(st, { type: 'START_QUIZ', quizRef: { skillKey: 'research:dino', questionsPerRound: 4, frozenDifficulty: 3 } });
      // 无论后续事件如何，quizRef 不再被修改
      st = reducer(st, { type: 'RECORD_ATTEMPT', attempt: { correct: false, ms: 9000, hintUsed: true, difficulty: 3, t: Date.now() } });
      expect(st.quizRef?.frozenDifficulty).toBe(3);
      expect(st.quizRef?.questionsPerRound).toBe(4);
    });

    it('降级路径：CARD_FAILED → degraded 卡仍可 START_QUIZ（闭环不断）', () => {
      let st = reducer(s, { type: 'ENTER', ageRange: '5-7' });
      st = reducer(st, { type: 'SELECT_TOPIC', topicId: 'space' });
      st = reducer(st, { type: 'REQUEST_CARD' });
      st = reducer(st, { type: 'CARD_FAILED', reason: 'offline' });
      expect(st.status).toBe('KNOWLEDGE_CARD');
      expect(st.knowledgeCard?.status).toBe('degraded');
      expect(st.knowledgeCard?.source).toBe('fallback');

      st = reducer(st, { type: 'START_QUIZ', quizRef: { skillKey: 'research:space', questionsPerRound: 3, frozenDifficulty: 1 } });
      expect(st.status).toBe('QUIZ');
    });

    it('BACK_TO_EXPLORE 从知识卡返回探索', () => {
      let st = reducer(s, { type: 'ENTER', ageRange: '5-7' });
      st = reducer(st, { type: 'SELECT_TOPIC', topicId: 'dino' });
      st = reducer(st, { type: 'REQUEST_CARD' });
      st = reducer(st, { type: 'BACK_TO_EXPLORE' });
      expect(st.status).toBe('EXPLORE');
    });

    it('REVIEW 态 EXPLORE_AGAIN 回到探索（保留已积累的探索数据）', () => {
      let st = reducer(s, { type: 'ENTER', ageRange: '5-7' });
      st = reducer(st, { type: 'SELECT_TOPIC', topicId: 'dino' });
      st = reducer(st, { type: 'EXPLORE_ACTION', deltaMs: 500 });
      st = reducer(st, { type: 'REQUEST_CARD' });
      st = reducer(st, { type: 'CARD_READY', card: makeCard() });
      st = reducer(st, { type: 'START_QUIZ', quizRef: { skillKey: 'research:dino', questionsPerRound: 3, frozenDifficulty: 1 } });
      st = reducer(st, { type: 'ROUND_COMPLETE', stars: 2 });
      expect(st.status).toBe('REVIEW');

      st = reducer(st, { type: 'EXPLORE_AGAIN' });
      expect(st.status).toBe('EXPLORE');
      expect(st.exploreActions).toBe(1); // 探索数据保留
    });

    it('RESUME_DRAFT 恢复草稿（IDLE 草稿归一为 TOPIC_SELECT）', () => {
      const draft = {
        ...createInitialSession('5-7'),
        status: 'EXPLORE' as const,
        topicId: 'dino',
        exploreActions: 3,
      };
      const st = reducer(s, { type: 'RESUME_DRAFT', draft });
      expect(st.status).toBe('EXPLORE');
      expect(st.topicId).toBe('dino');
      expect(st.exploreActions).toBe(3);
    });

    it('createInitialSession 结构完整且版本号正确', () => {
      expect(s.version).toBe(RESEARCH_SESSION_VERSION);
      expect(s.status).toBe('IDLE');
      expect(s.sessionId.startsWith('rs_')).toBe(true);
      expect(s.attempts).toEqual([]);
      expect(s.sessionDiscoveries).toEqual([]);
    });
  });
});
