/**
 * 🎙️ AI 开口跟读评估组件（P0-1 升级版）
 * ------------------------------------------------------------
 * 旧版仅判断 transcript.length >= 1（有声音就过），无法真正评估发音。
 * 升级后基于 evaluatePronunciation 做字级对齐评测，输出：
 *   - 逐字对错高亮（正确/读错/漏读）
 *   - 可信得分（0–100）与是否通过
 *   - AI 个性化发音建议（读错的字怎么练）
 *   - 鼓励语 + 庆祝特效
 *
 * 浏览器不支持语音识别时优雅降级到「大声朗读即通过」模式。
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxWrong, sfxWin } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { speak, stopSpeaking, type SpeakLang } from '@/lib/speech';
import { evaluatePronunciation, type PronunciationResult, type CharEval } from '@/lib/pronunciationEval';
import { getSpeechAdvice, type SpeechAdviceResult } from '@/lib/ai/speechAdvice';
import { isSpeechRecogSupported } from '@/lib/ai/speechRecog';
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
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [advice, setAdvice] = useState<SpeechAdviceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<InstanceType<NonNullable<Window['SpeechRecognition']>> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const supported = isSpeechRecogSupported();

  useEffect(() => {
    return () => {
      stopSpeaking();
      abortRef.current?.abort();
    };
  }, []);

  // 初始化语音识别（仅在 targetText/lang 变化时重建）
  useEffect(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const reco = new SR();
    reco.continuous = false;
    reco.interimResults = false;
    reco.lang = lang;
    recognitionRef.current = reco;
    return () => {
      try {
        reco.abort();
      } catch {
        /* noop */
      }
    };
  }, [targetText, lang, supported]);

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

      // 请求 AI 建议（仅在启用且有读错字时）
      if (enableAiAdvice && !evalResult.passed) {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        try {
          const adviceResult = await getSpeechAdvice(targetText, evalResult, lang, ac.signal);
          setAdvice(adviceResult);
          // 朗读鼓励语
          if (adviceResult.encouragement) {
            void speak(adviceResult.encouragement, { lang: 'zh-CN', rate: 0.85, module: 'praise' });
          }
        } catch {
          /* AI 建议失败不影响主流程 */
        }
      }

      setPhase('done');
    },
    [targetText, lang, threshold, onPass, onResult, enableAiAdvice],
  );

  const startListening = useCallback(() => {
    sfxTap();
    setError(null);
    setResult(null);
    setAdvice(null);
    setPhase('listening');

    if (!supported || !recognitionRef.current) {
      // 不支持语音识别：降级为「大声朗读即通过」
      setTimeout(() => {
        const fakeResult = evaluatePronunciation(targetText, targetText, lang, threshold);
        fakeResult.score = 100;
        fakeResult.passed = true;
        fakeResult.feedback = tr('tts.loudReadPass');
        setResult(fakeResult);
        sfxWin();
        celebrateBig();
        onPass?.(fakeResult);
        setPhase('done');
      }, 800);
      return;
    }

    const reco = recognitionRef.current;
    reco.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript.trim()) {
        void handleTranscript(transcript);
      } else {
        setError(tr('tts.noSpeech'));
        setPhase('idle');
      }
    };
    reco.onerror = (event: any) => {
      setPhase('idle');
      if (event.error === 'no-speech') {
        setError(tr('tts.noSpeech'));
      } else if (event.error === 'not-allowed') {
        setError(tr('tts.micDenied'));
      } else {
        setError(tr('tts.recogError'));
      }
    };
    reco.onend = () => {
      // 若仍在 listening 阶段（未拿到 result），回到 idle
      setPhase((p) => (p === 'listening' ? 'idle' : p));
    };

    try {
      reco.start();
    } catch {
      // 重复 start 会抛异常，静默忽略
    }
  }, [supported, targetText, lang, threshold, handleTranscript, onPass]);

  const stopListening = useCallback(() => {
    sfxTap();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    setPhase('idle');
  }, []);

  const reset = useCallback(() => {
    stopSpeaking();
    abortRef.current?.abort();
    setResult(null);
    setAdvice(null);
    setError(null);
    setPhase('idle');
  }, []);

  const isListening = phase === 'listening';
  const isEvaluating = phase === 'evaluating';
  const passed = result?.passed ?? false;

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
          {isEvaluating ? tr('tts.evaluating') : isListening ? tr('tts.listening') : passed ? tr('tts.passed') : tr('tts.tapRead')}
        </span>
      </button>

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-full bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-700 border border-rose-200"
          >
            {error}
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
