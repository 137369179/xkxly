/**
 * 蒙台梭利十格阵 (Ten-Frame) 凑十法与破十法认知组件 🥕 (N5)
 * ------------------------------------------------------------
 * 基于蒙氏感官数学与幼小衔接大纲：
 * 1. 凑十法加法 (如 7 + 5 = 12)
 * 2. 破十法减法 (如 13 - 5 = 8)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { speak } from '@/lib/speech';

interface TenFrameProblem {
  a: number; // 7
  b: number; // 5
  makeTen: number; // 3
  remain: number; // 2
  sum: number; // 12
}

const ADD_PROBLEMS: TenFrameProblem[] = [
  { a: 7, b: 5, makeTen: 3, remain: 2, sum: 12 },
  { a: 8, b: 4, makeTen: 2, remain: 2, sum: 12 },
  { a: 9, b: 3, makeTen: 1, remain: 2, sum: 12 },
  { a: 6, b: 5, makeTen: 4, remain: 1, sum: 11 },
  { a: 8, b: 5, makeTen: 2, remain: 3, sum: 13 },
  { a: 7, b: 6, makeTen: 3, remain: 3, sum: 13 },
];

interface SubProblem {
  total: number; // 13
  sub: number; // 5
  breakTen: number; // 10 - 5 = 5
  remain: number; // 3
  result: number; // 8
}

const SUB_PROBLEMS: SubProblem[] = [
  { total: 13, sub: 5, breakTen: 5, remain: 3, result: 8 },
  { total: 12, sub: 4, breakTen: 6, remain: 2, result: 8 },
  { total: 14, sub: 6, breakTen: 4, remain: 4, result: 8 },
  { total: 11, sub: 3, breakTen: 7, remain: 1, result: 8 },
  { total: 15, sub: 7, breakTen: 3, remain: 5, result: 8 },
];

export function TenFrameMath() {
  const [mode, setMode] = useState<'add' | 'sub'>('add');
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState<'initial' | 'action' | 'done'>('initial');

  const addProb = ADD_PROBLEMS[idx % ADD_PROBLEMS.length]!
  const subProb = SUB_PROBLEMS[idx % SUB_PROBLEMS.length]!

  const handleMakeTen = () => {
    sfxTap();
    setStep('action');
    speak(`从第二个数借走 ${addProb.makeTen} 个，凑成 10！剩下 ${addProb.remain} 个！`, { lang: 'zh-CN' });
  };

  const handleBreakTen = () => {
    sfxTap();
    setStep('action');
    speak(`从 10 格框拿走 ${subProb.sub} 个，剩 ${subProb.breakTen} 个！再加上单出来的 ${subProb.remain} 个！`, { lang: 'zh-CN' });
  };

  const handleComplete = () => {
    sfxCorrect();
    setStep('done');
    if (mode === 'add') {
      speak(`10 加上 ${addProb.remain}，等于 ${addProb.sum}！太棒啦！`, { lang: 'zh-CN' });
    } else {
      speak(`5 加上 ${subProb.remain}，等于 ${subProb.result}！破十法算对啦！`, { lang: 'zh-CN' });
    }
  };

  const handleNext = () => {
    sfxTap();
    setStep('initial');
    setIdx(i => i + 1);
  };

  return (
    <div className="card-candy space-y-5 p-5 text-center">
      {/* 模式选择 */}
      <div className="flex justify-center gap-2 mb-2">
        <button
          onClick={() => { setMode('add'); setStep('initial'); }}
          className={`rounded-2xl px-4 py-1.5 text-xs font-black transition-all ${
            mode === 'add' ? 'bg-orange-500 text-white shadow-sm' : 'bg-orange-100 text-orange-800'
          }`}
        >
          ➕ 凑十法 (加法)
        </button>
        <button
          onClick={() => { setMode('sub'); setStep('initial'); }}
          className={`rounded-2xl px-4 py-1.5 text-xs font-black transition-all ${
            mode === 'sub' ? 'bg-purple-500 text-white shadow-sm' : 'bg-purple-100 text-purple-800'
          }`}
        >
          ➖ 破十法 (减法)
        </button>
      </div>

      {mode === 'add' ? (
        <>
          <div className="text-3xl font-black text-ink">
            {addProb.a} + {addProb.b} = {step === 'done' ? addProb.sum : '?'}
          </div>

          <div className="mx-auto grid max-w-sm grid-cols-5 gap-2 rounded-3xl border-4 border-amber-300 bg-amber-50 p-4 shadow-inner">
            {Array.from({ length: 10 }).map((_, i) => {
              const isFromA = i < addProb.a;
              const isFilledFromB = step !== 'initial' && i >= addProb.a && i < 10;
              return (
                <div key={`_-${i}`} className="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-2xl shadow-sm border border-amber-200">
                  <AnimatePresence mode="wait">
                    {isFromA && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>🥕</motion.span>}
                    {isFilledFromB && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>🌟</motion.span>}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-3">
            {step === 'initial' && (
              <CandyButton tone="purple" size="md" onClick={handleMakeTen}>
                ✨ 第一步：借几凑十？(借 {addProb.makeTen} 个)
              </CandyButton>
            )}

            {step === 'action' && (
              <CandyButton tone="orange" size="md" onClick={handleComplete}>
                🎉 第二步：算总数！(10 + {addProb.remain})
              </CandyButton>
            )}

            {step === 'done' && (
              <CandyButton tone="green" size="md" onClick={handleNext}>
                🚀 算得真棒！下一题 ➔
              </CandyButton>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="text-3xl font-black text-ink">
            {subProb.total} - {subProb.sub} = {step === 'done' ? subProb.result : '?'}
          </div>

          <div className="mx-auto grid max-w-sm grid-cols-5 gap-2 rounded-3xl border-4 border-purple-300 bg-purple-50 p-4 shadow-inner">
            {Array.from({ length: 10 }).map((_, i) => {
              const isSubbed = step !== 'initial' && i >= (10 - subProb.sub);
              return (
                <div key={`_-${i}`} className="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-2xl shadow-sm border border-purple-200">
                  {!isSubbed ? '🥕' : '❌'}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-3">
            {step === 'initial' && (
              <CandyButton tone="purple" size="md" onClick={handleBreakTen}>
                ✨ 第一步：破十！(10 减 {subProb.sub} 剩 {subProb.breakTen})
              </CandyButton>
            )}

            {step === 'action' && (
              <CandyButton tone="orange" size="md" onClick={handleComplete}>
                🎉 第二步：加上余数！({subProb.breakTen} + {subProb.remain})
              </CandyButton>
            )}

            {step === 'done' && (
              <CandyButton tone="green" size="md" onClick={handleNext}>
                🚀 破十成功！下一题 ➔
              </CandyButton>
            )}
          </div>
        </>
      )}
    </div>
  );
}
