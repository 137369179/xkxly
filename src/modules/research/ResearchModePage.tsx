import { useCallback, useMemo } from 'react';
import { RoundRunner } from '@/components/RoundRunner';
import { CandyButton } from '@/components/ui/Button';
import { ResearchCanvas } from '@/modules/research/ResearchCanvas';
import { KnowledgeCardPanel } from '@/modules/research/KnowledgeCardPanel';
import { useResearchSession } from '@/store/researchSession';
import { RESEARCH_TOPICS, getTopic } from '@/lib/research/researchTopics';
import { makeResearchQuestion } from '@/lib/research/questions';
import { useActiveProfileMeta } from '@/store/useProfilesStore';
import { useStore } from '@/store/useStore';
import { navigate } from '@/lib/router';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 研究模式路由页（F17 编排层 · Sprint 2 完整实现）
 * ------------------------------------------------------------------
 * 7 状态流（FSM）→ 7 段 UI：
 *   IDLE（首帧）→ TOPIC_SELECT（选题网格）→ EXPLORE（ResearchCanvas）
 *   → KNOWLEDGE_CARD（KnowledgeCardPanel）→ QUIZ（RoundRunner，零改动）
 *   → REVIEW（小结）→ COMPLETE（结算 + 行为激励）
 *
 * 铁律遵守：
 *   - C3：QUIZ 段难度只用 useResearchSession 锁存值，绝不在页面重算；
 *         onRoundStart 是唯一 syncNow 落档点
 *   - C2：makeQuestion 走 research/questions 静态题池，零 AI 依赖
 *   - C5：不给 RoundRunner 加会变的 key（status/revealLevel 均不入 key）
 *   - C7：文案全走 t()，本文件零中文字面量
 *   - C1：收藏仅当 kvId 非空（KnowledgeCardPanel 内部已守）
 */

