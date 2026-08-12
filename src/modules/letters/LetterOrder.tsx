/**
 * 字母排序 🅰️ (O7)
 * 26字母 ABC 顺序排列练习
 */
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type Mode = 'learn' | 'order' | 'fill';

export function LetterOrder() {
  const { t: tr } = useTranslation();
  const [mode, setMode] = useState<Mode>('learn');
  const [current, setCurrent] = useState(0);
  const [letters, setLetters] = useState<string[]>([]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);

  // learn: 逐个认识字母顺序
  const goLearn = (i: number) => {
    setCurrent(i);
    speak(ALPHABET[i]!, { lang: 'en-US', rate: 0.7, module: 'ai' });
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
    const correct = seq[missing]!!
    const wrongs = new Set<string>();
    while (wrongs.size < 3) {
      const w = ALPHABET[Math.floor(Math.random() * 26)]!
      if (w !== correct) wrongs.add(w);
    }
    setFillQ({ seq: seq.map((c, i) => i === missing ? '?' : c), missing });
    setFillOptions(shuffle([correct, ...wrongs]));
    setFeedback('');
  }, []);

  const pickLetter = (letter: string) => {
    if (mode === 'order') {
      sfxTap();
      if (answer.includes(letter)) return;
      const newAns = [...answer, letter];
      setAnswer(newAns);
      void speak(letter, { lang: 'en-US', rate: 0.7, module: 'ai' });
      if (newAns.length === letters.length) {
        const correctSeq = [...letters].sort((a, b) => ALPHABET.indexOf(a) - ALPHABET.indexOf(b));
        const isCorrect = newAns.every((c, i) => c === correctSeq[i]!);
        if (isCorrect) {
          sfxCorrect(); setFeedback(tr('letterOrder.perfect')); setScore(s => s + 1);
          void speak('Great job! ABC order is correct!', { lang: 'en-US', rate: 0.8, module: 'praise' });
        } else {
          sfxWrong(); setFeedback(`❌ ${tr('letterOrder.correctSeq', { seq: correctSeq.join(' → ') })}`);
        }
        setTimeout(() => { startOrder(); setFeedback(''); }, 1500);
      }
    }
  };

  const pickFill = (letter: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    const sortedOpts = [...fillOptions].sort((a, b) => ALPHABET.indexOf(a) - ALPHABET.indexOf(b));
    const expected = sortedOpts.find(o => {
      const testSeq = [...fillQ.seq];
      testSeq[fillQ.missing] = o;
      return testSeq.every((c, i) => i === 0 || ALPHABET.indexOf(c) > ALPHABET.indexOf(testSeq[i - 1]!));
    });

    if (letter === expected) {
      sfxCorrect(); setFeedback(tr('letterOrder.correct')); setScore(s => s + 1);
      void speak(letter, { lang: 'en-US', rate: 0.7, module: 'praise' });
    } else {
      sfxWrong(); setFeedback(`❌ ${tr('letterOrder.wrongExp', { expected: expected ?? '' })}`);
    }
    setTimeout(() => { startFill(); setFeedback(''); lockRef.current = false; }, 1200);
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">🅰️ {tr('letterOrder.title')}</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button onClick={()=>setMode('learn')} className={`rounded-xl px-3 py-1.5 text-xs font-extrabold ${mode==='learn'?'bg-candy-pink-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{tr('letterOrder.learn')}</button>
        <button onClick={()=>{setMode('order');startOrder();}} className={`rounded-xl px-3 py-1.5 text-xs font-extrabold ${mode==='order'?'bg-candy-pink-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{tr('letterOrder.sort')}</button>
        <button onClick={()=>{setMode('fill');startFill();}} className={`rounded-xl px-3 py-1.5 text-xs font-extrabold ${mode==='fill'?'bg-candy-pink-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{tr('letterOrder.fill')}</button>
      </div>

      {mode === 'learn' && (
        <div className="text-center">
          <motion.div key={current} initial={{scale:0.5}} animate={{scale:1}} className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-candy-pink-soft text-6xl font-extrabold text-candy-pink-deep shadow-lg">
            {ALPHABET[current]}
          </motion.div>
          <p className="mb-3 text-sm font-bold text-ink-soft">{tr('letterOrder.progress', { current: current + 1 })}</p>
          <div className="grid grid-cols-7 gap-1 sm:grid-cols-9">
            {ALPHABET.map((l, i) => (
              <button key={`l-${i}`} onClick={()=>goLearn(i)}
                className={cn('rounded-lg py-2 text-sm font-extrabold shadow-sm transition-all hover:scale-105',
                  current===i ? 'bg-candy-pink-deep text-white' : 'bg-white text-ink-soft'
                )}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'order' && (
        <div className="text-center">
          <p className="mb-3 text-sm font-bold text-ink">{tr('letterOrder.instruction')}</p>
          <div className="mb-4 flex justify-center gap-2">
            {answer.map((l, i) => (
              <motion.span key={`${l}-${i}`} initial={{scale:0}} animate={{scale:1}}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-candy-green-soft text-2xl font-extrabold text-candy-green-deep shadow-sm">
                {l}
              </motion.span>
            ))}
            {answer.length < letters.length && <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-ink-muted/30 text-2xl">?</span>}
          </div>
          <div className="flex justify-center gap-2">
            {letters.filter(l => !answer.includes(l)).map(l => (
              <button key={l} onClick={()=>pickLetter(l)}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl font-extrabold shadow-sm transition-all hover:scale-105 active:scale-95">
                {l}
              </button>
            ))}
          </div>
          {answer.length === letters.length && (
            <button onClick={startOrder} className="mt-4 rounded-xl bg-candy-blue-deep px-4 py-2 text-sm font-extrabold text-white shadow-sm">🔄 {tr('letterOrder.again')}</button>
          )}
          <div className="mt-3 text-xs font-bold text-ink-soft">{tr('letterOrder.score', { score })}</div>
        </div>
      )}

      {mode === 'fill' && (
        <div className="text-center">
          <p className="mb-3 text-sm font-bold text-ink">{tr('letterOrder.missingLetter')}</p>
          <div className="mb-4 flex justify-center gap-2">
            {fillQ.seq.map((c, i) => (
              <span key={`c-${i}`} className={cn('flex h-14 w-14 items-center justify-center rounded-xl text-3xl font-extrabold shadow-sm',
                c === '?' ? 'bg-candy-pink-soft text-candy-pink-deep' : 'bg-white text-ink'
              )}>
                {c}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {fillOptions.map(o => (
              <CandyButton key={o} tone="pink" size="lg" onClick={()=>pickFill(o)}>{o}</CandyButton>
            ))}
          </div>
          <div className="mt-3 text-xs font-bold text-ink-soft">{tr('letterOrder.score', { score })}</div>
        </div>
      )}

      <AnimatePresence>
        {!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
