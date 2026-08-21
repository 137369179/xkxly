import { useCallback, useEffect, useRef, useState } from 'react';
import { RoundRunner } from '@/components/quiz/RoundRunner';
import { CandyButton } from '@/components/ui/Button';
import { AiAvatar } from '@/components/ai';
import { makeCountQuestion, type Difficulty } from '@/lib/questions';
import { makeSpacedDrill } from '@/lib/drill';
import { genCountQuestion } from '@/lib/ai/tasks';
import type { Question } from '@/types';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/study/AdaptiveDifficultyHint';
import { useTranslation } from '@/i18n/useTranslation';

const DIFFS: { id: Difficulty; labelKey: string }[] = [
  { id: 1, labelKey: 'countingGame.range1' },
  { id: 2, labelKey: 'countingGame.range2' },
  { id: 3, labelKey: 'countingGame.range3' },
];

const MAX_OF: Record<Difficulty, number> = { 1: 9, 2: 14, 3: 20 };

/** 预取深度：AI 出题要 8~15 秒，靠提前排队把等待藏起来 */
const POOL_TARGET = 2;

export function CountingGame() {
  const { t } = useTranslation();
  const recordCount = useStore((s) => s.recordCount);
  const aiOn = useSettingsStore((s) => s.settings.aiEnabled);
  const [diff, setDiff, diffMeta] = useAdaptiveDifficultyState('number');
  const [aiMode, setAiMode] = useState(false);
  const [poolSize, setPoolSize] = useState(0);

  const poolRef = useRef<Question[]>([]);
  const fillingRef = useRef(0);
  const aliveRef = useRef(true);
  const genRef = useRef(0);
  const refillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (refillTimerRef.current) clearTimeout(refillTimerRef.current);
    };
  }, []);

  // 换难度 / 切模式时清空旧题池
  useEffect(() => {
    genRef.current++;
    poolRef.current = [];
    fillingRef.current = 0;
    setPoolSize(0);
  }, [diff, aiMode]);

  const refill = useCallback(() => {
    if (!aiMode || !aiOn) return;
    const gen = genRef.current;
    const need = POOL_TARGET - poolRef.current.length - fillingRef.current;
    for (let i = 0; i < need; i++) {
      fillingRef.current++;
      genCountQuestion(MAX_OF[diff])
        .then((r) => {
          if (!aliveRef.current || gen !== genRef.current || !r.ok) return;
          poolRef.current.push(r.data);
          setPoolSize(poolRef.current.length);
        })
        .catch(() => {
          /* 出题失败：本地题库随时兜底 */
        })
        .finally(() => {
          if (gen === genRef.current) fillingRef.current = Math.max(0, fillingRef.current - 1);
        });
    }
  }, [aiMode, aiOn, diff]);

  useEffect(() => {
    refill();
  }, [refill]);

  const localMake = makeSpacedDrill('count', makeCountQuestion, () => useStore.getState().progress);

  const make = useCallback(
    (d: Difficulty): Question => {
      if (aiMode && aiOn) {
        const q = poolRef.current.shift();
        if (refillTimerRef.current) clearTimeout(refillTimerRef.current);
        refillTimerRef.current = setTimeout(() => {
          refillTimerRef.current = null;
          if (!aliveRef.current) return;
          setPoolSize(poolRef.current.length);
          refill();
        }, 0);
        if (q) return q;
      }
      return localMake(d);
    },
    // intentional: localMake is stable per difficulty, aiMode/aiOn/refill are the triggers
    [aiMode, aiOn, refill],
  );

  return (
    <RoundRunner
      key={`${diff}-${aiMode}`}
      makeQuestion={make}
      difficulty={diff}
      tone="pink"
      questionsPerRound={5}
      streakBar={{ leveled: true, tone: 'pink' }}
      onRoundStart={diffMeta.syncNow}
      onAnswered={(_q, c) => recordCount(c)}
      header={
        <div className="space-y-2.5">
          <div className="flex gap-2.5">
            {DIFFS.map((d) => (
              <CandyButton
                key={d.id}
                tone={diff === d.id ? 'pink' : 'purple'}
                variant={diff === d.id ? 'solid' : 'soft'}
                size="sm"
                fullWidth
                onClick={() => setDiff(d.id)}
              >
                {t(d.labelKey)}
              </CandyButton>
            ))}
          </div>
          <AdaptiveDifficultyHint meta={diffMeta} labels={{ 1: t('countingGame.range1'), 2: t('countingGame.range2'), 3: t('countingGame.range3') }} />

          {aiOn && (
            <button
              type="button"
              onClick={() => setAiMode((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-2xl border-2 px-3.5 py-2.5 text-left transition active:translate-y-[2px]"
              style={{
                background: aiMode ? '#FFE8F0' : '#FFFFFF',
                borderColor: aiMode ? '#F472B6' : '#F5D5E5',
              }}
            >
              <AiAvatar size={30} mood={aiMode ? 'talking' : 'sleep'} />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-extrabold text-candy-pink-deep">
                  {t('countingGame.aiMode', { state: aiMode ? t('countingGame.on') : t('countingGame.off') })}
                </span>
                <span className="block text-xs text-ink-soft">
                  {aiMode
                    ? poolSize > 0
                      ? t('countingGame.aiReady', { n: poolSize })
                      : t('countingGame.aiThinking')
                    : t('countingGame.aiOff')}
                </span>
              </span>
              <span
                className="grid h-7 w-12 shrink-0 items-center rounded-full px-1 transition"
                style={{ background: aiMode ? '#F472B6' : '#E8D5DD' }}
              >
                <span
                  className="block h-5 w-5 rounded-full bg-white transition-transform"
                  style={{ transform: aiMode ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </span>
            </button>
          )}
        </div>
      }
    />
  );
}
