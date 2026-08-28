import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Question } from '@/types';
import type { Difficulty } from '@/lib/questions';
import { cn } from '@/lib/utils';
import { QuizCard, type QuizCardProps } from '@/components/QuizCard';
import { Modal } from '@/components/ui/Modal';
import { CandyButton } from '@/components/ui/Button';
import { celebrateBig } from '@/lib/celebrate';
import { sfxWin, sfxCorrect, sfxWrong, triggerHaptic } from '@/lib/sfx';
import type { BossConfig } from '@/data/adventureChapters';
import type { EquipmentBonus } from '@/data/equipment';
import { useTranslation } from '@/i18n/useTranslation';

interface BossBattleProps {
  boss: BossConfig;
  makeQuestion: (difficulty: Difficulty) => Question;
  difficulty: Difficulty;
  equipmentBonus?: EquipmentBonus;
  onAnswered?: (q: Question, correct: boolean, difficulty?: Difficulty) => void;
  onVictory?: (turns: number) => void;
  renderVictory?: (turns: number, onReplay: () => void) => ReactNode;
  aiExplain?: QuizCardProps['aiExplain'];
}

interface ActiveEffects {
  timeLimit: boolean;
  doubleDamage: boolean;
  shuffle: boolean;
  hideHint: boolean;
}

const DEFAULT_PLAYER_HP = 3;

