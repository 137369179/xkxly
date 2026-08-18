/**
 * 古诗详情 · 研读类子组件
 * ------------------------------------------------------------
 * 逐句串讲（含典故溯源） / 标准谱对照格律 / 诗人史料与链接 / 难点标记面板。
 * 均只读数据 + 调用 store 落盘，无副作用外溢。
 */
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import type { DeepPoem, PoemMark } from '@/types';
import { analyzeProsody, type Prosody, type ProsodyFault } from '@/lib/prosody';
import { lineNotesOf, hasLineNotes } from '@/data/poemLineNotes';
import { EXTERNAL_LINKS } from '@/lib/externalLinks';
import { lookupAllusion } from '@/data/allusionSources';
import { poetOf, hasPoet, poetLinks } from '@/data/poets';
import { useStore, useProgress } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { CandyButton } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';

/* ---------------- 难点标记面板 ---------------- */
export function MarkPanel({ poem, showPinyin = true }: { poem: DeepPoem; showPinyin?: boolean }) {
  const { t: tr } = useTranslation();
  const mark = useProgress().poemMarks[poem.id];
  const toggleChar = useStore((s) => s.togglePoemCharMark);
  const toggleLine = useStore((s) => s.togglePoemLineMark);
  const clearMarks = useStore((s) => s.clearPoemMarks);
  const [mode, setMode] = useState<'read' | 'mark'>('read');

  const m: PoemMark = mark ?? { chars: [], lines: [], at: 0 };
  const charSet = new Set(m.chars);
  const lineSet = new Set(m.lines);
  const has = m.chars.length > 0 || m.lines.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <CandyButton tone={mode === 'read' ? 'pink' : 'purple'} variant={mode === 'read' ? 'solid' : 'soft'} size="sm" onClick={() => setMode('read')}>
          {tr('poem.readMode')}
        </CandyButton>
        <CandyButton tone={mode === 'mark' ? 'orange' : 'purple'} variant={mode === 'mark' ? 'solid' : 'soft'} size="sm" onClick={() => setMode('mark')}>
          {tr('poem.markMode')}
        </CandyButton>
        {has && (
          <CandyButton tone="purple" variant="ghost" size="sm" onClick={() => clearMarks(poem.id)}>
            {tr('poem.clearMarks')}
          </CandyButton>
        )}
      </div>

      {mode === 'mark' && (
        <p className="text-xs font-bold text-ink-soft">
          {tr('poem.markHint')}
        </p>
      )}

      <div className="space-y-2">
        {poem.lines.map((line, li) => {
          const lineMarked = lineSet.has(li);
          return (
            <div
              key={li}
              className={cn(
                'flex items-stretch gap-2 rounded-2xl px-1.5 py-1.5 transition-colors',
                lineMarked && 'bg-candy-orange-soft',
              )}
            >
              <button
                type="button"
                onClick={() => mode === 'mark' && toggleLine(poem.id, li)}
                className={cn(
                  'grid w-8 shrink-0 place-items-center rounded-xl text-xs font-extrabold',
                  lineMarked ? 'bg-candy-orange text-white' : 'bg-white/70 text-ink-soft',
                )}
                title={tr('poem.markLineTip')}
              >
                {lineMarked ? tr('poem.hardLine') : tr('poem.lineN', { count: li + 1 })}
              </button>
              <div className="flex flex-1 flex-wrap items-end justify-center gap-x-0.5">
                {line.chars.map((ch, k) => {
                  const isHan = ch.p && /[一-龥]/.test(ch.c);
                  if (!isHan) {
                    return (
                      <span key={k} className="px-0.5 text-2xl font-bold text-ink sm:text-[1.7rem]">
                        {ch.c}
                      </span>
                    );
                  }
                  const marked = charSet.has(ch.c);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => mode === 'mark' && toggleChar(poem.id, ch.c)}
                      className={cn(
                        'flex flex-col items-center rounded-md px-0.5 leading-none',
                        marked ? 'ring-2 ring-candy-orange bg-candy-orange-soft' : mode === 'mark' ? 'hover:bg-candy-yellow-soft' : '',
                      )}
                    >
                      {showPinyin && (
                        <span className="mb-0.5 text-[11px] font-semibold text-candy-blue-deep">{ch.p}</span>
                      )}
                      <span className="text-2xl font-bold text-ink sm:text-[1.7rem]">{ch.c}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {has && (
        <p className="text-xs font-bold text-candy-orange-deep">
          {tr('poem.markedSummary', { chars: m.chars.length, lines: m.lines.length })}
        </p>
      )}
    </div>
  );
}

/** 维基文库检索链接（与 allusionSources.sourceSearchLink 同源，用于无溯源条目的兜底） */
function sourceSearchLink(source: string): string {
  const m = source.match(/《([^·》]+)/);
  const q = m ? m[1] : source;
  return EXTERNAL_LINKS.wikisource(q!);
}

/* ---------------- 逐句串讲 + 典故溯源 ---------------- */
export function LineGloss({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  const notes = hasLineNotes(poem.id) ? lineNotesOf(poem.id) : undefined;
  const allusions = poem.dossier?.allusions ?? [];

  return (
    <div className="space-y-4">
      {notes ? (
        <div>
          <p className="mb-2 font-extrabold text-candy-pink-deep">{tr('poem.lineGloss')}</p>
          <div className="space-y-3">
            {notes.map((nt, i) => (
              <div key={`nt-${i}`} className="rounded-2xl bg-white/70 p-3">
                <p className="mb-1 text-base font-extrabold text-ink">{poem.lines[i]?.text}</p>
                <p className="text-sm leading-relaxed text-ink-soft">{nt.gloss}</p>
                {nt.keys && nt.keys.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {nt.keys.map((kv, j) => (
                      <span key={j} className="rounded-full bg-candy-purple-soft px-2.5 py-0.5 text-xs font-bold text-candy-purple-deep">
                        {kv.term}：{kv.note}
                      </span>
                    ))}
                  </div>
                )}
                {nt.point && (
                  <p className="mt-1.5 rounded-xl bg-candy-yellow-soft p-2 text-xs font-bold leading-relaxed text-amber-800">
                    💡 {nt.point}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">{tr('poem.glossPending')}</p>
      )}

      {allusions.length > 0 && (
        <div>
          <p className="mb-2 font-extrabold text-candy-pink-deep">{tr('poem.allusionSource')}</p>
          <div className="space-y-2.5">
            {allusions.map((a, i) => {
              const src = lookupAllusion(a.term);
              return (
                <div key={`a-${i}`} className="rounded-2xl bg-amber-50 p-3">
                  <p className="text-sm font-extrabold text-amber-800">{a.term}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{a.explain}</p>
                  {src ? (
                    <div className="mt-1.5 rounded-xl bg-white/80 p-2 text-xs">
                      <p className="font-bold text-ink">📜 {tr('poem.sourceOf', { source: src.source })}</p>
                      <p className="mt-0.5 italic leading-relaxed text-ink-soft">「{src.quote}」</p>
                      {src.evolve && <p className="mt-1 leading-relaxed text-ink-soft">{src.evolve}</p>}
                      <a
                        href={sourceSearchLink(src.source)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-candy-blue-deep underline"
                      >
                        {tr('poem.verifyLink')}
                      </a>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-ink-soft/70">{tr('poem.noAllusionEntry')}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- 标准谱对照格律 ---------------- */
export function ProsodyGrid({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  const pro: Prosody = useMemo(() => analyzeProsody(poem), [poem]);
  const coupletLines = new Map<number, string>();
  pro.couplets.forEach((c) => c.lines.forEach((ln) => coupletLines.set(ln, c.label)));

  const ruCount = pro.grid.flat().filter((c) => c.ru).length;
  const rhymeFeet = pro.rhymeFeet
    .map((c, i) => (pro.rhymingLines[i] && c ? c + (pro.driftLines[i] ? '*' : '') : null))
    .filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      {/* 起式说明 */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="rounded-full bg-candy-purple-soft px-3 py-1 text-candy-purple-deep">
          {pro.pattern || ((poem.genre ?? '').includes('词') || (poem.genre ?? '').includes('曲') ? tr('poem.ciPattern') : tr('poem.ancientPattern'))}
        </span>
        {pro.yunBu ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">平水韵·{pro.yunBu}</span>
        ) : (
          pro.rhymeGroup && <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{pro.rhymeGroup}</span>
        )}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
        <span className="rounded-full bg-[#EAF2FF] px-2.5 py-1 text-candy-blue-deep">平</span>
        <span className="rounded-full bg-[#FFEAF1] px-2.5 py-1 text-rose-600">仄</span>
        <span className="rounded-full bg-[#FFF3DC] px-2.5 py-1 text-amber-700">{tr('poem.legendEnter')}</span>
        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">{tr('poem.legendRhyme')}</span>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-ink-soft">{tr('poem.legendFlex')}</span>
        <span className="rounded-full bg-rose-200 px-2.5 py-1 text-rose-700">{tr('poem.legendFault')}</span>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">{tr('poem.legendYun')}</span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[300px] gap-3">
          {/* 谱对照主体 */}
          <div className="flex-1 space-y-1">
            {pro.grid.map((line, i) => {
              const stdLine = pro.standardGrid[i];
              const faultAt = new Map<number, ProsodyFault>();
              pro.faults.forEach((f) => {
                if (f.line === i && f.at) f.at.forEach((idx) => faultAt.set(idx, f));
              });
              return (
                <div key={`line-${i}`} className="flex items-center gap-2">
                  <span className="w-9 shrink-0 text-right text-xs font-extrabold text-ink-soft">
                    {coupletLines.get(i) ?? tr('poem.lineN', { count: i + 1 })}
                  </span>
                  <div className="flex flex-1 flex-wrap gap-1">
                    {line.map((cell, k) => {
                      if (cell.level === '') {
                        return (
                          <span key={k} className="min-w-[1.5rem] px-1 text-center text-xl font-bold text-ink">
                            {cell.c}
                          </span>
                        );
                      }
                      const isRhyme = pro.rhymingLines[i] && k === lastHanIndex(line);
                      const fault = faultAt.get(k);
                      const std = stdLine?.[k];
                      return (
                        <div
                          key={k}
                          className={cn(
                            'relative flex min-w-[1.9rem] flex-col items-center rounded-lg px-1 py-0.5 leading-none',
                            fault ? 'ring-2 ring-rose-500' : isRhyme ? (pro.driftLines[i] ? 'ring-2 ring-amber-400' : 'ring-2 ring-emerald-400') : '',
                          )}
                          style={{ background: cell.level === '平' ? '#EAF2FF' : cell.ru ? '#FFF3DC' : '#FFEAF1' }}
                        >
                          {std && (
                            <span className="text-[9px] font-bold text-ink-soft/70">{std === '·' ? '·' : std}</span>
                          )}
                          <span
                            className={cn(
                              'text-[10px] font-bold',
                              cell.level === '平' ? 'text-candy-blue-deep' : cell.ru ? 'text-amber-700' : 'text-rose-600',
                            )}
                          >
                            {cell.ru ? '入' : cell.level}
                          </span>
                          <span className="text-[1.05rem] font-bold text-ink">{cell.c}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 韵脚连线右栏 */}
          {rhymeFeet.length > 0 && (
            <div className="flex w-12 shrink-0 flex-col items-center pt-6">
              <RhymeRail feet={rhymeFeet} />
            </div>
          )}
        </div>
      </div>

      {/* 出律说明 */}
      {pro.faults.length > 0 ? (
        <div className="space-y-1.5 rounded-2xl bg-rose-50 p-3 text-sm">
          <p className="font-extrabold text-rose-700">{tr('poem.faultsFound', { count: pro.faults.length })}</p>
          {pro.faults.map((f, i) => (
            <p key={`f-${i}`} className="leading-relaxed text-ink">
              <span className="font-bold text-rose-600">{tr('poem.faultLine', { line: f.line + 1, type: f.type })}：</span>
              {f.detail}
            </p>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          ✓ {pro.prosodicNote || tr('poem.prosodicOk')}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-ink-soft/80">
        {tr('poem.prosodyNote', { count: ruCount })}
        {pro.yunBu
          ? tr('poem.prosodyNoteYun')
          : pro.driftLines.some(Boolean)
            ? tr('poem.prosodyNoteDrift')
            : ''}
      </p>
    </div>
  );
}

/** 韵脚竖向连线 */
function RhymeRail({ feet }: { feet: string[] }) {
  const { t: tr } = useTranslation();
  return (
    <div className="flex flex-col items-center">
      <svg width="40" height={feet.length * 46} className="overflow-visible">
        <line x1="20" y1="14" x2="20" y2={feet.length * 46 - 14} stroke="#33a863" strokeWidth="2.5" strokeDasharray="4 4" />
        {feet.map((c, i) => (
          <g key={`c-${i}`} transform={`translate(20,${i * 46 + 14})`}>
            <circle r="13" fill="#f0faf4" stroke="#33a863" strokeWidth="2.5" />
            <text textAnchor="middle" dy="5" fontSize="15" fontWeight="bold" fill="#33a863">
              {c}
            </text>
          </g>
        ))}
      </svg>
      <span className="mt-1 text-[10px] font-bold text-emerald-700">{tr('poem.sameRhyme')}</span>
    </div>
  );
}

function lastHanIndex(line: { c: string; level: string }[]): number {
  for (let k = line.length - 1; k >= 0; k--) if (line[k]!.level !== '') return k;
  return -1;
}

/* ---------------- 诗人史料卡片 ---------------- */
export function PoetCard({ poem }: { poem: DeepPoem }) {
  const { t: tr } = useTranslation();
  const poet = hasPoet(poem.author) ? poetOf(poem.author) : undefined;

  if (!poet) {
    const q = encodeURIComponent(poem.author);
    return (
      <div className="rounded-2xl bg-white/70 p-4 text-sm text-ink-soft">
        <p className="font-extrabold text-ink">{tr('poem.poetLine', { author: poem.author, dynasty: poem.dynasty })}</p>
        <p className="mt-1">{poem.authorBio}</p>
        <p className="mt-2 text-xs">
          {tr('poem.noPoetArchive')}
          <a href={EXTERNAL_LINKS.wikisource(q)} target="_blank" rel="noopener noreferrer" className="text-candy-blue-deep underline">
            {tr('poem.wikisourceLink')}
          </a>
          或
          <a href={EXTERNAL_LINKS.ctext(q)} target="_blank" rel="noopener noreferrer" className="text-candy-blue-deep underline">
            {tr('poem.ctextLink')}
          </a>
          {tr('poem.verifySuffix')}
        </p>
      </div>
    );
  }

  const links = poetLinks(poem.author);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl bg-white/70 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-candy-purple-soft text-2xl font-extrabold text-candy-purple-deep">
          {poem.author.slice(0, 1)}
        </div>
        <div>
          <p className="text-lg font-extrabold text-ink">{poet.name}</p>
          <p className="text-xs font-bold text-ink-soft">{poet.life} · {poet.dynasty}{poet.style ? ` · ${poet.style}` : ''}</p>
          {poet.epithet && <p className="text-[11px] font-bold text-candy-pink-deep">{poet.epithet}</p>}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-ink">{poet.bio}</p>

      {/* 年表 */}
      <div>
        <p className="mb-1 text-sm font-extrabold text-candy-pink-deep">{tr('poem.poetLife')}</p>
        <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
          {poet.timeline.map((t: { year: string; event: string }, i: number) => (
            <div key={`item-${i}`} className="flex gap-2 text-xs">
              <span className="shrink-0 font-extrabold text-candy-blue-deep">{t.year}</span>
              <span className="text-ink-soft">{t.event}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 艺术风格 */}
      <div>
        <p className="mb-0.5 text-sm font-extrabold text-candy-pink-deep">{tr('poem.poetStyle')}</p>
        <p className="text-sm leading-relaxed text-ink-soft">{poet.art}</p>
      </div>

      {/* 代表作 */}
      <div>
        <p className="mb-1 text-sm font-extrabold text-candy-pink-deep">{tr('poem.poetWorks')}</p>
        <div className="flex flex-wrap gap-1.5">
          {poet.works.map((w: string, i: number) => (
            <span key={`item-${i}`} className="rounded-full bg-candy-green-soft px-2.5 py-0.5 text-xs font-bold text-candy-green-deep">{w}</span>
          ))}
        </div>
      </div>

      {/* 史料链接 */}
      <div>
        <p className="mb-1 text-sm font-extrabold text-candy-pink-deep">{tr('poem.poetSources')}</p>
        <div className="space-y-1.5">
          {poet.sources.map((s: { title: string; note?: string }, i: number) => (
            <p key={`item-${i}`} className="text-xs text-ink-soft">
              📚 {s.title}{s.note && <span className="text-ink-soft/70">（{s.note}）</span>}
            </p>
          ))}

        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {links.map((l, i) => (
            <a
              key={`l-${i}`}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              title={l.note}
              className="rounded-full bg-candy-blue-soft px-3 py-1 text-xs font-bold text-candy-blue-deep hover:brightness-105"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
