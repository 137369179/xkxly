import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import type { Question } from '@/types';
import { cn } from '@/lib/utils';
import { TONE_STYLE, toneAt } from '@/lib/tones';
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateBig, celebrateSmall, celebrateStars } from '@/lib/celebrate';
import { recordCombo, COMBO_THRESHOLDS } from '@/lib/combo';
import { recordAttempt } from '@/lib/adaptChain';
import { useMastery } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';
import { errorAnalyzer, WEAKNESS_LABEL } from '@/lib/ai/smart-practice';
import { speak, stopSpeaking, praiseByScene, encourageByScene, skillToPraiseScene, skillToEncourageScene } from '@/lib/speech';
import { CandyButton } from '@/components/ui/Button';
import { FeedbackBanner, type FeedbackKind } from '@/components/ui/Feedback';
import { AiButton, AiPanel } from '@/components/ai';
import { useAiStream } from '@/lib/ai/useAi';
import type { StreamTask } from '@/lib/ai/tasks';
import { quizExtendTask } from '@/lib/ai/tasks';
import { wrongReason } from '@/lib/questions';

/** 把选项渲染成一段可以喂给模型的纯文本 */
function optionText(o: { label?: string; emoji?: string; shapes?: string[] } | undefined): string {
  if (!o) return '';
  return o.label ?? o.emoji ?? (o.shapes ? o.shapes.join('') : '');
}

export interface QuizCardProps {
  question: Question;
  /** 本题作答结果回调：每题仅触发一次（首次判定，无论对错）；重试的错误点击只做本地反馈，不再重复上报，避免 SRS/计分被放大 */
  onAnswer?: (correct: boolean) => void;
  /** 答对且用户点击「继续」后触发 */
  onNext?: () => void;
  /** 下一步按钮文案 */
  nextLabel?: string;
  /** 进入时自动朗读题干 */
  autoSpeak?: boolean;
  /** 顶部附加信息，如「第 3 / 5 题」 */
  meta?: string;
  /**
   * 答错后提供「小智讲一讲」。返回流式任务；不传则不显示 AI 入口。
   * 由各模块决定怎么描述这道题，答题卡只负责统一的展示与交互。
   */
  aiExplain?: (q: Question, chosenText: string, correctText: string) => StreamTask;
  /** v6: 连续答对计数（由父组件维护传入），达到 3 的倍数时触发 AI 知识扩展 */
  streak?: number;
  /** Boss战：隐藏提示按钮 */
  hideHint?: boolean;
  /** Boss战：每题限时（毫秒） */
  timeLimitMs?: number;
  /** Boss战：打乱选项顺序 */
  shuffleOptions?: boolean;
}

