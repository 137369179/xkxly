/**
 * 数学口算阶梯 · 10 级挑战
 */

import { useState, useEffect, useRef } from 'react';

import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useStore } from '@/store/useStore';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { randomPraise, randomEncourage } from '@/lib/speech';
import { starsByRate } from '@/lib/stars';
import { useTranslation } from '@/i18n/useTranslation';

interface Level {
  id: number;
  name: string;
  emoji: string;
  desc: string;
  tone: 'green' | 'blue' | 'purple' | 'pink' | 'orange';
  gen: () => { text: string; answer: number };
}

const LEVELS: Level[] = [
  { id: 1, name: '5以内加法', emoji: '🌱', desc: '1+2=?', tone: 'green', gen: () => { const a = 1 + Math.floor(Math.random() * 4); const b = 1 + Math.floor(Math.random() * (5 - a)); return { text: `${a}+${b}=`, answer: a + b }; } },
  { id: 2, name: '5以内减法', emoji: '🌿', desc: '5-2=?', tone: 'green', gen: () => { const a = 2 + Math.floor(Math.random() * 4); const b = 1 + Math.floor(Math.random() * (a - 1)); return { text: `${a}-${b}=`, answer: a - b }; } },
  { id: 3, name: '10以内加法', emoji: '⭐', desc: '3+4=?', tone: 'blue', gen: () => { const a = 1 + Math.floor(Math.random() * 9); const b = 1 + Math.floor(Math.random() * (10 - a)); return { text: `${a}+${b}=`, answer: a + b }; } },
  { id: 4, name: '10以内减法', emoji: '🌟', desc: '9-3=?', tone: 'blue', gen: () => { const a = 3 + Math.floor(Math.random() * 8); const b = 1 + Math.floor(Math.random() * (a - 1)); return { text: `${a}-${b}=`, answer: a - b }; } },
  { id: 5, name: '20以内加法', emoji: '🔥', desc: '8+7=?', tone: 'purple', gen: () => { const a = 2 + Math.floor(Math.random() * 18); const b = 1 + Math.floor(Math.random() * (20 - a)); return { text: `${a}+${b}=`, answer: a + b }; } },
  { id: 6, name: '20以内减法', emoji: '⚡', desc: '17-9=?', tone: 'purple', gen: () => { const a = 5 + Math.floor(Math.random() * 16); const b = 1 + Math.floor(Math.random() * (a - 1)); return { text: `${a}-${b}=`, answer: a - b }; } },
  { id: 7, name: '50以内加减', emoji: '💪', desc: '23+18=?', tone: 'pink', gen: () => { const op = Math.random() < 0.5 ? '+' : '-'; if (op === '+') { const a = 5 + Math.floor(Math.random() * 45); const b = 1 + Math.floor(Math.random() * (50 - a)); return { text: `${a}+${b}=`, answer: a + b }; } const a = 10 + Math.floor(Math.random() * 41); const b = 1 + Math.floor(Math.random() * (a - 1)); return { text: `${a}-${b}=`, answer: a - b }; } },
  { id: 8, name: '100以内加减', emoji: '🏆', desc: '45+37=?', tone: 'pink', gen: () => { const op = Math.random() < 0.5 ? '+' : '-'; if (op === '+') { const a = 10 + Math.floor(Math.random() * 90); const b = 1 + Math.floor(Math.random() * (100 - a)); return { text: `${a}+${b}=`, answer: a + b }; } const a = 20 + Math.floor(Math.random() * 81); const b = 1 + Math.floor(Math.random() * (a - 1)); return { text: `${a}-${b}=`, answer: a - b }; } },
  { id: 9, name: '乘法启蒙', emoji: '✖️', desc: '3×4=?', tone: 'orange', gen: () => { const a = 2 + Math.floor(Math.random() * 8); const b = 2 + Math.floor(Math.random() * 8); return { text: `${a}×${b}=`, answer: a * b }; } },
  { id: 10, name: '乘除混合', emoji: '👑', desc: '6×7=? 或 24÷6=?', tone: 'orange', gen: () => { const isMul = Math.random() < 0.5; if (isMul) { const a = 2 + Math.floor(Math.random() * 8); const b = 2 + Math.floor(Math.random() * 8); return { text: `${a}×${b}=`, answer: a * b }; } const b = 2 + Math.floor(Math.random() * 8); const result = 2 + Math.floor(Math.random() * 8); return { text: `${b * result}÷${b}=`, answer: result }; } },
];

