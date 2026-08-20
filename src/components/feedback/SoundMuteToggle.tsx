/**
 * 宝贝学习乐园 · 玩具级大喇叭静音开关 (Kids Toy Sound Toggle)
 * -------------------------------------------------------------
 * 专为 6 岁儿童设计：
 * 1. 超大可触摸区域，糖果色立体软胶质感；
 * 2. 状态即时同步全局 sound.isMuted()；
 * 3. 伴随可爱的弹跳动画与提示气泡。
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '@/lib/sound';
import { sfxTap } from '@/lib/sfx';

export function SoundMuteToggle({ className = '' }: { className?: string }) {
  const [muted, setMuted] = useState(() => sound.isMuted());
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    return sound.subscribe(() => {
      setMuted(sound.isMuted());
    });
  }, []);

  const handleToggle = () => {
    sfxTap();
    const nextMuted = sound.toggleMute();
    setMuted(nextMuted);
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 1800);
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleToggle}
        aria-label={muted ? '开启声音' : '静音'}
        title={muted ? '点击开启声音 🔊' : '点击静音 🔇'}
        className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black shadow-sm transition-all border-2 ${
          muted
            ? 'border-slate-300 bg-slate-100 text-slate-400 hover:bg-slate-200'
            : 'border-amber-300 bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-amber-200'
        }`}
      >
        <span className="text-base">{muted ? '🔇' : '🔊'}</span>
        <span className="hidden sm:inline">{muted ? '静音中' : '声音开'}</span>
      </motion.button>

      {/* 点击气泡反馈 */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.8 }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 py-0.5 text-[10px] font-black text-white shadow-md z-50 pointer-events-none"
          >
            {muted ? '已静音 🔇' : '声音已开启 🔊'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
