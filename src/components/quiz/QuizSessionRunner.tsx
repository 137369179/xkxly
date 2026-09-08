import { useState } from "react";
import type { Question } from "@/types";
import { useQuizSession, type QuizSessionResult } from "@/hooks/useQuizSession";
import { QuizCard } from "@/components/QuizCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CandyButton } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Tone } from "@/lib/tones";

export interface QuizSessionRunnerProps {
  genQuestion: () => Question | null;
  count?: number;
  timeLimitSec?: number;
  tone?: Tone;
  title?: string;
  onFinish?: (result: QuizSessionResult) => void;
  onExit?: () => void;
  /** 每题作答后回调（correct + 本题 Question），供消费方做专属逻辑 */
  onAnswer?: (correct: boolean, question: Question) => void;
}

export function QuizSessionRunner({
  genQuestion,
  count = 8,
  timeLimitSec,
  tone = "purple",
  title = "智能小挑战",
  onFinish,
  onExit,
  onAnswer,
}: QuizSessionRunnerProps) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const session = useQuizSession({
    genQuestion,
    totalCount: count,
    timeLimitSec,
    onComplete: onFinish,
    onAnswer,
  });

  const progressPct = timeLimitSec
    ? Math.round(((timeLimitSec - session.timeLeft) / timeLimitSec) * 100)
    : Math.round((session.index / count) * 100);

  const handleRequestExit = () => {
    if (session.index > 0 && !session.isDone) {
      setShowExitConfirm(true);
    } else {
      onExit?.();
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部状态条 */}
      <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-2.5 shadow-sm border border-black/5">
        <div className="flex items-center gap-2">
          {onExit && (
            <button
              onClick={handleRequestExit}
              className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-candy-pink-soft/30 text-base text-ink-soft hover:bg-candy-pink-soft/60"
              aria-label="退出挑战"
              title="退出挑战"
            >
              ✕
            </button>
          )}
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

      {/* 退出防误触确认弹窗 */}
      <Modal open={showExitConfirm} onClose={() => setShowExitConfirm(false)} className="max-w-sm text-center">
        <div className="space-y-4 py-2">
          <div className="text-5xl">🐱</div>
          <h3 className="text-xl font-black text-ink">要暂时离开小挑战吗？</h3>
          <p className="text-sm font-bold text-ink-soft">
            已经答对 <span className="font-black text-candy-green-deep">{session.score.ok}</span> 道题啦，再坚持一下就能通关领奖章哦！
          </p>

          <div className="flex gap-3 pt-2">
            <CandyButton
              tone={tone}
              fullWidth
              onClick={() => setShowExitConfirm(false)}
            >
              💪 继续挑战
            </CandyButton>
            <CandyButton
              tone={tone}
              variant="soft"
              fullWidth
              onClick={() => {
                setShowExitConfirm(false);
                onExit?.();
              }}
            >
              下次再来
            </CandyButton>
          </div>
        </div>
      </Modal>

      {/* 结算弹窗 */}
      <Modal open={session.isDone} onClose={() => onExit?.()} className="max-w-sm text-center">
        <div className="space-y-4 py-2">
          <div className="text-5xl">🏆</div>
          <h3 className="text-2xl font-black text-ink">太棒啦！挑战完成</h3>
          <p className="text-sm font-bold text-ink-soft">
            答对 <span className="font-black text-candy-green-deep">{session.score.ok}</span> 题 · 最高连对{" "}
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
