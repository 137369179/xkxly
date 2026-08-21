/**
 * 🧪 科学小考官（ScienceQuiz）
 * ------------------------------------------------------------
 * R54 游戏化：在每个科学实验室探索后追加「小考官」知识问答。
 * 基于 RoundRunner + 3 连对闯关（StreakBar），难度自适应（L1 认物 → L2 特征 → L3 推理）。
 * 答对即时反馈（answerCorrect 科学场景表扬 + 彩带），答错温和引导（answerWrong 鼓励重探）。
 */
import { useCallback } from 'react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { RoundRunner } from '@/components/quiz/RoundRunner';
import type { Difficulty } from '@/lib/questions/_shared';
import { makeScienceQuestion, type ScienceCategory } from '@/lib/questions/science';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';

const DIFF_EMOJIS = { 1: '🌱', 2: '🌿', 3: '🌟' } as const;

export function ScienceQuiz({ category }: { category: ScienceCategory }) {
  const { t } = useTranslation();
  const [diff, setDiff, diffMeta] = useAdaptiveDifficultyState('science');
  const practice = useStore((s) => s.practice);

  const make = useCallback(
    (d: Difficulty) => makeScienceQuestion(category, d),
    [category],
  );

  // 难度标签走 i18n（按类别区分）
  const labels: Record<1 | 2 | 3, string> = {
    1: t(`scienceQuiz.${category}1`),
    2: t(`scienceQuiz.${category}2`),
    3: t(`scienceQuiz.${category}3`),
  };

  return (
    <Panel className="border-2 border-candy-purple-soft bg-gradient-to-br from-purple-50 via-white to-sky-50">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-base font-extrabold text-ink">
          🧐 {t('scienceQuiz.title')}
        </div>
        <div className="flex gap-1.5">
          {([1, 2, 3] as const).map((d) => (
            <CandyButton
              key={d}
              tone={diff === d ? 'purple' : 'blue'}
              variant={diff === d ? 'solid' : 'soft'}
              size="sm"
              className="!px-2.5 !py-1 !text-xs"
              onClick={() => setDiff(d)}
            >
              {DIFF_EMOJIS[d]} {labels[d]}
            </CandyButton>
          ))}
        </div>
      </div>

      <RoundRunner
        key={`${category}-${diff}`}
        makeQuestion={make}
        difficulty={diff}
        tone="purple"
        questionsPerRound={5}
        streakBar={{ target: 3, tone: 'purple' }}
        onRoundStart={diffMeta.syncNow}
        onAnswered={(q, c) => practice(q.skill ?? `science:${category}`, c)}
      />
    </Panel>
  );
}
