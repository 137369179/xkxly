import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { HanziEntry } from '@/data/hanzi';
import { HANZI_DATA } from '@/data/hanzi';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxPurr, sfxStar } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';

interface Props {
  char: HanziEntry;
  onComplete: (stars: number) => void;
}

export function HanziGamePractice({ char, onComplete }: Props) {
  const [subGameIdx, setSubGameIdx] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);

  // 生成混淆干扰项
  const distractors = HANZI_DATA.filter((h) => h.c !== char.c)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3)
    .map((h) => h.c);

  // 关卡 1 选项：投喂美味鱼干 (4 选 1)
  const [feedOptions] = useState<string[]>(() => {
    return [char.c, ...distractors].sort(() => 0.5 - Math.random());
  });

  // 关卡 2 选项：听音辨字 (4 选 1)
  const [soundOptions] = useState<string[]>(() => {
    return [char.c, ...distractors.slice(0, 3)].sort(() => 0.5 - Math.random());
  });

  // 关卡 3 选项：组词气泡 (找缺字)
  const targetWord = char.words[0] ?? `${char.c}天`;
  const [blankOptions] = useState<string[]>(() => {
    return [char.c, ...distractors.slice(0, 2)].sort(() => 0.5 - Math.random());
  });

  useEffect(() => {
    if (subGameIdx === 0) {
      speak(`第一关：请把写着「${char.c}」字的小鱼干喂给萌宠吧！`);
    } else if (subGameIdx === 1) {
      speak(`第二关：仔细听发音「${char.pd}」，请找出对应的汉字。`);
    } else if (subGameIdx === 2) {
      speak(`第三关：词语配对！请选出能组成「${targetWord}」的汉字。`);
    }
  }, [subGameIdx, char, targetWord]);

  const handlePick = (pickedChar: string) => {
    setSelectedOpt(pickedChar);
    if (pickedChar === char.c) {
      sfxCorrect();
      sfxPurr();
      setFeedback('correct');
      setScore((s) => s + 1);

      setTimeout(() => {
        setFeedback(null);
        setSelectedOpt(null);
        if (subGameIdx < 2) {
          setSubGameIdx((i) => i + 1);
        } else {
          celebrateSmall();
          sfxStar();
          onComplete(3);
        }
      }, 1000);
    } else {
      sfxWrong();
      setFeedback('wrong');
      speak(`不对哦，这是「${pickedChar}」，再试一次找「${char.c}」吧！`);
      setTimeout(() => {
        setFeedback(null);
        setSelectedOpt(null);
      }, 1200);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[460px] p-4 text-slate-800">
      {/* 顶部进度与标题 */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100/80 border border-emerald-300 rounded-full text-emerald-900 font-bold text-sm">
          <span>🎯 趣味过关 · 关卡 {subGameIdx + 1}/3</span>
          <span className="text-xs bg-emerald-200 px-2 py-0.5 rounded-full font-mono">得分: {score}⭐</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800">
          {subGameIdx === 0 && '🐟 投喂萌宠识汉字'}
          {subGameIdx === 1 && `🎧 听音辨字找「${char.pd}」`}
          {subGameIdx === 2 && '🎈 词语连线消消乐'}
        </h2>
      </div>

      {/* 核心游戏互动区 (Mini-game Zone) */}
      <div className="relative w-full max-w-md my-4 p-6 bg-gradient-to-b from-emerald-50 to-teal-50/70 rounded-3xl border-2 border-emerald-200 shadow-xl flex flex-col items-center justify-center min-h-[260px]">
        {/* 关卡 1: 投喂萌宠 */}
        {subGameIdx === 0 && (
          <div className="flex flex-col items-center w-full space-y-4">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-6xl select-none"
            >
              🐱 🍽️
            </motion.div>
            <p className="text-xs font-bold text-emerald-800 bg-white/80 px-3 py-1 rounded-full border border-emerald-200">
              请找出「<span className="text-emerald-600 font-black text-sm">{char.c}</span>」喂给小猫咪：
            </p>

            <div className="grid grid-cols-2 gap-3 w-full max-w-xs pt-1">
              {feedOptions.map((opt) => (
                <motion.button
                  key={opt}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePick(opt)}
                  className={`p-3 bg-white hover:bg-amber-50 rounded-2xl border-2 font-black text-2xl shadow-md transition-all flex items-center justify-center gap-2 ${
                    selectedOpt === opt
                      ? feedback === 'correct'
                        ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                        : 'border-rose-400 bg-rose-100 text-rose-800'
                      : 'border-emerald-200 text-slate-800'
                  }`}
                >
                  <span>🐟</span>
                  <span>{opt}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* 关卡 2: 听音辨字 */}
        {subGameIdx === 1 && (
          <div className="flex flex-col items-center w-full space-y-4">
            <button
              type="button"
              onClick={() => {
                sfxTap();
                speak(char.pd);
              }}
              className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-candy-green-on rounded-2xl font-black text-base shadow-md flex items-center gap-2 animate-pulse hover:scale-105 transition-transform"
            >
              <span>🔊</span>
              <span>点击听发音 [{char.pd}]</span>
            </button>

            <p className="text-xs font-bold text-emerald-800">
              上面发音对应的是哪一个汉字？
            </p>

            <div className="grid grid-cols-4 gap-2 w-full pt-1">
              {soundOptions.map((opt) => (
                <motion.button
                  key={opt}
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handlePick(opt)}
                  className={`py-4 bg-white rounded-2xl border-2 font-black text-2xl shadow-sm transition-all text-center ${
                    selectedOpt === opt
                      ? feedback === 'correct'
                        ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                        : 'border-rose-400 bg-rose-100 text-rose-800'
                      : 'border-emerald-200 text-slate-800 hover:border-emerald-400'
                  }`}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* 关卡 3: 词语配对 */}
        {subGameIdx === 2 && (
          <div className="flex flex-col items-center w-full space-y-4">
            <div className="p-4 bg-white/90 rounded-2xl border-2 border-dashed border-emerald-300 shadow-sm flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">组词目标：</span>
              <span className="text-xl font-black text-emerald-700 tracking-widest font-mono">
                {targetWord.replace(char.c, ' ❓ ')}
              </span>
            </div>

            <p className="text-xs font-bold text-emerald-800">
              选出正确的字补全词语「{targetWord}」：
            </p>

            <div className="grid grid-cols-3 gap-3 w-full max-w-xs pt-1">
              {blankOptions.map((opt) => (
                <motion.button
                  key={opt}
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handlePick(opt)}
                  className={`p-3 bg-white rounded-2xl border-2 font-black text-2xl shadow-md transition-all text-center ${
                    selectedOpt === opt
                      ? feedback === 'correct'
                        ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                        : 'border-rose-400 bg-rose-100 text-rose-800'
                      : 'border-emerald-200 text-slate-800 hover:bg-emerald-50'
                  }`}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* 即时反馈弹层 */}
        <AnimatePresence>
          {feedback === 'correct' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 bg-emerald-500/90 rounded-3xl flex flex-col items-center justify-center text-candy-green-on p-4 text-center z-10"
            >
              <span className="text-5xl mb-1">🎉 答对啦！</span>
              <span className="text-sm font-bold">棒极了！继续下一关！</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部重听按钮 */}
      <div className="w-full max-w-md flex items-center justify-center pt-2">
        <button
          type="button"
          onClick={() => speak(`当前字是「${char.c}」，拼音是 ${char.pd}`)}
          className="px-5 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-emerald-300"
        >
          <span>🔊</span>
          <span>再听一次题目提示</span>
        </button>
      </div>
    </div>
  );
}
