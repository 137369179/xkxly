import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { getHanziByLevel, type HanziEntry } from '@/data/hanziIndex';
import { useTranslation } from '@/i18n/useTranslation';

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

  // 初始化关卡题目池 (5 题)
  useEffect(() => {
    const rawPool = getHanziByLevel(level);
    const shuffled = [...rawPool].sort(() => Math.random() - 0.5).slice(0, 5);
    setPool(shuffled);
    setCurrentIndex(0);
    setStreak(0);
    setTotalStars(0);
    setIsCompleted(false);
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

  const handleSelectOption = (entry: HanziEntry) => {
    if (selectedAnswer !== null || !currentHanzi) return;

    sfxTap();
    setSelectedAnswer(entry.c);
    const correct = entry.c === currentHanzi.c;
    setIsCorrect(correct);

    if (correct) {
      celebrateSmall();
      setStreak((prev) => prev + 1);
      setTotalStars((prev) => prev + 1);
      addFish(1);
      void speak(`答对啦！${entry.c}，${entry.p}。真棒！`).catch(() => {});
      practice(`hanzi:${entry.c}`, true);
    } else {
      setStreak(0);
      void speak(`差一点点哦，这是 ${entry.c}，正确答案是 ${currentHanzi.c}`).catch(() => {});
      practice(`hanzi:${currentHanzi.c}`, false);
    }

    setTimeout(() => {
      if (currentIndex + 1 < pool.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsCompleted(true);
        celebrateSmall();
        void speak(`恭喜你完成汉字闯关！一共获得 ${totalStars + (correct ? 1 : 0)} 颗星！`).catch(() => {});
      }
    }, 1800);
  };

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
      {/* 关卡顶部进度与 Combo */}
      <div className="flex items-center justify-between bg-white/80 p-3 rounded-2xl border border-amber-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-3 py-1 bg-amber-100 text-amber-900 rounded-full">
            {t('hanziQuizGame.progress', { current: currentIndex + 1, total: pool.length })}
          </span>
          {streak > 1 && (
            <motion.span
              initial={{ scale: 0.8 }}
              animate={{ scale: [1, 1.2, 1] }}
              className="text-xs font-black text-rose-600 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300"
            >
              {t('hanziQuizGame.streak', { streak })}
            </motion.span>
          )}
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
            onClick={() => {
              sfxTap();
              speak(`${currentHanzi.c}，${currentHanzi.p}`);
            }}
            className="w-16 h-16 rounded-2xl bg-amber-400 hover:bg-amber-500 text-amber-950 flex items-center justify-center text-2xl shadow-md active:scale-95 transition-all"
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
        {options.map((opt) => {
          const isSelected = selectedAnswer === opt.c;

          return (
            <motion.button
              key={opt.c}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelectOption(opt)}
              disabled={selectedAnswer !== null}
              className={`relative p-5 rounded-2xl border-4 text-center transition-all shadow-md ${
                isSelected
                  ? isCorrect
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-950'
                    : 'bg-rose-100 border-rose-500 text-rose-950'
                  : 'bg-white hover:bg-amber-50/50 border-amber-200 text-amber-950'
              }`}
            >
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
    </div>
  );
}
