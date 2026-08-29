import { useState, useCallback, useEffect } from 'react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong, triggerHaptic } from '@/lib/sfx';
import { speak, speakLetter } from '@/lib/speech';
import { celebrateSmall } from '@/lib/celebrate';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'motion/react';

interface CvcTarget {
  word: string;
  letters: string[];
  emoji: string;
  meaning: string;
  phonics: string[];
  options: string[];
}

const CVC_WORDS: CvcTarget[] = [
  { word: 'cat', letters: ['c', 'a', 't'], emoji: '🐱', meaning: '猫咪', phonics: ['/k/', '/æ/', '/t/'], options: ['c', 'b', 'a', 't', 'p', 'o'] },
  { word: 'dog', letters: ['d', 'o', 'g'], emoji: '🐶', meaning: '小狗', phonics: ['/d/', '/ɒ/', '/g/'], options: ['d', 'o', 'g', 'a', 't', 'u'] },
  { word: 'pig', letters: ['p', 'i', 'g'], emoji: '🐷', meaning: '小猪', phonics: ['/p/', '/ɪ/', '/g/'], options: ['p', 'i', 'g', 'e', 'n', 'b'] },
  { word: 'bus', letters: ['b', 'u', 's'], emoji: '🚌', meaning: '巴士', phonics: ['/b/', '/ʌ/', '/s/'], options: ['b', 'u', 's', 'c', 'a', 'r'] },
  { word: 'sun', letters: ['s', 'u', 'n'], emoji: '☀️', meaning: '太阳', phonics: ['/s/', '/ʌ/', '/n/'], options: ['s', 'u', 'n', 'o', 't', 'p'] },
  { word: 'pen', letters: ['p', 'e', 'n'], emoji: '🖊️', meaning: '钢笔', phonics: ['/p/', '/e/', '/n/'], options: ['p', 'e', 'n', 'a', 't', 'i'] },
  { word: 'fox', letters: ['f', 'o', 'x'], emoji: '🦊', meaning: '狐狸', phonics: ['/f/', '/ɒ/', '/ks/'], options: ['f', 'o', 'x', 'a', 't', 'u'] },
  { word: 'hat', letters: ['h', 'a', 't'], emoji: '🎩', meaning: '帽子', phonics: ['/h/', '/æ/', '/t/'], options: ['h', 'a', 't', 'o', 'e', 'g'] },
  { word: 'bed', letters: ['b', 'e', 'd'], emoji: '🛏️', meaning: '小床', phonics: ['/b/', '/e/', '/d/'], options: ['b', 'e', 'd', 'p', 'a', 't'] },
  { word: 'cup', letters: ['c', 'u', 'p'], emoji: '🥛', meaning: '杯子', phonics: ['/k/', '/ʌ/', '/p/'], options: ['c', 'u', 'p', 'b', 'o', 't'] },
  { word: 'bag', letters: ['b', 'a', 'g'], emoji: '🎒', meaning: '书包', phonics: ['/b/', '/æ/', '/g/'], options: ['b', 'a', 'g', 'p', 'e', 'd'] },
  { word: 'map', letters: ['m', 'a', 'p'], emoji: '🗺️', meaning: '地图', phonics: ['/m/', '/æ/', '/p/'], options: ['m', 'a', 'p', 'n', 'u', 't'] },
  { word: 'hen', letters: ['h', 'e', 'n'], emoji: '🐔', meaning: '母鸡', phonics: ['/h/', '/e/', '/n/'], options: ['h', 'e', 'n', 'p', 'o', 't'] },
  { word: 'net', letters: ['n', 'e', 't'], emoji: '🥅', meaning: '网兜', phonics: ['/n/', '/e/', '/t/'], options: ['n', 'e', 't', 'm', 'a', 'p'] },
  { word: 'bin', letters: ['b', 'i', 'n'], emoji: '🗑️', meaning: '垃圾桶', phonics: ['/b/', '/ɪ/', '/n/'], options: ['b', 'i', 'n', 'p', 'e', 'g'] },
  { word: 'box', letters: ['b', 'o', 'x'], emoji: '📦', meaning: '盒子', phonics: ['/b/', '/ɒ/', '/ks/'], options: ['b', 'o', 'x', 'f', 'u', 'n'] },
  { word: 'nut', letters: ['n', 'u', 't'], emoji: '🥜', meaning: '坚果', phonics: ['/n/', '/ʌ/', '/t/'], options: ['n', 'u', 't', 'c', 'a', 'p'] },
  { word: 'bug', letters: ['b', 'u', 'g'], emoji: '🐛', meaning: '小虫', phonics: ['/b/', '/ʌ/', '/g/'], options: ['b', 'u', 'g', 'l', 'e', 'g'] },
];

