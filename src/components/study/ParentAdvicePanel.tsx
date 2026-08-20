/**
 * 家长智能建议面板（M8）· 集成到 ParentPage 仪表盘
 */
import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import type { Progress } from '@/types';
import { generateAdvice } from '@/lib/parentAdvice';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const KIND_STYLE: Record<string, string> = {
  urgent: 'border-red-200 bg-red-50 text-red-900',
  suggest: 'border-amber-200 bg-amber-50 text-amber-900',
  praise: 'border-green-200 bg-green-50 text-green-900',
};

export function ParentAdvicePanel() {
  const { t } = useTranslation();
  // generateAdvice 仅读取 mastery / streak / dailyLog
  const p = useStore(
    useShallow(
      (s) =>
        ({
          mastery: s.progress.mastery,
          streak: s.progress.streak,
          dailyLog: s.progress.dailyLog,
        }) as Progress,
    ),
  );
  const advices = useMemo(() => generateAdvice(p), [p]);

  if (advices.length === 0) return null;

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-ink">
        {t('parentAdvicePanel.panelTitle')}
        <span className="text-xs font-bold text-ink-muted">
          ({t('parentAdvicePanel.adviceCount', { count: advices.length })})
        </span>
      </h3>

      <div className="space-y-2">
        {advices.map((a, i) => (
          <motion.div
            key={`${a.kind}-${i}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={cn(
              'rounded-xl border-2 p-3',
              KIND_STYLE[a.kind],
            )}
          >
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-lg">{a.emoji}</span>
              <div className="min-w-0">
                <div className="text-sm font-extrabold">{a.title}</div>
                <div className="mt-0.5 text-xs font-medium opacity-80">{a.detail}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
