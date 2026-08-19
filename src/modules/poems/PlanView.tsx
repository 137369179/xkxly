/**
 * 复习计划
 * ------------------------------------------------------------
 * 汇总用户标记的难点与背诵薄弱项，为每首诗生成个性化复习路线（buildPlan），
 * 按优先级（高 / 中 / 低）排序成可执行的复习清单。点击即进入详情「研读」开练。
 */
import { useMemo } from 'react';
import { motion } from 'motion/react';
import type { DeepPoem } from '@/types';
import DEEP_POEMS from '@/data/poems-deep';
import { usePoemMarks, usePoemRecite } from '@/store/useStore';
import { buildPlan, stepLabel, type PoemPlan } from '@/lib/poemPlan';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';

const ORDER: Record<PoemPlan['priority'], number> = { high: 0, mid: 1, low: 2 };
const PRI: Record<PoemPlan['priority'], { labelKey: string; cls: string }> = {
  high: { labelKey: 'planView.high', cls: 'text-rose-600 bg-rose-50' },
  mid: { labelKey: 'planView.mid', cls: 'text-amber-600 bg-amber-50' },
  low: { labelKey: 'planView.low', cls: 'text-emerald-700 bg-emerald-50' },
};

export default function PlanView({ onOpen }: { onOpen: (id: string, tab?: '原文' | '注解' | '格律' | '语境' | '研读') => void }) {
  const { t } = useTranslation();
  const poemMarks = usePoemMarks();
  const poemRecite = usePoemRecite();

  const plans = useMemo(() => {
    const ids = new Set<string>(Object.keys(poemMarks));
    Object.keys(poemRecite).forEach((id) => {
      const r = poemRecite[id]!;
      // 背诵较弱（<80）或一周未复习也纳入计划
      if (r.best < 80 || Date.now() - r.lastAt > 7 * 24 * 3600 * 1000) ids.add(id);
    });
    const arr = [...ids]
      .map((id) => DEEP_POEMS.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => {
        const poem = p as DeepPoem;
        return buildPlan(poem, poemMarks[poem.id], poemRecite[poem.id]);
      })
      .sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
    return arr;
  }, [poemMarks, poemRecite]);

  const highCount = plans.filter((p) => p.priority === 'high').length;

  return (
    <div>
      <PageHeader emoji="🗺️" title={t('planView.title')} subtitle={`${plans.length} 首待复习 · 其中 ${highCount} 首高优先`} tone="purple" />

      {plans.length === 0 ? (
        <Panel className="mt-4 text-center text-sm text-ink-soft">
          {t('planView.empty')}
        </Panel>
      ) : (
        <div className="space-y-3">
          {plans.map((plan, idx) => {
            const poem = DEEP_POEMS.find((p) => p.id === plan.poemId);
            if (!poem) return null; // 用户进度中的 poemId 可能已不在库中（数据更新后）
            const pri = PRI[plan.priority]!
            return (
              <motion.div
                key={plan.poemId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="rounded-3xl bg-white/80 p-4 shadow-candy-sm"
              >
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-xl font-extrabold text-candy-pink-deep">{poem.title}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${pri.cls}`}>{t(pri.labelKey)}</span>
                  <span className="text-xs font-bold text-ink-soft">{poem.author}</span>
                </div>
                <p className="mb-2 text-xs font-bold text-ink-soft">{plan.note}</p>

                {plan.focus.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {plan.focus.map((f, i) => (
                      <span key={`f-${i}`} className="rounded-full bg-candy-orange-soft px-2.5 py-0.5 text-[11px] font-bold text-candy-orange-deep">{f}</span>
                    ))}
                  </div>
                )}

                {/* 步骤链 */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {plan.steps.map((s, i) => (
                    <span key={`s-${i}`} className="rounded-full bg-candy-purple-soft px-2.5 py-1 text-[11px] font-bold text-candy-purple-deep">
                      {i + 1}.{stepLabel(s.type)}
                    </span>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-ink-soft/70">{t('planView.suggestStage', { stage: plan.nextStage })}</span>
                  <CandyButton tone="pink" size="sm" onClick={() => onOpen(plan.poemId, '研读')}>{t('planView.startReview')}</CandyButton>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