export function QuizCard({
  question,
  onAnswer,
  onNext,
  nextLabel,
  autoSpeak = true,
  meta,
  aiExplain,
  streak = 0,
  hideHint = false,
  timeLimitMs,
  shuffleOptions = false,
}: QuizCardProps) {
  const { t: translate } = useTranslation();
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  // v6: AI 答对扩展
  const [showExtend, setShowExtend] = useState(false);
  // P3: 超时干预——60s 未作答时显示温和提示，吸引孩子注意或给提示
  const [showStuckHint, setShowStuckHint] = useState(false);
  const extendTask = useMemo(() => {
    if (!showExtend) return null;
    return quizExtendTask(
      question.prompt || question.display || '',
      optionText(question.options.find((o) => o.id === question.answerId)),
      question.skill || '',
    );
  }, [showExtend, question]);
  const extendAi = useAiStream(extendTask ?? undefined);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: FeedbackKind; text: string }>({
    kind: null,
    text: '',
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const explain = useAiStream();
  /** 读取全局掌握度，用于跨题薄弱诊断（区别于单题 wrongReason） */
  const mastery = useMastery();
  const skillDiag = useMemo(() => {
    if (!question.skill) return null;
    return errorAnalyzer.diagnoseSkill(question.skill, mastery[question.skill]);
  }, [question.skill, mastery]);
  /** 抖动动画的复位定时器：不清理的话，快速连点会在卸载后触发 setState */
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 超时干预定时器 */
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 超时干预定时器启动时间戳，用于排查孩子卡住时的具体状态 */
  const stuckStartRef = useRef<number | null>(null);
  /** 本题作答起始时间，用于 DDA 反应时信号（识别纠结/走神） */
  const startedAt = useRef<number>(Date.now());
  /** 本题是否已向父组件上报过结果：保证 onAnswer/recordAttempt/recordCombo 每题仅触发一次，防止错选多次放大 SRS/计分 */
  const reportedRef = useRef(false);
  /** 用 ref 镜像最新 solved，供倒计时 interval 闭包读取（P2-7：避免闭包捕获旧 solved 恒为 false） */
  const solvedRef = useRef(false);
  useEffect(() => {
    solvedRef.current = solved;
  }, [solved]);

  // —— Boss战：倒计时 ——
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timeLimitRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeExpiredRef = useRef(false);

  // —— Boss战：打乱选项 ——
  const shuffledOptions = useMemo(() => {
    if (!shuffleOptions) return question.options;
    const arr = [...question.options];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      const sw = arr[j];
      if (tmp !== undefined && sw !== undefined) {
        arr[i] = sw;
        arr[j] = tmp;
      }
    }
    return arr;
  // intentional: shuffle only on question id change, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, shuffleOptions]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearShakeTimer = () => {
    if (shakeTimerRef.current) {
      clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = null;
    }
  };
  /**
   * 清除超时干预定时器，并打印详细日志便于排查孩子卡住时的具体状态。
   * @param reason 清除原因，用于日志追溯（'answered' 答题 / 'new-question' 换题 / 'unmount' 卸载 / 'replay' 重听）
   */
  const clearStuckTimer = (reason: 'answered' | 'new-question' | 'unmount' | 'replay') => {
    if (stuckTimerRef.current) {
      const elapsed = stuckStartRef.current != null ? Date.now() - stuckStartRef.current : null;
      if (import.meta.env.DEV) {
        console.log(
          `[stuck] clear qid=${question.id} skill=${question.skill ?? '-'} reason=${reason}` +
            ` elapsed=${elapsed != null ? `${elapsed}ms` : '-'} wrong=${wrongIds.length} solved=${solved}`,
        );
      }
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
      stuckStartRef.current = null;
    }
  };

  // 卸载时收尾
  useEffect(() => {
    clearShakeTimer();
    clearStuckTimer('unmount');
    return () => {
      clearShakeTimer();
      clearStuckTimer('unmount');
      clearTimer();
    };
  // cleanup on unmount only
  }, [clearTimer]);

  // question 变化时重置答题状态
  useEffect(() => {
    setSolved(false);
    setShakeId(null);
    setFeedback({ kind: null, text: '' });
    explain.reset();
    startedAt.current = Date.now();
    reportedRef.current = false;
    // Boss战：重置倒计时
    timeExpiredRef.current = false;
    if (timeLimitMs && timeLimitMs > 0) {
      setTimeRemaining(timeLimitMs);
      timeLimitRef.current = timeLimitMs;
      clearTimer();
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev === null) return null;
          const next = prev - 100;
          if (next <= 0) {
            clearTimer();
            if (!timeExpiredRef.current && !solvedRef.current) {
              timeExpiredRef.current = true;
              // 时间到自动判错（仅上报一次，与手动作答共用 reportedRef）
              if (!reportedRef.current) {
                reportedRef.current = true;
                onAnswer?.(false);
              }
              setFeedback({ kind: 'wrong', text: translate('quiz.timeUp') });
            }
            return 0;
          }
          return next;
        });
      }, 100);
    } else {
      setTimeRemaining(null);
      timeLimitRef.current = null;
    }
    return () => clearTimer();
  // intentional: only reset on question id change, not on whole question object
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, timeLimitMs]);

  // 自动朗读题干
  useEffect(() => {
    if (!autoSpeak || !question.speak) return;
    const timer = setTimeout(() => {
      void speak(question.speak ?? '', { lang: question.speakLang ?? 'zh-CN', module: 'quiz' });
    }, 320);
    return () => {
      clearTimeout(timer);
      stopSpeaking();
    };
  }, [question.id, question.speak, question.speakLang, autoSpeak]);

  // P3: 超时干预——题目展示 60s 后若仍未作答，温和提示"再听一遍"
  // 6 岁孩子卡 60s 通常是走神或不会，重读题干比静默等待更有效。
  // 已答对/换题时自动清除定时器与提示。
  // 详细日志：arm(启动) / trigger(60s 触发) / clear(清除) 便于排查孩子卡住时的具体状态。
  useEffect(() => {
    setShowStuckHint(false);
    clearStuckTimer('new-question');
    if (solved) return;
    if (import.meta.env.DEV) {
      console.log(
        `[stuck] arm qid=${question.id} skill=${question.skill ?? '-'} autoSpeak=${autoSpeak}` +
          ` wrong=${wrongIds.length} threshold=60000ms`,
      );
    }
    stuckStartRef.current = Date.now();
    stuckTimerRef.current = setTimeout(() => {
      if (import.meta.env.DEV) {
        console.warn(
          `[stuck] trigger qid=${question.id} skill=${question.skill ?? '-'}` +
            ` after 60000ms wrong=${wrongIds.length} —— 孩子已 60s 未作答，弹出"再听一遍"提示`,
        );
      }
      setShowStuckHint(true);
      // 温和语音提醒，吸引注意
      void speak('需要小智再读一遍题目吗？', { lang: 'zh-CN', rate: 0.9, module: 'praise' });
    }, 60_000);
    return () => clearStuckTimer('new-question');
  // intentional: only re-arm when question changes or solved status changes
  }, [question.id, solved]);

  /** 用户点击"再听一遍"：重新朗读题干并隐藏提示 */
  const handleReplayPrompt = () => {
    if (import.meta.env.DEV) {
      console.log(
        `[stuck] replay qid=${question.id} skill=${question.skill ?? '-'} wrong=${wrongIds.length}` +
          ` —— 用户点击"再听一遍"`,
      );
    }
    setShowStuckHint(false);
    clearStuckTimer('replay');
    if (question.speak) {
      void speak(question.speak, { lang: question.speakLang ?? 'zh-CN', module: 'quiz' });
    }
  };

  const handlePick = (optId: string) => {
    if (solved || wrongIds.includes(optId)) return;
    // Boss战：时间到则忽略点击
    if (timeExpiredRef.current) return;
    // 答题即清除超时干预定时器与提示
    clearStuckTimer('answered');
    setShowStuckHint(false);
    // Boss战：停止倒计时
    clearTimer();

    // DDA 信号采集：反应时 + 是否已用过提示/重试
    const ms = Date.now() - startedAt.current;
    const hintUsed = wrongIds.length > 0;

    if (optId === question.answerId) {
      setSolved(true);
      sfxCorrect();
      const rect = cardRef.current?.getBoundingClientRect();
      celebrateSmall(
        rect
          ? {
              x: (rect.left + rect.width / 2) / window.innerWidth,
              y: (rect.top + rect.height / 2) / window.innerHeight,
            }
          : undefined,
      );
      // 核心加强 H：场景化表扬——按 skill 题型选鼓励语，比通用"真棒"更有针对性
      // 50% 概率不念叨（保留原 randomPraise 的安静设计），其余按场景选具体表扬
      const praise = Math.random() < 0.5 ? '' : praiseByScene(skillToPraiseScene(question.skill));
      setFeedback({ kind: 'correct', text: praise });
      void speak(praise, { lang: 'zh-CN', rate: 0.9, module: 'praise' });
      // 每题仅上报一次：首次判定即上报父组件（SRS/计分/连击），后续点击只做本地反馈
      if (!reportedRef.current) {
        reportedRef.current = true;
        onAnswer?.(true);
        // 自适应学习链：追踪答对，推动难度升级（同时写入 DDA 反应时/提示信号）
        const cat = question.skill ? question.skill.split(':')[0] : null;
        if (cat) recordAttempt(cat, { correct: true, ms, hintUsed });
        // 全局连击：记录答对，触发阈值时额外庆祝
        const combo = recordCombo(true);
        if (combo.triggered && combo.level >= 0) {
          const celeb = COMBO_THRESHOLDS[combo.level]?.celebration ?? 'small';
          if (celeb === 'big') {
            void celebrateBig();
          } else if (celeb === 'medium') {
            void celebrateStars(5);
          } else {
            void celebrateSmall();
          }
        }
        // v6: 连续答对 3 题（且是 3 的倍数）时自动弹知识扩展
        if (streak > 0 && streak % 3 === 0) {
          setShowExtend(true);
        }
      }
    } else {
      setWrongIds((w) => [...w, optId]);
      setShakeId(optId);
      clearShakeTimer();
      shakeTimerRef.current = setTimeout(() => {
        shakeTimerRef.current = null;
        setShakeId(null);
      }, 480);
      sfxWrong();
      // 核心加强 H：场景化鼓励——按 skill 题型选鼓励语，比通用"再试一次"更有引导性
      const enc = encourageByScene(skillToEncourageScene(question.skill));
      setFeedback({ kind: 'wrong', text: enc });
      void speak(enc, { lang: 'zh-CN', rate: 0.9, module: 'praise' });
      // 每题仅上报一次：首次错判即上报父组件，后续错选只做本地反馈（抖动/鼓励），不再放大 SRS/计分
      if (!reportedRef.current) {
        reportedRef.current = true;
        onAnswer?.(false);
        // 自适应学习链：追踪答错，推动难度降级（同时写入 DDA 反应时/提示信号 + 错因类型）
        const cat2 = question.skill ? question.skill.split(':')[0] : null;
        if (cat2) recordAttempt(cat2, { correct: false, ms, hintUsed, errorType: question.kind || question.type || 'unknown' });
        // 全局连击：答错则连击清零
        recordCombo(false);
      }
    }
  };

  const optionCount = shuffledOptions.length;
  const gridCols =
    optionCount <= 2 ? 'grid-cols-2' : optionCount === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div ref={cardRef} className="card-candy p-5 sm:p-8">
      {meta && (
        <div className="mb-3 text-center text-sm font-bold tracking-wide text-ink-soft">{meta}</div>
      )}

      {/* 题干 */}
      <h3 className="text-center text-xl font-extrabold text-ink sm:text-2xl">{question.prompt}</h3>

      {/* 听音类题目：提供手动重听按钮（与 autoSpeak 自动朗读互补，对所有听音游戏可复用） */}
      {question.speak && (
        <div className="mt-2 flex justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void speak(question.speak ?? '', { lang: question.speakLang ?? 'zh-CN', module: 'quiz' });
            }}
            className="flex items-center gap-1.5 rounded-full bg-candy-purple-soft px-4 py-1.5 text-sm font-extrabold text-candy-purple-deep shadow-candy-sm transition active:translate-y-[1px]"
            aria-label={translate('quiz.listenAgainBtn')}
            data-replay="audio"
          >
            🔊 {translate('quiz.listenAgainBtn')}
          </button>
        </div>
      )}

      {/* 大号展示区 */}
      {question.display && (
        <div className="mt-5 mb-1 text-center">
          <span className="inline-block rounded-[1.6rem] bg-white/70 px-10 py-6 text-8xl font-extrabold tracking-wide text-candy-purple-deep shadow-candy-sm sm:text-9xl">
            {question.display}
          </span>
        </div>
      )}

      {/* 图形序列展示 */}
      {question.displayShapes && (
        <div className="mt-5 mb-1 flex flex-wrap items-center justify-center gap-2 rounded-[1.6rem] bg-white/70 px-4 py-5 shadow-candy-sm sm:gap-3">
          {question.displayShapes.map((s, i) => (
            <span
              key={`shape-${s}-${i}`}
              className={cn(
                'text-5xl sm:text-6xl',
                s === '❓' && 'animate-bounce-soft rounded-2xl bg-candy-yellow-soft px-2',
              )}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* P3: 超时干预提示——60s 未作答时温和浮现，吸引注意 */}
      {showStuckHint && !solved && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center justify-between rounded-2xl bg-candy-pink-soft px-4 py-3 shadow-candy-sm"
        >
          <span className="text-sm font-extrabold text-candy-purple-deep">
{translate('quiz.stuckHint')}
          </span>
          <button
            onClick={handleReplayPrompt}
            className="rounded-full bg-candy-purple-deep px-4 py-1.5 text-sm font-extrabold text-white shadow-candy-sm active:translate-y-[1px]"
          >
            {translate('quiz.listenAgainBtn')}
          </button>
        </motion.div>
      )}

      {/* Boss战：倒计时进度条 */}
      {timeLimitMs && timeLimitMs > 0 && timeRemaining !== null && (
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-candy-pink-soft">
          <div
            className="h-full rounded-full bg-red-500 transition-[width] duration-100 ease-linear"
            style={{ width: `${(timeRemaining / (timeLimitRef.current ?? timeLimitMs)) * 100}%` }}
          />
        </div>
      )}

      {/* 选项 */}
      <div className={cn('mt-6 grid gap-3 sm:gap-4', gridCols)}>
        {shuffledOptions.map((opt, i) => {
          const isWrong = wrongIds.includes(opt.id);
          const isRight = solved && opt.id === question.answerId;
          const t = TONE_STYLE[toneAt(i)] ?? TONE_STYLE.pink;
          return (
            <motion.button
              key={opt.id}
              onClick={() => handlePick(opt.id)}
              disabled={solved || isWrong}
              animate={shakeId === opt.id ? { x: [0, -9, 9, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.42 }}
              whileTap={!solved && !isWrong ? { scale: 0.94 } : undefined}
              className={cn(
                'no-select relative grid min-h-[88px] place-items-center gap-1 rounded-[1.5rem] px-3 py-4',
                'text-2xl font-extrabold transition-all duration-150 sm:min-h-[104px] sm:text-3xl',
                'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-purple/60',
                isWrong && 'opacity-40 grayscale',
                isRight && 'ring-4 ring-candy-green ring-offset-2',
              )}
              style={{
                background: isRight ? TONE_STYLE.green.soft : t.soft,
                color: isRight ? TONE_STYLE.green.deep : t.deep,
                boxShadow: solved || isWrong ? 'none' : `0 5px 0 0 ${t.main}55`,
              }}
            >
              {opt.emoji && <span className="text-4xl sm:text-5xl">{opt.emoji}</span>}
              {opt.shapes && (
                <span className="flex flex-wrap items-center justify-center gap-1">
                  {opt.shapes.map((s: string, k: number) => (
                    <span key={`optshape-${s}-${k}`} className="text-3xl sm:text-4xl">
                      {s}
                    </span>
                  ))}
                </span>
              )}
              {opt.label && <span className="leading-tight break-all">{opt.label}</span>}

              {isRight && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-candy-green text-lg text-white shadow-candy-sm"
                >
                  ✓
                </motion.span>
              )}
              {isWrong && (
                <span className="absolute -top-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-candy-orange text-lg text-white">
                  ✕
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* 反馈 */}
      <div className="mt-5 min-h-[68px]">
        <FeedbackBanner kind={feedback.kind} text={feedback.text} />
      </div>

      {/* M4 智能错因：答错后展示具体为什么错 */}
      {wrongIds.length > 0 && !solved && (() => {
        const lastWrongOpt = question.options.find((o) => o.id === wrongIds[wrongIds.length - 1]);
        const reason = lastWrongOpt
          ? wrongReason(question, lastWrongOpt.label ?? lastWrongOpt.emoji ?? '')
          : null;
        if (!reason) return null;
        return (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 rounded-2xl bg-candy-orange-soft/60 px-4 py-2.5 text-sm font-bold text-candy-orange-deep"
          >
            💭 <span className="text-ink">{reason}</span>
          </motion.div>
        );
      }      )()}

      {/* 智能复习小贴士：基于该技能累计掌握度的跨题薄弱诊断（区别于单题错因 wrongReason） */}
      {skillDiag && wrongIds.length > 0 && !solved && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 rounded-2xl bg-candy-pink-soft px-4 py-2.5 text-sm font-bold text-candy-purple-deep"
        >
          🧠 小智发现：你在这类题上{WEAKNESS_LABEL[skillDiag.weaknessType]}，试试{skillDiag.recommendedActions[0]}
        </motion.div>
      )}

      {solved && question.hint && !hideHint && (
        <p className="mt-1 text-center text-sm font-semibold text-ink-soft">💡 {question.hint}</p>
      )}

      {/* 核心加强 K：答错后主动展示 hint——孩子卡住时给提示，不再瞎猜
          原逻辑 hint 只在 solved 后展示，答错时孩子看不到提示只能继续猜，
          打击信心且无学习价值。现在答错 1 次即展示 hint，引导孩子思考方向。
          Boss战模式下（hideHint=true）隐藏提示。 */}
      {!solved && wrongIds.length > 0 && question.hint && !hideHint && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-center text-sm font-semibold text-candy-orange-deep"
        >
{translate('quiz.smallHint', { hint: question.hint })}
        </motion.p>
      )}

      {/* 答错了才出现的 AI 讲解入口：孩子卡住时才打扰，不抢答题节奏 */}
      {aiExplain && wrongIds.length > 0 && explain.status === 'idle' && (
        <div className="mt-2 flex justify-center">
          <AiButton
            size="sm"
            tone="purple"
            onClick={() => {
              const correctText = optionText(question.options.find((o) => o.id === question.answerId));
              const chosenText = optionText(question.options.find((o) => o.id === wrongIds[wrongIds.length - 1]));
              explain.run(aiExplain(question, chosenText, correctText));
            }}
          >
            {translate('quiz.explainByAI')}
          </AiButton>
        </div>
      )}
      {aiExplain && explain.status !== 'idle' && (
        <AiPanel state={explain} tone="purple" className="mt-3" compact />
      )}

      {solved && onNext && (
        <div className="mt-4 flex justify-center">
          <CandyButton tone="green" size="lg" onClick={onNext}>
{nextLabel ?? translate('common.nextQuestion')}
          </CandyButton>
        </div>
      )}
      {/* v6: 答对知识扩展 */}
      {showExtend && extendTask && (
        <AiPanel state={extendAi} tone="blue" className="mt-3" compact />
      )}
    </div>
  );
}
