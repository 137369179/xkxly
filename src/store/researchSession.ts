import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { reducer, createInitialSession } from '@/lib/research/sessionMachine';
import { loadDraft, saveDraft, clearDraft } from '@/lib/research/researchDraft';
import type { ResearchEvent } from '@/lib/research/types';
import { useStore } from '@/store/useStore';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';

/**
 * 研究模式会话钩子（F17 编排层 React 接线，A4）
 * ------------------------------------------------------------------
 * 职责：
 *   1. 用 useReducer 驱动 sessionMachine 纯 reducer（唯一事件派发口）
 *   2. IDLE 时尝试恢复 safeStorage 草稿；失败则 ENTER 新会话
 *   3. 会话状态跃迁时写草稿（节流已由 researchDraft 内部处理）
 *   4. COMPLETE 时清草稿 + 结算 researchStats
 *   5. 提供 DDA 锁存句柄（difficulty/meta）供 QUIZ 段使用（C3 只读）
 *
 * 铁律（ADR-001 / §2.4）：
 *   - 本层只负责「事件 → reducer → 落盘」的桥接，不做任何业务判断；
 *   - QUIZ 段难度只用锁存值，绝不在此层重算（C3）；
 *   - 不直接调 srs.review() / 手写 mastery（唯一入口是 useStore#practice）。
 */

export function useResearchSession(ageRange: string) {
  const [session, dispatch] = useReducer(reducer, undefined, () => createInitialSession(ageRange));
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const practice = useStore((s) => s.practice);
  const recordResearchAction = useStore((s) => s.recordResearchAction);
  const discoverCard = useStore((s) => s.discoverCard);
  const setResearchNote = useStore((s) => s.setResearchNote);
  const completeResearchSession = useStore((s) => s.completeResearchSession);

  const [diff, setDiff, ddaMeta] = useAdaptiveDifficultyState('research');

  // —— 草稿恢复：进入 IDLE 且从未 ENTER 时尝试恢复 ——
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    const draft = loadDraft();
    if (draft && draft.ageRange === ageRange) {
      dispatch({ type: 'RESUME_DRAFT', draft });
    } else {
      dispatch({ type: 'ENTER', ageRange });
    }
  }, [ageRange]);

  // —— 状态跃迁时写草稿（ABORT/COMPLETE 除外：前者保留、后者清空）——
  useEffect(() => {
    const st = sessionRef.current;
    if (st.status === 'IDLE') return; // 初始占位，不写
    if (st.status === 'COMPLETE') {
      clearDraft();
      completeResearchSession(); // researchStats.sessionsCompleted+1，徽章检测随 _applyProgress 自动跑
      return;
    }
    saveDraft(st);
  }, [session, completeResearchSession]);

  // —— 事件派发（带草稿落盘兜底：状态跃迁立即 force 写）——
  const emit = useCallback((event: ResearchEvent) => {
    dispatch(event);
  }, []);

  /** QUIZ 段专用：每题作答 → recordAttempt(DDA) + practice(SRS) */
  const recordQuizAttempt = useCallback(
    (topicId: string, correct: boolean, _ms: number, _hintUsed: boolean, difficulty?: 1 | 2 | 3) => {
      recordResearchAction(topicId, 0);
      practice(`research:${topicId}`, correct, correct ? 1 : 0, difficulty);
    },
    [practice, recordResearchAction],
  );

  const api = useMemo(
    () => ({
      session,
      emit,
      diff,
      setDiff,
      ddaMeta,
      recordQuizAttempt,
      discoverCard,
      setResearchNote,
    }),
    [session, emit, diff, setDiff, ddaMeta, recordQuizAttempt, discoverCard, setResearchNote],
  );

  return api;
}
