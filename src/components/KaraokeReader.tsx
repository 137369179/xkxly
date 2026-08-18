/**
 * 卡拉OK 朗读器（P0-2 / P2-10 / P2-12）
 * ------------------------------------------------------------
 * 专业级「读一读」组件：逐字高亮 + 逐句高亮 + 进度条 + 重播/跳句控件。
 * 适用于古诗、儿歌、故事、汉字造句等所有朗读场景。
 *
 * 工作原理：
 *   1. buildCharTimeline 把文本拆成逐字时间线（纯估算，双引擎通用）；
 *   2. speakSequence 按句排队朗读，onLine 回调驱动逐句高亮；
 *   3. requestAnimationFrame 驱动逐字高亮（按时间线查表）；
 *   4. 进度条 = 已读句数 / 总句数 + 句内进度；
 *   5. 重播/上一句/下一句按钮操作 speakSequence 控制器。
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { CandyButton, IconButton } from '@/components/ui/Button';
import { speak, stopSpeaking, speakSequence, type SpeakLang } from '@/lib/speech';
import type { SequenceController } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { buildCharTimeline, charIndexAtTime, lineTimeRange, type CharTimeline } from '@/lib/karaoke';
import { splitSentences } from '@/lib/tts/g2p';
import { useTranslation } from '@/i18n/useTranslation';

export interface KaraokeReaderProps {
  /** 朗读文本（整段）；若传 lines 则按句数组处理 */
  text?: string;
  /** 逐句文本数组（优先于 text） */
  lines?: string[];
  /** 语言 */
  lang?: SpeakLang;
  /** 内容模块（影响优先级与语速微调） */
  module?: string;
  /** 语速覆盖（默认随模块） */
  rate?: number;
  /** 诗歌情绪 key（神经引擎情感曲线） */
  moodKey?: string;
  /** 句间停顿（毫秒） */
  gap?: number;
  /** 是否自动开始朗读 */
  autoPlay?: boolean;
  /** 朗读完成回调 */
  onComplete?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 文字大小 */
  textSize?: 'sm' | 'md' | 'lg' | 'xl';
  /** 主题色 */
  tone?: 'purple' | 'pink' | 'green' | 'amber' | 'blue';
}

const TEXT_SIZE = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

const TONE_HIGHLIGHT = {
  purple: 'bg-candy-purple-soft text-candy-purple-deep',
  pink: 'bg-candy-pink-soft text-candy-pink-deep',
  green: 'bg-candy-green-soft text-candy-green-deep',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
};

const TONE_ACTIVE = {
  purple: 'text-candy-purple-deep scale-110',
  pink: 'text-candy-pink-deep scale-110',
  green: 'text-candy-green-deep scale-110',
  amber: 'text-amber-700 scale-110',
  blue: 'text-blue-700 scale-110',
};

