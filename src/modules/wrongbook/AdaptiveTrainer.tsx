/**
 * 自适应错题训练器
 * ------------------------------------------------------------------
 * SRS 优先级队列：到期复习 > 薄弱点 > 新错题
 * 难度自适应：连续答对 3 题升难度，答错降难度
 * AI 分析按钮：调用 wrongAnalyzeTask 获取错题模式分析
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { QuizCard } from '@/components/QuizCard';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { questionForSkill, makeMathQuestion } from '@/lib/questions';
import { sfxTap, sfxStar, sfxWrong, sfxCorrect } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { isDue, skillLabel, subjectLabel, subjectEmoji, weakSkills } from '@/lib/srs';
import { useAiTask } from '@/lib/ai/useAi';
import { useTranslation } from '@/i18n/useTranslation';
import { wrongAnalyzeTask } from '@/lib/ai/tasks';
import { applyRecentSignals, getWeakTypes } from '@/lib/adaptChain';
import type { Question } from '@/types';

const CHALLENGE_SEC = 60;

/* ------------------------------------------------------------------ */
/* SRS 优先级队列                                                       */
/* ------------------------------------------------------------------ */
function pickNextSkill(
  wrongBook: string[],
  mastery: Record<string, { lv: number; due?: number; ok: number; ng: number; last?: number }>,
): string | null {
  if (wrongBook.length === 0) return null;
  const now = Date.now();

  // 第一优先级：SRS 到期的错题（最佳复习窗口）
  const due = wrongBook.filter((s) => {
    const m = mastery[s];
    return m && isDue(m, now);
  });
  if (due.length > 0) {
    // 到期中选等级最低的；同档内错因薄弱题型优先
    due.sort((a, b) => weakBoost(b) - weakBoost(a) || (mastery[a]?.lv ?? 0) - (mastery[b]?.lv ?? 0));
    return due[0] ?? null;
  }

  // 第二优先级：错误率最高的错题；同档内错因薄弱题型优先
  const sorted = [...wrongBook].sort((a, b) => {
    const ma = mastery[a];
    const mb = mastery[b];
    const ra = ma ? ma.ng / Math.max(1, ma.ok + ma.ng) : 0;
    const rb = mb ? mb.ng / Math.max(1, mb.ok + mb.ng) : 0;
    return weakBoost(b) - weakBoost(a) || rb - ra;
  });

  // 第三优先级：最近加入的（wrongBook[0]）
  return sorted[0] ?? wrongBook[0] ?? null;
}

function genFromSkill(skill: string, difficulty: 1 | 2 | 3): Question {
  const q = questionForSkill(skill, difficulty);
  if (q) return q;
  return makeMathQuestion(difficulty);
}

/* 错因驱动内容（P1-3）：孩子常错的题型（errorType=question.kind）优先练。
   仅作为同档内的加权 tie-breaker，不破坏 SRS 到期优先的调度顺序。 */
