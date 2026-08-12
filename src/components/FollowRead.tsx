/**
 * 通用跟读组件（P0-3）
 * ------------------------------------------------------------
 * 把「听范读（KaraokeReader）」和「开口评测（SpeechEvalButton）」组合成
 * 一个完整的跟读练习流程：
 *   1. 听一遍范读（逐字高亮，可重播/跳句）
 *   2. 跟读一遍（语音识别 + 字级评测 + AI 建议）
 *   3. 看结果（逐字对错 + 得分 + 改进建议）
 *
 * 适用于古诗、儿歌、汉字造句、英语单词/句子等所有需要跟读的场景。
 * 复用 audioCompare 做节奏分析时传入 ChantPlan（古诗专用）；通用场景
 * 仅做字级发音评测，不强制要求节奏分析。
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KaraokeReader } from './KaraokeReader';
import { SpeechEvalButton } from './SpeechEvalButton';
import { CandyButton } from '@/components/ui/Button';
import { speak, stopSpeaking, type SpeakLang } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import type { PronunciationResult } from '@/lib/pronunciationEval';
import { useTranslation } from '@/i18n/useTranslation';
import { safeGetItem } from '@/lib/safeStorage';

/**
 * 性能日志工具
 * ------------------------------------------------------------
 * 统一在 [FollowRead] 标签下输出关键节点的相对时间戳与耗时，
 * 用于排查「听范读 → 跟读 → 评测结果」链路上的延迟来源。
 * 通过 `safeSetItem('fr_debug','1')` 可在浏览器运行时开启，
 * 无需刷新页面即生效；关闭则 `safeRemoveItem('fr_debug')`。
 * 用 safeStorage 而非裸 localStorage：禁用存储的 WebView 下裸读写会抛 SecurityError。
 */
const FR_T0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

/** 运行时动态读取开关，确保测试与控制台实时设置均生效 */
function isFrDebug(): boolean {
  return safeGetItem('fr_debug') === '1';
}

function frLog(stage: string, extra?: Record<string, unknown>): void {
  if (!isFrDebug()) return;
  const tRel = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - FR_T0).toFixed(1);
  // eslint-disable-next-line no-console
  console.log(
    `%c[FollowRead] ${stage}`,
    'color:#ec4899;font-weight:bold',
    { t_ms: tRel, ...extra },
  );
}

export interface FollowReadProps {
  /** 目标文本（整段） */
  text: string;
  /** 逐句文本数组（优先于 text，用于 KaraokeReader 分句） */
  lines?: string[];
  /** 语言 */
  lang?: SpeakLang;
  /** 内容模块 */
  module?: string;
  /** 语速覆盖 */
  rate?: number;
  /** 诗歌情绪 key */
  moodKey?: string;
  /** 通过分数线 */
  threshold?: number;
  /** 标题（可选） */
  title?: string;
  /** 是否启用 AI 建议 */
  enableAiAdvice?: boolean;
  /** 通过回调 */
  onPass?: (result: PronunciationResult) => void;
  /** 自定义类名 */
  className?: string;
  /** 主题色 */
  tone?: 'purple' | 'pink' | 'green' | 'amber' | 'blue';
}

type Step = 'listen' | 'follow' | 'result';

