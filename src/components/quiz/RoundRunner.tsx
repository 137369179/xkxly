import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { Question } from '@/types';
import type { Difficulty } from '@/lib/questions';
import type { Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { QuizCard, type QuizCardProps } from '@/components/QuizCard';
import { Modal } from '@/components/ui/Modal';
import { CandyButton } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/Stars';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { celebrateStars, celebrateBig } from '@/lib/celebrate';
import { sfxWin } from '@/lib/sfx';
import { useStruggle } from '@/lib/struggle';
import { useTranslation } from '@/i18n/useTranslation';
import { StruggleModal } from '@/components/feedback/StruggleModal';
import { StreakBar } from '@/components/study/StreakBar';
import { calibrateDifficulty } from '@/lib/difficulty';
import { starsByMistakes } from '@/lib/stars';

/** StreakBar 主题色（与 Tailwind candy 语义色一致） */
export type StreakTone = 'yellow' | 'green' | 'purple' | 'pink' | 'blue';

interface RoundRunnerProps {
  /** 生成下一题（难度由本组件透传） */
  makeQuestion: (difficulty: Difficulty) => Question;
  difficulty: Difficulty;
  tone?: Tone;
  /** 每轮题数 */
  questionsPerRound?: number;
  /** 每题被解出时回调（用于记录进度/发星） */
  onSolved?: () => void;
  /** 每次作答回调（含对错与题目本体，用于按知识点记录掌握度）
   *  核心加强 C: 传出本题实际出题难度（经动态校准后的），供调用方做难度感知复习 */
  onAnswered?: (q: Question, correct: boolean, difficulty?: Difficulty) => void;
  /** 整轮完成回调，返回获得的星星数 */
  onComplete?: (stars: number) => void;
  /**
   * 新一轮开始前回调。这是「安全边界」——调用方可以在这里把自适应难度的
   * 最新建议应用上来（`meta.syncNow()`），既不会打断孩子做到一半的那一轮，
   * 也不会跳过结算庆祝画面。
   */
  onRoundStart?: () => void;
  /** 自定义结算弹窗内容（闯关页用它注入「下一关」按钮） */
  renderSummary?: (stars: number, onReplay: () => void) => ReactNode;
  /** 顶部一段引导文案（如难度选择） */
  header?: ReactNode;
  /** 答错后的 AI 讲解任务构造器，透传给 QuizCard */
  aiExplain?: QuizCardProps['aiExplain'];
  /**
   * 闯关里程碑条（游戏化·可选）
   * 传入 target 后，本轮连续答对进度以圆点闯关条可视化：
   * 连对达到 target 即「通关」；答错归零温和引导（由 StreakBar 处理展示）。
   * 默认不渲染，零回归；仅需要闯关目标感的题卷式模块开启。
   */
  streakBar?: { target: number; tone?: StreakTone };
}

export function RoundRunner({
  makeQuestion,
  difficulty,
  tone = 'purple',
  questionsPerRound = 5,
  onSolved,
  onAnswered,
  onComplete,
  onRoundStart,
  renderSummary,
  header,
  aiExplain,
  streakBar,
}: RoundRunnerProps) {
  const { t: tr } = useTranslation();
  const makeRef = useRef(makeQuestion);
  makeRef.current = makeQuestion;
  // 走 ref 转发，避免 start/gen 因为父组件每次渲染新建回调而反复重建
  const onRoundStartRef = useRef(onRoundStart);
  onRoundStartRef.current = onRoundStart;

  // P1-5: 学习困难实时干预——连错 3 题弹鼓励 Modal
  const struggle = useStruggle();
  // 核心加强 A: 会话内动态难度——连对/连错实时校准出题难度
  // correctStreak 用 ref，避免 gen 依赖频繁重建；wrongStreak 从 struggle 同步到 ref
  const correctStreakRef = useRef(0);
  const wrongStreakRef = useRef(0);
  wrongStreakRef.current = struggle.wrongStreak;
  // 核心加强 B: 题目去重——记住最近 5 题 id，避免连续重复打击新鲜感
  const recentIdsRef = useRef<string[]>([]);
  // 核心加强 C: 记录当前题实际出题难度，handleAnswer 时透传给 onAnswered 做难度感知复习
  const currentEffRef = useRef<Difficulty>(difficulty);

  const [idx, setIdx] = useState(0);
  const [q, setQ] = useState<Question>(() => {
    // 初始题也记入去重池，避免与第二题重复
    const first = makeRef.current(difficulty);
    recentIdsRef.current = [first.id];
    return first;
  });
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [stars, setStars] = useState(0);
  /** 闯关里程碑条展示用连对计数（游戏化·可选开启） */
  const [streakCount, setStreakCount] = useState(0);

  const gen = useCallback(() => {
    // A: 根据连对/连错动态校准难度（激活原死代码 calibrateDifficulty）
    const eff = calibrateDifficulty(difficulty, correctStreakRef.current, wrongStreakRef.current);
    currentEffRef.current = eff;
    // B: 去重——最多重试 4 次，跳过最近 5 题里出现过的 id
    for (let attempt = 0; attempt < 4; attempt++) {
      const candidate = makeRef.current(eff);
      if (!recentIdsRef.current.includes(candidate.id)) {
        recentIdsRef.current = [...recentIdsRef.current, candidate.id].slice(-5);
        return candidate;
      }
    }
    // 兜底：重试都没命中新题，就用最后一题（保证流程不卡）
    const fallback = makeRef.current(eff);
    recentIdsRef.current = [...recentIdsRef.current, fallback.id].slice(-5);
    return fallback;
  }, [difficulty]);

  const start = useCallback(() => {
    // 安全边界：自适应难度在这里落地（若因此改档，下面的 [difficulty] 副作用
    // 会再跑一次 start，用新难度出题；latched 已同步故不会反复触发）
    onRoundStartRef.current?.();
    setIdx(0);
    setMistakes(0);
    setFinished(false);
    setStars(0);
    correctStreakRef.current = 0;
    setStreakCount(0);
    recentIdsRef.current = [];
    struggle.reset();
    setQ(gen());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen]);

  // 难度变化时整轮重开
  useEffect(() => {
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  const computeStars = (m: number): number => starsByMistakes(m, questionsPerRound);

  const handleAnswer = (correct: boolean) => {
    // C: 传出本题实际出题难度，供调用方做难度感知复习
    onAnswered?.(q, correct, currentEffRef.current);
    struggle.record(correct);
    // A: 维护连对计数，供 gen 动态校准难度
    if (correct) {
      correctStreakRef.current += 1;
      setStreakCount(correctStreakRef.current);
      onSolved?.();
    } else {
      correctStreakRef.current = 0;
      setStreakCount(0);
      setMistakes((m) => m + 1);
    }
  };

  const handleNext = () => {
    if (idx + 1 >= questionsPerRound) {
      const s = computeStars(mistakes);
      setStars(s);
      setFinished(true);
      if (s === 3) celebrateBig();
      else celebrateStars(s);
      sfxWin();
      onComplete?.(s);
      return;
    }
    setIdx((i) => i + 1);
    setQ(gen());
  };

  /** P1-5: 跳过当前题——连错干预时由 StruggleModal 触发，不增加 mistakes（已计过） */
  const handleSkip = () => {
    struggle.reset();
    if (idx + 1 >= questionsPerRound) {
      const s = computeStars(mistakes);
      setStars(s);
      setFinished(true);
      if (s === 3) celebrateBig();
      else celebrateStars(s);
      sfxWin();
      onComplete?.(s);
      return;
    }
    setIdx((i) => i + 1);
    setQ(gen());
  };

  return (
    <div className="space-y-4">
      {header}

      {/* 进度 */}
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-sm font-extrabold text-ink-soft">
          {tr('adventure.questionN', { idx: idx + 1, total: questionsPerRound })}
        </span>
        <ProgressBar
          value={idx}
          max={questionsPerRound}
          tone={tone}
          showLabel={false}
        />
      </div>

      {/* 闯关里程碑条（游戏化·可选）：连续答对点亮，形成"再对几题就通关"目标感 */}
      {streakBar && (
        <StreakBar
          streak={streakCount}
          target={streakBar.target}
          tone={streakBar.tone}
        />
      )}

      <QuizCard
        key={q.id}
        question={q}
        onAnswer={handleAnswer}
        onNext={handleNext}
        meta={tr('adventure.questionN', { idx: idx + 1, total: questionsPerRound })}
        aiExplain={aiExplain}
      />

      {/* P1-5: 学习困难实时干预——连错 3 题弹出鼓励 Modal */}
      <StruggleModal
        open={struggle.isStruggling}
        wrongStreak={struggle.wrongStreak}
        onContinue={() => struggle.reset()}
        onSkip={handleSkip}
      />

      {/* 结算弹窗 */}
      <Modal
        open={finished}
        onClose={start}
        className="max-w-sm text-center"
        dismissable={false}
      >
        {renderSummary ? (
          renderSummary(stars, start)
        ) : (
          <div>
            <motion.div
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            >
              <div className="text-7xl">{stars === 3 ? '🏆' : '🎉'}</div>
              <h3 className="mt-3 text-3xl font-extrabold text-rainbow">
                {stars === 3 ? tr('adventure.perfectWin') : tr('adventure.roundWin')}
              </h3>
              <p className="mt-2 text-base font-bold text-ink-soft">
                {mistakes === 0
                  ? tr('adventure.noMistake')
                  : tr('adventure.mistakeCount', { count: mistakes })}
              </p>
              <div className="mt-4 flex justify-center">
                <StarRating value={stars} size={42} animated />
              </div>
            </motion.div>
            <div className={cn('mt-6 flex gap-3', stars === 3 && 'justify-center')}>
              <CandyButton tone="green" size="lg" fullWidth onClick={start}>
                {tr('common.retryNew')}
              </CandyButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
