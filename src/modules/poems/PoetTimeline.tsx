/**
 * 诗人时间线 - 按朝代排列诗人
 */

import { useState, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { POETS, poetLinks } from '@/data/poets';
import type { PoetProfile } from '@/types';
import POEMS from '@/data/poems';
import { usePoemsRead } from '@/store/useStore';
import { sfxTap } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '@/i18n/useTranslation';

const DYNASTY_ORDER = ['先秦', '汉', '魏晋', '唐', '宋', '元', '明', '清'];

const DYNASTY_COLORS: Record<string, string> = {
  '先秦': '#b47805',
  '汉': '#c2410c',
  '魏晋': '#e05a80',
  '唐': '#ff5c7a',
  '宋': '#5fd68b',
  '元': '#35bcc0',
  '明': '#55aee0',
  '清': '#8b6ef0',
};

/** 朝代 -> i18n key（数据值保持中文，仅显示处翻译） */
const DYNASTY_KEY: Record<string, string> = {
  '先秦': 'poetTimeline.dynastyPreQin',
  '汉': 'poetTimeline.dynastyHan',
  '魏晋': 'poetTimeline.dynastyWeiJin',
  '唐': 'poetTimeline.dynastyTang',
  '宋': 'poetTimeline.dynastySong',
  '元': 'poetTimeline.dynastyYuan',
  '明': 'poetTimeline.dynastyMing',
  '清': 'poetTimeline.dynastyQing',
};

export default function PoetTimeline() {
  const { t: tr } = useTranslation();
  const [selected, setSelected] = useState<PoetProfile | null>(null);
  const poemsRead = usePoemsRead();

  const poetsByDynasty = useMemo(() => {
    const map: Record<string, PoetProfile[]> = {};
    for (const p of Object.values(POETS)) {
      if (!map[p.dynasty]) map[p.dynasty] = [];
      map[p.dynasty]!.push(p);
    }
    return map;
  }, []);

  const poetPoems = useMemo(() => {
    if (!selected) return [];
    return POEMS.filter(p => p.author === selected.name);
  }, [selected]);

  const readSet = useMemo(() => new Set(poemsRead), [poemsRead]);
  const links = selected ? poetLinks(selected.name) : [];

  return (
    <div className="space-y-4">
      <PageHeader emoji="📜" title={tr('poetTimeline.title')} subtitle={tr('poetTimeline.subtitle')} tone="purple" />

      <AnimatePresence mode="wait">
        {!selected ? (
          <motion.div
            key="timeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {DYNASTY_ORDER.filter(d => poetsByDynasty[d]).map(dynasty => {
              const poets = poetsByDynasty[dynasty]!
              const color = DYNASTY_COLORS[dynasty]! || '#b38894';
              return (
                <div key={dynasty} className="mb-4">
                  {/* 朝代标签 */}
                  <div className="mb-2 flex items-center gap-3">
                    <div
                      className="flex h-10 w-16 items-center justify-center rounded-xl text-sm font-black text-white"
                      style={{ background: color }}
                    >
                      {tr(DYNASTY_KEY[dynasty] ?? '')}
                    </div>
                    <div className="h-1 flex-1 rounded-full" style={{ background: color + '40' }} />
                    <span className="text-xs font-bold text-ink-soft">{tr('poetTimeline.selected', { count: String(poets.length) })}</span>
                  </div>

                  {/* 诗人列表 */}
                  <div className="flex flex-wrap gap-2 pl-4">
                    {poets.map(poet => {
                      const poetPoemsCount = POEMS.filter(p => p.author === poet.name).length;
                      const readCount = POEMS.filter(p => p.author === poet.name && readSet.has(p.id)).length;
                      return (
                        <button
                          key={poet.name}
                          onClick={() => { sfxTap(); setSelected(poet); }}
                          className="flex flex-col items-center rounded-2xl border-4 bg-white p-3 transition-all hover:scale-105 active:translate-y-[1px]"
                          style={{ borderColor: color + '40' }}
                        >
                          <span className="text-2xl font-black" style={{ color }}>👤</span>
                          <span className="mt-1 text-sm font-extrabold text-ink">{poet.name}</span>
                          <span className="text-[10px] font-bold text-ink-soft">
                            {readCount}/{poetPoemsCount} 首
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Panel className="space-y-3">
              <div className="flex items-center justify-between">
                <CandyButton tone="purple" variant="soft" size="sm" onClick={() => { sfxTap(); setSelected(null); }}>
                  {tr('poetTimeline.backToTimeline')}
                </CandyButton>
              </div>

              {/* 诗人信息 */}
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl text-white"
                  style={{ background: DYNASTY_COLORS[selected.dynasty] || '#b38894' }}
                >
                  👤
                </div>
                <div>
                  <h3 className="text-xl font-black text-ink">{selected.name}</h3>
                  <p className="text-sm font-bold" style={{ color: DYNASTY_COLORS[selected.dynasty] }}>
                    {selected.dynasty} · {selected.life || ''}
                  </p>
                </div>
              </div>

              {/* 简介 */}
              {selected.bio && (
                <div className="rounded-xl bg-candy-purple-soft p-3">
                  <p className="text-sm font-bold text-ink">{selected.bio}</p>
                </div>
              )}

              {/* 外链 */}
              {links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {links.map(link => (
                    <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="rounded-xl bg-candy-blue-soft px-3 py-1.5 text-xs font-extrabold text-candy-blue-deep">
                      🔗 {link.label}
                    </a>
                  ))}
                </div>
              )}

              {/* 代表作 */}
              <div>
                <p className="mb-2 text-sm font-extrabold text-ink">{tr('poetTimeline.worksCount', { count: String(poetPoems.length) })}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {poetPoems.slice(0, 10).map(poem => (
                    <div
                      key={poem.id}
                      className={`flex items-center justify-between rounded-xl p-2 ${
                        readSet.has(poem.id) ? 'bg-candy-green-soft' : 'bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-bold text-ink">《{poem.title}》</span>
                      <div className="flex items-center gap-1">
                        <span
                          className="text-xs cursor-pointer"
                          onClick={() => speak(poem.title, { rate: 0.7 })}
                        >
                          🔊
                        </span>
                        {readSet.has(poem.id) && <span>✅</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {poetPoems.length > 10 && (
                  <p className="mt-1 text-center text-xs font-bold text-ink-soft">
                    {tr('poetTimeline.morePoems', { count: String(poetPoems.length - 10) })}
                  </p>
                )}
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