export function CvcWordBuilder() {
  const { t } = useTranslation();
  const practice = useStore((s) => s.practice);
  const [idx, setIdx] = useState(0);
  const current = CVC_WORDS[idx] ?? CVC_WORDS[0]!;
  const [userLetters, setUserLetters] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | ''>('');
  const [blendingStep, setBlendingStep] = useState<number | null>(null);

  const playBlending = useCallback(async () => {
    sfxTap();
    triggerHaptic(20);
    for (let i = 0; i < current.letters.length; i++) {
      setBlendingStep(i);
      const letter = current.letters[i]!;
      await speakLetter(letter);
      await new Promise(r => setTimeout(r, 180));
    }
    setBlendingStep(current.letters.length);
    await speak(current.word, { lang: 'en-US', rate: 0.75 });
    await new Promise(r => setTimeout(r, 200));
    setBlendingStep(null);
  }, [current]);

  const handlePickLetter = useCallback((letter: string) => {
    sfxTap();
    triggerHaptic(20);
    void speakLetter(letter).catch(() => {});
    if (userLetters.length >= current.letters.length) return;
    const nextList = [...userLetters, letter];
    setUserLetters(nextList);

    if (nextList.length === current.letters.length) {
      if (nextList.join('') === current.word) {
        sfxCorrect();
        triggerHaptic(45);
        celebrateSmall();
        setFeedback('correct');
        practice(`word:${current.word}`, true);
        void speak(`${current.word}! ${current.meaning}!`, { lang: 'en-US', rate: 0.8 }).catch(() => {});
      } else {
        sfxWrong();
        triggerHaptic([60, 40, 60]);
        setFeedback('wrong');
        practice(`word:${current.word}`, false);
        void speak('Try again!', { lang: 'en-US' }).catch(() => {});
      }
    }
  }, [userLetters, current, practice]);

  const handleRemoveSlot = useCallback((slotIdx: number) => {
    sfxTap();
    triggerHaptic(15);
    const next = [...userLetters];
    next.splice(slotIdx, 1);
    setUserLetters(next);
    setFeedback('');
  }, [userLetters]);

  const handleClear = useCallback(() => {
    sfxTap();
    triggerHaptic(20);
    setUserLetters([]);
    setFeedback('');
  }, []);

  const handleNext = useCallback(() => {
    sfxTap();
    triggerHaptic(25);
    setUserLetters([]);
    setFeedback('');
    setIdx((i) => (i + 1) % CVC_WORDS.length);
  }, []);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const optIdx = parseInt(e.key, 10) - 1;
        const opt = current.options[optIdx];
        if (opt) {
          e.preventDefault();
          handlePickLetter(opt);
        }
      } else if (e.key === 'Backspace') {
        if (userLetters.length > 0) {
          e.preventDefault();
          handleRemoveSlot(userLetters.length - 1);
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (feedback === 'correct') {
          handleNext();
        } else {
          void playBlending();
        }
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        const char = e.key.toLowerCase();
        if (current.options.includes(char)) {
          e.preventDefault();
          handlePickLetter(char);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [current, userLetters, feedback, handlePickLetter, handleRemoveSlot, handleNext, playBlending]);

  return (
    <div className="rounded-3xl border-3 border-candy-pink-soft/60 bg-gradient-to-br from-pink-50 via-purple-50 to-amber-50 p-5 text-center space-y-4 shadow-fluffy">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-pink-900 font-bold bg-pink-50/90 px-3 py-1 rounded-xl border border-pink-200">
          ⌨️ 键盘快捷操作：直接敲击字母 A-Z / 数字键 1-6 · 退格撤销 · 空格示范 / 下一词
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-pink-700 shadow-sm border border-pink-100">
          {t('cvcWordBuilder.badge', { current: idx + 1, total: CVC_WORDS.length })}
        </span>
        <button
          onClick={playBlending}
          className="rounded-full bg-candy-purple-soft px-3 py-1 text-xs font-black text-candy-purple-deep border border-candy-purple-deep/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
        >
          <span>✨ 示范拼读</span>
        </button>
      </div>

      <div className="text-center my-1">
        <motion.div
          key={current.word}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-7xl mb-1 inline-block"
        >
          {current.emoji}
        </motion.div>
        <div className="text-xl font-black text-ink">
          {t('cvcWordBuilder.spellPrompt')}<span className="text-candy-pink-deep underline decoration-wavy decoration-pink-300 ml-1">{current.meaning}</span>
        </div>
      </div>

      {/* 用户拼词积木插槽 */}
      <div className="flex justify-center gap-3 my-2">
        {current.letters.map((_, i) => {
          const isSlotFilled = !!userLetters[i];
          const isHighlight = blendingStep === i;
          return (
            <motion.button
              key={`slot-${i}`}
              onClick={() => isSlotFilled && handleRemoveSlot(i)}
              whileHover={isSlotFilled ? { scale: 1.05 } : {}}
              whileTap={isSlotFilled ? { scale: 0.95 } : {}}
              className={`flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-3 text-4xl font-black leading-tight shadow-md transition-all sm:text-5xl ${
                isSlotFilled
                  ? 'border-candy-pink-deep bg-gradient-to-b from-candy-pink-deep to-pink-500 text-candy-pink-on'
                  : 'border-dashed border-pink-300 bg-white/90 text-gray-300'
              } ${isHighlight ? 'ring-4 ring-candy-yellow-deep scale-110' : ''}`}
            >
              <span>{userLetters[i] || '?'}</span>
              <span className="text-xs font-bold opacity-75">{current.phonics[i]}</span>
            </motion.button>
          );
        })}
      </div>

      {/* 拼写反馈提示 */}
      <AnimatePresence mode="wait">
        {feedback === 'correct' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 text-lg font-black text-green-600 bg-green-100/90 py-2 rounded-2xl border border-green-300"
          >
            <span>🎉 太棒啦！{current.word.toUpperCase()} = {current.meaning}</span>
          </motion.div>
        )}
        {feedback === 'wrong' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 text-sm font-bold text-amber-700 bg-amber-100/90 py-2 rounded-2xl border border-amber-300"
          >
            <span>🤔 顺序不太对，点击字母格修改或重试哦！</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 候选字母卡片 */}
      <div className="flex flex-wrap justify-center gap-2.5 pt-2">
        {current.options.map((opt, i) => (
          <motion.button
            key={`opt-${i}-${opt}`}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => handlePickLetter(opt)}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-purple-200 bg-white text-3xl font-black leading-tight text-purple-900 shadow-md hover:bg-purple-50 active:bg-purple-100 sm:text-4xl"
          >
            {opt}
          </motion.button>
        ))}
      </div>

      {/* 操作栏 */}
      <div className="flex justify-center gap-3 pt-2">
        <CandyButton tone="purple" variant="soft" size="md" onClick={handleClear}>
          🔄 {t('cvcWordBuilder.clearBtn')}
        </CandyButton>
        <CandyButton tone="green" size="md" onClick={handleNext}>
          ✨ {t('cvcWordBuilder.nextBtn')}
        </CandyButton>
      </div>
    </div>
  );
}
