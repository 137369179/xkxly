/**
 * 智能自适应难度 Hook（I 层 · 会话内动态校准）
 * ------------------------------------------------------------
 * 把「难度写死」升级为「随表现爬坡」：
 *   - 连续答对 5 题 → 难度 +1（提高阈值避免蒙对升档）
 *   - 连续答错 2 题 → 难度 -1（温和降档防挫败）
 * 迟滞逻辑复用 difficulty.calibrateDifficulty，杜绝第二份实现漂移。
 * 三核心练习循环只需：onCorrect() / onWrong()，即可获得
 * 「当前难度 + 通关所需连对数」。
 */
import { useCallback, useRef, useState } from 'react';
import { calibrateDifficulty, streakTargetForLevel } from '@/lib/difficulty';

export type DifficultyLevel = 1 | 2 | 3;

export interface UseAdaptiveDifficultyOptions {
  /** 起始难度（可由外部按历史掌握度预设，如 rampDifficulty 结果） */
  initialLevel?: DifficultyLevel;
  /** 难度上限（防止低龄段过高），默认 3 */
  maxLevel?: DifficultyLevel;
}

export interface AdaptiveDifficultyApi {
  level: DifficultyLevel;
  /** 当前难度下「通关」所需连对数（渐进式难度可视化） */
  streakTarget: number;
  /** 连续答对计数 */
  correctStreak: number;
  onCorrect: () => void;
  onWrong: () => void;
  reset: () => void;
}

export function useAdaptiveDifficulty(
  options: UseAdaptiveDifficultyOptions = {},
): AdaptiveDifficultyApi {
  const initial = (options.initialLevel ?? 1) as DifficultyLevel;
  const maxLevel = (options.maxLevel ?? 3) as DifficultyLevel;

  const [level, setLevel] = useState<DifficultyLevel>(initial);
  const [correctStreak, setCorrectStreak] = useState(0);
  const correctStreakRef = useRef(0);
  const wrongStreakRef = useRef(0);

  const onCorrect = useCallback(() => {
    correctStreakRef.current += 1;
    wrongStreakRef.current = 0;
    setCorrectStreak(correctStreakRef.current);
    setLevel((prev) => {
      const next = calibrateDifficulty(prev, correctStreakRef.current, 0);
      return Math.min(next, maxLevel) as DifficultyLevel;
    });
  }, [maxLevel]);

  const onWrong = useCallback(() => {
    correctStreakRef.current = 0;
    setCorrectStreak(0);
    wrongStreakRef.current += 1;
    setLevel((prev) => calibrateDifficulty(prev, 0, wrongStreakRef.current) as DifficultyLevel);
  }, []);

  const reset = useCallback(() => {
    correctStreakRef.current = 0;
    wrongStreakRef.current = 0;
    setCorrectStreak(0);
    setLevel(initial);
  }, [initial]);

  return {
    level,
    streakTarget: streakTargetForLevel(level),
    correctStreak,
    onCorrect,
    onWrong,
    reset,
  };
}
