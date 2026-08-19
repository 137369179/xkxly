/**
 * 组词造句练习 🀄 (N4)
 * 基于已学汉字，进行组词 + 造句双重练习
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useProgress, useStore } from '@/store/useStore';
import { getHanziByChar } from '@/data/hanziIndex';
import type { HanziEntry } from '@/data/hanzi';
import { useTranslation } from '@/i18n/useTranslation';

type Stage = 'word' | 'sentence' | 'review';

export function WordBuilder({ initialChar }: { initialChar?: string }) {
  const { t: tr } = useTranslation();
  const p = useProgress();
  const practice = useStore((s) => s.practice);
  const [stage, setStage] = useState<Stage>('word');
  const [current, setCurrent] = useState<HanziEntry | null>(null);
  const [userWord, setUserWord] = useState('');
  const [userSentence, setUserSentence] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | ''>('');
  const [score, setScore] = useState(0);
  const [doneList, setDoneList] = useState<string[]>([]);
  // 深链 build:<字> 进入时，仅自动预选一次目标字，不干扰后续自由练习流
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current || !initialChar) return;
    const e = getHanziByChar(initialChar);
    if (e) {
      seededRef.current = true;
      setCurrent(e);
      setStage('word');
      setUserWord('');
      setUserSentence('');
      setFeedback('');
    }
  }, [initialChar]);

  const learned = useMemo(() => {
    const entries = Object.entries(p.mastery);
    return entries
      .filter(([k, m]) => k.startsWith('hanzi:') && m.lv >= 2)
      .map(([k]) => k.replace('hanzi:', ''))
      .filter(c => c !== current?.c);
  }, [p.mastery, current]);

  const nextChar = useCallback(() => {
    const pool = learned.filter(c => !doneList.includes(c));
    if (pool.length === 0) {
      setDoneList([]);
      const all = learned;
      const c = all[Math.floor(Math.random() * all.length)] || '山';
      const e = getHanziByChar(c);
      if (e) { setCurrent(e); setUserWord(''); setUserSentence(''); setFeedback(''); setStage('word'); }
      return;
    }
    const c = pool[Math.floor(Math.random() * pool.length)] || '水';
    const e = getHanziByChar(c);
    if (e) {
      setCurrent(e);
      setUserWord('');
      setUserSentence('');
      setFeedback('');
      setStage('word');
    }
  }, [learned, doneList]);

  const start = useCallback(() => {
    const pool = learned;
    if (pool.length === 0) return;
    const c = pool[Math.floor(Math.random() * pool.length)] || '山';
    const e = getHanziByChar(c);
    if (e) {
      setCurrent(e);
      setStage('word');
    }
  }, [learned]);

  const checkWord = () => {
    if (!current) return;
    const valid = current.words?.some(w => w.includes(userWord.trim())) || false;
    if (valid) {
      sfxCorrect();
      setFeedback('correct');
      practice(`hanzi-build:${current.c}`, true, 1);
      setScore(s => s + 1);
      void speak(`好！${current.c}可以组成${userWord.trim()}`, { lang: 'zh-CN', rate: 0.85, module: 'praise' }).catch(() => {});
      setTimeout(() => { setFeedback(''); setStage('sentence'); }, 800);
    } else {
      sfxWrong();
      setFeedback('wrong');
      practice(`hanzi-build:${current.c}`, false, 0);
      void speak(`再想想，${current.c}能组成什么词呢？`, { lang: 'zh-CN', rate: 0.85, module: 'praise' }).catch(() => {});
      setTimeout(() => setFeedback(''), 1500);
    }
  };

  const checkSentence = () => {
    if (!current) return;
    if (userSentence.trim().includes(current.c) && userSentence.trim().length >= 3) {
      sfxCorrect();
      practice(`hanzi-build:${current.c}`, true, 1);
      setScore(s => s + 1);
      void speak(`真棒！${userSentence.trim()}`, { lang: 'zh-CN', rate: 0.85, module: 'praise' }).catch(() => {});
      setStage('review');
    } else {
      sfxWrong();
      practice(`hanzi-build:${current.c}`, false, 0);
      void speak(`句子里面要有"${current.c}"这个字哦`, { lang: 'zh-CN', rate: 0.85, module: 'praise' }).catch(() => {});
    }
  };

  const handleDone = () => {
    if (current) setDoneList(prev => [...prev, current.c]);
    nextChar();
  };

  if (!current) {
    return (
      <div className="card-candy p-4 text-center">
        <h3 className="text-lg font-extrabold text-ink">{tr('wordBuilder.title')}</h3>
        <p className="mt-2 text-sm font-bold text-ink-soft">{tr('wordBuilder.needLearn')}</p>
        <button onClick={start} className="mt-4 rounded-xl bg-candy-green-soft px-6 py-2 text-sm font-extrabold text-candy-green-deep shadow-sm">
          {tr('wordBuilder.start')}
        </button>
      </div>
    );
  }

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{tr('wordBuilder.title')}</h3>
      <p className="mb-4 text-center text-xs font-bold text-ink-soft">
        {tr('wordBuilder.learnedInfo', { count: String(learned.length), score: String(score) })}
      </p>

      {/* 大字展示 */}
      <div className="mb-5 text-center">
        <div className="inline-block rounded-2xl bg-candy-green-soft px-8 py-6">
          <span className="text-6xl font-extrabold leading-tight text-candy-green-deep sm:text-7xl">{current.c}</span>
        </div>
        <p className="mt-1 text-xs font-bold text-ink-soft">{current.pd} · {current.radical}部</p>
      </div>

      {stage === 'word' && (
        <div className="space-y-3">
          <p className="text-center text-sm font-bold text-ink">{tr('wordBuilder.wordHeader', { c: current.c })}</p>
          <div className="flex gap-2">
            <input
              value={userWord}
              onChange={e => { setUserWord(e.target.value); setFeedback(''); }}
              placeholder={tr('wordBuilder.placeholderWord')}
              className="flex-1 rounded-xl border-2 border-candy-green-soft bg-white px-4 py-2.5 text-base font-bold text-ink outline-none focus:border-candy-green-deep"
              onKeyDown={e => e.key === 'Enter' && checkWord()}
            />
            <button aria-label="✓" onClick={checkWord} className="rounded-xl bg-candy-green-deep px-5 py-2.5 text-sm font-extrabold text-white shadow-sm">
              ✓
            </button>
          </div>
          <p className="text-[10px] font-medium text-ink-muted">
            {tr('wordBuilder.hint', { hint: current.words?.join('、') || tr('wordBuilder.freeWord') })}
          </p>
        </div>
      )}

      {stage === 'sentence' && (
        <div className="space-y-3">
          <p className="text-center text-sm font-bold text-ink">{tr('wordBuilder.sentenceHeader', { c: current.c })}</p>
          <textarea
            value={userSentence}
            onChange={e => { setUserSentence(e.target.value); setFeedback(''); }}
            placeholder={tr('wordBuilder.placeholderSentence')}
            rows={2}
            className="w-full rounded-xl border-2 border-candy-green-soft bg-white px-4 py-2.5 text-base font-bold text-ink outline-none focus:border-candy-green-deep"
          />
          <button
            onClick={checkSentence}
            className="w-full rounded-xl bg-candy-green-deep py-3 text-sm font-extrabold text-white shadow-sm"
          >
            {tr('wordBuilder.submitSentence')}
          </button>
        </div>
      )}

      {stage === 'review' && (
        <div className="space-y-3 text-center">
          <div className="rounded-xl bg-candy-green-soft p-4">
            <p className="text-sm font-bold text-candy-green-deep">{tr('wordBuilder.reviewWord', { word: userWord })}</p>
            <p className="mt-1 text-sm font-bold text-candy-green-deep">{tr('wordBuilder.reviewSentence', { sentence: userSentence })}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { void speak(`组词：${userWord}。造句：${userSentence}`, { lang: 'zh-CN', rate: 0.8 }).catch(() => {}); }}
              className="flex-1 rounded-xl bg-candy-green-deep py-3 text-sm font-extrabold text-white shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              🔊 朗读我的创作
            </button>
            <button
              onClick={handleDone}
              className="flex-1 rounded-xl bg-candy-purple-deep py-3 text-sm font-extrabold text-white shadow-sm active:scale-95 transition-all"
            >
              {tr('wordBuilder.nextChar')}
            </button>
          </div>
        </div>
      )}

      {/* 反馈 */}
      {feedback === 'correct' && (
        <div className="mt-3 text-center">
          <span className="inline-block animate-bounce rounded-xl bg-candy-green-soft px-4 py-1 text-sm font-extrabold text-candy-green-deep">{tr('wordBuilder.correct')}</span>
        </div>
      )}
      {feedback === 'wrong' && (
        <div className="mt-3 text-center">
          <span className="inline-block rounded-xl bg-candy-pink-soft px-4 py-1 text-sm font-extrabold text-candy-pink-deep">{tr('wordBuilder.thinkAgain')}</span>
        </div>
      )}
    </div>
  );
}
