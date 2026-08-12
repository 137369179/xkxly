import { useCallback, useEffect, useMemo, useRef } from 'react';
import { RoundRunner } from '@/components/RoundRunner';
import { CandyButton } from '@/components/ui/Button';
import { ResearchCanvas } from '@/modules/research/ResearchCanvas';
import { KnowledgeCardPanel } from '@/modules/research/KnowledgeCardPanel';
import { ResearchLaunchHub } from '@/modules/research/ResearchLaunchHub';
import { useResearchSession } from '@/store/researchSession';
import { getTopic } from '@/lib/research/researchTopics';
import { makeResearchQuestion } from '@/lib/research/questions';
import { dueSkills } from '@/lib/srs';
import { celebrateBig } from '@/lib/celebrate';
import { useActiveProfileMeta } from '@/store/useProfilesStore';
import { useProgress, useStore } from '@/store/useStore';
import { BADGE_MAP } from '@/data/badges';
import { navigate } from '@/lib/router';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 研究模式路由页（F17 编排层 · Sprint 2 完整实现；Sprint 4 打磨）
 * ------------------------------------------------------------------
 * 7 状态流（FSM）→ 7 段 UI：
 *   IDLE（首帧）→ TOPIC_SELECT（选题网格）→ EXPLORE（ResearchCanvas）
 *   → KNOWLEDGE_CARD（KnowledgeCardPanel）→ QUIZ（RoundRunner，零改动）
 *   → REVIEW（小结：行为量 + 新徽章庆祝）→ COMPLETE（结算 + 全屏彩带）
 *
 * Sprint 4 升级：
 *   - A：知识卡走 explainer 专属讲解（主题 hint），卡片含延伸问（好奇回流）
 *   - C：makeResearchQuestion 注入 dueSkills（SRS 到期复习混入 ~35%）
 *   - D：REVIEW 行为量回顾（探索/发现/答对星星，零正确率）+ 新解锁研究徽章庆祝；
 *        COMPLETE 触发 celebrateBig 全屏彩带
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
  const p = useProgress();

  const { session, emit, diff, ddaMeta, recordQuizAttempt } = useResearchSession(ageRange);

  const topic = session.topicId ? getTopic(session.topicId) : null;

  // —— Sprint 4-D：记录进入页时的徽章快照，REVIEW 时 diff 出新解锁研究徽章 ——
  const badgesAtMountRef = useRef<string[] | null>(null);
  if (badgesAtMountRef.current === null) badgesAtMountRef.current = p.badges;
  const newBadges = useMemo(() => {
    if (session.status !== 'REVIEW') return [];
    const before = new Set(badgesAtMountRef.current ?? []);
    return p.badges.filter((id) => !before.has(id));
  }, [session.status, p.badges]);

  // —— Sprint 4-D：进入 COMPLETE 触发全屏彩带庆祝（F19 行为型奖励）——
  useEffect(() => {
    if (session.status === 'COMPLETE') {
      void celebrateBig();
    }
  }, [session.status]);

  // —— Sprint 4-C：SRS 到期项（跨主题复习混入数据源）——
  const due = useMemo(() => dueSkills(p), [p]);

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

  // —— QUIZ 段（RoundRunner 零改动复用，C3 锁存；Sprint 4-C：SRS 复习混入）——
  const quizRunner = useMemo(() => {
    if (!session.topicId) return null;
    const makeQ = makeResearchQuestion(session.topicId, t, due);
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
  }, [session.topicId, session.quizRef?.questionsPerRound, diff, ddaMeta, due, onAnswered, onRoundComplete, onConfirm, t]);

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
        <ResearchLaunchHub
          onSelectTopic={(topicId) => emit({ type: 'SELECT_TOPIC', topicId })}
          onOpenGallery={() => navigate('discoveries')}
        />
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
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="text-5xl">🔍</div>
          <p className="text-xl font-extrabold text-ink">{t('research.review.title')}</p>

          {/* Sprint 4-D：本轮行为量回顾（全部行为量，零正确率，R8/F19） */}
          <div className="grid w-full grid-cols-3 gap-2">
            {[
              { emoji: '🔍', label: t('research.growthBlock.actions'), value: String(session.exploreActions) },
              { emoji: '⭐', label: t('research.review.discovered'), value: String(session.sessionDiscoveries.length) },
              { emoji: '🎯', label: t('research.review.correctStars'), value: String(session.attempts.filter((a) => a.correct).length) },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl bg-purple-50 px-2 py-3">
                <div className="text-xl">{c.emoji}</div>
                <div className="mt-0.5 text-xl font-black tabular-nums text-candy-purple-deep">{c.value}</div>
                <div className="mt-0.5 text-[10px] font-bold text-ink-soft">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Sprint 4-D：新解锁研究徽章庆祝（F19 行为型，零正确率） */}
          {newBadges.length > 0 && (
            <div className="w-full rounded-2xl border-2 border-dashed border-candy-yellow-deep/50 bg-gradient-to-r from-amber-50 to-yellow-50 p-3">
              <p className="text-xs font-extrabold text-candy-yellow-deep">🏅 {t('research.review.newBadge')}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {newBadges.map((id) => {
                  const b = BADGE_MAP.get(id);
                  if (!b) return null;
                  return (
                    <div key={id} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm">
                      <span className="text-lg">{b.emoji}</span>
                      <span className="text-xs font-extrabold text-ink">{b.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-sm font-bold text-ink-soft">
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
