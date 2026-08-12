/**
 * 古诗填字游戏 - 从已学古诗中挖空填字
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { shuffle } from "@/lib/utils";
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import POEMS from '@/data/poems';
import { useProgress } from '@/store/useStore';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { randomPraise, randomEncourage } from '@/lib/speech';
import { moodOfPoem } from '@/lib/chant';
import { useTranslation } from '@/i18n/useTranslation';

const QUESTIONS_PER_ROUND = 8;

interface FillQuestion {
  poemId: string;
  title: string;
  author: string;
  line: string;
  missingChar: string;
  options: string[];
  hint: string;
}

function makeQuestion(poem: (typeof POEMS)[number], tr: (key: string, params?: Record<string, string | number>) => string): FillQuestion | null {
  const lines = poem.lines.filter(l => l.trim());
  if (lines.length < 2) return null;

  const lineIdx = Math.floor(Math.random() * lines.length);
  const line = lines[lineIdx]!!
  const chars = [...line].filter(c => /[\u4e00-\u9fff]/.test(c));
  if (chars.length < 3) return null;

  const charIdx = Math.floor(Math.random() * chars.length);
  const missing = chars[charIdx]!!

  // 从其他诗中取干扰字
  const distractors: string[] = [];
  for (let i = 0; i < 3; i++) {
    const randPoem = POEMS[Math.floor(Math.random() * POEMS.length)]!
    const randLine = randPoem.lines.filter(l => l.trim());
    if (randLine.length > 0) {
      const randChars = [...randLine[0]!].filter(c => /[\u4e00-\u9fff]/.test(c));
      if (randChars.length > 0) {
        const rc = randChars[Math.floor(Math.random() * randChars.length)]!
        if (rc !== missing && !distractors.includes(rc)) {
          distractors.push(rc);
        }
      }
    }
  }

  if (distractors.length < 3) return null;

  const options = shuffle([...distractors, missing]);

  // 提示：该字在诗句中的位置
  const hint = tr('poemFill.hint', { line: lineIdx + 1, char: charIdx + 1 });

  return {
    poemId: poem.id,
    title: poem.title,
    author: poem.author,
    line,
    missingChar: missing,
    options,
    hint,
  };
}

export function PoemFill() {
  const { t: tr } = useTranslation();
  const progress = useProgress();
  const readPoems = progress.poemsRead;

  const availablePoems = useMemo(() => {
    const read = POEMS.filter(p => readPoems.includes(p.id));
    return read.length >= 4 ? read : POEMS.slice(0, 20);
  }, [readPoems]);

  const [questions, setQuestions] = useState<FillQuestion[]>(() => {
    const qs: FillQuestion[] = [];
    for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
      const poem = availablePoems[Math.floor(Math.random() * availablePoems.length)]!
      const q = makeQuestion(poem, tr);
      if (q) qs.push(q);
    }
    return qs.length > 0 ? qs : [];
  });

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'result'>('playing');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  if (questions.length === 0) {
    return (
      <Panel className="text-center">
        <div className="text-4xl">📚</div>
        <p className="mt-2 text-sm font-bold text-ink-soft">{tr('poemFill.empty')}</p>
      </Panel>
    );
  }

  const q = questions[idx]!!

  const renderLine = () => {
    const chars = [...q.line];
    let charCount = 0;
    return chars.map((ch, i) => {
      if (/[\u4e00-\u9fff]/.test(ch)) {
        const ci = charCount++;
        const isMissing = ch === q.missingChar && ci === [...q.line].filter(c => /[\u4e00-\u9fff]/.test(c)).indexOf(q.missingChar);
        return (
          <span
            key={`ch-${i}`}
            className={`inline-block min-w-[1.5em] text-center ${
              isMissing && picked ? 'text-candy-red-deep' : isMissing ? 'text-candy-orange-deep border-b-4 border-dashed border-candy-orange' : ''
            }`}
          >
            {isMissing ? (picked ? q.missingChar : '？') : ch}
          </span>
        );
      }
      return <span key={`char-${i}`}>{ch}</span>;
    });
  };

  const handlePick = (ch: string) => {
    if (picked) return;
    sfxTap();
    setPicked(ch);
    const isRight = ch === q.missingChar;
    if (isRight) {
      sfxCorrect();
      celebrateSmall();
      randomPraise();
      setCorrect(c => c + 1);
    } else {
      sfxWrong();
      randomEncourage();
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (idx + 1 >= questions.length) {
        setPhase('result');
        if (correct + (isRight ? 1 : 0) >= questions.length * 0.8) {
          sfxStar();
          celebrateBig();
        }
      } else {
        setIdx(i => i + 1);
        setPicked(null);
      }
    }, 1200);
  };

  if (phase === 'result') {
    const rate = Math.round((correct / questions.length) * 100);
    const stars = rate >= 90 ? 3 : rate >= 70 ? 2 : 1;
    return (
      <Panel className="text-center">
        <div className="text-6xl">{stars === 3 ? '🏆' : stars === 2 ? '🎉' : '💪'}</div>
        <p className="mt-3 text-xl font-extrabold text-ink">{tr('poemFill.complete')}</p>
        <p className="text-3xl font-black text-candy-pink-deep">{'⭐'.repeat(stars)}</p>
        <p className="text-sm font-bold text-ink-soft">{tr('poemFill.score', { correct, total: questions.length, rate })}</p>
        <CandyButton tone="pink" size="sm" className="mt-4" onClick={() => {
          const qs: FillQuestion[] = [];
          for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
            const poem = availablePoems[Math.floor(Math.random() * availablePoems.length)]!
            const q = makeQuestion(poem, tr);
            if (q) qs.push(q);
          }
          setQuestions(qs);
          setIdx(0);
          setPicked(null);
          setCorrect(0);
          setPhase('playing');
        }}>
          🔄 {tr('poemFill.again')}
        </CandyButton>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-ink-soft">
          {idx + 1}/{questions.length} · ✅{correct}
        </span>
        <CandyButton tone="purple" variant="soft" size="sm" onClick={() => speak(q.line, { rate: 0.8, module: 'poem', moodKey: moodOfPoem(POEMS.find(p => p.id === q.poemId)!).key })}>
          🔊 {tr('poemFill.listen')}
        </CandyButton>
      </div>

      <Panel className="text-center">
        <div className="mb-1 text-sm font-bold text-ink-soft">
          🌸 {q.title} · {q.author}
        </div>
        <div className="my-4 text-xl font-black leading-relaxed text-ink">
          {renderLine()}
        </div>
        <p className="text-xs font-bold text-ink-soft">💡 {q.hint}</p>
      </Panel>

      <div className="grid grid-cols-2 gap-2">
        {q.options.map(opt => (
          <button
            key={opt}
            onClick={() => handlePick(opt)}
            disabled={!!picked}
            className={`rounded-2xl border-4 p-4 text-center text-3xl font-black transition-all ${
              picked
                ? opt === q.missingChar
                  ? 'border-candy-green-deep bg-candy-green-soft text-candy-green-deep'
                  : opt === picked
                  ? 'border-candy-red-deep bg-candy-red-soft text-candy-red-deep'
                  : 'border-gray-200 bg-white text-ink-soft opacity-50'
                : 'border-candy-pink-soft bg-white text-ink hover:bg-candy-pink-soft active:translate-y-[1px]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
