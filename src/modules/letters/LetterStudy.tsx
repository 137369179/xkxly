import { useState, useMemo } from 'react';
import { LETTERS } from '@/data/letters';
import { TONE_STYLE, toneAt } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { LetterLearn } from '@/components/LetterLearn';
import { CandyButton } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';
import { useProgress, useStore } from '@/store/useStore';
import { sfxTap } from '@/lib/sfx';

type CategoryFilter = 'all' | 'vowel' | 'consonant1' | 'consonant2';

/** 字母乐园 · 精学：选一个字母走完五步闭环（玩 → 认 → 练 → 写 → 说） */
export function LetterStudy({ initialUpper }: { initialUpper?: string }) {
  const { t } = useTranslation();
  // 深链 单字母 进入时直接预选对应字母精学
  const [upper, setUpper] = useState<string | null>(initialUpper ?? null);
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const filteredLetters = useMemo(() => {
    if (filter === 'all') return LETTERS;
    return LETTERS.filter((l) => l.category === filter);
  }, [filter]);

  const progress = useProgress();

  if (upper) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <CandyButton tone="purple" variant="soft" size="sm" onClick={() => setUpper(null)}>
            ◀️ {t('letterStudy.changeLetter')}
          </CandyButton>
          <span className="text-xs font-bold text-candy-purple-deep">
            🎯 正在精学字母 <strong>{upper}</strong>
          </span>
        </div>
        <div className="mt-2">
          <LetterLearn upper={upper} onDone={() => setUpper(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部提示与过滤器 */}
      <div className="rounded-2xl bg-blue-50/80 p-3 border border-blue-100 text-center space-y-2">
        <p className="text-sm font-extrabold text-candy-blue-deep">
          🎯 {t('letterStudy.instruction')} · 玩 ➔ 认 ➔ 练 ➔ 写 ➔ 说 5步掌握
        </p>

        <div className="flex flex-wrap justify-center gap-1.5 pt-1">
          <button
            onClick={() => { sfxTap(); setFilter('all'); }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-black transition active:scale-95',
              filter === 'all' ? 'bg-candy-blue-deep text-white shadow-sm' : 'bg-white text-ink-soft hover:bg-blue-100'
            )}
          >
            全部 (26)
          </button>
          <button
            onClick={() => { sfxTap(); setFilter('vowel'); }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-black transition active:scale-95',
              filter === 'vowel' ? 'bg-candy-orange-deep text-white shadow-sm' : 'bg-white text-ink-soft hover:bg-orange-100'
            )}
          >
            🍎 元音 (5)
          </button>
          <button
            onClick={() => { sfxTap(); setFilter('consonant1'); }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-black transition active:scale-95',
              filter === 'consonant1' ? 'bg-candy-pink-deep text-white shadow-sm' : 'bg-white text-ink-soft hover:bg-pink-100'
            )}
          >
            🐱 常用辅音 (15)
          </button>
          <button
            onClick={() => { sfxTap(); setFilter('consonant2'); }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-black transition active:scale-95',
              filter === 'consonant2' ? 'bg-candy-purple-deep text-white shadow-sm' : 'bg-white text-ink-soft hover:bg-purple-100'
            )}
          >
            🦄 拓展字母 (6)
          </button>
        </div>
      </div>

      {/* 字母选择网格 */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6">
        {filteredLetters.map((item, i) => {
          const t = TONE_STYLE[toneAt(i)]!;
          const mastery = progress.mastery[`letter:${item.upper}`];
          const lv = mastery?.lv ?? 0;
          return (
            <button
              key={item.upper}
              onClick={() => {
                sfxTap();
                useStore.getState().practice(`letter-study:${item.upper}`, true);
                setUpper(item.upper);
              }}
              className={cn(
                'no-select relative flex min-h-[114px] flex-col items-center justify-center gap-0.5 rounded-[1.6rem] py-3',
                'transition-all duration-200 hover:scale-105 active:scale-95 sm:min-h-[132px] border-2 border-white shadow-fluffy',
                'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-blue/60',
              )}
              style={{ background: t.soft }}
            >
              {/* 掌握度标志 */}
              {lv >= 5 ? (
                <span className="absolute top-1.5 right-2 text-xs" title="已熟练掌握">
                  👑
                </span>
              ) : lv > 0 ? (
                <span className="absolute top-1.5 right-2 rounded-full bg-amber-300/90 px-1 py-0.2 text-[9px] font-black text-amber-950 shadow-xs">
                  ⭐ Lv.{lv}
                </span>
              ) : null}

              <span className="absolute top-1.5 left-2 rounded bg-white/80 px-1 text-[10px] font-black text-ink-soft">
                {item.phonicsSound}
              </span>

              <span className="text-3xl font-extrabold sm:text-4xl" style={{ color: t.deep }}>
                {item.upper}
                <span className="opacity-70">{item.lower}</span>
              </span>
              <img
                src={item.iconSrc}
                alt={item.word}
                loading="lazy"
                decoding="async"
                className="mt-1 h-9 w-9 rounded-full border-2 border-white bg-white object-cover shadow-md sm:h-11 sm:w-11"
              />
              <span className="text-[11px] font-bold" style={{ color: t.deep }}>
                {item.word}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
