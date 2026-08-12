/**
 * 古诗鉴赏笔记 - 激活 poemNotes store 字段
 */

import { useState, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import POEMS from '@/data/poems';
import { useProgress, useStore } from '@/store/useStore';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { motion } from 'motion/react';

export default function PoemNotes() {
  const progress = useProgress();
  const setPoemNote = useStore(s => s.setPoemNote);
  const [selectedPoemId, setSelectedPoemId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const notesPoems = useMemo(() => {
    return Object.entries(progress.poemNotes)
      .map(([id, note]) => ({ poem: POEMS.find(p => p.id === id), note }))
      .filter(item => item.poem);
  }, [progress.poemNotes]);

  const currentPoem = selectedPoemId ? POEMS.find(p => p.id === selectedPoemId) : null;

  const handleSave = () => {
    if (!selectedPoemId) return;
    sfxTap();
    setPoemNote(selectedPoemId, noteText);
    celebrateSmall();
    sfxStar();
    setSelectedPoemId(null);
    setNoteText('');
  };

  if (currentPoem) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <CandyButton tone="pink" variant="soft" size="sm" onClick={() => { sfxTap(); setSelectedPoemId(null); }}>
            ◀️ 返回
          </CandyButton>
          <span className="text-sm font-extrabold text-ink">🌸 {currentPoem.title}</span>
        </div>

        <Panel className="text-center">
          <div className="text-sm font-bold text-ink-soft">{currentPoem.author}</div>
          <div className="mt-2 text-base font-bold leading-relaxed text-ink whitespace-pre-line">
            {currentPoem.lines.join('\n')}
          </div>
        </Panel>

        <Panel>
          <h4 className="mb-2 text-sm font-extrabold text-ink">📝 我的学习笔记</h4>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="写下你对这首诗的理解、感受或喜欢的句子..."
            className="h-32 w-full resize-none rounded-2xl border-4 border-candy-pink-soft bg-white p-3 text-sm font-bold text-ink outline-none focus:border-candy-pink-deep"
            maxLength={500}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs font-bold text-ink-soft">{noteText.length}/500</span>
            <CandyButton tone="pink" size="sm" onClick={handleSave} disabled={!noteText.trim()}>
              💾 保存
            </CandyButton>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader emoji="📝" title="古诗笔记" subtitle="记录学习心得" tone="pink" />

      {notesPoems.length === 0 ? (
        <Panel className="text-center">
          <div className="text-4xl">📝</div>
          <p className="mt-2 text-sm font-bold text-ink-soft">还没有笔记，去古诗详情页写第一条笔记吧！</p>
        </Panel>
      ) : (
        <div className="space-y-2">
          {notesPoems.map(({ poem, note }) => (
            <motion.div
              key={poem!.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Panel className="cursor-pointer hover:shadow-md" >
                <div className="flex items-start justify-between" onClick={() => { sfxTap(); setSelectedPoemId(poem!.id); setNoteText(note); }}>
                  <div className="flex-1">
                    <div className="text-base font-extrabold text-ink">🌸 {poem!.title}</div>
                    <div className="text-xs font-bold text-ink-soft">{poem!.author}</div>
                    <p className="mt-2 line-clamp-3 text-sm font-bold text-ink-soft">
                      {note}
                    </p>
                  </div>
                  <span className="text-lg">✏️</span>
                </div>
              </Panel>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
