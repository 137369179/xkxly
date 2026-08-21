/**
 * 汉字写字帖 · 田字格打印
 * ------------------------------------------------------------------
 * 选字 → 生成田字格练字帖（拼音 + 笔顺 + 描红 + 空格）
 * 支持打印 A4
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { sfxTap } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { type HanziEntry } from '@/data/hanzi';
import { getHanziByLevel } from '@/data/hanziIndex';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/study/AdaptiveDifficultyHint';
import { useTranslation } from '@/i18n/useTranslation';
import { ExploreReward } from '@/components/study/ExploreReward';


type Tab = 'worksheet' | 'picker';

const COLS = 6;
const ROWS_PER_CHAR = 2;

function TianGrid({ char, showGuide = true }: { char: string; showGuide?: boolean }) {
  return (
    <div className="relative aspect-square border-2 border-candy-green-deep/40 bg-white">
      {showGuide && (
        <>
          <div className="absolute left-1/2 top-0 h-full w-px bg-candy-green-deep/20" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-candy-green-deep/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-extrabold text-candy-green-deep/15 select-none">{char}</span>
          </div>
        </>
      )}
      {!showGuide && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-extrabold text-transparent select-none">{char}</span>
        </div>
      )}
    </div>
  );
}

export function HanziWorksheet() {
  const { t: tr } = useTranslation();
  const [tab, setTab] = useState<Tab>('picker');
  const [level, setLevel, levelMeta] = useAdaptiveDifficultyState('hanzi');
  const [selected, setSelected] = useState<HanziEntry[]>([]);
  const [printMode, setPrintMode] = useState(false);
  const printTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 卸载时清理打印定时器
  useEffect(() => () => {
    if (printTimerRef.current) clearTimeout(printTimerRef.current);
  }, []);

  const list = useMemo(() => getHanziByLevel(level), [level]);

  const toggleChar = (h: HanziEntry) => {
    sfxTap();
    setSelected(prev => {
      if (prev.find(x => x.c === h.c)) return prev.filter(x => x.c !== h.c);
      if (prev.length >= 12) return prev;
      return [...prev, h];
    });
  };

  const startPrint = () => {
    sfxTap();
    setPrintMode(true);
    if (printTimerRef.current) clearTimeout(printTimerRef.current);
    printTimerRef.current = setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 300);
  };

  if (printMode) {
    return (
      <div className="print-worksheet bg-white p-8" style={{ width: '210mm', minHeight: '297mm' }}>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black">{tr('hanziWorksheet.printTitle')}</h1>
          <p className="text-sm text-gray-500">{tr('hanziWorksheet.printName')}</p>
        </div>
        {selected.map(h => (
          <div key={h.c} className="mb-6 break-inside-avoid">
            <div className="mb-2 flex items-baseline gap-3">
              <span className="text-2xl font-black">{h.c}</span>
              <span className="text-sm text-gray-600">{h.p} · {h.radical}部 · {h.strokes}画</span>
            </div>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: COLS * ROWS_PER_CHAR }).map((_, i) => (
                <div key={`_-${i}`} className="relative aspect-square border border-gray-400">
                  <div className="absolute left-1/2 top-0 h-full w-px bg-gray-200" />
                  <div className="absolute top-1/2 left-0 w-full h-px bg-gray-200" />
                  {i < 2 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-extrabold text-gray-200">{h.c}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'worksheet' && selected.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-ink">{tr('hanziWorksheet.selected', { count: String(selected.length) })}</h3>
          <div className="flex gap-2">
            <CandyButton tone="purple" variant="soft" size="sm" onClick={() => { setTab('picker'); }}>
              {tr('hanziWorksheet.continue')}
            </CandyButton>
            <CandyButton tone="green" size="sm" onClick={startPrint}>
              {tr('hanziWorksheet.print')}
            </CandyButton>
          </div>
        </div>

        {selected.map(h => (
          <Panel key={h.c}>
            <div className="mb-2 flex items-baseline gap-3">
              <span className="text-3xl font-black text-ink">{h.c}</span>
              <span className="text-sm font-bold text-ink-soft">{h.p} · {h.radical}部 · {h.strokes}画</span>
              <button aria-label="🔊" onClick={() => speak(h.p, { rate: 0.6 })} className="text-sm text-candy-blue-deep">🔊</button>
            </div>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
              {Array.from({ length: COLS * ROWS_PER_CHAR }).map((_, i) => (
                <TianGrid key={`_-${i}`} char={h.c} showGuide={i < 2} />
              ))}
            </div>
            <p className="mt-2 text-xs font-bold text-ink-soft">
              {h.words.join('、')} · {h.origin.slice(0, 20)}…
            </p>
          </Panel>
        ))}
      </div>
    );
  }

  // Picker
  return (
    <div className="space-y-4">
      <PageHeader emoji="✍️" title={tr('hanziWorksheet.title')} subtitle={tr('hanziWorksheet.subtitle')} tone="green" />
      <Tabs
        items={[
          { id: 'worksheet', label: tr('hanziWorksheet.tabWorksheet'), emoji: '✍️' },
          { id: 'picker', label: tr('hanziWorksheet.tabPicker'), emoji: '🔍' },
        ]}
        value={tab}
        onChange={setTab}
        tone="green"
        layoutId="worksheet-tabs"
      />

      <div className="space-y-2">
        <div className="flex gap-2">
          {([1, 2, 3] as const).map(l => (
            <CandyButton
              key={l}
              tone={level === l ? 'green' : 'purple'}
              variant={level === l ? 'solid' : 'soft'}
              size="sm"
              onClick={() => { sfxTap(); setLevel(l); }}
            >
              {l === 1 ? tr('hanziWorksheet.level1') : l === 2 ? tr('hanziWorksheet.level2') : tr('hanziWorksheet.level3')}
            </CandyButton>
          ))}
        </div>
        <AdaptiveDifficultyHint
          meta={levelMeta}
          labels={{ 1: tr('hanziWorksheet.level1'), 2: tr('hanziWorksheet.level2'), 3: tr('hanziWorksheet.level3') }}
        />
      </div>

      {selected.length > 0 && (
        <CandyButton tone="green" size="lg" fullWidth onClick={() => setTab('worksheet')}>
          {tr('hanziWorksheet.view', { count: String(selected.length) })}
        </CandyButton>
      )}

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
        {list.map(h => {
          const picked = selected.find(x => x.c === h.c);
          return (
            <button
              key={h.c}
              onClick={() => toggleChar(h)}
              className={`flex flex-col items-center rounded-xl p-2 min-h-[60px] transition-all active:translate-y-[1px] ${
                picked ? 'bg-candy-green-soft ring-2 ring-candy-green-deep' : 'bg-white/60'
              }`}
            >
              <span className="text-2xl font-black text-ink">{h.c}</span>
              <span className="text-[10px] font-bold text-ink-soft">{h.p}</span>
              {picked && <span className="text-xs">✅</span>}
            </button>
          );
        })}
      </div>
    
      <ExploreReward rewardKey="hanzi-worksheet" scene="hanzi" tone="blue" /></div>
  );
}
