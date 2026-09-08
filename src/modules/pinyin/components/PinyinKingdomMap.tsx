import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  KINGDOM_ISLANDS,
  getKingdomLevel,
  type KingdomIslandId,
  type KingdomPinyinLevel,
} from '@/data/pinyinKingdomData';
import { useStore, useStars } from '@/store/useStore';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { speak } from '@/lib/speech';

interface PinyinKingdomMapProps {
  onSelectLevel: (level: KingdomPinyinLevel) => void;
  onOpenCodex: () => void;
  onOpenPhonicsLab: () => void;
  className?: string;
}

export function PinyinKingdomMap({
  onSelectLevel,
  onOpenCodex,
  onOpenPhonicsLab,
  className = '',
}: PinyinKingdomMapProps) {
  const [selectedIslandId, setSelectedIslandId] = useState<KingdomIslandId>('single_final');
  const mastery = useStore((s) => s.progress.mastery);
  const stars = useStars();

  const activeIsland = useMemo(
    () => KINGDOM_ISLANDS.find((i) => i.id === selectedIslandId) || KINGDOM_ISLANDS[0]!,
    [selectedIslandId]
  );

  const islandLevels = useMemo(
    () => activeIsland.levelIds.map((id) => getKingdomLevel(id)),
    [activeIsland]
  );

  // 统计当前岛屿掌握度
  const islandProgress = useMemo(() => {
    let unlocked = 0;
    let totalStars = 0;
    islandLevels.forEach((lvl) => {
      const m = mastery[`pinyin:${lvl.p}`];
      if (m && m.lv > 0) {
        unlocked += 1;
        totalStars += Math.min(3, m.lv + 1);
      }
    });
    return {
      unlocked,
      total: islandLevels.length,
      totalStars,
      maxStars: islandLevels.length * 3,
    };
  }, [islandLevels, mastery]);

  const handleIslandClick = (id: KingdomIslandId) => {
    sfxTap();
    triggerHaptic(20);
    if (id === 'phonics_lab') {
      onOpenPhonicsLab();
    } else {
      setSelectedIslandId(id);
    }
  };

  const handleLevelClick = (level: KingdomPinyinLevel) => {
    sfxTap();
    triggerHaptic(30);
    speak(level.p, { lang: 'zh-CN', rate: 0.6 });
    onSelectLevel(level);
  };

  return (
    <div className={`flex flex-col space-y-4 select-none pb-12 ${className}`}>
      {/* ── 小莤王国顶部 3D 黄金状态栏 ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-3xl border-3 border-yellow-300 shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 border-2 border-white shadow-md flex items-center justify-center text-2xl filter drop-shadow">
            👑
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-wide text-yellow-100 flex items-center gap-1.5">
              <span>小莤拼音王国大冒险</span>
            </h1>
            <div className="text-[11px] font-bold text-amber-100/90">
              探索 5 大岛屿 · 63 个拼音精灵
            </div>
          </div>
        </div>

        {/* 顶部右侧快捷按钮群 */}
        <div className="flex items-center gap-2">
          {/* 星星背包 */}
          <div className="flex items-center gap-1 px-3 py-1 bg-black/25 backdrop-blur-md rounded-full border border-yellow-300/80 shadow-inner">
            <span className="text-yellow-300 text-sm animate-spin" style={{ animationDuration: '6s' }}>⭐</span>
            <span className="text-xs font-black text-yellow-200">{stars}</span>
          </div>

          {/* 拼音宝典 */}
          <button
            onClick={() => {
              sfxTap();
              onOpenCodex();
            }}
            className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full border border-purple-300 text-xs font-black shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <span>📖</span>
            <span className="hidden sm:inline">拼音宝典</span>
          </button>
        </div>
      </div>

      {/* ── 5 大 3D 浮岛横向切换栏 (含 3D 浮岛实景原画) ── */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar px-1">
        {KINGDOM_ISLANDS.map((island) => {
          const isSelected = island.id === selectedIslandId;
          return (
            <motion.button
              key={island.id}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleIslandClick(island.id)}
              className={`flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border-3 transition-all cursor-pointer shadow-md ${
                isSelected
                  ? 'bg-gradient-to-r ' +
                    island.gradientBg +
                    ' text-white border-yellow-200 ring-4 ring-orange-300/60 scale-105 shadow-xl'
                  : 'bg-white/95 text-slate-700 border-amber-200 hover:bg-amber-50'
              }`}
            >
              {island.image ? (
                <img
                  src={island.image}
                  alt={island.name}
                  className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-md"
                />
              ) : (
                <span className="text-2xl filter drop-shadow">{island.emoji}</span>
              )}
              <div className="text-left">
                <div className="text-xs font-black tracking-wide">{island.name}</div>
                <div
                  className={`text-[10px] font-extrabold ${
                    isSelected ? 'text-yellow-100' : 'text-slate-500'
                  }`}
                >
                  {island.subtitle}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── 3D 冒险大地图主视窗 (背景 + 3D 浮岛原画 + 蜿蜒鹅卵石小径) ── */}
      <div className="relative w-full rounded-3xl p-4 sm:p-6 border-4 border-amber-300 shadow-2xl overflow-hidden bg-gradient-to-b from-sky-400 via-sky-200 to-emerald-100 min-h-[520px] shadow-2xl">
        {/* 背景 3D 浮岛实景插画大背景 (高质感半透明融合) */}
        {activeIsland.image && (
          <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay">
            <img
              src={activeIsland.image}
              alt={activeIsland.name}
              className="w-full h-full object-cover filter blur-xs"
            />
          </div>
        )}

        {/* 动态天空气球、浮云与远山装饰 */}
        <div className="absolute top-4 left-6 text-3xl opacity-80 animate-bounce">🎈</div>
        <div className="absolute top-8 right-10 text-3xl opacity-80 animate-bounce" style={{ animationDelay: '1.2s' }}>🌸</div>
        <div className="absolute top-2 right-1/3 text-2xl opacity-60 animate-pulse">☁️</div>
        <div className="absolute top-12 left-1/4 text-2xl opacity-60 animate-pulse">☁️</div>

        {/* 岛屿专属 3D 门头横幅 */}
        <div className="relative z-10 flex items-center justify-between p-3.5 bg-white/95 backdrop-blur-md rounded-2xl border-2 border-amber-300 shadow-lg mb-6">
          <div className="flex items-center gap-3">
            {activeIsland.image ? (
              <img
                src={activeIsland.image}
                alt={activeIsland.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-md animate-pulse"
              />
            ) : (
              <span className="text-3xl filter drop-shadow">{activeIsland.emoji}</span>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-candy-purple-deep">
                  {activeIsland.name}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold border border-amber-300">
                  {islandProgress.unlocked}/{islandProgress.total} 已点亮
                </span>
              </div>
              <p className="text-xs font-bold text-ink-soft mt-0.5">
                {activeIsland.desc}
              </p>
            </div>
          </div>

          {/* 岛屿星级徽章 */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-xl border border-amber-200">
            <span className="text-base text-yellow-500">⭐</span>
            <span className="text-xs font-black text-amber-950">
              {islandProgress.totalStars} / {islandProgress.maxStars}
            </span>
          </div>
        </div>

        {/* ── 关卡节点矩阵（3D 黄金基座 + 拟人头像 + 3 金星） ── */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 py-2">
          {islandLevels.map((level, idx) => {
            const m = mastery[`pinyin:${level.p}`];
            const isMastered = m && m.lv >= 2;
            const isStarted = m && m.lv >= 1;
            const currentStars = isMastered ? 3 : isStarted ? 1 : 0;

            return (
              <motion.div
                key={level.p}
                whileHover={{ scale: 1.1, y: -6 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleLevelClick(level)}
                className="relative flex flex-col items-center cursor-pointer group"
              >
                {/* 关卡序号小旗帜 */}
                <div className="absolute -top-2 -left-1 z-20 px-2 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-black text-[10px] shadow-md border border-white">
                  #{idx + 1}
                </div>

                {/* 3D 立体圆柱基座 */}
                <div
                  className={`relative w-22 h-22 sm:w-24 sm:h-24 rounded-3xl flex flex-col items-center justify-center border-4 shadow-xl transition-all ${
                    isMastered
                      ? 'bg-gradient-to-b from-yellow-200 via-amber-300 to-yellow-500 border-amber-100 ring-4 ring-yellow-400/70 shadow-amber-400/50'
                      : isStarted
                      ? 'bg-gradient-to-b from-sky-100 via-cyan-200 to-blue-400 border-white ring-4 ring-sky-300/50 shadow-sky-300/40'
                      : 'bg-gradient-to-b from-white via-amber-50 to-orange-100 border-amber-200 hover:border-amber-400'
                  }`}
                >
                  {/* 通关皇冠 */}
                  {isMastered && (
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute -top-3 text-2xl filter drop-shadow"
                    >
                      👑
                    </motion.div>
                  )}

                  {/* 拟人形象 Emoji */}
                  <div className="text-3xl filter drop-shadow group-hover:scale-125 transition-transform">
                    {level.personification.emoji}
                  </div>

                  {/* 核心大拼音字母 */}
                  <div className="text-2xl sm:text-3xl font-black text-candy-purple-deep font-sans -mt-1 tracking-tight">
                    {level.p}
                  </div>
                </div>

                {/* 底部角色名与口诀提示标签 */}
                <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-[11px] font-black text-amber-950 border border-amber-300 shadow-sm max-w-[100px] truncate text-center">
                  {level.personification.character}
                </div>

                {/* 3 颗点亮金星 */}
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3].map((star) => (
                    <span
                      key={star}
                      className={`text-xs transition-colors ${
                        currentStars >= star
                          ? 'text-yellow-400 drop-shadow'
                          : 'text-slate-300 opacity-50'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── 岛屿通关大宝箱里程碑 (含 3D 宝箱实物插画) ── */}
        <div className="relative z-10 mt-8 p-4 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-3xl border-3 border-yellow-200 shadow-xl flex items-center justify-between text-white">
          <div className="flex items-center gap-3.5">
            <img
              src="/icons/hongen_pinyin/treasure_chest.jpg"
              alt="通关宝箱"
              className="w-14 h-14 rounded-2xl object-cover border-2 border-yellow-200 shadow-lg animate-bounce"
            />
            <div>
              <div className="text-sm font-black text-yellow-100 flex items-center gap-1.5">
                <span>🎁 岛屿通关大宝箱</span>
              </div>
              <div className="text-xs font-bold text-amber-100/90 mt-0.5">
                点亮本岛所有拼音，开启终极金币宝箱与限定徽章！
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              sfxTap();
              onOpenCodex();
            }}
            className="px-4 py-2 rounded-full bg-white text-amber-950 font-black text-xs shadow-md hover:bg-yellow-100 active:scale-95 transition-all cursor-pointer"
          >
            查看宝典 ➔
          </button>
        </div>
      </div>
    </div>
  );
}