const Q_PER_LEVEL = 20;
const TIME_LIMIT = 90;

export function MathLadder() {
  const { t: tr } = useTranslation();
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<'select' | 'playing' | 'result'>('select');
  const [qIdx, setQIdx] = useState(0);
  const [input, setInput] = useState('');
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [feedback, setFeedback] = useState<'none' | 'right' | 'wrong'>('none');
  const [currentQ, setCurrentQ] = useState(() => LEVELS[0]!.gen());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const practice = useStore(s => s.practice);
  const recordSpeed = useStore(s => s.recordSpeed);


  const lv = LEVELS[level - 1]!

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startLevel = (lvId: number) => {
    sfxTap();
    setLevel(lvId);
    setQIdx(0);
    setCorrect(0);
    setWrong(0);
    setInput('');
    setFeedback('none');
    setTimeLeft(TIME_LIMIT);
    setCurrentQ(LEVELS[lvId - 1]!.gen());
    setPhase('playing');
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stopTimer();
          setPhase('result');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { stopTimer(); if (advanceRef.current) clearTimeout(advanceRef.current); }, []);

  // 换题后（qIdx 变化）自动把焦点拉回输入框，autoFocus 仅在首题生效
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [qIdx]);

  const submitAnswer = () => {
    if (!input.trim()) return;
    const ans = parseInt(input, 10);
    const isRight = ans === currentQ.answer;
    setFeedback(isRight ? 'right' : 'wrong');
    recordSpeed(isRight);

    if (isRight) {
      sfxCorrect();
      celebrateSmall();
      randomPraise();
      setCorrect(c => c + 1);
      practice(`math:ladder:${level}`, true, 1);
    } else {
      sfxWrong();
      randomEncourage();
      setWrong(w => w + 1);
      practice(`math:ladder:${level}`, false, 0);
    }
    advanceRef.current = setTimeout(() => {
      if (qIdx + 1 >= Q_PER_LEVEL) {
        stopTimer();
        setPhase('result');
        // 通关奖励：90% 正确率给 3 星，60% 给 2 星，否则 1 星
        const finalCorrect = correct + (isRight ? 1 : 0);
        if (finalCorrect >= Q_PER_LEVEL * 0.9) {
          sfxStar();
          celebrateBig();
          practice(`math:ladder:${level}`, true, 3);
        } else if (finalCorrect >= Q_PER_LEVEL * 0.6) {
          practice(`math:ladder:${level}`, true, 2);
        } else {
          practice(`math:ladder:${level}`, true, 1);
        }
      } else {
        setQIdx(i => i + 1);
        setCurrentQ(LEVELS[level - 1]!.gen());
        setInput('');
        setFeedback('none');
      }
    }, 600);
  };

  if (phase === 'select') {
    return (
      <div className="space-y-4">
        <PageHeader emoji="🪜" title={tr('mathLadder.title')} subtitle={tr('mathLadder.subtitle')} tone="orange" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {LEVELS.map(lv => (
            <button
              key={lv.id}
              onClick={() => startLevel(lv.id)}
              className="flex items-center gap-3 rounded-2xl border-4 border-candy-orange-soft bg-white p-3 text-left transition-all active:translate-y-[1px] hover:bg-candy-orange-soft"
            >
              <span className="text-3xl">{lv.emoji}</span>
              <div className="flex-1">
                <div className="text-base font-extrabold text-ink">Lv.{lv.id} {tr(`mathLadder.levelName.${lv.id}`)}</div>
                <div className="text-xs font-bold text-ink-soft">{lv.desc} · {tr('mathLadder.questionsCount', { count: Q_PER_LEVEL })}{tr('mathLadder.timeLimit', { seconds: TIME_LIMIT })}</div>
              </div>
              <span className="text-xl">▶️</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const total = correct + wrong;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    const stars = starsByRate(rate / 100);
    const passed = stars >= 2;
    return (
      <div className="space-y-4">
        <Panel className="text-center">
          <div className="text-6xl">{stars === 3 ? '🏆' : passed ? '🎉' : '💪'}</div>
          <p className="mt-3 text-xl font-extrabold text-ink">Lv.{level} {tr(`mathLadder.levelName.${level}`)}</p>
          <p className="mt-1 text-3xl font-black text-candy-orange-deep">{'⭐'.repeat(stars)}</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-candy-green-soft p-2">
              <div className="text-xl font-extrabold text-candy-green-deep">{correct}</div>
              <div className="text-xs font-bold text-ink-soft">{tr('common.correct')}</div>
            </div>
            <div className="rounded-xl bg-candy-red-soft p-2">
              <div className="text-xl font-extrabold text-candy-red-deep">{wrong}</div>
              <div className="text-xs font-bold text-ink-soft">{tr('common.wrong')}</div>
            </div>
            <div className="rounded-xl bg-candy-blue-soft p-2">
              <div className="text-xl font-extrabold text-candy-blue-deep">{rate}%</div>
              <div className="text-xs font-bold text-ink-soft">{tr('common.accuracy')}</div>
            </div>
          </div>
          <div className="mt-4 flex justify-center gap-2">
            <CandyButton tone="orange" size="sm" onClick={() => startLevel(level)}>{tr('mathLadder.retry')}</CandyButton>
            {passed && level < 10 && (
              <CandyButton tone="green" size="sm" onClick={() => startLevel(level + 1)}>
                {tr('mathLadder.nextLevel', { level: level + 1 })}
              </CandyButton>
            )}
            <CandyButton tone="purple" variant="soft" size="sm" onClick={() => setPhase('select')}>
              {tr('mathLadder.selectLevel')}
            </CandyButton>
          </div>
        </Panel>
      </div>
    );
  }

  // Playing
  return (
    <div className="space-y-4">
      <PageHeader emoji={lv.emoji} title={`Lv.${level} ${tr(`mathLadder.levelName.${level}`)}`} subtitle="" tone={lv.tone} />

      <div className="flex items-center justify-between">
        <ProgressBar value={qIdx + 1} max={Q_PER_LEVEL} tone={lv.tone} />
        <span className={`ml-3 text-lg font-extrabold tabular-nums ${timeLeft <= 10 ? 'text-candy-red-deep' : 'text-ink'}`}>
          ⏱️ {timeLeft}s
        </span>
      </div>

      <Panel className="text-center">
        <div className="mb-2 text-sm font-bold text-ink-soft">
          {tr('mathLadder.questionProgress', { current: qIdx + 1, total: Q_PER_LEVEL })} · ✅{correct} ❌{wrong}
        </div>
        <div className="my-6 text-6xl font-black text-ink leading-tight sm:text-7xl">{currentQ.text}</div>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={e => { if (e.key === 'Enter') submitAnswer(); }}
          inputMode="numeric"
          placeholder="?"
          autoFocus
          className={`mx-auto block w-32 rounded-2xl border-4 px-4 py-3 text-center text-4xl font-extrabold outline-none ${
            feedback === 'right'
              ? 'border-candy-green-deep bg-candy-green-soft text-candy-green-deep'
              : feedback === 'wrong'
              ? 'border-candy-red-deep bg-candy-red-soft text-candy-red-deep'
              : 'border-candy-orange-soft bg-white text-ink'
          }`}
        />
        {feedback === 'wrong' && (
          <p className="mt-2 text-sm font-bold text-candy-red-deep">{tr('mathLadder.correctAnswer', { answer: currentQ.answer })}</p>
        )}
        <div className="mt-4">
          <CandyButton tone="green" size="lg" disabled={!input.trim() || feedback !== 'none'} onClick={submitAnswer}>
            {tr('mathLadder.confirm')}
          </CandyButton>
        </div>
      </Panel>
    </div>
  );
}
