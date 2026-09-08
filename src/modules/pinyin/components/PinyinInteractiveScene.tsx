import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak } from '@/lib/speech';
import { speakPinyinPhoneme } from '@/lib/pinyinSpeechEngine';
import { sfxTap, sfxCorrect, triggerHaptic } from '@/lib/sfx';
import { CandyButton } from '@/components/ui/Button';
import { type PinyinPersonification } from '@/data/pinyinKingdomData';

interface PinyinInteractiveSceneProps {
  symbol: string;
  name: string;
  rhyme: string;
  personification?: PinyinPersonification;
  onInteracted?: () => void;
  className?: string;
}

export function PinyinInteractiveScene({
  symbol,
  name,
  rhyme,
  personification,
  onInteracted,
  className = '',
}: PinyinInteractiveSceneProps) {
  const [isSparkling, setIsSparkling] = useState(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);

  const character = personification?.character || '拼音小精灵';
  const emoji = personification?.emoji || '🧚';
  const visualDesc = personification?.visualDesc || `可爱的拼音精灵 ${symbol}`;
  const prompt = personification?.interactivePrompt || '快摸摸我，听听我的自我介绍！';
  const feedback = personification?.interactiveFeedback || `太棒啦！拼音 ${symbol} 发音真好听！`;
  const funFact = personification?.funFact || `每天学拼音，识字更轻松！`;

  const handleCharacterTap = () => {
    sfxTap();
    triggerHaptic([40, 30, 70]);
    setIsSparkling(true);
    setBubbleText(feedback);

    // 播放小莤拟人童声
    speakPinyinPhoneme(symbol);
    speak(`${symbol}！${rhyme}`, { lang: 'zh-CN', rate: 0.65 });
    onInteracted?.();

    setTimeout(() => {
      setIsSparkling(false);
    }, 2500);
  };

  return (
    <div className={`flex flex-col items-center select-none w-full max-w-md mx-auto ${className}`}>
      {/* ── 小莤 3D 剧场梦幻舞台 ── */}
      <div className="relative w-full h-80 bg-gradient-to-b from-sky-300 via-rose-100 to-amber-100 rounded-3xl p-4 border-4 border-amber-300 shadow-2xl flex flex-col items-center justify-between overflow-hidden">
        {/* 顶部马戏团/剧场红色流苏帷幕 */}
        <div className="absolute top-0 inset-x-0 h-9 bg-gradient-to-b from-red-600 to-rose-700 rounded-b-2xl border-b-2 border-yellow-300 shadow-md flex justify-around items-center px-4 z-20">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={i} className="text-yellow-300 text-xs">⭐</span>
          ))}
        </div>

        {/* 舞台悬浮气球与闪烁星星 */}
        <div className="absolute top-11 left-4 text-2xl opacity-70 animate-bounce">🎈</div>
        <div className="absolute top-12 right-6 text-2xl opacity-70 animate-bounce" style={{ animationDelay: '0.8s' }}>🌸</div>
        <div className="absolute bottom-12 left-5 text-xl opacity-60">🍄</div>
        <div className="absolute bottom-12 right-5 text-xl opacity-60">🌱</div>

        {/* 顶部角色标签栏 */}
        <div className="relative z-20 mt-6 flex items-center gap-2 px-4 py-1.5 bg-white/95 backdrop-blur-md rounded-full border-2 border-amber-300 shadow-md">
          <span className="text-sm font-black text-candy-purple-deep">{name}</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-extrabold shadow-xs">
            {character}
          </span>
        </div>

        {/* 核心互动拟人角色 (大动画主体 + 触摸放大 + 产生光效) */}
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          animate={{
            y: [0, -8, 0],
            rotate: [0, 2, -2, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.2,
            ease: 'easeInOut',
          }}
          onClick={handleCharacterTap}
          className="relative cursor-pointer z-10 flex flex-col items-center my-auto group"
        >
          {/* 超大立体发音字母 */}
          <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)] font-sans">
            {symbol}
          </div>

          {/* 拟人形象 3D Emoji */}
          <div className="text-6xl -mt-4 filter drop-shadow-md group-hover:scale-125 transition-transform">
            {emoji}
          </div>

          {/* 动画互动提示小手 */}
          <motion.div
            animate={{ scale: [1, 1.1, 1], y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="mt-2 px-3 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 text-amber-950 font-black text-xs shadow-md border border-white"
          >
            👆 点我互动！
          </motion.div>

          {/* 爆发心形与闪烁星光粒子 */}
          <AnimatePresence>
            {isSparkling && (
              <motion.div
                initial={{ opacity: 0, scale: 0.4, y: 15 }}
                animate={{ opacity: 1, scale: 1.3, y: -30 }}
                exit={{ opacity: 0 }}
                className="absolute -top-8 text-4xl pointer-events-none filter drop-shadow"
              >
                ✨💖✨
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 底部木质舞台台阶 */}
        <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-b from-amber-700 to-amber-900 border-t-2 border-yellow-400 z-10 flex items-center justify-center">
          <div className="w-48 h-2 bg-yellow-300/40 rounded-full blur-xs" />
        </div>

        {/* 底部漫画对话气泡 */}
        <div className="relative z-20 w-full px-4 py-2 bg-white/95 rounded-2xl border-2 border-amber-300 shadow-md text-center -mb-1">
          <div className="text-xs sm:text-sm font-black text-candy-purple-deep line-clamp-2">
            💬 {bubbleText || prompt}
          </div>
        </div>
      </div>

      {/* ── 小莤形音记忆口诀与趣味科普卡 ── */}
      <div className="w-full mt-4 space-y-3">
        {/* 口诀卡片 */}
        <div className="p-4 bg-gradient-to-r from-purple-100 via-pink-100 to-amber-100 rounded-3xl border-3 border-purple-300 text-center shadow-md">
          <div className="text-xs font-black text-purple-900 mb-1 flex items-center justify-center gap-1.5">
            <span>🌟</span>
            <span>小莤形音记忆口诀</span>
            <span>🌟</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-candy-purple-deep tracking-wide">
            {rhyme}
          </div>
        </div>

        {/* 趣味科普 */}
        <div className="flex items-start gap-2.5 p-3.5 bg-sky-50 rounded-2xl border-2 border-sky-200 text-xs shadow-xs">
          <span className="text-xl">💡</span>
          <div className="text-sky-950 font-bold leading-relaxed">
            <span className="font-black text-sky-800">趣味特征：</span>
            {visualDesc}。{funFact}
          </div>
        </div>

        {/* 底部朗读与继续按钮 */}
        <div className="flex justify-center gap-3 pt-2">
          <CandyButton
            tone="purple"
            size="md"
            variant="soft"
            onClick={() => {
              sfxTap();
              speak(`${symbol}，${rhyme}`, { lang: 'zh-CN', rate: 0.65 });
            }}
          >
            🔊 听口诀唱诵
          </CandyButton>
          <CandyButton
            tone="green"
            size="md"
            onClick={() => {
              sfxCorrect();
              onInteracted?.();
            }}
          >
            我认识啦 ➔
          </CandyButton>
        </div>
      </div>
    </div>
  );
}
