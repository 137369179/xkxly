/**
 * 拼音四声调练习
 * 听声调选正确声调（ā á ǎ à）
 */

import { useState } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';

import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useStore } from '@/store/useStore';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { randomPraise, randomEncourage, speak } from '@/lib/speech';

interface ToneQuestion {
  base: string; // 如 "ma"
  tone: 1 | 2 | 3 | 4; // 正确声调
  display: string; // 带调拼音 如 "mǎ"
}

const TONE_VOWELS: Record<string, [string, string, string, string]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

const BASE_SYLLABLES = ['ma', 'ba', 'pa', 'fa', 'da', 'ta', 'na', 'la', 'gu', 'ku', 'hu', 'ji', 'qi', 'xi', 'zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si'];

function makeQuestion(): ToneQuestion {
  const base = BASE_SYLLABLES[Math.floor(Math.random() * BASE_SYLLABLES.length)]!
  const mainVowel = base.includes('a') ? 'a' : base.includes('o') ? 'o' : base.includes('e') ? 'e' : base.includes('i') ? 'i' : base.includes('u') ? 'u' : base.includes('ü') ? 'ü' : 'a';
  const tone = (Math.floor(Math.random() * 4) + 1) as 1 | 2 | 3 | 4;
  const toned = TONE_VOWELS[mainVowel]!![tone - 1]!;
  const display = base.replace(mainVowel, toned);
  return { base, tone, display };
}

const TONE_OPTIONS = [
  { tone: 1 as const, label: '̄', name: '一声', emoji: '➡️' },
  { tone: 2 as const, label: '́', name: '二声', emoji: '↗️' },
  { tone: 3 as const, label: '̌', name: '三声', emoji: '⤵️' },
  { tone: 4 as const, label: '̀', name: '四声', emoji: '⬇️' },
];

const QUESTIONS_PER_ROUND = 10;

export function TonePractice() {
  const [questions, setQuestions] = useState<ToneQuestion[]>(() =>
    Array.from({ length: QUESTIONS_PER_ROUND }, makeQuestion)
  );
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const practice = useStore(s => s.practice);

  const q = questions[idx]!!

  const playSound = (tone: number) => {
    // 用 TTS 模拟声调发音
    const tones: Record<number, { rate: number; pitch: number }> = {
      1: { rate: 0.5, pitch: 1.5 },
      2: { rate: 0.5, pitch: 1.8 },
      3: { rate: 0.4, pitch: 1.2 },
      4: { rate: 0.5, pitch: 2.0 },
    };
    const cfg = tones[tone]! || { rate: 0.5, pitch: 1.5 };
    speak(q.base, { lang: 'zh-CN', rate: cfg.rate, pitch: cfg.pitch });
  };

  const handlePick = (tone: number) => {
    if (picked !== null) return;
    sfxTap();
    setPicked(tone);
    const isCorrect = tone === q.tone;
    if (isCorrect) {
      sfxCorrect();
      celebrateSmall();
      randomPraise();
      setCorrect(c => c + 1);
      practice('pinyin:tone', true, 1);
    } else {
      sfxWrong();
      randomEncourage();
      practice('pinyin:tone', false, 0);
    }
  };

  const next = () => {
    sfxTap();
    if (idx + 1 >= questions.length) {
      setDone(true);
      sfxStar();
      celebrateBig();
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    sfxTap();
    setQuestions(Array.from({ length: QUESTIONS_PER_ROUND }, makeQuestion));
    setIdx(0);
    setPicked(null);
    setCorrect(0);
    setDone(false);
  };

  if (done) {
    const stars = correct === questions.length ? 3 : correct >= questions.length * 0.7 ? 2 : 1;
    return (
      <div className="space-y-4">
        <Panel className="text-center">
          <div className="text-6xl">{stars === 3 ? '🏆' : '🎉'}</div>
          <p className="mt-3 text-xl font-extrabold text-ink">声调练习完成！</p>
          <p className="mt-1 text-base font-bold text-ink-soft">
            答对 {correct} / {questions.length} · {'⭐'.repeat(stars)}
          </p>
          <CandyButton tone="blue" size="lg" fullWidth className="mt-4" onClick={restart}>
            🔄 再来一轮
          </CandyButton>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader emoji="🎵" title="声调练习" subtitle="听一听，选正确声调" tone="blue" />

      <ProgressBar value={idx + 1} max={questions.length} tone="blue" />

      <Panel key={`tone-${idx}`} className="space-y-5 text-center">
        {/* 题目展示 */}
        <div>
          <p className="text-sm font-bold text-ink-soft">听一听这个音节是第几声？</p>
          <div className="my-4 text-6xl font-black text-candy-blue-deep">
            {picked !== null ? q.display : q.base}
          </div>
        </div>

        {/* 播放按钮 */}
        <CandyButton tone="blue" variant="soft" size="sm" onClick={() => playSound(q.tone)}>
          🔊 再听一遍
        </CandyButton>

        {/* 声调选项 */}
        <div className="grid grid-cols-4 gap-3">
          {TONE_OPTIONS.map(opt => {
            const isPicked = picked === opt.tone;
            const isAnswer = q.tone === opt.tone;
            const show = picked !== null;
            return (
              <button
                key={opt.tone}
                onClick={() => handlePick(opt.tone)}
                disabled={picked !== null}
                className={`flex flex-col items-center rounded-2xl border-4 p-4 min-h-[80px] transition-all active:translate-y-[1px] ${
                  show && isAnswer
                    ? 'border-candy-green-deep bg-candy-green-soft'
                    : show && isPicked && !isAnswer
                    ? 'border-candy-red-deep bg-candy-red-soft opacity-60'
                    : 'border-candy-blue-soft bg-white'
                }`}
              >
                <span className="text-3xl font-black text-ink">
                  {q.base.replace(
                    q.base.includes('a') ? 'a' : q.base.includes('o') ? 'o' : q.base.includes('e') ? 'e' : q.base.includes('i') ? 'i' : q.base.includes('u') ? 'u' : 'a',
                    TONE_VOWELS[q.base.includes('a') ? 'a' : q.base.includes('o') ? 'o' : q.base.includes('e') ? 'e' : q.base.includes('i') ? 'i' : q.base.includes('u') ? 'u' : 'a']![opt.tone - 1]!
                  )}
                </span>
                <span className="mt-1 text-xs font-bold text-ink-soft">
                  {opt.emoji} {opt.name}
                </span>
                {show && isAnswer && <span className="text-xs">✅</span>}
                {show && isPicked && !isAnswer && <span className="text-xs">❌</span>}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <CandyButton tone="green" size="lg" fullWidth onClick={next}>
            {idx + 1 >= questions.length ? '🏁 看成绩' : '➡️ 下一题'}
          </CandyButton>
        )}
      </Panel>

      <p className="text-center text-sm font-bold text-ink-soft">
        第 {idx + 1} / {questions.length} 题
      </p>
    </div>
  );
}
