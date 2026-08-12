/**
 * 错题智能复习 · 从错题本提取 skill 重新出题
 * ------------------------------------------------------------------
 * 限时 60 秒挑战，答对自动移出错题本
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { QuizCard } from '@/components/QuizCard';
import { useStore, useProgress } from '@/store/useStore';
import { questionForSkill } from '@/lib/questions';
import { makeMathQuestion } from '@/lib/questions';
import { sfxTap, sfxWin, sfxWrong } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import type { Question } from '@/types';
import { useTranslation } from '@/i18n/useTranslation';

const CHALLENGE_SEC = 60;

function genFromSkill(skill: string): Question | null {
  const q = questionForSkill(skill, 2);
  if (q) return q;
  // 兜底：数学题
  return makeMathQuestion(2);
}

export function WrongBookTrainer() {
  const { t: tr } = useTranslation();
  const progress = useProgress();
  const practice = useStore((s) => s.practice);

  const [active, setActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_SEC);
  const [score, setScore] = useState({ ok: 0, ng: 0 });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [current, setCurrent] = useState<Question | null>(null);
  const [done, setDone] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
  }, []);

  const nextQuestion = useCallback(() => {
    if (progress.wrongBook.length === 0) {
      setDone(true);
      setActive(false);
      return;
    }
    // 随机选一个错题 skill
    const idx = Math.floor(Math.random() * progress.wrongBook.length);
    const skill = progress.wrongBook[idx]!;
    const q = genFromSkill(skill);
    if (!q) {
      // 跳过无法生成的
      setCurrent(makeMathQuestion(2));
    } else {
      setCurrent(q);
    }
  }, [progress.wrongBook]);

  const start = () => {
    sfxTap();
    setActive(true);
    setDone(false);
    setScore({ ok: 0, ng: 0 });
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(CHALLENGE_SEC);
    nextQuestion();
  };

  // 倒计时
  useEffect(() => {
    if (!active) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setActive(false);
          setDone(true);
          celebrateBig();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active]);

  const handleAnswer = (correct: boolean) => {
    if (correct) {
      sfxWin();
      celebrateSmall();
      setScore((s) => ({ ...s, ok: s.ok + 1 }));
      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((b) => Math.max(b, ns));
        return ns;
      });
      if (current?.skill) {
        practice(current.skill, true, 1);
      }
    } else {
      sfxWrong();
      setScore((s) => ({ ...s, ng: s.ng + 1 }));
      setStreak(0);
      if (current?.skill) {
        practice(current.skill, false, 0);
      }
    }
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    nextTimerRef.current = setTimeout(() => nextQuestion(), 300);
  };

  if (!active && !done) {
    return (
      <Panel className="text-center">
        <div className="text-5xl">⚡</div>
        <h3 className="mt-2 text-lg font-extrabold text-ink">{tr('wrongBookTrainer.title')}</h3>
        <p className="mt-1 text-sm font-bold text-ink-soft">
          {progress.wrongBook.length > 0
            ? tr('wrongBookTrainer.pendingDesc', { count: String(progress.wrongBook.length) })
            : tr('wrongBookTrainer.emptyDesc')}
        </p>
        <div className="mt-4">
          <CandyButton
            tone="orange"
            size="lg"
            fullWidth
            disabled={progress.wrongBook.length === 0}
            onClick={start}
          >
            {tr('wrongBookTrainer.start')}
          </CandyButton>
        </div>
      </Panel>
    );
  }

  if (done) {
    const total = score.ok + score.ng;
    const acc = total > 0 ? Math.round((score.ok / total) * 100) : 0;
    return (
      <Panel className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
          className="text-6xl"
        >
          {acc >= 80 ? '🏆' : acc >= 50 ? '🎉' : '💪'}
        </motion.div>
        <h3 className="mt-2 text-xl font-extrabold text-ink">{tr('wrongBookTrainer.doneTitle')}</h3>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-candy-green-soft p-3">
            <div className="text-2xl font-black text-candy-green-deep">{score.ok}</div>
            <div className="text-xs font-bold text-candy-green-deep">{tr('wrongBookTrainer.ok')}</div>
          </div>
          <div className="rounded-2xl bg-candy-orange-soft p-3">
            <div className="text-2xl font-black text-candy-orange-deep">{score.ng}</div>
            <div className="text-xs font-bold text-candy-orange-deep">{tr('wrongBookTrainer.ng')}</div>
          </div>
          <div className="rounded-2xl bg-candy-purple-soft p-3">
            <div className="text-2xl font-black text-candy-purple-deep">{bestStreak}</div>
            <div className="text-xs font-bold text-candy-purple-deep">{tr('wrongBookTrainer.bestStreak')}</div>
          </div>
        </div>
        <p className="mt-3 text-sm font-bold text-ink-soft">{tr('wrongBookTrainer.accuracy', { percent: String(acc) })}</p>
        <div className="mt-4">
          <CandyButton tone="orange" size="lg" fullWidth onClick={start}>
            {tr('wrongBookTrainer.again')}
          </CandyButton>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      {/* 计分板 */}
      <div className="flex items-center justify-between rounded-2xl bg-candy-orange-soft p-3">
        <div className="flex gap-4">
          <div>
            <span className="text-xs font-bold text-candy-orange-deep">⏱️ </span>
            <span className="text-lg font-black text-candy-orange-deep">{timeLeft}s</span>
          </div>
          <div>
            <span className="text-xs font-bold text-candy-green-deep">✅ </span>
            <span className="text-lg font-black text-candy-green-deep">{score.ok}</span>
          </div>
          {streak >= 2 && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={streak}
            >
              <span className="text-xs font-bold text-candy-purple-deep">🔥 </span>
              <span className="text-lg font-black text-candy-purple-deep">{tr('wrongBookTrainer.streak', { count: String(streak) })}</span>
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
          {tr('wrongBookTrainer.end')}
        </button>
      </div>

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
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
