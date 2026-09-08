import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '@/components/ui/Modal';
import { CandyButton } from '@/components/ui/Button';
import { speak } from '@/lib/speech';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { useStore } from '@/store/useStore';
import { getAllPinyin } from '@/data/pinyinIndex';
import { getKingdomLevel, type KingdomPinyinLevel } from '@/data/pinyinKingdomData';

interface PinyinCodexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel?: (level: KingdomPinyinLevel) => void;
}

type TabType = 'all' | 'single' | 'initial' | 'compound' | 'whole';

export function PinyinCodexModal({
  isOpen,
  onClose,
  onSelectLevel,
}: PinyinCodexModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [inspectLevel, setInspectLevel] = useState<KingdomPinyinLevel | null>(null);

  const mastery = useStore((s) => s.progress.mastery);
  const allPinyin = getAllPinyin();

  // 统计全量 63 张卡片收集情况
  const stats = allPinyin.reduce(
    (acc, cur) => {
      const m = mastery[`pinyin:${cur.p}`];
      if (m && m.lv >= 2) {
        acc.gold += 1;
      } else if (m && m.lv >= 1) {
        acc.silver += 1;
      } else {
        acc.locked += 1;
      }
      return acc;
    },
    { gold: 0, silver: 0, locked: 0 }
  );

  const filteredLevels = allPinyin
    .map((p) => getKingdomLevel(p.p))
    .filter((l) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'single') return l.category === 'single';
      if (activeTab === 'initial') return l.category === 'initial';
      if (activeTab === 'compound') return l.category === 'compound' || l.category === 'front_nasal' || l.category === 'back_nasal';
      if (activeTab === 'whole') return l.category === 'whole';
      return true;
    });

  return (
    <Modal open={isOpen} onClose={onClose} aria-label="小莤拼音全量图鉴宝典">
      <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-amber-200">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📖</span>
          <h2 className="text-base sm:text-lg font-black text-candy-purple-deep">
            小莤拼音全量图鉴宝典
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center transition-all cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* ── 顶部 3D 收集进度仪表盘 ── */}
        <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-100 rounded-2xl border-2 border-amber-300 shadow-sm">
          <div className="flex items-center gap-3">
            <img
              src="/icons/hongen_pinyin/treasure_chest.jpg"
              alt="图鉴宝箱"
              className="w-12 h-12 rounded-2xl object-cover border-2 border-yellow-300 shadow-md"
            />
            <div>
              <div className="text-xs sm:text-sm font-black text-amber-950">
                拼音图鉴收集进度：{stats.gold + stats.silver}/{allPinyin.length}
              </div>
              <div className="text-[11px] font-extrabold text-amber-800">
                🥇 荣耀金卡：{stats.gold} 张 · 🥈 探索银卡：{stats.silver} 张
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-black px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 shadow-md border border-white">
              {Math.round(((stats.gold + stats.silver) / allPinyin.length) * 100)}% 完成
            </span>
          </div>
        </div>

        {/* ── 分类筛选标签 ── */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-2xl">
          {[
            { id: 'all', label: '全部 (63)' },
            { id: 'single', label: '单韵母 (6)' },
            { id: 'initial', label: '声母 (23)' },
            { id: 'compound', label: '复韵母 (18)' },
            { id: 'whole', label: '整体认读 (16)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                sfxTap();
                setActiveTab(tab.id as TabType);
              }}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md scale-102'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 63 张 3D 卡牌陈列网格 ── */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[360px] overflow-y-auto p-1.5 pr-2">
          {filteredLevels.map((lvl) => {
            const m = mastery[`pinyin:${lvl.p}`];
            const isGold = m && m.lv >= 2;
            const isSilver = m && m.lv >= 1;

            return (
              <motion.button
                key={lvl.p}
                whileHover={{ scale: 1.08, y: -3 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  sfxTap();
                  triggerHaptic(20);
                  setInspectLevel(lvl);
                  speak(lvl.p, { lang: 'zh-CN', rate: 0.6 });
                }}
                className={`flex flex-col items-center p-2.5 rounded-2xl border-3 transition-all shadow-md cursor-pointer ${
                  isGold
                    ? 'bg-gradient-to-b from-yellow-100 via-amber-200 to-yellow-300 border-amber-400 text-amber-950 ring-2 ring-yellow-400/50'
                    : isSilver
                    ? 'bg-gradient-to-b from-sky-50 via-sky-100 to-blue-200 border-sky-300 text-sky-950'
                    : 'bg-slate-50 border-slate-200 opacity-60 text-slate-500'
                }`}
              >
                <div className="text-2xl filter drop-shadow">{lvl.personification.emoji}</div>
                <div className="text-2xl font-black mt-0.5 font-sans">{lvl.p}</div>
                <div className="text-[10px] font-extrabold truncate max-w-full">
                  {lvl.personification.character}
                </div>
                <div className="text-[9px] mt-1 font-black px-2 py-0.2 rounded-full bg-white/80">
                  {isGold ? '🥇 金卡' : isSilver ? '🥈 银卡' : '🔒 待学'}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── 底部卡片详情抽屉 ── */}
        <AnimatePresence>
          {inspectLevel && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="p-4 bg-gradient-to-r from-purple-100 via-pink-50 to-amber-100 rounded-2xl border-2 border-purple-300 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl filter drop-shadow">{inspectLevel.personification.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-candy-purple-deep">
                      {inspectLevel.name}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-900 font-black">
                      {inspectLevel.personification.character}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-ink-soft mt-0.5">
                    {inspectLevel.rhyme}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <CandyButton
                  tone="blue"
                  size="sm"
                  variant="soft"
                  onClick={() => {
                    speak(`${inspectLevel.p}，${inspectLevel.rhyme}`, { lang: 'zh-CN', rate: 0.65 });
                  }}
                >
                  🔊 示范发音
                </CandyButton>
                {onSelectLevel && (
                  <CandyButton
                    tone="green"
                    size="sm"
                    onClick={() => {
                      onSelectLevel(inspectLevel);
                      onClose();
                    }}
                  >
                    去闯关 ➔
                  </CandyButton>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
