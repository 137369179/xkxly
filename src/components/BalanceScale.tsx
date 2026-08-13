/**
 * 重量平衡 ⚖️ (S2)
 * 简单等式天平 — 左右放砝码，判断是否平衡
 */
import { memo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';
const WEIGHTS = [1, 2, 3, 5, 10];

interface Problem { left: number[]; right: number[]; }

function genProblem(level: number): Problem {
  const target = Math.floor(Math.random() * 10) + 5 + level * 3;
  // 随机拆分
  const splitCount = Math.min(2 + Math.floor(level / 2), 3);
  const left: number[] = [];
  let remaining = target;
  for (let i = 0; i < splitCount - 1; i++) {
    const w = Math.min(Math.floor(Math.random() * remaining / 2) + 1, 10);
    left.push(w);
    remaining -= w;
  }
  left.push(remaining);

  // 右边随机生成，有时对有时错
  const correct = Math.random() > 0.35;
  const right: number[] = [];
  if (correct) {
    let r = target;
    while (r > 0) {
      const w = Math.min(WEIGHTS[Math.floor(Math.random() * WEIGHTS.length)]!, r);
      right.push(w);
      r -= w;
    }
  } else {
    const diff = Math.floor(Math.random() * 4) + 1;
    const newTarget = target + (Math.random() > 0.5 ? diff : -diff);
    let r = Math.max(1, newTarget);
    while (r > 0) {
      const w = Math.min(WEIGHTS[Math.floor(Math.random() * WEIGHTS.length)]!, r);
      right.push(w);
      r -= w;
    }
  }
  return { left, right };
}

function _BalanceScale() {
  const { t } = useTranslation();
  const [level, setLevel] = useState(1);
  const [problem, setProblem] = useState<Problem>(() => genProblem(1));
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [tilt, setTilt] = useState(0);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const leftSum = problem.left.reduce((a, b) => a + b, 0);
  const rightSum = problem.right.reduce((a, b) => a + b, 0);

  const answer = (balanced: boolean) => {
    if (lockRef.current) return;
    lockRef.current = true;
    sfxTap();
    const isBalanced = leftSum === rightSum;
    if (balanced === isBalanced) {
      sfxCorrect(); setScore(s => s + 1); setFeedback('✅ 对了！');
      void speak('对了！', { lang: 'zh-CN', rate: 0.85, module: 'praise' });
      setTilt(0);
    } else {
      sfxWrong(); setFeedback(t('balanceScale.wrongFeedback', { left: leftSum, right: rightSum, state: isBalanced ? t('balanceScale.balanced') : t('balanceScale.unbalanced') }));
      void speak('再想想', { lang: 'zh-CN', rate: 0.85, module: 'praise' });
      setTilt(leftSum > rightSum ? -8 : 8);
    }
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (score + 1 >= level * 3) setLevel(l => l + 1);
      setProblem(genProblem(level));
      setTilt(0);
      setFeedback('');
      lockRef.current = false;
    }, 1800);
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('balanceScale.title')}</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">{t('balanceScale.subtitle')}</p>

      <div className="mb-4 flex justify-center" style={{ perspective: '400px' }}>
        <motion.div animate={{ rotate: tilt }} transition={{ type: 'spring' }} className="relative" style={{ width: '240px', height: '140px' }}>
          {/* 天平横杆 */}
          <div className="absolute left-1/2 top-8 h-2 w-full -translate-x-1/2 rounded-full bg-gradient-to-r from-candy-blue-deep to-candy-purple-deep" />
          {/* 左盘 */}
          <div className="absolute left-0 top-10 flex flex-col items-center">
            <div className="flex flex-wrap justify-center gap-1 rounded-b-2xl bg-candy-blue-soft/40 px-3 py-2 min-w-[80px] min-h-[50px]">
              {problem.left.map((w, i) => (
                <span key={`w-${i}`} className="rounded-md bg-candy-blue-deep px-1.5 py-0.5 text-xs font-extrabold text-white">{w}</span>
              ))}
            </div>
            <div className="text-xs font-bold text-ink-soft">左={leftSum}</div>
          </div>
          {/* 右盘 */}
          <div className="absolute right-0 top-10 flex flex-col items-center">
            <div className="flex flex-wrap justify-center gap-1 rounded-b-2xl bg-candy-pink-soft/40 px-3 py-2 min-w-[80px] min-h-[50px]">
              {problem.right.map((w, i) => (
                <span key={`w-${i}`} className="rounded-md bg-candy-pink-deep px-1.5 py-0.5 text-xs font-extrabold text-white">{w}</span>
              ))}
            </div>
            <div className="text-xs font-bold text-ink-soft">右={rightSum}</div>
          </div>
          {/* 支柱 */}
          <div className="absolute left-1/2 top-10 h-24 w-3 -translate-x-1/2 rounded-b-lg bg-amber-600" />
          <div className="absolute left-1/2 bottom-0 w-20 -translate-x-1/2 rounded-lg bg-amber-700 h-2" />
        </motion.div>
      </div>

      <div className="flex justify-center gap-4">
        <CandyButton tone="green" size="lg" onClick={()=>answer(true)}>{t('balanceScale.balanced')}</CandyButton>
        <CandyButton tone="pink" size="lg" onClick={()=>answer(false)}>{t('balanceScale.unbalanced')}</CandyButton>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-bold text-ink-soft">{t('balanceScale.progress', { level, score })}</span>
      </div>

      <AnimatePresence>
        {!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-2 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}
      </AnimatePresence>
    </div>
  );
}

export const BalanceScale = memo(_BalanceScale);
