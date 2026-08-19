/**
 * 字母排序 🅰️ (LetterOrder)
 * 26字母 ABC 顺序排列与填空练习 · 彩虹小火车主题
 */
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { playLetterVoice, speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore } from '@/store/useStore';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type Mode = 'learn' | 'order' | 'fill';

export function LetterOrder() {
  const { t: tr } = useTranslation();
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);
  const [mode, setMode] = useState<Mode>('learn');
  const [current, setCurrent] = useState(0);
  const [letters, setLetters] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // learn: 逐个认识字母顺序
  const goLearn = (i: number) => {
    sfxTap();
    setCurrent(i);
    void playLetterVoice(ALPHABET[i]!).catch(() => {
      void speak(ALPHABET[i]!, { lang: 'en-US', rate: 0.6 }).catch(() => {});
    });
  };

  // order: 把打乱的5个字母排ABC顺序
  const startOrder = useCallback(() => {
    const start = Math.floor(Math.random() * 20);
    const seq = ALPHABET.slice(start, start + 5);
    setLetters(shuffle(seq));
    setAnswer([]);
    setFeedback('');
  }, []);

  // fill: 填缺字母
  const [fillQ, setFillQ] = useState<{ seq: string[]; missing: number }>({ seq: [], missing: -1 });
  const [fillOptions, setFillOptions] = useState<string[]>([]);
  const startFill = useCallback(() => {
    const start = Math.floor(Math.random() * 22);
    const seq = ALPHABET.slice(start, start + 4);
    const missing = Math.floor(Math.random() * 4);
    const correct = seq[missing]!;
    const wrongs = new Set<string>();
    while (wrongs.size < 3) {
      const w = ALPHABET[Math.floor(Math.random() * 26)]!;
      if (w !== correct) wrongs.add(w);
    }
    setFillQ({ seq: seq.map((c, i) => (i === missing ? '?' : c)), missing });
    setFillOptions(shuffle([correct, ...Array.from(wrongs)]));
    setFeedback('');
  }, []);

  const pickLetter = (letter: string) => {
    if (mode === 'order') {
      sfxTap();
      if (answer.includes(letter)) return;
      const newAns = [...answer, letter];
      setAnswer(newAns);
      void playLetterVoice(letter).catch(() => {
        void speak(letter, { lang: 'en-US', rate: 0.6 }).catch(() => {});
      });

      if (newAns.length === letters.length) {
        const correctSeq = [...letters].sort((a, b) => ALPHABET.indexOf(a) - ALPHABET.indexOf(b));
        const isCorrect = newAns.every((c, i) => c === correctSeq[i]!);
        if (isCorrect) {
          sfxCorrect();
          setFeedback(`🎉 ${tr('letterOrder.perfect')}`);
          setScore((s) => s + 1);
          addStars(1);
          practice('letter-order', true);
          void speak('Great job! ABC order is correct!', { lang: 'en-US', rate: 0.8, module: 'praise' }).catch(() => {});
        } else {
          sfxWrong();
          setFeedback(`❌ ${tr('letterOrder.correctSeq', { seq: correctSeq.join(' → ') })}`);
          practice('letter-order', false);
        }
        if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
        nextTimerRef.current = setTimeout(() => {
          startOrder();
          setFeedback('');
        }, 1600);
      }
    }
  };

  // 撤销选中的字母
  const undoLetter = (letter: string) => {
    sfxTap();
    setAnswer((ans) => ans.filter((x) => x !== letter));
    setFeedback('');
  };

  const pickFill = (letter: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    const sortedOpts = [...fillOptions].sort((a, b) => ALPHABET.indexOf(a) - ALPHABET.indexOf(b));
    const expected = sortedOpts.find((o) => {
      const testSeq = [...fillQ.seq];
      testSeq[fillQ.missing] = o;
      return testSeq.every((c, i) => i === 0 || ALPHABET.indexOf(c) > ALPHABET.indexOf(testSeq[i - 1]!));
    });

    if (letter === expected) {
      sfxCorrect();
      setFeedback(`🎉 ${tr('letterOrder.correct')}`);
      setScore((s) => s + 1);
      addStars(1);
      practice('letter-order', true);
      void playLetterVoice(letter).catch(() => {
        void speak(letter, { lang: 'en-US', rate: 0.7, module: 'praise' }).catch(() => {});
      });
    } else {
      sfxWrong();
      setFeedback(`❌ ${tr('letterOrder.wrongExp', { expected: expected ?? '' })}`);
      practice('letter-order', false);
    }
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    nextTimerRef.current = setTimeout(() => {
      startFill();
      setFeedback('');
      lockRef.current = false;
    }, 1300);
  };

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚂</span>
          <div>
            <h3 className="text-lg font-extrabold text-ink">{tr('letterOrder.title')}</h3>
            <p className="text-xs font-bold text-ink-soft">按 26 字母 ABC 顺序开动小火车</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-candy-yellow-soft px-3 py-1 text-xs font-black text-candy-orange-deep shadow-xs">
          <span>⭐ 积分: {score}</span>
        </div>
      </div>

      {/* 模式选择 */}
      <div className="flex justify-center gap-2 rounded-2xl bg-pink-50/80 p-1.5 border border-pink-100">
        <button
          onClick={() => {
            sfxTap();
            setMode('learn');
          }}
          className={cn(
            'flex-1 rounded-xl py-2 text-xs font-black transition active:scale-95',
            mode === 'learn' ? 'bg-candy-pink-deep text-white shadow-sm' : 'text-ink-soft hover:bg-white/60'
          )}
        >
          📖 {tr('letterOrder.learn')}
        </button>
        <button
          onClick={() => {
            sfxTap();
            setMode('order');
            startOrder();
          }}
          className={cn(
            'flex-1 rounded-xl py-2 text-xs font-black transition active:scale-95',
            mode === 'order' ? 'bg-candy-pink-deep text-white shadow-sm' : 'text-ink-soft hover:bg-white/60'
          )}
        >
          🚂 {tr('letterOrder.sort')}
        </button>
        <button
          onClick={() => {
            sfxTap();
            setMode('fill');
            startFill();
          }}
          className={cn(
            'flex-1 rounded-xl py-2 text-xs font-black transition active:scale-95',
            mode === 'fill' ? 'bg-candy-pink-deep text-white shadow-sm' : 'text-ink-soft hover:bg-white/60'
          )}
        >
          🎯 {tr('letterOrder.fill')}
        </button>
      </div>

      {mode === 'learn' && (
        <div className="text-center space-y-4 py-2">
          <motion.div
            key={current}
            initial={{ scale: 0.6, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="mx-auto flex h-32 w-32 items-center justify-center rounded-[2.2rem] border-4 border-white bg-gradient-to-br from-candy-pink-soft to-pink-200 text-6xl font-black leading-tight text-candy-pink-deep shadow-pop cursor-pointer active:scale-95 transition sm:h-36 sm:w-36 sm:text-7xl"
            onClick={() => goLearn(current)}
          >
            {ALPHABET[current]}
          </motion.div>

          <p className="text-sm font-bold text-ink-soft">
            {tr('letterOrder.progress', { current: current + 1 })} / 26 · 点击大字母听纯正发音 🔊
          </p>

          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9 md:grid-cols-13">
            {ALPHABET.map((l, i) => (
              <button
                key={`l-${i}`}
                onClick={() => goLearn(i)}
                className={cn(
                  'rounded-xl py-2 text-sm font-black transition-all active:scale-95',
                  current === i
                    ? 'bg-candy-pink-deep text-white shadow-md scale-105 ring-2 ring-pink-300'
                    : 'bg-white text-ink border border-pink-100 hover:bg-pink-50'
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'order' && (
        <div className="text-center space-y-4 py-2">
          <p className="text-sm font-extrabold text-ink">{tr('letterOrder.instruction')}</p>

          {/* 小火车轨道与车厢槽位 */}
          <div className="relative rounded-2xl bg-gradient-to-r from-amber-100/60 to-orange-100/60 p-4 border border-amber-200/80">
            <div className="flex justify-center items-center gap-2 flex-wrap">
              <span className="text-3xl">🚂</span>
              {letters.map((_, i) => {
                const filledLetter = answer[i];
                return (
                  <motion.div
                    key={`slot-${i}`}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => filledLetter && undoLetter(filledLetter)}
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black leading-tight shadow-fluffy transition-all cursor-pointer sm:text-3xl',
                      filledLetter
                        ? 'bg-gradient-to-b from-candy-green-soft to-green-100 text-candy-green-deep border-2 border-green-300'
                        : 'border-2 border-dashed border-pink-200 bg-white/70 text-ink-soft/40'
                    )}
                  >
                    {filledLetter ?? (i + 1)}
                  </motion.div>
                );
              })}
            </div>
            {answer.length > 0 && (
              <p className="text-[11px] font-bold text-amber-800/80 mt-2">💡 提示：点击已上车的字母可撤回</p>
            )}
          </div>

          {/* 候选卡片 */}
          <div className="flex justify-center gap-2 flex-wrap pt-1">
            {letters
              .filter((l) => !answer.includes(l))
              .map((l) => (
                <motion.button
                  key={l}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => pickLetter(l)}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-pink-200 bg-white text-2xl font-black leading-tight text-candy-pink-deep shadow-pop transition-all hover:bg-pink-50 sm:text-3xl"
                >
                  {l}
                </motion.button>
              ))}
          </div>

          {answer.length === letters.length && (
            <div className="pt-2">
              <CandyButton tone="blue" size="md" onClick={startOrder}>
                🔄 {tr('letterOrder.again')}
              </CandyButton>
            </div>
          )}
        </div>
      )}

      {mode === 'fill' && (
        <div className="text-center space-y-4 py-2">
          <p className="text-sm font-extrabold text-ink">{tr('letterOrder.missingLetter')}</p>

          <div className="flex justify-center gap-2">
            {fillQ.seq.map((c, i) => (
              <motion.span
                key={`c-${i}`}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-black leading-tight shadow-fluffy transition-all sm:h-20 sm:w-20 sm:text-5xl',
                  c === '?'
                    ? 'border-3 border-candy-pink-deep bg-candy-pink-soft text-candy-pink-deep animate-pulse'
                    : 'border-2 border-white bg-white text-ink'
                )}
              >
                {c}
              </motion.span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-2">
            {fillOptions.map((o) => (
              <CandyButton key={o} tone="pink" size="lg" onClick={() => pickFill(o)}>
                {o}
              </CandyButton>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {!!feedback && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-white/90 p-2.5 text-center text-sm font-black text-ink shadow-xs"
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}
