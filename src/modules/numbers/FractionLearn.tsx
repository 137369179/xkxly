import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxCorrect, sfxWrong, sfxTap } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useStore } from '@/store/useStore';

interface FractionItem {
  frac: string;
  num: number;
  den: number;
  emoji: string;
  label: string;
  slices: number;
}

const FRACTIONS: FractionItem[] = [
  { frac: '1/2', num: 1, den: 2, emoji: '🍕', label: '二分之一', slices: 2 },
  { frac: '1/3', num: 1, den: 3, emoji: '🍰', label: '三分之一', slices: 3 },
  { frac: '1/4', num: 1, den: 4, emoji: '🎂', label: '四分之一', slices: 4 },
  { frac: '2/4', num: 2, den: 4, emoji: '🍕', label: '四分之二', slices: 4 },
  { frac: '3/4', num: 3, den: 4, emoji: '🎂', label: '四分之三', slices: 4 },
  { frac: '1/6', num: 1, den: 6, emoji: '🥧', label: '六分之一', slices: 6 },
];

interface FractionOption {
  label: string;
  correct: boolean;
}

export function FractionLearn() {
  const practice = useStore((s) => s.practice);
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn');
  const [current, setCurrent] = useState(0);
  const [eatenSlices, setEatenSlices] = useState<number[]>([]);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<FractionOption[]>([]);
  const lockRef = useRef(false);

  const f = FRACTIONS[current]!;

  const toggleSlice = (idx: number) => {
    sfxTap();
    const next = eatenSlices.includes(idx)
      ? eatenSlices.filter((i) => i !== idx)
      : [...eatenSlices, idx];
    setEatenSlices(next);
    const count = next.length;
    if (count > 0) {
      speak(`一共分成 ${f.slices} 块，点亮了 ${count} 块，是 ${count}/${f.slices} 哦！`, {
        lang: 'zh-CN',
        rate: 0.85,
      }).catch(() => {});
    }
  };

  const startQuiz = () => {
    const target = FRACTIONS[Math.floor(Math.random() * FRACTIONS.length)]!;
    const others = FRACTIONS.filter((item) => item.frac !== target.frac);
    const shuffledOthers = shuffle(others).slice(0, 3);
    const opts: FractionOption[] = [
      { label: target.frac, correct: true },
      ...shuffledOthers.map((o) => ({ label: o.frac, correct: false })),
    ];
    setOptions(shuffle(opts));
    setCurrent(FRACTIONS.indexOf(target));
    setEatenSlices([0]);
    setFeedback('');
  };

  const pick = (opt: FractionOption) => {
    if (lockRef.current) return;
    lockRef.current = true;
    sfxTap();

    if (opt.correct) {
      sfxCorrect();
      celebrateSmall();
      setScore((s) => s + 1);
      setFeedback('🎉 太棒啦，回答正确！');
      practice('math:fraction', true);
      speak(`答对了！这是 ${FRACTIONS[current]!.label}`, {
        lang: 'zh-CN',
        rate: 0.85,
        module: 'praise',
      }).catch(() => {});
    } else {
      sfxWrong();
      setFeedback(`🤔 再想想哦，正确答案是 ${FRACTIONS[current]!.frac}`);
      practice('math:fraction', false);
      speak('再想想哦', { lang: 'zh-CN', rate: 0.85, module: 'praise' }).catch(() => {});
    }
    setTimeout(() => {
      startQuiz();
      setFeedback('');
      lockRef.current = false;
    }, 1500);
  };

  // 可视化切片
  const Slice = ({
    idx,
    total,
    highlight,
    interactive,
  }: {
    idx: number;
    total: number;
    highlight: boolean;
    interactive?: boolean;
  }) => {
    const angle = 360 / total;
    const rotation = idx * angle;
    return (
      <button
        onClick={() => interactive && toggleSlice(idx)}
        type="button"
        className="absolute inset-0 transition-transform active:scale-95"
        style={{
          clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos(((-90 + rotation) * Math.PI) / 180)}% ${
            50 + 50 * Math.sin(((-90 + rotation) * Math.PI) / 180)
          }%, ${50 + 50 * Math.cos(((-90 + rotation + angle) * Math.PI) / 180)}% ${
            50 + 50 * Math.sin(((-90 + rotation + angle) * Math.PI) / 180)
          }%)`,
          background: highlight
            ? 'linear-gradient(135deg, #ff9f5a 0%, #c2410c 100%)'
            : 'linear-gradient(135deg, #ffd0b0 0%, #fff3ec 100%)',
          cursor: interactive ? 'pointer' : 'default',
        }}
      />
    );
  };

  return (
    <div className="card-candy p-4 sm:p-6 shadow-fluffy">
      <h3 className="mb-2 text-center text-xl font-black text-ink">🍕 趣味披萨分数认知</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button
          onClick={() => {
            setMode('learn');
            setEatenSlices([0]);
          }}
          className={`rounded-2xl px-5 py-2 text-sm font-black transition-all ${
            mode === 'learn'
              ? 'bg-candy-orange-deep text-white shadow-sm scale-105'
              : 'bg-white text-ink-soft shadow-sm'
          }`}
        >
          📖 动手分披萨
        </button>
        <button
          onClick={() => {
            setMode('quiz');
            startQuiz();
          }}
          className={`rounded-2xl px-5 py-2 text-sm font-black transition-all ${
            mode === 'quiz'
              ? 'bg-candy-orange-deep text-white shadow-sm scale-105'
              : 'bg-white text-ink-soft shadow-sm'
          }`}
        >
          🎯 趣味小挑战
        </button>
      </div>

      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {FRACTIONS.map((fr, i) => (
          <button
            key={fr.frac}
            onClick={() => {
              setCurrent(i);
              setMode('learn');
              setEatenSlices([0]);
              speak(`这是 ${fr.label}，写做 ${fr.frac}`, {
                lang: 'zh-CN',
                rate: 0.85,
                module: 'ai',
              }).catch(() => {});
            }}
            className={cn(
              'rounded-xl px-3 py-2.5 text-base font-black border transition-all',
              current === i && mode === 'learn'
                ? 'bg-candy-orange-deep text-white border-orange-600 shadow-sm scale-105'
                : 'bg-white text-ink-soft border-orange-200 hover:bg-orange-50'
            )}
          >
            {fr.emoji} {fr.frac}
          </button>
        ))}
      </div>

      {mode === 'learn' && (
        <div className="text-center space-y-3">
          <p className="text-xs font-bold text-ink-soft">
            👇 点击披萨切片，动手点亮不同的份数：
          </p>
          <div className="mx-auto relative h-48 w-48 rounded-full overflow-hidden shadow-candy-md ring-8 ring-amber-100 border-4 border-amber-300">
            {Array.from({ length: f.slices }, (_, i) => (
              <Slice
                key={`slice-${i}`}
                idx={i}
                total={f.slices}
                highlight={eatenSlices.includes(i)}
                interactive
              />
            ))}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl opacity-80">
              {f.emoji}
            </div>
          </div>

          <div className="rounded-2xl bg-amber-50/80 p-3 max-w-sm mx-auto border border-amber-200">
            <p className="text-5xl font-black text-candy-orange-deep leading-tight sm:text-6xl">
              {eatenSlices.length}/{f.slices}
            </p>
            <p className="text-sm font-bold text-ink-soft mt-1">
              分成了 {f.slices} 份，选中了 {eatenSlices.length} 份
            </p>
          </div>
        </div>
      )}

      {mode === 'quiz' && (
        <div className="text-center space-y-4">
          <p className="text-base font-black text-ink">
            看一看，高亮橙色的切片占整个披萨的几分之几？
          </p>
          <div className="mx-auto relative h-40 w-40 rounded-full overflow-hidden shadow-candy-md ring-6 ring-amber-100 border-4 border-amber-300">
            {Array.from({ length: f.slices }, (_, i) => (
              <Slice
                key={`quiz-slice-${i}`}
                idx={i}
                total={f.slices}
                highlight={i < f.num}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            {options.map((o, i) => (
              <CandyButton
                key={`o-${i}`}
                tone="orange"
                size="lg"
                onClick={() => pick(o)}
              >
                {o.label}
              </CandyButton>
            ))}
          </div>

          <div className="text-xs font-black text-candy-orange-deep">
            🏆 当前得分: {score}
          </div>
        </div>
      )}

      <AnimatePresence>
        {!!feedback && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-center text-sm font-black text-candy-orange-deep bg-orange-100/90 py-2 rounded-2xl border border-orange-300 max-w-sm mx-auto"
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
