/**
 * 🎙️ AI 开口跟读评估组件（P0-1 升级版 · 多级容错）
 * ------------------------------------------------------------
 * 基于 evaluatePronunciation 做字级对齐评测，输出逐字对错/得分/AI 建议。
 *
 * 多级容错链路（关键）：
 *   1. 点击后先预请求麦克风权限，被拒则给出明确提示；
 *   2. 有原生 SpeechRecognition 时，每次点击都创建【全新】实例（绝不复用，
 *      避免跨会话状态残留导致「点击后立即失败/静默结束」）；
 *   3. 识别服务不可用（Chrome/Edge 走 Google 服务，国内网络不可达时会在
 *      1.5s 内立即失败）→ 自动降级为「大声朗读即通过」（音量检测，孩子开口即过）；
 *   4. 兜底超时 + start 抛异常处理，任何情况都不让按钮卡死。
 *
 * 目的：无论识别服务是否可用，跟读按钮都始终可用、绝不出现「点了没反应」。
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxWrong, sfxWin } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { speak, stopSpeaking, type SpeakLang } from '@/lib/speech';
import { evaluatePronunciation, type PronunciationResult, type CharEval } from '@/lib/pronunciationEval';
import { getSpeechAdvice, type SpeechAdviceResult } from '@/lib/ai/speechAdvice';
import {
  getSpeechRecognitionCtor,
  requestMicPermission,
  detectVoiceOnce,
  classifyRecogError,
  type VoiceDetector,
} from '@/lib/ai/speechRecog';
import { useTranslation } from '@/i18n/useTranslation';

interface SpeechEvalButtonProps {
  /** 目标文本（孩子应该读的内容） */
  targetText: string;
  /** 语言 */
  lang?: SpeakLang;
  /** 通过分数线（默认 60） */
  threshold?: number;
  /** 通过回调 */
  onPass?: (result: PronunciationResult) => void;
  /** 评测完成回调（无论是否通过） */
  onResult?: (result: PronunciationResult) => void;
  /** 是否启用 AI 建议（默认开，需联网） */
  enableAiAdvice?: boolean;
  /** 自定义类名 */
  className?: string;
}

type Phase = 'idle' | 'listening' | 'evaluating' | 'done';
type Mode = 'recog' | 'loudread';

/** 识别服务在 1.5s 内就结束/报 no-speech → 判定为服务不可用（如 Google 服务被墙） */
const IMMEDIATE_FAIL_MS = 1500;
/** 识别启动后若在 2.5s 内始终没有任何事件（onstart/onresult/onerror/onend），
 *  视为服务未真正工作（Chrome 连不上 Google 服务时的静默卡死），提前降级大声朗读 */
const QUIET_TIMEOUT_MS = 2500;
/** 大声朗读模式的监听时长 */
const LOUDREAD_TIMEOUT_MS = 20_000;