export function KaraokeReader({
  text,
  lines,
  lang = 'zh-CN',
  module = 'story',
  rate,
  moodKey,
  gap = 300,
  autoPlay = false,
  onComplete,
  className = '',
  textSize = 'lg',
  tone = 'pink',
}: KaraokeReaderProps) {
  const { t: tr } = useTranslation();
  // 标准化为逐句数组
  const sentenceLines = useMemo(() => {
    if (lines && lines.length) return lines;
    if (text) return splitSentences(text);
    return [];
  }, [text, lines]);

  // 全文（用于时间线）
  const fullText = useMemo(() => sentenceLines.join(''), [sentenceLines]);

  // 实际语速（用于时间线估算）
  const effectiveRate = rate ?? (lang === 'zh-CN' ? 0.78 : 0.82);

  // 逐字时间线
  const timeline: CharTimeline = useMemo(
    () => buildCharTimeline(fullText, effectiveRate, lang),
    [fullText, effectiveRate, lang],
  );

  const [currentLine, setCurrentLine] = useState<number>(-1);
  const [activeCharIdx, setActiveCharIdx] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  const ctrlRef = useRef<SequenceController | null>(null);
  const rafRef = useRef<number | null>(null);
  /** 当前句开始时的 performance.now()，用于驱动逐字高亮 */
  const lineStartRef = useRef(0);

  // 清理
  useEffect(() => {
    return () => {
      ctrlRef.current?.cancel();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stopSpeaking();
    };
  }, []);

  // 逐字高亮动画循环
  const tickHighlight = useCallback(() => {
    if (!isPlaying || currentLine < 0) {
      rafRef.current = requestAnimationFrame(tickHighlight);
      return;
    }
    const elapsed = performance.now() - lineStartRef.current;
    const range = lineTimeRange(timeline, currentLine);
    const idx = charIndexAtTime(timeline, range.startMs + elapsed);
    if (idx >= 0 && idx !== activeCharIdx) {
      setActiveCharIdx(idx);
    }
    rafRef.current = requestAnimationFrame(tickHighlight);
  }, [isPlaying, currentLine, activeCharIdx, timeline]);

  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tickHighlight);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, tickHighlight]);

  /** 播放指定句 */
  const playLine = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= sentenceLines.length) return;
      ctrlRef.current?.cancel();
      stopSpeaking();
      setCurrentLine(idx);
      lineStartRef.current = performance.now();
      setIsPlaying(true);
      void speak(sentenceLines[idx] ?? '', {
        lang,
        rate: effectiveRate,
        module,
        moodKey,
        onEnd: () => {
          setActiveCharIdx(-1);
        },
      });
    },
    [sentenceLines, lang, effectiveRate, module, moodKey],
  );

  /** 播放全部 */
  const playAll = useCallback(() => {
    if (!sentenceLines.length) return;
    ctrlRef.current?.cancel();
    stopSpeaking();

    setIsPlaying(true);
    setCurrentLine(0);
    lineStartRef.current = performance.now();

    ctrlRef.current = speakSequence(
      sentenceLines,
      {
        lang,
        rate: effectiveRate,
        module,
        moodKey,
        gap,
        onLine: (i) => {
          if (i < 0) {
            // 全部结束
            setCurrentLine(-1);
            setActiveCharIdx(-1);
            setIsPlaying(false);
            onComplete?.();
            return;
          }
          setCurrentLine(i);
          lineStartRef.current = performance.now();
          setActiveCharIdx(-1);
        },
      },
    );
  }, [sentenceLines, lang, effectiveRate, module, moodKey, gap, onComplete]);

  /** 停止 */
  const stop = useCallback(() => {
    ctrlRef.current?.cancel();
    stopSpeaking();
    setIsPlaying(false);
    setCurrentLine(-1);
    setActiveCharIdx(-1);
  }, []);

  /** 上一句 */
  const prevLine = useCallback(() => {
    sfxTap();
    if (currentLine > 0) playLine(currentLine - 1);
  }, [currentLine, playLine]);

  /** 下一句 */
  const nextLine = useCallback(() => {
    sfxTap();
    if (currentLine < sentenceLines.length - 1) playLine(currentLine + 1);
  }, [currentLine, sentenceLines.length, playLine]);

  /** 重播当前句 */
  const replayLine = useCallback(() => {
    sfxTap();
    if (currentLine >= 0) playLine(currentLine);
    else if (sentenceLines.length) playLine(0);
  }, [currentLine, sentenceLines.length, playLine]);

  // 自动播放
  useEffect(() => {
    if (autoPlay && sentenceLines.length) {
      playAll();
    }
    // intentional: only trigger when autoPlay flag changes, not when sentenceLines change
  }, [autoPlay]);

  // 计算进度（0..1）
  const progress = sentenceLines.length
    ? currentLine < 0
      ? 0
      : (currentLine + 1) / sentenceLines.length
    : 0;

  // 为每句计算字符在全文中的范围
  const lineCharRanges = useMemo(() => {
    const ranges: { start: number; end: number }[] = [];
    let offset = 0;
    for (const line of sentenceLines) {
      ranges.push({ start: offset, end: offset + line.length });
      offset += line.length;
    }
    return ranges;
  }, [sentenceLines]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 歌词/文本区 */}
      <div className="space-y-2">
        {sentenceLines.map((line, lineIdx) => {
          const isActive = currentLine === lineIdx;
          const isPast = currentLine > lineIdx || (currentLine < 0 && false);
          const range = lineCharRanges[lineIdx] ?? { start: 0, end: 0 };
          return (
            <motion.div
              key={lineIdx}
              animate={{
                scale: isActive ? 1.04 : 1,
                opacity: currentLine < 0 || isActive ? 1 : isPast ? 0.6 : 0.5,
              }}
              transition={{ duration: 0.2 }}
              className={`cursor-pointer rounded-2xl px-4 py-3 transition-all ${
                isActive ? TONE_HIGHLIGHT[tone] : 'bg-white/60'
              }`}
              onClick={() => {
                sfxTap();
                playLine(lineIdx);
              }}
            >
              <p className={`text-center font-bold leading-relaxed ${TEXT_SIZE[textSize]} ${isActive ? '' : 'text-ink-soft'}`}>
                {line.split('').map((ch, charIdx) => {
                  const globalCharIdx = range.start + charIdx;
                  const isCharActive = isActive && globalCharIdx === activeCharIdx;
                  return (
                    <motion.span
                      key={charIdx}
                      animate={isCharActive ? { scale: 1.25 } : { scale: 1 }}
                      transition={{ duration: 0.12 }}
                      className={`inline-block ${isCharActive ? TONE_ACTIVE[tone] + ' font-extrabold' : ''}`}
                    >
                      {ch}
                    </motion.span>
                  );
                })}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* 进度条 */}
      <div className="px-2">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/10">
          <motion.div
            className={`h-full rounded-full ${
              tone === 'purple' ? 'bg-candy-purple' :
              tone === 'pink' ? 'bg-candy-pink' :
              tone === 'green' ? 'bg-candy-green' :
              tone === 'amber' ? 'bg-amber-400' :
              'bg-blue-400'
            }`}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs font-bold text-ink-soft">
          <span>
            {currentLine < 0 ? tr('karaoke.ready') : tr('karaoke.lineN', { current: currentLine + 1, total: sentenceLines.length })}
          </span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
      </div>

      {/* 控制栏 */}
      <div className="flex items-center justify-center gap-3">
        <IconButton
          tone="purple"
          label={tr('karaoke.prev')}
          onClick={prevLine}
          disabled={currentLine <= 0 && currentLine !== -1}
        >
          ⏮
        </IconButton>

        {isPlaying ? (
          <CandyButton tone="pink" size="lg" onClick={stop}>
            ⏹️ {tr('karaoke.stop')}
          </CandyButton>
        ) : (
          <CandyButton tone="pink" size="lg" onClick={playAll}>
            ▶️ {currentLine >= 0 ? tr('karaoke.resume') : tr('karaoke.start')}
          </CandyButton>
        )}

        <IconButton tone="orange" label={tr('karaoke.replay')} onClick={replayLine}>
          🔁
        </IconButton>

        <IconButton
          tone="purple"
          label={tr('karaoke.next')}
          onClick={nextLine}
          disabled={currentLine >= sentenceLines.length - 1}
        >
          ⏭
        </IconButton>
      </div>
    </div>
  );
}
