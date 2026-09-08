import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { CandyButton } from '@/components/ui/Button';
import { getAllPinyin } from '@/data/pinyinIndex';
import { type KingdomPinyinLevel } from '@/data/pinyinKingdomData';

interface PinyinPracticeMiniGamesProps {
  level: KingdomPinyinLevel;
  onPass?: () => void;
  className?: string;
}

type MiniGameType = 'balloon_pop' | 'tone_hat' | 'picture_match';

export function PinyinPracticeMiniGames({
  level,
  onPass,
  className = '',
}: PinyinPracticeMiniGamesProps) {
  const [gameMode, setGameMode] = useState<MiniGameType>('balloon_pop');
  const [score, setScore] = useState(0); // 0~3
  const [round, setRound] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);

  const allPinyinList = useMemo(() => getAllPinyin(), []);

  // ── 气球题目数据 ──
  const balloonOptions = useMemo(() => {
    const distractors = allPinyinList
      .filter((p) => p.p !== level.p)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((p) => p.p);

    const list = [level.p, ...distractors].sort(() => Math.random() - 0.5);
    return list;
  }, [allPinyinList, level.p, round]);

  // ── 声调帽子题目 ──
  const toneQuestion = useMemo(() => {
    const tones = level.tones || [
      { symbol: `${level.p} (1声)`, toneNum: 1, toneName: '一声平', carAction: '', word: '一声', hanzi: '一', emoji: '1️⃣' },
      { symbol: `${level.p} (2声)`, toneNum: 2, toneName: '二声扬', carAction: '', word: '二声', hanzi: '二', emoji: '2️⃣' },
      { symbol: `${level.p} (3声)`, toneNum: 3, toneName: '三声转', carAction: '', word: '三声', hanzi: '三', emoji: '3️⃣' },
      { symbol: `${level.p} (4声)`, toneNum: 4, toneName: '四声降', carAction: '', word: '四声', hanzi: '四', emoji: '4️⃣' },
    ];
    const target = tones[(round - 1) % tones.length] || tones[0]!;
    return {
      target,
      allTones: tones,
    };
  }, [level.tones, level.p, round]);

  // ── 图文配对题目 ──
  const pictureQuestion = useMemo(() => {
    const examples = level.examples.length > 0
      ? level.examples
      : [{ hanzi: level.name, word: level.name, pinyin: level.p, emoji: '🌟' }];
    const target = examples[(round - 1) % examples.length] || examples[0]!;

    const distractors = allPinyinList
      .filter((p) => p.p !== level.p)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((p) => ({
        pinyin: p.p,
        label: p.p,
      }));

    const options = [
      { pinyin: level.p, label: level.p },
      ...distractors,
    ].sort(() => Math.random() - 0.5);

    return {
      target,
      options,
    };
  }, [level.examples, level.name, level.p, allPinyinList, round]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (gameMode === 'balloon_pop') {
        speak(`请找出拼音：${level.p}`, { lang: 'zh-CN', rate: 0.7 });
      } else if (gameMode === 'tone_hat') {
        speak(`请给字母戴上正确的声调帽子：${toneQuestion.target.word}`, { lang: 'zh-CN', rate: 0.7 });
      } else if (gameMode === 'picture_match') {
        speak(`看图片，选出对应的拼音：${pictureQuestion.target.word}`, { lang: 'zh-CN', rate: 0.7 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [gameMode, level.p, toneQuestion.target.word, pictureQuestion.target.word, round]);

  const handleAnswer = (selected: string, correctTarget: string) => {
    const isCorrect = selected === correctTarget;
    if (isCorrect) {
      sfxCorrect();
      triggerHaptic([40, 30, 70]);
      celebrateSmall();
      setFeedback({ isCorrect: true, text: '太棒啦！答对啦！🎉' });

      const newScore = score + 1;
      setScore(newScore);

      setTimeout(() => {
        setFeedback(null);
        if (round >= 3 || newScore >= 3) {
          setIsCompleted(true);
          sfxWin();
          triggerHaptic([60, 40, 80, 50, 100]);
          celebrateBig();
          onPass?.();
        } else {
          setRound((r) => r + 1);
        }
      }, 1000);
    } else {
      sfxWrong();
      triggerHaptic(30);
      setFeedback({ isCorrect: false, text: '再仔细听一听哦！加油！💪' });
      setTimeout(() => {
        setFeedback(null);
      }, 1200);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto flex flex-col items-center select-none space-y-3.5 ${className}`}>
      {/* ── 顶部 3 种小莤小游戏切换标签 ── */}
      <div className="flex gap-2 p-1.5 bg-gradient-to-r from-amber-100 to-orange-100 rounded-full border-2 border-amber-300 shadow-sm">
        {[
          { id: 'balloon_pop', name: '🎈 听音戳气球' },
          { id: 'tone_hat', name: '🎩 声调魔术帽' },
          { id: 'picture_match', name: '🖼️ 看图配对' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              sfxTap();
              setGameMode(tab.id as MiniGameType);
              setRound(1);
            }}
            className={`px-3 py-1.5 text-xs font-black rounded-full transition-all cursor-pointer ${
              gameMode === tab.id
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md scale-102'
                : 'text-amber-950 hover:bg-amber-200'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* ── 答题进度与星级成就条 ── */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 bg-white/95 backdrop-blur-md rounded-2xl border-2 border-amber-300 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-amber-950">
            第 <span className="text-base text-purple-600">{round}</span>/3 题
          </span>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((star) => (
            <span
              key={star}
              className={`text-lg transition-all ${
                score >= star ? 'text-yellow-400 scale-125 filter drop-shadow' : 'text-slate-300 opacity-40'
              }`}
            >
              ★
            </span>
          ))}
        </div>
      </div>

      {/* ── 3D 游戏舞台区域 ── */}
      <div className="relative w-full h-80 bg-gradient-to-b from-sky-200 via-indigo-50 to-amber-50 rounded-3xl p-4 border-4 border-amber-300 shadow-xl flex flex-col items-center justify-between overflow-hidden">
        {/* 反馈提示横幅 */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              className={`absolute top-3 z-30 px-5 py-2 rounded-full font-black text-xs sm:text-sm shadow-xl border-2 ${
                feedback.isCorrect
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-white'
                  : 'bg-gradient-to-r from-rose-500 to-red-500 text-white border-white'
              }`}
            >
              {feedback.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 玩法 1：听音戳气球 ── */}
        {gameMode === 'balloon_pop' && (
          <div className="w-full h-full flex flex-col items-center justify-between">
            {/* 听音播放主按钮 */}
            <div className="flex flex-col items-center mt-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  sfxTap();
                  speak(level.p, { lang: 'zh-CN', rate: 0.6 });
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-full font-black text-sm shadow-lg border-2 border-white cursor-pointer animate-pulse"
              >
                <span>🔊 点击听音：找出</span>
                <span className="text-xl font-sans">「?」</span>
              </motion.button>
            </div>

            {/* 4 个漂浮的 3D 彩色气球 */}
            <div className="grid grid-cols-2 gap-4 w-full px-2 mb-2">
              {balloonOptions.map((opt, i) => {
                const balloonGradients = [
                  'from-pink-400 via-rose-500 to-red-500',
                  'from-amber-300 via-orange-400 to-amber-500',
                  'from-sky-400 via-blue-500 to-indigo-500',
                  'from-emerald-400 via-teal-500 to-green-600',
                ];
                return (
                  <motion.button
                    key={opt + i}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.88 }}
                    animate={{
                      y: [0, -8, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2 + i * 0.3,
                      ease: 'easeInOut',
                    }}
                    onClick={() => handleAnswer(opt, level.p)}
                    className={`h-22 rounded-3xl bg-gradient-to-b ${balloonGradients[i % 4]} text-white flex flex-col items-center justify-center shadow-xl border-3 border-white/90 cursor-pointer active:scale-90 transition-all`}
                  >
                    <span className="text-4xl font-black font-sans drop-shadow">{opt}</span>
                    <span className="text-[10px] opacity-80 -mt-0.5">🎈 点我戳破</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 玩法 2：声调魔术帽 ── */}
        {gameMode === 'tone_hat' && (
          <div className="w-full h-full flex flex-col items-center justify-between">
            {/* 题目展示 */}
            <div className="flex flex-col items-center mt-2">
              <div className="text-4xl mb-1 filter drop-shadow">{toneQuestion.target.emoji}</div>
              <div className="text-base font-black text-candy-purple-deep">
                给「{toneQuestion.target.word}」戴正确的声调帽子
              </div>
              <button
                onClick={() => {
                  sfxTap();
                  speak(toneQuestion.target.word, { lang: 'zh-CN', rate: 0.65 });
                }}
                className="mt-1 text-xs font-black px-3.5 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 cursor-pointer hover:bg-purple-200"
              >
                🔊 再听发音
              </button>
            </div>

            {/* 4 顶声调魔法帽 */}
            <div className="grid grid-cols-4 gap-2.5 w-full mb-2">
              {toneQuestion.allTones.map((t) => (
                <motion.button
                  key={t.toneNum}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleAnswer(String(t.toneNum), String(toneQuestion.target.toneNum))}
                  className="flex flex-col items-center p-2.5 bg-white/95 rounded-2xl border-3 border-purple-300 hover:border-purple-500 shadow-md cursor-pointer active:scale-95"
                >
                  <span className="text-3xl font-black text-candy-purple-deep font-sans">{t.symbol}</span>
                  <span className="text-[11px] font-extrabold text-ink-soft mt-1">{t.toneName}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ── 玩法 3：看图配对 ── */}
        {gameMode === 'picture_match' && (
          <div className="w-full h-full flex flex-col items-center justify-between">
            {/* 图文卡片 */}
            <div className="flex flex-col items-center mt-2 p-3.5 bg-white/95 rounded-3xl border-2 border-sky-300 shadow-md">
              <span className="text-5xl filter drop-shadow">{pictureQuestion.target.emoji}</span>
              <span className="text-base font-black text-sky-950 mt-1">
                {pictureQuestion.target.word} ({pictureQuestion.target.hanzi})
              </span>
            </div>

            {/* 4 个拼音选项 */}
            <div className="grid grid-cols-2 gap-3.5 w-full mb-2">
              {pictureQuestion.options.map((opt, i) => (
                <motion.button
                  key={opt.pinyin + i}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleAnswer(opt.pinyin, level.p)}
                  className="h-16 bg-white/95 hover:bg-sky-50 rounded-2xl border-3 border-sky-300 active:scale-95 flex items-center justify-center text-3xl font-black text-candy-blue-deep shadow-md cursor-pointer font-sans"
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* 通关大礼包动画 */}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center z-40 p-4"
            >
              <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl border-3 border-yellow-300 animate-bounce">
                <img
                  src="/icons/hongen_pinyin/treasure_chest.jpg"
                  alt="通关宝箱"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xl font-black text-candy-purple-deep mt-2">
                恭喜通关！星级满分！
              </div>
              <div className="text-xs font-bold text-ink-soft mt-1 bg-amber-50 px-4 py-1.5 rounded-full border border-amber-200">
                获得【{level.badgeReward.title}】徽章 {level.badgeReward.icon}
              </div>
              <div className="mt-4">
                <CandyButton
                  tone="green"
                  size="md"
                  onClick={() => {
                    sfxTap();
                    onPass?.();
                  }}
                >
                  领取奖励 ➔
                </CandyButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
