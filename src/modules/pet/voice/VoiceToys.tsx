import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  sfxTap,
  sfxBubble,
  sfxBoing,
  sfxMagic,
  sfxMeow,
  sfxMusicBox,
} from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';

import type { CatExpressionType } from '@/components/games/FlatCat2D';

export interface VoiceToysProps {
  onEquipOutfit?: (category: 'hat' | 'neck', outfitId: string) => void;
  onCatAction?: (msg: string, expression: CatExpressionType) => void;
  currentOutfits?: Record<string, string>;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
}

const OUTFIT_OPTIONS = [
  { id: 'none', name: '原版', icon: '🐱', category: 'hat' as const },
  { id: 'crown', name: '皇冠', icon: '👑', category: 'hat' as const },
  { id: 'wizard', name: '魔法帽', icon: '🧙', category: 'hat' as const },
  { id: 'bow', name: '蝴蝶结', icon: '🎀', category: 'neck' as const },
  { id: 'scarf', name: '暖围巾', icon: '🧣', category: 'neck' as const },
  { id: 'sunglasses', name: '酷墨镜', icon: '🕶️', category: 'hat' as const },
];

export function VoiceToys({
  onEquipOutfit,
  onCatAction,
}: VoiceToysProps) {
  const [activeToy, setActiveToy] = useState<
    'none' | 'bubble' | 'wand' | 'yarn' | 'bell' | 'outfit' | 'music'
  >('none');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [yarnBounces, setYarnBounces] = useState(0);

  // 吹泡泡
  const handleBlowBubbles = () => {
    sfxBubble();
    setActiveToy('bubble');
    const newBubbles: Bubble[] = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      x: 15 + Math.random() * 70, // %
      y: 70 + Math.random() * 20, // %
      size: 24 + Math.random() * 20,
      color: ['rgba(244, 114, 182, 0.65)', 'rgba(192, 132, 252, 0.65)', 'rgba(56, 189, 248, 0.65)', 'rgba(52, 211, 153, 0.65)'][
        Math.floor(Math.random() * 4)
      ]!,
    }));
    setBubbles((prev) => [...prev.slice(-10), ...newBubbles]);
    onCatAction?.('哇！好多梦幻彩虹泡泡！快来戳破它们喵！🫧', 'excited');
  };

  // 戳破泡泡
  const handlePopBubble = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    sfxBubble();
    celebrateSmall();
    setBubbles((prev) => prev.filter((b) => b.id !== id));
  };

  // 抛毛线球
  const handlePlayYarn = () => {
    sfxBoing();
    setActiveToy('yarn');
    setYarnBounces((v) => v + 1);
    if (yarnBounces % 2 === 0) {
      sfxMeow();
      onCatAction?.('喵呜~ 抓到可爱的毛线球啦！小猫最喜欢玩这个啦！🧶', 'excited');
    }
  };

  // 逗猫棒
  const handlePlayWand = () => {
    sfxMagic();
    setActiveToy('wand');
    celebrateSmall();
    onCatAction?.('💫 哇！闪闪发光的羽毛逗猫棒！小茜飞扑抓抓抓！', 'excited');
  };

  // 摇铃铛
  const handlePlayBell = () => {
    sfxMusicBox();
    setActiveToy('bell');
    onCatAction?.('🔔 叮叮当～清脆的铃铛声响起来啦，小耳朵在跳舞呢！', 'happy');
  };

  // 八音盒音乐
  const handlePlayMusicBox = () => {
    sfxMusicBox();
    setActiveToy('music');
    onCatAction?.('🎶 八音盒叮咚响，听着真治愈呀喵~', 'happy');
  };

  return (
    <div className="relative w-full flex flex-col items-center gap-1.5 px-3">
      {/* 泡泡悬浮层（渲染在舞台上方） */}
      <AnimatePresence>
        {bubbles.map((b) => (
          <motion.button
            key={b.id}
            type="button"
            onClick={(e) => handlePopBubble(b.id, e)}
            initial={{ opacity: 0, scale: 0, y: 0 }}
            animate={{
              opacity: [0, 0.95, 0.9],
              scale: [0.5, 1.1, 1],
              y: -120 - Math.random() * 60,
              x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40],
            }}
            exit={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 3.5, ease: 'easeOut' }}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              backgroundColor: b.color,
            }}
            className="absolute z-30 cursor-pointer rounded-full border-2 border-white/80 shadow-md backdrop-blur-xs flex items-center justify-center text-xs select-none"
            title="戳破泡泡"
          >
            <span className="opacity-70 text-[10px]">✨</span>
          </motion.button>
        ))}
      </AnimatePresence>

      {/* 玩具工具箱选择胶囊栏 */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
        <button
          type="button"
          onClick={handleBlowBubbles}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black transition-all active:scale-95 shadow-xs ${
            activeToy === 'bubble'
              ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white'
              : 'border border-pink-200 bg-white/90 text-pink-700 hover:bg-pink-100/70'
          }`}
        >
          <span>🫧</span>
          <span>吹泡泡</span>
        </button>

        <button
          type="button"
          onClick={handlePlayWand}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black transition-all active:scale-95 shadow-xs ${
            activeToy === 'wand'
              ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white'
              : 'border border-amber-200 bg-white/90 text-amber-800 hover:bg-amber-100/70'
          }`}
        >
          <span>🪄</span>
          <span>逗猫棒</span>
        </button>

        <button
          type="button"
          onClick={handlePlayYarn}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black transition-all active:scale-95 shadow-xs ${
            activeToy === 'yarn'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
              : 'border border-purple-200 bg-white/90 text-purple-700 hover:bg-purple-100/70'
          }`}
        >
          <span>🧶</span>
          <span>毛线球</span>
        </button>

        <button
          type="button"
          onClick={handlePlayBell}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black transition-all active:scale-95 shadow-xs ${
            activeToy === 'bell'
              ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white'
              : 'border border-yellow-200 bg-white/90 text-yellow-800 hover:bg-yellow-100/70'
          }`}
        >
          <span>🔔</span>
          <span>摇铃铛</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sfxTap();
            setActiveToy((v) => (v === 'outfit' ? 'none' : 'outfit'));
          }}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black transition-all active:scale-95 shadow-xs ${
            activeToy === 'outfit'
              ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white'
              : 'border border-pink-200 bg-white/90 text-pink-800 hover:bg-pink-100/70'
          }`}
        >
          <span>👑</span>
          <span>变装秀</span>
        </button>

        <button
          type="button"
          onClick={handlePlayMusicBox}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black transition-all active:scale-95 shadow-xs ${
            activeToy === 'music'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white'
              : 'border border-emerald-200 bg-white/90 text-emerald-800 hover:bg-emerald-100/70'
          }`}
        >
          <span>🎵</span>
          <span>八音盒</span>
        </button>
      </div>

      {/* 变装抽屉展开区 */}
      <AnimatePresence>
        {activeToy === 'outfit' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-pink-200/80 bg-white/95 p-2 shadow-inner"
          >
            {OUTFIT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  sfxMagic();
                  celebrateSmall();
                  onEquipOutfit?.(opt.category, opt.id === 'none' ? '' : opt.id);
                  onCatAction?.(`✨ 变身成功！看小茜的全新 ${opt.name} 造型好看嘛喵？`, 'excited');
                }}
                className="flex shrink-0 flex-col items-center rounded-xl border border-pink-100 bg-pink-50/60 px-2.5 py-1.5 text-center transition-all hover:bg-pink-100 hover:scale-105 active:scale-95"
              >
                <span className="text-lg">{opt.icon}</span>
                <span className="text-[10px] font-bold text-ink-soft">{opt.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
