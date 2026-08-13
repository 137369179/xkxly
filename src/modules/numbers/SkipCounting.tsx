/**
 * 跳数计数 🔢 (O6)
 * 2/5/10 跳数练习，乘除法前置能力
 */
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const STEPS = [
  { step: 1, labelKey: 'skipCounting.step1', emoji: '1️⃣', color: 'bg-candy-blue-soft', max: 20 },
  { step: 2, labelKey: 'skipCounting.step2', emoji: '2️⃣', color: 'bg-candy-green-soft', max: 20 },
  { step: 5, labelKey: 'skipCounting.step5', emoji: '5️⃣', color: 'bg-candy-orange-soft', max: 50 },
  { step: 10, labelKey: 'skipCounting.step10', emoji: '🔟', color: 'bg-candy-pink-soft', max: 100 },
];

export function SkipCounting() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn');
  const [step, setStep] = useState(1);
  const [current, setCurrent] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [quizStart, setQuizStart] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
  const lockRef = useRef(false);

  const cfg = STEPS.find(s => s.step === step)!;

  const nextInSeq = (n: number) => n + step;

  const startQuiz = useCallback(() => {
    const start = Math.floor(Math.random() * (cfg.max / step)) * step;
    setQuizStart(start);
    const correct = start + step;
    const wrongs = new Set<number>();
    while (wrongs.size < 3) {
      const w = correct + (Math.floor(Math.random() * 5) - 2) * step;
      if (w !== correct && w >= 0 && w <= cfg.max) wrongs.add(w);
    }
    setOptions(shuffle([correct, ...wrongs]));
    setFeedback('');
  }, [step, cfg.max]);

  const pickAnswer = (ans: number) => {
    if (lockRef.current) return;
    lockRef.current = true;
    const correct = quizStart + step;
    if (ans === correct) {
      sfxCorrect();
      setFeedback(t('skipCounting.correct'));
      setScore(s => s + 1);
      void speak(`对了！${quizStart}后面是${correct}`, { lang: 'zh-CN', rate: 0.85, module: 'praise' });
    } else {
      sfxWrong();
      setFeedback(t('skipCounting.wrong', { answer: correct }));
      void speak(`再想想，${quizStart}后面该数几呢？`, { lang: 'zh-CN', rate: 0.85, module: 'praise' });
    }
    setTimeout(() => { startQuiz(); setFeedback(''); lockRef.current = false; }, 1200);
  };

  // 学习模式：点击数下一个
  const countNext = () => {
    const n = nextInSeq(current);
    if (n > cfg.max) { setCurrent(0); return; }
    setCurrent(n);
    void speak(String(n), { lang: 'zh-CN', rate: 0.8, module: 'ai' });
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('skipCounting.title')}数</h3>
      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {STEPS.map(s => (
          <button key={s.step} onClick={() => { setStep(s.step); setCurrent(0); setMode('learn'); }}
            className={cn('rounded-xl px-3 py-1.5 text-xs font-extrabold',
              step === s.step ? 'bg-candy-purple-deep text-white' : 'bg-white text-ink-soft shadow-sm'
            )}>
            {s.emoji} {t(s.labelKey)}
          </button>
        ))}
      </div>
      <div className="mb-4 flex justify-center gap-2">
        <button onClick={()=>setMode('learn')} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='learn'?'bg-candy-blue-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>📖 数一数</button>
        <button aria-label="🎯 测验" onClick={()=>{setMode('quiz');startQuiz();}} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='quiz'?'bg-candy-blue-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>🎯 测验</button>
      </div>

      {mode === 'learn' && (
        <div className="text-center">
          <motion.div key={current} initial={{scale:0.5}} animate={{scale:1}} className={cn('mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-[2rem] text-5xl font-extrabold shadow-lg', cfg.color)}>
            {current}
          </motion.div>
          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {Array.from({ length: Math.min(10, Math.floor(cfg.max / step)) }, (_, i) => {
              const val = i * step;
              return (
                <button key={`num-${i}`} onClick={()=>{setCurrent(val);speak(String(val),{lang:'zh-CN',rate:0.8,module:'ai'});}}
                  className={cn('rounded-lg px-3 py-2 text-lg font-extrabold shadow-sm transition-all hover:scale-105',
                    current===val ? 'bg-candy-purple-deep text-white' : 'bg-white text-ink-soft'
                  )}>
                  {val}
                </button>
              );
            })}
          </div>
          <CandyButton tone="purple" size="lg" onClick={countNext}>
            {t('skipCounting.next', { next: current + step > cfg.max ? t('skipCounting.restart') : current + step })}
          </CandyButton>
        </div>
      )}

      {mode === 'quiz' && (
        <div className="text-center">
          <p className="mb-2 text-sm font-bold text-ink-soft">{cfg.emoji} {t(cfg.labelKey)}</p>
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="rounded-xl bg-white px-4 py-2 text-2xl font-extrabold shadow-sm">{quizStart}</span>
            <span className="text-2xl">→</span>
            <span className="rounded-xl bg-candy-purple-soft px-4 py-2 text-2xl font-extrabold text-candy-purple-deep shadow-sm">?</span>
          </div>
          <p className="mb-4 text-sm font-bold text-ink">{t('skipCounting.question')}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {options.map(o => (
              <CandyButton key={o} tone="blue" size="lg" onClick={()=>pickAnswer(o)}>{o}</CandyButton>
            ))}
          </div>
          <div className="mt-4 text-xs font-bold text-ink-soft">{t('skipCounting.score', { n: score })}</div>
        </div>
      )}

      <AnimatePresence>
        {!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
