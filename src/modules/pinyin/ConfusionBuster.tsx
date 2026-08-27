/**
 * ⚡ 洪恩级拼音易混辨析大冒险 (Pinyin Confusion Buster)
 * -------------------------------------------------------------
 * 专治儿童 4 大高频发音难点：
 * 1. 平舌音 (z/c/s) vs 翘舌音 (zh/ch/sh/r)
 * 2. 前鼻音 (an/en/in/un) vs 后鼻音 (ang/eng/ing/ong)
 * 3. 鼻音 (n) vs 边音 (l)
 * 4. 唇齿音 (f) vs 舌根音 (h)
 * 包含：口诀示意卡 + 双轨听音捉迷藏 + 智能判定反馈
 */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';

export type ConfusionTopicId = 'ping_qiao' | 'qian_hou_bi' | 'n_l' | 'f_h';

interface ConfusionPair {
  pinyinA: string;
  hanziA: string;
  wordA: string;
  emojiA: string;
  pinyinB: string;
  hanziB: string;
  wordB: string;
  emojiB: string;
}

interface ConfusionTopic {
  id: ConfusionTopicId;
  title: string;
  tag: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  rhymeA: string;
  rhymeB: string;
  mouthTipA: string;
  mouthTipB: string;
  pairs: ConfusionPair[];
}

const CONFUSION_TOPICS: ConfusionTopic[] = [
  {
    id: 'ping_qiao',
    title: '平舌音 vs 翘舌音',
    tag: 'z/c/s vs zh/ch/sh/r',
    emoji: '👅',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    rhymeA: '平舌平平顶牙背，像把小尺放嘴里 (z c s)',
    rhymeB: '翘舌向上卷卷起，小舌头向后缩一缩 (zh ch sh r)',
    mouthTipA: '舌尖放平，轻轻抵住下齿背',
    mouthTipB: '舌尖向上翘起，接触上腭前端',
    pairs: [
      { pinyinA: 'sì', hanziA: '四', wordA: '数字四', emojiA: '4️⃣', pinyinB: 'shí', hanziB: '十', wordB: '数字十', emojiB: '🔟' },
      { pinyinA: 'sān', hanziA: '三', wordA: '三个', emojiA: '3️⃣', pinyinB: 'shān', hanziB: '山', wordB: '高山', emojiB: '⛰️' },
      { pinyinA: 'cǎo', hanziA: '草', wordA: '小草', emojiA: '🌱', pinyinB: 'chǎo', hanziB: '炒', wordB: '炒菜', emojiB: '🍳' },
      { pinyinA: 'zǐ', hanziA: '紫', wordA: '紫色', emojiA: '🟣', pinyinB: 'zhǐ', hanziB: '纸', wordB: '白纸', emojiB: '📄' },
    ],
  },
  {
    id: 'qian_hou_bi',
    title: '前鼻音 vs 后鼻音',
    tag: '-n vs -ng',
    emoji: '👃',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    borderColor: 'border-sky-300',
    rhymeA: '前鼻韵母舌尖抵，收音鼻前气流细 (-n)',
    rhymeB: '后鼻韵母舌根抬，鼻腔共鸣嗡嗡响 (-ng)',
    mouthTipA: '发音结束时，舌尖顶住上牙膛',
    mouthTipB: '发音结束时，舌根往后缩并隆起',
    pairs: [
      { pinyinA: 'lán', hanziA: '蓝', wordA: '蓝天', emojiA: '💙', pinyinB: 'láng', hanziB: '狼', wordB: '大灰狼', emojiB: '🐺' },
      { pinyinA: 'rén', hanziA: '人', wordA: '人类', emojiA: '🧍', pinyinB: 'rēng', hanziB: '扔', wordB: '扔球', emojiB: '🎾' },
      { pinyinA: 'xīn', hanziA: '心', wordA: '爱心', emojiA: '❤️', pinyinB: 'xīng', hanziB: '星', wordB: '星星', emojiB: '⭐' },
      { pinyinA: 'wān', hanziA: '弯', wordA: '弯月', emojiA: '🌙', pinyinB: 'wāng', hanziB: '汪', wordB: '汪汪叫', emojiB: '🐶' },
    ],
  },
  {
    id: 'n_l',
    title: '鼻音 n vs 边音 l',
    tag: 'n 门洞 vs l 小棍',
    emoji: '🚪',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    rhymeA: '一个门洞 n n n，气流从鼻孔出来',
    rhymeB: '一根小棍 l l l，气流从舌头两边出来',
    mouthTipA: '鼻腔出气，捏住鼻子声音会变闷',
    mouthTipB: '口腔两边出气，捏住鼻子声音不变',
    pairs: [
      { pinyinA: 'nán', hanziA: '男', wordA: '男孩', emojiA: '👦', pinyinB: 'lán', hanziB: '蓝', wordB: '蓝色', emojiB: '🟦' },
      { pinyinA: 'niú', hanziA: '牛', wordA: '小牛', emojiA: '🐂', pinyinB: 'liú', hanziB: '流', wordB: '流水', emojiB: '🌊' },
      { pinyinA: 'nǚ', hanziA: '女', wordA: '女孩', emojiA: '👧', pinyinB: 'lǚ', hanziB: '旅', wordB: '旅行', emojiB: '🧳' },
      { pinyinA: 'nà', hanziA: '那', wordA: '那里', emojiA: '👉', pinyinB: 'là', hanziB: '辣', wordB: '辣椒', emojiB: '🌶️' },
    ],
  },
  {
    id: 'f_h',
    title: '唇齿音 f vs 舌根音 h',
    tag: 'f 拐杖 vs h 椅子',
    emoji: '🪑',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    rhymeA: '一柄拐杖 f f f，上牙轻触下嘴唇',
    rhymeB: '一把椅子 h h h，舌根隆起像喝水',
    mouthTipA: '上门牙轻轻接触下嘴唇吹气',
    mouthTipB: '舌根后缩靠近软腭，自然哈气',
    pairs: [
      { pinyinA: 'fēi', hanziA: '飞', wordA: '飞机', emojiA: '✈️', pinyinB: 'huī', hanziB: '灰', wordB: '灰尘', emojiB: '🌪️' },
      { pinyinA: 'fā', hanziA: '发', wordA: '发财', emojiA: '💰', pinyinB: 'huā', hanziB: '花', wordB: '花朵', emojiB: '🌸' },
      { pinyinA: 'fēng', hanziA: '风', wordA: '大风', emojiA: '💨', pinyinB: 'hēng', hanziB: '哼', wordB: '哼唱', emojiB: '🎵' },
      { pinyinA: 'fù', hanziA: '富', wordA: '富有', emojiA: '💎', pinyinB: 'hù', hanziB: '户', wordB: '窗户', emojiB: '🪟' },
    ],
  },
];

