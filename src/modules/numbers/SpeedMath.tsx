/**
 * 数学口算速算挑战 · 60 秒限时
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';
import { makeMathQuestion, makeMulQuestion, type Difficulty } from '@/lib/questions';
import { sfxTap, sfxWin, sfxWrong } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { addSpeedRecord, SpeedRankings } from './SpeedRankings';
import { cn } from '@/lib/utils';
import type { Question } from '@/types';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/AdaptiveDifficultyHint';
import { useTranslation } from '@/i18n/useTranslation';

const CHALLENGE_SEC = 60;
const GAME_KEY = 'speed_math';


function genQuestion(diff: Difficulty, includeMul: boolean): Question {
  if (includeMul && diff >= 2 && Math.random() < 0.3) {
    return makeMulQuestion(diff);
  }
  return makeMathQuestion(diff);
}

export function SpeedMath() {
  const { t: tr } = useTranslation();
  const practice = useStore(s => s.practice);
  const recordSpeed = useStore(s => s.recordSpeed);
  const recordMath = useStore(s => s.recordMath);
  const setGameBest = useStore(s => s.setGameBest);
  const progress = useStore(s => s.progress);
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);
  const [showRank, setShowRank] = useState(false);
  const [time, setTime] = useState(CHALLENGE_SEC);
  const [diff, setDiff, diffMeta] = useAdaptiveDifficultyState('math');
  const [q, setQ] = useState<Question | null>(null);
  const [ok, setOk] = useState(0);
  const [ng, setNg] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);

  // 最高记录从 store 读取（统一持久化，备份可覆盖）
  const record = progress.gameBest[GAME_KEY] ?? 0;

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 本局锁定的难度。开局时冻结一次，之后整局不再变——限时挑战途中换难度
   * 既不公平（记录没法比）也会打断节奏，所以自适应只在开局那一刻生效。
   */
  const runDiffRef = useRef<Difficulty>(diff);

  const next = useCallback(() => {
    setQ(genQuestion(runDiffRef.current, true));
    setChosen(null);
  }, []);

  const start = () => {
    sfxTap();
    // 开局是安全边界：先让小智把最新建议应用上来，再锁定本局难度
    diffMeta.syncNow();
    runDiffRef.current = diffMeta.auto ? diffMeta.recommended : diff;
    setActive(true);
    setDone(false);
    setOk(0);
    setNg(0);
    setStreak(0);
    setBest(0);
    setTime(CHALLENGE_SEC);
    next();
  };

  useEffect(() => {
    if (!active) return;
    timer.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          clearInterval(timer.current!);
          setActive(false);
          setDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [active]);

  const handle = (opt: string) => {
    if (chosen || !q) return;
    setChosen(opt);
    const correct = opt === q.answerId;
    recordMath(correct, q.skill);
    if (correct) {
      sfxWin();
      setOk(o => o + 1);
      setStreak(s => {
        const ns = s + 1;
        setBest(b => Math.max(b, ns));
        if (ns >= 3) celebrateSmall();
        return ns;
      });
      if (q.skill) practice(q.skill, true, 1, runDiffRef.current);
      recordSpeed(true);
    } else {
      recordSpeed(false);
      sfxWrong();
      setNg(n => n + 1);
      setStreak(0);
      if (q.skill) practice(q.skill, false, 0, runDiffRef.current);
    }
    // next 身份稳定（难度走 runDiffRef），setTimeout 里拿到的永远是本局锁定难度
    advanceRef.current = setTimeout(() => next(), 400);
  };

  // 卸载时清理定时器
  useEffect(() => () => { if (advanceRef.current) clearTimeout(advanceRef.current); }, []);

  // 结束时保存记录到 store（统一持久化，备份可覆盖）
  useEffect(() => {
    if (done && ok > 0) {
      // 用本局锁定的难度记榜，避免结算后自适应改档导致记录难度对不上
      addSpeedRecord('小宝贝', ok, CHALLENGE_SEC - time, runDiffRef.current);
    }
    if (done && ok > record) {
      setGameBest(GAME_KEY, ok);
      celebrateBig();
    }
  }, [done, ok, record, time]);

  if (showRank) {
    return (
      <div className="space-y-5">
        <PageHeader emoji="🏆" title={tr('speedMath.rankTitle')} subtitle={tr('speedMath.rankSubtitle')} tone="orange" />
        <SpeedRankings onClose={() => setShowRank(false)} />
      </div>
    );
  }

  if (!active && !done) {
    return (
      <div className="space-y-5">
        <PageHeader emoji="⚡" title={tr('speedMath.title')} subtitle={tr('speedMath.subtitle')} tone="green" />
        <Panel className="text-center">
          <div className="text-6xl">⚡</div>
          {record > 0 && (
            <p className="mt-2 text-sm font-bold text-candy-orange-deep">{tr('speedMath.bestRecord', { count: record })}</p>
          )}
          <CandyButton tone="orange" variant="soft" size="sm" onClick={() => setShowRank(true)}>{tr('speedMath.rankButton')}</CandyButton>
          <div className="mt-4 mb-4">
            <p className="mb-2 text-sm font-bold text-ink-soft">{tr('speedMath.selectDifficulty')}</p>
            <div className="flex justify-center gap-2">
              {([1, 2, 3] as const).map(d => (
                <CandyButton
                  key={d}
                  tone={diff === d ? 'green' : 'purple'}
                  variant={diff === d ? 'solid' : 'soft'}
                  size="sm"
                  onClick={() => setDiff(d)}
                >
                  {d === 1 ? tr('speedMath.diffEasy') : d === 2 ? tr('speedMath.diffMedium') : tr('speedMath.diffHard')}
                </CandyButton>
              ))}
            </div>
            <AdaptiveDifficultyHint
              meta={diffMeta}
              labels={{ 1: tr('speedMath.diffEasy'), 2: tr('speedMath.diffMedium'), 3: tr('speedMath.diffHard') }}
              className="mt-2 justify-center"
            />
          </div>
          <CandyButton tone="green" size="lg" fullWidth onClick={start}>
            {tr('speedMath.startChallenge')}
          </CandyButton>
        </Panel>
      </div>
    );
  }

  if (done) {
    const total = ok + ng;
    const acc = total > 0 ? Math.round((ok / total) * 100) : 0;
    const isRecord = ok >= record && ok > 0;
    return (
      <div className="space-y-5">
        <PageHeader emoji="⚡" title={tr('speedMath.challengeEnd')} subtitle="" tone="green" />
        <Panel className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-6xl">
            {isRecord ? '🏆' : acc >= 80 ? '🎉' : acc >= 50 ? '💪' : '📚'}
          </motion.div>
          <h3 className="mt-2 text-xl font-extrabold text-ink">
            {isRecord ? tr('speedMath.newRecord') : tr('speedMath.challengeComplete')}
          </h3>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <div className="rounded-2xl bg-candy-green-soft p-3">
              <div className="text-2xl font-black text-candy-green-deep">{ok}</div>
              <div className="text-xs font-bold text-candy-green-deep">{tr('common.correct')}</div>
            </div>
            <div className="rounded-2xl bg-candy-orange-soft p-3">
              <div className="text-2xl font-black text-candy-orange-deep">{ng}</div>
              <div className="text-xs font-bold text-candy-orange-deep">{tr('common.wrong')}</div>
            </div>
            <div className="rounded-2xl bg-candy-purple-soft p-3">
              <div className="text-2xl font-black text-candy-purple-deep">{best}</div>
              <div className="text-xs font-bold text-candy-purple-deep">{tr('common.combo')}</div>
            </div>
            <div className="rounded-2xl bg-candy-blue-soft p-3">
              <div className="text-2xl font-black text-candy-blue-deep">{acc}%</div>
              <div className="text-xs font-bold text-candy-blue-deep">{tr('common.accuracy')}</div>
            </div>
          </div>
          <p className="mt-3 text-sm font-bold text-ink-soft">{tr('speedMath.bestRecord', { count: record })}</p>
          <div className="mt-4">
            <CandyButton tone="green" size="lg" fullWidth onClick={start}>
              {tr('speedMath.tryAgain')}
            </CandyButton>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-candy-green-soft p-3">
        <div className="flex gap-4">
          <div>
            <span className="text-xs font-bold text-candy-green-deep">⏱️ </span>
            <span className="text-2xl font-black text-candy-green-deep">{time}</span>
          </div>
          <div>
            <span className="text-xs font-bold text-candy-green-deep">✅ </span>
            <span className="text-2xl font-black text-candy-green-deep">{ok}</span>
          </div>
          {streak >= 2 && (
            <motion.div key={streak} initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
              <span className="text-xs font-bold text-candy-orange-deep">🔥 </span>
              <span className="text-2xl font-black text-candy-orange-deep">{streak}</span>
            </motion.div>
          )}
        </div>
        <button onClick={() => { if (timer.current) clearInterval(timer.current); setActive(false); setDone(true); }} className="text-xs font-bold text-ink-soft">
          {tr('common.end')}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {q && (
          <motion.div
            key={q.id}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Panel className="text-center">
              <p className="text-sm font-bold text-ink-soft">{q.prompt}</p>
              <p className="my-6 text-5xl font-black text-ink">{q.display}</p>
              <div className="grid grid-cols-2 gap-3">
                {q.options.map(opt => {
                  const isAnswer = opt.id === q.answerId;
                  const isChosen = opt.id === chosen;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handle(opt.id)}
                      disabled={!!chosen}
                      className={cn(
                        'rounded-2xl py-4 text-2xl font-black transition-all active:translate-y-[2px]',
                        chosen
                          ? isAnswer
                            ? 'bg-candy-green-soft text-candy-green-deep scale-105'
                            : isChosen
                              ? 'bg-candy-orange-soft text-candy-orange-deep'
                              : 'bg-gray-100 text-gray-400'
                          : 'bg-candy-purple-soft text-candy-purple-deep hover:scale-105'
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
