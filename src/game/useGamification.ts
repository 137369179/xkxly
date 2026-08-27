/**
 * 游戏化呈现编排 Hook（combo / 即时反馈 / 成就检测 / 庆祝）
 * ------------------------------------------------------------
 * 与 engine.ts 的「进度计算」正交：本 Hook 只负责「作答后界面该做什么」，
 * 不触碰 Progress 持久化（持久化仍由 useStore 的 practice/recordMath 负责），
 * 因此三核心只需：① 调 store 写进度；② 调本 Hook 的 handleAnswer 拿反馈与成就。
 *
 * 设计要点：
 *   - combo（连击）用本地 state，避免污染全局 Progress；
 *   - 即时反馈复用 feedback.answerCorrect/Wrong（已含音效 + 彩带 + 成长型话术）；
 *   - 成就检测复用 milestone.checkMilestones（只读，不写）；
 *   - 尊重 reduced-motion（庆祝由 celebrate 内部降级，此处只补「里程碑大庆祝」）。
 */
import { useCallback, useRef, useState } from 'react';
import type { Progress } from '@/types';
import { answerCorrect, answerWrong, type PraiseScene, type EncourageScene } from '@/lib/feedback';
import { checkMilestones, type Milestone } from '@/lib/milestone';
import { celebrateBig } from '@/lib/celebrate';

export interface UseGamificationOptions {
  /** 取「最新」进度快照的 getter（建议在 store 写入后调用，成就判定才准） */
  getProgress?: () => Progress;
  /** 默认表扬场景 */
  scene?: PraiseScene;
}

export interface AnswerHandleResult {
  /** 即时反馈话术（非空，直接展示 / 朗读即可） */
  feedback: string;
  /** 本次作答新触发的成就（已按庆祝顺序排好），用于弹窗 / 徽章解锁 */
  milestones: Milestone[];
  /** 当前连击数 */
  combo: number;
}

export interface GamificationApi {
  combo: number;
  resetCombo: () => void;
  handleAnswer: (correct: boolean, opts?: { skill?: string; scene?: PraiseScene }) => AnswerHandleResult;
}

export function useGamification(options: UseGamificationOptions = {}): GamificationApi {
  const getProgressRef = useRef(options.getProgress);
  getProgressRef.current = options.getProgress;
  const sceneRef = useRef(options.scene);
  sceneRef.current = options.scene;

  const [combo, setCombo] = useState(0);
  const comboRef = useRef(0);

  const resetCombo = useCallback(() => {
    comboRef.current = 0;
    setCombo(0);
  }, []);

  const handleAnswer = useCallback(
    (correct: boolean, opts?: { skill?: string; scene?: PraiseScene }): AnswerHandleResult => {
      const scene = (opts?.scene ?? sceneRef.current ?? 'general') as PraiseScene;
      const feedback = correct
        ? answerCorrect(scene)
        : answerWrong((opts?.scene ?? sceneRef.current ?? 'general') as EncourageScene);

      comboRef.current = correct ? comboRef.current + 1 : 0;
      setCombo(comboRef.current);

      const progress = getProgressRef.current?.();
      const milestones = progress ? checkMilestones(progress) : [];
      if (correct && milestones.length > 0) void celebrateBig();

      return { feedback, milestones, combo: comboRef.current };
    },
    [],
  );

  return { combo, resetCombo, handleAnswer };
}