const FALLBACK_PAIR: ConfusionPair = {
  pinyinA: 'sì', hanziA: '四', wordA: '数字四', emojiA: '4️⃣',
  pinyinB: 'shí', hanziB: '十', wordB: '数字十', emojiB: '🔟',
};

const FALLBACK_TOPIC: ConfusionTopic = {
  id: 'ping_qiao',
  title: '平舌音 vs 翘舌音',
  tag: 'z/c/s vs zh/ch/sh/r',
  emoji: '👅',
  color: 'text-amber-600',
  bgColor: 'bg-amber-50',
  borderColor: 'border-amber-300',
  rhymeA: '平舌平平顶牙背，像把小尺放嘴里 (z c s)',
  rhymeB: '翘舌向上卷卷起，小舌头向后缩一缩 (zh ch sh r)',
  mouthTipA: '舌尖放平，轻轻抵住下齿背',
  mouthTipB: '舌尖向上翘起，接触上腭前端',
  pairs: [FALLBACK_PAIR],
};

export function ConfusionBuster() {
  const addStars = useStore((s) => s.addStars);

  const [activeTopicId, setActiveTopicId] = useState<ConfusionTopicId>('ping_qiao');
  const [tab, setTab] = useState<'card' | 'quiz'>('card');
  const [quizIdx, setQuizIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState<'A' | 'B' | null>(null);

  const currentTopic = useMemo(() => {
    return CONFUSION_TOPICS.find((t) => t.id === activeTopicId) ?? CONFUSION_TOPICS[0] ?? FALLBACK_TOPIC;
  }, [activeTopicId]);

  const currentPair = useMemo(() => {
    return currentTopic.pairs[quizIdx % currentTopic.pairs.length] ?? currentTopic.pairs[0] ?? FALLBACK_PAIR;
  }, [currentTopic, quizIdx]);

  // 随机目标是 A 还是 B
  const targetIsA = useMemo(() => {
    return (quizIdx % 2) === 0;
  }, [quizIdx]);

  const playTargetSound = useCallback(() => {
    sfxTap();
    const target = targetIsA ? currentPair.pinyinA : currentPair.pinyinB;
    const word = targetIsA ? currentPair.wordA : currentPair.wordB;
    void speak(`${target}，${word}`, { lang: 'zh-CN', rate: 0.8 });
  }, [targetIsA, currentPair]);

  const handlePick = useCallback((choice: 'A' | 'B') => {
    if (picked !== null) return;
    setPicked(choice);
    const isCorrect = (choice === 'A' && targetIsA) || (choice === 'B' && !targetIsA);

    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setCorrectCount((c) => c + 1);
      addStars(1);
      if (nextStreak >= 3) {
        sfxWin();
        celebrateBig();
      } else {
        sfxCorrect();
        celebrateSmall();
      }
      const winSound = targetIsA ? currentPair.pinyinA : currentPair.pinyinB;
      void speak(`太棒了！答对了，就是${winSound}！`, { lang: 'zh-CN', rate: 0.85 });
    } else {
      sfxWrong();
      setStreak(0);
      void speak('哎呀差一点，仔细听听看！', { lang: 'zh-CN', rate: 0.85 });
    }

    setTimeout(() => {
      setPicked(null);
      setQuizIdx((i) => i + 1);
    }, 1400);
  }, [picked, targetIsA, streak, currentPair, addStars]);

  return (
    <div className="space-y-4">
      {/* 4 大主题切换 Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CONFUSION_TOPICS.map((topic) => {
          const isSel = topic.id === activeTopicId;
          return (
            <button
              key={topic.id}
              type="button"
              onClick={() => {
                sfxTap();
                setActiveTopicId(topic.id);
                setQuizIdx(0);
                setPicked(null);
              }}
              className={`flex flex-col items-center p-2.5 rounded-2xl border-2 transition-all text-center ${
                isSel
                  ? `${topic.bgColor} ${topic.borderColor} shadow-md scale-[1.02]`
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl mb-0.5">{topic.emoji}</span>
              <span className={`text-xs font-black ${isSel ? topic.color : 'text-slate-700'}`}>{topic.title}</span>
              <span className="text-[10px] text-slate-400 font-bold">{topic.tag}</span>
            </button>
          );
        })}
      </div>

      {/* 学习卡 vs 听音闯关 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { sfxTap(); setTab('card'); }}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
            tab === 'card'
              ? `${currentTopic.bgColor} ${currentTopic.color} border-2 ${currentTopic.borderColor} shadow-sm`
              : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          📖 发音秘诀与口诀卡
        </button>
        <button
          type="button"
          onClick={() => { sfxTap(); setTab('quiz'); }}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
            tab === 'quiz'
              ? 'bg-indigo-500 text-white shadow-md'
              : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          🎮 听音捉迷藏大闯关
        </button>
      </div>

      {/* 📖 学习模式：口诀与发音卡 */}
      {tab === 'card' && (
        <div className="space-y-3">
          {/* 口诀卡片对比 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-4 rounded-3xl border-2 ${currentTopic.borderColor} ${currentTopic.bgColor} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={`text-base font-black ${currentTopic.color}`}>🌟 左边发音要领</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white font-bold text-slate-600">口诀 A</span>
              </div>
              <p className="text-sm font-black text-slate-800">{currentTopic.rhymeA}</p>
              <p className="text-xs text-slate-500 font-medium">💡 口型秘诀：{currentTopic.mouthTipA}</p>
            </div>

            <div className="p-4 rounded-3xl border-2 border-indigo-200 bg-indigo-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-indigo-700">🌟 右边发音要领</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white font-bold text-slate-600">口诀 B</span>
              </div>
              <p className="text-sm font-black text-slate-800">{currentTopic.rhymeB}</p>
              <p className="text-xs text-slate-500 font-medium">💡 口型秘诀：{currentTopic.mouthTipB}</p>
            </div>
          </div>

          {/* 经典词对对比试听 */}
          <div className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm space-y-2.5">
            <p className="text-xs font-black text-slate-600">🎧 点击卡片对比发音：</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentTopic.pairs.map((pair, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-all">
                  {/* Pair A */}
                  <button
                    type="button"
                    onClick={() => {
                      sfxTap();
                      void speak(`${pair.pinyinA}，${pair.wordA}`, { lang: 'zh-CN' });
                    }}
                    className="flex items-center gap-2 text-left"
                  >
                    <span className="text-2xl">{pair.emojiA}</span>
                    <div>
                      <span className="text-sm font-black text-slate-800">{pair.hanziA}</span>
                      <span className="text-xs font-black text-amber-600 ml-1">({pair.pinyinA})</span>
                    </div>
                  </button>

                  <span className="text-xs font-black text-slate-300">VS</span>

                  {/* Pair B */}
                  <button
                    type="button"
                    onClick={() => {
                      sfxTap();
                      void speak(`${pair.pinyinB}，${pair.wordB}`, { lang: 'zh-CN' });
                    }}
                    className="flex items-center gap-2 text-left"
                  >
                    <div>
                      <span className="text-sm font-black text-slate-800">{pair.hanziB}</span>
                      <span className="text-xs font-black text-indigo-600 ml-1">({pair.pinyinB})</span>
                    </div>
                    <span className="text-2xl">{pair.emojiB}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🎮 闯关模式：听音捉迷藏 */}
      {tab === 'quiz' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500">
              第 {quizIdx + 1} 题 · 累计答对 {correctCount} 题
            </span>
            <StreakBar streak={streak} target={3} />
          </div>

          {/* 播放目标音按钮 */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-center text-white shadow-lg space-y-3">
            <p className="text-xs font-bold text-indigo-200">仔细听！哪个是老师读的字？</p>
            <button
              type="button"
              onClick={playTargetSound}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-indigo-700 font-black text-base shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              <span>🔊</span>
              <span>再听一遍读音</span>
            </button>
          </div>

          {/* 左右两个选项卡片 */}
          <div className="grid grid-cols-2 gap-3">
            {/* Option A */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => handlePick('A')}
              className={`p-5 rounded-3xl border-3 flex flex-col items-center gap-2 transition-all ${
                picked === 'A'
                  ? targetIsA
                    ? 'bg-emerald-50 border-emerald-400 shadow-lg ring-4 ring-emerald-200'
                    : 'bg-rose-50 border-rose-400 shadow-lg'
                  : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              <span className="text-4xl">{currentPair.emojiA}</span>
              <span className="text-2xl font-black text-slate-800">{currentPair.hanziA}</span>
              <span className="text-base font-black text-amber-600">{currentPair.pinyinA}</span>
              <span className="text-xs text-slate-400 font-bold">{currentPair.wordA}</span>
            </motion.button>

            {/* Option B */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => handlePick('B')}
              className={`p-5 rounded-3xl border-3 flex flex-col items-center gap-2 transition-all ${
                picked === 'B'
                  ? !targetIsA
                    ? 'bg-emerald-50 border-emerald-400 shadow-lg ring-4 ring-emerald-200'
                    : 'bg-rose-50 border-rose-400 shadow-lg'
                  : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              <span className="text-4xl">{currentPair.emojiB}</span>
              <span className="text-2xl font-black text-slate-800">{currentPair.hanziB}</span>
              <span className="text-base font-black text-indigo-600">{currentPair.pinyinB}</span>
              <span className="text-xs text-slate-400 font-bold">{currentPair.wordB}</span>
            </motion.button>
          </div>

          {/* 判定反馈提示 */}
          <AnimatePresence>
            {picked !== null && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-3 rounded-2xl text-center text-sm font-black border ${
                  (picked === 'A' && targetIsA) || (picked === 'B' && !targetIsA)
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {(picked === 'A' && targetIsA) || (picked === 'B' && !targetIsA)
                  ? '🎉 太棒了！回答正确！获得 1 颗星星！'
                  : '💡 没关系，平翘舌和前后鼻音多加练习就会越来越准哦！'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
