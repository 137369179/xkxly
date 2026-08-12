/**
 * CVC 单词字母拖拽拼字组件 🔤 (CVC Word Builder)
 * ------------------------------------------------------------
 * 自然拼读极速拼词：
 * 点击/拖拽发音字母块，拼出目标单词 (c - a - t -> cat)
 */

import { useState } from 'react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';

interface CvcTarget {
  word: string;
  letters: string[];
  emoji: string;
  meaning: string;
  options: string[];
}

const CVC_WORDS: CvcTarget[] = [
  { word: 'cat', letters: ['c', 'a', 't'], emoji: '🐱', meaning: '猫咪', options: ['c', 'b', 'a', 't', 'p', 'o'] },
  { word: 'dog', letters: ['d', 'o', 'g'], emoji: '🐶', meaning: '小狗', options: ['d', 'o', 'g', 'a', 't', 'u'] },
  { word: 'pig', letters: ['p', 'i', 'g'], emoji: '🐷', meaning: '小猪', options: ['p', 'i', 'g', 'e', 'n', 'b'] },
  { word: 'bus', letters: ['b', 'u', 's'], emoji: '🚌', meaning: '巴士', options: ['b', 'u', 's', 'c', 'a', 'r'] },
  { word: 'sun', letters: ['s', 'u', 'n'], emoji: '☀️', meaning: '太阳', options: ['s', 'u', 'n', 'o', 't', 'p'] },
  { word: 'pen', letters: ['p', 'e', 'n'], emoji: '🖊️', meaning: '钢笔', options: ['p', 'e', 'n', 'a', 't', 'i'] },
  { word: 'fox', letters: ['f', 'o', 'x'], emoji: '🦊', meaning: '狐狸', options: ['f', 'o', 'x', 'a', 't', 'u'] },
  { word: 'hat', letters: ['h', 'a', 't'], emoji: '🎩', meaning: '帽子', options: ['h', 'a', 't', 'o', 'e', 'g'] },
];

export function CvcWordBuilder() {
  const [idx, setIdx] = useState(0);
  const current = CVC_WORDS[idx]!!
  const [userLetters, setUserLetters] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | ''>('');

  const handlePickLetter = (letter: string) => {
    sfxTap();
    speak(letter, { lang: 'en-US', rate: 0.8 });
    if (userLetters.length >= current.letters.length) return;
    const nextList = [...userLetters, letter];
    setUserLetters(nextList);

    if (nextList.length === current.letters.length) {
      if (nextList.join('') === current.word) {
        sfxCorrect();
        setFeedback('correct');
        speak(`${current.word}! ${current.meaning}!`, { lang: 'en-US', rate: 0.8 });
      } else {
        sfxWrong();
        setFeedback('wrong');
        speak('Try again!', { lang: 'en-US' });
      }
    }
  };

  const handleClear = () => {
    sfxTap();
    setUserLetters([]);
    setFeedback('');
  };

  const handleNext = () => {
    sfxTap();
    setUserLetters([]);
    setFeedback('');
    setIdx((idx + 1) % CVC_WORDS.length);
  };

  return (
    <div className="rounded-3xl border-2 border-pink-300 bg-gradient-to-r from-pink-50 via-purple-50 to-amber-50 p-5 text-center space-y-4 shadow-fluffy">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-pink-700 shadow-sm">
          🔤 自然拼读拖拽拼词 ({idx + 1} / {CVC_WORDS.length})
        </span>
        <span className="text-3xl">{current.emoji}</span>
      </div>

      <div className="text-xl font-black text-pink-900">
        拼出单词：<span className="text-pink-600">{current.meaning}</span>
      </div>

      {/* 用户拼词格子 */}
      <div className="flex justify-center gap-3">
        {current.letters.map((_, i) => (
          <div
            key={`_-${i}`}
            className={`flex h-16 w-16 items-center justify-center rounded-2xl border-4 text-3xl font-black shadow-sm transition-all ${
              userLetters[i]
                ? 'border-pink-500 bg-pink-400 text-white scale-105'
                : 'border-dashed border-pink-300 bg-white text-gray-400'
            }`}
          >
            {userLetters[i] || '?'}
          </div>
        ))}
      </div>

      {/* 字母选块 */}
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        {current.options.map((l, i) => (
          <button
            key={`l-${i}`}
            onClick={() => handlePickLetter(l)}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-pink-200 bg-white text-2xl font-black text-pink-900 shadow-sm hover:scale-110 active:scale-95 transition-transform"
          >
            {l}
          </button>
        ))}
      </div>

      {/* 按钮区域 */}
      <div className="flex justify-center gap-3 pt-2">
        <CandyButton tone="pink" variant="soft" size="sm" onClick={handleClear}>
          🔄 清空重新拼
        </CandyButton>
        {feedback === 'correct' && (
          <CandyButton tone="orange" size="sm" onClick={handleNext}>
            🚀 下一个单词 ➔
          </CandyButton>
        )}
      </div>

      {feedback === 'correct' && (
        <div className="text-sm font-black text-green-700 animate-bounce">
          🎉 太棒了！拼对了！{current.word.toUpperCase()}！
        </div>
      )}
      {feedback === 'wrong' && (
        <div className="text-sm font-black text-rose-700">
          😅 顺序不太对，再试一次吧！
        </div>
      )}
    </div>
  );
}