export function FollowRead({
  text,
  lines,
  lang = 'zh-CN',
  module = 'story',
  rate,
  moodKey,
  threshold = 60,
  title,
  enableAiAdvice = true,
  onPass,
  className = '',
  tone = 'pink',
}: FollowReadProps) {
  const { t: tr } = useTranslation();
  const [step, setStep] = useState<Step>('listen');
  const [lastResult, setLastResult] = useState<PronunciationResult | null>(null);

  // 关键时间戳（用 ref 保存以避免触发重渲染）
  const mountTsRef = useRef<number>(0);
  const enterFollowTsRef = useRef<number>(0);
  const speakStartTsRef = useRef<number>(0);

  // 挂载 / 卸载日志
  useEffect(() => {
    mountTsRef.current = performance.now();
    frLog('mount', {
      title,
      lang,
      module,
      textLen: text.length,
      linesCount: lines?.length,
      rate,
      threshold,
      enableAiAdvice,
    });
    return () => {
      frLog('unmount', {
        lifetime_ms: (performance.now() - mountTsRef.current).toFixed(1),
      });
    };
    // 仅挂载时执行一次
    // intentional: mount-only side effect, no deps needed
  }, []);

  // 步骤切换日志
  useEffect(() => {
    frLog('step_change', { step });
  }, [step]);

  const handleResult = useCallback((result: PronunciationResult) => {
    const now = performance.now();
    const followElapsed = enterFollowTsRef.current
      ? (now - enterFollowTsRef.current).toFixed(1)
      : null;
    frLog('eval_result', {
      score: result.score,
      passed: result.passed,
      correct: result.correctCount,
      target: result.targetCount,
      from_follow_ms: followElapsed,
      from_mount_ms: (now - mountTsRef.current).toFixed(1),
    });
    setLastResult(result);
    setStep('result');
  }, []);

  const handlePass = useCallback(
    (result: PronunciationResult) => {
      frLog('eval_pass', { score: result.score });
      onPass?.(result);
    },
    [onPass],
  );

  const restart = useCallback(() => {
    frLog('restart_click');
    sfxTap();
    stopSpeaking();
    setLastResult(null);
    setStep('listen');
    enterFollowTsRef.current = 0;
    speakStartTsRef.current = 0;
  }, []);

  // 「我会读了，开始跟读」
  const handleStartFollow = useCallback(() => {
    frLog('start_follow_click');
    sfxTap();
    stopSpeaking();
    enterFollowTsRef.current = performance.now();
    setStep('follow');
  }, []);

  // 「再听一遍范读」
  const handleReplayListen = useCallback(() => {
    frLog('replay_listen_click', { textLen: text.length });
    speakStartTsRef.current = performance.now();
    stopSpeaking();
    void speak(text, { lang, rate: rate ?? 0.7, module, moodKey }).then(() => {
      const elapsed = speakStartTsRef.current
        ? (performance.now() - speakStartTsRef.current).toFixed(1)
        : '?';
      frLog('replay_listen_done', { speak_ms: elapsed });
    });
  }, [text, lang, rate, module, moodKey]);

  // 「下一关」
  const handleNextLevel = useCallback(() => {
    frLog('next_level_click', { score: lastResult?.score });
    sfxTap();
    void speak('太棒了！我们继续下一关！', { lang: 'zh-CN', rate: 0.85, module: 'praise' });
  }, [lastResult?.score]);

  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="text-center">
          <h3 className="text-lg font-extrabold text-ink">🎤 {title}</h3>
          <p className="text-xs font-bold text-ink-soft">{tr('listen.followTip')}</p>
        </div>
      )}

      {/* 步骤指示器 */}
      <div className="flex items-center justify-center gap-2">
        {([
          { key: 'listen', label: tr('listen.stepListen'), icon: '👂' },
          { key: 'follow', label: tr('listen.stepFollow'), icon: '🎤' },
          { key: 'result', label: tr('listen.stepResult'), icon: '📊' },
        ] as { key: Step; label: string; icon: string }[]).map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                step === s.key
                  ? 'bg-candy-pink-soft text-candy-pink-deep ring-2 ring-candy-pink-deep'
                  : 'bg-white/60 text-ink-soft'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </div>
            {i < 2 && <span className="text-ink-soft">→</span>}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* 步骤 1：听范读 */}
        {step === 'listen' && (
          <motion.div
            key="listen"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <KaraokeReader
              text={text}
              lines={lines}
              lang={lang}
              module={module}
              rate={rate}
              moodKey={moodKey}
              tone={tone}
              textSize="lg"
            />
            <div className="flex justify-center">
              <CandyButton
                tone="green"
                size="lg"
                onClick={handleStartFollow}
              >
                🎤 {tr('listen.startFollow')}
              </CandyButton>
            </div>
          </motion.div>
        )}

        {/* 步骤 2：跟读 */}
        {step === 'follow' && (
          <motion.div
            key="follow"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* 目标文本展示 */}
            <div className="rounded-2xl bg-candy-pink-soft p-4 text-center">
              <p className="text-xs font-bold text-candy-pink-deep mb-2">📖 {tr('listen.readGoal')}</p>
              <p className="text-xl font-extrabold text-ink leading-relaxed">{text}</p>
            </div>

            {/* 听范读按钮 */}
            <div className="flex justify-center">
              <CandyButton
                tone="purple"
                size="sm"
                variant="soft"
                onClick={handleReplayListen}
              >
                🔊 {tr('listen.replayModel')}
              </CandyButton>
            </div>

            {/* 跟读评测 */}
            <SpeechEvalButton
              targetText={text}
              lang={lang}
              threshold={threshold}
              enableAiAdvice={enableAiAdvice}
              onPass={handlePass}
              onResult={handleResult}
            />
          </motion.div>
        )}

        {/* 步骤 3：结果（SpeechEvalButton 已内联展示结果，这里仅做收尾） */}
        {step === 'result' && lastResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* 结果摘要 */}
            <div className={`rounded-2xl p-4 text-center ${
              lastResult.passed ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-amber-50 border-2 border-amber-200'
            }`}>
              <p className="text-4xl font-extrabold mb-1">
                {lastResult.passed ? '🎉' : '💪'}
              </p>
              <p className={`text-2xl font-extrabold ${lastResult.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                {tr('listen.scorePoints', { score: lastResult.score })}
              </p>
              <p className="text-sm font-bold text-ink-soft mt-1">
                {tr('listen.correctChars', { correct: lastResult.correctCount, total: lastResult.targetCount })}
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <CandyButton tone="pink" size="md" onClick={restart}>
                {tr('common.retryOnce')}
              </CandyButton>
              {lastResult.passed && (
                <CandyButton
                  tone="green"
                  size="md"
                  onClick={handleNextLevel}
                >
                  {tr('common.nextLevel')}
                </CandyButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
