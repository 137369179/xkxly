import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWin } from '@/lib/sfx';
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
    question: '好朋友送给你一份精心准备的画作礼物，你应该怎么做？',
    illustration: '🎁 🎨 👭',
    options: [
      { text: '开心地双手接过并说：「谢谢你，我很喜欢！」', isPolite: true, feedback: '太棒了！真诚道谢并赞赏对方的用心，友谊更深厚！' },
      { text: '随手扔在桌上，一句话也不说', isPolite: false, feedback: '要珍惜别人的心意，礼貌说声谢谢是对朋友最好的尊重！' },
    ],
  },
  {
    id: 4,
    question: '在公园滑滑梯前，有几个小朋友正在排队，你应该？',
    illustration: '🛝 🚶 🚶‍♂️',
    options: [
      { text: '跟在队伍最后面，耐心按顺序排队', isPolite: true, feedback: '遵守公共秩序的好榜样！秩序守护安全与公平！' },
      { text: '从旁边插队挤到最前面去', isPolite: false, feedback: '插队很不文明也容易摔倒受伤哦，大家排队才安全！' },
    ],
  },
  {
    id: 5,
    question: '午休时间大家都在安静睡觉，你想拿书看应该怎么做？',
    illustration: '😴 🤫 📖',
    options: [
      { text: '轻手轻脚慢慢走，安安静静不发出大声音', isPolite: true, feedback: '懂得体贴照顾他人的好孩子！不打扰别人休息真体贴！' },
      { text: '大喊大叫跑来跑去，把大家都吵醒', isPolite: false, feedback: '别人睡觉时要保持安静，这是体贴他人的重要礼仪！' },
    ],
  },
  {
    id: 6,
    question: '看到同桌小朋友的彩色画笔撒了一地正在着急，你应该？',
    illustration: '🖍️ 😭 🤝',
    options: [
      { text: '蹲下身主动说：「我来帮你一起捡起来吧！」', isPolite: true, feedback: '热心助人暖人心！主动伸出援手是最高的情商！' },
      { text: '在旁边嘲笑他笨手笨脚', isPolite: false, feedback: '嘲笑别人会让人伤心，乐于助人才能赢得大家喜爱！' },
    ],
  },
];

export function SocialEmotionGame() {
  const [activeTab, setActiveTab] = useState<'emotion' | 'social'>('emotion');
  const [selectedEmotionIdx, setSelectedEmotionIdx] = useState<number>(0);
  const [scenarioIdx, setScenarioIdx] = useState<number>(0);
  const [scenarioFeedback, setScenarioFeedback] = useState<string | null>(null);

  const addStars = useStore((s) => s.addStars);
  const addFish = useStore((s) => s.addFish);

  const currentEmotion = EMOTIONS[selectedEmotionIdx] ?? EMOTIONS[0] ?? {
    id: 'happy',
    name: '开心',
    emoji: '😊',
    eyeEmoji: '👀',
    mouthEmoji: '👄',
    desc: '开心快乐',
    soothingTip: '分享快乐',
  };
  const currentScenario = SCENARIOS[scenarioIdx] ?? SCENARIOS[0] ?? {
    id: 1,
    question: '分享玩具',
    illustration: '🧸',
    options: [],
  };

  useEffect(() => {
    if (activeTab === 'emotion') {
      speak(`认识情绪：${currentEmotion.name}。${currentEmotion.desc}。${currentEmotion.soothingTip}`);
    } else {
      speak(`社交情境练习：${currentScenario.question}`);
    }
  }, [activeTab, currentEmotion.desc, currentEmotion.name, currentEmotion.soothingTip, currentScenario.question]);

  const handleSelectOption = (isPolite: boolean, feedback: string) => {
    if (isPolite) {
      sfxCorrect();
      sfxWin();
      celebrateBig();
      addStars(5);
      addFish(2);
      setScenarioFeedback(feedback);
      speak(feedback);
    } else {
      sfxTap();
      setScenarioFeedback(feedback);
      speak(feedback);
    }
  };

  const handleNextScenario = () => {
    sfxTap();
    setScenarioFeedback(null);
    setScenarioIdx((i) => (i + 1) % SCENARIOS.length);
  };

  return (
    <div className="space-y-6">
      {/* 顶部模式切换 */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            sfxTap();
            setActiveTab('emotion');
          }}
          className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 border-2 ${
            activeTab === 'emotion'
              ? 'bg-rose-500 text-white border-rose-600 shadow-lg scale-105'
              : 'bg-white text-slate-700 border-rose-200 hover:bg-rose-50'
          }`}
        >
          <span>🎭</span>
          <span>情绪识别与舒缓</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sfxTap();
            setActiveTab('social');
          }}
          className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 border-2 ${
            activeTab === 'social'
              ? 'bg-violet-500 text-white border-violet-600 shadow-lg scale-105'
              : 'bg-white text-slate-700 border-violet-200 hover:bg-violet-50'
          }`}
        >
          <span>🤝</span>
          <span>礼貌与社交小达人</span>
        </button>
      </div>

      {/* 模式一：情绪识别 */}
      {activeTab === 'emotion' && (
        <div className="bg-white rounded-3xl border-3 border-rose-200 p-6 shadow-xl space-y-6">
          {/* 情绪选择卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {EMOTIONS.map((emo, idx) => (
              <button
                key={emo.id}
                type="button"
                onClick={() => {
                  sfxTap();
                  setSelectedEmotionIdx(idx);
                }}
                className={`p-4 rounded-2xl border-2 font-black text-sm flex flex-col items-center justify-center gap-2 transition-all ${
                  selectedEmotionIdx === idx
                    ? 'bg-rose-500 text-white border-rose-600 shadow-lg scale-105'
                    : 'bg-rose-50 border-rose-100 text-slate-700 hover:bg-rose-100'
                }`}
              >
                <span className="text-4xl">{emo.emoji}</span>
                <span>{emo.name}</span>
              </button>
            ))}
          </div>

          {/* 情绪面部与心理疏导卡片 */}
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

      {/* 模式二：礼貌与社交情境 */}
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
              className="px-3 py-1.5 bg-violet-100 hover:bg-violet-200 text-violet-800 text-xs font-bold rounded-xl"
            >
              🔄 换一题
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
