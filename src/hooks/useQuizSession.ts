import { useState, useCallback, useRef, useEffect } from 'react';
import type { Question } from '@/types';
import { useStore } from '@/store/useStore';
import { sfxCorrect, sfxWrong, sfxStar } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';

export interface QuizSessionOptions {
  /** 题目生成器 */
  genQuestion: () => Question | null;
  /** 每轮题目总数（默认 8，限时模式下可不设限） */
  totalCount?: number;
  /** 倒计时总秒数（可选，例如 60） */
  timeLimitSec?: number;
  /** 完成回调 */
  onComplete?: (result: QuizSessionResult) => void;
  /** 是否自动记录答题进度到 Store */
  autoRecord?: boolean;
}

export interface QuizSessionResult {
  ok: number;
  ng: number;
  total: number;
  starsGained: number;
  maxCombo: number;
}

export function useQuizSession({
  genQuestion,
  totalCount = 8,
  timeLimitSec,
  onComplete,
  autoRecord = true,
}: QuizSessionOptions) {
  const practice = useStore((s) => s.practice);
  const addStars = useStore((s) => s.addStars);

  const [current, setCurrent] = useState<Question | null>(() => genQuestion());
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState({ ok: 0, ng: 0 });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimitSec ?? 0);
  const [isDone, setIsDone] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 倒计时管理
  useEffect(() => {
    if (!timeLimitSec || isDone) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLimitSec, isDone]);

  // 处理作答
  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (isDone || !current) return;

      const newOk = correct ? score.ok + 1 : score.ok;
      const newNg = correct ? score.ng : score.ng + 1;
      const newCombo = correct ? combo + 1 : 0;
      const newMaxCombo = Math.max(maxCombo, newCombo);

      setScore({ ok: newOk, ng: newNg });
      setCombo(newCombo);
      setMaxCombo(newMaxCombo);

      // 音效与激励
      if (correct) {
        sfxCorrect();
        if (newCombo > 0 && newCombo % 3 === 0) {
          celebrateSmall();
        }
      } else {
        sfxWrong();
      }

      // 记录到 Store
      if (autoRecord && current.skill) {
        practice(current.skill, correct, 1, (current.difficulty ?? 1) as 1 | 2 | 3);
      }

      const nextIdx = index + 1;
      setIndex(nextIdx);

      // 判断是否完成全部固定题量（非倒计时模式下）
      if (!timeLimitSec && nextIdx >= totalCount) {
        setIsDone(true);
        const starsGained = Math.max(1, Math.floor(newOk / 2));
        addStars(starsGained);
        sfxStar();
        onComplete?.({
          ok: newOk,
          ng: newNg,
          total: nextIdx,
          starsGained,
          maxCombo: newMaxCombo,
        });
      } else {
        const nextQ = genQuestion();
        setCurrent(nextQ);
        if (!nextQ) {
          setIsDone(true);
        }
      }
    },
    [isDone, current, score, combo, maxCombo, autoRecord, index, timeLimitSec, totalCount, genQuestion, practice, addStars, onComplete],
  );

  // 重新开始
  const restart = useCallback(() => {
    setScore({ ok: 0, ng: 0 });
    setCombo(0);
    setMaxCombo(0);
    setIndex(0);
    setTimeLeft(timeLimitSec ?? 0);
    setIsDone(false);
    setCurrent(genQuestion());
  }, [genQuestion, timeLimitSec]);

  return {
    current,
    index,
    score,
    combo,
    maxCombo,
    timeLeft,
    isDone,
    handleAnswer,
    restart,
  };
}
