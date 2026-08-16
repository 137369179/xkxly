/**
 * 🎈 听音戳气球小游戏 (LetterPopGame) · 大厂级动效与触觉反馈版
 * ------------------------------------------------------------
 * 核心特性：
 * 1. 纯正离线美音播报目标字母与例词，支持一键重听；
 * 2. 真实气球漂浮浮动动画与受力摇晃；
 * 3. 戳中正确气球产生粒子爆破 (Particle Burst) 与彩花奖励；
 * 4. 连击 Combo 浮动气泡与阶梯式鼓励反馈；
 * 5. 移动端 Haptic 触觉轻微震动反馈。
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LETTERS, type LetterItem } from '@/data/letters';
import { sampleMany, shuffle, randInt } from '@/lib/utils';
import { playLetterVoice, playWordVoice, speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin, sfxStar } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StarRating } from '@/components/ui/Stars';

interface Balloon {
  id: string;
  letter: LetterItem;
  color: string;
  particleColor: string;
  xPercent: number; // 10% - 85%
  speed: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

const BALLOON_PRESETS = [
  {
    bg: 'from-rose-400 to-red-500 shadow-rose-200',
    particle: '#f43f5e',
  },
  {
    bg: 'from-sky-400 to-blue-500 shadow-sky-200',
    particle: '#0ea5e9',
  },
  {
    bg: 'from-amber-400 to-orange-500 shadow-amber-200',
    particle: '#f59e0b',
  },
  {
    bg: 'from-emerald-400 to-green-500 shadow-emerald-200',
    particle: '#10b981',
  },
  {
    bg: 'from-purple-400 to-indigo-500 shadow-purple-200',
    particle: '#a855f7',
  },
  {
    bg: 'from-pink-400 to-rose-400 shadow-pink-200',
    particle: '#ec4899',
  },
];

const ROUNDS_PER_GAME = 6;

/** 触发轻微触觉反馈 */
function triggerHaptic(type: 'tap' | 'success' | 'error' = 'tap') {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      if (type === 'tap') navigator.vibrate(10);
      else if (type === 'success') navigator.vibrate([15, 40, 20]);
      else if (type === 'error') navigator.vibrate([30, 30]);
    } catch {
      /* noop */
    }
  }
}

