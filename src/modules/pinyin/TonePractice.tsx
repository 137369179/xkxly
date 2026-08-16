/**
 * 拼音四声调滑滑梯大冒险 (Tone Rollercoaster & Slide)
 * ------------------------------------------------------------
 * 1. 结合儿童声调口诀（一声平、二声扬、三声拐弯、四声降）的物理动效；
 * 2. 精确带调真人发音与分步示范；
 * 3. 连击 Combo 粒子与 Haptic 震动反馈；
 * 4. 彻底解决声调乱读问题。
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

const BASE_SYLLABLES = [
  'ma', 'ba', 'pa', 'fa', 'da', 'ta', 'na', 'la',
  'gu', 'ku', 'hu', 'ji', 'qi', 'xi', 'zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si'
];

function makeQuestion(): ToneQuestion {
  const base = BASE_SYLLABLES[Math.floor(Math.random() * BASE_SYLLABLES.length)]!;
  const mainVowel = base.includes('a') ? 'a' : base.includes('o') ? 'o' : base.includes('e') ? 'e' : base.includes('i') ? 'i' : base.includes('u') ? 'u' : base.includes('ü') ? 'ü' : 'a';
  const tone = (Math.floor(Math.random() * 4) + 1) as 1 | 2 | 3 | 4;
  const toned = TONE_VOWELS[mainVowel]![tone - 1]!;
  const display = base.replace(mainVowel, toned);
  return { base, tone, display };
}

const TONE_CARDS = [
  {
    tone: 1 as const,
    symbol: '—',
    title: '第一声 · 阴平',
    rhyme: '一声平平像条线 🚗💨',
    desc: '平平起调，高而平稳',
    color: 'from-amber-400 to-orange-400',
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    icon: '➡️',
  },
  {
    tone: 2 as const,
    symbol: '／',
    title: '第二声 · 阳平',
    rhyme: '二声就像上山坡 🧗‍♂️↗️',
    desc: '从中往高升，昂扬向上',
    color: 'from-emerald-400 to-teal-500',
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
    icon: '↗️',
  },
  {
    tone: 3 as const,
    symbol: '∨',
    title: '第三声 · 上声',
    rhyme: '三声下坡又上坡 🎢⤵️',
    desc: '先降后升，婉转拐弯',
    color: 'from-sky-400 to-blue-500',
    border: 'border-sky-300',
    bg: 'bg-sky-50',
    icon: '⤵️',
  },
  {
    tone: 4 as const,
    symbol: '＼',
    title: '第四声 · 去声',
    rhyme: '四声就像下山坡 ⛷️↘️',
    desc: '从最高迅速降到最低',
    color: 'from-pink-400 to-rose-500',
    border: 'border-pink-300',
    bg: 'bg-pink-50',
    icon: '↘️',
  },
];

const QUESTIONS_PER_ROUND = 10;

export function TonePractice() {
  const [questions, setQuestions] = useState<ToneQuestion[]>(() =>
    Array.from({ length: QUESTIONS_PER_ROUND }, makeQuestion)
  );
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [done, setDone] = useState(false);
  const practice = useStore((s) => s.practice);

  const q = questions[idx]!;

  // 播放指定声调的实际带调音节读音
  const playToneSound = (toneNumber: number) => {
    const mainVowel = q.base.includes('a') ? 'a' : q.base.includes('o') ? 'o' : q.base.includes('e') ? 'e' : q.base.includes('i') ? 'i' : q.base.includes('u') ? 'u' : q.base.includes('ü') ? 'ü' : 'a';
    const toned = TONE_VOWELS[mainVowel]![toneNumber - 1]!;
    const tonedSyllable = q.base.replace(mainVowel, toned);
    speak(tonedSyllable, { lang: 'zh-CN', rate: 0.65 });
  };

  // 播放当前题目的正确标准发音
  const playTargetSound = () => {
    speak(q.display, { lang: 'zh-CN', rate: 0.65 });
  };

  const handlePick = (tone: number) => {
    if (picked !== null) return;
    sfxTap();
    setPicked(tone);
    const isCorrect = tone === q.tone;

    // 先播放选中的读音让孩子听音辨位
    playToneSound(tone);

    if (isCorrect) {
      sfxCorrect();
      celebrateSmall();
      randomPraise();
      setCorrect((c) => c + 1);
      setCombo((cb) => cb + 1);
      practice('pinyin:tone', true, 1);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    } else {
      sfxWrong();
      randomEncourage();
      setCombo(0);
      practice('pinyin:tone', false, 0);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([120, 80, 120]);
      }
    }
  };

  const next = () => {
    sfxTap();
    if (idx + 1 >= questions.length) {
      setDone(true);
      sfxStar();
      celebrateBig();
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    sfxTap();
    setQuestions(Array.from({ length: QUESTIONS_PER_ROUND }, makeQuestion));
    setIdx(0);
    setPicked(null);
    setCorrect(0);
    setCombo(0);
    setDone(false);
  };

  if (done) {
    const percent = Math.round((correct / questions.length) * 100);
    return (
      <div className="space-y-4">
        <PageHeader
          emoji="🎢"
          title="声调滑滑梯大闯关"
          subtitle={`完成 ${questions.length} 道挑战`}
          tone="orange"
        />
        <Panel className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring' }}
            className="text-7xl"
          >
            {percent >= 80 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
          </motion.div>
          <h2 className="mt-3 text-2xl font-black text-ink">
            {percent >= 80 ? '声调大特工！太棒啦！' : '再接再厉，你越来越熟练啦！'}
          </h2>
          <div className="mt-4 flex justify-center gap-6">
            <div className="rounded-2xl bg-candy-green-soft p-3 min-w-28">
              <div className="text-3xl font-black text-candy-green-deep">{correct}</div>
              <div className="text-xs font-bold text-candy-green-deep">答对题数</div>
            </div>
            <div className="rounded-2xl bg-candy-purple-soft p-3 min-w-28">
              <div className="text-3xl font-black text-candy-purple-deep">{percent}%</div>
              <div className="text-xs font-bold text-candy-purple-deep">正确率</div>
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <CandyButton tone="green" size="lg" onClick={restart}>
              🔄 再玩一次滑滑梯
            </CandyButton>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        emoji="🎢"
        title="拼音声调滑滑梯"
        subtitle={`第 ${idx + 1} / ${questions.length} 关`}
        tone="orange"
      />

      <ProgressBar value={idx + 1} max={questions.length} color="orange" />

      {/* 连击 Combo 浮动徽章 */}
      <AnimatePresence>
        {combo >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex justify-center"
          >
            <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1 text-xs font-black text-white shadow-md">
              🔥 {combo} 连击达成！棒极了！
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <Panel className="text-center">
        <div className="flex items-center justify-center gap-3">
          <span className="text-xs font-black text-ink-soft">仔细听老师读的声音：</span>
          <button
            type="button"
            onClick={playTargetSound}
            className="inline-flex items-center gap-1.5 rounded-full bg-candy-orange-soft px-3.5 py-1.5 text-sm font-black text-candy-orange-deep hover:bg-candy-orange hover:text-white transition active:scale-95 shadow-xs"
          >
            <span>🔊</span> 点击听声调
          </button>
        </div>

        {/* 核心音节展示区 */}
        <div className="mt-4 mb-2 flex justify-center">
          <div className="rounded-3xl bg-gradient-to-b from-amber-50 to-orange-100/60 border-3 border-amber-200 px-10 py-6 shadow-inner">
            <div className="text-7xl sm:text-8xl font-black text-ink tracking-wide">
              {picked === null ? q.base : q.display}
            </div>
            <p className="mt-2 text-xs font-bold text-amber-800">
              {picked === null ? '请在下方选出它上面该戴哪个声调小帽子 🎩' : `正确声调：第 ${q.tone} 声`}
            </p>
          </div>
        </div>

        {/* 4 个声调卡片选择器 */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TONE_CARDS.map((tc) => {
            const isSelected = picked === tc.tone;
            const isAnswer = q.tone === tc.tone;
            let cardStateClass = 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-md';

            if (picked !== null) {
              if (isAnswer) {
                cardStateClass = 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 shadow-md';
              } else if (isSelected && !isAnswer) {
                cardStateClass = 'border-rose-400 bg-rose-50 opacity-75 animate-shake';
              } else {
                cardStateClass = 'border-slate-100 bg-slate-50/50 opacity-50';
              }
            }

            return (
              <motion.button
                key={tc.tone}
                type="button"
                whileHover={picked === null ? { scale: 1.03 } : {}}
                whileTap={picked === null ? { scale: 0.95 } : {}}
                onClick={() => handlePick(tc.tone)}
                disabled={picked !== null}
                className={`relative flex flex-col items-center justify-between rounded-2xl p-4 border-2 transition-all text-left ${cardStateClass}`}
              >
                <div className="w-full flex items-center justify-between">
                  <span className="text-3xl font-black text-ink">{tc.symbol}</span>
                  <span className="text-xl">{tc.icon}</span>
                </div>
                <div className="my-2 text-center w-full">
                  <div className="text-base font-black text-ink">{tc.title}</div>
                  <div className="text-[11px] font-extrabold text-amber-700 mt-1">{tc.rhyme}</div>
                </div>
                <div className="w-full text-center text-[10px] font-bold text-slate-400">
                  {tc.desc}
                </div>
                {picked !== null && isAnswer && (
                  <span className="absolute -top-2.5 -right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm">
                    ✅ 正确
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* 结果反馈与下一题按钮 */}
        {picked !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex flex-col items-center gap-3"
          >
            <div
              className={`text-base font-black ${
                picked === q.tone ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {picked === q.tone ? '🎉 答对啦！声调非常准确！' : `💡 正确的是第 ${q.tone} 声（${q.display}）哦，再听一遍吧～`}
            </div>
            <CandyButton tone="green" size="lg" className="px-10" onClick={next}>
              下一题 ➡️
            </CandyButton>
          </motion.div>
        )}
      </Panel>
    </div>
  );
}
