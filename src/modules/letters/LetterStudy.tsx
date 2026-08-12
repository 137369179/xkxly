import { useState } from 'react';
import { LETTERS } from '@/data/letters';
import { TONE_STYLE, toneAt } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { LetterLearn } from '@/components/LetterLearn';
import { CandyButton } from '@/components/ui/Button';

/** 字母乐园 · 精学：选一个字母走完五步闭环 */
export function LetterStudy() {
  const [upper, setUpper] = useState<string | null>(null);

  if (upper) {
    return (
      <div>
        <CandyButton tone="purple" variant="soft" size="sm" onClick={() => setUpper(null)}>
          ← 换一个字母
        </CandyButton>
        <div className="mt-3">
          <LetterLearn upper={upper} onDone={() => setUpper(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-base font-bold text-ink-soft">
        选一个字母，跟着「玩 → 认 → 练 → 写 → 说」一步步学 ✨
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6">
        {LETTERS.map((item, i) => {
          const t = TONE_STYLE[toneAt(i)]!
          return (
            <button
              key={item.upper}
              onClick={() => setUpper(item.upper)}
              className={cn(
                'no-select flex min-h-[108px] flex-col items-center justify-center gap-0.5 rounded-[1.5rem] py-3',
                'transition-shadow active:translate-y-[2px] sm:min-h-[126px]',
                'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-blue/60',
              )}
              style={{ background: t.soft, boxShadow: `0 5px 0 0 ${t.main}44` }}
            >
              <span className="text-3xl font-extrabold sm:text-4xl" style={{ color: t.deep }}>
                {item.upper}
                <span className="opacity-70">{item.lower}</span>
              </span>
              {/* 统一羊毛毡风格图标（替代原 emoji span） */}
              <img
                src={item.iconSrc}
                alt={item.word}
                loading="lazy"
                decoding="async"
                className="mt-1 h-9 w-9 rounded-full border-2 border-white bg-white object-cover shadow-md sm:h-11 sm:w-11"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
