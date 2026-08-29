import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';

interface EmotionType {
  id: string;
  name: string;
  emoji: string;
  eyeEmoji: string;
  mouthEmoji: string;
  desc: string;
  soothingTip: string;
}

const EMOTIONS: EmotionType[] = [
  {
    id: 'happy',
    name: '开心快乐',
    emoji: '😄',
    eyeEmoji: '👀',
    mouthEmoji: '👄',
    desc: '当完成了目标、吃到美味食物或和小伙伴玩耍时，我们心里暖洋洋的！',
    soothingTip: '开心地笑一笑，把快乐分享给身边的人吧！',
  },
  {
    id: 'sad',
    name: '难过伤心',
    emoji: '😢',
    eyeEmoji: '🥺',
    mouthEmoji: '💧',
    desc: '当心爱的玩具坏了，或者和小朋友分开时，可能会觉得有点伤心。',
    soothingTip: '难过时可以抱抱爸爸妈妈，或者深呼吸，把心情说出来。',
  },
  {
    id: 'angry',
    name: '生气愤怒',
    emoji: '😠',
    eyeEmoji: '💢',
    mouthEmoji: '🗯️',
    desc: '当遇到不公平或者事情不如意时，心里可能像有一团小火苗在烧。',
    soothingTip: '生气时数一到十：1, 2, 3... 慢慢呼气，让小火苗熄灭。',
  },
  {
    id: 'fear',
    name: '害怕恐惧',
    emoji: '😨',
    eyeEmoji: '😱',
    mouthEmoji: '⚡',
    desc: '面对陌生黑暗的环境、打雷声时，我们会本能地感到紧张和害怕。',
    soothingTip: '害怕是正常的，拉住爸爸妈妈的手，我们就能战胜恐惧！',
  },
  {
    id: 'surprise',
    name: '惊讶好奇',
    emoji: '😲',
    eyeEmoji: '✨',
    mouthEmoji: '⭕',
    desc: '看到意想不到的神奇事物或收到神秘惊喜时，眼睛会睁得大大的！',
    soothingTip: '带着好奇的心去观察世界，探索大自然的奥秘吧！',
  },
  {
    id: 'calm',
    name: '平静放松',
    emoji: '😌',
    eyeEmoji: '🍃',
    mouthEmoji: '🌸',
    desc: '听着轻柔的音乐、微风拂过脸庞时，内心像平静的小湖水一样安宁。',
    soothingTip: '闭上眼睛，深深吸一口气，感受身体慢慢放松下来。',
  },
];

interface SocialScenario {
  id: number;
  question: string;
  illustration: string;
  options: Array<{ text: string; isPolite: boolean; feedback: string }>;
}

const SCENARIOS: SocialScenario[] = [
  {
    id: 1,
    question: '小伙伴想玩你的玩具积木，你应该怎么做？',
    illustration: '🧸 👧 👦',
    options: [
      { text: '一起轮流玩，共同搭建高楼！', isPolite: true, feedback: '太棒了！学会分享会让大家玩得更开心，收获好朋友！' },
      { text: '一把夺过来，自己藏起来', isPolite: false, feedback: '这样做小伙伴会很伤心哦，分享才能带来加倍快乐！' },
    ],
  },
  {
    id: 2,
    question: '在走廊跑动时不小心碰到了同学，应该说什么？',
    illustration: '🏃 💥 🙋',
    options: [
      { text: '真诚地说：「对不起，你疼不疼？」', isPolite: true, feedback: '有礼貌的好宝宝！及时道歉能化解误会！' },
      { text: '当没看见，直接跑掉', isPolite: false, feedback: '要勇于承担责任，主动说对不起才是有担当的小勇士！' },
    ],
  },
  {
    id: 3,
    question: '上课想要回答老师的问题，正确的方式是？',
    illustration: '🏫 👩‍🏫 🙋‍♂️',
    options: [
      { text: '安静举起小手，等待老师点名', isPolite: true, feedback: '遵守规则的好孩子！举手发言让课堂更有序！' },
      { text: '大声喊叫打断老师', isPolite: false, feedback: '随意打断别人是不礼貌的，耐心举手最棒！' },
    ],
  },
  {
    id: 4,
    question: '看到好朋友因为摔跤哭了，可以怎么做？',
    illustration: '😢 🩹 🫂',
    options: [
      { text: '走过去扶他起来，轻声安慰「别哭，我陪着你」', isPolite: true, feedback: '你真是一个体贴、温暖的好伙伴！' },
      { text: '在旁边大声嘲笑他', isPolite: false, feedback: '嘲笑别人会让朋友更难过，我们要学会关爱同伴。' },
    ],
  },
];

