import { useState } from 'react';
import { TONE_STYLE, toneAt } from '@/lib/tones';
import { cn, range } from '@/lib/utils';
import { toChineseNumber } from '@/lib/chineseNumber';
import { useStore } from '@/store/useStore';
import { TraceCanvas } from '@/components/TraceCanvas';
import { CandyButton } from '@/components/ui/Button';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';
import { ExploreReward } from '@/components/study/ExploreReward';

/** 数字王国 · 描红：选一个数字，描一描、听一听 */
export function NumberTrace() {
  const { t } = useTranslation();
  const [n, setN] = useState<number | null>(null);
  const markTraced = useStore((s) => s.markTraced);
  const heardNumber = useStore((s) => s.heardNumber);
  const practice = useStore((s) => s.practice);
  const ts = TONE_STYLE.yellow;

  if (n !== null) {
    const dots = Math.min(n, 20);
    return (
      <div>
        <CandyButton tone="purple" variant="soft" size="sm" onClick={() => setN(null)}>
          {t('numberTrace.changeNumber')}
        </CandyButton>
        <div className="mt-3 flex flex-col items-center gap-4">
          <div className="grid h-36 w-36 place-items-center rounded-[2rem]" style={{ background: ts.soft }}>
            <span className="text-7xl font-extrabold" style={{ color: ts.deep }}>
              {n}
            </span>
          </div>
          <h3 className="text-5xl font-extrabold leading-tight sm:text-6xl" style={{ color: ts.deep }}>
            {toChineseNumber(n)}
          </h3>
          {n > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-white/70 p-4">
              {Array.from({ length: dots }, (_, i) => (
                <span key={`dot-${i}`} className="h-5 w-5 rounded-full" style={{ background: ts.main }} />
              ))}
              {n > 20 && <span className="ml-1 text-sm font-extrabold" style={{ color: ts.deep }}>… 一共 {n} 个</span>}
            </div>
          )}
          <CandyButton
            tone="yellow"
            size="lg"
            fullWidth
            onClick={() => {
              heardNumber(n);
              speak(toChineseNumber(n), { rate: 0.7, module: 'number' }).catch(() => {});
            }}
          >
            {t('numberTrace.listen')}
          </CandyButton>
          <TraceCanvas
            char={String(n)}
            tone="yellow"
            hint={t('numberTrace.canvasHint')}
            onPass={() => {
              markTraced(`trace:${n}`);
              practice(`math:trace:${n}`, true);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-base font-bold text-ink-soft">{t('numberTrace.hint')}</p>
      <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-7 sm:gap-3 md:grid-cols-10">
        {range(0, 21).map((num) => {
          const ct = TONE_STYLE[toneAt(num)]!
          return (
            <button
              key={num}
              onClick={() => setN(num)}
              className={cn(
                'no-select grid min-h-[56px] place-items-center rounded-2xl text-2xl font-extrabold',
                'transition-shadow active:translate-y-[2px] sm:min-h-[62px] sm:text-3xl',
                'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-yellow/70',
              )}
              style={{ background: ct.soft, color: ct.deep, boxShadow: `0 4px 0 0 ${ct.main}55` }}
            >
              {num}
            </button>
          );
        })}
      </div>
    
      <ExploreReward rewardKey="number-trace" scene="number" tone="green" /></div>
  );
}
