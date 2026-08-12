import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { type Tone } from '@/lib/tones';

import { sfxTap } from '@/lib/sfx';
import { announceStep } from '@/lib/speech';
import { cn } from '@/lib/utils';

/**
 * 五步学习闭环外壳
 *
 * 产品依据：洪恩识字「玩 → 认 → 练 → 写 → 说」单点学习闭环。
 * 关键在于每个知识点都要走完"建立兴趣 → 理解 → 反复接触 → 感知字形 → 开口表达"，
 * 而不是点一下听个读音就算学过了。
 */

export interface FlowStepApi {
  /** 标记本步已满足通过条件（gate 步骤用） */
  ready: () => void;
  /** 直接进入下一步 */
  next: () => void;
  /** 本步是否已满足条件 */
  done: boolean;
}

export interface FlowStep {
  key: string;
  /** 单字标签：玩 / 认 / 练 / 写 / 说 */
  label: string;
  emoji: string;
  /** 需要完成动作才能继续 */
  gate?: boolean;
  render: (api: FlowStepApi) => ReactNode;
}

export interface LearnFlowProps {
  steps: FlowStep[];
  tone?: Tone;
  /** 全部步骤完成 */
  onFinish?: () => void;
  finishLabel?: string;
}

/**
 * A2 · 步骤引导语映射：步骤切换时朗读（受语音引导开关约束）。
 * 玩/认/练/写/说 五步闭环中，玩为引入环节不单独引导，其余四步各配一句。
 */
const STEP_GUIDE: Record<string, string> = {
  认: '来看看这个新知识',
  练: '来练习一下吧',
  写: '现在我们学着写一写',
  说: '跟着读一读吧',
};

export function LearnFlow({ steps, tone = 'blue', onFinish, finishLabel = '完成这一课' }: LearnFlowProps) {
  const [idx, setIdx] = useState(0);

  const [readySet, setReadySet] = useState<Record<string, boolean>>({});

  const step = steps[idx]!!
  const isLast = idx === steps.length - 1;
  const done = !step?.gate || !!readySet[step.key];

  const ready = useCallback(() => {
    if (!step) return;
    setReadySet((s) => (s[step.key] ? s : { ...s, [step.key]: true }));
  }, [step]);

  const next = useCallback(() => {
    sfxTap();
    if (isLast) {
      onFinish?.();
      return;
    }
    setIdx((i) => Math.min(steps.length - 1, i + 1));
  }, [isLast, onFinish, steps.length]);

  const api = useMemo<FlowStepApi>(() => ({ ready, next, done }), [ready, next, done]);

  // A2 · 步骤切换时朗读引导语；首次挂载不朗读，避免与进入页面的 announcePage 互相打断
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const label = steps[idx]!?.label;
    if (label && STEP_GUIDE[label]) {
      announceStep(STEP_GUIDE[label]);
    }
    // 仅在 idx 变化（用户切步）时触发，不依赖 steps 引用
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (!step) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* 步骤指示条 */}
      <div className="flex items-center justify-center gap-1 sm:gap-2 rounded-[2rem] bg-white/80 p-2 shadow-fluffy border-2 border-pink-100">
        {steps.map((s, i) => {
          const passed = i < idx;
          const active = i === idx;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (i <= idx) {
                    sfxTap();
                    setIdx(i);
                  }
                }}
                disabled={i > idx}
                className={cn(
                  'flex h-10 min-w-10 items-center justify-center gap-1 rounded-2xl px-2.5 text-sm font-extrabold transition-all border-2',
                  active && 'scale-105 bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md border-white ring-2 ring-pink-300/50',
                  !active && passed && 'bg-pink-100 text-pink-700 border-pink-200',
                  !active && !passed && 'bg-gray-100 text-gray-400 border-gray-200 opacity-60',
                )}
              >
                <span>{s.emoji}</span>
                <span>{s.label}</span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'h-1 w-2 sm:w-4 rounded-full transition-colors',
                    i < idx ? 'bg-pink-400' : 'bg-gray-200',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 步骤内容 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.key}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
        >
          {step.render(api)}
        </motion.div>
      </AnimatePresence>

      {/* 下一步 */}
      <div className="flex justify-center pt-1">
        <CandyButton
          size="lg"
          tone={isLast ? 'green' : tone}
          onClick={next}
          disabled={!done}
        >
          {isLast ? finishLabel : `下一步 · ${steps[idx + 1]?.label ?? ''}`}
        </CandyButton>
      </div>
      {!done && (
        <p className="-mt-2 text-center text-sm font-semibold text-ink/45">
          先完成上面的小任务，就能继续啦～
        </p>
      )}
    </div>
  );
}
