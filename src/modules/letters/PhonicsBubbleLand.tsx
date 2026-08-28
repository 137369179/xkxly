/**
 * 🫧 洪恩/叽里呱啦级「自然拼读气泡乐园与 CVC 词族韵律小火车」 (Phonics Bubble Land Pro)
 * ----------------------------------------------------------------------------------
 * 1. 26 个字母自然拼读自然发音 (Letter Sound vs Letter Name)；
 * 2. 16 个经典 CVC 辅音-元音-辅音 (Consonant-Vowel-Consonant) 魔法拼读机；
 * 3. 5 大经典 Word Family 韵律小火车 (-at, -en, -ig, -op, -ug)；
 * 4. 听音戳气泡大冒险与连击 Streak 激励。
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';

// ── 26 字母自然发音库 ──
export interface PhonicsLetter {
  letter: string;
  phonics: string;
  word: string;
  meaning: string;
  emoji: string;
  color: string;
}

export const PHONICS_LETTERS: PhonicsLetter[] = [
  { letter: 'A', phonics: '/æ/', word: 'Apple', meaning: '苹果', emoji: '🍎', color: 'from-rose-400 to-red-500' },
  { letter: 'B', phonics: '/b/', word: 'Bear', meaning: '小熊', emoji: '🐻', color: 'from-amber-400 to-amber-600' },
  { letter: 'C', phonics: '/k/', word: 'Cat', meaning: '小猫', emoji: '🐱', color: 'from-sky-400 to-blue-500' },
  { letter: 'D', phonics: '/d/', word: 'Dog', meaning: '小狗', emoji: '🐶', color: 'from-emerald-400 to-green-600' },
  { letter: 'E', phonics: '/e/', word: 'Elephant', meaning: '大象', emoji: '🐘', color: 'from-purple-400 to-indigo-600' },
  { letter: 'F', phonics: '/f/', word: 'Fish', meaning: '小鱼', emoji: '🐟', color: 'from-cyan-400 to-teal-500' },
  { letter: 'G', phonics: '/g/', word: 'Grape', meaning: '葡萄', emoji: '🍇', color: 'from-violet-400 to-purple-600' },
  { letter: 'H', phonics: '/h/', word: 'Hat', meaning: '帽子', emoji: '🎩', color: 'from-orange-400 to-amber-600' },
  { letter: 'I', phonics: '/ɪ/', word: 'Ice cream', meaning: '冰淇淋', emoji: '🍦', color: 'from-pink-400 to-rose-500' },
  { letter: 'J', phonics: '/dʒ/', word: 'Juice', meaning: '果汁', emoji: '🧃', color: 'from-amber-300 to-orange-500' },
  { letter: 'K', phonics: '/k/', word: 'Kite', meaning: '风筝', emoji: '🪁', color: 'from-teal-400 to-cyan-600' },
  { letter: 'L', phonics: '/l/', word: 'Lion', meaning: '狮子', emoji: '🦁', color: 'from-yellow-400 to-amber-500' },
  { letter: 'M', phonics: '/m/', word: 'Monkey', meaning: '猴子', emoji: '🐵', color: 'from-amber-500 to-yellow-600' },
  { letter: 'N', phonics: '/n/', word: 'Nose', meaning: '鼻子', emoji: '👃', color: 'from-pink-300 to-rose-400' },
  { letter: 'O', phonics: '/ɒ/', word: 'Orange', meaning: '橙子', emoji: '🍊', color: 'from-orange-400 to-orange-600' },
  { letter: 'P', phonics: '/p/', word: 'Pig', meaning: '小猪', emoji: '🐷', color: 'from-rose-300 to-pink-500' },
  { letter: 'Q', phonics: '/kw/', word: 'Queen', meaning: '女王', emoji: '👑', color: 'from-yellow-400 to-amber-600' },
  { letter: 'R', phonics: '/r/', word: 'Rabbit', meaning: '小兔', emoji: '🐰', color: 'from-sky-300 to-blue-400' },
  { letter: 'S', phonics: '/s/', word: 'Sun', meaning: '太阳', emoji: '☀️', color: 'from-amber-400 to-yellow-500' },
  { letter: 'T', phonics: '/t/', word: 'Tiger', meaning: '老虎', emoji: '🐯', color: 'from-orange-400 to-amber-600' },
  { letter: 'U', phonics: '/ʌ/', word: 'Umbrella', meaning: '雨伞', emoji: '☂️', color: 'from-indigo-400 to-purple-600' },
  { letter: 'V', phonics: '/v/', word: 'Violin', meaning: '小提琴', emoji: '🎻', color: 'from-amber-600 to-amber-800' },
  { letter: 'W', phonics: '/w/', word: 'Water', meaning: '水', emoji: '💧', color: 'from-blue-400 to-cyan-500' },
  { letter: 'X', phonics: '/ks/', word: 'Xylophone', meaning: '木琴', emoji: '🎹', color: 'from-fuchsia-400 to-purple-600' },
  { letter: 'Y', phonics: '/j/', word: 'Yarn', meaning: '毛线', emoji: '🧶', color: 'from-rose-400 to-pink-600' },
  { letter: 'Z', phonics: '/z/', word: 'Zebra', meaning: '斑马', emoji: '🦓', color: 'from-slate-600 to-slate-800' },
];

// ── 16 个经典 CVC 三拼词库 ──
export interface CvcWord {
  id: string;
  c1: string;
  v: string;
  c2: string;
  word: string;
  meaning: string;
  emoji: string;
}

export const CVC_WORDS: CvcWord[] = [
  { id: 'cat', c1: 'c', v: 'a', c2: 't', word: 'cat', meaning: '小猫', emoji: '🐱' },
  { id: 'bed', c1: 'b', v: 'e', c2: 'd', word: 'bed', meaning: '小床', emoji: '🛏️' },
  { id: 'pig', c1: 'p', v: 'i', c2: 'g', word: 'pig', meaning: '小猪', emoji: '🐷' },
  { id: 'dog', c1: 'd', v: 'o', c2: 'g', word: 'dog', meaning: '小狗', emoji: '🐶' },
  { id: 'sun', c1: 's', v: 'u', c2: 'n', word: 'sun', meaning: '太阳', emoji: '☀️' },
  { id: 'fan', c1: 'f', v: 'a', c2: 'n', word: 'fan', meaning: '风扇', emoji: '🪭' },
  { id: 'bus', c1: 'b', v: 'u', c2: 's', word: 'bus', meaning: '公交车', emoji: '🚌' },
  { id: 'hat', c1: 'h', v: 'a', c2: 't', word: 'hat', meaning: '帽子', emoji: '🎩' },
  { id: 'fox', c1: 'f', v: 'o', c2: 'x', word: 'fox', meaning: '狐狸', emoji: '🦊' },
  { id: 'bat', c1: 'b', v: 'a', c2: 't', word: 'bat', meaning: '蝙蝠/球棒', emoji: '🦇' },
  { id: 'box', c1: 'b', v: 'o', c2: 'x', word: 'box', meaning: '盒子', emoji: '📦' },
  { id: 'pen', c1: 'p', v: 'e', c2: 'n', word: 'pen', meaning: '钢笔', emoji: '🖊️' },
  { id: 'cup', c1: 'c', v: 'u', c2: 'p', word: 'cup', meaning: '杯子', emoji: '🍵' },
  { id: 'lip', c1: 'l', v: 'i', c2: 'p', word: 'lip', meaning: '嘴唇', emoji: '👄' },
  { id: 'map', c1: 'm', v: 'a', c2: 'p', word: 'map', meaning: '地图', emoji: '🗺️' },
  { id: 'net', c1: 'n', v: 'e', c2: 't', word: 'net', meaning: '渔网', emoji: '🕸️' },
];

// ── 5 大 Word Family 韵律词族 ──
export interface WordFamily {
  family: string;
  vowel: string;
  themeName: string;
  emoji: string;
  words: { prefix: string; word: string; meaning: string; emoji: string }[];
}

export const WORD_FAMILIES: WordFamily[] = [
  {
    family: '-at',
    vowel: 'a',
    themeName: '-at 家族 (Cat/Bat/Hat/Rat)',
    emoji: '🐱',
    words: [
      { prefix: 'c', word: 'cat', meaning: '小猫', emoji: '🐱' },
      { prefix: 'b', word: 'bat', meaning: '蝙蝠/球棒', emoji: '🦇' },
      { prefix: 'h', word: 'hat', meaning: '帽子', emoji: '🎩' },
      { prefix: 'r', word: 'rat', meaning: '老鼠', emoji: '🐭' },
    ],
  },
  {
    family: '-en',
    vowel: 'e',
    themeName: '-en 家族 (Hen/Pen/Ten/Men)',
    emoji: '🐔',
    words: [
      { prefix: 'h', word: 'hen', meaning: '母鸡', emoji: '🐔' },
      { prefix: 'p', word: 'pen', meaning: '钢笔', emoji: '🖊️' },
      { prefix: 't', word: 'ten', meaning: '数字10', emoji: '🔟' },
      { prefix: 'm', word: 'men', meaning: '人们', emoji: '👥' },
    ],
  },
  {
    family: '-ig',
    vowel: 'i',
    themeName: '-ig 家族 (Pig/Big/Dig/Fig)',
    emoji: '🐷',
    words: [
      { prefix: 'p', word: 'pig', meaning: '小猪', emoji: '🐷' },
      { prefix: 'b', word: 'big', meaning: '巨大的', emoji: '🐘' },
      { prefix: 'd', word: 'dig', meaning: '挖掘', emoji: '⛏️' },
      { prefix: 'f', word: 'fig', meaning: '无花果', emoji: '🫐' },
    ],
  },
  {
    family: '-op',
    vowel: 'o',
    themeName: '-op 家族 (Hop/Top/Mop/Pop)',
    emoji: '🐰',
    words: [
      { prefix: 'h', word: 'hop', meaning: '单脚跳', emoji: '🐰' },
      { prefix: 't', word: 'top', meaning: '陀螺/顶部', emoji: '🪀' },
      { prefix: 'm', word: 'mop', meaning: '拖把', emoji: '🧹' },
      { prefix: 'p', word: 'pop', meaning: '爆米花/啪声', emoji: '🍿' },
    ],
  },
  {
    family: '-ug',
    vowel: 'u',
    themeName: '-ug 家族 (Bug/Mug/Hug/Rug)',
    emoji: '🐛',
    words: [
      { prefix: 'b', word: 'bug', meaning: '小虫子', emoji: '🐛' },
      { prefix: 'm', word: 'mug', meaning: '马克杯', emoji: '☕' },
      { prefix: 'h', word: 'hug', meaning: '拥抱', emoji: '🤗' },
      { prefix: 'r', word: 'rug', meaning: '地毯', emoji: '🧶' },
    ],
  },
];

const FALLBACK_PHONICS: PhonicsLetter = {
  letter: 'A',
  phonics: '/æ/',
  word: 'Apple',
  meaning: '苹果',
  emoji: '🍎',
  color: 'from-rose-400 to-red-500',
};

const FALLBACK_CVC: CvcWord = {
  id: 'cat',
  c1: 'c',
  v: 'a',
  c2: 't',
  word: 'cat',
  meaning: '小猫',
  emoji: '🐱',
};

const FALLBACK_FAMILY: WordFamily = {
  family: '-at',
  vowel: 'a',
  themeName: '-at 家族 (Cat/Bat/Hat/Rat)',
  emoji: '🐱',
  words: [
    { prefix: 'c', word: 'cat', meaning: '小猫', emoji: '🐱' },
    { prefix: 'b', word: 'bat', meaning: '蝙蝠/球棒', emoji: '🦇' },
    { prefix: 'h', word: 'hat', meaning: '帽子', emoji: '🎩' },
    { prefix: 'r', word: 'rat', meaning: '老鼠', emoji: '🐭' },
  ],
};

export type PhonicsMode = 'bubbles' | 'cvc' | 'family' | 'quiz';

export function PhonicsBubbleLand() {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [mode, setMode] = useState<PhonicsMode>('bubbles');
  const [selectedLetter, setSelectedLetter] = useState<PhonicsLetter>(PHONICS_LETTERS[0] ?? FALLBACK_PHONICS);
  const [streak, setStreak] = useState(0);

  // CVC 模式状态
  const [cvcIdx, setCvcIdx] = useState(0);

  // Word Family 模式状态
  const [familyIdx, setFamilyIdx] = useState(0);
  const [familyWordIdx, setFamilyWordIdx] = useState(0);

  // 听音戳气泡 Quiz 模式状态
  const [quizIdx, setQuizIdx] = useState(0);
  const [answeredOpt, setAnsweredOpt] = useState<string | null>(null);

  const currentCvc = useMemo(() => {
    return CVC_WORDS[cvcIdx % CVC_WORDS.length] ?? CVC_WORDS[0] ?? FALLBACK_CVC;
  }, [cvcIdx]);

  const currentFamily = useMemo(() => {
    return WORD_FAMILIES[familyIdx % WORD_FAMILIES.length] ?? FALLBACK_FAMILY;
  }, [familyIdx]);

  const currentFamilyWord = useMemo(() => {
    return currentFamily.words[familyWordIdx % currentFamily.words.length] ?? currentFamily.words[0] ?? {
      prefix: 'c',
      word: 'cat',
      meaning: '小猫',
      emoji: '🐱',
    };
  }, [currentFamily, familyWordIdx]);

  const currentQuiz = useMemo(() => {
    const target = PHONICS_LETTERS[quizIdx % PHONICS_LETTERS.length] ?? PHONICS_LETTERS[0] ?? FALLBACK_PHONICS;
    const others = PHONICS_LETTERS.filter((p) => p.letter !== target.letter)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const options = [target, ...others].sort(() => Math.random() - 0.5);
    return { target, options };
  }, [quizIdx]);

  const handlePickBubble = useCallback(
    (item: PhonicsLetter) => {
      sfxTap();
      triggerHaptic(20);
      setSelectedLetter(item);
      celebrateSmall();
      addStars(1);
      practice(`letter:${item.letter}`, true, 1, 1);
      void speak(`${item.letter}, ${item.letter}, ${item.phonics}. ${item.word}!`, { lang: 'en-US' });
    },
    [addStars, practice],
  );

  const handleCvcFuse = useCallback(() => {
    sfxCorrect();
    celebrateBig();
    sfxWin();
    triggerHaptic([40, 30, 40, 30, 70]);
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    addStars(1);
    practice('word:cvc-fusion', true, 2, 1);
    void speak(`${currentCvc.c1}, ${currentCvc.v}, ${currentCvc.c2}... ${currentCvc.word}! ${currentCvc.meaning}!`, { lang: 'en-US' });
  }, [currentCvc, streak, addStars, practice]);

  const handleFamilyWordClick = useCallback((wIdx: number) => {
    sfxTap();
    triggerHaptic(25);
    setFamilyWordIdx(wIdx);
    const targetWord = currentFamily.words[wIdx];
    if (targetWord) {
      celebrateSmall();
      sfxCorrect();
      addStars(1);
      practice(`word:family-${targetWord.word}`, true, 1, 1);
      void speak(`${targetWord.prefix}, ${currentFamily.family}... ${targetWord.word}! ${targetWord.meaning}!`, { lang: 'en-US' });
    }
  }, [currentFamily, addStars, practice]);

  const handlePickQuizOption = useCallback((opt: PhonicsLetter) => {
    if (answeredOpt !== null) return;
    setAnsweredOpt(opt.letter);

    if (opt.letter === currentQuiz.target.letter) {
      sfxCorrect();
      celebrateSmall();
      triggerHaptic([30, 40, 60]);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      addStars(1);
      practice(`letter:${opt.letter}`, true, 1, 1);
      void speak(`Great! ${opt.letter} says ${opt.phonics}. ${opt.word}!`, { lang: 'en-US' });
    } else {
      sfxWrong();
      triggerHaptic(50);
      setStreak(0);
      void speak(`Try again! ${currentQuiz.target.letter} says ${currentQuiz.target.phonics}.`, { lang: 'en-US' });
    }

    setTimeout(() => {
      setAnsweredOpt(null);
      setQuizIdx((i) => (i + 1) % PHONICS_LETTERS.length);
    }, 1500);
  }, [answeredOpt, currentQuiz, streak, addStars, practice]);

  // 全局快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (mode === 'cvc' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleCvcFuse();
      } else if (mode === 'quiz' && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const opt = currentQuiz.options[idx];
        if (opt) {
          e.preventDefault();
          handlePickQuizOption(opt);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleCvcFuse, currentQuiz.options, handlePickQuizOption]);

  return (
    <div className="space-y-4">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-sky-900 font-bold bg-sky-50/90 px-3 py-1 rounded-xl border border-sky-200">
          ⌨️ 键盘快捷操作：听音选泡泡按数字键 1-4 · CVC 拼读按空格/Enter 融合
        </span>
      </div>

      {/* 顶部四大模式导航 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200" role="tablist" aria-label="自然拼读模式导航">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'bubbles'}
            onClick={() => {
              sfxTap();
              triggerHaptic(20);
              setMode('bubbles');
            }}
            className={`min-h-[44px] py-1.5 px-3 rounded-xl font-black text-xs transition-all flex items-center gap-1 border focus-visible:ring-4 focus-visible:ring-sky-300 focus:outline-none ${
              mode === 'bubbles'
                ? 'bg-sky-500 text-white border-sky-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 active:scale-95'
            }`}
          >
            <span>🫧</span>
            <span>26字母发音</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'cvc'}
            onClick={() => {
              sfxTap();
              triggerHaptic(20);
              setMode('cvc');
            }}
            className={`min-h-[44px] py-1.5 px-3 rounded-xl font-black text-xs transition-all flex items-center gap-1 border focus-visible:ring-4 focus-visible:ring-purple-300 focus:outline-none ${
              mode === 'cvc'
                ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 active:scale-95'
            }`}
          >
            <span>🎰</span>
            <span>CVC三拼机 (16词)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'family'}
            onClick={() => {
              sfxTap();
              triggerHaptic(20);
              setMode('family');
            }}
            className={`min-h-[44px] py-1.5 px-3 rounded-xl font-black text-xs transition-all flex items-center gap-1 border focus-visible:ring-4 focus-visible:ring-emerald-300 focus:outline-none ${
              mode === 'family'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 active:scale-95'
            }`}
          >
            <span>🚂</span>
            <span>Word Family 韵律火车</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'quiz'}
            onClick={() => {
              sfxTap();
              triggerHaptic(20);
              setMode('quiz');
              setAnsweredOpt(null);
              void speak(`Listen carefully: which letter says ${currentQuiz.target.phonics}?`, { lang: 'en-US' });
            }}
            className={`min-h-[44px] py-1.5 px-3 rounded-xl font-black text-xs transition-all flex items-center gap-1 border focus-visible:ring-4 focus-visible:ring-amber-300 focus:outline-none ${
              mode === 'quiz'
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 active:scale-95'
            }`}
          >
            <span>🎯</span>
            <span>听音戳气球</span>
          </button>
        </div>

        <StreakBar streak={streak} target={3} />
      </div>

      {/* 模式 1：26 字母自然发音气泡 */}
      {mode === 'bubbles' && (
        <div className="bg-gradient-to-br from-sky-50 via-indigo-50 to-pink-50 rounded-3xl border-3 border-sky-200 p-5 shadow-sm space-y-4">
          {/* 选定字母大卡片 */}
          <motion.div
            key={selectedLetter.letter}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border-2 border-sky-100 p-5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div
                className={`h-20 w-20 rounded-3xl bg-gradient-to-br ${selectedLetter.color} text-white font-black text-4xl flex items-center justify-center shadow-lg`}
              >
                {selectedLetter.letter}
              </div>
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-800">{selectedLetter.letter}</span>
                  <span className="text-base font-bold text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                    {selectedLetter.phonics}
                  </span>
                </div>
                <p className="text-base font-black text-slate-700">
                  {selectedLetter.word} <span className="text-sm font-bold text-slate-400">({selectedLetter.meaning})</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-5xl">{selectedLetter.emoji}</span>
              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  void speak(`${selectedLetter.letter}, ${selectedLetter.phonics}, ${selectedLetter.word}!`, { lang: 'en-US' });
                }}
                className="px-4 py-2 rounded-2xl bg-sky-500 text-white font-black text-xs shadow-md flex items-center gap-1.5 hover:bg-sky-600"
              >
                <span>🔊</span>
                <span>标准跟读</span>
              </button>
            </div>
          </motion.div>

          {/* 26 字母气泡网格 */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2.5">
            {PHONICS_LETTERS.map((item) => {
              const isSelected = selectedLetter.letter === item.letter;
              return (
                <motion.button
                  key={item.letter}
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handlePickBubble(item)}
                  className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-sky-500 text-white border-sky-600 shadow-md ring-4 ring-sky-200 scale-105'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
                  }`}
                >
                  <span className="text-xl font-black">{item.letter}</span>
                  <span className="text-xs font-bold opacity-80">{item.phonics}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* 模式 2：CVC 经典三拼拼读机 (16 个词汇) */}
      {mode === 'cvc' && (
        <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 rounded-3xl border-3 border-purple-200 p-5 shadow-sm space-y-4 text-center">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h4 className="text-base font-black text-slate-800">CVC 自然拼读魔法拼读机 (第 {cvcIdx + 1}/{CVC_WORDS.length} 词)</h4>
              <p className="text-xs text-purple-600 font-bold">辅音 + 元音 + 辅音，连读变单词！</p>
            </div>
            <button
              type="button"
              onClick={() => {
                sfxTap();
                setCvcIdx((i) => (i + 1) % CVC_WORDS.length);
              }}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50"
            >
              🔄 换一个词
            </button>
          </div>

          {/* 三槽位滚轮拼读卡片 */}
          <div className="flex justify-center items-center gap-3 py-4">
            <motion.div
              key={`c1-${currentCvc.c1}`}
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="h-20 w-18 rounded-3xl bg-blue-500 text-white font-black text-4xl flex items-center justify-center shadow-md"
            >
              {currentCvc.c1}
            </motion.div>
            <span className="text-2xl font-black text-purple-400">+</span>
            <motion.div
              key={`v-${currentCvc.v}`}
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="h-20 w-18 rounded-3xl bg-rose-500 text-white font-black text-4xl flex items-center justify-center shadow-md"
            >
              {currentCvc.v}
            </motion.div>
            <span className="text-2xl font-black text-purple-400">+</span>
            <motion.div
              key={`c2-${currentCvc.c2}`}
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="h-20 w-18 rounded-3xl bg-blue-500 text-white font-black text-4xl flex items-center justify-center shadow-md"
            >
              {currentCvc.c2}
            </motion.div>
          </div>

          {/* 合体连读按钮 */}
          <button
            type="button"
            onClick={handleCvcFuse}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            ⚡ 魔法合体连读 ➔ {currentCvc.word.toUpperCase()} {currentCvc.emoji}
          </button>
        </div>
      )}

      {/* 模式 3：Word Family 韵律小火车 */}
      {mode === 'family' && (
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-50 rounded-3xl border-3 border-emerald-300 p-5 shadow-sm space-y-4">
          {/* 5 大家族选择 */}
          <div className="flex flex-wrap gap-2 justify-center">
            {WORD_FAMILIES.map((fam, idx) => {
              const isSel = familyIdx === idx;
              return (
                <button
                  key={fam.family}
                  type="button"
                  onClick={() => {
                    sfxTap();
                    setFamilyIdx(idx);
                    setFamilyWordIdx(0);
                  }}
                  className={`py-2 px-3.5 rounded-2xl font-black text-xs transition-all border-2 flex items-center gap-1.5 shadow-sm ${
                    isSel
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-105'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <span>{fam.emoji}</span>
                  <span>{fam.themeName}</span>
                </button>
              );
            })}
          </div>

          {/* 韵律火车大舞台 */}
          <div className="bg-white rounded-3xl p-6 border-2 border-emerald-200 shadow-inner text-center space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                🚂 韵律车头：元音【{currentFamily.vowel}】+ 词尾【{currentFamily.family}】
              </span>
              <span className="text-3xl">{currentFamilyWord.emoji}</span>
            </div>

            {/* 单词组装车厢 */}
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="h-16 w-16 rounded-2xl bg-sky-500 text-white font-black text-3xl flex items-center justify-center shadow">
                {currentFamilyWord.prefix}
              </div>
              <span className="text-2xl font-black text-emerald-600">+</span>
              <div className="h-16 w-24 rounded-2xl bg-emerald-600 text-white font-black text-3xl flex items-center justify-center shadow">
                {currentFamily.family}
              </div>
              <span className="text-2xl font-black text-slate-400">=</span>
              <div className="h-16 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-3xl flex items-center justify-center shadow-lg">
                {currentFamilyWord.word}
              </div>
            </div>

            <p className="text-sm font-black text-slate-700">
              中文释义：<span className="text-emerald-600 font-bold">{currentFamilyWord.meaning}</span>
            </p>

            {/* 家族成员车厢网格 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {currentFamily.words.map((w, wIdx) => {
                const isCur = familyWordIdx === wIdx;
                return (
                  <button
                    key={w.word}
                    type="button"
                    onClick={() => handleFamilyWordClick(wIdx)}
                    className={`p-3 rounded-2xl border-2 font-black transition-all flex flex-col items-center gap-1 shadow-sm ${
                      isCur
                        ? 'bg-emerald-500 text-white border-emerald-600 ring-4 ring-emerald-200 scale-105'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    <span className="text-2xl">{w.emoji}</span>
                    <span className="text-base font-black">{w.word}</span>
                    <span className="text-xs opacity-80">{w.meaning}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 模式 4：听音戳气球大冒险 */}
      {mode === 'quiz' && (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-3xl border-3 border-amber-200 p-5 shadow-sm space-y-4 text-center">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-black text-slate-800">听音辨字母挑战</h4>
            <button
              type="button"
              onClick={() => {
                sfxTap();
                void speak(`Listen: which letter says ${currentQuiz.target.phonics}?`, { lang: 'en-US' });
              }}
              className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-black text-amber-800 flex items-center gap-1"
            >
              <span>🔊</span>
              <span>重听发音</span>
            </button>
          </div>

          <motion.div
            key={currentQuiz.target.letter}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl border-2 border-amber-100 p-5 text-center space-y-2"
          >
            <p className="text-xs font-bold text-amber-700">请选出自然发音为该音标的字母：</p>
            <div className="text-3xl font-black text-amber-600">{currentQuiz.target.phonics}</div>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {currentQuiz.options.map((opt) => {
              const isPicked = answeredOpt === opt.letter;
              const isCorrect = opt.letter === currentQuiz.target.letter;

              return (
                <motion.button
                  key={opt.letter}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePickQuizOption(opt)}
                  className={`p-5 rounded-3xl border-3 font-black text-3xl transition-all shadow-sm ${
                    isPicked
                      ? isCorrect
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700 ring-4 ring-emerald-200'
                        : 'bg-rose-50 border-rose-400 text-rose-700 ring-4 ring-rose-200'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-amber-400'
                  }`}
                >
                  {opt.letter}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
