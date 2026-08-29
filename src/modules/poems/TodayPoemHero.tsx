/**
 * 今日推荐诗 · Hero 大字卡
 * ------------------------------------------------------------
 * 目标：把「打开古诗 → 开始学一首诗」压缩到 ≤2 层。
 * 首页直接给一首确定的诗：大字卡 + 🔊朗读 + 「开始学」大按钮，
 * 点「开始学」复用 PoemsPage 的 openPoem(id, tab) 直达详情。
 *
 * 选诗口径对齐 src/lib/dailyPlan.ts:265-267（新古诗推荐）：
 *   1. 按 level 升序取第一首「没读过 且 今天零点前没学过」的诗；
 *   2. 退化为「今天零点前没学过」的第一首；
 *   3. 再退化为索引第一首（保证一定有结果，不出现空卡）。
 */
import { useMemo } from 'react';
import POEMS from '@/data/poems';
import { useMastery, usePoemsRead } from '@/store/useStore';
import { SKILL } from '@/lib/srs';
import { dayStart } from '@/lib/dailyPlan';
import { speak } from '@/lib/speech';
import { moodOfPoem } from '@/lib/chant';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { CandyButton } from '@/components/ui/Button';
import type { DetailTab } from './PoemDetail';

/** 与 dailyPlan 同口径：按难度预排序，模块加载时只排一次 */
const POEM_INDEX_SORTED = [...POEMS].sort((a, b) => a.level - b.level);

export function TodayPoemHero({ onOpen }: { onOpen: (id: string, tab?: DetailTab) => void }) {
  const poemsRead = usePoemsRead();
  const mastery = useMastery();

  const poem = useMemo(() => {
    const start = dayStart();
    const readSet = new Set(poemsRead);
    // 与 dailyPlan.learnedBefore 同口径：只看今天零点之前的掌握记录，
    // 因此当天学过的诗不会让推荐中途跳走，刷新页面结果稳定。
    const learnedBefore = (id: string) => {
      const m = mastery[SKILL.poem(id)];
      const last = m?.last ?? 0;
      return !!m && last > 0 && last < start;
    };
    return (
      POEM_INDEX_SORTED.find((x) => !readSet.has(x.id) && !learnedBefore(x.id)) ??
      POEM_INDEX_SORTED.find((x) => !learnedBefore(x.id)) ??
      POEM_INDEX_SORTED[0]!
    );
  }, [poemsRead, mastery]);

  const previewLines = poem.lines.slice(0, 2);
  const mood = useMemo(() => moodOfPoem(poem), [poem]);

  const handleSpeak = () => {
    sfxTap();
    triggerHaptic(30);
    speak([poem.title, poem.author, ...poem.lines].join('，'), {
      rate: mood.rate,
      module: 'poem',
      moodKey: mood.key,
    });
  };

  const handleStart = () => {
    sfxTap();
    triggerHaptic(40);
    onOpen(poem.id, '原文');
  };

  return (
    <section className="mb-4 overflow-hidden rounded-[2rem] border-4 border-pink-200/90 bg-gradient-to-br from-pink-50 via-white to-purple-50 p-4 shadow-fluffy sm:p-6">
      <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-candy-pink-deep">
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-white/90 text-base shadow-sm">🌸</span>
        今天读这首
      </p>

      {/* 大字卡：点整张卡也能开始学，减少一次瞄准 */}
      <button
        type="button"
        onClick={handleStart}
        className="no-select block w-full rounded-3xl bg-white/90 p-4 text-left shadow-sm transition-transform active:translate-y-[2px]"
      >
        <p className="text-[clamp(1.75rem,1rem+4vw,2.75rem)] font-black leading-tight text-ink">
          {poem.title}
        </p>
        <p className="mt-1 text-sm font-extrabold text-ink-soft">
          {poem.dynasty} · {poem.author}
        </p>
        <div className="mt-3 space-y-1">
          {previewLines.map((l, i) => (
            <p key={`l-${i}`} className="text-base font-bold leading-relaxed text-ink/80">
              {l}
            </p>
          ))}
          {poem.lines.length > previewLines.length && (
            <p className="text-sm font-bold text-ink-soft/70">…（共 {poem.lines.length} 句）</p>
          )}
        </div>
      </button>

      <div className="mt-4 flex gap-3">
        <CandyButton tone="purple" variant="soft" size="lg" onClick={handleSpeak} className="shrink-0">
          🔊 朗读
        </CandyButton>
        <CandyButton tone="pink" size="xl" fullWidth onClick={handleStart}>
          开始学 ⭐
        </CandyButton>
      </div>
    </section>
  );
}
