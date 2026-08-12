/**
 * 诗人档案 - 激活 poets.ts 数据
 */

import { useState, useMemo } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { POETS } from '@/data/poets';
import POEMS from '@/data/poems';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { motion } from 'motion/react';

export default function PoetArchive() {
  const [selected, setSelected] = useState<string | null>(null);

  // 按朝代分组
  const byDynasty = useMemo(() => {
    const groups: Record<string, string[]> = {};
    Object.keys(POETS).forEach(name => {
      const d = POETS[name]!!.dynasty;
      if (!groups[d]) groups[d] = [];
      groups[d]!.push(name);
    });
    return groups;
  }, []);

  // 诗人的诗作
  const poetPoems = useMemo(() => {
    if (!selected) return [];
    return POEMS.filter(p => p.author === selected);
  }, [selected]);

  const poet = selected ? POETS[selected] : null;

  if (poet) {
    return (
      <div className="space-y-4">
        <CandyButton tone="pink" variant="soft" size="sm" onClick={() => { sfxTap(); setSelected(null); }}>
          ◀️ 返回
        </CandyButton>

        {/* 头像区 */}
        <Panel className="text-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl"
          >
            📜
          </motion.div>
          <h2 className="mt-2 text-2xl font-black text-ink">{poet.name}</h2>
          <p className="text-sm font-bold text-ink-soft">
            {poet.dynasty} · {poet.life}
          </p>
          {poet.style && (
            <p className="text-xs font-bold text-ink-soft">字 {poet.style}{poet.epithet ? ` · ${poet.epithet}` : ''}</p>
          )}
          <CandyButton tone="pink" size="sm" onClick={() => speak(poet.name, { rate: 0.6 })}>
            🔊
          </CandyButton>
        </Panel>

        {/* 生平 */}
        <Panel>
          <h4 className="mb-1 text-sm font-extrabold text-ink">📖 生平</h4>
          <p className="text-sm font-bold leading-relaxed text-ink-soft">{poet.bio}</p>
        </Panel>

        {/* 大事年表 */}
        {poet.timeline.length > 0 && (
          <Panel>
            <h4 className="mb-2 text-sm font-extrabold text-ink">⏳ 大事年表</h4>
            <div className="space-y-2">
              {poet.timeline.map((t: { year: string; event: string }, i: number) => (
                <div key={`item-${i}`} className="flex gap-3">
                  <span className="whitespace-nowrap rounded-full bg-candy-pink-soft px-2 py-0.5 text-xs font-black text-candy-pink-deep">
                    {t.year}
                  </span>
                  <span className="text-sm font-bold text-ink-soft">{t.event}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* 艺术成就 */}
        <Panel>
          <h4 className="mb-1 text-sm font-extrabold text-ink">🎨 艺术成就</h4>
          <p className="text-sm font-bold leading-relaxed text-ink-soft">{poet.art}</p>
        </Panel>

        {/* 代表作 */}
        {poet.works.length > 0 && (
          <Panel>
            <h4 className="mb-2 text-sm font-extrabold text-ink">📚 代表作</h4>
            <div className="flex flex-wrap gap-2">
              {poet.works.map((w: string, i: number) => (
                <span key={`item-${i}`} className="rounded-full bg-candy-blue-soft px-3 py-1 text-xs font-bold text-candy-blue-deep">
                  {w}
                </span>
              ))}
            </div>
          </Panel>
        )}

        {/* 本库收录诗作 */}
        {poetPoems.length > 0 && (
          <Panel>
            <h4 className="mb-2 text-sm font-extrabold text-ink">🌸 本库收录（{poetPoems.length}首）</h4>
            <div className="space-y-1">
              {poetPoems.map((p: any) => (
                <div key={p.id} className="rounded-lg bg-white/60 p-2">
                  <span className="text-sm font-extrabold text-ink">《{p.title}》</span>
                  <span className="ml-2 text-xs font-bold text-ink-soft">{p.lines.join('\n').slice(0, 20)}…</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* 史料出处 */}
        {poet.sources.length > 0 && (
          <Panel>
            <h4 className="mb-2 text-sm font-extrabold text-ink">📚 史料出处</h4>
            <div className="space-y-1">
              {poet.sources.map((s: { title: string; note?: string }, i: number) => (
                <div key={`item-${i}`} className="text-xs font-bold text-ink-soft">
                  · {s.title}{s.note ? ` — ${s.note}` : ''}
                </div>

              ))}
            </div>
          </Panel>
        )}
      </div>
    );
  }

  // 列表
  const dynastyOrder = ['先秦', '汉', '魏晋', '南北朝', '隋', '唐', '五代', '宋', '元', '明', '清', '近现代'];
  const dynasties = Object.keys(byDynasty).sort((a, b) => dynastyOrder.indexOf(a) - dynastyOrder.indexOf(b));

  return (
    <div className="space-y-4">
      <PageHeader emoji="📜" title="诗人档案" subtitle="了解诗人的一生" tone="pink" />

      {dynasties.map(d => (
        <Panel key={d}>
          <h4 className="mb-2 text-sm font-extrabold text-ink">{d}（{byDynasty[d]!.length}位）</h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {byDynasty[d]!.map(name => (
              <motion.button
                key={name}
                whileTap={{ scale: 0.95 }}
                onClick={() => { sfxTap(); setSelected(name); }}
                className="rounded-xl bg-candy-pink-soft p-3 text-center hover:bg-candy-pink-soft/80"
              >
                <div className="text-2xl">📜</div>
                <div className="mt-1 text-sm font-extrabold text-ink">{name}</div>
                <div className="text-[10px] font-bold text-ink-soft">{POETS[name]!.life}</div>
              </motion.button>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
