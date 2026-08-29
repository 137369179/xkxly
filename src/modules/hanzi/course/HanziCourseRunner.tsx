import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { HanziEntry } from '@/data/hanzi';
import { useStore } from '@/store/useStore';
import { COURSE_STEPS, type HanziCourseStep, type StepResult } from './types';
import { HanziEtymologyPlay } from './HanziEtymologyPlay';
import { HanziPhonicsExplain } from './HanziPhonicsExplain';
import { HanziGamePractice } from './HanziGamePractice';
import { HanziStrokeCanvas } from './HanziStrokeCanvas';
import { HanziSpeechReview } from './HanziSpeechReview';
import { sfxTap, sfxWin } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';

interface Props {
  char: HanziEntry;
  onClose: () => void;
}

export function HanziCourseRunner({ char, onClose }: Props) {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [stepResults, setStepResults] = useState<Record<HanziCourseStep, StepResult>>({
    play: { step: 'play', stars: 0, completed: false },
    recognize: { step: 'recognize', stars: 0, completed: false },
    practice: { step: 'practice', stars: 0, completed: false },
    write: { step: 'write', stars: 0, completed: false },
    speak: { step: 'speak', stars: 0, completed: false },
  });
  const [isAllCompleted, setIsAllCompleted] = useState<boolean>(false);

  const addStars = useStore((s) => s.addStars);
  const addFish = useStore((s) => s.addFish);

  const currentStep = COURSE_STEPS[currentStepIdx] ?? COURSE_STEPS[0]!;

  const handleStepComplete = (starsEarned: number) => {
    const stepId = currentStep.id;
    setStepResults((prev) => ({
      ...prev,
      [stepId]: { step: stepId, stars: starsEarned, completed: true },
    }));

    // 奖励星星
    addStars(starsEarned);

    if (currentStepIdx < COURSE_STEPS.length - 1) {
      sfxTap();
      setCurrentStepIdx((i) => i + 1);
    } else {
      // 五步全部完成！
      sfxWin();
      celebrateBig();
      addFish(5);
      setIsAllCompleted(true);
    }
  };

  const totalStarsEarned = Object.values(stepResults).reduce((sum, r) => sum + r.stars, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-amber-200 overflow-hidden flex flex-col min-h-[580px]">
        {/* 顶部导航与步进器 (Top Stepper) */}
        <div className="p-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-candy-orange-on flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black shadow-inner">
              {char.c}
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-lg">
                <span>洪恩五步精学</span>
                <span className="text-xs bg-amber-300 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                  {char.pd}
                </span>
              </div>
              <p className="text-xs text-amber-100 font-medium">
                {currentStep.titleKey}：{currentStep.descKey}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 text-white font-black text-xl flex items-center justify-center transition-colors"
            aria-label="关闭精学课程"
          >
            ✕
          </button>
        </div>

        {/* 五步流程进度条 (Step Indicator) */}
        <div className="grid grid-cols-5 gap-1 p-2 bg-amber-50 border-b border-amber-200">
          {COURSE_STEPS.map((step, idx) => {
            const isCurrent = currentStepIdx === idx;
            const isDone = stepResults[step.id].completed;
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center p-1.5 rounded-xl text-center transition-all ${
                  isCurrent
                    ? 'bg-amber-500 text-candy-orange-on shadow-md font-black'
                    : isDone
                    ? 'bg-emerald-100 text-emerald-800 font-bold'
                    : 'bg-white/60 text-slate-400 font-medium'
                }`}
              >
                <span className="text-sm">
                  {isDone ? '✅' : step.emoji}
                </span>
                <span className="text-xs scale-95 mt-0.5 truncate max-w-full">
                  {step.titleKey.split('·')[0]}
                </span>
              </div>
            );
          })}
        </div>

        {/* 核心步骤内容区 (Dynamic Step Body) */}
        <div className="flex-1 p-2 sm:p-4 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {!isAllCompleted ? (
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                {currentStep.id === 'play' && (
                  <HanziEtymologyPlay char={char} onComplete={handleStepComplete} />
                )}
                {currentStep.id === 'recognize' && (
                  <HanziPhonicsExplain char={char} onComplete={handleStepComplete} />
                )}
                {currentStep.id === 'practice' && (
                  <HanziGamePractice char={char} onComplete={handleStepComplete} />
                )}
                {currentStep.id === 'write' && (
                  <HanziStrokeCanvas char={char} onComplete={handleStepComplete} />
                )}
                {currentStep.id === 'speak' && (
                  <HanziSpeechReview
                    char={char}
                    totalStars={totalStarsEarned}
                    onComplete={handleStepComplete}
                  />
                )}
              </motion.div>
            ) : (
              /* 全五步通关总览界面 (Completion Summary) */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-6 space-y-5"
              >
                <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-amber-400 to-orange-500 rounded-3xl shadow-xl flex items-center justify-center text-5xl">
                  🎉
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black text-slate-800">
                    「{char.c}」字全通关！
                  </h3>
                  <p className="text-sm text-slate-600">
                    玩、认、练、写、说五大维度全面掌握！
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 py-3 bg-amber-50 rounded-2xl border border-amber-200 max-w-sm mx-auto">
                  <div className="text-center">
                    <span className="text-2xl font-black text-amber-600 block">
                      +{totalStarsEarned}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">⭐ 获得星星</span>
                  </div>
                  <div className="w-px h-8 bg-amber-200" />
                  <div className="text-center">
                    <span className="text-2xl font-black text-orange-600 block">+5</span>
                    <span className="text-xs text-slate-500 font-bold">🐟 小鱼干</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full max-w-sm mx-auto py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-candy-orange-on rounded-2xl font-black text-base shadow-xl shadow-orange-300/50 hover:scale-102 active:scale-98 transition-transform"
                >
                  太棒了，完成并返回
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
