import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { speak } from '@/lib/speech';
import { speakToneCoasterAudio } from '@/lib/pinyinSpeechEngine';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { getAudioContext } from '@/lib/audioContext';
import { type ToneCarItem } from '@/data/pinyinKingdomData';

interface PinyinToneCarProps {
  basePinyin: string;
  tones?: ToneCarItem[];
  className?: string;
}

const DEFAULT_TONES: Record<string, ToneCarItem[]> = {
  a: [
    { symbol: 'ā', toneNum: 1, toneName: '一声平', carAction: '平坦高速路 🚗💨', word: '鸭子', hanzi: '鸭', emoji: '🦆' },
    { symbol: 'á', toneNum: 2, toneName: '二声扬', carAction: '陡峭冲上坡 🚗↗️', word: '阿姨', hanzi: '姨', emoji: '👩' },
    { symbol: 'ǎ', toneNum: 3, toneName: '三声转', carAction: '下坡又上坡 🚗⤵️⤴️', word: '搞懂', hanzi: '啊', emoji: '💡' },
    { symbol: 'à', toneNum: 4, toneName: '四声降', carAction: '大滑梯俯冲 🚗↘️', word: '啊呀', hanzi: '啊', emoji: '🎯' },
  ],
  o: [
    { symbol: 'ō', toneNum: 1, toneName: '一声平', carAction: '平平开 🚗💨', word: '喔喔叫', hanzi: '喔', emoji: '🐓' },
    { symbol: 'ó', toneNum: 2, toneName: '二声扬', carAction: '冲上坡 🚗↗️', word: '哦？真的吗', hanzi: '哦', emoji: '❓' },
    { symbol: 'ǒ', toneNum: 3, toneName: '三声转', carAction: '下坡又上坡 🚗⤵️⤴️', word: '我懂了', hanzi: '哦', emoji: '💡' },
    { symbol: 'ò', toneNum: 4, toneName: '四声降', carAction: '大俯冲 🚗↘️', word: '哦！原来如此', hanzi: '哦', emoji: '❗' },
  ],
  e: [
    { symbol: 'ē', toneNum: 1, toneName: '一声平', carAction: '平平开 🚗💨', word: '阿胶', hanzi: '阿', emoji: '💊' },
    { symbol: 'é', toneNum: 2, toneName: '二声扬', carAction: '冲上坡 🚗↗️', word: '大白鹅', hanzi: '鹅', emoji: '🦢' },
    { symbol: 'ě', toneNum: 3, toneName: '三声转', carAction: '下坡又上坡 🚗⤵️⤴️', word: '恶心', hanzi: '恶', emoji: '🤢' },
    { symbol: 'è', toneNum: 4, toneName: '四声降', carAction: '大俯冲 🚗↘️', word: '肚子饿', hanzi: '饿', emoji: '🍔' },
  ],
  i: [
    { symbol: 'ī', toneNum: 1, toneName: '一声平', carAction: '平平开 🚗💨', word: '小医生', hanzi: '医', emoji: '🩺' },
    { symbol: 'í', toneNum: 2, toneName: '二声扬', carAction: '冲上坡 🚗↗️', word: '亲阿姨', hanzi: '姨', emoji: '👩' },
    { symbol: 'ǐ', toneNum: 3, toneName: '三声转', carAction: '下坡又上坡 🚗⤵️⤴️', word: '小椅子', hanzi: '椅', emoji: '🪑' },
    { symbol: 'ì', toneNum: 4, toneName: '四声降', carAction: '大俯冲 🚗↘️', word: '好注意', hanzi: '意', emoji: '💡' },
  ],
  u: [
    { symbol: 'ū', toneNum: 1, toneName: '一声平', carAction: '平平开 🚗💨', word: '小乌龟', hanzi: '乌', emoji: '🐢' },
    { symbol: 'ú', toneNum: 2, toneName: '二声扬', carAction: '冲上坡 🚗↗️', word: '无敌铠甲', hanzi: '无', emoji: '🛡️' },
    { symbol: 'ǔ', toneNum: 3, toneName: '三声转', carAction: '下坡又上坡 🚗⤵️⤴️', word: '五角星', hanzi: '五', emoji: '⭐' },
    { symbol: 'ù', toneNum: 4, toneName: '四声降', carAction: '大俯冲 🚗↘️', word: '大白雾', hanzi: '雾', emoji: '🌫️' },
  ],
  ü: [
    { symbol: 'ǖ', toneNum: 1, toneName: '一声平', carAction: '平平开 🚗💨', word: '淤泥', hanzi: '淤', emoji: '🌱' },
    { symbol: 'ǘ', toneNum: 2, toneName: '二声扬', carAction: '冲上坡 🚗↗️', word: '游水小鱼', hanzi: '鱼', emoji: '🐟' },
    { symbol: 'ǚ', toneNum: 3, toneName: '三声转', carAction: '下坡又上坡 🚗⤵️⤴️', word: '天上下雨', hanzi: '雨', emoji: '🌧️' },
    { symbol: 'ǜ', toneNum: 4, toneName: '四声降', carAction: '大俯冲 🚗↘️', word: '金黄玉米', hanzi: '玉', emoji: '🌽' },
  ],
};

