import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { RoundRunner } from "@/components/quiz/RoundRunner";
import { CandyButton } from "@/components/ui/Button";
import { AiAvatar } from "@/components/ai";
import { makeMathQuestion, type Difficulty } from "@/lib/questions";
import { makeSpacedDrill } from "@/lib/drill";
import { genMathQuestion, mathExplainTask } from "@/lib/ai/tasks";
import type { Question } from "@/types";
import { useStore } from "@/store/useStore";
import { useRoute } from "@/lib/router";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAdaptiveDifficultyState } from "@/store/adaptiveDifficulty";
import { AdaptiveDifficultyHint } from "@/components/study/AdaptiveDifficultyHint";
import { MathStarQuest } from "./MathStarQuest";
import { RestReminder } from "@/components/gamification/RestReminder";
import { MistakeBookPanel } from "@/components/gamification/MistakeBookPanel";
import { ComboMeter } from "@/components/gamification/ComboMeter";
import { GentleFeedback } from "@/components/gamification/GentleFeedback";
import { ReducedMotionToggle } from "@/components/gamification/ReducedMotionToggle";
import { praiseByScene, encourageByScene } from "@/lib/praise";
import { StarSettlementCard } from "@/components/gamification/StarSettlementCard";
import { earnStars, type EarnResult } from "@/game/rewardEconomy";
import { speak } from "@/lib/speech";

const MAX_OF: Record<Difficulty, number> = { 1: 10, 2: 15, 3: 20 };

/** 预取深度：AI 出题要 8~15 秒，靠提前排队把等待藏起来 */
const POOL_TARGET = 2;

