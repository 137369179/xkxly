/**
 * 🦁 动物百科世界
 * ------------------------------------------------------------
 * 50 种动物卡片 + 分类筛选 + 栖息地地图 + AI 讲解
 */
import { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import {
  ANIMALS,
  ANIMALS_BY_CLASS,
  ANIMAL_CLASSES,
  SIZE_LABELS,
  CONSERVATION_COLORS,
  type AnimalItem,
} from '@/data/animals';
import { ScienceAiPanel } from './ScienceAiPanel';
import { useTranslation } from '@/i18n/useTranslation';

const CLASS_EMOJI: Record<string, string> = {
  哺乳: '🦁',
  鸟类: '🦅',
  爬行: '🐍',
  两栖: '🐸',
  鱼类: '🐠',
  昆虫: '🐝',
};

const HABITAT_EMOJI: Record<string, string> = {
  草原: '🌾',
  森林: '🌲',
  海洋: '🌊',
  南极: '🐧',
  北极: '❄️',
  沙漠: '🏜️',
  竹林: '🎋',
  池塘: '💧',
  天空: '☁️',
  花园: '🌸',
  山地: '⛰️',
  河流: '🏞️',
};

/** 分类 -> i18n key（数据值保持中文，仅显示处翻译） */
const CLASS_KEY: Record<string, string> = {
  哺乳: 'animalWorld.classMammal',
  鸟类: 'animalWorld.classBird',
  爬行: 'animalWorld.classReptile',
  两栖: 'animalWorld.classAmphibian',
  鱼类: 'animalWorld.classFish',
  昆虫: 'animalWorld.classInsect',
};

/** 栖息地 -> i18n key */
const HABITAT_KEY: Record<string, string> = {
  草原: 'animalWorld.habitatGrassland',
  森林: 'animalWorld.habitatForest',
  海洋: 'animalWorld.habitatOcean',
  南极: 'animalWorld.habitatAntarctica',
  北极: 'animalWorld.habitatArctic',
  沙漠: 'animalWorld.habitatDesert',
  竹林: 'animalWorld.habitatBamboo',
  池塘: 'animalWorld.habitatPond',
  天空: 'animalWorld.habitatSky',
  花园: 'animalWorld.habitatGarden',
  山地: 'animalWorld.habitatMountain',
  河流: 'animalWorld.habitatRiver',
};

/** 动物详情卡 */
function AnimalDetail({ animal, onClose }: { animal: AnimalItem; onClose: () => void }) {
  const { t: tr } = useTranslation();
  return (
    <Panel className="border-2 border-green-300 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <button
        onClick={() => { sfxTap(); onClose(); }}
        className="mb-3 text-xs font-bold text-green-700 hover:text-green-900"
      >
        {tr('animalWorld.backToList')}
      </button>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          className="flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl bg-white text-6xl shadow-fluffy border-4 border-green-200"
        >
          {animal.emoji}
        </motion.div>
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="text-2xl font-black text-green-900">{animal.nameZh}</h3>
            <span className="text-lg font-extrabold text-emerald-700">{animal.nameEn}</span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">{animal.phonics}</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              {CLASS_EMOJI[animal.animalClass]} {tr(CLASS_KEY[animal.animalClass] ?? '')}
            </span>
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
              {HABITAT_EMOJI[animal.habitat]} {tr(HABITAT_KEY[animal.habitat] ?? '')}
            </span>
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
              🍖 {animal.diet}
            </span>
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', CONSERVATION_COLORS[animal.conservationStatus])}>
              {animal.conservationStatus}
            </span>
          </div>
          <p className="text-sm font-bold text-green-800">{animal.desc}</p>
          <div className="grid grid-cols-2 gap-2 max-w-xs">
            <div className="rounded-xl bg-white/80 p-2 text-center border border-green-200">
              <p className="text-[10px] font-bold text-ink-muted">{tr('animalWorld.sizeLabel')}</p>
              <p className="text-sm font-black text-green-700">{SIZE_LABELS[animal.sizeLevel]}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-2 text-center border border-green-200">
              <p className="text-[10px] font-bold text-ink-muted">{tr('animalWorld.soundLabel')}</p>
              <p className="text-sm font-black text-green-700">{animal.sound}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 p-3 text-xs font-semibold text-teal-800 border border-green-200">
            💡 {animal.funFact}
          </div>
          <div className="rounded-2xl bg-yellow-50 p-2 text-xs font-bold text-orange-800 border border-yellow-200">
            🎵 {animal.chant}
          </div>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <CandyButton tone="green" size="sm" onClick={() => { sfxTap(); speak(`${animal.nameZh}。${animal.desc}`, { lang: 'zh-CN' }); }}>{tr('animalWorld.listenZh')}</CandyButton>
            <CandyButton tone="blue" size="sm" onClick={() => { sfxTap(); speak(animal.nameEn, { lang: 'en-US', rate: 0.85 }); }}>{tr('animalWorld.listenEn')}</CandyButton>
            <CandyButton tone="orange" size="sm" onClick={() => { sfxTap(); speak(animal.chant, { lang: 'zh-CN', rate: 0.9 }); }}>{tr('animalWorld.listenChant')}</CandyButton>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <ScienceAiPanel
          topic={{
            id: `sci-animal-${animal.id}`,
            emoji: animal.emoji,
            label: animal.nameZh,
            stars: 1,
            tags: ['科学', '认知'],
            prompt: animal.aiPrompt,
            fallback: animal.aiFallback,
          }}
        />
      </div>
    </Panel>
  );
}

/** 栖息地地图 */
function HabitatMap() {
  const { t: tr } = useTranslation();
  const [hovered, setHovered] = useState<string | null>(null);

  const animalsWithCoords = ANIMALS.filter(a => a.habitatCoord);

  // 按栖息地分组
  const habitatGroups = useMemo(() => {
    const groups: Record<string, AnimalItem[]> = {};
    for (const a of animalsWithCoords) {
      const key = a.habitat;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }
    return groups;
  }, []);

  return (
    <Panel className="border-2 border-green-200 bg-white/80">
      <h3 className="mb-2 text-center text-lg font-extrabold text-green-900">{tr('animalWorld.mapTitle')}</h3>
      <p className="mb-3 text-center text-xs text-ink-soft">{tr('animalWorld.mapHint')}</p>

      <div className="relative mx-auto max-w-md rounded-2xl bg-gradient-to-b from-sky-100 to-green-100 p-2" style={{ aspectRatio: '2 / 1' }}>
        {/* 简化世界地图 SVG 背景 */}
        <svg viewBox="0 0 100 50" className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)]" preserveAspectRatio="none">
          {/* 北美洲 */}
          <path d="M 10 10 Q 25 8 30 15 Q 28 25 20 28 Q 12 25 8 18 Z" fill="#8BC34A" opacity="0.5" />
          {/* 南美洲 */}
          <path d="M 25 30 Q 30 28 32 35 Q 30 45 26 48 Q 22 42 24 33 Z" fill="#8BC34A" opacity="0.5" />
          {/* 欧洲 */}
          <path d="M 48 12 Q 55 10 58 16 Q 55 20 50 19 Q 46 17 48 12 Z" fill="#8BC34A" opacity="0.5" />
          {/* 非洲 */}
          <path d="M 50 22 Q 58 20 60 30 Q 58 40 53 45 Q 48 40 48 30 Z" fill="#8BC34A" opacity="0.5" />
          {/* 亚洲 */}
          <path d="M 60 10 Q 80 8 85 20 Q 82 28 70 26 Q 62 22 60 14 Z" fill="#8BC34A" opacity="0.5" />
          {/* 澳大利亚 */}
          <path d="M 80 35 Q 88 33 90 40 Q 86 43 82 42 Z" fill="#8BC34A" opacity="0.5" />
          {/* 南极 */}
          <ellipse cx="50" cy="49" rx="35" ry="3" fill="#E0E0E0" opacity="0.6" />
        </svg>

        {/* 动物标记 */}
        {animalsWithCoords.map(a => (
          <button
            key={a.id}
            onClick={() => { sfxTap(); setHovered(hovered === a.id ? null : a.id); }}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-lg transition-transform hover:scale-150"
            style={{
              left: `${a.habitatCoord!.x}%`,
              top: `${a.habitatCoord!.y}%`,
            }}
            title={a.nameZh}
          >
            {a.emoji}
          </button>
        ))}
      </div>

      {/* Hover 详情 */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-2 rounded-xl bg-white p-2 text-center shadow-sm"
          >
            {(() => {
              const a = ANIMALS.find(x => x.id === hovered)!;
              return (
                <>
                  <span className="text-2xl">{a.emoji}</span>
                  <span className="ml-1 text-sm font-extrabold text-green-800">{a.nameZh}</span>
                  <span className="ml-1 text-xs text-ink-soft">{HABITAT_EMOJI[a.habitat]} {tr(HABITAT_KEY[a.habitat] ?? '')}</span>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 栖息地图例 */}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {Object.keys(habitatGroups).map(h => (
          <span key={h} className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
            {HABITAT_EMOJI[h]} {tr(HABITAT_KEY[h] ?? '')} ({habitatGroups[h]!.length})
          </span>
        ))}
      </div>
    </Panel>
  );
}

function _AnimalWorld() {
  const { t: tr } = useTranslation();
  const [selected, setSelected] = useState<AnimalItem | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const list = filter
    ? ANIMALS.filter(a => a.animalClass === filter)
    : ANIMALS;

  return (
    <div className="space-y-4">
      {/* 切换列表/地图 */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => { sfxTap(); setShowMap(false); }}
          className={cn('rounded-xl px-4 py-2 text-sm font-extrabold transition-all', !showMap ? 'bg-green-400 text-white shadow-md' : 'bg-white text-ink-soft shadow-sm')}
        >
          {tr('animalWorld.tabList')}
        </button>
        <button
          onClick={() => { sfxTap(); setShowMap(true); }}
          className={cn('rounded-xl px-4 py-2 text-sm font-extrabold transition-all', showMap ? 'bg-green-400 text-white shadow-md' : 'bg-white text-ink-soft shadow-sm')}
        >
          {tr('animalWorld.tabMap')}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showMap ? (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <HabitatMap />
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* 分类筛选 */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { sfxTap(); setFilter(null); }}
                className={cn('rounded-lg px-2.5 py-1 text-xs font-bold', !filter ? 'bg-green-500 text-white' : 'bg-white text-ink-soft shadow-sm')}
              >
                {tr('animalWorld.all', { count: String(ANIMALS.length) })}
              </button>
              {ANIMAL_CLASSES.map(cls => (
                <button
                  key={cls}
                  onClick={() => { sfxTap(); setFilter(cls); }}
                  className={cn('rounded-lg px-2.5 py-1 text-xs font-bold', filter === cls ? 'bg-green-500 text-white' : 'bg-white text-ink-soft shadow-sm')}
                >
                  {CLASS_EMOJI[cls]} {tr(CLASS_KEY[cls] ?? '')} ({ANIMALS_BY_CLASS[cls].length})
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
                  className="mt-3"
                >
                  <AnimalDetail animal={selected} onClose={() => setSelected(null)} />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-3"
                >
                  {/* 动物卡片网格 */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {list.map(animal => (
                      <button
                        key={animal.id}
                        onClick={() => { sfxTap(); setSelected(animal); }}
                        className="flex flex-col items-center justify-center rounded-3xl border-2 border-green-200 bg-white p-3 text-center shadow-candy-sm transition-all hover:scale-105 active:scale-95 min-h-[48px]"
                      >
                        <span className="text-4xl">{animal.emoji}</span>
                        <span className="mt-1 text-sm font-black text-ink">{animal.nameZh}</span>
                        <span className="text-[10px] font-bold text-emerald-600">{animal.nameEn}</span>
                        <div className="mt-1 flex gap-1">
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">
                            {HABITAT_EMOJI[animal.habitat]} {tr(HABITAT_KEY[animal.habitat] ?? '')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const AnimalWorld = memo(_AnimalWorld);
