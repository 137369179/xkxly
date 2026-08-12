/**
 * 逐句串讲 - 激活 poemLineNotes.ts
 */

import { useState, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { POEM_LINE_NOTES } from '@/data/poemLineNotes';
import POEMS from '@/data/poems';
import { speak } from '@/lib/speech';
import { moodOfPoem } from '@/lib/chant';
import { sfxTap } from '@/lib/sfx';
import { motion } from 'motion/react';

export function LineNotes() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const annotatedPoems = useMemo(() => {
    return Object.keys(POEM_LINE_NOTES)
      .map(id => POEMS.find(p => p.id === id))
      .filter(Boolean) as typeof POEMS;
  }, []);

  const poem = selectedId ? POEMS.find(p => p.id === selectedId) : null;
  const notes = selectedId ? POEM_LINE_NOTES[selectedId] : null;
  const lines = poem?.lines.filter(Boolean) ?? [];

  if (poem && notes) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { sfxTap(); setSelectedId(null); }}
          className="rounded-full bg-candy-pink-soft px-4 py-1.5 text-sm font-bold text-candy-pink-deep"
        >
          ◀️ 返回
        </button>

        <Panel className="text-center">
          <h2 className="text-xl font-black text-ink">《{poem.title}》</h2>
          <p className="text-sm font-bold text-ink-soft">{poem.author}</p>
          <button aria-label="🔊 朗读"
            onClick={() => speak(poem.lines.join('\n'), { rate: 0.7, module: 'poem', moodKey: moodOfPoem(poem).key })}
            className="mt-2 rounded-full bg-candy-pink-soft px-3 py-1 text-xs font-bold text-candy-pink-deep"
          >
            🔊 朗读
          </button>
        </Panel>

        {/* 逐句串讲 */}
        <div className="space-y-3">
          {lines.map((line, i) => {
            const note = notes[i]!!
            if (!note) return null;
            return (
              <motion.div
                key={`line-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Panel>
                  {/* 原句 */}
                  <div className="mb-2 rounded-xl bg-candy-pink-soft/50 p-3 text-center">
                    <span className="text-lg font-black text-ink">{line}</span>
                  </div>

                  {/* 句意 */}
                  <p className="text-sm font-bold text-ink">{note.gloss}</p>

                  {/* 字词训释 */}
                  {note.keys && note.keys.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {note.keys.map((k, ki) => (
                        <div key={ki} className="flex gap-2">
                          <span className="rounded bg-candy-blue-soft px-2 text-xs font-black text-candy-blue-deep">
                            {k.term}
                          </span>
                          <span className="text-xs font-bold text-ink-soft">{k.note}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 赏析要点 */}
                  {note.point && (
                    <div className="mt-2 rounded-lg bg-candy-yellow-soft/50 p-2">
                      <span className="text-xs font-bold text-ink-soft">💡 {note.point}</span>
                    </div>
                  )}
                </Panel>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader emoji="📖" title="逐句串讲" subtitle="权威注释逐句解读" tone="pink" />

      {annotatedPoems.length === 0 ? (
        <Panel className="text-center">
          <p className="text-sm font-bold text-ink-soft">暂无串讲数据</p>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {annotatedPoems.map(p => (
            <motion.button
              key={p.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => { sfxTap(); setSelectedId(p.id); }}
              className="rounded-xl bg-candy-pink-soft p-3 text-left hover:bg-candy-pink-soft/80"
            >
              <div className="text-base font-black text-ink">《{p.title}》</div>
              <div className="text-xs font-bold text-ink-soft">{p.author}</div>
              <p className="mt-1 truncate text-xs font-bold text-ink-soft">
                {p.lines[0]}…
              </p>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
