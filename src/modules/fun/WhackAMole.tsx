/**
 * 打地鼠迷你游戏
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig, celebrateSmall } from '@/lib/celebrate';
import { motion, AnimatePresence } from 'motion/react';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';

const HOLE_COUNT = 9;
const GAME_TIME = 30; // 秒
/** 每击中一只地鼠换算的星星数（满分约 30 击 → 15 星，激励但不失控） */
const STARS_PER_HIT = 0.5;

export function WhackAMole() {
  const { t: tr } = useTranslation();
  const addStars = useStore((s) => s.addStars);
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [miss, setMiss] = useState(0);
  const [time, setTime] = useState(GAME_TIME);
  const [moleIdx, setMoleIdx] = useState<number | null>(null);
  const [bombIdx, setBombIdx] = useState<number | null>(null);
  const [showResult, setShowResult] = useState<number | null>(null); // idx => 1=hit 0=miss -1=bomb
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);
  const bestRef = useRef(parseInt(safeGetItem('whack-best') || '0'));

  const spawn = useCallback(() => {
    // 10% 概率出炸弹
    const isBomb = Math.random() < 0.1;
    const idx = Math.floor(Math.random() * HOLE_COUNT);
    if (isBomb) {
      setBombIdx(idx);
      setMoleIdx(null);
    } else {
      setMoleIdx(idx);
      setBombIdx(null);
    }
    // 自动消失
    spawnRef.current = setTimeout(() => {
      setMoleIdx(null);
      setBombIdx(null);
    }, 800 + Math.random() * 400);
  }, []);

  const start = useCallback(() => {
    sfxTap();
    triggerHaptic(30);
    setActive(true);
    setDone(false);
    setScore(0);
    setMiss(0);
    setTime(GAME_TIME);
    spawn();
  }, [spawn]);

  const whack = useCallback((idx: number) => {
    if (idx === moleIdx) {
      sfxCorrect();
      triggerHaptic(45);
      setScore((s) => s + 1);
      setShowResult(idx);
      setTimeout(() => setShowResult(null), 300);
      clearTimeout(spawnRef.current!);
      setMoleIdx(null);
    } else if (idx === bombIdx) {
      sfxWrong();
      triggerHaptic([60, 40, 60]);
      setScore((s) => Math.max(0, s - 2));
      setShowResult(idx);
      setTimeout(() => setShowResult(null), 500);
      clearTimeout(spawnRef.current!);
      setBombIdx(null);
    } else {
      sfxTap();
      triggerHaptic(15);
      setMiss((m) => m + 1);
    }
  }, [moleIdx, bombIdx]);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (active && !done) {
          e.preventDefault();
          whack(idx);
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (!active || done) {
          e.preventDefault();
          start();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, done, whack, start]);

  // Timer
  useEffect(() => {
    if (!active) return;
    timerRef.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setActive(false);
          setDone(true);
          setMoleIdx(null);
          setBombIdx(null);
          if (score + 1 > bestRef.current) {
            bestRef.current = score + 1;
            safeSetItem('whack-best', String(score + 1));
            celebrateBig();
            sfxWin();
            triggerHaptic([60, 40, 60, 40, 100]);
          } else {
            celebrateSmall();
          }
          // 分数 → 全局星星入账
          if (score > 0) {
            addStars(Math.max(1, Math.round(score * STARS_PER_HIT)));
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      clearInterval(timerRef.current!);
    };
  }, [active, score, addStars]);

  // Spawn moles
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      spawn();
    }, 600);
    return () => {
      clearInterval(interval);
      clearTimeout(spawnRef.current!);
    };
  }, [active, spawn]);

  return (
    <div className="space-y-4">
      <PageHeader emoji="🔨" title={tr('whackAMole.title')} subtitle={tr('whackAMole.subtitle')} tone="orange" />

      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-amber-900 font-bold bg-amber-50/90 px-3 py-1 rounded-xl border border-amber-200">
          ⌨️ 键盘快捷操作：数字键 1-9 打击 9 个地洞 · 空格键 开始游戏 / 再玩一次
        </span>
      </div>

      {!active && !done && (
        <Panel className="text-center">
          <div className="text-6xl">🐹</div>
          <p className="mt-2 text-sm font-extrabold text-ink-soft">
            {tr('whackAMole.intro', { time: String(GAME_TIME) })}
          </p>
          {bestRef.current > 0 && (
            <p className="text-xs font-bold text-candy-orange-deep">{tr('whackAMole.best', { count: String(bestRef.current) })}</p>
          )}
          <CandyButton tone="orange" size="sm" onClick={start} className="mt-3">
            {tr('whackAMole.start')}
          </CandyButton>
        </Panel>
      )}

      {(active || done) && (
        <>
          {/* 记分板 */}
          <div className="flex justify-center gap-4 rounded-xl bg-candy-orange-soft p-3">
            <div className="text-center">
              <div className="text-xs font-bold text-ink-soft">⏱️</div>
              <div className="text-xl font-black text-candy-orange-deep">{time}s</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-ink-soft">✅</div>
              <div className="text-xl font-black text-candy-green-deep">{score}</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-ink-soft">❌</div>
              <div className="text-xl font-black text-candy-pink-deep">{miss}</div>
            </div>
          </div>

          {/* 地鼠格子 */}
          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
            {Array.from({ length: HOLE_COUNT }).map((_, i) => {
              const isMole = moleIdx === i;
              const isBomb = bombIdx === i;
              const result = showResult === i;

              return (
                <motion.button
                  key={`_-${i}`}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => whack(i)}
                  disabled={done}
                  className={`relative flex h-20 items-center justify-center rounded-2xl text-3xl transition-all ${
                    result
                      ? isMole && showResult === i
                        ? 'bg-candy-green-deep'
                        : 'bg-candy-pink-deep'
                      : isMole
                        ? 'bg-candy-green-soft scale-105 shadow-lg'
                        : isBomb
                          ? 'bg-candy-pink-soft scale-105 shadow-lg'
                          : 'bg-white'
                  }`}
                >
                  {/* 洞口装饰 */}
                  <div className="absolute bottom-0 h-4 w-full rounded-b-xl bg-candy-brown-soft opacity-50" />

                  {/* 地鼠或炸弹 */}
                  <AnimatePresence>
                    {isMole && (
                      <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        className="z-10"
                      >
                        {result ? '💫' : '🐹'}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isBomb && (
                      <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1, rotate: [0, -10, 10, 0] }}
                        exit={{ y: 40, opacity: 0 }}
                        className="z-10"
                      >
                        {result ? '💥' : '💣'}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          <p className="text-center text-xs font-bold text-ink-soft">
            {tr('whackAMole.ruleHint')}
          </p>

          {done && (
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
              <Panel className="text-center">
                <div className="text-4xl">🎉</div>
                <h3 className="mt-1 text-lg font-black text-ink">
                  {tr('whackAMole.hitCount', { count: String(score) })}
                </h3>
                <p className="text-xs font-bold text-ink-soft">
                  {tr('whackAMole.missCount', { count: String(miss) })}
                </p>
                {score > 0 && (
                  <p className="mt-1 text-sm font-extrabold text-candy-orange-deep">
                    ⭐ 收获 {Math.max(1, Math.round(score * STARS_PER_HIT))} 颗星星！
                  </p>
                )}
                <CandyButton tone="orange" size="sm" onClick={start} className="mt-3">
                  {tr('whackAMole.again')}
                </CandyButton>
              </Panel>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
