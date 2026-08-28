import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { useRoute } from '@/lib/router';
import { getHanziByLevel, type HanziEntry } from '@/data/hanziIndex';
import { useTranslation } from '@/i18n/useTranslation';
import { HanziStarQuest } from './HanziStarQuest';
import { ComboMeter } from '@/components/gamification/ComboMeter';
import { GentleFeedback } from '@/components/gamification/GentleFeedback';
import { RestReminder } from '@/components/gamification/RestReminder';
import { ReducedMotionToggle } from '@/components/gamification/ReducedMotionToggle';
import { useAdaptiveDifficulty, type DifficultyLevel } from '@/game';
import { MistakeBookPanel } from '@/components/gamification/MistakeBookPanel';
import { StarSettlementCard } from '@/components/gamification/StarSettlementCard';
import { earnStars, type EarnResult } from '@/game/rewardEconomy';
import { praiseByScene, encourageByScene } from '@/lib/praise';

interface HanziQuizGameProps {
  level?: number;
  onFinish?: () => void;
  onSelectWriting?: (hanzi: HanziEntry) => void;
}

export function HanziQuizGame({ level = 1, onSelectWriting }: HanziQuizGameProps) {
  const { t } = useTranslation();
  const addFish = useStore((s) => s.addFish);
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);
  const progress = useStore((s) => s.progress);
  const { navigate } = useRoute();

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
  /**
   * 本节最长连击（任务 #1 结算依据）。
   * 与 `streak`（当前连击，答错即清零）刻意分开：连击奖励看的是「这节课最好的一段
   * 连续表现」，而不是结束那一刻的残留值 —— 否则孩子答错最后一题会被扣掉整节的连击成果。
   */
  const [bestCombo, setBestCombo] = useState(0);
  /**
   * 本回合星星结算结果（R162：让「赚到星星」从口头承诺变成入账事实）。
   * 为 null 表示本回合尚未结算（不应发生，但 UI 做了兜底）。
   */
  const [settlement, setSettlement] = useState<EarnResult | null>(null);

  /** 渐进式难度（任务 #2）：随连对表现爬坡的当前挑战等级，仅供可视化呈现，不改题目选取逻辑 */
  const adapt = useAdaptiveDifficulty({
    initialLevel: (Math.min(3, Math.max(1, Math.round(level))) as DifficultyLevel),
  });

  // 初始化关卡题目池 (5 题)
  useEffect(() => {
    const rawPool = getHanziByLevel(level);
    const shuffled = [...rawPool].sort(() => Math.random() - 0.5).slice(0, 5);
    setPool(shuffled);
    setCurrentIndex(0);
    setStreak(0);
    setBestCombo(0);
    setTotalStars(0);
    setIsCompleted(false);
    setSettlement(null);
    setFeedback(null);
    adapt.reset();
  }, [level, adapt.reset]);

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

  /**
   * 回合结算 —— 「赚」这一步的唯一出口。
   *
   * 走的是全站既有通道：`earnStars()` 统一口径（评级 / 连击 / 全对 / 越挫越勇）
   * → `addStars()` 入全局账本（成长荣誉馆、贴纸商店、成就徽章都读这一份）。
   * 不另建账本、不另定阈值，避免同一个孩子在三个模块看到三种星级标准。
   */
  const settleRound = useCallback(
    (total: number, correct: number, best: number): EarnResult => {
      const result = earnStars({ module: 'hanzi', total, correct, bestCombo: best });
      // 只有真正入账的星数才入账；上限触顶时 granted 为 0，此时不写盘、也不改文案。
      if (result.granted > 0) addStars(result.granted);
      setSettlement(result);
      void speak(`恭喜你完成汉字闯关！一共获得 ${result.granted} 颗星！`).catch(() => {});
      return result;
    },
    [addStars],
  );

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
      adapt.onCorrect();
      // 连击：当前连击驱动 ComboMeter，最长连击留作本回合结算依据
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestCombo((best) => Math.max(best, nextStreak));
      setTotalStars((prev) => prev + 1);
      addFish(1);
      setFeedback({ correct: true, msg: praiseByScene('hanzi') });
      void speak(`答对啦！${entry.c}，${entry.p}。真棒！`).catch(() => {});
      practice(`hanzi:${entry.c}`, true);
    } else {
      sfxWrong();
      triggerHaptic(20);
      adapt.onWrong();
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
        // 统一口径结算并真实入账（speak 已由 settleRound 负责，避免重复播报）
        const finalCorrect = totalStars + (correct ? 1 : 0);
        // 闭包里的 streak / bestCombo 是本次作答前的旧值：答对时新连击为 streak+1，
        // 答错时连击归零、最长连击不变。
        const finalBestCombo = correct ? Math.max(bestCombo, streak + 1) : bestCombo;
        settleRound(pool.length, finalCorrect, finalBestCombo);
      }
    }, 1800);
  }, [selectedAnswer, currentHanzi, currentIndex, pool.length, totalStars, streak, bestCombo, settleRound, addFish, practice, adapt.onCorrect, adapt.onWrong]);

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
    // 计分必须一并清零：否则「再闯一次」会把上一轮的星星继续往上累加，
    // 孩子看到的是一串与本节表现无关、且永不入账的虚高数字。
    setStreak(0);
    setBestCombo(0);
    setTotalStars(0);
    setIsCompleted(false);
    setSettlement(null);
    setFeedback(null);
    adapt.reset();
  }, [level, adapt.reset]);

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
        {/* 展示的是**实际入账**的星数，而非本地计数：孩子在这里看到多少，
            成长荣誉馆里就多多少，两处必须永远相等 */}
        <p className="text-sm font-bold text-ink-soft">
          {t('hanziQuizGame.completedDesc', {
            stars: settlement ? settlement.granted : totalStars,
          })}
        </p>

        {settlement && <StarSettlementCard result={settlement} moduleName="汉字" />}

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
              setStreak(0);
              setBestCombo(0);
              setTotalStars(0);
              setIsCompleted(false);
              setSettlement(null);
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
        <span className="inline-block text-xs text-amber-900 font-bold bg-amber-50/90 px-3 py-1 rounded-xl border border-amber-200">
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
          {/* 渐进式难度指示（任务 #2）：随连对表现实时爬坡，进度条对标通关连对目标 */}
          <div className="flex items-center gap-1.5" title="连续答对越多，挑战等级越高">
            <span className="text-xs font-black text-amber-700 whitespace-nowrap">挑战等级</span>
            <div className="flex gap-0.5" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span key={n} className={n <= adapt.level ? 'text-xs leading-none' : 'text-xs leading-none opacity-30'}>⭐</span>
              ))}
            </div>
            <div
              className="h-1.5 w-16 rounded-full bg-amber-100 overflow-hidden"
              role="progressbar"
              aria-label={`当前挑战等级 ${adapt.level}，再连对 ${Math.max(0, adapt.streakTarget - adapt.correctStreak)} 题升级`}
              aria-valuenow={adapt.correctStreak}
              aria-valuemin={0}
              aria-valuemax={adapt.streakTarget}
            >
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (adapt.correctStreak / adapt.streakTarget) * 100)}%` }}
              />
            </div>
          </div>
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

      <section className="space-y-3">
        <HanziStarQuest />
        <MistakeBookPanel progress={progress} onReview={() => navigate('wrongbook')} />
        <RestReminder />
        <ReducedMotionToggle />
      </section>
    </div>
  );
}
