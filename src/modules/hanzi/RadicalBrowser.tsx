/**
 * 汉字部首分类浏览
 */

import { useState, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { getAllRadicals, getHanziByRadical } from '@/data/hanziIndex';
import type { HanziEntry } from '@/data/hanzi';



import { useProgress } from '@/store/useStore';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';

export function RadicalBrowser() {
  const [radical, setRadical] = useState<string | null>(null);
  const [selected, setSelected] = useState<HanziEntry | null>(null);
  const progress = useProgress();

  const radicals = useMemo(() => getAllRadicals(), []);
  const list = useMemo(() => radical ? getHanziByRadical(radical) : [], [radical]);

  const learnedSet = useMemo(() => {
    const s = new Set<string>();
    Object.keys(progress.mastery).forEach(k => {
      if (k.startsWith('hanzi:') && progress.mastery[k]!.lv >= 1) {
        s.add(k.slice(5));
      }
    });
    return s;
  }, [progress.mastery]);

  return (
    <div className="space-y-4">
      <PageHeader emoji="🔤" title="按部首学汉字" subtitle={`共 ${radicals.length} 个部首`} tone="blue" />

      {!radical && (
        <Panel>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {radicals.map(r => {
              const count = getHanziByRadical(r).length;
              return (
                <button
                  key={r}
                  onClick={() => { sfxTap(); setRadical(r); }}
                  className="flex flex-col items-center rounded-2xl border-4 border-candy-blue-soft bg-white p-2 transition-all hover:bg-candy-blue-soft active:translate-y-[1px]"
                >
                  <span className="text-2xl font-black text-candy-blue-deep">{r}</span>
                  <span className="text-[10px] font-bold text-ink-soft">{count}字</span>
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      {radical && (
        <>
          <div className="flex items-center justify-between">
            <CandyButton tone="blue" variant="soft" size="sm" onClick={() => { sfxTap(); setRadical(null); setSelected(null); }}>
              ◀️ 返回部首
            </CandyButton>
            <span className="text-sm font-extrabold text-ink">
              部首「{radical}」· {list.length} 字
            </span>
          </div>

          {!selected && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {list.map(h => {
                const learned = learnedSet.has(h.c);
                return (
                  <button
                    key={h.c}
                    onClick={() => { sfxTap(); setSelected(h); speak(h.p, { rate: 0.75 }); }}
                    className={cn(
                      'flex flex-col items-center rounded-2xl border-4 p-2 transition-all active:translate-y-[1px]',
                      learned
                        ? 'border-candy-green-soft bg-candy-green-soft'
                        : 'border-candy-blue-soft bg-white hover:bg-candy-blue-soft'
                    )}
                  >
                    <span className="text-2xl font-black text-ink">{h.c}</span>
                    <span className="text-[10px] font-bold text-ink-soft">{h.p}</span>
                    {learned && <span className="text-[10px]">✅</span>}
                  </button>
                );
              })}
            </div>
          )}

          {selected && (
            <Panel className="text-center">
              <div className="mb-2 flex justify-between">
                <CandyButton tone="blue" variant="soft" size="sm" onClick={() => setSelected(null)}>
                  ◀️ 返回列表
                </CandyButton>
              </div>
              <div className="my-4 text-8xl font-black text-ink">{selected.c}</div>
              <div className="text-xl font-extrabold text-candy-blue-deep">{selected.p}</div>
              <div className="mt-1 text-sm font-bold text-ink-soft">
                {selected.radical}部 · {selected.strokes}画 · {selected.tone}声 · Lv{selected.level}
              </div>
              <div className="mt-3 rounded-xl bg-candy-blue-soft p-3">
                <p className="text-sm font-bold text-ink">{selected.origin}</p>
              </div>
              {selected.evolve && (
                <div className="mt-2 text-xs font-bold text-ink-soft">字形演变：{selected.evolve}</div>
              )}
              <div className="mt-3">
                <p className="text-sm font-bold text-ink">组词：{selected.words.join('、')}</p>
              </div>
              <div className="mt-2">
                <p className="text-sm font-bold text-ink-soft">例句：{selected.sentence}</p>
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <CandyButton tone="green" size="sm" onClick={() => speak(selected.p, { rate: 0.6 })}>
                  🔊 慢读
                </CandyButton>
                <CandyButton tone="blue" size="sm" onClick={() => speak(selected.sentence, { rate: 0.8 })}>
                  📖 读例句
                </CandyButton>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
