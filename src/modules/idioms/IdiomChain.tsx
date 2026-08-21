/**
 * 成语接龙游戏
 * 前一个成语尾字 = 下一个首字
 * 含 AI 智能提示：卡住时给线索，不直接给答案
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { answerCorrect, answerWrong } from '@/lib/feedback';
import { StreakBar } from '@/components/study/StreakBar';
import { randomPraise, randomEncourage } from '@/lib/speech';
import { IDIOMS } from '@/data/idioms';
import { shuffle } from '@/lib/utils';
import { useAiTask } from '@/lib/ai/useAi';
import { idiomHintTask, type IdiomHintData } from '@/lib/ai/tasks/idiom';
import { TONE_STYLE } from '@/lib/tones';
import { useTranslation } from '@/i18n/useTranslation';


interface ChainEntry {
  idiom: string;
  fromUser: boolean;
}

function lastChar(s: string): string {
  const chars = [...s];
  return chars[chars.length - 1]!;
}

function firstChar(s: string): string {
  return [...s][0]!;
}

function findChainOptions(lastCharOfPrev: string): typeof IDIOMS {
  return IDIOMS.filter(i => firstChar(i.word) === lastCharOfPrev);
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = shuffle(arr);
  return shuffled.slice(0, n);
}

const TIME_LIMIT = 15;
const GAME_KEY = 'idiom_chain';
const MAX_HINTS = 3;


export function IdiomChain() {
  const { t: tr } = useTranslation();
  const [chain, setChain] = useState<ChainEntry[]>([]);
  const [options, setOptions] = useState<typeof IDIOMS>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  // 连对闯关：连续答对点亮里程碑（目标 3），答错/跳过归零温和引导
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'over'>('idle');
  const [hintsLeft, setHintsLeft] = useState(MAX_HINTS);
  const [showHint, setShowHint] = useState(false);
  const progress = useStore(s => s.progress);
  const setGameBest = useStore(s => s.setGameBest);
  const bestScore = progress.gameBest[GAME_KEY] ?? 0;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const practice = useStore(s => s.practice);

  // AI 提示任务
  const hintState = useAiTask<IdiomHintData>(
    () => {
      const lastEntry = chain[chain.length - 1];
      const lastCh = lastEntry ? lastChar(lastEntry.idiom) : '?';
      const usedIdioms = chain.map(c => c.idiom);
      return idiomHintTask(lastCh, usedIdioms);
    },
    false,
  );

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const start = () => {
    sfxTap();
    const first = IDIOMS[Math.floor(Math.random() * IDIOMS.length)]!
    setChain([{ idiom: first.word, fromUser: false }]);
    setScore(0);
    setCombo(0);
    setStreak(0);
    setTimeLeft(TIME_LIMIT);
    setHintsLeft(MAX_HINTS);
    setShowHint(false);
    setPhase('playing');
    generateOptions(lastChar(first.word));
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stopTimer();
          setPhase('over');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => () => stopTimer(), []);

  const generateOptions = (lastCh: string) => {
    const matches = findChainOptions(lastCh);
    if (matches.length === 0) {
      // 没有匹配的：放宽规则，自动跳过当前尾字，用下一个可接龙的成语
      const fallback = IDIOMS[Math.floor(Math.random() * IDIOMS.length)]!
      setChain(prev => [...prev, { idiom: fallback.word, fromUser: false }]);
      generateOptions(lastChar(fallback.word));
      return;
    }
    const correct = pickRandom(matches, Math.min(matches.length, 4));
    // 确保至少4个选项，且保证至少 1 个正确选项
    if (correct.length < 4) {
      const wrong = pickRandom(IDIOMS.filter(i => !correct.includes(i)), 4 - correct.length);
      setOptions(shuffle([...correct, ...wrong]));
    } else {
      setOptions(correct);
    }
  };

  const handlePick = (idiomStr: string) => {
    if (phase !== 'playing') return;
    sfxTap();
    const prevLast = lastChar(chain[chain.length - 1]!.idiom);
    const isCorrect = firstChar(idiomStr) === prevLast;

    if (isCorrect) {
      sfxCorrect();
      celebrateSmall();
      randomPraise();
      const newScore = score + 10 + combo * 2;
      setScore(newScore);
      setCombo(c => c + 1);
      setStreak(s => s + 1);
      setChain(prev => [...prev, { idiom: idiomStr, fromUser: true }]);
      practice('idiom:chain', true, 0);
      // 即时反馈：3 连对连击表扬，否则成语场景表扬
      if (combo + 1 >= 3) answerCorrect('combo');
      else answerCorrect('idiom');
      // 重置计时
      setTimeLeft(TIME_LIMIT);
      // 隐藏提示
      setShowHint(false);
      // 生成新选项
      generateOptions(lastChar(idiomStr));
    } else {
      sfxWrong();
      randomEncourage();
      setCombo(0);
      setStreak(0);
      practice('idiom:chain', false, 0);
      answerWrong('idiom');
      // 不结束，扣时间
      setTimeLeft(t => Math.max(0, t - 3));
    }
  };

  const handleSkip = () => {
    sfxTap();
    setCombo(0);
    setStreak(0);
    setTimeLeft(t => Math.max(0, t - 2));
    const prevLast = lastChar(chain[chain.length - 1]!.idiom);
    generateOptions(prevLast);
    setShowHint(false);
  };

  const handleHint = () => {
    if (hintsLeft <= 0) return;
    sfxTap();
    setHintsLeft(h => h - 1);
    setShowHint(true);
    hintState.run();
  };

  // 游戏结束时记录最高分（副作用移入 effect，避免 render 阶段写 store）
  useEffect(() => {
    if (phase === 'over' && score > 0 && score > bestScore) {
      setGameBest(GAME_KEY, score);
    }
  }, [phase, score, bestScore, setGameBest]);

  if (phase === 'idle') {
    return (
      <div className="space-y-4">
        <PageHeader emoji="🐉" title={tr('idiom.chainTitle')} subtitle={tr('idiom.chainSubtitle')} tone="purple" />
        <Panel className="text-center">
          <div className="text-6xl">🐉</div>
          <p className="mt-3 text-base font-bold text-ink">
            {tr('idiom.chainIntro')}
          </p>
          <p className="mt-1 text-sm font-bold text-ink-soft">
            {tr('idiom.chainRules')}
          </p>
          <p className="mt-1 text-sm font-bold text-ink-soft">
            🤖 {tr('idiom.chainAiHint', { count: MAX_HINTS })}
          </p>
          {bestScore > 0 && (
            <p className="mt-2 text-sm font-extrabold text-candy-orange-deep">🏆 {tr('idiom.bestScore', { score: bestScore })}</p>
          )}
          <CandyButton tone="purple" size="lg" fullWidth className="mt-4" onClick={start}>
            🚀 {tr('idiom.startChain')}
          </CandyButton>
        </Panel>
      </div>
    );
  }

  if (phase === 'over') {
    const isNewBest = score > 0 && score >= bestScore;
    return (
      <div className="space-y-4">
        <Panel className="text-center">
          <div className="text-6xl">{isNewBest ? '🏆' : '🎉'}</div>
          <p className="mt-3 text-xl font-extrabold text-ink">{tr('idiom.gameOver')}</p>
          <p className="mt-1 text-3xl font-black text-candy-purple-deep">{tr('idiom.scorePoints', { score })}</p>
          <p className="mt-1 text-sm font-bold text-ink-soft">
            {tr('idiom.chainedCount', { count: chain.filter(c => c.fromUser).length })}
            {isNewBest && <span className="text-candy-orange-deep"> · 🎉 新纪录！</span>}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <CandyButton tone="purple" size="sm" onClick={start}>🔄 再来</CandyButton>
          </div>
        </Panel>
      </div>
    );
  }

  // Playing
  const lastEntry = chain[chain.length - 1]!
  const lastCh = lastChar(lastEntry.idiom);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-lg font-extrabold text-ink">🏆 {score} 分</span>
        {combo >= 2 && <span className="text-sm font-extrabold text-candy-orange-deep">🔥 连击 x{combo}</span>}
        <span className={`text-lg font-extrabold tabular-nums ${timeLeft <= 5 ? 'text-candy-red-deep' : 'text-ink'}`}>
          ⏱️ {timeLeft}s
        </span>
      </div>

      {/* 闯关里程碑：连续答对点亮，形成"再对几题就通关"目标感 */}
      <StreakBar streak={streak} target={3} tone="purple" />

      {/* 接龙历史 */}
      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          {chain.slice(-5).map((entry, i) => {
            return (
              <div key={`entry-${i}`} className="flex items-center gap-2">
                {i > 0 && <span className="text-candy-purple-deep">→</span>}
                <span
                  className={`rounded-xl px-3 py-1.5 text-base font-extrabold ${
                    entry.fromUser
                      ? 'bg-candy-green-soft text-candy-green-deep'
                      : 'bg-candy-purple-soft text-candy-purple-deep'
                  }`}
                >
                  {entry.idiom}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-center text-sm font-bold text-ink-soft">
          {tr('idiom.findWith')}<span className="text-xl font-black text-candy-purple-deep">{lastCh}</span>{tr('idiom.startingIdiom')}
        </div>
      </Panel>

      {/* AI 提示面板 */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-[1.4rem] border-2 p-4"
              style={{ background: TONE_STYLE.yellow.soft, borderColor: `${TONE_STYLE.yellow.main}55` }}
            >
              <header className="mb-2 flex items-center gap-2.5">
                <span className="text-2xl">💡</span>
                <span className="text-base font-extrabold" style={{ color: TONE_STYLE.yellow.deep }}>
                  AI 小提示
                </span>
                <span className="ml-auto text-xs font-bold text-ink-soft">
                  剩余 {hintsLeft} 次
                </span>
              </header>

              {hintState.loading && (
                <div className="flex items-center gap-2 py-2">
                  <motion.span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: TONE_STYLE.yellow.main }}
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                  <span className="text-base text-ink-soft">小智正在想提示…</span>
                </div>
              )}

              {!hintState.loading && hintState.result && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{hintState.result.data.emoji}</span>
                    <div>
                      <p className="text-lg font-black text-ink">
                        {tr('idiom.firstChar')}<span className="text-candy-purple-deep">{hintState.result.data.char}</span>
                      </p>
                      <p className="text-sm font-bold text-ink-soft">
                        {tr('idiom.pinyin')}：{hintState.result.data.pinyin}
                      </p>
                    </div>
                  </div>
                  <p className="rounded-xl bg-white/60 p-2 text-base font-medium" style={{ color: '#3B3355' }}>
                    💭 {hintState.result.data.clue}
                  </p>
                  {hintState.result.fallback && (
                    <p className="text-xs text-ink-soft">{tr('idiom.offlineHint')}</p>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 选项 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt, i) => (
          <button
            key={`opt-${i}`}
            onClick={() => handlePick(opt.word)}
            className="rounded-2xl border-4 border-candy-purple-soft bg-white p-3 text-center text-lg font-extrabold text-ink transition-all active:translate-y-[1px] hover:bg-candy-purple-soft"
          >
            {opt.word}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        <CandyButton tone="orange" variant="soft" size="sm" onClick={handleSkip}>
          ⏭️ {tr('idiom.skip')} (-2s)
        </CandyButton>
        <CandyButton
          tone="yellow"
          variant={hintsLeft > 0 ? 'solid' : 'soft'}
          size="sm"
          onClick={handleHint}
        >
          💡 {tr('idiom.aiHint')} ({hintsLeft})
        </CandyButton>
      </div>
    </div>
  );
}
