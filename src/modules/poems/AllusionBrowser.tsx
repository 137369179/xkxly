/**
 * 典故溯源 - 激活 allusionSources.ts
 */

import { useState, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { ALLUSION_SOURCES } from '@/data/allusionSources';
import POEMS, { type PoemIndex } from '@/data/poems';
import { sfxTap } from '@/lib/sfx';
import { motion } from 'motion/react';
import { useTranslation } from '@/i18n/useTranslation';

export function AllusionBrowser() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);

  // 找出引用该典故的诗
  const relatedPoems = useMemo(() => {
    if (!selected) return [];
    return POEMS.filter((p: PoemIndex) => p.lines.join('\n').includes(selected) || (p.title?.includes(selected) ?? false));
  }, [selected]);


  const entry = selected ? ALLUSION_SOURCES[selected] : null;

  if (entry) {
    return (
      <div className="space-y-4">
        <button
          aria-label="返回典故列表" onClick={() => { sfxTap(); setSelected(null); }}
          className="rounded-full bg-candy-purple-soft px-4 py-1.5 text-sm font-bold text-candy-purple-deep"
        >
          {t('common.back')}
        </button>

        <Panel className="text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-black text-candy-purple-deep"
          >
            {selected}
          </motion.div>
        </Panel>

        <Panel>
          <h4 className="mb-1 text-sm font-extrabold text-ink">{t('allusionBrowser.source')}</h4>
          <p className="text-sm font-bold text-candy-purple-deep">{entry.source}</p>
          <p className="mt-2 rounded-xl bg-candy-purple-soft/50 p-3 text-sm font-bold leading-relaxed text-ink">
            「{entry.quote}」
          </p>
        </Panel>

        {entry.evolve && (
          <Panel>
            <h4 className="mb-1 text-sm font-extrabold text-ink">{t('allusionBrowser.evolution')}</h4>
            <p className="text-sm font-bold leading-relaxed text-ink-soft">{entry.evolve}</p>
          </Panel>
        )}

        {relatedPoems.length > 0 && (
          <Panel>
            <h4 className="mb-2 text-sm font-extrabold text-ink">{t('allusionBrowser.relatedPoems', { count: relatedPoems.length })}</h4>
            <div className="space-y-1">
              {relatedPoems.map(p => (
                <div key={p.id} className="rounded-lg bg-white/60 p-2">
                  <span className="text-sm font-extrabold text-ink">《{p.title}》</span>
                  <span className="ml-1 text-xs font-bold text-ink-soft">· {p.author}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    );
  }

  const entries = Object.entries(ALLUSION_SOURCES);

  return (
    <div className="space-y-4">
      <PageHeader emoji="📚" title={t('allusionBrowser.title')} subtitle={t('allusionBrowser.subtitle')} tone="purple" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {entries.map(([term]) => (
          <motion.button
            key={term}
            whileTap={{ scale: 0.95 }}
            onClick={() => { sfxTap(); setSelected(term); }}
            className="rounded-xl bg-candy-purple-soft p-3 text-center hover:bg-candy-purple-soft/80"
          >
            <div className="text-lg font-black text-candy-purple-deep">{term}</div>
            <div className="mt-1 truncate text-xs font-bold text-ink-soft">
              {ALLUSION_SOURCES[term]?.source ?? ''}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