export function MathQuiz() {
  const { t } = useTranslation();
  const recordMath = useStore((s) => s.recordMath);
  const progress = useStore((s) => s.progress);
  const { navigate } = useRoute();
  const aiOn = useSettingsStore((s) => s.settings.aiEnabled);
  const [diff, setDiff, diffMeta] = useAdaptiveDifficultyState("math");
  const DIFFS: { id: Difficulty; label: string }[] = [
    { id: 1, label: t("numbers.diff10") },
    { id: 2, label: t("numbers.diff15") },
    { id: 3, label: t("numbers.diff20") },
  ];
  const [aiMode, setAiMode] = useState(false);
  const [poolSize, setPoolSize] = useState(0);
  /** 连击计数（任务 #1 积分/连击激励）：由 onAnswered 维护，驱动 @/game ComboMeter 实时能量条 */
  const [combo, setCombo] = useState(0);
  /** 即时反馈气泡状态（任务 #3）：正确积极强化 / 错误温和引导，无障碍 aria-live，与洪恩/宝宝巴士温和反馈一致 */
  const [feedback, setFeedback] = useState<{ correct: boolean; msg: string } | null>(null);
  /** 每回合 5 题；与 RoundRunner 的 questionsPerRound 保持一致 */
  const QUESTIONS_PER_ROUND = 5;
  /** 本回合答对题数与最长连击：用 ref 累积，避免每题重渲染，结算时统一口径 */
  const correctCountRef = useRef(0);
  const bestComboRef = useRef(0);
  const comboRef = useRef(0);
  /** 结算结果：展示**实际入账**的星数，成长荣誉馆读同一份 */
  const [settlement, setSettlement] = useState<EarnResult | null>(null);
  const addStars = useStore((s) => s.addStars);

  const poolRef = useRef<Question[]>([]);
  const fillingRef = useRef(0);
  const aliveRef = useRef(true);
  /** 题池代际：换难度/切模式后自增，在途请求回来发现代际对不上就丢弃 */
  const genRef = useRef(0);
  /** 延迟补题的定时器，卸载时要清掉 */
  const refillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (refillTimerRef.current) clearTimeout(refillTimerRef.current);
    };
  }, []);

  // 换难度 / 关闭 AI 模式时清空旧题池，避免 10 以内的题混进 20 以内
  useEffect(() => {
    genRef.current++;
    poolRef.current = [];
    fillingRef.current = 0;
    setPoolSize(0);
  }, [diff, aiMode]);

  const refill = useCallback(() => {
    if (!aiMode || !aiOn) return;
    const gen = genRef.current;
    const need = POOL_TARGET - poolRef.current.length - fillingRef.current;
    for (let i = 0; i < need; i++) {
      fillingRef.current++;
      const op: "add" | "sub" = Math.random() < 0.6 ? "add" : "sub";
      genMathQuestion(op, MAX_OF[diff])
        .then((r) => {
          // 兜底题不入池：本地题库随时能造，池子只留 AI 的情景题
          // 代际校验：难度已经切走了就直接扔掉，否则 20 以内的题会串到 10 以内
          if (!aliveRef.current || gen !== genRef.current || !r.ok) return;
          poolRef.current.push(r.data);
          setPoolSize(poolRef.current.length);
        })
        .catch(() => {
          /* 出题失败：本地题库随时兜底，不打扰用户 */
        })
        .finally(() => {
          if (gen === genRef.current)
            fillingRef.current = Math.max(0, fillingRef.current - 1);
        });
    }
  }, [aiMode, aiOn, diff]);

  useEffect(() => {
    refill();
  }, [refill]);

  const localMake = makeSpacedDrill(
    "math",
    makeMathQuestion,
    () => useStore.getState().progress,
  );

  const make = useCallback(
    (d: Difficulty): Question => {
      if (aiMode && aiOn) {
        const q = poolRef.current.shift();
        /**
         * ⚠️ make 会被 RoundRunner 在 useState 初始化器里同步调用，也就是渲染期。
         * 在这里直接 setPoolSize 属于"渲染另一个组件时更新本组件"，
         * React 会打警告，严格模式下还可能丢更新。统一推到宏任务里做。
         */
        if (refillTimerRef.current) clearTimeout(refillTimerRef.current);
        refillTimerRef.current = setTimeout(() => {
          refillTimerRef.current = null;
          if (!aliveRef.current) return;
          setPoolSize(poolRef.current.length);
          refill(); // 出完一题立刻补一题，保持流水线
        }, 0);
        if (q) return q;
      }
      return localMake(d);
    },
    // localMake is stateless per difficulty, intentional exclude from deps
    [aiMode, aiOn, refill],
  );

  return (
    <>
      <RoundRunner
        key={`${diff}-${aiMode}`}
        makeQuestion={make}
        difficulty={diff}
        tone="yellow"
        questionsPerRound={QUESTIONS_PER_ROUND}
        streakBar={{ leveled: true, tone: "yellow" }}
        onRoundStart={() => {
          diffMeta.syncNow();
          setCombo(0);
          setFeedback(null);
          correctCountRef.current = 0;
          bestComboRef.current = 0;
          comboRef.current = 0;
          setSettlement(null);
        }}
        onAnswered={(q, c) => {
          recordMath(c, q.skill);
          if (c) {
            comboRef.current += 1;
            correctCountRef.current += 1;
            bestComboRef.current = Math.max(bestComboRef.current, comboRef.current);
            setCombo(comboRef.current);
          } else {
            comboRef.current = 0;
            setCombo(0);
          }
          setFeedback({ correct: c, msg: c ? praiseByScene("math") : encourageByScene("math") });
        }}
        onComplete={() => {
          const total = QUESTIONS_PER_ROUND;
          const correct = correctCountRef.current;
          const best = bestComboRef.current;
          const result = earnStars({ module: "numbers", total, correct, bestCombo: best });
          if (result.granted > 0) addStars(result.granted);
          setSettlement(result);
          void speak(`恭喜你完成数学闯关！一共获得 ${result.granted} 颗星！`).catch(() => {});
        }}
        aiExplain={(q, chosen, correct) =>
          mathExplainTask(q.prompt, q.display ?? q.prompt, correct, chosen)
        }
        header={
          <div className="space-y-2.5">
            <div className="flex gap-2.5">
              {DIFFS.map((d) => (
                <CandyButton
                  key={d.id}
                  tone={diff === d.id ? "yellow" : "purple"}
                  variant={diff === d.id ? "solid" : "soft"}
                  size="sm"
                  fullWidth
                  onClick={() => setDiff(d.id)}
                >
                  {d.label}
                </CandyButton>
              ))}
            </div>
            <AdaptiveDifficultyHint
              meta={diffMeta}
              labels={{
                1: t("numbers.diff10"),
                2: t("numbers.diff15"),
                3: t("numbers.diff20"),
              }}
            />

            {aiOn && (
              <button
                type="button"
                onClick={() => setAiMode((v) => !v)}
                className="flex w-full items-center gap-2.5 rounded-2xl border-2 px-3.5 py-2.5 text-left transition active:translate-y-[2px]"
                style={{
                  background: aiMode ? "#ECE5FF" : "#FFFFFF",
                  borderColor: aiMode ? "#8b6ef0" : "#ece5ff",
                }}
              >
                <AiAvatar size={30} mood={aiMode ? "talking" : "sleep"} />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-extrabold text-candy-purple-deep">
                    {t(aiMode ? "numbers.aiTitleOn" : "numbers.aiTitleOff")}
                  </span>
                  <span className="block text-xs text-ink-soft">
                    {aiMode
                      ? poolSize > 0
                        ? t("numbers.aiPoolReady", { poolSize })
                        : t("numbers.aiPoolEmpty")
                      : "让小茜把算式编成买水果、分糖果的小故事"}
                  </span>
                </span>
                <span
                  className="grid h-7 w-12 shrink-0 items-center rounded-full px-1 transition"
                  style={{ background: aiMode ? "#8b6ef0" : "#d9c6f5" }}
                >
                  <span
                    className="block h-5 w-5 rounded-full bg-white transition-transform"
                    style={{
                      transform: aiMode ? "translateX(20px)" : "translateX(0)",
                    }}
                  />
                </span>
              </button>
            )}
          </div>
        }
      />
      <section className="space-y-3">
        <MathStarQuest />
        <MistakeBookPanel progress={progress} onReview={() => navigate('wrongbook')} />
        <ComboMeter count={combo} />
        {/* 展示**实际入账**的星数，与成长荣誉馆同一份数据 */}
        {settlement && <StarSettlementCard result={settlement} moduleName="数学" />}
        {feedback && <GentleFeedback correct={feedback.correct} message={feedback.msg} />}
        <RestReminder />
        <ReducedMotionToggle />
      </section>
    </>
  );
}
