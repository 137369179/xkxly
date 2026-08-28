/**
 * 🦕 恐龙世界
 * ------------------------------------------------------------
 * 10 种恐龙卡片 + SVG 体型对比 + AI 讲解
 */
import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { DINOSAURS, type DinoItem } from '@/data/dinosaurs';
import { ScienceAiPanel } from './ScienceAiPanel';
import { useTranslation } from '@/i18n/useTranslation';

const ERA_COLORS: Record<string, string> = {
  三叠纪: 'bg-orange-100 text-orange-700 border-orange-300',
  侏罗纪: 'bg-green-100 text-green-700 border-green-300',
  白垩纪: 'bg-purple-100 text-purple-700 border-purple-300',
};

const DIET_COLORS: Record<string, string> = {
  肉食: 'bg-red-100 text-red-700',
  草食: 'bg-green-100 text-green-700',
  杂食: 'bg-yellow-100 text-yellow-700',
};

function DinoCard({ dino, onClose }: { dino: DinoItem; onClose: () => void }) {
  const { t: tr } = useTranslation();
  return (
    <Panel className="border-2 border-green-300 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <button onClick={() => { sfxTap(); onClose(); }} className="mb-3 text-xs font-bold text-green-700 hover:text-green-900">
        {tr('dinoWorld.backToList')}
      </button>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          className="flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl bg-white text-6xl shadow-fluffy border-4 border-green-200"
        >
          {dino.emoji}
        </motion.div>
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="text-4xl font-black leading-tight text-green-900 sm:text-5xl">{dino.nameZh}</h3>
            <span className="text-lg font-extrabold text-emerald-700">{dino.nameEn}</span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">{dino.phonics}</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-bold', ERA_COLORS[dino.era])}>{dino.era}</span>
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', DIET_COLORS[dino.diet])}>{dino.diet}</span>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">📍 {dino.discoveredIn}</span>
          </div>
          <p className="text-sm font-bold text-green-800">{dino.desc}</p>
          <div className="grid grid-cols-3 gap-2 max-w-xs">
            <div className="rounded-xl bg-white/80 p-2 text-center border border-green-200">
              <p className="text-xs font-bold text-ink-muted">{tr('dinoWorld.length')}</p>
              <p className="text-sm font-black text-green-700">{dino.length}m</p>
            </div>
            <div className="rounded-xl bg-white/80 p-2 text-center border border-green-200">
              <p className="text-xs font-bold text-ink-muted">{tr('dinoWorld.weight')}</p>
              <p className="text-sm font-black text-green-700">{dino.weight}t</p>
            </div>
            <div className="rounded-xl bg-white/80 p-2 text-center border border-green-200">
              <p className="text-xs font-bold text-ink-muted">{tr('dinoWorld.height')}</p>
              <p className="text-sm font-black text-green-700">{dino.height}m</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 p-3 text-xs font-semibold text-teal-800 border border-green-200">
            💡 {dino.funFact}
          </div>
          <div className="rounded-2xl bg-yellow-50 p-2 text-xs font-bold text-orange-800 border border-yellow-200">
            🎵 {dino.chant}
          </div>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <CandyButton tone="green" size="sm" onClick={() => { sfxTap(); speak(`${dino.nameZh}。${dino.desc}`, { lang: 'zh-CN' }); }}>{tr('dinoWorld.chinese')}</CandyButton>
            <CandyButton tone="blue" size="sm" onClick={() => { sfxTap(); speak(dino.nameEn, { lang: 'en-US', rate: 0.85 }); }}>{tr('dinoWorld.english')}</CandyButton>
            <CandyButton tone="orange" size="sm" onClick={() => { sfxTap(); speak(dino.chant, { lang: 'zh-CN', rate: 0.9 }); }}>{tr('dinoWorld.chant')}</CandyButton>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <ScienceAiPanel
          topic={{
            id: `sci-dino-${dino.id}`,
            emoji: dino.emoji,
            label: dino.nameZh,
            stars: 1,
            tags: ['科学', '历史'],
            prompt: dino.aiPrompt,
            fallback: dino.aiFallback,
          }}
        />
      </div>
    </Panel>
  );
}

