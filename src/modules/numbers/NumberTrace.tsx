import { useState } from 'react';
import { TONE_STYLE, toneAt } from '@/lib/tones';
import { cn, range } from '@/lib/utils';
import { toChineseNumber } from '@/lib/chineseNumber';
import { useStore } from '@/store/useStore';
import { TraceCanvas } from '@/components/TraceCanvas';
import { CandyButton } from '@/components/ui/Button';
import { speak } from '@/lib/speech';

/** 数字王国 · 描红：选一个数字，描一描、听一听 */
export function NumberTrace() {
  const [n, setN] = useState<number | null>(null);
  const markTraced = useStore((s) => s.markTraced);
  const heardNumber = useStore((s) => s.heardNumber);
  const t = TONE_STYLE.yellow;

  if (n !== null) {
    const dots = Math.min(n, 20);
    return (
      <div>
        <CandyButton tone="purple" variant="soft" size="sm" onClick={() => setN(null)}>
          ← 换个数字
        </CandyButton>
        <div className="mt-3 flex flex-col items-center gap-4">
          <div className="grid h-36 w-36 place-items-center rounded-[2rem]" style={{ background: t.soft }}>
            <span className="text-7xl font-extrabold" style={{ color: t.deep }}>
              {n}
            </span>
          </div>
          <h3 className="text-4xl font-extrabold" style={{ color: t.deep }}>
            {toChineseNumber(n)}
          </h3>
          {n > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-white/70 p-4">
              {Array.from({ length: dots }, (_, i) => (
                <span key={`dot-${i}`} className="h-5 w-5 rounded-full" style={{ background: t.main }} />
              ))}
              {n > 20 && <span className="ml-1 text-sm font-extrabold" style={{ color: t.deep }}>… 一共 {n} 个</span>}
            </div>
          )}
          <CandyButton
            tone="yellow"
            size="lg"
            fullWidth
            onClick={() => {
              heardNumber(n);
              void speak(toChineseNumber(n), { rate: 0.7, module: 'number' });
            }}
          >
            🔊 听一听
          </CandyButton>
          <TraceCanvas
            char={String(n)}
            tone="yellow"
            hint="用手指沿着虚线把数字描出来"
            onPass={() => markTraced(`trace:${n}`)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-base font-bold text-ink-soft">选一个数字，用手指描一描吧 ✍️</p>
      <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-7 sm:gap-3 md:grid-cols-10">
        {range(0, 21).map((num) => {
          const ct = TONE_STYLE[toneAt(num)]!
          return (
            <button
              key={num}
              onClick={() => setN(num)}
              className={cn(
                'no-select grid min-h-[56px] place-items-center rounded-2xl text-xl font-extrabold',
                'transition-shadow active:translate-y-[2px] sm:min-h-[62px] sm:text-2xl',
                'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-yellow/70',
              )}
              style={{ background: ct.soft, color: ct.deep, boxShadow: `0 4px 0 0 ${ct.main}55` }}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
