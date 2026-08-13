import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NAV_ITEMS } from '@/data/nav';
import { TONE_STYLE } from '@/lib/tones';
import { navigate } from '@/lib/router';
import { sfxTap } from '@/lib/sfx';
import { Panel } from '@/components/ui/Card';
import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { useTranslation } from '@/i18n/useTranslation';

interface ExploreMoreProps {
  /** 已在其他区域展示的模块 id，此处去重 */
  excludeIds?: string[];
}

/**
 * 探索更多折叠区（从 HomePage 提取）
 * NAV_ITEMS 过滤掉 home 和 excludeIds
 * 折叠/展开动画，网格布局展示模块入口
 */
export default function ExploreMore({ excludeIds }: ExploreMoreProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const excludeSet = new Set(['home', ...(excludeIds ?? [])]);
  const others = NAV_ITEMS.filter((n) => !excludeSet.has(n.id));

  return (
    <Panel className="!py-4">
      <button
        onClick={() => {
          sfxTap();
          setOpen((v) => !v);
        }}
        className="no-select flex w-full items-center justify-between gap-2"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">📂</span>
          <span className="text-base font-extrabold text-ink">{t('exploreMore.title')}</span>
          <span className="rounded-full bg-candy-purple-soft px-2 py-0.5 text-[11px] font-extrabold text-candy-purple-deep">
            {t('exploreMore.moduleCount', { n: others.length })}
          </span>
        </div>
        <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-base font-black text-ink-soft">
          ▸
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {others.map((m) => {
                const t = TONE_STYLE[m.tone];
                return (
                  <motion.button
                    key={m.id}
                    onClick={() => {
                      sfxTap();
                      navigate(m.id);
                    }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    className="no-select flex min-h-[110px] flex-col items-center justify-center gap-1.5 rounded-[1.6rem] p-3 text-center shadow-candy-sm border-2 border-white/90"
                    style={{ background: `linear-gradient(160deg, ${t.soft} 0%, #ffffff 70%)` }}
                  >
                    <FluffyIcon type={m.id} size="md" />
                    <span className="text-sm font-black tracking-wide" style={{ color: t.deep }}>
                      {m.label}
                    </span>
                    <span className="line-clamp-1 text-[10px] font-bold text-ink-soft">{m.desc}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}
