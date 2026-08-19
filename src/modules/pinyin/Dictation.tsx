/**
 * 拼音听写测试 - TTS 朗读音节 → 选正确的拼音
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getAllPinyin, type PinyinEntry } from '@/data/pinyinIndex';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { randomPraise, randomEncourage } from '@/lib/speech';
import { useStore } from '@/store/useStore';
import { shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const Q_COUNT = 20;

/** 听写出题：正确音节 + 3 个异项干扰，打乱后返回（供单元测试覆盖出题正确性） */
export function makeQuestion(all: PinyinEntry[]): { correct: PinyinEntry; options: PinyinEntry[] } {
  const correct = all[Math.floor(Math.random() * all.length)]!
  const wrongs = shuffle(all.filter(p => p.p !== correct.p)).slice(0, 3);
  const options = shuffle([correct, ...wrongs]);
  return { correct, options };
}

export function Dictation() {
  const { t } = useTranslation();
  const all = useMemo(() => getAllPinyin(), []);
  const [questions, setQuestions] = useState(() => Array.from({ length: Q_COUNT }, () => makeQuestion(all)));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'result'>('playing');
  const practice = useStore(s => s.practice);

  const q = questions[idx]!

  const playSound = () => {
    sfxTap();
    // 用 TTS 朗读拼音的发音
    void speak(q.correct.p, { rate: 0.7 }).catch(() => {});
  };

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  // 自动播放
  useEffect(() => {
    const t = setTimeout(() => { void speak(q.correct.p, { rate: 0.7 }).catch(() => {}); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const handlePick = (pinyin: string) => {
    if (picked) return;
    sfxTap();
    setPicked(pinyin);
    const isRight = pinyin === q.correct.p;
    if (isRight) {
      sfxCorrect();
      celebrateSmall();
      randomPraise();
      setCorrect(c => c + 1);
      practice('pinyin:dictation', true, 0);
    } else {
      sfxWrong();
      randomEncourage();
      practice('pinyin:dictation', false, 0);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (idx + 1 >= Q_COUNT) {
        setPhase('result');
        if (correct + (isRight ? 1 : 0) >= Q_COUNT * 0.8) {
          sfxStar();
          celebrateBig();
        }
      } else {
        setIdx(i => i + 1);
        setPicked(null);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { void speak(questions[idx + 1]!.correct.p, { rate: 0.7 }).catch(() => {}); }, 300);
      }
    }, 1000);
  };

  if (phase === 'result') {
    const rate = Math.round((correct / Q_COUNT) * 100);
    const stars = rate >= 90 ? 3 : rate >= 70 ? 2 : 1;
    return (
      <Panel className="text-center">
        <div className="text-6xl">{stars === 3 ? '🏆' : stars === 2 ? '🎉' : '💪'}</div>
        <p className="mt-3 text-xl font-extrabold text-ink">{t('dictation.done')}</p>
        <p className="text-3xl font-black text-candy-purple-deep">{'⭐'.repeat(stars)}</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-candy-green-soft p-2">
            <div className="text-xl font-extrabold text-candy-green-deep">{correct}</div>
            <div className="text-xs font-bold text-ink-soft">{t('dictation.correct')}</div>
          </div>
          <div className="rounded-xl bg-candy-blue-soft p-2">
            <div className="text-xl font-extrabold text-candy-blue-deep">{rate}%</div>
            <div className="text-xs font-bold text-ink-soft">{t('dictation.accuracy')}</div>
          </div>
        </div>
        <CandyButton tone="purple" size="sm" className="mt-4" onClick={() => {
          setQuestions(Array.from({ length: Q_COUNT }, () => makeQuestion(all)));
          setIdx(0);
          setPicked(null);
          setCorrect(0);
          setPhase('playing');
        }}>
          {t('dictation.again')}
        </CandyButton>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader emoji="🎧" title={t('dictation.title')} subtitle={t('dictation.subtitle')} tone="purple" />

      <div className="flex items-center justify-between">
        <ProgressBar value={idx + 1} max={Q_COUNT} tone="purple" />
        <span className="ml-3 text-sm font-extrabold text-ink-soft">
          {idx + 1}/{Q_COUNT} · ✅{correct}
        </span>
      </div>

      <Panel className="text-center">
        <div className="my-4 text-6xl">👂</div>
        <p className="text-sm font-bold text-ink-soft">{t('dictation.hint')}</p>

        <CandyButton tone="blue" size="lg" className="mt-3" onClick={playSound}>
          {t('dictation.relisten')}
        </CandyButton>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {q.options.map(opt => {
            const isPicked = picked === opt.p;
            const isAnswer = opt.p === q.correct.p;
            return (
              <button
                key={opt.p}
                onClick={() => handlePick(opt.p)}
                disabled={!!picked}
                className={`rounded-2xl border-4 p-4 text-center text-3xl font-black leading-tight transition-all sm:text-4xl ${
                  picked
                    ? isAnswer
                      ? 'border-candy-green-deep bg-candy-green-soft text-candy-green-deep'
                      : isPicked
                      ? 'border-candy-red-deep bg-candy-red-soft text-candy-red-deep'
                      : 'border-gray-200 bg-white text-ink-soft opacity-50'
                    : 'border-candy-purple-soft bg-white text-ink hover:bg-candy-purple-soft active:translate-y-[1px]'
                }`}
              >
                {opt.p}
              </button>
            );
          })}
        </div>

        {picked && !picked.includes(q.correct.p) && (
          <p className="mt-2 text-sm font-bold text-candy-red-deep">
            {t('dictation.answer', { pinyin: q.correct.p })}
          </p>
        )}
      </Panel>
    </div>
  );
}
