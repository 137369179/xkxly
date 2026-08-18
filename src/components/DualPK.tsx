import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { makeMathQuestion, makeCountQuestion, makeLogicQuestion, type Difficulty } from '@/lib/questions';
import type { Question } from '@/types';
import { celebrateSmall } from '@/lib/celebrate';
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 同设备双人对战
 * 两个孩子轮流答题，每人 5 题，比谁对得多
 */

type Phase = 'setup' | 'p1' | 'p2' | 'result';

const PK_QUESTIONS = 5;

function makeQuestion(): Question {
  // 各题型首参不同（数学/数数=难度，逻辑=kind），用统一 (d:number)=>Question 包裹，
  // 避免联合类型调用签名参数塌缩成 never（TS2345）。
  const makers: Array<(d: number) => Question> = [
    (d) => makeMathQuestion(d as Difficulty),
    (d) => makeCountQuestion(d as Difficulty),
    (d) => makeLogicQuestion('mixed', d as Difficulty),
  ];
  const idx = Math.floor(Math.random() * makers.length);
  const maker = makers[idx] ?? makers[0];
  if (maker) return maker(1 + Math.floor(Math.random() * 2));
  return makeMathQuestion(1); // 防御：makers 恒非空，正常不会走到
}

export function DualPK() {
  const { t: tr } = useTranslation();
  const [phase, setPhase] = useState<Phase>('setup');
  const [p1Name, setP1Name] = useState('玩家1');
  const [p2Name, setP2Name] = useState('玩家2');
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [scores, setScores] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [qIndex, setQIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const start = useCallback(() => {
    setScores({ p1: 0, p2: 0 });
    setCurrentPlayer(1);
    setQIndex(0);
    setQuestion(makeQuestion());
    setChosen(null);
    setShowResult(false);
    setPhase('p1');
  }, []);

  const next = useCallback(() => {
    setChosen(null);
    setShowResult(false);
    const nextQ = makeQuestion();
    setQuestion(nextQ);

    if (currentPlayer === 1 && qIndex + 1 >= PK_QUESTIONS) {
      setCurrentPlayer(2);
      setQIndex(0);
      setPhase('p2');
    } else if (currentPlayer === 2 && qIndex + 1 >= PK_QUESTIONS) {
      setPhase('result');
    } else {
      setQIndex(q => q + 1);
    }
  }, [currentPlayer, qIndex]);

  const answer = useCallback((optId: string) => {
    if (chosen || !question) return;
    setChosen(optId);
    setShowResult(true);
    const correct = optId === question.answerId;
    if (correct) {
      sfxCorrect();
      celebrateSmall();
      setScores(s => ({
        ...s,
        [currentPlayer === 1 ? 'p1' : 'p2']: s[currentPlayer === 1 ? 'p1' : 'p2'] + 1,
      }));
    } else {
      sfxWrong();
    }
  }, [chosen, question, currentPlayer]);

  if (phase === 'setup') {
    return (
      <Panel className="text-center">
        <PanelTitle emoji="🏆" title={tr('dualpk.title')} subtitle={tr('dualpk.subtitle')} tone="purple" />
        <div className="mx-auto max-w-xs space-y-3">
          <input
            value={p1Name}
            onChange={e => setP1Name(e.target.value.slice(0, 8))}
            placeholder={tr('dualpk.p1Placeholder')}
            className="w-full rounded-2xl border-4 border-candy-blue-soft bg-white px-4 py-2.5 text-center font-bold text-candy-blue-deep outline-none"
          />
          <div className="text-2xl">⚔️</div>
          <input
            value={p2Name}
            onChange={e => setP2Name(e.target.value.slice(0, 8))}
            placeholder={tr('dualpk.p2Placeholder')}
            className="w-full rounded-2xl border-4 border-candy-pink-soft bg-white px-4 py-2.5 text-center font-bold text-candy-pink-deep outline-none"
          />
          <CandyButton tone="purple" size="lg" fullWidth onClick={start}>
            {tr('dualpk.start')}
          </CandyButton>
        </div>
        <p className="mt-3 text-xs font-bold text-ink-soft">
          {tr('dualpk.rules', { count: PK_QUESTIONS })}
        </p>
      </Panel>
    );
  }

  if (phase === 'result') {
    const winner = scores.p1 > scores.p2 ? p1Name : scores.p2 > scores.p1 ? p2Name : tr('dualpk.tie');
    const isTie = scores.p1 === scores.p2;
    // 增加对战计数
    useStore.getState().incPkCount();
    return (
      <Panel className="text-center">
        <div className="text-6xl">{isTie ? '🤝' : '🎉'}</div>
        <h2 className="mt-2 text-2xl font-black text-candy-purple-deep">
          {isTie ? tr('dualpk.tieResult') : tr('dualpk.winner', { name: winner })}
        </h2>
        <div className="mt-4 flex justify-center gap-6">
          <div className="rounded-2xl bg-candy-blue-soft p-4">
            <div className="text-sm font-bold text-candy-blue-deep">{p1Name}</div>
            <div className="text-4xl font-black text-candy-blue-deep">{scores.p1}</div>
            <div className="text-xs font-bold text-candy-blue-deep">✅ {tr('dualpk.correct')}</div>
          </div>
          <div className="self-center text-2xl font-black text-ink-soft">vs</div>
          <div className="rounded-2xl bg-candy-pink-soft p-4">
            <div className="text-sm font-bold text-candy-pink-deep">{p2Name}</div>
            <div className="text-4xl font-black text-candy-pink-deep">{scores.p2}</div>
            <div className="text-xs font-bold text-candy-pink-deep">✅ {tr('dualpk.correct')}</div>
          </div>
        </div>
        <div className="mt-4">
          <CandyButton tone="purple" size="lg" onClick={start}>
            {tr('dualpk.playAgain')}
          </CandyButton>
        </div>
      </Panel>
    );
  }

  // 答题阶段
  const playerName = currentPlayer === 1 ? p1Name : p2Name;
  const style = currentPlayer === 1
    ? { soft: 'bg-candy-blue-soft', deep: 'text-candy-blue-deep', main: 'bg-candy-blue-main' }
    : { soft: 'bg-candy-pink-soft', deep: 'text-candy-pink-deep', main: 'bg-candy-pink-main' };

  return (
    <Panel>
      {/* 玩家信息 */}
      <div className={cn('mb-3 rounded-2xl p-3 text-center', style.soft)}>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">{currentPlayer === 1 ? '🔵' : '🔴'}</span>
          <span className={cn('text-lg font-black', style.deep)}>{playerName}</span>
          <span className="text-2xl">{currentPlayer === 1 ? '🔵' : '🔴'}</span>
        </div>
        <div className={cn('text-xs font-bold', style.deep)}>
          {tr('dualpk.questionN', { current: qIndex + 1, total: PK_QUESTIONS, correct: currentPlayer === 1 ? scores.p1 : scores.p2 })}
        </div>
      </div>

      {/* 题目 */}
      {question && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-white/70 p-4 text-center">
            <div className="text-2xl font-black text-ink">{question.display || question.prompt}</div>
            {question.hint && <div className="mt-1 text-xs font-bold text-ink-soft">{question.hint}</div>}
          </div>

          {/* 选项 */}
          <div className="grid grid-cols-2 gap-2">
            {question.options.map(opt => {
              const isCorrect = opt.id === question.answerId;
              const isChosen = opt.id === chosen;
              let style = 'bg-white';
              if (showResult) {
                if (isCorrect) style = 'bg-candy-green-soft ring-2 ring-candy-green-main';
                else if (isChosen) style = 'bg-candy-orange-soft ring-2 ring-candy-orange-main opacity-60';
              } else if (isChosen) {
                style = 'bg-candy-purple-soft ring-2 ring-candy-purple-main';
              }
              return (
                <button
                  key={opt.id}
                  disabled={!!chosen}
                  onClick={() => answer(opt.id)}
                  className={cn('rounded-2xl p-3 text-center text-lg font-bold transition', style)}
                >
                  {opt.label}
                  {showResult && isCorrect && ' ✅'}
                  {showResult && isChosen && !isCorrect && ' ❌'}
                </button>
              );
            })}
          </div>

          {/* 下一题 */}
          <AnimatePresence>
            {showResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <CandyButton tone="purple" size="lg" fullWidth onClick={next}>
                  {currentPlayer === 1 && qIndex + 1 >= PK_QUESTIONS
                    ? tr('dualpk.switchPlayer', { name: p2Name })
                    : currentPlayer === 2 && qIndex + 1 >= PK_QUESTIONS
                      ? tr('dualpk.viewResult')
                      : tr('dualpk.nextQuestion')}
                </CandyButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Panel>
  );
}