export function SocialEmotionGame() {
  const [activeTab, setActiveTab] = useState<'emotion' | 'social'>('emotion');
  const [selectedEmotionIdx, setSelectedEmotionIdx] = useState(0);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [scenarioFeedback, setScenarioFeedback] = useState<string | null>(null);

  const addStars = useStore((s) => s.addStars);
  const addFish = useStore((s) => s.addFish);

  const currentEmotion = EMOTIONS[selectedEmotionIdx] ?? EMOTIONS[0] ?? {
    id: 'happy',
    name: '开心',
    emoji: '😄',
    eyeEmoji: '👀',
    mouthEmoji: '👄',
    desc: '开心快乐',
    soothingTip: '分享快乐',
  };
  const currentScenario = SCENARIOS[scenarioIdx] ?? SCENARIOS[0] ?? {
    id: 1,
    question: '遇到朋友要打招呼',
    illustration: '👋',
    options: [],
  };

  useEffect(() => {
    speak('欢迎来到情绪认知与社交剧场！在这里我们可以认识不同情绪，学习如何与小伙伴快乐相处！');
  }, []);

  const handleSelectEmotion = useCallback((idx: number) => {
    sfxTap();
    triggerHaptic(20);
    setSelectedEmotionIdx(idx);
    const emo = EMOTIONS[idx];
    if (emo) {
      speak(`${emo.name}。${emo.desc} 小魔法锦囊：${emo.soothingTip}`);
    }
  }, []);

  const handleNextScenario = useCallback(() => {
    sfxTap();
    triggerHaptic(20);
    setScenarioFeedback(null);
    setScenarioIdx((prev) => (prev + 1) % SCENARIOS.length);
    const nextScen = SCENARIOS[(scenarioIdx + 1) % SCENARIOS.length];
    if (nextScen) {
      speak(nextScen.question);
    }
  }, [scenarioIdx]);

  const handleSelectOption = useCallback((isPolite: boolean, feedback: string) => {
    setScenarioFeedback(feedback);
    if (isPolite) {
      sfxCorrect();
      sfxWin();
      triggerHaptic([30, 40, 60]);
      celebrateBig();
      addStars(4);
      addFish(1);
      speak(`回答正确！${feedback}`);
    } else {
      sfxTap();
      triggerHaptic(40);
      speak(feedback);
    }
  }, [addStars, addFish]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (activeTab === 'emotion' && ['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (EMOTIONS[idx]) {
          e.preventDefault();
          handleSelectEmotion(idx);
        }
      } else if (activeTab === 'social') {
        if (['1', '2'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          const opt = currentScenario.options[idx];
          if (opt) {
            e.preventDefault();
            handleSelectOption(opt.isPolite, opt.feedback);
          }
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleNextScenario();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleSelectEmotion, currentScenario.options, handleSelectOption, handleNextScenario]);

  return (
    <div className="space-y-6">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-rose-900 font-bold bg-rose-50/90 px-3 py-1 rounded-xl border border-rose-200">
          ⌨️ 键盘快捷操作：数字键 1-6 选情绪 · 社交模式按 1/2 选择决策 · 空格/Enter 下一情景
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3" role="tablist" aria-label="情商与社交模式切换">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'emotion'}
          onClick={() => {
            sfxTap();
            triggerHaptic(20);
            setActiveTab('emotion');
          }}
          className={`min-h-[44px] px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 border-2 focus-visible:ring-4 focus-visible:ring-rose-300 focus:outline-none ${
            activeTab === 'emotion'
              ? 'bg-rose-500 text-candy-pink-on border-rose-600 shadow-lg scale-105'
              : 'bg-white text-slate-700 border-rose-200 hover:bg-rose-50 active:scale-95'
          }`}
        >
          <span>🎭</span>
          <span>情绪识别与舒缓</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'social'}
          onClick={() => {
            sfxTap();
            triggerHaptic(20);
            setActiveTab('social');
          }}
          className={`min-h-[44px] px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 border-2 focus-visible:ring-4 focus-visible:ring-violet-300 focus:outline-none ${
            activeTab === 'social'
              ? 'bg-violet-500 text-candy-purple-on border-violet-600 shadow-lg scale-105'
              : 'bg-white text-slate-700 border-violet-200 hover:bg-violet-50 active:scale-95'
          }`}
        >
          <span>🤝</span>
          <span>礼貌与社交小达人</span>
        </button>
      </div>

      {activeTab === 'emotion' && (
        <div className="bg-white rounded-3xl border-3 border-rose-200 p-6 shadow-xl space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {EMOTIONS.map((emo, idx) => (
              <button
                key={emo.id}
                type="button"
                onClick={() => handleSelectEmotion(idx)}
                className={`min-h-[44px] p-4 rounded-2xl border-2 font-black text-sm flex flex-col items-center justify-center gap-2 transition-all focus-visible:ring-4 focus-visible:ring-rose-300 focus:outline-none ${
                  selectedEmotionIdx === idx
                    ? 'bg-rose-500 text-candy-pink-on border-rose-600 shadow-lg scale-105'
                    : 'bg-rose-50 border-rose-100 text-slate-700 hover:bg-rose-100 active:scale-95'
                }`}
              >
                <span className="text-4xl">{emo.emoji}</span>
                <span>{emo.name}</span>
              </button>
            ))}
          </div>

          <motion.div
            key={currentEmotion.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 rounded-3xl border-2 border-rose-200 flex flex-col sm:flex-row items-center gap-6 shadow-inner"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="w-36 h-36 bg-white rounded-3xl border-4 border-rose-300 shadow-xl flex items-center justify-center text-7xl select-none"
            >
              {currentEmotion.emoji}
            </motion.div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <h4 className="text-2xl font-black text-slate-800">
                当你感到【{currentEmotion.name}】时...
              </h4>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                {currentEmotion.desc}
              </p>
              <div className="p-3 bg-white/90 rounded-2xl border border-rose-200 mt-2">
                <span className="text-xs font-black text-rose-600 block mb-0.5">
                  💡 情绪小魔法锦囊：
                </span>
                <span className="text-xs text-slate-700 font-medium">
                  {currentEmotion.soothingTip}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'social' && (
        <div className="bg-white rounded-3xl border-3 border-violet-200 p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-800">
                🤝 社交情境判断题
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                遇到这样的场景，哪种做法最有礼貌、最受大家欢迎呢？
              </p>
            </div>
            <button
              type="button"
              onClick={handleNextScenario}
              className="min-h-[44px] px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-800 text-xs font-bold rounded-xl active:scale-95 focus-visible:ring-4 focus-visible:ring-violet-300"
            >
              🔄 换一题 (Space)
            </button>
          </div>

          <div className="p-6 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 rounded-3xl border-2 border-violet-200 text-center space-y-4 shadow-inner">
            <div className="text-6xl select-none">{currentScenario.illustration}</div>
            <h4 className="text-xl font-black text-slate-800 max-w-md mx-auto">
              {currentScenario.question}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto pt-2">
              {currentScenario.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectOption(opt.isPolite, opt.feedback)}
                  className="p-4 bg-white hover:bg-violet-100 border-2 border-violet-200 rounded-2xl font-black text-xs text-slate-800 shadow-md transition-transform active:scale-95 text-left flex items-center justify-between"
                >
                  <span>{opt.text}</span>
                  <span>👉</span>
                </button>
              ))}
            </div>

            {scenarioFeedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-white rounded-2xl border-2 border-violet-300 max-w-lg mx-auto text-xs font-bold text-violet-900 shadow-sm"
              >
                {scenarioFeedback}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
