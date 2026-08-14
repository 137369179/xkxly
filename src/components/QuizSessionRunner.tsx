import type { Question } from '@/types';
import { useQuizSession, type QuizSessionResult } from '@/hooks/useQuizSession';
import { QuizCard } from '@/components/QuizCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CandyButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { Tone } from '@/lib/tones';

export interface QuizSessionRunnerProps {
  genQuestion: () => Question | null;
  count?: number;
  timeLimitSec?: number;
  tone?: Tone;
  title?: string;
  onFinish?: (result: QuizSessionResult) => void;
  onExit?: () => void;
}

export function QuizSessionRunner({
  genQuestion,
  count = 8,
  timeLimitSec,
  tone = 'purple',
  title = '智能小挑战',
  onFinish,
  onExit,
}: QuizSessionRunnerProps) {
  const session = useQuizSession({
    genQuestion,
    totalCount: count,
    timeLimitSec,
    onComplete: onFinish,
  });

  const progressPct = timeLimitSec
    ? Math.round(((timeLimitSec - session.timeLeft) / timeLimitSec) * 100)
    : Math.round((session.index / count) * 100);

  return (
    <div className="space-y-4">
      {/* 顶部状态条 */}
      <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-2.5 shadow-sm border border-black/5">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-ink">{title}</span>
          {session.combo >= 2 && (
            <span className="animate-bounce-soft rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">
              🔥 {session.combo} 连对!
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {timeLimitSec ? (
            <span className="text-sm font-black tabular-nums text-candy-orange-deep">
              ⏱️ {session.timeLeft}s
            </span>
          ) : (
            <span className="text-sm font-black tabular-nums text-ink-soft">
              {session.index + 1} / {count}
            </span>
          )}
          <span className="text-sm font-black text-candy-green-deep">
            ✅ {session.score.ok}
          </span>
        </div>
      </div>

      {/* 进度条 */}
      <ProgressBar value={progressPct} max={100} tone={tone} showLabel={false} />

      {/* 题目卡片 */}
      {session.current && !session.isDone && (
        <QuizCard
          question={session.current}
          onAnswer={session.handleAnswer}
          autoSpeak={true}
        />
      )}

      {/* 结算弹窗 */}
      <Modal open={session.isDone} onClose={() => onExit?.()} className="max-w-sm text-center">
        <div className="space-y-4 py-2">
          <div className="text-5xl">🏆</div>
          <h3 className="text-2xl font-black text-ink">太棒啦！挑战完成</h3>
          <p className="text-sm font-bold text-ink-soft">
            答对 <span className="font-black text-candy-green-deep">{session.score.ok}</span> 题 · 最高连对{' '}
            <span className="font-black text-amber-600">{session.maxCombo}</span>
          </p>

          <div className="flex gap-3 pt-2">
            <CandyButton
              tone={tone}
              variant="soft"
              fullWidth
              onClick={session.restart}
            >
              🔄 再练一次
            </CandyButton>
            <CandyButton
              tone={tone}
              fullWidth
              onClick={() => onExit?.()}
            >
              🎉 完成
            </CandyButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
