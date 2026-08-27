import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { getHanziByLevel, type HanziEntry } from '@/data/hanziIndex';
import { useTranslation } from '@/i18n/useTranslation';
import { HanziStarQuest } from './HanziStarQuest';
import { ComboMeter } from '@/components/gamification/ComboMeter';
import { GentleFeedback } from '@/components/gamification/GentleFeedback';
import { RestReminder } from '@/components/gamification/RestReminder';
import { praiseByScene, encourageByScene } from '@/lib/praise';

interface HanziQuizGameProps {
  level?: number;
  onFinish?: () => void;
  onSelectWriting?: (hanzi: HanziEntry) => void;
}

export function HanziQuizGame({ level = 1, onSelectWriting }: HanziQuizGameProps) {
  const { t } = useTranslation();
  const addFish = useStore((s) => s.addFish);
  const practice = useStore((s) => s.practice);

  const [pool, setPool] = useState<HanziEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<HanziEntry[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  /** 即时反馈气泡状态（任务 #3）：正确积极强化 / 错误温和引导，无障碍 aria-live */
  const [feedback, setFeedback] = useState<{ correct: boolean; msg: string } | null>(null);

  // 初始化关卡题目池 (5 题)
  useEffect(() => {
    const rawPool = getHanziByLevel(level);
    const shuffled = [...rawPool].sort(() => Math.random() - 0.5).slice(0, 5);
    setPool(shuffled);
    setCurrentIndex(0);
    setStreak(0);
    setTotalStars(0);
    setIsCompleted(false);
    setFeedback(null);
  }, [level]);

  // 当索引切换时设置题目与选项
  useEffect(() => {
    if (!pool.length || currentIndex >= pool.length) return;

    const currentHanzi = pool[currentIndex]!;
    const allCandidates = getHanziByLevel(level).filter((h) => h.c !== currentHanzi.c);
    const distractorCandidates = [...allCandidates].sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [currentHanzi, ...distractorCandidates].sort(() => Math.random() - 0.5);

    setOptions(opts);
    setSelectedAnswer(null);
    setIsCorrect(null);

    // 播放提示音
    setTimeout(() => {
      void speak(`请选出汉字：${currentHanzi.c}，拼音是 ${currentHanzi.p}`).catch(() => {});
    }, 300);
  }, [currentIndex, pool, level]);

  const currentHanzi = pool[currentIndex];

  const handleSelectOption = useCallback((entry: HanziEntry) => {
    if (selectedAnswer !== null || !currentHanzi) return;

    sfxTap();
    setSelectedAnswer(entry.c);
    const correct = entry.c === currentHanzi.c;
    setIsCorrect(correct);

    if (correct) {
      sfxCorrect();
      triggerHaptic(45);
      celebrateSmall();
      setStreak((prev) => prev + 1);
      setTotalStars((prev) => prev + 1);
      addFish(1);
      setFeedback({ correct: true, msg: praiseByScene('hanzi') });
      void speak(`答对啦！${entry.c}，${entry.p}。真棒！`).catch(() => {});
      practice(`hanzi:${entry.c}`, true);
    } else {
      sfxWrong();
      triggerHaptic(20);
      setStreak(0);
      setFeedback({ correct: false, msg: encourageByScene('hanzi') });
      void speak(`差一点点哦，这是 ${entry.c}，正确答案是 ${currentHanzi.c}`).catch(() => {});
      practice(`hanzi:${currentHanzi.c}`, false);
    }

    setTimeout(() => {
      if (currentIndex + 1 < pool.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsCompleted(true);
        celebrateBig();
        triggerHaptic([60, 40, 60, 40, 100]);
        void speak(`恭喜你完成汉字闯关！一共获得 ${totalStars + (correct ? 1 : 0)} 颗星！`).catch(() => {});
      }
    }, 1800);
  }, [selectedAnswer, currentHanzi, currentIndex, pool.length, totalStars, addFish, practice]);

  const handlePlayVoice = useCallback(() => {
    if (!currentHanzi) return;
    sfxTap();
    triggerHaptic(20);
    speak(`${currentHanzi.c}，${currentHanzi.p}`);
  }, [currentHanzi]);

  const handleRestart = useCallback(() => {
    sfxTap();
    triggerHaptic(30);
    const rawPool = getHanziByLevel(level);
    const shuffled = [...rawPool].sort(() => Math.random() - 0.5).slice(0, 5);
    setPool(shuffled);
    setCurrentIndex(0);
    setIsCompleted(false);
    setFeedback(null);
  }, [level]);

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (!isCompleted) {
        if (selectedAnswer === null && options.length > 0) {
          if (['1', '2', '3', '4'].includes(e.key)) {
            const idx = parseInt(e.key, 10) - 1;
            const opt = options[idx];
            if (opt) {
              e.preventDefault();
              handleSelectOption(opt);
            }
          } else if (e.key === 's' || e.key === 'S' || e.key === ' ') {
            e.preventDefault();
            handlePlayVoice();
          }
        }
      } else {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleRestart();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompleted, selectedAnswer, options, handleSelectOption, handlePlayVoice, handleRestart]);

  if (isCompleted) {
    return (
      <Panel className="text-center p-6 space-y-4 max-w-lg mx-auto border-4 border-candy-pink-deep">
        <div className="text-4xl">🏆</div>
        <h3 className="text-2xl font-black text-candy-pink-deep">{t('hanziQuizGame.completedTitle')}</h3>
        <p className="text-sm font-bold text-ink-soft">
          {t('hanziQuizGame.completedDesc', { stars: totalStars })}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {currentHanzi && onSelectWriting && (
            <CandyButton
              tone="orange"
              size="md"
              onClick={() => onSelectWriting(currentHanzi)}
            >
              ✍️ {t('hanziQuizGame.goWrite', { char: currentHanzi.c })}
            </CandyButton>
          )}

          <CandyButton
            tone="green"
            size="md"
            onClick={() => {
              const rawPool = getHanziByLevel(level);
              const shuffled = [...rawPool].sort(() => Math.random() - 0.5).slice(0, 5);
              setPool(shuffled);
              setCurrentIndex(0);
              setIsCompleted(false);
            }}
          >
            🔄 {t('hanziQuizGame.again')}
          </CandyButton>
        </div>
      </Panel>
    );
  }

  if (!currentHanzi) return null;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-[11px] text-amber-900 font-bold bg-amber-50/90 px-3 py-1 rounded-xl border border-amber-200">
          ⌨️ 键盘快捷操作：数字键 1-4 快速选字 · S 听发音
        </span>
      </div>

      {/* 关卡顶部进度与 Combo */}
      <div className="flex items-center justify-between bg-white/80 p-3 rounded-2xl border border-amber-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-3 py-1 bg-amber-100 text-amber-900 rounded-full">
            {t('hanziQuizGame.progress', { current: currentIndex + 1, total: pool.length })}
          </span>
          <ComboMeter count={streak} />
        </div>

        <div className="text-xs font-extrabold text-amber-600">
          {t('hanziQuizGame.score', { score: totalStars })}
        </div>
      </div>

      {/* 题目卡片：听音识字播报 */}
      <Panel className="text-center p-6 space-y-3 relative overflow-hidden">
        <div className="text-xs font-black text-amber-700 uppercase tracking-wider">
          {t('hanziQuizGame.title')}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handlePlayVoice}
            className="w-16 h-16 rounded-2xl bg-amber-400 hover:bg-amber-500 text-amber-950 flex items-center justify-center text-2xl shadow-md active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-amber-300 focus:outline-none"
          >
            🔊
          </button>
          <div className="text-left">
            <div className="text-3xl font-black leading-tight text-amber-950 tracking-wider sm:text-4xl">
              {currentHanzi.p}
            </div>
            <div className="text-xs font-bold text-amber-700">
              {t('hanziQuizGame.meaning', { origin: currentHanzi.origin })}
            </div>
          </div>
        </div>

        <p className="text-xs font-bold text-amber-800/80">
          {t('hanziQuizGame.hint')}
        </p>
      </Panel>

      {/* 4 选项卡片网格 */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, idx) => {
          const isSelected = selectedAnswer === opt.c;

          return (
            <motion.button
              key={opt.c}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelectOption(opt)}
              disabled={selectedAnswer !== null}
              className={`relative p-5 min-h-[90px] rounded-2xl border-4 text-center transition-all shadow-md focus-visible:ring-4 focus-visible:ring-amber-300 focus:outline-none ${
                isSelected
                  ? isCorrect
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-950'
                    : 'bg-rose-100 border-rose-500 text-rose-950'
                  : 'bg-white hover:bg-amber-50/50 border-amber-200 text-amber-950'
              }`}
            >
              <span className="absolute top-2 left-2.5 text-xs font-bold opacity-50">[{idx + 1}]</span>
              <div className="text-center text-5xl font-black leading-tight font-serif tracking-widest sm:text-6xl">
                {opt.c}
              </div>
              <div className="text-xs font-bold text-amber-700 mt-1">
                {opt.p}
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2 text-lg">
                  {isCorrect ? '✅' : '❌'}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {feedback && <GentleFeedback correct={feedback.correct} message={feedback.msg} />}

      <HanziStarQuest />
      <RestReminder />
    </div>
  );
}
