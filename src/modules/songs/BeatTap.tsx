/**
 * 节奏打拍游戏
 * ------------------------------------------------------------------
 * 用键盘/触摸跟着歌词节奏打拍。
 * 简化的节奏检测：每句 4 拍，点击节拍点。
 * 打拍准确度评分。纯本地逻辑，不调用 AI。
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxStar, sfxCorrect } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { TONE_STYLE } from '@/lib/tones';
import type { Tone } from '@/lib/tones';
import type { NurseryRhyme } from '@/data/nurseryRhymes';
import { useTranslation } from '@/i18n/useTranslation';

/** 每句拍数 */
const BEATS_PER_LINE = 4;
/** 每拍间隔（毫秒） */
const BEAT_INTERVAL = 600;
/** 完美窗口（毫秒） */
const PERFECT_WINDOW = 150;
/** 良好窗口（毫秒） */
const GOOD_WINDOW = 300;

type HitGrade = 'perfect' | 'good' | 'miss';

interface BeatResult {
  grade: HitGrade;
  /** 与节拍点的偏差毫秒 */
  offset: number;
}

interface LineState {
  lineIdx: number;
  lyric: string;
  beats: number[];
  /** 每拍的结果 */
  results: (BeatResult | null)[];
  done: boolean;
}

interface BeatTapProps {
  rhyme: NurseryRhyme;
  tone: Tone;
}