export function LetterPopGame() {
  const practice = useStore((s) => s.practice);
  const addStars = useStore((s) => s.addStars);

  const [currentRound, setCurrentRound] = useState(1);
  const [target, setTarget] = useState<LetterItem | null>(null);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [showComboPill, setShowComboPill] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const [wobbleId, setWobbleId] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const lockRef = useRef(false);

  // 播放标准目标发音
  const speakTarget = useCallback(async (item: LetterItem) => {
    try {
      await playLetterVoice(item.upper);
      await playWordVoice(item.upper);
    } catch {
      await speak(`${item.upper}! ${item.word}!`, { lang: 'en-US', rate: 0.8, module: 'letter' });
    }
  }, []);

  // 生成粒子爆炸效果
  const spawnBurstParticles = (color: string) => {
    const newParticles: Particle[] = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const velocity = 60 + Math.random() * 60;
      newParticles.push({
        id: Math.random(),
        x: 0,
        y: 0,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color,
        size: 6 + Math.random() * 6,
      });
    }
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 700);
  };

  // 生成下一题
  const nextTarget = useCallback(() => {
    lockRef.current = false;
    setPoppedId(null);
    setWobbleId(null);
    const pool = sampleMany(LETTERS, 4);
    const chosen = pool[randInt(0, pool.length - 1)]!;
    setTarget(chosen);

    const generated: Balloon[] = pool.map((l, i) => {
      const preset = BALLOON_PRESETS[i % BALLOON_PRESETS.length]!;
      return {
        id: `b-${l.upper}-${Date.now()}-${i}`,
        letter: l,
        color: preset.bg,
        particleColor: preset.particle,
        xPercent: 10 + i * 23 + randInt(-2, 2),
        speed: 1.6 + Math.random() * 0.6,
      };
    });

    setBalloons(shuffle(generated));
    void speakTarget(chosen);
  }, [speakTarget]);

  // 初始化游戏
  const startNewGame = useCallback(() => {
    setCurrentRound(1);
    setScore(0);
    setCombo(0);
    setShowComboPill(false);
    setIsGameOver(false);
    nextTarget();
  }, [nextTarget]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // 点击气球
  const handlePop = (balloon: Balloon) => {
    if (lockRef.current || !target || isGameOver) return;

    if (balloon.letter.upper === target.upper) {
      // 🎯 戳中正确气球
      lockRef.current = true;
      setPoppedId(balloon.id);
      triggerHaptic('success');
      sfxCorrect();
      celebrateSmall();
      spawnBurstParticles(balloon.particleColor);

      practice(`letter:${target.upper}`, true, 1, 1);
      setScore((s) => s + 1);
      const nextCombo = combo + 1;
      setCombo(nextCombo);

      if (nextCombo >= 2) {
        setShowComboPill(true);
        sfxStar();
        setTimeout(() => setShowComboPill(false), 1200);
      }

      setTimeout(() => {
        if (currentRound >= ROUNDS_PER_GAME) {
          // 游戏通关
          sfxWin();
          celebrateBig();
          addStars(2);
          setIsGameOver(true);
        } else {
          setCurrentRound((r) => r + 1);
          nextTarget();
        }
      }, 950);
    } else {
      // ❌ 戳错气球
      triggerHaptic('error');
      sfxWrong();
      setCombo(0);
      setShowComboPill(false);
      setWobbleId(balloon.id);
      setTimeout(() => setWobbleId(null), 500);

      practice(`letter:${target.upper}`, false, 1, 1);
      void playLetterVoice(balloon.letter.upper).catch(() => {
        void speak(balloon.letter.upper, { lang: 'en-US', rate: 0.8 });
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部控制面板 */}
      <Panel className="flex items-center justify-between !py-3 bg-gradient-to-r from-sky-50 via-indigo-50 to-pink-50 border-2 border-sky-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-bounce">🎈</span>
          <div>
            <h4 className="text-base font-extrabold text-sky-950">听音戳气球</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-600">
                第 {currentRound} / {ROUNDS_PER_GAME} 关
              </span>
              {combo >= 2 && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950 shadow-xs animate-pulse">
                  🔥 连击 x{combo}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {target && (
            <CandyButton
              tone="blue"
              size="sm"
              onClick={() => {
                sfxTap();
                void speakTarget(target);
              }}
            >
              🔊 重听声音
            </CandyButton>
          )}
          <CandyButton tone="purple" variant="soft" size="sm" onClick={startNewGame}>
            🔄 换一局
          </CandyButton>
        </div>
      </Panel>

      {/* 气球漂浮游戏主舞台 */}
      <div className="relative h-80 sm:h-96 w-full overflow-hidden rounded-[2.5rem] border-4 border-sky-200 bg-gradient-to-b from-sky-100 via-blue-50 to-indigo-100 shadow-fluffy p-4 flex flex-col justify-between select-none">
        {/* 背景白云浮动装饰 */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <motion.div
            animate={{ x: [-20, 20, -20] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-4 left-6 text-4xl"
          >
            ☁️
          </motion.div>
          <motion.div
            animate={{ x: [20, -20, 20] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-12 right-12 text-5xl"
          >
            ☁️
          </motion.div>
          <div className="absolute bottom-10 left-1/3 text-3xl">☁️</div>
        </div>

        {/* 目标提示与连击气泡 */}
        <div className="z-10 mx-auto flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-1.5 shadow-md border border-sky-200">
            <span className="text-sm font-extrabold text-sky-800">
              🎯 听声音，戳破正确的字母气球！
            </span>
            {target && (
              <button
                onClick={() => void speakTarget(target)}
                className="text-xs font-black text-pink-600 underline hover:text-pink-800 transition"
              >
                例词: {target.word} ({target.zh})
              </button>
            )}
          </div>

          <AnimatePresence>
            {showComboPill && (
              <motion.div
                initial={{ scale: 0.5, y: 10, opacity: 0 }}
                animate={{ scale: 1.1, y: 0, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-0.5 text-xs font-black text-white shadow-lg shadow-amber-200 border border-white"
              >
                🎉 连击 x{combo}！太厉害啦！
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 气球容器 */}
        <div className="relative flex-1 w-full mt-2">
          <AnimatePresence>
            {balloons.map((b) => {
              const isPopping = poppedId === b.id;
              const isWobbling = wobbleId === b.id;

              return (
                <motion.div
                  key={b.id}
                  style={{ left: `${b.xPercent}%` }}
                  className="absolute bottom-4 cursor-pointer"
                  initial={{ y: 90, opacity: 0, scale: 0.8 }}
                  animate={
                    isPopping
                      ? { scale: [1, 1.35, 0], opacity: [1, 0.8, 0] }
                      : isWobbling
                      ? {
                          x: [-12, 12, -8, 8, 0],
                          rotate: [-12, 12, -8, 8, 0],
                          transition: { duration: 0.4 },
                        }
                      : {
                          y: [0, -22, 0],
                          rotate: [-3, 3, -3],
                          opacity: 1,
                          scale: 1,
                          transition: {
                            y: { repeat: Infinity, duration: 2.2 + b.speed, ease: 'easeInOut' },
                            rotate: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
                          },
                        }
                  }
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handlePop(b)}
                >
                  <div className="relative flex flex-col items-center">
                    {/* 气球主体 */}
                    <div
                      className={`relative grid h-20 w-16 sm:h-24 sm:w-20 place-items-center rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-gradient-to-br ${b.color} text-white shadow-lg border-2 border-white/70`}
                    >
                      {/* 气球高光质感 */}
                      <div className="absolute top-2 left-2.5 h-4 w-2 rounded-full bg-white/60 transform -rotate-45" />
                      <span className="text-3xl sm:text-4xl font-black drop-shadow-md">
                        {b.letter.upper}
                      </span>
                    </div>
                    {/* 气球小结与挂绳 */}
                    <div className="h-2 w-2 rounded-full bg-slate-400 shadow-xs" />
                    <div className="h-6 w-0.5 bg-slate-300 shadow-xs" />

                    {/* 破裂粒子飞散 */}
                    {isPopping && particles.length > 0 && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        {particles.map((p) => (
                          <motion.div
                            key={p.id}
                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                            animate={{ x: p.vx, y: p.vy, opacity: 0, scale: 0.2 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            style={{
                              width: p.size,
                              height: p.size,
                              backgroundColor: p.color,
                            }}
                            className="absolute rounded-full shadow-xs"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* 底部草地装饰 */}
        <div className="z-10 flex justify-around text-2xl opacity-75">
          <span className="transform hover:scale-125 transition">🌱</span>
          <span className="transform hover:scale-125 transition">🌸</span>
          <span className="transform hover:scale-125 transition">🌻</span>
          <span className="transform hover:scale-125 transition">🌿</span>
          <span className="transform hover:scale-125 transition">🌼</span>
        </div>
      </div>

      {/* 通关结算弹窗 */}
      <Modal open={isGameOver} onClose={() => setIsGameOver(false)}>
        <div className="space-y-4 text-center py-2">
          <div className="text-6xl animate-bounce">🏆</div>
          <h3 className="text-xl font-extrabold text-rainbow">🎉 字母气球通关啦！</h3>
          <p className="text-base font-extrabold text-ink">
            太棒啦！成功完成了全部 {score} 关听音戳气球挑战！
          </p>
          <div className="flex justify-center">
            <StarRating value={3} size={28} animated />
          </div>
          <div className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900 border border-amber-200">
            获得奖励: ⭐ +2 颗星星 · 🐟 +2 条小鱼干
          </div>
          <CandyButton tone="green" size="lg" fullWidth onClick={startNewGame}>
            🚀 再玩一次
          </CandyButton>
        </div>
      </Modal>
    </div>
  );
}
