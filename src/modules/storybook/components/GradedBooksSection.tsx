import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  GRADED_BOOKS_LIBRARY,
  analyzeBookCoverage,
  generateSubBookFromKnownChars,
  type GradedBook,
} from '../engine/GradedBookEngine';
import { GradedReaderModal } from './GradedReaderModal';
import { useStore } from '@/store/useStore';
import { sfxTap, sfxMagic } from '@/lib/sfx';

export function GradedBooksSection() {
  const [selectedLevel, setSelectedLevel] = useState<number | 'custom'>(1);
  const [activeReadingBook, setActiveReadingBook] = useState<GradedBook | null>(null);

  const mastery = useStore((s) => s.progress.mastery ?? {});

  // 提取用户已掌握的全部汉字
  const knownChars = useMemo(() => {
    return Object.keys(mastery)
      .filter((k) => k.startsWith('hanzi:') && (mastery[k]?.lv ?? 0) >= 1)
      .map((k) => k.replace('hanzi:', ''));
  }, [mastery]);

  const knownSet = useMemo(() => new Set(knownChars), [knownChars]);

  // 计算每本绘本的字汇覆盖率
  const libraryWithCoverage = useMemo(() => {
    return GRADED_BOOKS_LIBRARY.map((book) => {
      const coverage = analyzeBookCoverage(book, knownSet);
      return { book, coverage };
    });
  }, [knownSet]);

  const filteredBooks = useMemo(() => {
    if (selectedLevel === 'custom') return [];
    return libraryWithCoverage.filter((item) => item.book.level === selectedLevel);
  }, [libraryWithCoverage, selectedLevel]);

  const handleGenerateCustomBook = () => {
    sfxMagic();
    const customBook = generateSubBookFromKnownChars(knownChars, 'nature');
    setActiveReadingBook(customBook);
  };

  const handleStartRead = (book: GradedBook) => {
    sfxTap();
    setActiveReadingBook(book);
  };

  return (
    <div className="space-y-6">
      {/* 顶部学情与自主阅读能力看板 (Header Dashboard) */}
      <div className="p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl shadow-xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-amber-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl shadow-inner">
            📚
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black">洪恩分级阅读与自集字绘本</h3>
              <span className="bg-amber-300 text-amber-950 text-xs font-bold px-2 py-0.5 rounded-full">
                科学分级
              </span>
            </div>
            <p className="text-xs text-amber-100 font-medium mt-1 max-w-md">
              根据你已学字库动态匹配！只读学过的字，轻松完成从“识字”到“自主阅读”的飞跃。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/20">
          <div className="text-center px-2">
            <span className="text-2xl font-black block">{knownChars.length}</span>
            <span className="text-[10px] text-amber-100 font-bold">已掌握字数</span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <button
            type="button"
            onClick={handleGenerateCustomBook}
            className="px-4 py-2.5 bg-white text-orange-600 hover:bg-amber-50 rounded-xl font-black text-xs shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
          >
            <span>✨</span>
            <span>生成自集字绘本</span>
          </button>
        </div>
      </div>

      {/* 分级选择器 (Level Tabs) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 1, label: 'L1 启蒙阶', range: '20-50字', emoji: '🌱' },
            { id: 2, label: 'L2 萌芽阶', range: '50-100字', emoji: '🌿' },
            { id: 3, label: 'L3 进阶阶', range: '100-200字', emoji: '🌳' },
            { id: 4, label: 'L4 拓展阶', range: '200-350字', emoji: '🏰' },
            { id: 5, label: 'L5 飞跃阶', range: '350-500+字', emoji: '🦅' },
            { id: 'custom', label: '🌟 自集字定制', range: '100%已学字', emoji: '🪄' },
          ] as const
        ).map((tab) => {
          const active = selectedLevel === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                sfxTap();
                setSelectedLevel(tab.id);
              }}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm border ${
                active
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-102'
                  : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              <span className={`text-[10px] font-normal px-1.5 py-0.2 rounded-full ${
                active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.range}
              </span>
            </button>
          );
        })}
      </div>

      {/* 分级绘本卡片矩阵 */}
      {selectedLevel !== 'custom' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map(({ book, coverage }) => (
            <motion.div
              key={book.id}
              whileHover={{ y: -4 }}
              className="bg-white rounded-3xl border-2 border-amber-200 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col justify-between p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-4xl p-3 bg-amber-50 rounded-2xl border border-amber-100">
                    {book.coverEmoji}
                  </span>
                  <div className="text-right">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full inline-block ${
                      coverage.recommendStatus === 'perfect'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : coverage.recommendStatus === 'challenge'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {coverage.recommendStatus === 'perfect'
                        ? '🌟 100%可自主阅读'
                        : coverage.recommendStatus === 'challenge'
                        ? '🎯 推荐挑战阅读'
                        : '📖 伴读进阶'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold block mt-1">
                      字汇匹配率 {Math.round(coverage.coverageRate * 100)}%
                    </span>
                  </div>
                </div>

                <h4 className="text-lg font-black text-slate-800">
                  {book.title}
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-2">
                  {book.subtitle}
                </p>

                {/* 目标核心字词 */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {book.targetChars.map((c) => (
                    <span
                      key={c}
                      className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                        knownSet.has(c)
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-amber-100 mt-4 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 font-bold">
                  {book.pages.length} 页精彩有声绘本
                </span>
                <button
                  type="button"
                  onClick={() => handleStartRead(book)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-black text-xs shadow-md active:scale-95 transition-transform"
                >
                  🚀 开始伴读
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* 自集字定制故事生成专区 */
        <div className="p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border-2 border-dashed border-amber-300 text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-amber-200/60 rounded-3xl flex items-center justify-center text-4xl shadow-inner">
            🪄
          </div>
          <div className="space-y-1">
            <h4 className="text-2xl font-black text-slate-800">
              根据你已学的 {knownChars.length} 个汉字定制专属故事
            </h4>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              智能引擎将严格挑选你已掌握的汉字，生成 100% 能够自己独立读下来的专属绘本！
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateCustomBook}
            className="px-6 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-300/50 hover:scale-105 active:scale-95 transition-transform"
          >
            ✨ 立即生成并开启朗读
          </button>
        </div>
      )}

      {/* 沉浸式阅读器弹窗 */}
      {activeReadingBook && (
        <GradedReaderModal
          book={activeReadingBook}
          onClose={() => setActiveReadingBook(null)}
        />
      )}
    </div>
  );
}
