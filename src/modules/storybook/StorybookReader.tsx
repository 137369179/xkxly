import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak, stopSpeaking } from '@/lib/speech';
import { sfxTap, sfxStar, sfxFlip, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { AiAvatar } from '@/components/ai/AiAvatar';
import { RubyText } from '@/components/ai/RubyText';
import { PageIllustration } from './PageIllustration';
import type { StoryBookData } from '@/lib/ai/prompts';
import type { StorybookTheme, StorybookStyle, SavedStorybook } from './types';
import { useTranslation } from '@/i18n/useTranslation';

interface StorybookReaderProps {
  book: StoryBookData;
  theme: StorybookTheme;
  style: StorybookStyle;
  character: string;
  /** 传入已有 ID 时为"回看"模式，不重复保存 */
  existingId?: string;
  onClose: () => void;
}

export function StorybookReader({
  book,
  theme,
  style,
  character,
  existingId,
  onClose,
}: StorybookReaderProps) {
  const { t: tr } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [autoPlay, setAutoPlay] = useState(true);
  const [saved, setSaved] = useState(!!existingId);
  const [showPinyin, setShowPinyin] = useState(false);

  const saveStorybook = useStore((s) => s.saveStorybook);
  const addStars = useStore((s) => s.addStars);

  const totalPages = book.pages.length;
  const page = book.pages[currentPage]!;

  const playPage = useCallback(
    (pageIndex: number) => {
      const p = book.pages[pageIndex];
      if (!p) return;
      stopSpeaking();
      const text = `${p.title}。${p.content}`;
      speak(text, {
        lang: 'zh-CN',
        rate: 0.85,
        module: 'story',
        onEnd: () => {
          if (autoPlay && pageIndex < totalPages - 1) {
            setDirection(1);
            setCurrentPage(pageIndex + 1);
          }
        },
      });
    },
    [book.pages, autoPlay, totalPages],
  );

  // 进入新页自动朗读
  useEffect(() => {
    const timer = setTimeout(() => playPage(currentPage), 400);
    return () => {
      clearTimeout(timer);
      stopSpeaking();
    };
  }, [currentPage, playPage]);

  const handleSave = useCallback(() => {
    if (saved) return;
    sfxStar();
    triggerHaptic(30);
    const storybook: SavedStorybook = {
      id: existingId ?? (crypto.randomUUID?.() ?? `sb-${Date.now()}-${Math.random().toString(36).slice(2)}`),
      data: book,
      theme,
      style,
      character,
      createdAt: Date.now(),
      readCount: 0,
    };
    saveStorybook(storybook);
    addStars(3);
    celebrateSmall();
    setSaved(true);
  }, [saved, existingId, book, theme, style, character, saveStorybook, addStars]);

  const goNext = useCallback(() => {
    if (currentPage < totalPages - 1) {
      sfxFlip();
      triggerHaptic(20);
      setDirection(1);
      const nextP = currentPage + 1;
      setCurrentPage(nextP);
      if (nextP === totalPages - 1) {
        celebrateSmall();
        sfxWin();
        triggerHaptic([40, 20, 60]);
        addStars(2);
      }
    }
  }, [currentPage, totalPages, addStars]);

  const goPrev = useCallback(() => {
    if (currentPage > 0) {
      sfxFlip();
      triggerHaptic(20);
      setDirection(-1);
      setCurrentPage((p) => p - 1);
    }
  }, [currentPage]);

  // 键盘导航
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        playPage(currentPage);
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        sfxTap();
        setShowPinyin((v) => !v);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        stopSpeaking();
        sfxTap();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentPage, totalPages, goNext, goPrev, playPage, handleSave, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-sm">
      {/* 顶部快捷提示条 */}
      <div className="bg-purple-50 border-b border-purple-100 text-center py-1">
        <span className="text-xs font-bold text-purple-900">
          ⌨️ 键盘快捷操作：← / → 翻页 · 空格 重播朗读 · P 拼音注音 · S 保存绘本 · Esc 返回
        </span>
      </div>

      {/* 顶部栏 */}
      <header className="flex items-center justify-between px-4 py-3 border-b-2 border-purple-100">
        <button
          type="button"
          onClick={() => {
            stopSpeaking();
            sfxTap();
            triggerHaptic(20);
            onClose();
          }}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
        >
          <span className="text-2xl">←</span>
          <span className="text-sm font-bold">{tr('storybookReader.back')}</span>
        </button>

        <div className="flex items-center gap-2">
          <AiAvatar size={32} mood={autoPlay ? 'talking' : 'idle'} />
          <span className="text-sm text-purple-400 font-bold">{book.bookTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sfxTap();
              setShowPinyin((v) => !v);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              showPinyin ? 'bg-pink-500 text-candy-pink-on border-pink-600 shadow-sm' : 'bg-pink-50 text-pink-600 border-pink-200'
            }`}
          >
            {showPinyin ? '🔤 纯汉字' : '拼 拼音'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saved}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${
              saved
                ? 'bg-gray-200 text-gray-400'
                : 'bg-purple-400 text-candy-purple-on shadow-md hover:bg-purple-500'
            }`}
          >
            {saved ? tr('storybookReader.saved') : tr('storybookReader.save')}
          </button>
        </div>
      </header>

      {/* 翻页区域 */}
      <div className="flex-1 flex items-center justify-center px-4 py-4 overflow-hidden">
        <div
          className="relative w-full max-w-2xl"
          style={{ perspective: 1200, height: 'min(70vh, 600px)' }}
        >
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={currentPage}
              custom={direction}
              variants={{
                enter: (dir: number) => ({ rotateY: dir > 0 ? 90 : -90, opacity: 0 }),
                center: { rotateY: 0, opacity: 1 },
                exit: (dir: number) => ({ rotateY: dir > 0 ? -90 : 90, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              style={{ transformStyle: 'preserve-3d', height: '100%' }}
              className="flex flex-col"
            >
              {/* 插图区 */}
              <div className="flex-1 min-h-0">
                <PageIllustration page={page} theme={theme} isActive />
              </div>

              {/* 文字区 */}
              <div className="bg-white/90 rounded-2xl p-4 sm:p-5 mt-3 shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-purple-300">
                    {tr('storybookReader.pageNo', { number: page.pageNumber })}
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-700">
                    {page.title}
                  </h3>
                </div>
                <div className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {showPinyin ? <RubyText text={page.content} clickable={true} /> : <p>{page.content}</p>}
                </div>
                {currentPage === totalPages - 1 && (
                  <p className="mt-3 text-center text-sm text-purple-400 font-bold">
                    ✨ {book.moral} ✨
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 底部控制栏 */}
      <footer className="flex items-center justify-between px-4 py-3 border-t-2 border-purple-100">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentPage === 0}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
            currentPage === 0
              ? 'bg-gray-100 text-gray-300'
              : 'bg-purple-100 text-purple-500 hover:bg-purple-200'
          }`}
        >
          ←
        </button>

        {/* 页码指示器 */}
        <div className="flex gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                sfxTap();
                setDirection(i > currentPage ? 1 : -1);
                setCurrentPage(i);
              }}
              className="p-1"
            >
              <div
                className={`rounded-full transition-all ${
                  i === currentPage
                    ? 'w-6 h-2.5 bg-purple-400'
                    : 'w-2.5 h-2.5 bg-purple-200'
                }`}
              />
            </button>
          ))}
        </div>

        {/* 朗读控制 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sfxTap();
              setAutoPlay((a) => !a);
              if (autoPlay) stopSpeaking();
              else playPage(currentPage);
            }}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
              autoPlay
                ? 'bg-green-100 text-green-500'
                : 'bg-gray-100 text-gray-400'
            }`}
            title={autoPlay ? tr('storybookReader.turnOffAutoRead') : tr('storybookReader.turnOnAutoRead')}
          >
            {autoPlay ? '🔊' : '🔇'}
          </button>
          <button
            type="button"
            onClick={() => playPage(currentPage)}
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl bg-blue-100 text-blue-500 hover:bg-blue-200"
            title={tr('storybookReader.listenAgain')}
          >
            🔄
          </button>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={currentPage === totalPages - 1}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
            currentPage === totalPages - 1
              ? 'bg-gray-100 text-gray-300'
              : 'bg-purple-100 text-purple-500 hover:bg-purple-200'
          }`}
        >
          →
        </button>
      </footer>
    </div>
  );
}