export default function ResearchModePage() {
  const { t } = useTranslation();
  const profile = useActiveProfileMeta();
  const ageRange = profile?.ageRange ?? '5-6';

  const completeResearchSession = useStore((s) => s.completeResearchSession);

  const { session, emit, diff, ddaMeta, recordQuizAttempt } = useResearchSession(ageRange);

  const topic = session.topicId ? getTopic(session.topicId) : null;

  // —— 事件派发闭包（稳定引用，避免重渲染）——
  const onRevealMore = useCallback(() => emit({ type: 'REVEAL_MORE' }), [emit]);
  const onExploreAction = useCallback(
    () => emit({ type: 'EXPLORE_ACTION', deltaMs: 1 }), // 每次交互计 1 行为；时长由页面停留计时兜底
    [emit],
  );
  const onRequestCard = useCallback(() => emit({ type: 'REQUEST_CARD' }), [emit]);
  const onChangeTopic = useCallback(() => emit({ type: 'CHANGE_TOPIC' }), [emit]);
  const onBackToExplore = useCallback(() => emit({ type: 'BACK_TO_EXPLORE' }), [emit]);
  const onStartQuiz = useCallback(() => {
    if (!session.topicId) return;
    emit({
      type: 'START_QUIZ',
      quizRef: {
        skillKey: `research:${session.topicId}`,
        questionsPerRound: 4,
        frozenDifficulty: diff, // C3：START_QUIZ 时快照一次，之后永不重算
      },
    });
  }, [emit, session.topicId, diff]);

  const onFavorite = useCallback(
    (kvId: string) => {
      useStore.getState().discoverCard(kvId);
      emit({ type: 'FAVORITE_CARD', kvId });
    },
    [emit],
  );

  const onRoundComplete = useCallback(
    (stars: number) => emit({ type: 'ROUND_COMPLETE', stars }),
    [emit],
  );

  const onAnswered = useCallback(
    (_q: { skill?: string }, correct: boolean, difficulty?: 1 | 2 | 3) => {
      if (!session.topicId) return;
      recordQuizAttempt(session.topicId, correct, 0, false, difficulty ?? diff);
    },
    [session.topicId, recordQuizAttempt, diff],
  );

  const onConfirm = useCallback(() => {
    completeResearchSession();
    emit({ type: 'CONFIRM' });
  }, [completeResearchSession, emit]);

  const onExploreAgain = useCallback(() => emit({ type: 'EXPLORE_AGAIN' }), [emit]);
  const onRestart = useCallback(() => emit({ type: 'RESTART' }), [emit]);

  // —— 主题选择网格（TOPIC_SELECT）——
  const topicGrid = useMemo(
    () => (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {RESEARCH_TOPICS.map((tp) => (
          <button
            key={tp.id}
            onClick={() => emit({ type: 'SELECT_TOPIC', topicId: tp.id })}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm transition-transform hover:scale-[1.03] active:scale-95"
          >
            <span className="text-4xl">{tp.emoji}</span>
            <span className="text-base font-extrabold text-ink">{t(`${tp.i18nKey}.label`)}</span>
            <span className="text-xs text-ink-soft">{t(`${tp.i18nKey}.desc`)}</span>
          </button>
        ))}
      </div>
    ),
    [t, emit],
  );

  // —— QUIZ 段（RoundRunner 零改动复用，C3 锁存）——
  const quizRunner = useMemo(() => {
    if (!session.topicId) return null;
    const makeQ = makeResearchQuestion(session.topicId, t);
    return (
      <RoundRunner
        makeQuestion={makeQ}
        difficulty={diff}
        tone="purple"
        questionsPerRound={session.quizRef?.questionsPerRound ?? 4}
        onRoundStart={() => ddaMeta.syncNow()} // ★ 全项目唯一合法落档点
        onAnswered={onAnswered}
        onComplete={onRoundComplete}
        renderSummary={(stars, onReplay) => (
          <div className="flex flex-col items-center gap-3 p-4 text-center">
            <div className="text-4xl">🎉</div>
            <p className="text-lg font-extrabold text-ink">
              {t('research.quiz.summaryStars', { n: String(stars) })}
            </p>
            <div className="flex gap-2">
              <CandyButton tone="purple" size="lg" onClick={onReplay}>
                {t('research.quiz.replay')}
              </CandyButton>
              <CandyButton tone="green" size="lg" onClick={onConfirm}>
                {t('research.quiz.confirm')}
              </CandyButton>
            </div>
          </div>
        )}
      />
    );
  }, [session.topicId, session.quizRef?.questionsPerRound, diff, ddaMeta, onAnswered, onRoundComplete, onConfirm, t]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col gap-4 p-4">
      {/* 标题 */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">🔬 {t('nav.research.label')}</h1>
        {session.status !== 'IDLE' && session.status !== 'TOPIC_SELECT' && (
          <CandyButton tone="green" size="md" variant="ghost" onClick={() => emit({ type: 'ABORT' })}>
            {t('research.common.exit')}
          </CandyButton>
        )}
      </header>

      {session.status === 'TOPIC_SELECT' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-ink-soft">{t('research.topicSelect.hint')}</p>
            <CandyButton tone="orange" size="sm" variant="ghost" onClick={() => navigate('discoveries')}>
              ⭐ {t('research.gallery.entry')}
            </CandyButton>
          </div>
          {topicGrid}
        </div>
      )}

      {session.status === 'EXPLORE' && topic && (
        <ResearchCanvas
          topic={topic}
          ageRange={ageRange}
          revealLevel={session.exploreRevealLevel}
          exploreActions={session.exploreActions}
          onRevealMore={onRevealMore}
          onRequestCard={onRequestCard}
          onChangeTopic={onChangeTopic}
          onExploreAction={onExploreAction}
        />
      )}

      {session.status === 'KNOWLEDGE_CARD' && topic && (
        <KnowledgeCardPanel
          topic={topic}
          ageRange={ageRange}
          card={session.knowledgeCard}
          onCardReady={(card) => {
            // F19：读卡计数（research-cards-3 徽章数据源）；同一会话重复读卡也计（行为累积型）
            if (topic) useStore.getState().recordResearchAction(topic.id, 0, { readCard: true });
            emit({ type: 'CARD_READY', card });
          }}
          onCardFailed={(reason) => emit({ type: 'CARD_FAILED', reason })}
          onStartQuiz={onStartQuiz}
          onBackToExplore={onBackToExplore}
          onFavorite={onFavorite}
        />
      )}

      {session.status === 'QUIZ' && quizRunner}

      {session.status === 'REVIEW' && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="text-5xl">🔍</div>
          <p className="text-xl font-extrabold text-ink">{t('research.review.title')}</p>
          <p className="text-sm text-ink-soft">
            {t('research.review.discoveries', { n: String(session.sessionDiscoveries.length) })}
          </p>
          <div className="flex gap-2">
            <CandyButton tone="purple" size="lg" onClick={onExploreAgain}>
              {t('research.review.exploreAgain')}
            </CandyButton>
            <CandyButton tone="green" size="lg" onClick={onConfirm}>
              {t('research.review.done')}
            </CandyButton>
          </div>
        </div>
      )}

      {session.status === 'COMPLETE' && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="text-5xl">🌟</div>
          <p className="text-xl font-extrabold text-ink">{t('research.complete.title')}</p>
          <p className="text-sm text-ink-soft">{t('research.complete.hint')}</p>
          <div className="flex gap-2">
            <CandyButton tone="purple" size="lg" onClick={onRestart}>
              {t('research.complete.restart')}
            </CandyButton>
            <CandyButton tone="green" size="lg" onClick={() => emit({ type: 'ABORT' })}>
              {t('research.complete.home')}
            </CandyButton>
          </div>
        </div>
      )}
    </div>
  );
}
