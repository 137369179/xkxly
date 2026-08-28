import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { shuffle } from "@/lib/utils";
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import POEMS from '@/data/poems';
import { usePoemsRead } from '@/store/useStore';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { randomPraise, randomEncourage } from '@/lib/speech';
import { moodOfPoem } from '@/lib/chant';
import { useTranslation } from '@/i18n/useTranslation';
import { StreakBar } from '@/components/study/StreakBar';

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
  const line = lines[lineIdx]!
  const chars = [...line].filter(c => /[\u4e00-\u9fff]/.test(c));
  if (chars.length < 3) return null;

  const charIdx = Math.floor(Math.random() * chars.length);
  const missing = chars[charIdx]!

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
  const poemsRead = usePoemsRead();

  const availablePoems = useMemo(() => {
    const read = POEMS.filter(p => poemsRead.includes(p.id));
    return read.length >= 4 ? read : POEMS.slice(0, 20);
  }, [poemsRead]);

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
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'result'>('playing');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const q = questions[idx];

  const handlePick = useCallback((ch: string) => {
    if (picked || !q) return;
    sfxTap();
    setPicked(ch);
    const isRight = ch === q.missingChar;
    if (isRight) {
      sfxCorrect();
      triggerHaptic(45);
      celebrateSmall();
      randomPraise();
      setCorrect(c => c + 1);
      setStreak(s => s + 1);
    } else {
      sfxWrong();
      triggerHaptic(20);
      randomEncourage();
      setStreak(0);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (idx + 1 >= questions.length) {
        setPhase('result');
        if (correct + (isRight ? 1 : 0) >= questions.length * 0.8) {
          sfxStar();
          celebrateBig();
          triggerHaptic([60, 40, 60, 40, 100]);
        }
      } else {
        setIdx(i => i + 1);
        setPicked(null);
      }
    }, 1200);
  }, [picked, q, idx, questions.length, correct]);

  const handlePlayVoice = useCallback(() => {
    if (!q) return;
    sfxTap();
    triggerHaptic(20);
    speak(q.line, { rate: 0.8, module: 'poem', moodKey: moodOfPoem(POEMS.find(p => p.id === q.poemId)!).key });
  }, [q]);

  const handleRestart = useCallback(() => {
    sfxTap();
    triggerHaptic(30);
    const qs: FillQuestion[] = [];
    for (let i = 0; i < QUESTIONS_PER_ROUND; i++) {
      const poem = availablePoems[Math.floor(Math.random() * availablePoems.length)]!
      const nq = makeQuestion(poem, tr);
      if (nq) qs.push(nq);
    }
    setQuestions(qs);
    setIdx(0);
    setPicked(null);
    setCorrect(0);
    setStreak(0);
    setPhase('playing');
  }, [availablePoems, tr]);

  // 键盘快捷监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (phase === 'playing' && q) {
        if (!picked && q.options.length > 0) {
          if (['1', '2', '3', '4'].includes(e.key)) {
            const optIdx = parseInt(e.key, 10) - 1;
            const opt = q.options[optIdx];
            if (opt) {
              e.preventDefault();
              handlePick(opt);
            }
          } else if (e.key === 's' || e.key === 'S' || e.key === ' ') {
            e.preventDefault();
            handlePlayVoice();
          }
        }
      } else if (phase === 'result') {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleRestart();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, q, picked, handlePick, handlePlayVoice, handleRestart]);

  if (questions.length === 0 || !q) {
    return (
      <Panel className="text-center">
        <div className="text-4xl">📚</div>
        <p className="mt-2 text-sm font-bold text-ink-soft">{tr('poemFill.empty')}</p>
      </Panel>
    );
  }

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

  if (phase === 'result') {
    const rate = Math.round((correct / questions.length) * 100);
    const stars = rate >= 90 ? 3 : rate >= 70 ? 2 : 1;
    return (
      <Panel className="text-center">
        <div className="text-6xl">{stars === 3 ? '🏆' : stars === 2 ? '🎉' : '💪'}</div>
        <p className="mt-3 text-xl font-extrabold text-ink">{tr('poemFill.complete')}</p>
        <p className="text-3xl font-black text-candy-pink-deep">{'⭐'.repeat(stars)}</p>
        <p className="text-sm font-bold text-ink-soft">{tr('poemFill.score', { correct, total: questions.length, rate })}</p>
        <CandyButton tone="pink" size="sm" className="mt-4 min-h-[44px]" onClick={handleRestart}>
          🔄 {tr('poemFill.again')}
        </CandyButton>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-pink-900 font-bold bg-pink-50/90 px-3 py-1 rounded-xl border border-pink-200">
          ⌨️ 键盘快捷操作：数字键 1-4 选字 · S 听朗诵
        </span>
      </div>

      {/* 闯关里程碑：连续答对 3 题点亮，形成目标感 */}
      <StreakBar streak={streak} target={3} tone="pink" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-ink-soft">
          {idx + 1}/{questions.length} · ✅{correct}
        </span>
        <CandyButton tone="purple" variant="soft" size="sm" onClick={handlePlayVoice}>
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
        {q.options.map((opt, optIdx) => (
          <button
            key={opt}
            type="button"
            onClick={() => handlePick(opt)}
            disabled={!!picked}
            className={`relative rounded-2xl border-4 p-4 min-h-[64px] text-center text-3xl font-black transition-all focus-visible:ring-4 focus-visible:ring-pink-300 focus:outline-none ${
              picked
                ? opt === q.missingChar
                  ? 'border-candy-green-deep bg-candy-green-soft text-candy-green-deep'
                  : opt === picked
                  ? 'border-candy-red-deep bg-candy-red-soft text-candy-red-deep'
                  : 'border-gray-200 bg-white text-ink-soft opacity-50'
                : 'border-candy-pink-soft bg-white text-ink hover:bg-candy-pink-soft active:translate-y-[1px]'
            }`}
          >
            <span className="absolute top-1.5 left-2 text-xs font-bold opacity-50">[{optIdx + 1}]</span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
