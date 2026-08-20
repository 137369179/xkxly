/**
 * 数学应用题专项练习
 */

import { useState, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useStore } from '@/store/useStore';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { randomPraise, randomEncourage } from '@/lib/speech';
import { getProblemsByLevel } from '@/data/wordProblems';
import { useTranslation } from '@/i18n/useTranslation';
import { StreakBar } from '@/components/study/StreakBar';


type Level = 1 | 2 | 3;

const LEVEL_INFO: Record<Level, { labelKey: string; emoji: string; tone: 'green' | 'blue' | 'purple' }> = {
  1: { labelKey: 'wordProblems.level1', emoji: '🌱', tone: 'green' },
  2: { labelKey: 'wordProblems.level2', emoji: '🌿', tone: 'blue' },
  3: { labelKey: 'wordProblems.level3', emoji: '🌳', tone: 'purple' },
};

export function WordProblems() {
  const { t } = useTranslation();
  const [level, setLevel] = useState<Level>(1);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  /** 连续答对里程碑：答对 +1、答错归零，形成闯关目标感 */
  const [streak, setStreak] = useState(0);
  const practice = useStore(s => s.practice);

  const problems = useMemo(() => getProblemsByLevel(level), [level]);
  const p = problems[idx]!

  const handlePick = (val: number) => {
    if (picked !== null) return;
    sfxTap();
    setPicked(val);
    const correct = val === p.answer;
    if (correct) {
      sfxCorrect();
      celebrateSmall();
      randomPraise();
      setStreak(s => s + 1);
      practice('math:word', true, 1);
    } else {
      sfxWrong();
      setWrong(prev => new Set(prev).add(p.id));
      randomEncourage();
      setStreak(0);
      practice('math:word', false, 0);
    }
  };

  const next = () => {
    sfxTap();
    if (idx + 1 >= problems.length) {
      setDone(true);
      celebrateBig();
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  };

  const restart = () => {
    sfxTap();
    setIdx(0);
    setPicked(null);
    setDone(false);
    setWrong(new Set());
    setStreak(0);
  };

  const changeLevel = (l: Level) => {
    sfxTap();
    setLevel(l);
    setIdx(0);
    setPicked(null);
    setDone(false);
    setWrong(new Set());
    setStreak(0);
  };

  if (done) {
    const correctCount = problems.length - wrong.size;
    const stars = wrong.size === 0 ? 3 : wrong.size <= 2 ? 2 : 1;
    return (
      <div className="space-y-4">
        <Panel className="text-center">
          <div className="text-6xl">{stars === 3 ? '🏆' : '🎉'}</div>
          <p className="mt-3 text-xl font-extrabold text-ink">{t('wordProblems.done')}</p>
          <p className="mt-1 text-base font-bold text-ink-soft">
            答对 {correctCount} / {problems.length} 题 · {'⭐'.repeat(stars)}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <CandyButton tone="purple" size="sm" onClick={restart}>{t('wordProblems.again')}</CandyButton>
            <CandyButton tone="green" size="sm" onClick={() => changeLevel(level === 1 ? 2 : level === 2 ? 3 : 1)}>
              {level < 3 ? `➡️ ${t(LEVEL_INFO[(level + 1) as Level].labelKey)}` : t('wordProblems.changeDiff')}
            </CandyButton>
          </div>
        </Panel>
      </div>
    );
  }

  const info = LEVEL_INFO[level]!

  return (
    <div className="space-y-4">
      <PageHeader emoji="📐" title={t('wordProblems.title')} subtitle={t('wordProblems.subtitle')} tone={info.tone} />

      <div className="flex gap-2">
        {([1, 2, 3] as Level[]).map(l => (
          <CandyButton
            key={l}
            tone={level === l ? info.tone : 'purple'}
            variant={level === l ? 'solid' : 'soft'}
            size="sm"
            onClick={() => changeLevel(l)}
          >
            {LEVEL_INFO[l]!.emoji} {t(LEVEL_INFO[l]!.labelKey)}
          </CandyButton>
        ))}
      </div>

      <ProgressBar value={idx + 1} max={problems.length} tone={info.tone} />

      {/* 闯关里程碑：连续答对 3 题点亮，形成目标感 */}
      <StreakBar streak={streak} target={3} tone={info.tone} />

      <Panel key={p.id} className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-4xl">{p.emoji}</span>
          <div className="flex-1">
            <p className="text-base font-bold text-ink">{p.scenario}</p>
            <p className="mt-2 text-lg font-extrabold text-ink">{p.question}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {p.options.map(opt => {
            const isPicked = picked === opt;
            const isAnswer = opt === p.answer;
            const show = picked !== null;
            return (
              <button
                key={opt}
                onClick={() => handlePick(opt)}
                disabled={picked !== null}
                className={`min-h-[56px] rounded-2xl border-4 p-4 text-xl font-extrabold transition-all active:translate-y-[1px] ${
                  show && isAnswer
                    ? 'border-candy-green-deep bg-candy-green-soft text-candy-green-deep'
                    : show && isPicked && !isAnswer
                    ? 'border-candy-red-deep bg-candy-red-soft text-candy-red-deep opacity-60'
                    : 'border-candy-blue-soft bg-white text-ink'
                }`}
              >
                {opt}
                {show && isAnswer && ' ✅'}
                {show && isPicked && !isAnswer && ' ❌'}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="rounded-2xl bg-candy-yellow-soft p-3">
            <p className="text-sm font-bold text-ink">
              💡 {p.hint}
            </p>
            <p className="mt-1 text-sm font-bold text-ink-soft">
              {p.why}
            </p>
          </div>
        )}

        {picked !== null && (
          <CandyButton tone="green" size="lg" fullWidth onClick={next}>
            {idx + 1 >= problems.length ? t('wordProblems.showResult') : t('wordProblems.nextQ')}
          </CandyButton>
        )}
      </Panel>

      <p className="text-center text-sm font-bold text-ink-soft">
        {t('wordProblems.progress', { n: idx + 1, total: problems.length })}
      </p>
    </div>
  );
}