function weakErrorTypes(cat: string): Set<string> {
  return new Set(getWeakTypes(cat).map((w) => w.type));
}
function weakBoost(skill: string): number {
  const [cat, sub] = skill.split(':');
  if (!cat || !sub) return 0;
  return weakErrorTypes(cat).has(sub) ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/* 组件                                                                */
/* ------------------------------------------------------------------ */
export function AdaptiveTrainer() {
  const { t: tr } = useTranslation();
  const { wrongBook, mastery, wrongHistory } = useStore(
    useShallow((s) => ({
      wrongBook: s.progress.wrongBook,
      mastery: s.progress.mastery,
      wrongHistory: s.progress.wrongHistory,
    }))
  );
  const practiceWrong = useStore((s) => s.practiceWrong);
  const updateWrongHistory = useStore((s) => s.updateWrongHistory);

  const [active, setActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_SEC);
  const [score, setScore] = useState({ ok: 0, ng: 0 });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  const [done, setDone] = useState(false);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI 分析
  const aiAnalyze = useAiTask(() => wrongAnalyzeTask(useStore.getState().progress), false);

  useEffect(() => () => {
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // 调度下一题
  const nextQuestion = useCallback(
    (prevSkill?: string) => {
      // 过滤掉刚练完的那道题（避免连续两次同一题，除非错题本只有一题）
      const candidates = wrongBook.filter((s) => s !== prevSkill);
      const pool = candidates.length > 0 ? candidates : wrongBook;
      const skill = pickNextSkill(pool, mastery);
      if (!skill) {
        setDone(true);
        setActive(false);
        return;
      }
      const cat = skill.split(':')[0] ?? skill;
      const m = mastery[skill];
      const base = (m?.lv ?? 0) <= 1 ? 1 : (m?.lv ?? 0) <= 3 ? 2 : 3;
      const diff = applyRecentSignals(cat, base as 1 | 2 | 3);
      setDifficulty(diff);
      const q = genFromSkill(skill, diff);
      setCurrent(q);
      setShowAiAnalysis(false);
    },
    [wrongBook, mastery],
  );

  // 开始挑战
  const startChallenge = () => {
    sfxTap();
    setActive(true);
    setDone(false);
    setTimeLeft(CHALLENGE_SEC);
    setScore({ ok: 0, ng: 0 });
    setStreak(0);
    setBestStreak(0);
    nextQuestion();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setDone(true);
          setActive(false);
          sfxStar();
          celebrateBig();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  // 答题处理
  const handleAnswer = (correct: boolean) => {
    if (!current?.skill) return;
    const skill = current.skill;

    if (correct) {
      sfxCorrect();
      celebrateSmall();
      setScore((s) => ({ ...s, ok: s.ok + 1 }));
      setStreak((s) => s + 1);

      // 自适应升档
      if (streak + 1 >= 3 && difficulty < 3) {
        setDifficulty((d) => Math.min(3, d + 1) as 1 | 2 | 3);
      }
    } else {
      sfxWrong();
      setScore((s) => ({ ...s, ng: s.ng + 1 }));
      setStreak(0);

      // 自适应降档
      if (difficulty > 1) {
        setDifficulty((d) => Math.max(1, d - 1) as 1 | 2 | 3);
      }
    }

    // 调用 practiceWrong（带难度感知）
    practiceWrong(skill, correct, difficulty);

    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    nextTimerRef.current = setTimeout(() => nextQuestion(skill), 300);
  };

  // 连对数变化时的副作用
  useEffect(() => {
    const best = wrongHistory?.bestStreak ?? 0;
    if (streak > best) updateWrongHistory({ bestStreak: streak });
    setBestStreak((b) => Math.max(b, streak));
  }, [streak, wrongHistory?.bestStreak, updateWrongHistory]);

  const handleAiAnalyze = () => {
    sfxTap();
    setShowAiAnalysis(true);
    aiAnalyze.run();
    // 增加 AI 分析计数
    const count = (wrongHistory?.aiAnalyzeCount ?? 0) + 1;
    updateWrongHistory({ aiAnalyzeCount: count });
  };

  // 当前题目信息
  const currentInfo = useMemo(() => {
    if (!current?.skill) return null;
    const skill = current.skill;
    const m = mastery[skill];
    const cat = skill.split(':')[0] ?? '';
    return {
      skill,
      subject: subjectLabel(cat),
      emoji: subjectEmoji(cat),
      difficulty,
      errorCount: m?.ng ?? 0,
      lv: m?.lv ?? 0,
      lastError: m?.last ? new Date(m.last).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '—',
      skillName: skillLabel(skill),
    };
  }, [current, mastery, difficulty]);

  // 错因驱动内容（P1-3）：统计错题本覆盖的薄弱题型总数，供家长/孩子一眼看到「小茜在针对练什么」
  const weakSummary = useMemo(() => {
    const cats = new Set(
      wrongBook.map((s: string) => s.split(':')[0]).filter(Boolean) as string[],
    );
    let totalTypes = 0;
    let topCount = 0;
    for (const c of cats) {
      const ws = getWeakTypes(c);
      totalTypes += ws.length;
      for (const w of ws) if (w.count > topCount) topCount = w.count;
    }
    return { totalTypes, topCount };
  }, [wrongBook]);

  if (!active && !done) {
    return (
      <div className="space-y-3">
        <Panel className="text-center">
          <div className="text-5xl">🧠</div>
          <h3 className="mt-2 text-lg font-extrabold text-ink">{tr('wrongbook.adaptiveTitle')}</h3>
          <p className="mt-1 text-sm font-bold text-ink-soft">
            {wrongBook.length > 0
              ? tr('wrongbook.pendingDesc', { count: wrongBook.length })
              : tr('wrongbook.emptyDesc')}
          </p>
          {wrongBook.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
              {(() => {
                const due = wrongBook.filter((s) => {
                  const m = mastery[s];
                  return m && isDue(m);
                }).length;
                const weak = weakSkills({ mastery } as unknown as import('@/types').Progress, 5).filter((w) => wrongBook.includes(w.skill)).length;
                return (
                  <>
                    {due > 0 && (
                      <span className="rounded-full bg-candy-orange-soft px-3 py-1 font-bold text-candy-orange-deep">
                        ⏰ {tr('wrongbook.dueReview', { count: due })}
                      </span>
                    )}
                    {weak > 0 && (
                      <span className="rounded-full bg-candy-pink-soft px-3 py-1 font-bold text-candy-pink-deep">
                        🔥 {tr('wrongbook.weakPoints', { count: weak })}
                      </span>
                    )}
                    {weakSummary.totalTypes > 0 && (
                      <span className="rounded-full bg-candy-purple-soft px-3 py-1 font-bold text-candy-purple-deep">
                        🎯 {tr('wrongbook.easyMistTypes', { count: weakSummary.totalTypes })}
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <CandyButton
              tone="purple"
              size="md"
              fullWidth
              disabled={wrongBook.length === 0}
              onClick={startChallenge}
            >
              🚀 {tr('wrongbook.startTraining')}
            </CandyButton>
            {wrongBook.length > 0 && (
              <CandyButton
                tone="blue"
                size="md"
                fullWidth
                onClick={handleAiAnalyze}
              >
                🤖 {tr('wrongbook.aiAnalyze')}
              </CandyButton>
            )}
          </div>
        </Panel>

        {showAiAnalysis && (
          <AiAnalysisPanel
            loading={aiAnalyze.loading}
            result={aiAnalyze.result}
            onRefresh={() => aiAnalyze.run()}
            onClose={() => setShowAiAnalysis(false)}
          />
        )}
      </div>
    );
  }

  if (done) {
    const total = score.ok + score.ng;
    const acc = total > 0 ? Math.round((score.ok / total) * 100) : 0;
    return (
      <div className="space-y-3">
        <Panel className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
            className="text-6xl"
          >
            {acc >= 80 ? '🏆' : acc >= 50 ? '🎉' : '💪'}
          </motion.div>
          <h3 className="mt-2 text-xl font-extrabold text-ink">{tr('wrongbook.trainingDone')}</h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-candy-green-soft p-3">
              <div className="text-2xl font-black text-candy-green-deep">{score.ok}</div>
              <div className="text-xs font-bold text-candy-green-deep">{tr('common.correct')}</div>
            </div>
            <div className="rounded-2xl bg-candy-orange-soft p-3">
              <div className="text-2xl font-black text-candy-orange-deep">{score.ng}</div>
              <div className="text-xs font-bold text-candy-orange-deep">{tr('common.wrong')}</div>
            </div>
            <div className="rounded-2xl bg-candy-purple-soft p-3">
              <div className="text-2xl font-black text-candy-purple-deep">{bestStreak}</div>
              <div className="text-xs font-bold text-candy-purple-deep">{tr('wrongbook.bestStreak')}</div>
            </div>
          </div>
          <p className="mt-3 text-sm font-bold text-ink-soft">{tr('common.accuracy')} {acc}%</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <CandyButton tone="purple" size="md" fullWidth onClick={startChallenge}>
              {tr('common.retryOnce')}
            </CandyButton>
            <CandyButton tone="blue" size="md" fullWidth onClick={handleAiAnalyze}>
              🤖 AI 错题分析
            </CandyButton>
          </div>
        </Panel>

        {showAiAnalysis && (
          <AiAnalysisPanel
            loading={aiAnalyze.loading}
            result={aiAnalyze.result}
            onRefresh={() => aiAnalyze.run()}
            onClose={() => setShowAiAnalysis(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 计分板 */}
      <div className="flex items-center justify-between rounded-2xl bg-candy-purple-soft p-3">
        <div className="flex gap-4">
          <div>
            <span className="text-xs font-bold text-candy-purple-deep">⏱️ </span>
            <span className="text-lg font-black text-candy-purple-deep">{timeLeft}s</span>
          </div>
          <div>
            <span className="text-xs font-bold text-candy-green-deep">✅ </span>
            <span className="text-lg font-black text-candy-green-deep">{score.ok}</span>
          </div>
          <div>
            <span className="text-xs font-bold text-candy-orange-deep">📊 </span>
            <span className="text-sm font-black text-candy-orange-deep">{tr('wrongbook.difficulty')}{difficulty}</span>
          </div>
          {streak >= 2 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={streak}
            >
              <span className="text-xs font-bold text-candy-pink-deep">🔥 </span>
              <span className="text-lg font-black text-candy-pink-deep">{tr('wrongbook.streakCount', { count: streak })}</span>
            </motion.div>
          )}
        </div>
        <button
          onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            setActive(false);
            setDone(true);
          }}
          className="text-xs font-bold text-ink-soft"
        >
          {tr('common.end')}
        </button>
      </div>

      {/* 当前题目信息 */}
      {currentInfo && (
        <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-ink-soft">
          <span>{currentInfo.emoji}</span>
          <span>{currentInfo.subject}</span>
          <span className="text-ink-soft/60">|</span>
          <span>{currentInfo.skillName}</span>
          <span className="text-ink-soft/60">|</span>
          <span>{tr('wrongbook.errorTimes', { count: currentInfo.errorCount })}</span>
          <span className="text-ink-soft/60">|</span>
          <span>{tr('wrongbook.lastWrong')}：{currentInfo.lastError}</span>
        </div>
      )}

      {/* 题目 */}
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <QuizCard
              question={current}
              onAnswer={handleAnswer}
              autoSpeak
              meta={tr('wrongbook.difficultyMeta', { level: difficulty })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI 分析面板                                                          */
/* ------------------------------------------------------------------ */
function AiAnalysisPanel({
  loading,
  result,
  onRefresh,
  onClose,
}: {
  loading: boolean;
  result?: { ok: boolean; data: { pattern: string; suggest: string; priority: string; encourage: string }; fallback: boolean };
  onRefresh: () => void;
  onClose: () => void;
}) {
  const { t: tr } = useTranslation();
  return (
    <Panel className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-extrabold text-ink">🤖 {tr('wrongbook.aiAnalyze')}</h3>
        <button onClick={onClose} className="text-sm font-bold text-ink-soft">✕</button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="text-3xl"
          >
            🔄
          </motion.div>
          <span className="ml-2 text-sm font-bold text-ink-soft">{tr('wrongbook.aiAnalyzing')}</span>
        </div>
      )}

      {!loading && result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {result.fallback && (
            <div className="rounded-lg bg-candy-yellow-soft px-3 py-1 text-xs font-bold text-candy-yellow-deep">
              ⚠️ {tr('wrongbook.localFallback')}
            </div>
          )}
          <div className="rounded-xl bg-candy-blue-soft p-3">
            <div className="text-xs font-bold text-candy-blue-deep">🔍 {tr('wrongbook.errorPattern')}</div>
            <div className="mt-1 text-sm font-bold text-ink">{result.data.pattern}</div>
          </div>
          <div className="rounded-xl bg-candy-green-soft p-3">
            <div className="text-xs font-bold text-candy-green-deep">💡 {tr('wrongbook.suggestPractice')}</div>
            <div className="mt-1 text-sm font-bold text-ink">{result.data.suggest}</div>
          </div>
          <div className="rounded-xl bg-candy-orange-soft p-3">
            <div className="text-xs font-bold text-candy-orange-deep">🎯 {tr('wrongbook.priorityTarget')}</div>
            <div className="mt-1 text-sm font-bold text-ink">{result.data.priority}</div>
          </div>
          <div className="rounded-xl bg-candy-pink-soft p-3">
            <div className="text-xs font-bold text-candy-pink-deep">💪 {tr('wrongbook.encourage')}</div>
            <div className="mt-1 text-sm font-bold text-ink">{result.data.encourage}</div>
          </div>
          <div className="flex gap-2">
            <CandyButton tone="blue" size="sm" fullWidth onClick={onRefresh}>
              {tr('wrongbook.refreshAnalysis')}
            </CandyButton>
          </div>
        </motion.div>
      )}
    </Panel>
  );
}
