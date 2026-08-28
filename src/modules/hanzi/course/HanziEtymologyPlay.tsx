import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { HanziEntry } from '@/data/hanzi';
import { speak } from '@/lib/speech';
import { sfxTap, sfxMagic, sfxCorrect, sfxStar } from '@/lib/sfx';

interface Props {
  char: HanziEntry;
  onComplete: (stars: number) => void;
}

export function HanziEtymologyPlay({ char, onComplete }: Props) {
  const [activeStage, setActiveStage] = useState<number>(0);
  const [isSparkling, setIsSparkling] = useState<boolean>(false);

  const stages = [
    { title: '实物图画', desc: char.origin, tag: '原始具象', icon: '🎨' },
    { title: '甲骨古文', desc: '三千年前刻在龟甲兽骨上的图形文字', tag: '甲骨文', icon: '📜' },
    { title: '金文小篆', desc: '刻在青铜器与秦代竹简上的优美字体', tag: '篆书演变', icon: '🏺' },
    { title: '现代楷书', desc: `如今规范端正的「${char.c}」字`, tag: '楷体规范', icon: '✨' },
  ];

  useEffect(() => {
    // 初始语音朗读演变简介
    speak(`我们来看看「${char.c}」字的演变故事。${char.origin}`);
  }, [char]);

  const handleStageClick = (idx: number) => {
    sfxTap();
    setActiveStage(idx);
    if (idx === 0) {
      speak(`这是实物画面：${char.origin}`);
    } else if (idx === 1) {
      speak(`甲骨文时期的样子，${char.evolve}`);
    } else if (idx === 2) {
      speak(`金文小篆逐渐变得修长圆润。`);
    } else {
      speak(`演变成今天的楷书「${char.c}」，读音是 ${char.pd}`);
    }
  };

  const handleInteractiveExplore = () => {
    sfxMagic();
    setIsSparkling(true);
    setTimeout(() => setIsSparkling(false), 1200);
  };

  const handleFinish = () => {
    sfxCorrect();
    sfxStar();
    onComplete(3);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[460px] p-4 text-slate-800">
      {/* 顶部标题与语音说明 */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100/80 border border-amber-300 rounded-full text-amber-900 font-bold text-sm">
          <span>🎬 象形溯源与互动探险</span>
          <span className="text-xs bg-amber-200 px-2 py-0.5 rounded-full">{char.pd}</span>
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-wide">
          「{char.c}」字的奇妙诞生记
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto line-clamp-2">
          {char.origin}
        </p>
      </div>

      {/* 核心演变舞台 (Stage Showcase) */}
      <div className="relative w-full max-w-md my-4 p-6 bg-gradient-to-b from-amber-50 to-orange-50/80 rounded-3xl border-2 border-amber-200 shadow-xl overflow-hidden flex flex-col items-center">
        {/* 背景光环 */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-amber-300/30 to-orange-400/20 rounded-full blur-2xl pointer-events-none"
        />

        {/* 动态演变字形展示框 */}
        <div
          onClick={handleInteractiveExplore}
          className="relative w-36 h-36 bg-white/90 rounded-2xl shadow-inner border-2 border-amber-300/80 flex items-center justify-center cursor-pointer select-none group transition-transform active:scale-95"
          role="button"
          tabIndex={0}
          aria-label="点击触发魔法字形动效"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStage}
              initial={{ opacity: 0, scale: 0.7, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.2, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {activeStage === 0 && (
                <div className="flex flex-col items-center">
                  <span className="text-6xl animate-bounce">🎨</span>
                  <span className="text-xs font-bold text-amber-700 mt-1">象形实物</span>
                </div>
              )}
              {activeStage === 1 && (
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-serif text-amber-900 font-bold tracking-widest">𓀠 {char.c}</span>
                  <span className="text-xs font-bold text-amber-700 mt-1">甲骨文形态</span>
                </div>
              )}
              {activeStage === 2 && (
                <div className="flex flex-col items-center">
                  <span className="text-5xl font-serif text-amber-900 font-bold">篆 • {char.c}</span>
                  <span className="text-xs font-bold text-amber-700 mt-1">金文/篆体</span>
                </div>
              )}
              {activeStage === 3 && (
                <div className="flex flex-col items-center">
                  <span className="text-6xl font-black text-amber-950 font-sans">{char.c}</span>
                  <span className="text-xs font-bold text-emerald-700 mt-1">楷书规范</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* 魔法粒子飞舞反馈 */}
          {isSparkling && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 bg-amber-400/20 rounded-2xl flex items-center justify-center text-2xl"
            >
              ✨⭐✨
            </motion.div>
          )}

          <div className="absolute bottom-1 right-2 text-xs text-amber-500/80 font-medium">
            👆 轻触看魔法
          </div>
        </div>

        {/* 演变四阶段选择器 (Timeline Stepper) */}
        <div className="grid grid-cols-4 gap-2 w-full mt-6">
          {stages.map((stg, i) => {
            const active = activeStage === i;
            return (
              <button
                key={stg.tag}
                type="button"
                onClick={() => handleStageClick(i)}
                className={`flex flex-col items-center p-2 rounded-xl border text-xs font-bold transition-all ${
                  active
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-105'
                    : 'bg-white/80 text-slate-700 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span className="text-base">{stg.icon}</span>
                <span className="mt-0.5">{stg.tag}</span>
              </button>
            );
          })}
        </div>

        {/* 阶段描述卡片 */}
        <div className="w-full mt-3 p-3 bg-white/70 rounded-xl text-xs text-slate-700 text-center font-medium border border-amber-200/60">
          💡 {stages[activeStage]?.desc}
        </div>
      </div>

      {/* 底部完成互动按钮 */}
      <div className="w-full max-w-md flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => speak(char.evolve)}
          className="px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-amber-300"
        >
          <span>🔊</span>
          <span>再听一遍</span>
        </button>

        <button
          type="button"
          onClick={handleFinish}
          className="flex-1 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-300/50 flex items-center justify-center gap-2 transition-transform active:scale-98"
        >
          <span>🌟 探险完成，进入「认字理」</span>
          <span>➔</span>
        </button>
      </div>
    </div>
  );
}
