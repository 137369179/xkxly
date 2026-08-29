/**
 * 跳数计数 🔢
 * 2/5/10 跳数练习，乘除法前置能力
 * 荷叶跳跳蛙主题
 */
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useStore } from '@/store/useStore';

interface StepConfig {
  step: number;
  label: string;
  emoji: string;
  color: string;
  max: number;
}

const STEPS: StepConfig[] = [
  { step: 2, label: '2个2个数 (双数)', emoji: '✌️', color: 'bg-candy-green-soft text-candy-green-deep border-green-300', max: 20 },
  { step: 5, label: '5个5个数 (手掌数)', emoji: '🖐️', color: 'bg-candy-orange-soft text-candy-orange-deep border-orange-300', max: 50 },
  { step: 10, label: '10个10个数 (整十数)', emoji: '🔟', color: 'bg-candy-pink-soft text-candy-pink-deep border-pink-300', max: 100 },
];

export function SkipCounting() {
  const practice = useStore((s) => s.practice);
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn');
  const [step, setStep] = useState(2);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [quizStart, setQuizStart] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
  const lockRef = useRef(false);

  const cfg = STEPS.find((s) => s.step === step)!;

  // 生成当前跳数序列
  const sequence = Array.from({ length: Math.floor(cfg.max / step) + 1 }, (_, i) => i * step);

  const startQuiz = useCallback(() => {
    const start = Math.floor(Math.random() * (cfg.max / step - 1)) * step;
    setQuizStart(start);
    const correct = start + step;
    const wrongs = new Set<number>();
    while (wrongs.size < 3) {
      const w = correct + (Math.floor(Math.random() * 5) - 2) * step;
      if (w !== correct && w >= 0 && w <= cfg.max) wrongs.add(w);
    }
    setOptions(shuffle([correct, ...Array.from(wrongs)]));
    setFeedback('');
  }, [step, cfg.max]);

  const pickAnswer = (ans: number) => {
    if (lockRef.current) return;
    lockRef.current = true;
    sfxTap();
    const correct = quizStart + step;

    if (ans === correct) {
      sfxCorrect();
      celebrateSmall();
      setFeedback('🎉 答对啦！小青蛙成功跳到下一片荷叶！');
      setScore((s) => s + 1);
      practice('math:skip', true);
      speak(`答对了！${quizStart} 后面是 ${correct}`, {
        lang: 'zh-CN',
        rate: 0.85,
        module: 'praise',
      }).catch(() => {});
    } else {
      sfxWrong();
      setFeedback(`🤔 再想想哦，${quizStart} 每次跳 ${step} 个，后面是 ${correct}`);
      practice('math:skip', false);
      speak(`再想想，${quizStart} 后面该数几呢？`, {
        lang: 'zh-CN',
        rate: 0.85,
        module: 'praise',
      }).catch(() => {});
    }
    setTimeout(() => {
      startQuiz();
      setFeedback('');
      lockRef.current = false;
    }, 1500);
  };

  const jumpTo = (i: number) => {
    sfxTap();
    setCurrentIdx(i);
    const val = sequence[i]!;
    speak(String(val), { lang: 'zh-CN', rate: 0.85, module: 'ai' }).catch(() => {});
  };

  const jumpNext = () => {
    sfxTap();
    const nextIdx = (currentIdx + 1) % sequence.length;
    setCurrentIdx(nextIdx);
    const val = sequence[nextIdx]!;
    speak(String(val), { lang: 'zh-CN', rate: 0.85, module: 'ai' }).catch(() => {});
  };

  return (
    <div className="card-candy p-4 sm:p-6 shadow-fluffy">
      <h3 className="mb-2 text-center text-xl font-black text-ink">🐸 小青蛙跳数大冒险</h3>
      <p className="text-xs text-center font-bold text-ink-soft mb-4">
        找规律跳数：掌握 2/5/10 跳数规律，轻松打牢乘除法基础！
      </p>

      {/* 规则切换 */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {STEPS.map((s) => (
          <button
            key={s.step}
            onClick={() => {
              sfxTap();
              setStep(s.step);
              setCurrentIdx(0);
              setMode('learn');
            }}
            className={cn(
              'rounded-2xl px-4 py-2.5 text-base font-black transition-all',
              step === s.step
                ? 'bg-candy-green-deep text-white shadow-sm scale-105'
                : 'bg-white text-ink-soft border border-green-100 hover:bg-green-50'
            )}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex justify-center gap-2">
        <button
          onClick={() => {
            sfxTap();
            setMode('learn');
          }}
          className={`rounded-2xl px-5 py-2 text-sm font-black transition-all ${
            mode === 'learn'
              ? 'bg-candy-blue-deep text-white shadow-sm scale-105'
              : 'bg-white text-ink-soft shadow-sm'
          }`}
        >
          📖 荷叶跳数
        </button>
        <button
          onClick={() => {
            sfxTap();
            setMode('quiz');
            startQuiz();
          }}
          className={`rounded-2xl px-5 py-2 text-sm font-black transition-all ${
            mode === 'quiz'
              ? 'bg-candy-blue-deep text-white shadow-sm scale-105'
              : 'bg-white text-ink-soft shadow-sm'
          }`}
        >
          🎯 规律小挑战
        </button>
      </div>

      {mode === 'learn' && (
        <div className="text-center space-y-4">
          {/* 青蛙当前数字卡 */}
          <motion.div
            key={sequence[currentIdx]}
            initial={{ scale: 0.8, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            className="mx-auto flex h-36 w-36 flex-col items-center justify-center rounded-[2.5rem] bg-gradient-to-b from-green-300 to-emerald-400 text-candy-green-on shadow-candy-md border-4 border-white"
          >
            <span className="text-3xl">🐸</span>
            <span className="text-4xl font-black">{sequence[currentIdx]}</span>
          </motion.div>

          <CandyButton tone="green" size="lg" onClick={jumpNext}>
            🐸 往前跳一格（+{step}）➔
          </CandyButton>

          {/* 荷叶横向跳板轨道 */}
          <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-lg mx-auto p-3 rounded-3xl bg-green-50/80 border border-green-200">
            {sequence.map((num, i) => {
              const isCurrent = i === currentIdx;
              return (
                <motion.button
                  key={num}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => jumpTo(i)}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black border-2 transition-all ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-400 text-candy-green-on shadow-md scale-110'
                      : 'border-green-200 bg-white text-ink hover:bg-green-100'
                  }`}
                >
                  {num}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'quiz' && (
        <div className="text-center space-y-4">
          <p className="text-base font-black text-ink">
            看规律：从 <span className="text-emerald-700 underline font-black text-lg">{quizStart}</span> 开始，每次数{' '}
            <span className="text-emerald-700 underline font-black text-lg">{step}</span> 个，下一个数字是？
          </p>

          <div className="flex items-center justify-center gap-3">
            <span className="rounded-2xl bg-emerald-100 px-4 py-2 text-3xl font-black text-emerald-800 border-2 border-emerald-300 leading-tight sm:text-4xl">
              {quizStart}
            </span>
            <span className="text-3xl font-black text-emerald-600 leading-tight sm:text-4xl">➔ +{step} ➔</span>
            <span className="rounded-2xl bg-amber-100 px-4 py-2 text-3xl font-black text-amber-800 border-2 border-dashed border-amber-400 animate-pulse leading-tight sm:text-4xl">
              ❓
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            {options.map((ans, i) => (
              <CandyButton
                key={`opt-${i}-${ans}`}
                tone="green"
                size="lg"
                onClick={() => pickAnswer(ans)}
              >
                {ans}
              </CandyButton>
            ))}
          </div>

          <div className="text-xs font-black text-emerald-700">
            🏆 当前挑战得分: {score}
          </div>
        </div>
      )}

      <AnimatePresence>
        {!!feedback && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-center text-sm font-black text-emerald-800 bg-emerald-100 py-2 rounded-2xl border border-emerald-300 max-w-sm mx-auto"
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