export function BeatTap({ rhyme, tone }: BeatTapProps) {
  const { t: tr } = useTranslation();
  const toneStyle = TONE_STYLE[tone]!;

  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [lines, setLines] = useState<LineState[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [lastGrade, setLastGrade] = useState<HitGrade | null>(null);

  const beatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineStartRef = useRef<number>(0);
  const beatStartRef = useRef<number[]>([]);

  // 初始化歌词行
  const initLines = useCallback(() => {
    const newLines: LineState[] = rhyme.lyrics.map((lyric, idx) => ({
      lineIdx: idx,
      lyric,
      beats: Array.from({ length: BEATS_PER_LINE }, (_, i) => i),
      results: Array(BEATS_PER_LINE).fill(null),
      done: false,
    }));
    setLines(newLines);
    setCurrentLineIdx(0);
    setCurrentBeat(0);
    setTotalScore(0);
    setLastGrade(null);
  }, [rhyme]);

  // 开始游戏
  const startGame = () => {
    sfxTap();
    initLines();
    setPhase('playing');
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (beatTimerRef.current) {
        clearTimeout(beatTimerRef.current);
      }
    };
  }, []);

  // 游戏逻辑：推进节拍
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    if (phase !== 'playing') return undefined;
    if (currentLineIdx >= rhyme.lyrics.length) {
      setPhase('done');
      celebrateBig();
      return undefined;
    }

    // 设置当前行的节拍起点
    if (currentBeat === 0) {
      lineStartRef.current = Date.now();
      beatStartRef.current = Array.from({ length: BEATS_PER_LINE }, (_, i) =>
        lineStartRef.current + i * BEAT_INTERVAL,
      );
    }
    // 如果当前行所有拍都打完，进入下一行
    const currentLine = lines[currentLineIdx];
    if (currentLine && currentBeat >= BEATS_PER_LINE) {
      // 等一小会再进入下一行
      const timer = setTimeout(() => {
        setLines((prev) => {
          const next = [...prev];
          if (next[currentLineIdx]) {
            next[currentLineIdx] = { ...next[currentLineIdx]!, done: true };
          }
          return next;
        });
        setCurrentLineIdx((idx) => idx + 1);
        setCurrentBeat(0);
      }, 400);
      cleanup = () => {
        clearTimeout(timer);
        if (beatTimerRef.current) {
          clearTimeout(beatTimerRef.current);
          beatTimerRef.current = null;
        }
      };
    } else if (currentBeat < BEATS_PER_LINE) {
      // 自动推进节拍（如果孩子没点）
      const nextBeatTime = beatStartRef.current[currentBeat + 1] ?? (lineStartRef.current + (currentBeat + 1) * BEAT_INTERVAL);
      const delay = nextBeatTime - Date.now();
      if (delay > 0) {
        const timer = setTimeout(() => {
          // 超时未点击 -> miss
          setLines((prev) => {
            const next = [...prev];
            if (next[currentLineIdx]) {
              const line = next[currentLineIdx]!;
              if (!line.results[currentBeat]) {
                line.results = [...line.results];
                line.results[currentBeat] = { grade: 'miss', offset: BEAT_INTERVAL };
              }
            }
            return next;
          });
          setLastGrade('miss');
          setCurrentBeat((b) => b + 1);
        }, delay + GOOD_WINDOW);
        beatTimerRef.current = timer;
        cleanup = () => {
          if (beatTimerRef.current) {
            clearTimeout(beatTimerRef.current);
            beatTimerRef.current = null;
          }
        };
      }
    }
    return cleanup ?? undefined;
  }, [phase, currentLineIdx, currentBeat, lines, rhyme.lyrics.length]);

  // 孩子点击打拍
  const handleTap = () => {
    if (phase !== 'playing') return;
    const now = Date.now();
    const targetTime = beatStartRef.current[currentBeat];
    if (targetTime === undefined) return;

    const offset = now - targetTime;
    const absOffset = Math.abs(offset);

    let grade: HitGrade;
    if (absOffset <= PERFECT_WINDOW) {
      grade = 'perfect';
      sfxCorrect();
    } else if (absOffset <= GOOD_WINDOW) {
      grade = 'good';
      sfxTap();
    } else {
      grade = 'miss';
    }

    setLastGrade(grade);

    // 更新结果
    setLines((prev) => {
      const next = [...prev];
      if (next[currentLineIdx]) {
        const line = next[currentLineIdx]!;
        line.results = [...line.results];
        line.results[currentBeat] = { grade, offset };
      }
      return next;
    });

    // 更新分数
    const points = grade === 'perfect' ? 10 : grade === 'good' ? 5 : 0;
    setTotalScore((s) => s + points);
    if (grade === 'perfect') {
      sfxStar();
      celebrateSmall();
    }

    // 清除自动推进定时器
    if (beatTimerRef.current) {
      clearTimeout(beatTimerRef.current);
      beatTimerRef.current = null;
    }

    setCurrentBeat((b) => b + 1);
  };

  // 重新开始
  const restart = () => {
    sfxTap();
    if (beatTimerRef.current) {
      clearTimeout(beatTimerRef.current);
      beatTimerRef.current = null;
    }
    initLines();
    setPhase('playing');
  };

  // 准备阶段
  if (phase === 'ready') {
    return (
      <div className="space-y-4">
        <PanelTitle emoji="🥁" title={tr('beatTap.title')} tone={tone} />
        <Panel className="text-center space-y-4">
          <div className="text-5xl">🥁</div>
          <p className="text-lg font-black text-ink">
            {tr('beatTap.readyTip', { title: rhyme.title })}
          </p>
          <p className="text-sm font-bold text-ink-soft">
            {tr('beatTap.beatHint', { beats: String(BEATS_PER_LINE) })}
          </p>
          <div className="flex justify-center gap-4">
            <div className="rounded-xl bg-white/70 px-3 py-2 text-xs font-bold">
              <span style={{ color: TONE_STYLE.green.deep }}>{tr('beatTap.perfect', { ms: String(PERFECT_WINDOW) })}</span>
              <br />
              <span style={{ color: TONE_STYLE.yellow.deep }}>{tr('beatTap.good', { ms: String(GOOD_WINDOW) })}</span>
            </div>
          </div>
          <CandyButton tone={tone} size="lg" onClick={startGame}>
            {tr('beatTap.start')}
          </CandyButton>
        </Panel>
      </div>
    );
  }

  // 结束阶段
  if (phase === 'done') {
    const totalBeats = rhyme.lyrics.length * BEATS_PER_LINE;
    const maxScore = totalBeats * 10;
    const accuracy = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const stars = accuracy >= 80 ? 3 : accuracy >= 60 ? 2 : accuracy >= 40 ? 1 : 0;

    return (
      <div className="space-y-4">
        <PanelTitle emoji="🥁" title={tr('beatTap.title')} tone={tone} />
        <Panel className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-6xl"
          >
            {stars >= 3 ? '🏆' : stars >= 2 ? '🥈' : stars >= 1 ? '🥉' : '💪'}
          </motion.div>
          <div className="text-2xl font-black" style={{ color: toneStyle.deep }}>
            {tr('beatTap.score', { score: String(totalScore) })}
          </div>
          <div className="text-lg font-bold text-ink-soft">
            {tr('beatTap.accuracy', { percent: String(accuracy) })}
          </div>
          <div className="flex justify-center gap-1 text-3xl">
            {Array.from({ length: 3 }, (_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.2 }}
              >
                {i < stars ? '⭐' : '☆'}
              </motion.span>
            ))}
          </div>
          <p className="text-sm font-bold text-ink-soft">
            {stars >= 3 ? tr('beatTap.praise3') :
             stars >= 2 ? tr('beatTap.praise2') :
             stars >= 1 ? tr('beatTap.praise1') :
             tr('beatTap.praise0')}
          </p>
          <CandyButton tone={tone} size="md" onClick={restart}>
            {tr('beatTap.again')}
          </CandyButton>
        </Panel>
      </div>
    );
  }

  // 游戏中
  const currentLine = lines[currentLineIdx];
  return (
    <div className="space-y-4">
      <PanelTitle emoji="🥁" title={tr('beatTap.title')} tone={tone} />

      {/* 得分和进度 */}
      <div className="flex items-center justify-center gap-4">
        <div className="rounded-full bg-white/70 px-4 py-1.5 text-sm font-extrabold" style={{ color: toneStyle.deep }}>
          {tr('beatTap.scoreShort', { score: String(totalScore) })}
        </div>
        <div className="rounded-full bg-white/70 px-4 py-1.5 text-sm font-bold text-ink-soft">
          {tr('beatTap.lineProgress', {
            current: String(Math.min(currentLineIdx + 1, rhyme.lyrics.length)),
            total: String(rhyme.lyrics.length),
          })}
        </div>
      </div>

      {/* 歌词显示 */}
      <Panel>
        {/* 已完成行 */}
        <div className="space-y-2">
          {lines.slice(0, currentLineIdx).map((line) => (
            <div
              key={line.lineIdx}
              className="flex items-center gap-2 rounded-xl bg-white/50 p-2"
            >
              <span className="text-sm font-bold text-ink-soft flex-1">{line.lyric}</span>
              <div className="flex gap-1">
                {line.results.map((r, i) => (
                  <span key={i} className="text-base">
                    {r?.grade === 'perfect' ? '🟢' : r?.grade === 'good' ? '🟡' : '🔴'}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* 当前行 */}
          {currentLine && (
            <motion.div
              key={currentLineIdx}
              initial={{ scale: 0.95, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl p-4"
              style={{ background: toneStyle.soft }}
            >
              <p className="mb-3 text-center text-lg font-black" style={{ color: toneStyle.deep }}>
                {currentLine.lyric}
              </p>
              {/* 节拍点 */}
              <div className="flex justify-center gap-4">
                {Array.from({ length: BEATS_PER_LINE }, (_, i) => {
                  const isCurrent = i === currentBeat;
                  const result = currentLine.results[i];
                  const isPast = result !== null;

                  return (
                    <motion.div
                      key={i}
                      animate={{
                        scale: isCurrent ? [1, 1.3, 1] : 1,
                        backgroundColor: isCurrent ? toneStyle.main : isPast
                          ? (result?.grade === 'perfect' ? '#5FD68B' : result?.grade === 'good' ? '#FFC93C' : '#FF6B6B')
                          : 'rgba(255,255,255,0.6)',
                      }}
                      transition={{
                        scale: { repeat: Infinity, duration: 0.6 },
                      }}
                      className="grid h-14 w-14 place-items-center rounded-full text-xl font-black"
                      style={{
                        color: isCurrent ? '#FFFFFF' : isPast ? '#FFFFFF' : toneStyle.deep,
                        border: `3px solid ${isCurrent ? toneStyle.deep : 'transparent'}`,
                      }}
                    >
                      {isPast
                        ? (result?.grade === 'perfect' ? '✓' : result?.grade === 'good' ? '✓' : '✗')
                        : i + 1}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* 未开始行 */}
          {lines.slice(currentLineIdx + 1).map((line) => (
            <div
              key={line.lineIdx}
              className="rounded-xl bg-white/30 p-2"
            >
              <span className="text-sm font-bold text-ink-soft/50">{line.lyric}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* 打拍按钮 */}
      <div className="text-center">
        <motion.button
          onClick={handleTap}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          className="mx-auto grid h-24 w-24 place-items-center rounded-full text-2xl font-black text-white shadow-candy-lg active:translate-y-1"
          style={{ background: toneStyle.main, border: `4px solid ${toneStyle.deep}` }}
        >
          🥁
          <br />
          {tr('beatTap.tap')}
        </motion.button>
      </div>

      {/* 上次打拍结果 */}
      <AnimatePresence>
        {lastGrade && (
          <motion.div
            key={`${currentLineIdx}-${currentBeat}-${lastGrade}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <span
              className="text-lg font-black"
              style={{
                color:
                  lastGrade === 'perfect' ? TONE_STYLE.green.deep :
                  lastGrade === 'good' ? TONE_STYLE.yellow.deep :
                  '#FF6B6B',
              }}
            >
              {lastGrade === 'perfect' ? tr('beatTap.perfectHit') :
               lastGrade === 'good' ? tr('beatTap.goodHit') :
               tr('beatTap.missHit')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
