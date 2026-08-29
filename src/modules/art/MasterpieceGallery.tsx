/**
 * 🖼️ 世界名画拼图与艺术鉴赏馆 (Masterpiece Gallery & Art Puzzle)
 * ------------------------------------------------------------
 * 1. 6 幅传世经典中外名画（星月夜、睡莲、千里江山图、神奈川冲浪里、蒙娜丽莎、向日葵）
 * 2. 4 块/9 块互动名画复原拼图板
 * 3. 艺术美学启蒙与画家故事语音导览
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';

export interface MasterpieceItem {
  id: string;
  title: string;
  titleEn: string;
  artist: string;
  era: string;
  style: string;
  emoji: string;
  coverGradient: string;
  desc: string;
  story: string;
  pieces: string[]; // 4 块或 9 块拼图碎片 emoji/元素
}

export const MASTERPIECES: MasterpieceItem[] = [
  {
    id: 'starry-night',
    title: '《星月夜》',
    titleEn: 'The Starry Night',
    artist: '文森特·梵高 (荷兰)',
    era: '1889 年',
    style: '后印象派',
    emoji: '🌌',
    coverGradient: 'from-blue-900 via-indigo-900 to-amber-700',
    desc: '旋转翻滚的夜空星云、闪耀金光的月亮与挺拔的柏树，充满了神奇的想象力！',
    story: '梵高叔叔非常喜欢夜晚的星空，他用充满激情的粗短笔触，把星空画得像波浪一样流动翻滚！',
    pieces: ['🌀 旋转星云', '🌙 金色月牙', '🌲 黑色柏树', '🏘️ 安睡村庄'],
  },
  {
    id: 'water-lilies',
    title: '《睡莲》',
    titleEn: 'Water Lilies',
    artist: '克劳德·莫奈 (法国)',
    era: '1916 年',
    style: '印象派',
    emoji: '🪷',
    coverGradient: 'from-teal-800 via-emerald-700 to-pink-600',
    desc: '清澈宁静的池塘水面，倒映着蓝天与白云，粉红的睡莲在微风中轻轻摇曳。',
    story: '莫奈爷爷在自家的吉维尼花园里种满了美丽的睡莲，他最喜欢画清晨和傍晚光线在水面上的神奇倒影！',
    pieces: ['🪷 粉红睡莲', '🍃 碧绿荷叶', '💧 清澈池水', '☁️ 水面倒影'],
  },
  {
    id: 'thousand-li-landscape',
    title: '《千里江山图》',
    titleEn: 'A Thousand Li of Rivers',
    artist: '王希孟 (中国北宋)',
    era: '北宋 (1113 年)',
    style: '大青绿山水',
    emoji: '🏔️',
    coverGradient: 'from-emerald-900 via-teal-800 to-amber-800',
    desc: '长达近 12 米的青绿山水传世巨作！峰峦起伏，江河浩渺，飞瀑流泉，壮丽非凡！',
    story: '王希孟画这幅画时才 18 岁！他用昂贵的孔雀石和绿松石天然矿物颜料，历经千年依然青翠欲滴！',
    pieces: ['⛰️ 巍峨青峰', '🌊 浩渺碧波', '🌉 飞云水榭', '⛵ 扬帆扁舟'],
  },
  {
    id: 'great-wave',
    title: '《神奈川冲浪里》',
    titleEn: 'The Great Wave',
    artist: '葛饰北斋 (日本)',
    era: '1831 年',
    style: '浮世绘木刻版画',
    emoji: '🌊',
    coverGradient: 'from-blue-950 via-cyan-900 to-slate-200',
    desc: '翻滚咆哮的巨大白浪如巨爪般腾空而起，远处的富士山巍然屹立，充满生命力量！',
    story: '汹涌的大海浪花和英勇划船的小渔民形成了极具张力的对比，是世界上最著名的版画之一！',
    pieces: ['🌊 卷曲浪爪', '🗻 远方雪山', '🚣 破浪木船', '☁️ 苍茫云海'],
  },
  {
    id: 'mona-lisa',
    title: '《蒙娜丽莎》',
    titleEn: 'Mona Lisa',
    artist: '列奥纳多·达·芬奇 (意大利)',
    era: '1503 年',
    style: '文艺复兴全盛期',
    emoji: '👩',
    coverGradient: 'from-amber-950 via-yellow-950 to-stone-800',
    desc: '世界上最著名的肖像画，蒙娜丽莎嘴角带着若隐若现的神秘微笑，眼神温柔动人。',
    story: '达·芬奇大师运用了神奇的「晕涂法」，不论你从哪个角度看，她仿佛都在温柔地注视着你微笑！',
    pieces: ['✨ 神秘微笑', '👀 温柔眼神', '🧣 雅致服饰', '🏞️ 朦胧背景'],
  },
  {
    id: 'sunflowers',
    title: '《向日葵》',
    titleEn: 'Sunflowers',
    artist: '文森特·梵高 (荷兰)',
    era: '1888 年',
    style: '后印象派',
    emoji: '🌻',
    coverGradient: 'from-yellow-600 via-amber-500 to-orange-700',
    desc: '满瓶盛开的金黄向日葵，像炽热的小太阳一样绽放，代表着满满的阳光与爱！',
    story: '梵高把向日葵视为光明和希望的象征，用灿烂温暖的纯黄色彩画出了对生活最纯真的热爱！',
    pieces: ['🌻 金黄花瓣', '🍯 陶土花瓶', '🌿 翠绿花茎', '☀️ 暖黄背景'],
  },
];

const FALLBACK_MASTERPIECE = MASTERPIECES[0] ?? {
  id: 'starry-night',
  title: '《星月夜》',
  titleEn: 'The Starry Night',
  artist: '文森特·梵高',
  era: '1889 年',
  style: '后印象派',
  emoji: '🌌',
  coverGradient: 'from-blue-900 to-amber-700',
  desc: '旋转翻滚的夜空星云',
  story: '梵高叔叔画的星空',
  pieces: ['🌀 旋转星云', '🌙 金色月牙', '🌲 黑色柏树', '🏘️ 安睡村庄'],
};

export function MasterpieceGallery() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [assembledPieces, setAssembledPieces] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const addStars = useStore((s) => s.addStars);
  const addFish = useStore((s) => s.addFish);

  const current = useMemo(() => {
    return MASTERPIECES[selectedIdx % MASTERPIECES.length] ?? FALLBACK_MASTERPIECE;
  }, [selectedIdx]);

  const handleSelectMasterpiece = useCallback((idx: number) => {
    sfxTap();
    triggerHaptic(20);
    setSelectedIdx(idx);
    setAssembledPieces([]);
    setIsCompleted(false);
    const target = MASTERPIECES[idx % MASTERPIECES.length] ?? FALLBACK_MASTERPIECE;
    void speak(`欢迎欣赏世界名画${target.title}，由著名画家${target.artist}创作。快来拼装名画碎片吧！`, { lang: 'zh-CN' });
  }, []);

  const handlePlacePiece = useCallback((piece: string) => {
    if (assembledPieces.includes(piece) || isCompleted) return;
    sfxCorrect();
    triggerHaptic(35);
    const updated = [...assembledPieces, piece];
    setAssembledPieces(updated);

    if (updated.length === current.pieces.length) {
      setIsCompleted(true);
      sfxWin();
      triggerHaptic([60, 40, 60, 40, 100]);
      celebrateBig();
      addStars(5);
      addFish(2);
      void speak(`恭喜完成名画复原！${current.title}，${current.story}`, { lang: 'zh-CN' });
    }
  }, [assembledPieces, isCompleted, current, addStars, addFish]);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const targetPiece = current.pieces[idx];
        if (targetPiece && !assembledPieces.includes(targetPiece) && !isCompleted) {
          e.preventDefault();
          handlePlacePiece(targetPiece);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSelectMasterpiece((selectedIdx + 1) % MASTERPIECES.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSelectMasterpiece((selectedIdx - 1 + MASTERPIECES.length) % MASTERPIECES.length);
      } else if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        sfxTap();
        void speak(`${current.title}，${current.story}`, { lang: 'zh-CN' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [current, assembledPieces, isCompleted, selectedIdx, handlePlacePiece, handleSelectMasterpiece]);

  return (
    <div className="space-y-6">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-amber-900 font-bold bg-amber-50/90 px-3 py-1 rounded-xl border border-amber-200">
          ⌨️ 键盘快捷操作：数字键 1-4 拼装碎片 · 左右方向键 切换名画 · 空格/R 重听大师故事
        </span>
      </div>

      {/* 名画导览选择器 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {MASTERPIECES.map((art, idx) => {
          const active = selectedIdx === idx;
          return (
            <button
              key={art.id}
              type="button"
              onClick={() => handleSelectMasterpiece(idx)}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm border-2 ${
                active
                  ? 'bg-amber-600 text-candy-orange-on border-amber-700 shadow-md scale-105'
                  : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span className="text-xl">{art.emoji}</span>
              <span>{art.title}</span>
            </button>
          );
        })}
      </div>

      {/* 名画复原拼图主舞台 */}
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 rounded-3xl border-3 border-amber-300 p-6 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* 名画画框展示 */}
          <div className="relative w-48 h-48 rounded-3xl p-3 bg-amber-900 shadow-2xl border-4 border-amber-700 flex items-center justify-center overflow-hidden">
            <div className={`w-full h-full rounded-2xl bg-gradient-to-br ${current.coverGradient} flex flex-col items-center justify-center text-center p-3 text-white shadow-inner`}>
              <span className="text-6xl mb-1 select-none filter drop-shadow-md">{current.emoji}</span>
              <span className="text-sm font-black tracking-wider drop-shadow">{current.title}</span>
            </div>
            {isCompleted && (
              <div className="absolute inset-0 bg-amber-500/20 backdrop-blur-[1px] flex items-center justify-center">
                <span className="text-4xl animate-bounce">✨</span>
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-3xl font-black text-slate-800">{current.title}</h3>
              <span className="text-sm font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                {current.style} · {current.era}
              </span>
            </div>
            <p className="text-xs font-black text-amber-800">
              🎨 创作者：{current.artist}
            </p>
            <p className="text-xs text-slate-600 font-medium">
              {current.desc}
            </p>
            <div className="p-3 bg-white/90 rounded-2xl border border-amber-200 text-xs font-bold text-slate-700">
              📖 <span className="text-amber-900 font-black">名画背后的故事：</span>{current.story}
            </div>
          </div>
        </div>

        {/* 拼图互动卡槽 */}
        <div className="bg-white rounded-3xl p-6 border-2 border-amber-200 shadow-inner space-y-4 text-center">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <span>🧩</span>
              <span>名画元素拼图板 (已拼入 {assembledPieces.length} / {current.pieces.length})</span>
            </h4>
            <span className="text-xs text-amber-700 font-bold">
              {isCompleted ? '🎉 拼图大圆满！获得 5 颗探索星！' : '点击下方碎片完成拼装'}
            </span>
          </div>

          {/* 4 块拼图槽 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            {current.pieces.map((piece) => {
              const placed = assembledPieces.includes(piece);
              return (
                <motion.button
                  key={piece}
                  type="button"
                  disabled={placed}
                  whileHover={!placed ? { scale: 1.05 } : {}}
                  whileTap={!placed ? { scale: 0.95 } : {}}
                  onClick={() => handlePlacePiece(piece)}
                  className={`p-4 rounded-2xl border-2 font-black text-sm transition-all flex flex-col items-center justify-center gap-2 shadow-sm ${
                    placed
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-900 scale-105'
                      : 'bg-amber-50 border-amber-200 text-slate-700 hover:border-amber-400 hover:bg-amber-100/60 active:scale-95'
                  }`}
                >
                  <span className="text-3xl select-none">{placed ? '✅' : '🧩'}</span>
                  <span>{piece}</span>
                  <span className="text-xs text-slate-400">
                    {placed ? '已精准复原' : '👉 点击拼装'}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
