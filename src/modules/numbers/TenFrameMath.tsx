import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';

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
  { a: 9, b: 6, makeTen: 1, remain: 5, sum: 15 },
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
  { total: 16, sub: 8, breakTen: 2, remain: 6, result: 8 },
];

const SKINS = [
  { id: 'carrot', label: '🥕 胡萝卜', emoji1: '🥕', emoji2: '🌟' },
  { id: 'apple', label: '🍎 甜苹果', emoji1: '🍎', emoji2: '🍏' },
  { id: 'dino', label: '🦕 小恐龙', emoji1: '🦕', emoji2: '🦖' },
  { id: 'cookie', label: '🍪 小饼干', emoji1: '🍪', emoji2: '🧁' },
];

export function TenFrameMath() {
  const { t } = useTranslation();
  const practice = useStore((s) => s.practice);
  const [mode, setMode] = useState<'add' | 'sub'>('add');
  const [skinIdx, setSkinIdx] = useState(0);
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState<'initial' | 'action' | 'done'>('initial');

  const skin = SKINS[skinIdx]!;
  const addProb = ADD_PROBLEMS[idx % ADD_PROBLEMS.length]!;
  const subProb = SUB_PROBLEMS[idx % SUB_PROBLEMS.length]!;

  const handleMakeTen = useCallback(() => {
    sfxTap();
    triggerHaptic(30);
    setStep('action');
    speak(`从第二个数借走 ${addProb.makeTen} 个，凑成 10！剩下 ${addProb.remain} 个！`, { lang: 'zh-CN' }).catch(() => {});
  }, [addProb]);

  const handleBreakTen = useCallback(() => {
    sfxTap();
    triggerHaptic(30);
    setStep('action');
    speak(`从 10 格框拿走 ${subProb.sub} 个，剩 ${subProb.breakTen} 个！再加上多出来的 ${subProb.remain} 个！`, { lang: 'zh-CN' }).catch(() => {});
  }, [subProb]);

  const handleComplete = useCallback(() => {
    sfxCorrect();
    triggerHaptic(45);
    celebrateSmall();
    setStep('done');
    practice('math:tenframe', true);
    if (mode === 'add') {
      speak(`10 加上 ${addProb.remain}，等于 ${addProb.sum}！凑十法真聪明！`, { lang: 'zh-CN' }).catch(() => {});
    } else {
      speak(`10 减 ${subProb.sub} 得 ${subProb.breakTen}，再加上 ${subProb.remain}，等于 ${subProb.result}！破十法算对啦！`, { lang: 'zh-CN' }).catch(() => {});
    }
  }, [mode, addProb, subProb, practice]);

  const handleNext = useCallback(() => {
    sfxTap();
    triggerHaptic(25);
    setStep('initial');
    setIdx((i) => i + 1);
  }, []);

  const handleSwitchSkin = useCallback(() => {
    sfxTap();
    triggerHaptic(20);
    setSkinIdx((s) => (s + 1) % SKINS.length);
  }, []);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(20);
        setMode('add');
        setStep('initial');
      } else if (e.key === '2') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(20);
        setMode('sub');
        setStep('initial');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSwitchSkin();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (step === 'initial') {
          if (mode === 'add') handleMakeTen();
          else handleBreakTen();
        } else if (step === 'action') {
          handleComplete();
        } else if (step === 'done') {
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, step, handleMakeTen, handleBreakTen, handleComplete, handleNext, handleSwitchSkin]);

  return (
    <div className="card-candy space-y-4 p-5 text-center shadow-fluffy">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-amber-900 font-bold bg-amber-50/90 px-3 py-1 rounded-xl border border-amber-200">
          ⌨️ 键盘快捷操作：数字键 1/2 选模式 · S 换道具 · 空格/Enter 推进演示
        </span>
      </div>

      {/* 顶部模式与道具皮肤切换 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => { sfxTap(); triggerHaptic(20); setMode('add'); setStep('initial'); }}
            className={`rounded-2xl px-4 py-2.5 text-base font-black transition-all ${
              mode === 'add' ? 'bg-candy-orange-deep text-white shadow-sm scale-105' : 'bg-orange-100 text-orange-800'
            }`}
          >
            ✨ 凑十法 (加法进位)
          </button>
          <button
            onClick={() => { sfxTap(); triggerHaptic(20); setMode('sub'); setStep('initial'); }}
            className={`rounded-2xl px-4 py-2.5 text-base font-black transition-all ${
              mode === 'sub' ? 'bg-candy-purple-deep text-white shadow-sm scale-105' : 'bg-purple-100 text-purple-800'
            }`}
          >
            ✂️ 破十法 (退位减法)
          </button>
        </div>

        {/* 皮肤选择器 */}
        <button
          onClick={handleSwitchSkin}
          className="rounded-full bg-white px-3 py-2.5 text-base font-bold text-ink-soft border border-pink-200 shadow-xs hover:scale-105 active:scale-95"
        >
          道具: {skin.label}
        </button>
      </div>

      {mode === 'add' ? (
        <div className="space-y-4">
          <div className="text-3xl font-black text-ink tracking-wide">
            <span className="text-candy-orange-deep">{addProb.a}</span> + <span className="text-candy-blue-deep">{addProb.b}</span> = <span className="text-candy-green-deep">{step === 'done' ? addProb.sum : '?'}</span>
          </div>

          <p className="text-sm font-bold text-ink-soft leading-tight sm:text-base">
            {step === 'initial' && `第 1 步：观察十格阵，${addProb.a} 还差几个凑成 10 呢？`}
            {step === 'action' && `第 2 步：借来 ${addProb.makeTen} 个填满十格阵，还剩 ${addProb.remain} 个！`}
            {step === 'done' && `第 3 步：10 + ${addProb.remain} = ${addProb.sum}，太厉害啦！`}
          </p>

          {/* 十格阵 1 (主框 10 格) */}
          <div className="mx-auto grid max-w-sm grid-cols-5 gap-2 rounded-3xl border-4 border-amber-300 bg-amber-50/80 p-3 shadow-inner">
            {Array.from({ length: 10 }).map((_, i) => {
              const isFromA = i < addProb.a;
              const isFilledFromB = step !== 'initial' && i >= addProb.a && i < 10;
              const isLeftGroup = i < 5;
              return (
                <div
                  key={`frame1-${i}`}
                  className={`flex h-14 w-full items-center justify-center rounded-2xl text-2xl shadow-sm border ${
                    isLeftGroup ? 'bg-orange-50/80 border-orange-200' : 'bg-yellow-50/80 border-yellow-200'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {isFromA && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        {skin.emoji1}
                      </motion.span>
                    )}
                    {isFilledFromB && (
                      <motion.span initial={{ scale: 0, y: 15 }} animate={{ scale: 1, y: 0 }} className="text-candy-yellow-deep">
                        {skin.emoji2}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* 辅框 (剩余分散格) */}
          {step !== 'initial' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-sm rounded-2xl bg-blue-50/70 p-2.5 border border-blue-200 flex items-center justify-center gap-2"
            >
              <span className="text-xs font-bold text-blue-900">第二组剩余:</span>
              <div className="flex gap-1.5">
                {Array.from({ length: addProb.remain }).map((_, i) => (
                  <span key={`rem-${i}`} className="text-2xl animate-bounce">
                    {skin.emoji2}
                  </span>
                ))}
              </div>
              <span className="text-xs font-black text-blue-700">({addProb.remain} 个)</span>
            </motion.div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            {step === 'initial' && (
              <CandyButton tone="orange" size="md" onClick={handleMakeTen}>
                👉 {t('tenFrameMath.step1Add', { n: addProb.makeTen })}
              </CandyButton>
            )}

            {step === 'action' && (
              <CandyButton tone="green" size="md" onClick={handleComplete}>
                🌟 {t('tenFrameMath.step2Add', { n: addProb.remain })}
              </CandyButton>
            )}

            {step === 'done' && (
              <CandyButton tone="green" size="md" onClick={handleNext}>
                ✨ {t('tenFrameMath.nextAdd')}
              </CandyButton>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-3xl font-black text-ink tracking-wide">
            <span className="text-candy-purple-deep">{subProb.total}</span> - <span className="text-candy-pink-deep">{subProb.sub}</span> = <span className="text-candy-green-deep">{step === 'done' ? subProb.result : '?'}</span>
          </div>

          <p className="text-sm font-bold text-ink-soft leading-tight sm:text-base">
            {step === 'initial' && `第 1 步：把 ${subProb.total} 拆成 10 和 ${subProb.remain}，先算 10 - ${subProb.sub}`}
            {step === 'action' && `第 2 步：从 10 拿走 ${subProb.sub} 剩 ${subProb.breakTen}，再加上单出的 ${subProb.remain}`}
            {step === 'done' && `第 3 步：${subProb.breakTen} + ${subProb.remain} = ${subProb.result}，算对啦！`}
          </p>

          <div className="mx-auto grid max-w-sm grid-cols-5 gap-2 rounded-3xl border-4 border-purple-300 bg-purple-50/80 p-3 shadow-inner">
            {Array.from({ length: 10 }).map((_, i) => {
              const isSubbed = step !== 'initial' && i >= (10 - subProb.sub);
              return (
                <div key={`frameSub-${i}`} className="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-2xl shadow-sm border border-purple-200">
                  {!isSubbed ? skin.emoji1 : <span className="text-lg opacity-40">❌</span>}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center gap-3 pt-2">
            {step === 'initial' && (
              <CandyButton tone="purple" size="md" onClick={handleBreakTen}>
                👉 {t('tenFrameMath.step1Sub', { sub: subProb.sub, remain: subProb.breakTen })}
              </CandyButton>
            )}

            {step === 'action' && (
              <CandyButton tone="green" size="md" onClick={handleComplete}>
                🌟 {t('tenFrameMath.step2Sub', { n1: subProb.breakTen, n2: subProb.remain })}
              </CandyButton>
            )}

            {step === 'done' && (
              <CandyButton tone="green" size="md" onClick={handleNext}>
                ✨ {t('tenFrameMath.nextSub')}
              </CandyButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
