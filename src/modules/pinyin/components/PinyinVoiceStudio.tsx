import { useState } from 'react';
import { motion } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { SpeechEvalButton } from '@/components/feedback/SpeechEvalButton';
import { type KingdomPinyinLevel } from '@/data/pinyinKingdomData';

interface PinyinVoiceStudioProps {
  level: KingdomPinyinLevel;
  onPass?: () => void;
  className?: string;
}

type VoiceMorphType = 'normal' | 'robot' | 'chipmunk' | 'monster';

export function PinyinVoiceStudio({
  level,
  onPass,
  className = '',
}: PinyinVoiceStudioProps) {
  const [selectedMorph, setSelectedMorph] = useState<VoiceMorphType>('normal');
  const [evalPassed, setEvalPassed] = useState(false);

  const handlePlayMorph = (morph: VoiceMorphType) => {
    sfxTap();
    triggerHaptic(20);
    setSelectedMorph(morph);

    let pitch = 1.0;
    let rate = 0.65;
    if (morph === 'robot') {
      pitch = 0.6;
      rate = 0.55;
    } else if (morph === 'chipmunk') {
      pitch = 1.8;
      rate = 0.9;
    } else if (morph === 'monster') {
      pitch = 0.4;
      rate = 0.45;
    }

    speak(level.p, { lang: 'zh-CN', pitch, rate });
  };

  return (
    <div className={`w-full max-w-md mx-auto flex flex-col items-center select-none space-y-4 ${className}`}>
      {/* ── 小莤 3D 魔法录音棚舞台 ── */}
      <div className="relative w-full bg-gradient-to-b from-sky-400 via-indigo-400 to-purple-600 rounded-3xl p-5 border-4 border-yellow-300 shadow-2xl flex flex-col items-center justify-between overflow-hidden text-white">
        {/* 背景舞台聚光灯与乐符粒子 */}
        <div className="absolute top-2 left-4 text-2xl opacity-40 animate-pulse">🎵</div>
        <div className="absolute top-3 right-6 text-2xl opacity-40 animate-pulse" style={{ animationDelay: '0.6s' }}>🎶</div>
        <div className="absolute bottom-4 left-6 text-xl opacity-30">✨</div>
        <div className="absolute bottom-4 right-6 text-xl opacity-30">✨</div>

        {/* 顶部标题栏 */}
        <div className="relative z-10 flex items-center gap-2 px-4 py-1.5 bg-black/25 backdrop-blur-md rounded-full border border-white/30 shadow-inner">
          <span className="text-sm font-black text-yellow-300">🎙️ 变声魔镜录音棚</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/80 text-white font-extrabold">
            AI智能打分
          </span>
        </div>

        {/* 核心大字母与跳动耳麦小精灵 Mascot */}
        <div className="relative z-10 flex flex-col items-center my-3">
          {/* 超大发音字母 */}
          <div className="text-7xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-300 to-amber-400 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] font-sans">
            {level.p}
          </div>

          {/* 3D 小莤魔镜变声麦克风原画 */}
          <motion.div
            animate={{
              y: [0, -6, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="w-24 h-24 -mt-1 rounded-3xl overflow-hidden shadow-xl border-3 border-yellow-300 filter drop-shadow-lg"
          >
            <img
              src="/icons/hongen_pinyin/magic_mic.jpg"
              alt="变声麦克风"
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* 动态彩虹跳动声波条 */}
          <div className="flex items-center gap-1 mt-3">
            {[18, 36, 50, 28, 44, 60, 32, 48, 22].map((height, i) => (
              <motion.div
                key={i}
                animate={{ height: [height * 0.4, height, height * 0.3] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.8 + (i % 3) * 0.2,
                  ease: 'easeInOut',
                }}
                className="w-1.5 rounded-full bg-gradient-to-t from-pink-400 via-yellow-300 to-sky-300"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        </div>

        {/* 核心智能语音跟读评测按钮 */}
        <div className="relative z-10 w-full p-4 bg-white/95 backdrop-blur-md rounded-2xl border-2 border-yellow-300 shadow-lg text-ink flex flex-col items-center space-y-2">
          <div className="text-xs font-black text-purple-950 flex items-center gap-1.5">
            <span>✨</span>
            <span>请按住/点击下方麦克风，大声读出「{level.p}」：</span>
          </div>

          <div className="py-1">
            <SpeechEvalButton
              targetText={level.p}
              lang="zh-CN"
              onPass={() => {
                setEvalPassed(true);
                sfxWin();
                triggerHaptic([60, 40, 80]);
                celebrateBig();
                onPass?.();
              }}
            />
          </div>

          <p className="text-[11px] font-bold text-ink-soft text-center">
            评测通过将点亮金卡并奖励 🌟 +2！
          </p>
        </div>
      </div>

      {/* ── 趣味变声魔镜魔法台 ── */}
      <div className="w-full bg-white/95 p-4 rounded-3xl border-3 border-purple-200 shadow-sm space-y-3">
        <div className="text-xs font-black text-purple-950 flex items-center justify-between">
          <span>🪄 趣味变声试听魔法器</span>
          <span className="text-[10px] text-purple-700">点击试听不同声效</span>
        </div>

        {/* 4 种趣味变声按钮 */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'normal', name: '原声童读', icon: '👶' },
            { id: 'robot', name: '机械战警', icon: '🤖' },
            { id: 'chipmunk', name: '花栗鼠', icon: '🐿️' },
            { id: 'monster', name: '巨石怪', icon: '👾' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => handlePlayMorph(m.id as VoiceMorphType)}
              className={`flex flex-col items-center p-2 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedMorph === m.id
                  ? 'bg-purple-100 border-purple-500 text-purple-950 scale-105 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-2xl">{m.icon}</span>
              <span className="text-[10px] font-black mt-0.5">{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 底部快捷示范与跳过按钮 ── */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={() => {
            sfxTap();
            speak(`${level.p}，${level.rhyme}`, { lang: 'zh-CN', rate: 0.65 });
          }}
          className="px-4 py-2 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-xs font-black hover:bg-purple-200 active:scale-95 transition-all cursor-pointer"
        >
          🔊 听标准口诀
        </button>
        <button
          onClick={() => {
            sfxTap();
            onPass?.();
          }}
          className="px-6 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          {evalPassed ? '🎉 已满分通过 ➔' : '读好啦，下一步 ➔'}
        </button>
      </div>
    </div>
  );
}
