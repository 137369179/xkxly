/**
 * 分数概念 🍕 (Q1)
 * 简单分数认知：1/2, 1/3, 1/4 — 分披萨/蛋糕
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const FRACTIONS = [
  { frac: '1/2', num: 1, den: 2, emoji: '🍕', label: '二分之一', slices: 2 },
  { frac: '1/3', num: 1, den: 3, emoji: '🍰', label: '三分之一', slices: 3 },
  { frac: '1/4', num: 1, den: 4, emoji: '🎂', label: '四分之一', slices: 4 },
  { frac: '1/6', num: 1, den: 6, emoji: '🥧', label: '六分之一', slices: 6 },
];

export function FractionLearn() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'learn'|'quiz'>('learn');
  const [current, setCurrent] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<FractionOption[]>([]);
  const lockRef = useRef(false);

  interface FractionOption { label: string; correct: boolean; }

  const startQuiz = () => {
    const f = FRACTIONS[Math.floor(Math.random()*FRACTIONS.length)]!
    const opts: FractionOption[] = [
      { label: f.frac, correct: true },
      { label: FRACTIONS[(FRACTIONS.indexOf(f)+1)%4]!.frac, correct: false },
      { label: FRACTIONS[(FRACTIONS.indexOf(f)+2)%4]!.frac, correct: false },
      { label: FRACTIONS[(FRACTIONS.indexOf(f)+3)%4]!.frac, correct: false },
    ];
    setOptions(shuffle(opts));
    setCurrent(FRACTIONS.indexOf(f));
    setFeedback('');
  };

  const pick = (opt: FractionOption) => {
    if (lockRef.current) return;
    lockRef.current = true;
    if (opt.correct) {
      sfxCorrect(); setScore(s=>s+1); setFeedback(t('fractionLearn.correct'));
      void speak(`对了！${FRACTIONS[current]!.label}`, { lang:'zh-CN', rate:0.85, module:'praise' });
    } else {
      sfxWrong(); setFeedback(t('fractionLearn.wrong', { answer: FRACTIONS[current]!.frac }));
      void speak(`再想想`, { lang:'zh-CN', rate:0.85, module:'praise' });
    }
    setTimeout(() => { startQuiz(); setFeedback(''); lockRef.current = false; }, 1200);
  };

  const f = FRACTIONS[current]!

  // 可视化：圆形被分成 den 份，高亮 1 份
  const Slice = ({ idx, total, highlight }: { idx: number; total: number; highlight: boolean }) => {
    const angle = 360 / total;
    const rotation = idx * angle;
    return (
      <div className="absolute inset-0" style={{
        clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((-90 + rotation) * Math.PI / 180)}% ${50 + 50 * Math.sin((-90 + rotation) * Math.PI / 180)}%, ${50 + 50 * Math.cos((-90 + rotation + angle) * Math.PI / 180)}% ${50 + 50 * Math.sin((-90 + rotation + angle) * Math.PI / 180)}%)`,
        background: highlight ? '#F97316' : '#FED7AA',
        transition: 'background 0.3s',
      }} />
    );
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('fractionLearn.title')}</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button onClick={()=>setMode('learn')} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='learn'?'bg-candy-orange-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>📖 认识分数</button>
        <button aria-label={t("fractionLearn.quiz")} onClick={()=>{setMode('quiz');startQuiz();}} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='quiz'?'bg-candy-orange-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>🎯 测验</button>
      </div>

      <div className="mb-4 flex justify-center gap-2">
        {FRACTIONS.map((fr, i) => (
          <button key={fr.frac} onClick={()=>{setCurrent(i);setMode('learn');speak(fr.label,{lang:'zh-CN',rate:0.8,module:'ai'});}}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-extrabold', current===i&&mode==='learn'?'bg-candy-orange-deep text-white':'bg-white text-ink-soft shadow-sm')}>
            {fr.emoji} {fr.frac}
          </button>
        ))}
      </div>

      {mode === 'learn' && (
        <div className="text-center">
          <div className="mx-auto mb-4 relative h-40 w-40 rounded-full overflow-hidden shadow-lg ring-4 ring-candy-orange-soft">
            {Array.from({ length: f.slices }, (_, i) => (
              <Slice key={`slice-${i}`} idx={i} total={f.slices} highlight={i === 0} />
            ))}
            <div className="absolute inset-0 flex items-center justify-center text-3xl">{f.emoji}</div>
          </div>
          <p className="text-2xl font-extrabold text-candy-orange-deep">{f.frac}</p>
          <p className="text-sm font-bold text-ink-soft">{f.label}</p>
          <p className="mt-2 text-xs text-ink-muted">{t('fractionLearn.explain', { f: f.emoji, slices: f.slices })} {f.frac}</p>
        </div>
      )}

      {mode === 'quiz' && (
        <div className="text-center">
          <p className="mb-3 text-sm font-bold text-ink">{t('fractionLearn.question')}</p>
          <div className="mx-auto mb-4 relative h-32 w-32 rounded-full overflow-hidden shadow-lg ring-4 ring-candy-orange-soft">
            {Array.from({ length: f.slices }, (_, i) => (
              <Slice key={`slice-${i}`} idx={i} total={f.slices} highlight={i === 0} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {options.map((o, i) => (
              <CandyButton key={`o-${i}`} tone="orange" size="lg" onClick={()=>pick(o)}>{o.label}</CandyButton>
            ))}
          </div>
          <div className="mt-3 text-xs font-bold text-ink-soft">{t('fractionLearn.score', { n: score })}</div>
        </div>
      )}

      <AnimatePresence>{!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}</AnimatePresence>
    </div>
  );
}
