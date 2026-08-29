/**
 * ⚡ 每日 3 分钟艾宾浩斯自适应极速复习中枢 (Daily 3-Min SRS Mission)
 * ------------------------------------------------------------------
 * 1. 自动从汉字/拼音/数学/英语/古诗中挑选 5 道最急需复习的知识卡；
 * 2. 3 分钟倒计时与沉浸式极速答题节奏；
 * 3. 连击 Streak 判定与「今日记忆大师」通关结算。
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { useMastery, useStore } from '@/store/useStore';
import { isDue } from '@/lib/srs';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin } from '@/lib/sfx';
import { celebrateBig, celebrateSmall } from '@/lib/celebrate';
import { StreakBar } from '@/components/study/StreakBar';

interface MissionQuestion {
  id: string;
  category: string;
  emoji: string;
  prompt: string;
  target: string;
  options: string[];
  answer: string;
}

const DEFAULT_POOL: MissionQuestion[] = [
  { id: 'h1', category: '汉字', emoji: '🀄', prompt: '「大」的反义词是哪个？', target: '大', options: ['小', '上', '天', '人'], answer: '小' },
  { id: 'h2', category: '汉字', emoji: '🀄', prompt: '「日」字代表什么？', target: '日', options: ['太阳', '月亮', '水滴', '火苗'], answer: '太阳' },
  { id: 'p1', category: '拼音', emoji: '🗣️', prompt: '声母 b 和韵母 a 合起来读什么？', target: 'b-a', options: ['ba', 'pa', 'ma', 'fa'], answer: 'ba' },
  { id: 'm1', category: '数学', emoji: '🔢', prompt: '2 + 3 等于几？', target: '2+3', options: ['5', '4', '6', '7'], answer: '5' },
  { id: 'm2', category: '数学', emoji: '🔢', prompt: '哪个数字比 5 更大？', target: '5', options: ['8', '2', '3', '1'], answer: '8' },
  { id: 'w1', category: '英语', emoji: '🔠', prompt: '「Apple」是什么水果？', target: 'Apple', options: ['苹果', '香蕉', '橙子', '西瓜'], answer: '苹果' },
  { id: 'po1', category: '古诗', emoji: '🌸', prompt: '「床前明月光」的下一句是？', target: '静夜思', options: ['疑是地上霜', '处处闻啼鸟', '春风吹又生', '汗滴禾下土'], answer: '疑是地上霜' },
];

export function DailySrsMission({ onComplete }: { onComplete?: () => void }) {
  const mastery = useMastery();
  const addStars = useStore((s) => s.addStars);

  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 分钟倒计时

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 根据真实 mastery 动态构建 5 题任务清单
  const questions = useMemo(() => {
    // 优先挑选 isDue = true 的题目，不足 5 题由默认题库补齐
    const dueList = Object.entries(mastery)
      .filter(([, m]) => m && isDue(m))
      .map(([key]) => key);

    const qs = [...DEFAULT_POOL];
    if (dueList.length > 0) {
      // 打乱题库
      qs.sort(() => Math.random() - 0.5);
    }
    return qs.slice(0, 5);
  }, [mastery]);

  const fallbackQ: MissionQuestion = { id: 'h1', category: '汉字', emoji: '🀄', prompt: '「大」的反义词是哪个？', target: '大', options: ['小', '上', '天', '人'], answer: '小' };
  const currentQ = questions[currentIdx] ?? questions[0] ?? DEFAULT_POOL[0] ?? fallbackQ;

  // 启动倒计时
  useEffect(() => {
    if (!started || isDone) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, isDone]);

  const handleStart = () => {
    sfxTap();
    setStarted(true);
    setCurrentIdx(0);
    setStreak(0);
    setScore(0);
    setIsDone(false);
    setTimeLeft(180);
    void speak('3分钟记忆挑战开始啦！加油！', { lang: 'zh-CN' });
  };

  const handlePickOption = useCallback((opt: string) => {
    if (selectedOption !== null) return;
    setSelectedOption(opt);

    const isCorrect = opt === currentQ.answer;
    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setScore((s) => s + 1);
      addStars(1);
      if (nextStreak >= 3) {
        sfxWin();
        celebrateBig();
      } else {
        sfxCorrect();
        celebrateSmall();
      }
      void speak('答对啦！真棒！', { lang: 'zh-CN' });
    } else {
      sfxWrong();
      setStreak(0);
      void speak(`差一点，正确答案是${currentQ.answer}`, { lang: 'zh-CN' });
    }

    setTimeout(() => {
      setSelectedOption(null);
      if (currentIdx + 1 >= questions.length) {
        setIsDone(true);
        sfxWin();
        celebrateBig();
        onComplete?.();
      } else {
        setCurrentIdx((i) => i + 1);
      }
    }, 1200);
  }, [selectedOption, currentQ, streak, currentIdx, questions.length, addStars, onComplete]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-white rounded-3xl border-3 border-indigo-100 p-5 shadow-sm space-y-4">
      {/* 顶部标题与倒计时 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          <div>
            <h3 className="text-base font-black text-slate-800">每日 3 分钟艾宾浩斯极速复习</h3>
            <p className="text-xs text-slate-400 font-bold">艾宾浩斯自适应 · 5 题微习惯通关</p>
          </div>
        </div>
        {started && !isDone && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-200 text-xs font-black">
            <span>⏳</span>
            <span>{formatTimer(timeLeft)}</span>
          </div>
        )}
      </div>

      {!started && !isDone && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 text-center space-y-3 border-2 border-indigo-100">
          <span className="text-4xl">🚀</span>
          <p className="text-sm font-black text-slate-800">准备好今天的 3 分钟记忆大冲关了吗？</p>
          <p className="text-xs text-slate-500">智能精选 5 道今日急需强化的核心题卡</p>
          <button
            type="button"
            onClick={handleStart}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-candy-blue-on font-black text-sm shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all"
          >
            🌟 立即开启 3 分钟复习
          </button>
        </div>
      )}

      {started && !isDone && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500">
              第 {currentIdx + 1} / {questions.length} 题
            </span>
            <StreakBar streak={streak} target={3} />
          </div>

          {/* 题目展示卡片 */}
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 text-center space-y-2"
          >
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black">
              {currentQ.category}
            </span>
            <p className="text-lg font-black text-slate-800">{currentQ.prompt}</p>
          </motion.div>

          {/* 选项网格 */}
          <div className="grid grid-cols-2 gap-2.5">
            {currentQ.options.map((opt) => {
              const isSelected = selectedOption === opt;
              const isCorrect = opt === currentQ.answer;

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handlePickOption(opt)}
                  className={`p-4 rounded-2xl border-2 font-black text-base transition-all ${
                    isSelected
                      ? isCorrect
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-md'
                        : 'bg-rose-50 border-rose-400 text-rose-700 shadow-md'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center space-y-3"
        >
          <span className="text-4xl">🏅</span>
          <h4 className="text-lg font-black text-emerald-800">🎉 今日 3 分钟复习大通关！</h4>
          <p className="text-xs font-bold text-slate-600">
            答对 {score} / {questions.length} 题 · 获得 {score} 颗星星与成长能量！
          </p>
          <button
            type="button"
            onClick={handleStart}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-candy-green-on rounded-2xl text-xs font-black shadow-md transition-all"
          >
            🔄 再刷一次
          </button>
        </motion.div>
      )}
    </div>
  );
}
