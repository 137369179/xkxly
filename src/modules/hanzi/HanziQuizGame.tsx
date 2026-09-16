import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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
import { ReducedMotionToggle } from '@/components/gamification/ReducedMotionToggle';
import { useAdaptiveDifficulty, type DifficultyLevel } from '@/game';
import { MistakeBookPanel } from '@/components/gamification/MistakeBookPanel';
import { StarSettlementCard } from '@/components/gamification/StarSettlementCard';
import { ModuleGameShell } from '@/components/gamification/ModuleGameShell';
import { masteryNoteFor, newlyMasteredThisWeek } from '@/game/masteryNarrative';
import { earnStars, type EarnResult } from '@/game/rewardEconomy';
import { praiseByScene, encourageByScene } from '@/lib/praise';
import { shuffle } from '@/lib/utils';

/** 每关题量：对齐帮帮识字「五字一测 · 及时巩固」的节奏 */
const ROUND_SIZE = 5;
/** 答完一题到切下一题的间隔（ms）：留出看清正解与听清读音的时间 */
const ADVANCE_DELAY = 1800;

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

  /**
   * 延迟切题定时器（R168 修复）。
   *
   * 原实现把 `setTimeout(…, 1800)` 的句柄丢掉：孩子在这 1.8 秒内切走关卡、
   * 或点击「再闯一次」，定时器仍会照常触发 `setCurrentIndex` / `settleRound`——
   * 轻则在新一关里凭空跳题，重则在已卸载组件上 setState 打 React 警告。
   * 这里统一收进 ref，卸载与新回合开始时各清一次。
   */
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 朗读定时器同理：切题后旧读音必须取消，否则两道题的读音会叠在一起 */
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 重开一关 —— 三个入口（关卡切换 / 再闯一次按钮 / 键盘 R）的唯一实现。
   *
   * R168 修复的真实缺陷：原来「再闯一次」按钮内联复制了一份重置代码，却
   * **漏掉了 `adapt.reset()` 与 `setFeedback(null)`** —— 孩子重开后挑战等级
   * 停在上轮的满级星星上、上一题的反馈气泡还挂在屏幕里，且旧定时器未清。
   * 三处复制必然漂移，收敛成一个回调才是根治。
   */
  const resetRound = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = null;
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = null;
    setPool(shuffle(getHanziByLevel(level)).slice(0, ROUND_SIZE));
    setCurrentIndex(0);
    setStreak(0);
    setBestCombo(0);
    setTotalStars(0);
    setIsCompleted(false);
    setSettlement(null);
    setFeedback(null);
    adapt.reset();
  }, [level, adapt.reset]);

  // 初始化关卡题目池
  useEffect(() => {
    resetRound();
  }, [resetRound]);

  // 卸载时清空在途定时器
  useEffect(
    () => () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    },
    [],
  );

  // 当索引切换时设置题目与选项
  useEffect(() => {
    const currentHanzi = pool[currentIndex];
    if (!currentHanzi) return;

    const allCandidates = getHanziByLevel(level).filter((h) => h.c !== currentHanzi.c);
    // Fisher-Yates 无偏洗牌：原 `sort(() => Math.random() - 0.5)` 是**有偏**的，
    // 某些排列出现概率显著偏高，孩子会反复撞见同一组干扰项顺序。
    const distractorCandidates = shuffle(allCandidates).slice(0, 3);
    const opts = shuffle([currentHanzi, ...distractorCandidates]);

    setOptions(opts);
    setSelectedAnswer(null);
    setIsCorrect(null);

    // 播放提示音
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    speakTimerRef.current = setTimeout(() => {
      speakTimerRef.current = null;
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

    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
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
    }, ADVANCE_DELAY);
  }, [selectedAnswer, currentHanzi, currentIndex, pool.length, totalStars, streak, bestCombo, settleRound, addFish, practice, adapt.onCorrect, adapt.onWrong]);

  const handlePlayVoice = useCallback(() => {
    if (!currentHanzi) return;
    sfxTap();
    triggerHaptic(20);
    speak(`${currentHanzi.c}，${currentHanzi.p}`);
  }, [currentHanzi]);

  // 重开统一走 resetRound（含清定时器 + 清挑战等级 + 清反馈气泡）
  const handleRestart = useCallback(() => {
    sfxTap();
    triggerHaptic(30);
    resetRound();
  }, [resetRound]);

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

  /** 已掌握汉字量：驱动星星奖励淡出阶段（R160 防过度理由效应护栏） */
  const masteredCount = Object.keys(progress.mastery).filter((k) => k.startsWith('hanzi:'))
    .length;

  /**
   * 统一外壳包裹：冒险路线 + 星星小屋（奖励解锁）+ 成就墙 + 错误边界。
   * 三个出口（结算 / 空池 / 练习中）共用同一层包裹，避免任一分支漏挂游戏化。
   */
  const wrap = (body: ReactNode) => (
    <ModuleGameShell
      module="hanzi"
      level={adapt.level}
      progress={progress}
      combo={streak}
      feedback={feedback ? { correct: feedback.correct, message: feedback.msg } : null}
      masteredCount={masteredCount}
      title="汉字闯关"
    >
      {body}
    </ModuleGameShell>
  );

  if (isCompleted) {
    return wrap(
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

        {settlement && (
          <StarSettlementCard
            result={settlement}
            moduleName="汉字"
            masteryNote={masteryNoteFor(
              newlyMasteredThisWeek(progress.mastery, ['hanzi']),
              '个汉字',
            )}
          />
        )}

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

          <CandyButton tone="green" size="md" onClick={handleRestart}>
            🔄 {t('hanziQuizGame.again')}
          </CandyButton>
        </div>
      </Panel>,
    );
  }

  /**
   * 空题目池兜底（R168 新增）。
   * 原实现 `if (!currentHanzi) return null` —— 关卡号来自路由参数，一旦传入
   * 数据里没有的关卡（或题库尚未下发完成），孩子看到的是**一片空白**。
   * 空白是儿童产品里最糟的失败形态：孩子不会报告「没内容」，只会认为
   * 「不好玩」然后离开。这里给一个可操作出口：回启蒙关重开。
   */
  if (!currentHanzi) {
    return wrap(
      <Panel className="mx-auto max-w-lg space-y-3 border-4 border-amber-300 p-6 text-center">
        <div className="text-4xl">🧭</div>
        <h3 className="text-xl font-black text-amber-800">这一关的汉字还在路上</h3>
        <p className="text-sm font-bold text-ink-soft">先去别的关看看，或者再试一次吧～</p>
        <CandyButton tone="green" size="md" onClick={handleRestart}>
          🔄 再试一次
        </CandyButton>
      </Panel>,
    );
  }

  return wrap(
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

      {/*
        ComboMeter / GentleFeedback / RestReminder 已由外壳的 GameHud 统一渲染，
        此处不再重复挂载（原实现与 HUD 并存会出现两条连击条、两个反馈气泡）。
        ReducedMotionToggle 是 GameHud 未覆盖的无障碍开关，保留在此。
      */}
      <section className="space-y-3">
        <HanziStarQuest />
        <MistakeBookPanel progress={progress} onReview={() => navigate('wrongbook')} />
        <ReducedMotionToggle />
      </section>
    </div>,
  );
}
