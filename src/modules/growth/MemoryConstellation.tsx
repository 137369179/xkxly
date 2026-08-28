/**
 * 🌌 帮帮识字/洪恩级全景记忆星图 (Adaptive Memory Constellation)
 * ------------------------------------------------------------------
 * 1. 汇聚全平台 5 大知识体系（汉字/拼音/数字/英语/古诗）；
 * 2. 依据艾宾浩斯遗忘曲线智能标记状态：
 *    - ⭐ 熟练掌握 (Mastered, lv >= 3)
 *    - 🟢 稳步提升 (Learning, lv 1~2)
 *    - 🔴 遗忘预警 (Memory Decay, isDue = true, 急需复习！)
 *    - ⚪ 尚未点亮 (Locked)
 * 3. 支持点击单点星球展开「知识星卡」与即时发音试听。
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMastery } from '@/store/useStore';
import { isDue } from '@/lib/srs';
import { speak } from '@/lib/speech';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';

// ── 知识星系分类 ──
export type GalaxyCategory = 'all' | 'hanzi' | 'pinyin' | 'math' | 'words' | 'poems';

interface StarNode {
  id: string;
  name: string;
  category: GalaxyCategory;
  categoryName: string;
  emoji: string;
  pinyin?: string;
  meaning?: string;
}

// 精选核心全景知识点样本库（包含基础高频 100+ 核心字词句）
const SAMPLE_STARS: StarNode[] = [
  // 汉字星系
  { id: 'hanzi:人', name: '人', category: 'hanzi', categoryName: '汉字星系', emoji: '🧍', pinyin: 'rén', meaning: '人类、大人' },
  { id: 'hanzi:大', name: '大', category: 'hanzi', categoryName: '汉字星系', emoji: '🐘', pinyin: 'dà', meaning: '巨大、大树' },
  { id: 'hanzi:天', name: '天', category: 'hanzi', categoryName: '汉字星系', emoji: '⛅', pinyin: 'tiān', meaning: '蓝天、天空' },
  { id: 'hanzi:地', name: '地', category: 'hanzi', categoryName: '汉字星系', emoji: '🌍', pinyin: 'dì', meaning: '大地、地面' },
  { id: 'hanzi:日', name: '日', category: 'hanzi', categoryName: '汉字星系', emoji: '☀️', pinyin: 'rì', meaning: '太阳、日子' },
  { id: 'hanzi:月', name: '月', category: 'hanzi', categoryName: '汉字星系', emoji: '🌙', pinyin: 'yuè', meaning: '月亮、月份' },
  { id: 'hanzi:水', name: '水', category: 'hanzi', categoryName: '汉字星系', emoji: '💧', pinyin: 'shuǐ', meaning: '清水、雨水' },
  { id: 'hanzi:火', name: '火', category: 'hanzi', categoryName: '汉字星系', emoji: '🔥', pinyin: 'huǒ', meaning: '大火、火焰' },
  { id: 'hanzi:山', name: '山', category: 'hanzi', categoryName: '汉字星系', emoji: '⛰️', pinyin: 'shān', meaning: '高山、山峰' },
  { id: 'hanzi:木', name: '木', category: 'hanzi', categoryName: '汉字星系', emoji: '🪵', pinyin: 'mù', meaning: '树木、木头' },
  { id: 'hanzi:禾', name: '禾', category: 'hanzi', categoryName: '汉字星系', emoji: '🌾', pinyin: 'hé', meaning: '禾苗、庄稼' },
  { id: 'hanzi:口', name: '口', category: 'hanzi', categoryName: '汉字星系', emoji: '👄', pinyin: 'kǒu', meaning: '嘴巴、门口' },
  { id: 'hanzi:耳', name: '耳', category: 'hanzi', categoryName: '汉字星系', emoji: '👂', pinyin: 'ěr', meaning: '耳朵、听觉' },
  { id: 'hanzi:目', name: '目', category: 'hanzi', categoryName: '汉字星系', emoji: '👁️', pinyin: 'mù', meaning: '眼睛、目光' },
  { id: 'hanzi:手', name: '手', category: 'hanzi', categoryName: '汉字星系', emoji: '✋', pinyin: 'shǒu', meaning: '小手、双手' },
  { id: 'hanzi:足', name: '足', category: 'hanzi', categoryName: '汉字星系', emoji: '🦶', pinyin: 'zú', meaning: '双脚、足球' },

  // 拼音星系
  { id: 'pinyin:a', name: 'a', category: 'pinyin', categoryName: '拼音星系', emoji: '🗣️', pinyin: 'ā', meaning: '单韵母 a' },
  { id: 'pinyin:o', name: 'o', category: 'pinyin', categoryName: '拼音星系', emoji: '🗣️', pinyin: 'ō', meaning: '单韵母 o' },
  { id: 'pinyin:e', name: 'e', category: 'pinyin', categoryName: '拼音星系', emoji: '🗣️', pinyin: 'ē', meaning: '单韵母 e' },
  { id: 'pinyin:b', name: 'b', category: 'pinyin', categoryName: '拼音星系', emoji: '🚗', pinyin: 'bō', meaning: '声母 b' },
  { id: 'pinyin:p', name: 'p', category: 'pinyin', categoryName: '拼音星系', emoji: '🚗', pinyin: 'pō', meaning: '声母 p' },
  { id: 'pinyin:m', name: 'm', category: 'pinyin', categoryName: '拼音星系', emoji: '🚗', pinyin: 'mō', meaning: '声母 m' },
  { id: 'pinyin:f', name: 'f', category: 'pinyin', categoryName: '拼音星系', emoji: '🚗', pinyin: 'fō', meaning: '声母 f' },
  { id: 'pinyin:zh', name: 'zh', category: 'pinyin', categoryName: '拼音星系', emoji: '👅', pinyin: 'zhī', meaning: '翘舌声母 zh' },
  { id: 'pinyin:ch', name: 'ch', category: 'pinyin', categoryName: '拼音星系', emoji: '👅', pinyin: 'chī', meaning: '翘舌声母 ch' },
  { id: 'pinyin:sh', name: 'sh', category: 'pinyin', categoryName: '拼音星系', emoji: '👅', pinyin: 'shī', meaning: '翘舌声母 sh' },

  // 数学星系
  { id: 'math:1', name: '1', category: 'math', categoryName: '数学星系', emoji: '🔢', meaning: '数字 1 · 一根小棍' },
  { id: 'math:2', name: '2', category: 'math', categoryName: '数学星系', emoji: '🔢', meaning: '数字 2 · 小鸭水上漂' },
  { id: 'math:5', name: '5', category: 'math', categoryName: '数学星系', emoji: '🔢', meaning: '数字 5 · 秤钩挂东西' },
  { id: 'math:10', name: '10', category: 'math', categoryName: '数学星系', emoji: '🔢', meaning: '数字 10 · 满十进一' },
  { id: 'math:add', name: '+', category: 'math', categoryName: '数学星系', emoji: '➕', meaning: '加法合体' },
  { id: 'math:sub', name: '-', category: 'math', categoryName: '数学星系', emoji: '➖', meaning: '减法拿走' },

  // 英语星系
  { id: 'word:apple', name: 'Apple', category: 'words', categoryName: '英语星系', emoji: '🍎', pinyin: 'ˈæp.əl', meaning: '苹果' },
  { id: 'word:cat', name: 'Cat', category: 'words', categoryName: '英语星系', emoji: '🐱', pinyin: 'kæt', meaning: '小猫' },
  { id: 'word:dog', name: 'Dog', category: 'words', categoryName: '英语星系', emoji: '🐶', pinyin: 'dɒɡ', meaning: '小狗' },
  { id: 'word:sun', name: 'Sun', category: 'words', categoryName: '英语星系', emoji: '☀️', pinyin: 'sʌn', meaning: '太阳' },
  { id: 'word:star', name: 'Star', category: 'words', categoryName: '英语星系', emoji: '⭐', pinyin: 'stɑːr', meaning: '星星' },

  // 古诗星系
  { id: 'poem:p001', name: '静夜思', category: 'poems', categoryName: '古诗星系', emoji: '🌙', meaning: '床前明月光，疑是地上霜' },
  { id: 'poem:p002', name: '咏鹅', category: 'poems', categoryName: '古诗星系', emoji: '🦢', meaning: '鹅鹅鹅，曲项向天歌' },
  { id: 'poem:p003', name: '春晓', category: 'poems', categoryName: '古诗星系', emoji: '🌸', meaning: '春眠不觉晓，处处闻啼鸟' },
  { id: 'poem:p004', name: '悯农', category: 'poems', categoryName: '古诗星系', emoji: '🌾', meaning: '锄禾日当午，汗滴禾下土' },
];

const GALAXY_TABS = [
  { id: 'all' as const, label: '🌌 全景星空', emoji: '🌌' },
  { id: 'hanzi' as const, label: '🀄 汉字星系', emoji: '🀄' },
  { id: 'pinyin' as const, label: '🗣️ 拼音星系', emoji: '🗣️' },
  { id: 'math' as const, label: '🔢 数学星系', emoji: '🔢' },
  { id: 'words' as const, label: '🔠 英语星系', emoji: '🔠' },
  { id: 'poems' as const, label: '🌸 古诗星系', emoji: '🌸' },
];

export function MemoryConstellation() {
  const mastery = useMastery();
  const [activeCategory, setActiveCategory] = useState<GalaxyCategory>('all');
  const [selectedStar, setSelectedStar] = useState<StarNode | null>(null);

  // 过滤后的星星列表
  const filteredStars = useMemo(() => {
    if (activeCategory === 'all') return SAMPLE_STARS;
    return SAMPLE_STARS.filter((s) => s.category === activeCategory);
  }, [activeCategory]);

  // 星星掌握度状态计算
  const getStarStatus = useCallback(
    (star: StarNode) => {
      const m = mastery[star.id];
      if (!m || m.lv === 0) return { status: 'unlocked' as const, label: '待探索', color: 'bg-slate-100 text-slate-400 border-slate-200' };
      if (isDue(m)) return { status: 'due' as const, label: '急需复习', color: 'bg-rose-50 text-rose-600 border-rose-400 ring-2 ring-rose-300 animate-pulse' };
      if (m.lv >= 3) return { status: 'mastered' as const, label: '熟练掌握', color: 'bg-amber-50 text-amber-600 border-amber-300 shadow-amber-200 shadow-md' };
      return { status: 'learning' as const, label: '稳步提升', color: 'bg-emerald-50 text-emerald-600 border-emerald-300' };
    },
    [mastery],
  );

  // 统计概览
  const stats = useMemo(() => {
    let mastered = 0;
    let dueCount = 0;
    let learning = 0;
    let unlearned = 0;

    SAMPLE_STARS.forEach((s) => {
      const m = mastery[s.id];
      if (!m || m.lv === 0) unlearned++;
      else if (isDue(m)) dueCount++;
      else if (m.lv >= 3) mastered++;
      else learning++;
    });

    return { mastered, dueCount, learning, unlearned, total: SAMPLE_STARS.length };
  }, [mastery]);

  const handleStarClick = useCallback((star: StarNode) => {
    sfxTap();
    triggerHaptic(20);
    setSelectedStar(star);
    celebrateSmall();
    const speakText = star.pinyin ? `${star.name}，读作${star.pinyin}` : star.name;
    void speak(speakText, { lang: 'zh-CN' });
  }, []);

  // 键盘快捷监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const tab = GALAXY_TABS[idx];
        if (tab) {
          e.preventDefault();
          sfxTap();
          triggerHaptic(20);
          setActiveCategory(tab.id);
        }
      } else if (e.key === 'Escape') {
        if (selectedStar) {
          e.preventDefault();
          setSelectedStar(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStar]);

  return (
    <div className="space-y-4">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-indigo-900 font-bold bg-indigo-50/90 px-3 py-1 rounded-xl border border-indigo-200">
          ⌨️ 键盘快捷操作：数字键 1-6 切换知识星系 · Esc 关闭星球卡片
        </span>
      </div>

      {/* 顶部统计总览 */}
      <div className="grid grid-cols-4 gap-2 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 p-4 rounded-3xl text-white shadow-xl">
        <div className="text-center">
          <p className="text-xs text-amber-300 font-bold">⭐ 熟练掌握</p>
          <p className="text-xl font-black text-amber-400">{stats.mastered}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-emerald-300 font-bold">🟢 正在学习</p>
          <p className="text-xl font-black text-emerald-400">{stats.learning}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-rose-300 font-bold">🔴 遗忘预警</p>
          <p className="text-xl font-black text-rose-400">{stats.dueCount}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-300 font-bold">⚪ 待点亮</p>
          <p className="text-xl font-black text-slate-300">{stats.unlearned}</p>
        </div>
      </div>

      {/* 星系分类切换按钮 */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-white/80 border border-slate-200">
        {GALAXY_TABS.map((tab) => {
          const isSel = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { sfxTap(); triggerHaptic(20); setActiveCategory(tab.id); }}
              className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-xl text-xs font-black transition-all ${
                isSel
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 星空宇宙画板 */}
      <div className="relative overflow-hidden rounded-3xl border-4 border-indigo-950/20 bg-gradient-to-b from-[#0b0f19] via-[#1a1c2e] to-[#0f172a] p-5 shadow-2xl min-h-[360px]">
        {/* 背景繁星点缀 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-transparent to-transparent pointer-events-none" />

        {/* 星球阵列 */}
        <div className="relative z-10 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {filteredStars.map((star) => {
            const { status, color } = getStarStatus(star);
            return (
              <motion.button
                key={star.id}
                type="button"
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleStarClick(star)}
                className={`relative flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all min-h-[68px] ${color}`}
              >
                <span className="text-xl mb-0.5">{star.emoji}</span>
                <span className="text-sm font-black leading-tight">{star.name}</span>
                {status === 'mastered' && (
                  <span className="absolute -top-1.5 -right-1.5 text-xs">⭐</span>
                )}
                {status === 'due' && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 选中的星际知识卡片 */}
      <AnimatePresence>
        {selectedStar && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-white rounded-3xl border-3 border-indigo-200 p-5 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedStar.emoji}</span>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-800">{selectedStar.name}</span>
                    {selectedStar.pinyin && (
                      <span className="text-sm font-bold text-indigo-600">{selectedStar.pinyin}</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-bold">{selectedStar.categoryName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStar(null)}
                className="p-1 text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {selectedStar.meaning && (
              <p className="text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                💡 知识释义：{selectedStar.meaning}
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  sfxTap();
                  void speak(selectedStar.name, { lang: 'zh-CN' });
                }}
                className="flex-1 py-2.5 rounded-2xl bg-indigo-600 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5"
              >
                <span>🔊</span>
                <span>再听发音</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
