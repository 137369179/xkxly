import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { GradedBook, GradedPage } from '../engine/GradedBookEngine';
import { speak, stopSpeaking } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxStar, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig, celebrateSmall } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';

interface Props {
  book: GradedBook;
  onClose: () => void;
}

export function GradedReaderModal({ book, onClose }: Props) {
  const [currentPageIdx, setCurrentPageIdx] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<'reading' | 'quiz' | 'passed'>('reading');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);

  const addStars = useStore((s) => s.addStars);
  const addFish = useStore((s) => s.addFish);

  const totalPages = book.pages.length;
  const currentPage: GradedPage = book.pages[currentPageIdx] ?? book.pages[0] ?? {
    text: '',
    pinyin: '',
    illustrationEmoji: '📖',
  };

  // 页面切换时自动朗读当前页
  useEffect(() => {
    if (quizState === 'reading') {
      setIsPlayingAudio(true);
      speak(currentPage.text, {
        onEnd: () => setIsPlayingAudio(false),
      });
    }
    return () => {
      stopSpeaking();
    };
  }, [currentPageIdx, quizState, currentPage.text]);

  const handleCharClick = useCallback((char: string) => {
    sfxTap();
    triggerHaptic(20);
    setSelectedChar(char);
    speak(char);
  }, []);

  const handleNextPage = useCallback(() => {
    sfxTap();
    triggerHaptic(25);
    setSelectedChar(null);
    if (currentPageIdx < totalPages - 1) {
      setCurrentPageIdx((i) => i + 1);
    } else {
      // 读完全书，进入阅读理解测验
      setQuizState('quiz');
      speak(`读完全书啦！我们来做一道阅读理解小测验：${book.quiz.question}`);
    }
  }, [currentPageIdx, totalPages, book.quiz.question]);

  const handlePrevPage = useCallback(() => {
    sfxTap();
    triggerHaptic(20);
    setSelectedChar(null);
    if (currentPageIdx > 0) {
      setCurrentPageIdx((i) => i - 1);
    }
  }, [currentPageIdx]);

  const handleReplayAudio = useCallback(() => {
    sfxTap();
    triggerHaptic(20);
    setIsPlayingAudio(true);
    speak(currentPage.text, {
      onEnd: () => setIsPlayingAudio(false),
    });
  }, [currentPage.text]);

  const handleAnswerQuiz = useCallback((option: string) => {
    setSelectedOption(option);
    if (option === book.quiz.answer) {
      sfxCorrect();
      sfxStar();
      triggerHaptic(45);
      celebrateSmall();
      setQuizFeedback('correct');
      setTimeout(() => {
        setQuizState('passed');
        sfxWin();
        triggerHaptic([60, 40, 60, 40, 100]);
        celebrateBig();
        addStars(8);
        addFish(3);
        speak(`恭喜你完全理解了这本绘本！获得 8 颗阅读星和 3 条小鱼干！`);
      }, 1000);
    } else {
      sfxTap();
      triggerHaptic(20);
      setQuizFeedback('wrong');
      speak(`再想想看哦，仔细看绘本里的内容。`);
      setTimeout(() => {
        setQuizFeedback(null);
        setSelectedOption(null);
      }, 1200);
    }
  }, [book.quiz, addStars, addFish]);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (quizState === 'reading') {
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleNextPage();
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          handlePrevPage();
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleReplayAudio();
        }
      } else if (quizState === 'quiz') {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          const opt = book.quiz.options[idx];
          if (opt) {
            e.preventDefault();
            handleAnswerQuiz(opt);
          }
        }
      } else if (quizState === 'passed') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quizState, handleNextPage, handlePrevPage, handleReplayAudio, handleAnswerQuiz, book.quiz.options, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#fdfbf7] rounded-3xl shadow-2xl border-4 border-amber-200 overflow-hidden flex flex-col min-h-[580px]">
        {/* 快捷操作提示条 */}
        <div className="text-center py-1 bg-amber-100/80 border-b border-amber-200">
          <span className="text-xs text-amber-900 font-bold">
            ⌨️ 键盘快捷操作：左右方向键/空格 翻页 · R 重听 · 数字键 1-3 答题 · Esc 关闭
          </span>
        </div>

        {/* 顶部标题栏与进度 */}
        <div className="p-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-3xl select-none">{book.coverEmoji}</span>
            <div>
              <div className="flex items-center gap-2 font-black text-lg">
                <span>{book.title}</span>
                <span className="text-xs bg-amber-300 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                  L{book.level} 分级
                </span>
              </div>
              <p className="text-xs text-amber-100 font-medium">
                {quizState === 'reading'
                  ? `第 ${currentPageIdx + 1} / ${totalPages} 页`
                  : quizState === 'quiz'
                  ? '💡 阅读理解小测验'
                  : '🏆 顺利通关'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white font-black text-xl flex items-center justify-center transition-colors"
            aria-label="关闭分级阅读器"
          >
            ✕
          </button>
        </div>

        {/* 核心内容区 */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {quizState === 'reading' && (
              <motion.div
                key={currentPageIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* 绘本插图画板 (Illustration Stage) */}
                <div className="w-full h-44 sm:h-52 bg-gradient-to-br from-amber-100/60 via-orange-50 to-amber-200/40 rounded-3xl border-2 border-amber-200/80 shadow-inner flex flex-col items-center justify-center relative overflow-hidden">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1], y: [0, -4, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-7xl sm:text-8xl select-none filter drop-shadow-md"
                  >
                    {currentPage.illustrationEmoji}
                  </motion.div>

                  <div className="absolute top-2 right-3">
                    <button
                      type="button"
                      onClick={handleReplayAudio}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm transition-transform ${
                        isPlayingAudio
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-white/80 text-amber-900 hover:bg-white'
                      }`}
                    >
                      <span>{isPlayingAudio ? '🔊 朗读中...' : '▶️ 点击重听'}</span>
                    </button>
                  </div>
                </div>

                {/* 拼音示范行 */}
                <div className="text-center text-xs font-mono text-amber-800/80 font-bold tracking-wider">
                  {currentPage.pinyin}
                </div>

                {/* 核心字句展示（支持每个汉字轻触点读） */}
                <div className="p-4 bg-white rounded-2xl border-2 border-amber-100 shadow-sm text-center">
                  <div className="text-2xl sm:text-3xl font-black text-slate-800 leading-relaxed tracking-wider flex flex-wrap items-center justify-center gap-1">
                    {currentPage.text.split('').map((char, i) => {
                      const isHanzi = /[\u4e00-\u9fa5]/.test(char);
                      const isSelected = selectedChar === char;
                      return isHanzi ? (
                        <span
                          key={i}
                          onClick={() => handleCharClick(char)}
                          className={`cursor-pointer px-1 py-0.5 rounded-lg transition-all ${
                            isSelected
                              ? 'bg-amber-400 text-amber-950 scale-110 shadow-sm'
                              : 'hover:bg-amber-100 hover:text-amber-900'
                          }`}
                          role="button"
                          tabIndex={0}
                          aria-label={`朗读汉字 ${char}`}
                        >
                          {char}
                        </span>
                      ) : (
                        <span key={i} className="text-slate-400">{char}</span>
                      );
                    })}
                  </div>
                  <p className="text-xs text-amber-600/80 mt-2 font-medium">
                    💡 轻触上面的任意汉字，即可单独发音点读
                  </p>
                </div>
              </motion.div>
            )}

            {/* 测验界面 (Comprehension Quiz) */}
            {quizState === 'quiz' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 text-center p-2"
              >
                <div className="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-black">
                  📖 阅读理解巩固
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-800 max-w-md mx-auto">
                  {book.quiz.question}
                </h3>

                <div className="space-y-2.5 max-w-md mx-auto pt-2">
                  {book.quiz.options.map((opt) => (
                    <motion.button
                      key={opt}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAnswerQuiz(opt)}
                      className={`w-full p-3.5 rounded-2xl border-2 font-black text-base shadow-sm transition-all text-left flex items-center justify-between ${
                        selectedOption === opt
                          ? quizFeedback === 'correct'
                            ? 'bg-emerald-100 border-emerald-500 text-emerald-900'
                            : 'bg-rose-100 border-rose-400 text-rose-900'
                          : 'bg-white border-amber-200 text-slate-800 hover:border-amber-400'
                      }`}
                    >
                      <span>{opt}</span>
                      <span>👉</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 通关勋章与总结 */}
            {quizState === 'passed' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center p-4 space-y-4"
              >
                <div className="text-6xl animate-bounce">🏆</div>
                <h3 className="text-3xl font-black text-slate-800">
                  太棒了，完成《{book.title}》！
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  {book.quiz.explanation}
                </p>

                <div className="flex items-center justify-center gap-4 py-3 bg-amber-50 rounded-2xl border border-amber-200 max-w-sm mx-auto">
                  <div className="text-center">
                    <span className="text-2xl font-black text-amber-600 block">+8</span>
                    <span className="text-xs text-slate-500 font-bold">⭐ 阅读星星</span>
                  </div>
                  <div className="w-px h-8 bg-amber-200" />
                  <div className="text-center">
                    <span className="text-2xl font-black text-orange-600 block">+3</span>
                    <span className="text-xs text-slate-500 font-bold">🐟 小鱼干</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full max-w-sm mx-auto py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-2xl font-black text-base shadow-xl shadow-orange-300/50 hover:scale-102 active:scale-98 transition-transform"
                >
                  完成阅读，返回分级书架
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 底部翻页控制器 */}
          {quizState === 'reading' && (
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-amber-100">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPageIdx === 0}
                className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1 border transition-colors ${
                  currentPageIdx === 0
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <span>⬅️</span>
                <span>上一页</span>
              </button>

              <div className="flex items-center gap-1.5">
                {book.pages.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-all ${
                      currentPageIdx === idx
                        ? 'w-6 bg-amber-500'
                        : 'w-2 bg-amber-200'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleNextPage}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-black text-xs shadow-md hover:scale-105 active:scale-95 transition-transform flex items-center gap-1"
              >
                <span>{currentPageIdx < totalPages - 1 ? '下一页' : '去测验'}</span>
                <span>➔</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