export function PinyinToneCar({
  basePinyin,
  tones: propTones,
  className = '',
}: PinyinToneCarProps) {
  const [activeTone, setActiveTone] = useState<1 | 2 | 3 | 4>(1);
  const [isDriving, setIsDriving] = useState(false);

  const clean = basePinyin.trim().toLowerCase();
  const tones = propTones || DEFAULT_TONES[clean] || [
    { symbol: `${clean} (一声)`, toneNum: 1, toneName: '一声平', carAction: '平平开 🚗💨', word: '一声', hanzi: '一', emoji: '1️⃣' },
    { symbol: `${clean} (二声)`, toneNum: 2, toneName: '二声扬', carAction: '冲上坡 🚗↗️', word: '二声', hanzi: '二', emoji: '2️⃣' },
    { symbol: `${clean} (三声)`, toneNum: 3, toneName: '三声转', carAction: '拐个弯 🚗⤵️⤴️', word: '三声', hanzi: '三', emoji: '3️⃣' },
    { symbol: `${clean} (四声)`, toneNum: 4, toneName: '四声降', carAction: '大俯冲 🚗↘️', word: '四声', hanzi: '四', emoji: '4️⃣' },
  ];

  const currentItem = tones.find((t) => t.toneNum === activeTone) || tones[0]!;

  // 播放 WebAudio 变频扫频声调
  const playToneSound = useCallback((toneNum: 1 | 2 | 3 | 4) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      if (toneNum === 1) {
        // 一声平：高平调 440Hz 维持
        osc.frequency.setValueAtTime(440, now);
      } else if (toneNum === 2) {
        // 二声扬：升调 320Hz -> 480Hz
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.55);
      } else if (toneNum === 3) {
        // 三声转：曲折调 360Hz -> 240Hz -> 420Hz
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.28);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.6);
      } else if (toneNum === 4) {
        // 四声降：降调 480Hz -> 220Hz
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.5);
      }

      osc.start(now);
      osc.stop(now + 0.7);
    } catch {
      // 忽略限制
    }
  }, []);

  const handleSelectTone = (t: ToneCarItem) => {
    sfxTap();
    triggerHaptic(30);
    setActiveTone(t.toneNum);
    setIsDriving(true);
    playToneSound(t.toneNum);
    speakToneCoasterAudio(t, basePinyin);

    setTimeout(() => {
      setIsDriving(false);
    }, 700);
  };

  const getCarAnimation = () => {
    if (activeTone === 1) {
      return {
        x: [-90, 0, 90],
        y: [0, 0, 0],
        rotate: [0, 0, 0],
      };
    }
    if (activeTone === 2) {
      return {
        x: [-80, 0, 80],
        y: [40, 0, -40],
        rotate: [-20, -25, -20],
      };
    }
    if (activeTone === 3) {
      return {
        x: [-80, -10, 30, 80],
        y: [-18, 35, 10, -25],
        rotate: [20, 0, -25, -15],
      };
    }
    return {
      x: [-80, 0, 80],
      y: [-40, 0, 40],
      rotate: [25, 30, 20],
    };
  };

  return (
    <div className={`w-full flex flex-col items-center bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-100 rounded-3xl p-5 border-4 border-orange-300 shadow-xl ${className}`}>
      {/* 顶部标题栏 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-3xl">🚗</span>
        <div>
          <h2 className="text-base sm:text-lg font-black text-amber-950">
            四声调过山车 · 动感发音
          </h2>
          <p className="text-xs font-bold text-orange-800">
            一声平，二声扬，三声拐弯，四声降！
          </p>
        </div>
      </div>

      {/* ── 3D 山峦与过山车动画舞台 ── */}
      <div className="relative w-full h-44 bg-gradient-to-b from-sky-300 via-sky-100 to-amber-100 rounded-3xl border-4 border-orange-300 overflow-hidden flex items-center justify-center shadow-inner">
        {/* 背景漂浮白云与远山 */}
        <div className="absolute top-2 left-4 text-2xl opacity-80 animate-pulse">☁️</div>
        <div className="absolute top-4 right-8 text-xl opacity-80 animate-pulse">☁️</div>
        <div className="absolute bottom-2 left-2 text-3xl opacity-30">⛰️</div>
        <div className="absolute bottom-2 right-2 text-3xl opacity-30">⛰️</div>

        {/* 动态 SVG 轨道线 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 140">
          {activeTone === 1 && (
            <path d="M 20 70 L 300 70" stroke="#F59E0B" strokeWidth="8" strokeDasharray="8 8" strokeLinecap="round" fill="none" />
          )}
          {activeTone === 2 && (
            <path d="M 20 110 L 300 30" stroke="#10B981" strokeWidth="8" strokeDasharray="8 8" strokeLinecap="round" fill="none" />
          )}
          {activeTone === 3 && (
            <path d="M 20 45 Q 160 130 300 35" stroke="#8B5CF6" strokeWidth="8" strokeDasharray="8 8" strokeLinecap="round" fill="none" />
          )}
          {activeTone === 4 && (
            <path d="M 20 30 L 300 110" stroke="#EF4444" strokeWidth="8" strokeDasharray="8 8" strokeLinecap="round" fill="none" />
          )}
        </svg>

        {/* 载着拼音字母的小汽车 */}
        <motion.div
          key={activeTone + (isDriving ? '-drive' : '')}
          animate={isDriving ? getCarAnimation() : { x: 0, y: 0, rotate: 0 }}
          transition={{ duration: 0.65, ease: 'easeInOut' }}
          className="relative flex flex-col items-center z-10 filter drop-shadow-lg cursor-pointer"
          onClick={() => handleSelectTone(currentItem)}
        >
          {/* 头顶大声调发音气泡 */}
          <div className="px-4 py-1.5 bg-white/95 rounded-full shadow-lg text-3xl font-black text-candy-purple-deep border-3 border-amber-400 font-sans">
            {currentItem.symbol}
          </div>
          {/* 3D 小莤卡通过山车原画 */}
          <div className="w-18 h-18 -mt-2 rounded-2xl overflow-hidden shadow-md border-2 border-white">
            <img
              src="/icons/hongen_pinyin/tone_car.jpg"
              alt="声调过山车"
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>
      </div>

      {/* ── 4 个声调 3D 石碑卡片 ── */}
      <div className="grid grid-cols-4 gap-2.5 w-full mt-4">
        {tones.map((t) => {
          const isSelected = t.toneNum === activeTone;
          return (
            <motion.button
              key={t.toneNum}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelectTone(t)}
              className={`flex flex-col items-center p-2.5 rounded-3xl border-3 transition-all cursor-pointer shadow-md ${
                isSelected
                  ? 'bg-gradient-to-b from-amber-400 via-orange-500 to-amber-600 text-white border-yellow-200 ring-4 ring-orange-300/60 scale-105'
                  : 'bg-white text-ink border-orange-200 hover:bg-orange-50'
              }`}
            >
              <span className="text-3xl font-black font-sans">{t.symbol}</span>
              <span className={`text-xs font-black mt-1 ${isSelected ? 'text-white' : 'text-orange-950'}`}>
                {t.toneName}
              </span>
              <span className={`text-[10px] font-extrabold mt-0.5 ${isSelected ? 'text-amber-100' : 'text-ink-soft'}`}>
                {t.word}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── 底部生活词汇卡片 ── */}
      <div className="w-full flex items-center justify-between mt-4 px-4 py-3 bg-white/95 rounded-2xl border-2 border-orange-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{currentItem.emoji}</span>
          <div>
            <div className="text-xs sm:text-sm font-black text-orange-950">
              例字：{currentItem.hanzi} · 「{currentItem.word}」
            </div>
            <div className="text-[11px] font-extrabold text-amber-700">
              {currentItem.carAction}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            sfxTap();
            speak(`${currentItem.symbol}，${currentItem.word}的${currentItem.hanzi}`, {
              lang: 'zh-CN',
              rate: 0.65,
            });
          }}
          className="text-xs font-black px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          🔊 读生活词
        </button>
      </div>
    </div>
  );
}