export function SpeechEvalButton({
  targetText,
  lang = 'en-US',
  threshold = 60,
  onPass,
  onResult,
  enableAiAdvice = true,
  className = '',
}: SpeechEvalButtonProps) {
  const { t: tr } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<Mode>('recog');
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [advice, setAdvice] = useState<SpeechAdviceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<InstanceType<NonNullable<Window['SpeechRecognition']>> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 服务无响应快速检测的定时器 */
  const quietTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 「大声朗读即通过」模式的音量检测器句柄（用于主动释放麦克风） */
  const voiceDetectorRef = useRef<VoiceDetector | null>(null);
  /** 会话自增 id：让过期会话的回调全部失效，杜绝竞态 */
  const sessionRef = useRef(0);

  /** 立即释放「大声朗读」模式占用的麦克风（幂等） */
  const stopVoiceDetector = useCallback(() => {
    if (voiceDetectorRef.current) {
      try {
        voiceDetectorRef.current.stop();
      } catch {
        /* noop */
      }
      voiceDetectorRef.current = null;
    }
  }, []);

  /** 清掉「正在听你读」的兜底超时 */
  const clearListenTimeout = useCallback(() => {
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = null;
    }
    if (quietTimeoutRef.current) {
      clearTimeout(quietTimeoutRef.current);
      quietTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopSpeaking();
      abortRef.current?.abort();
      // 组件卸载时令所有进行中的会话回调失效（ref 自增是有意的，非依赖项）
      // eslint-disable-next-line react-hooks/exhaustive-deps
      sessionRef.current++;
      clearListenTimeout();
      stopVoiceDetector();
    };
  }, [clearListenTimeout, stopVoiceDetector]);

  /** 处理识别结果：字级评测 + AI 建议 */
  const handleTranscript = useCallback(
    async (transcript: string) => {
      setPhase('evaluating');
      const evalResult = evaluatePronunciation(targetText, transcript, lang, threshold);
      setResult(evalResult);
      onResult?.(evalResult);

      if (evalResult.passed) {
        sfxWin();
        celebrateBig();
        void speak(lang === 'zh-CN' ? '读得太棒了！' : 'Great job!', { lang, rate: 0.85, module: 'praise' });
        onPass?.(evalResult);
      } else {
        sfxWrong();
      }

      // ⚠️ 立即收尾：主流程不等待 AI 建议，否则读错时按钮会卡在
      // 「正在评分」几十秒（AI 慢/失败时更久），孩子点了没反应。
      setPhase('done');

      // AI 建议放后台异步加载，结果回来后自动渲染，不阻塞任何 UI 状态
      if (enableAiAdvice && !evalResult.passed) {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        try {
          const adviceResult = await getSpeechAdvice(targetText, evalResult, lang, ac.signal);
          // 已被 reset/新请求取消则丢弃
          if (ac.signal.aborted) return;
          setAdvice(adviceResult);
          if (adviceResult.encouragement) {
            void speak(adviceResult.encouragement, { lang: 'zh-CN', rate: 0.85, module: 'praise' });
          }
        } catch {
          /* AI 建议失败不影响主流程 */
        }
      }
    },
    [targetText, lang, threshold, onPass, onResult, enableAiAdvice],
  );

  /** 进入「大声朗读即通过」降级模式：检测到孩子开口即通过 */
  const goLoudRead = useCallback(
    (session: number) => {
      if (sessionRef.current !== session) return;
      // 重入防护：关闭上一次尚未结束的音量检测，避免麦克风被重复占用
      stopVoiceDetector();
      setMode('loudread');
      setPhase('listening');
      clearListenTimeout();

      const detector = detectVoiceOnce(LOUDREAD_TIMEOUT_MS);
      voiceDetectorRef.current = detector;
      void detector.promise.then((heard) => {
        if (sessionRef.current !== session) return;
        voiceDetectorRef.current = null;
        if (heard) {
          const fakeResult = evaluatePronunciation(targetText, targetText, lang, threshold);
          fakeResult.score = 100;
          fakeResult.passed = true;
          fakeResult.feedback = tr('tts.loudReadPass');
          setResult(fakeResult);
          onResult?.(fakeResult);
          sfxWin();
          celebrateBig();
          onPass?.(fakeResult);
          setPhase('done');
        } else {
          setError(tr('tts.noSpeech'));
          setPhase('idle');
        }
      });
    },
    [targetText, lang, threshold, onPass, onResult, tr, clearListenTimeout, stopVoiceDetector],
  );

  const startListening = useCallback(() => {
    sfxTap();
    // 确保没有残留的「大声朗读」音量检测占用麦克风
    stopVoiceDetector();
    setError(null);
    setResult(null);
    setAdvice(null);
    setMode('recog');
    setPhase('listening');
    clearListenTimeout();
    const session = ++sessionRef.current;

    void (async () => {
      // 1) 预请求麦克风权限（start 前调用，可提前捕获拒绝并给出友好提示）
      const mic = await requestMicPermission();
      if (sessionRef.current !== session) return;
      if (mic === 'denied') {
        setError(tr('tts.micDenied'));
        setPhase('idle');
        return;
      }

      // 2) 无原生识别能力 → 直接「大声朗读即通过」
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        goLoudRead(session);
        return;
      }

      // 3) 每次点击都创建【全新】识别实例（官方最佳实践：不要复用已用过的实例，
      //    否则跨会话状态残留会导致「点击后立即失败/静默结束」）
      const reco = new Ctor();
      reco.continuous = false;
      reco.interimResults = true;
      reco.maxAlternatives = 3;
      reco.lang = lang;
      recognitionRef.current = reco;

      const startedAt = Date.now();
      let gotResult = false;
      let ended = false;

      // 12s 兜底超时：服务挂起不触发任何事件时主动中止，绝不卡死
      listenTimeoutRef.current = setTimeout(() => {
        try {
          reco.abort();
        } catch {
          /* noop */
        }
        clearListenTimeout();
        if (sessionRef.current === session && !gotResult && !ended) {
          setError(tr('tts.noSpeech'));
          setPhase('idle');
        }
      }, 12_000);

      // 服务无响应快速检测：若 2.5s 内没有任何事件（onstart/result/error/end），
      // 说明识别服务根本没真正启动（中国 Chrome 连不上 Google 服务会静默卡死），
      // 立即降级大声朗读，而不是让孩子对着没反应的按钮干等 12 秒。
      quietTimeoutRef.current = setTimeout(() => {
        if (sessionRef.current !== session || gotResult || ended) return;
        clearListenTimeout();
        try {
          reco.abort();
        } catch {
          /* noop */
        }
        goLoudRead(session);
      }, QUIET_TIMEOUT_MS);

      reco.onstart = () => {
        if (sessionRef.current !== session) return;
        // 识别正常启动：先取消「启动前无响应」检测；但若启动后仍长时间无任何
        // 结果/错误/结束（服务虽连上却不出字，如网络不稳），同样降级大声朗读，
        // 避免孩子对着 12s 硬超时干等无反馈。
        if (quietTimeoutRef.current) {
          clearTimeout(quietTimeoutRef.current);
          quietTimeoutRef.current = null;
        }
        quietTimeoutRef.current = setTimeout(() => {
          if (sessionRef.current !== session || gotResult || ended) return;
          clearListenTimeout();
          try {
            reco.abort();
          } catch {
            /* noop */
          }
          goLoudRead(session);
        }, QUIET_TIMEOUT_MS);
      };

      reco.onresult = (event: any) => {
        clearListenTimeout();
        if (sessionRef.current !== session) return;
        gotResult = true;
        ended = true;
        const transcript = event.results[0]?.[0]?.transcript ?? '';
        if (transcript.trim()) {
          // ⚠️ 防御：评测链路任何异常都不能让按钮卡死在「正在评分」
          void handleTranscript(transcript).catch(() => {
            setPhase('done');
          });
        } else if (Date.now() - startedAt < IMMEDIATE_FAIL_MS) {
          // 太快返回空结果 → 服务不可用，降级大声朗读
          goLoudRead(session);
        } else {
          setError(tr('tts.noSpeech'));
          setPhase('idle');
        }
      };

      reco.onerror = (event: any) => {
        clearListenTimeout();
        if (sessionRef.current !== session || gotResult) return;
        ended = true;
        const failure = classifyRecogError(event?.error ?? '');
        if (failure === 'no-speech') {
          if (Date.now() - startedAt < IMMEDIATE_FAIL_MS) goLoudRead(session);
          else {
            setError(tr('tts.noSpeech'));
            setPhase('idle');
          }
        } else if (failure === 'denied') {
          setError(tr('tts.micDenied'));
          setPhase('idle');
        } else if (failure === 'no-mic') {
          setError(tr('tts.recogError'));
          setPhase('idle');
        } else {
          // network / service-unavailable / unknown → 识别服务不可用，自动降级
          goLoudRead(session);
        }
      };

      reco.onend = () => {
        clearListenTimeout();
        if (sessionRef.current !== session || gotResult || ended) return;
        ended = true;
        if (Date.now() - startedAt < IMMEDIATE_FAIL_MS) {
          // 一启动就结束 → 服务不可用（国内 Google 服务被墙的典型表现）
          goLoudRead(session);
        } else {
          setError(tr('tts.noSpeech'));
          setPhase('idle');
        }
      };

      try {
        reco.start();
      } catch {
        // start 抛异常（状态冲突等）→ 没有 onerror/onend 会触发，直接降级大声朗读
        clearListenTimeout();
        if (sessionRef.current === session && !gotResult && !ended) {
          goLoudRead(session);
        }
      }
    })();
  }, [goLoudRead, handleTranscript, lang, tr, clearListenTimeout, stopVoiceDetector]);

  const stopListening = useCallback(() => {
    sfxTap();
    sessionRef.current++; // 令当前会话回调全部失效
    clearListenTimeout();
    stopVoiceDetector(); // 即时释放「大声朗读」模式占用的麦克风
    try {
      recognitionRef.current?.abort();
    } catch {
      /* noop */
    }
    recognitionRef.current = null;
    setPhase('idle');
  }, [clearListenTimeout, stopVoiceDetector]);

  const reset = useCallback(() => {
    stopSpeaking();
    abortRef.current?.abort();
    sessionRef.current++;
    clearListenTimeout();
    stopVoiceDetector(); // 即时释放「大声朗读」模式占用的麦克风
    try {
      recognitionRef.current?.abort();
    } catch {
      /* noop */
    }
    recognitionRef.current = null;
    setResult(null);
    setAdvice(null);
    setError(null);
    setPhase('idle');
  }, [clearListenTimeout, stopVoiceDetector]);

  const isListening = phase === 'listening';
  const isEvaluating = phase === 'evaluating';
  const passed = result?.passed ?? false;
  const inLoudRead = mode === 'loudread' && isListening;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* 主按钮 */}
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isEvaluating}
        className={`no-select flex items-center gap-2 rounded-2xl px-6 py-3 text-base font-black transition-all active:scale-95 disabled:opacity-50 ${
          isListening
            ? 'animate-pulse bg-rose-500 text-white shadow-lg shadow-rose-300'
            : passed
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
              : 'bg-pink-100 text-pink-700 hover:bg-pink-200 border-2 border-pink-300'
        }`}
      >
        <span className="text-xl">
          {isEvaluating
            ? tr('tts.evaluating')
            : isListening
              ? inLoudRead
                ? tr('tts.loudReadListening')
                : tr('tts.listening')
              : passed
                ? tr('tts.passed')
                : tr('tts.tapRead')}
        </span>
      </button>

      {/* 降级模式提示 + 错误提示 */}
      <AnimatePresence>
        {(error || inLoudRead) && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-full px-4 py-1.5 text-xs font-bold border ${
              inLoudRead
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {error || tr('tts.loudReadMode')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 评测结果：逐字高亮 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full space-y-3"
          >
            {/* 得分条 */}
            <div className="flex items-center justify-center gap-3">
              <div className={`flex h-16 w-16 flex-col items-center justify-center rounded-full text-white ${
                passed ? 'bg-emerald-500' : 'bg-amber-500'
              }`}>
                <span className="text-2xl font-extrabold">{result.score}</span>
                <span className="text-[10px]">{tr('tts.pts')}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-ink">{result.feedback}</p>
                <p className="text-xs text-ink-soft">
                  {tr('tts.correctChars', { correct: result.correctCount, total: result.targetCount })}
                </p>
              </div>
            </div>

            {/* 逐字展示 */}
            <div className="flex flex-wrap justify-center gap-1 rounded-2xl bg-white/80 p-3">
              {result.chars.map((c: CharEval, i: number) => (
                <motion.span
                  key={`word-${i}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`inline-block rounded-lg px-2 py-1 text-lg font-bold ${
                    c.status === 'correct'
                      ? 'bg-emerald-100 text-emerald-700'
                      : c.status === 'wrong'
                        ? 'bg-rose-100 text-rose-700 line-through'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                  title={c.status === 'wrong' && c.heard ? `听到的是「${c.heard}」` : ''}
                >
                  {c.ch}
                </motion.span>
              ))}
            </div>

            {/* AI 建议 */}
            {advice && advice.items.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-2 rounded-2xl bg-purple-50 p-3 border border-purple-200"
              >
                <p className="flex items-center gap-1 text-xs font-extrabold text-purple-700">
                  {advice.fromAi ? tr('tts.aiAdvice') : tr('tts.practiceAdvice')}
                </p>
                {advice.items.map((item, i) => (
                  <div key={`item-${i}`} className="rounded-xl bg-white/70 p-2">
                    <p className="text-sm font-bold text-ink">
                      「{item.target}」→ {item.advice}
                    </p>
                    {item.mnemonic && (
                      <p className="mt-0.5 text-xs text-ink-soft">💡 {item.mnemonic}</p>
                    )}
                  </div>
                ))}
                {advice.encouragement && (
                  <p className="text-center text-sm font-bold text-purple-600">{advice.encouragement}</p>
                )}
              </motion.div>
            )}

            {/* 重试按钮 */}
            <div className="flex justify-center gap-2">
              <CandyButton tone="pink" size="sm" onClick={reset}>
                {tr('tts.readAgain')}
              </CandyButton>
              {!passed && (
                <CandyButton
                  tone="purple"
                  size="sm"
                  variant="soft"
                  onClick={() => {
                    stopSpeaking();
                    void speak(targetText, { lang, rate: 0.7, module: 'quiz' });
                  }}
                >
                  {tr('tts.listenModel')}
                </CandyButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
