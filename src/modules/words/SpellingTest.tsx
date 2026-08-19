/**
 * 英语单词拼写测试
 * 看图/听音 → 拼写单词 → 自动判定
 */

import { useState, useMemo, useEffect } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useStore } from '@/store/useStore';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { speak, randomPraise, randomEncourage } from '@/lib/speech';
import { getAllWords, type WordEntry } from '@/data/wordIndex';
import { shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const QUESTIONS_PER_ROUND = 10;

export function SpellingTest() {
  const { t: tr } = useTranslation();
  const allWords = useMemo(() => getAllWords(), []);
  const [pool, setPool] = useState<WordEntry[]>(() => shuffle(allWords).slice(0, QUESTIONS_PER_ROUND));
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const practice = useStore(s => s.practice);

  const w = pool[idx];
  const letters = useMemo(() => (w ? w.word.split('') : []), [w]);

  // 虚拟键盘字母池 = 单词字母 + 干扰字母
  const keyboard = useMemo(() => {
    if (!w || letters.length === 0) return [];
    const extras = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(l => !w.word.includes(l));
    const distractors = shuffle(extras).slice(0, Math.max(2, 8 - letters.length));
    return shuffle([...letters, ...distractors]);
  }, [w, letters]);

  useEffect(() => {
    if (!w) return;
    setTyped([]);
    setShowResult(false);
    // 自动播放发音
    const t = setTimeout(() => speak(w.word, { lang: 'en-US', rate: 0.7 }), 300);
    return () => clearTimeout(t);
  }, [w]);

  const handleLetter = (letter: string) => {
    if (showResult) return;
    sfxTap();
    if (typed.length < letters.length) {
      setTyped([...typed, letter]);
    }
  };

  const handleBackspace = () => {
    if (showResult) return;
    sfxTap();
    setTyped(typed.slice(0, -1));
  };

  const handleSubmit = () => {
    if (!w || typed.length !== letters.length) return;
    const answer = typed.join('').toLowerCase();
    const correct = answer === w.word.toLowerCase();
    setShowResult(true);
    if (correct) {
      sfxCorrect();
      celebrateSmall();
      randomPraise();
      setCorrectCount(c => c + 1);
      practice(`word:${w.word}`, true, 1);
    } else {
      sfxWrong();
      randomEncourage();
      practice(`word:${w.word}`, false, 0);
    }
  };

  const next = () => {
    sfxTap();
    if (idx + 1 >= pool.length) {
      setDone(true);
      sfxStar();
      celebrateBig();
    } else {
      setIdx(idx + 1);
    }
  };

  const restart = () => {
    sfxTap();
    setPool(shuffle(allWords).slice(0, QUESTIONS_PER_ROUND));
    setIdx(0);
    setCorrectCount(0);
    setDone(false);
    setTyped([]);
    setShowResult(false);
  };

  if (done) {
    const stars = correctCount === pool.length ? 3 : correctCount >= pool.length * 0.7 ? 2 : 1;
    return (
      <div className="space-y-4">
        <Panel className="text-center">
          <div className="text-6xl">{stars === 3 ? '🏆' : '🎉'}</div>
          <p className="mt-3 text-xl font-extrabold text-ink">{tr('spellingTest.doneTitle')}</p>
          <p className="mt-1 text-base font-bold text-ink-soft">
            {tr('spellingTest.doneDesc', {
              ok: String(correctCount),
              total: String(pool.length),
              stars: '⭐'.repeat(stars),
            })}
          </p>
          <CandyButton tone="pink" size="lg" fullWidth className="mt-4" onClick={restart}>
            {tr('spellingTest.again')}
          </CandyButton>
        </Panel>
      </div>
    );
  }

  if (!w) return null;

  const answer = typed.join('');
  const isCorrect = showResult && answer.toLowerCase() === w.word.toLowerCase();

  return (
    <div className="space-y-4">
      <PageHeader emoji="🔤" title={tr('spellingTest.title')} subtitle={tr('spellingTest.subtitle')} tone="pink" />

      <ProgressBar value={idx + 1} max={pool.length} tone="pink" />

      <Panel key={w.word} className="space-y-5 text-center">
        {/* 图片/Emoji 提示 */}
        <div className="text-7xl">{w.emoji}</div>

        {/* 中文翻译 + 音标 */}
        <div>
          <p className="text-lg font-extrabold text-ink">{w.zh}</p>
          <p className="text-sm font-bold text-ink-soft">/{w.phonetic}/</p>
        </div>

        {/* 听音按钮 */}
        <CandyButton tone="blue" variant="soft" size="sm" onClick={() => speak(w.word, { lang: 'en-US', rate: 0.6 })}>
          {tr('spellingTest.listenAgain')}
        </CandyButton>

        {/* 拼写格 */}
        <div className="flex justify-center gap-2">
          {letters.map((_, i) => {
            const ch = typed[i] ?? '';
            const correctCh = letters[i] ?? '';
            const showAns = showResult && !isCorrect;
            return (
              <div
                key={`_-${i}`}
                className={`h-12 w-11 rounded-xl border-4 flex items-center justify-center text-3xl font-extrabold leading-tight uppercase sm:w-12 sm:text-4xl ${
                  showResult
                    ? isCorrect
                      ? 'border-candy-green-deep bg-candy-green-soft text-candy-green-deep'
                      : ch.toLowerCase() === correctCh.toLowerCase()
                        ? 'border-candy-green-deep bg-candy-green-soft text-candy-green-deep'
                        : 'border-candy-red-deep bg-candy-red-soft text-candy-red-deep'
                    : 'border-candy-pink-soft bg-white text-ink'
                }`}
              >
                {showAns && !ch ? correctCh : ch}
              </div>
            );
          })}
        </div>

        {/* 虚拟键盘 */}
        {!showResult && (
          <div className="flex flex-wrap justify-center gap-2">
            {keyboard.map((letter, i) => (
              <button
                key={`letter-${i}`}
                onClick={() => handleLetter(letter)}
                className="h-12 w-10 rounded-xl border-4 border-candy-blue-soft bg-white text-xl font-extrabold uppercase text-ink active:translate-y-[1px] hover:bg-candy-blue-soft sm:text-2xl"
              >
                {letter}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              className="h-12 rounded-xl border-4 border-candy-orange-soft bg-white px-4 text-xl font-extrabold text-candy-orange-deep active:translate-y-[1px] sm:text-2xl"
            >
              ⌫
            </button>
          </div>
        )}

        {/* 提交/下一题 */}
        {!showResult ? (
          <CandyButton
            tone="green"
            size="lg"
            fullWidth
            disabled={typed.length !== letters.length}
            onClick={handleSubmit}
          >
            {tr('spellingTest.submit')}
          </CandyButton>
        ) : (
          <div className="space-y-3">
            <div className={`rounded-2xl p-3 ${isCorrect ? 'bg-candy-green-soft' : 'bg-candy-red-soft'}`}>
              <p className="text-sm font-extrabold text-ink">
                {isCorrect ? tr('spellingTest.correct') : tr('spellingTest.answerIs', { word: w.word.toUpperCase() })}
              </p>
              <p className="mt-1 text-xs font-bold text-ink-soft">{w.sentence}</p>
              <p className="text-xs font-bold text-ink-soft">{w.sentenceZh}</p>
            </div>
            <CandyButton tone="purple" size="lg" fullWidth onClick={next}>
              {idx + 1 >= pool.length ? tr('spellingTest.result') : tr('spellingTest.next')}
            </CandyButton>
          </div>
        )}
      </Panel>

      <p className="text-center text-sm font-bold text-ink-soft">
        {tr('spellingTest.progress', { current: String(idx + 1), total: String(pool.length) })}
      </p>
    </div>
  );
}
