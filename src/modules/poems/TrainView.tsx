/**
 * 训练中心
 * ------------------------------------------------------------
 * 汇总「已标难点 / 已背诵」的诗，显示 SRS 待复习数，并提供自测、背诵入口
 * 与全库快速启动器。点击任一首即进入详情「研读」标签开练。
 */
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import type { DeepPoem } from '@/types';
import DEEP_POEMS from '@/data/poems-deep';
import { useProgress } from '@/store/useStore';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { TONE_STYLE, toneAt } from '@/lib/tones';
import { useTranslation } from '@/i18n/useTranslation';

export default function TrainView({ onOpen }: { onOpen: (id: string, tab?: '原文' | '注解' | '格律' | '语境' | '研读') => void }) {
  const { t } = useTranslation();
  const progress = useProgress();
  const [q, setQ] = useState('');

  const markedIds = useMemo(() => new Set(Object.keys(progress.poemMarks)), [progress.poemMarks]);
  const recitedIds = useMemo(() => new Set(Object.keys(progress.poemRecite)), [progress.poemRecite]);

  const dueCount = useMemo(() => {
    const now = Date.now();
    return Object.entries(progress.mastery).filter(([k, m]) => k.startsWith('poem:') && (m.due ?? Infinity) <= now).length;
  }, [progress.mastery]);

  // 训练重点：标过难点或背过的诗，按优先级排序
  const focusList = useMemo(() => {
    const ids = new Set<string>([...markedIds, ...recitedIds]);
    const arr = [...ids].map((id) => DEEP_POEMS.find((p) => p.id === id)).filter(Boolean) as DeepPoem[];
    arr.sort((a, b) => {
      const ma = progress.poemMarks[a.id];
      const mb = progress.poemMarks[b.id];
      const ra = progress.poemRecite[a.id];
      const rb = progress.poemRecite[b.id];
      const score = (m?: { chars: string[]; lines: number[] }) => (m ? m.chars.length + m.lines.length : 0);
      const weak = (r?: { best: number }) => (r && r.best < 80 ? 1 : 0);
      return weak(rb) + score(mb) - (weak(ra) + score(ma));
    });
    return arr;
  }, [markedIds, recitedIds, progress.poemMarks, progress.poemRecite]);

  const lib = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return DEEP_POEMS.filter(
      (p) =>
        p.title.toLowerCase().includes(t) ||
        p.author.toLowerCase().includes(t) ||
        (p.themes ?? []).some((x) => x.toLowerCase().includes(t)),
    ).slice(0, 24);
  }, [q]);

  return (
    <div>
      <PageHeader emoji="🎯" title={t('trainView.title')} subtitle={`已标难点 ${markedIds.size} 首 · 已背诵 ${recitedIds.size} 首 · 待复习 ${dueCount} 个`} tone="pink" />

      <Panel className="!py-4">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('trainView.search')}
            className="tap-target w-full rounded-2xl border-2 border-candy-pink-soft bg-white/80 px-11 py-2.5 text-base font-bold text-ink outline-none placeholder:text-ink-soft/70 focus:border-candy-pink"
          />
        </div>
      </Panel>

      {focusList.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <p className="text-sm font-extrabold text-ink-soft">{t('trainView.myFocus')}</p>
          {focusList.map((p, i) => {
            const ts = TONE_STYLE[toneAt(i)]!
            const m = progress.poemMarks[p.id];
            const r = progress.poemRecite[p.id];
            return (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpen(p.id, '研读')}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/80 p-3 text-left shadow-candy-sm"
                style={{ background: ts.soft }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-extrabold" style={{ color: ts.deep }}>{p.title}</p>
                  <p className="text-xs font-bold text-ink-soft">{p.author}·{p.dynasty}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {m && (m.chars.length > 0 || m.lines.length > 0) && (
                      <span className="rounded-full bg-candy-orange-soft px-2 py-0.5 text-[11px] font-bold text-candy-orange-deep">
                        {t('trainView.difficult', { n: m.chars.length + m.lines.length })}
                      </span>
                    )}
                    {r && (
                      <span className="rounded-full bg-candy-green-soft px-2 py-0.5 text-[11px] font-bold text-candy-green-deep">
                        {t('trainView.bestRecite', { best: r.best, stage: r.stage })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <CandyButton tone="purple" variant="soft" size="sm" onClick={(e) => { e.stopPropagation(); onOpen(p.id, '研读'); }}>自测</CandyButton>
                  <CandyButton tone="pink" variant="soft" size="sm" onClick={(e) => { e.stopPropagation(); onOpen(p.id, '研读'); }}>背诵</CandyButton>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {lib.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {lib.map((p, i) => {
            const ts = TONE_STYLE[toneAt(i)]!
            return (
              <motion.button
                key={p.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onOpen(p.id, '研读')}
                className="flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-[1.5rem] p-3 text-center shadow-candy-sm"
                style={{ background: ts.soft }}
              >
                <span className="line-clamp-2 text-base font-extrabold" style={{ color: ts.deep }}>{p.title}</span>
                <span className="text-xs font-bold text-ink-soft">{p.author}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      {focusList.length === 0 && !q && (
        <Panel className="mt-4 text-center text-sm text-ink-soft">
          {t('trainView.empty')}
        </Panel>
      )}
    </div>
  );
}