export function BossBattle({
  boss,
  makeQuestion,
  difficulty,
  equipmentBonus,
  onAnswered,
  onVictory,
  renderVictory,
  aiExplain,
}: BossBattleProps) {
  const { t: tr } = useTranslation();
  const playerHpBonus = equipmentBonus?.extraHp ?? 0;
  const playerMaxHp = DEFAULT_PLAYER_HP + playerHpBonus;
  const extraTime = equipmentBonus?.extraTime ?? 0;
  const extraHints = equipmentBonus?.extraHints ?? 0;

  const [bossHp, setBossHp] = useState(boss.hp);
  const [playerHp, setPlayerHp] = useState(playerMaxHp);
  const [turn, setTurn] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(difficulty));
  const [phase, setPhase] = useState<'fighting' | 'victory' | 'defeat'>('fighting');
  const [activeEffects, setActiveEffects] = useState<ActiveEffects>({
    timeLimit: false,
    doubleDamage: false,
    shuffle: false,
    hideHint: false,
  });
  const [bossShake, setBossShake] = useState(false);
  const [playerShake, setPlayerShake] = useState(false);
  const [skillFlash, setSkillFlash] = useState<string | null>(null);

  const makeRef = useRef(makeQuestion);
  makeRef.current = makeQuestion;
  const bossShakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerShakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (bossShakeTimerRef.current) clearTimeout(bossShakeTimerRef.current);
      if (playerShakeTimerRef.current) clearTimeout(playerShakeTimerRef.current);
    };
  }, []);

  const restart = useCallback(() => {
    setBossHp(boss.hp);
    setPlayerHp(playerMaxHp);
    setTurn(0);
    setWrongCount(0);
    setHintsUsed(0);
    setPhase('fighting');
    setActiveEffects({ timeLimit: false, doubleDamage: false, shuffle: false, hideHint: false });
    setQuestion(makeRef.current(difficulty));
  }, [boss.hp, playerMaxHp, difficulty]);

  // 键盘快捷监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (phase === 'victory' || phase === 'defeat') {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          restart();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, restart]);

  // 检查并激活Boss技能
  useEffect(() => {
    const hpPct = (bossHp / boss.hp) * 100;
    let triggered: string | null = null;
    const newEffects = { ...activeEffects };

    for (const skill of boss.skills) {
      if (hpPct <= skill.triggerHpPct && !newEffects[skill.effect]) {
        newEffects[skill.effect] = true;
        triggered = skill.name;
      }
    }

    let cleanup: (() => void) | undefined;
    if (triggered) {
      triggerHaptic([30, 40, 30]);
      setActiveEffects(newEffects);
      setSkillFlash(triggered);
      const timer = setTimeout(() => setSkillFlash(null), 2000);
      cleanup = () => clearTimeout(timer);
    }
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bossHp]);

  const handleAnswer = (correct: boolean) => {
    onAnswered?.(question, correct, difficulty);
    setTurn(t => t + 1);

    if (correct) {
      sfxCorrect();
      triggerHaptic(45);
      setBossShake(true);
      if (bossShakeTimerRef.current) clearTimeout(bossShakeTimerRef.current);
      bossShakeTimerRef.current = setTimeout(() => setBossShake(false), 400);
      setBossHp(hp => {
        const newHp = hp - 1;
        if (newHp <= 0) {
          setPhase('victory');
          celebrateBig();
          sfxWin();
          triggerHaptic([60, 40, 60, 40, 100]);
          onVictory?.(turn + 1);
        }
        return newHp;
      });
    } else {
      sfxWrong();
      triggerHaptic(20);
      const damage = activeEffects.doubleDamage ? 2 : 1;
      const newWrongCount = wrongCount + 1;
      setWrongCount(newWrongCount);

      if (newWrongCount % boss.attackEvery === 0 || newWrongCount === 1) {
        triggerHaptic([40, 50, 40]);
        setPlayerShake(true);
        if (playerShakeTimerRef.current) clearTimeout(playerShakeTimerRef.current);
        playerShakeTimerRef.current = setTimeout(() => setPlayerShake(false), 400);
        setPlayerHp(hp => {
          const newHp = Math.max(0, hp - damage);
          if (newHp <= 0) {
            setPhase('defeat');
            triggerHaptic(30);
          }
          return newHp;
        });
      }
    }
  };

  const handleNext = () => {
    if (phase !== 'fighting') return;
    setQuestion(makeRef.current(difficulty));
  };

  const bossHpPct = Math.max(0, (bossHp / boss.hp) * 100);

  const stars = phase === 'victory'
    ? playerHp >= playerMaxHp - 1 && turn <= boss.hp + 2 ? 3
      : playerHp >= 1 ? 2
      : 1
    : 0;

  if (phase === 'victory') {
    return (
      <Modal open onClose={restart} className="max-w-sm text-center" dismissable={false}>
        {renderVictory ? renderVictory(turn, restart) : (
          <motion.div
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          >
            <div className="text-7xl">🏆</div>
            <h3 className="mt-3 text-3xl font-extrabold text-rainbow">
              {tr('boss.defeated', { name: boss.name })}
            </h3>
            <p className="mt-2 text-base font-bold text-ink-soft">
              {tr('boss.victoryStats', { turns: turn, hp: playerHp })}
            </p>
            <div className="mt-4 flex justify-center gap-1">
              {[1, 2, 3].map(i => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className={cn('text-4xl', i <= stars ? '' : 'opacity-30 grayscale')}
                >
                  ⭐
                </motion.span>
              ))}
            </div>
            <div className="mt-6">
              <CandyButton tone="green" size="lg" fullWidth onClick={restart}>
                {tr('boss.replay')}
              </CandyButton>
            </div>
          </motion.div>
        )}
      </Modal>
    );
  }

  return (
    <div className="space-y-4">
      {/* Boss技能闪光提示 */}
      <AnimatePresence>
        {skillFlash && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-2 text-center"
          >
            <span className="text-lg font-black text-red-600">
              ⚡ {tr('boss.skillUsed', { name: boss.name, skill: skillFlash ?? '' })}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boss区域 */}
      <div className="rounded-[2rem] border-4 border-white bg-gradient-to-b from-orange-50 to-amber-100 p-5 shadow-pop">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={bossShake ? { x: [-8, 8, -4, 4, 0], filter: ['brightness(1)', 'brightness(2)', 'brightness(1)'] } : {}}
              transition={{ duration: 0.4 }}
              className="text-6xl"
            >
              {boss.emoji}
            </motion.div>
            <div>
              <div className="text-xl font-extrabold text-ink">{boss.name}</div>
              <div className="text-xs font-bold text-ink-soft">{tr('boss.turn', { turn })}</div>
            </div>
          </div>
          <div className="w-32">
            <div className="mb-1 flex justify-between text-xs font-black">
              <span>❤️</span>
              <span className="text-red-600">{bossHp}/{boss.hp}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-red-200">
              <motion.div
                animate={{ width: `${bossHpPct}%` }}
                transition={{ duration: 0.3 }}
                className={cn(
                  'h-full rounded-full',
                  bossHpPct > 60 ? 'bg-green-500' : bossHpPct > 30 ? 'bg-yellow-500' : 'bg-red-500'
                )}
              />
            </div>
          </div>
        </div>

        {/* Boss技能图标 */}
        <div className="mt-2 flex gap-2">
          {boss.skills.map(s => (
            <span
              key={s.name}
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-bold',
                activeEffects[s.effect] ? 'bg-red-200 text-red-700' : 'bg-gray-200 text-gray-500'
              )}
            >
              {s.emoji} {s.name}
            </span>
          ))}
        </div>
      </div>

      {/* 玩家区域 */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-blue-200 bg-blue-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🐰</span>
          <span className="text-sm font-extrabold text-ink">{tr('boss.player')}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-sm">💡</span>
            <span className="text-xs font-bold text-ink-soft">
              {1 + extraHints - hintsUsed}/{1 + extraHints}
            </span>
          </div>
          <motion.span
            animate={playerShake ? { x: [-6, 6, -3, 3, 0] } : {}}
            transition={{ duration: 0.3 }}
            className="flex gap-0.5"
          >
            {Array.from({ length: playerMaxHp }).map((_, i) => (
              <span key={i} className={cn('text-xl', i < playerHp ? '' : 'opacity-20 grayscale')}>
                ❤️
              </span>
            ))}
          </motion.span>
        </div>
      </div>

      {/* 题目区域 */}
      <QuizCard
        key={question.id}
        question={question}
        onAnswer={handleAnswer}
        onNext={handleNext}
        meta={tr('boss.meta', { turn: turn + 1 })}
        aiExplain={aiExplain}
        hideHint={activeEffects.hideHint}
        timeLimitMs={activeEffects.timeLimit ? (15000 + extraTime * 1000) : undefined}
        shuffleOptions={activeEffects.shuffle}
      />

      {/* 失败弹窗 */}
      <Modal open={phase === 'defeat'} onClose={restart} className="max-w-sm text-center" dismissable={false}>
        <motion.div
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        >
          <div className="text-7xl">💪</div>
          <h3 className="mt-3 text-2xl font-extrabold text-ink">
            {tr('boss.tooStrong', { name: boss.name })}
          </h3>
          <p className="mt-2 text-base font-bold text-ink-soft">
            {tr('boss.tryAgain', { hp: bossHp })}
          </p>
          <div className="mt-6">
            <CandyButton tone="orange" size="lg" fullWidth onClick={restart}>
              {tr('boss.fightAgain')}
            </CandyButton>
          </div>
        </motion.div>
      </Modal>
    </div>
  );
}