/** SVG 恐龙体型对比图 */
function DinoCompare() {
  const { t: tr } = useTranslation();
  const [selected, setSelected] = useState<DinoItem>(DINOSAURS[0]!);
  const humanHeight = 1.7;
  const maxHeight = 13; // 腕龙 12m
  const scale = 200 / maxHeight; // SVG 高度 200px

  const dinoSvgHeight = Math.min(selected.height * scale, 200);
  const dinoSvgLength = Math.min(selected.length * scale * 0.5, 180);

  return (
    <Panel className="border-2 border-green-200 bg-white/80">
      <h3 className="mb-3 text-center text-lg font-extrabold text-green-900">{tr('dinoWorld.compareTitle')}</h3>
      <p className="mb-3 text-center text-xs text-ink-soft">{tr('dinoWorld.compareDesc')}</p>

      <div className="mb-3 flex flex-wrap justify-center gap-1.5">
        {DINOSAURS.map(d => (
          <button
            key={d.id}
            onClick={() => { sfxTap(); setSelected(d); }}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-bold transition-all',
              selected.id === d.id ? 'bg-green-500 text-white shadow-md' : 'bg-white text-ink-soft hover:bg-green-50'
            )}
          >
            {d.emoji} {d.nameZh}
          </button>
        ))}
      </div>

      <div className="relative mx-auto flex max-w-md items-end justify-center gap-6 rounded-2xl bg-gradient-to-b from-sky-50 to-green-50 p-4" style={{ minHeight: '260px' }}>
        {/* 人 */}
        <div className="flex flex-col items-center">
          <svg width="30" height={humanHeight * scale} viewBox={`0 0 30 ${humanHeight * scale}`}>
            <circle cx="15" cy="10" r="8" fill="#FFD8A8" />
            <rect x="10" y="18" width="10" height={humanHeight * scale - 40} fill="#55aee0" rx="3" />
            <rect x="5" y={humanHeight * scale - 25} width="6" height="22" fill="#333" rx="2" />
            <rect x="19" y={humanHeight * scale - 25} width="6" height="22" fill="#333" rx="2" />
          </svg>
          <span className="mt-1 text-xs font-bold text-ink-soft">1.7m</span>
        </div>

        {/* 恐龙 */}
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="text-4xl" style={{ fontSize: `${Math.max(2, Math.min(8, selected.height / 2))}rem` }}>
            {selected.emoji}
          </div>
          <div
            className="rounded-t-full bg-green-300/40"
            style={{ width: `${dinoSvgLength}px`, height: `${dinoSvgHeight * 0.3}px` }}
          />
          <span className="mt-1 text-xs font-bold text-green-700">
            {selected.length}m / {selected.height}m / {selected.weight}t
          </span>
        </motion.div>
      </div>

      <div className="mt-3 rounded-xl bg-yellow-50 p-2 text-center text-xs font-bold text-orange-800 border border-yellow-200">
        💡 {selected.compareNote}
      </div>
    </Panel>
  );
}

function DinoWorldImpl() {
  const { t: tr } = useTranslation();
  const [selected, setSelected] = useState<DinoItem | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const list = filter
    ? DINOSAURS.filter(d => d.era === filter || d.diet === filter)
    : DINOSAURS;

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => { sfxTap(); setFilter(null); }}
          className={cn('rounded-lg px-2.5 py-1 text-xs font-bold', !filter ? 'bg-green-500 text-white' : 'bg-white text-ink-soft shadow-sm')}
        >
          {tr('common.all')}
        </button>
        {['侏罗纪', '白垩纪', '肉食', '草食'].map(f => (
          <button
            key={f}
            onClick={() => { sfxTap(); setFilter(f); }}
            className={cn('rounded-lg px-2.5 py-1 text-xs font-bold', filter === f ? 'bg-green-500 text-white' : 'bg-white text-ink-soft shadow-sm')}
          >
            {f}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {selected ? (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <DinoCard dino={selected} onClose={() => setSelected(null)} />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 恐龙卡片网格 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {list.map(dino => (
                <button
                  key={dino.id}
                  onClick={() => { sfxTap(); setSelected(dino); }}
                  className="flex flex-col items-center justify-center rounded-3xl border-2 border-green-200 bg-white p-4 text-center shadow-candy-sm transition-all hover:scale-105 active:scale-95"
                >
                  <span className="text-5xl">{dino.emoji}</span>
                  <span className="mt-2 text-base font-black text-ink">{dino.nameZh}</span>
                  <span className="text-xs font-bold text-emerald-600">{dino.nameEn}</span>
                  <div className="mt-1 flex gap-1">
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[8px] font-bold', DIET_COLORS[dino.diet])}>{dino.diet}</span>
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">{dino.length}m</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 体型对比 */}
      {!selected && <DinoCompare />}
    </div>
  );
}

export const DinoWorld = memo(DinoWorldImpl);
