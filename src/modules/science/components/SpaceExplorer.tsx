/**
 * 🪐 太空探索（Three.js 3D 太阳系）
 * ------------------------------------------------------------
 * 懒加载 Planet3D 组件，2D 降级方案
 */
import { memo, useState, Suspense, lazy, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { PLANETS, type PlanetItem } from '@/data/space';
import { ScienceAiPanel } from './ScienceAiPanel';
import { useTranslation } from '@/i18n/useTranslation';

// 懒加载 3D 场景
const Planet3D = lazy(() => import('./Planet3D'));

function PlanetDetail({ planet, onClose }: { planet: PlanetItem; onClose: () => void }) {
  const { t: tr } = useTranslation();
  return (
    <Panel className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <button onClick={() => { sfxTap(); triggerHaptic(20); onClose(); }} className="mb-3 text-xs font-bold text-blue-700 hover:text-blue-900">
        {tr('spaceExplorer.backToList')}
      </button>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <motion.div
          initial={{ scale: 0.5, rotate: 360 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6 }}
          className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-white text-6xl shadow-fluffy border-4 border-blue-200"
          style={{ background: `radial-gradient(circle, ${planet.model3D.color}40, white)` }}
        >
          {planet.emoji}
        </motion.div>
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="text-4xl font-black leading-tight text-blue-900 sm:text-5xl">{planet.nameZh}</h3>
            <span className="text-lg font-extrabold text-indigo-700">{planet.nameEn}</span>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800">{planet.phonics}</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {planet.bodyType === 'star' && <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-700">{tr('spaceExplorer.star')}</span>}
            {planet.bodyType === 'planet' && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{tr('spaceExplorer.planetNo', { order: planet.order })}</span>}
            {planet.bodyType === 'moon' && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-700">{tr('spaceExplorer.moon')}</span>}
          </div>
          <p className="text-sm font-bold text-blue-800">{planet.desc}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl bg-white/80 p-2 text-center border border-blue-200">
              <p className="text-xs font-bold text-ink-muted">{tr('spaceExplorer.diameter')}</p>
              <p className="text-xs font-black text-blue-700">{planet.diameter.toLocaleString()}km</p>
            </div>
            <div className="rounded-xl bg-white/80 p-2 text-center border border-blue-200">
              <p className="text-xs font-bold text-ink-muted">{tr('spaceExplorer.distanceFromSun')}</p>
              <p className="text-xs font-black text-blue-700">{planet.distanceAU} AU</p>
            </div>
            <div className="rounded-xl bg-white/80 p-2 text-center border border-blue-200">
              <p className="text-xs font-bold text-ink-muted">{tr('spaceExplorer.orbitalPeriod')}</p>
              <p className="text-xs font-black text-blue-700">{planet.orbitalPeriod}{tr('spaceExplorer.days')}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-2 text-center border border-blue-200">
              <p className="text-xs font-bold text-ink-muted">{tr('spaceExplorer.moons')}</p>
              <p className="text-xs font-black text-blue-700">{planet.moons}{tr('spaceExplorer.moonCount')}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/80 p-3 text-xs font-semibold text-indigo-800 border border-blue-200">
            💡 {planet.funFact}
          </div>
          <div className="rounded-2xl bg-yellow-50 p-2 text-xs font-bold text-orange-800 border border-yellow-200">
            🎵 {planet.chant}
          </div>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <CandyButton tone="blue" size="sm" onClick={() => { sfxTap(); triggerHaptic(20); speak(`${planet.nameZh}。${planet.desc}`, { lang: 'zh-CN' }); }}>{tr('spaceExplorer.chinese')}</CandyButton>
            <CandyButton tone="green" size="sm" onClick={() => { sfxTap(); triggerHaptic(20); speak(planet.nameEn, { lang: 'en-US', rate: 0.85 }); }}>{tr('spaceExplorer.english')}</CandyButton>
            <CandyButton tone="orange" size="sm" onClick={() => { sfxTap(); triggerHaptic(20); speak(planet.chant, { lang: 'zh-CN', rate: 0.9 }); }}>{tr('spaceExplorer.chant')}</CandyButton>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <ScienceAiPanel
          topic={{
            id: `sci-space-${planet.id}`,
            emoji: planet.emoji,
            label: planet.nameZh,
            stars: planet.bodyType === 'star' ? 2 : 1,
            tags: ['科学', '地理'],
            prompt: planet.aiPrompt,
            fallback: planet.aiFallback,
          }}
        />
      </div>
    </Panel>
  );
}

function SpaceExplorerImpl() {
  const { t: tr } = useTranslation();
  const [selected, setSelected] = useState<PlanetItem | null>(null);
  const [show3D, setShow3D] = useState(false);

  const handleSelectPlanet = useCallback((planet: PlanetItem) => {
    sfxTap();
    triggerHaptic(20);
    setSelected(planet);
  }, []);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const p = PLANETS[idx];
        if (p) {
          e.preventDefault();
          handleSelectPlanet(p);
        }
      } else if (e.key === 'Escape') {
        if (selected) {
          e.preventDefault();
          sfxTap();
          triggerHaptic(20);
          setSelected(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, handleSelectPlanet]);

  return (
    <div className="space-y-4">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-blue-900 font-bold bg-blue-50/90 px-3 py-1 rounded-xl border border-blue-200">
          ⌨️ 键盘快捷操作：数字键 1-9 挑选太阳系天体 · Esc 返回星空概览
        </span>
      </div>

      {/* 3D 太阳系切换 */}
      <div className="flex justify-center gap-2">
        <CandyButton
          tone="blue"
          size="sm"
          onClick={() => { sfxTap(); triggerHaptic(20); setShow3D(!show3D); }}
        >
          {show3D ? tr('spaceExplorer.planetList') : tr('spaceExplorer.solarSystem3D')}
        </CandyButton>
      </div>

      <AnimatePresence mode="wait">
        {show3D ? (
          <motion.div
            key="3d"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Panel className="border-2 border-blue-300 bg-gradient-to-b from-indigo-950 to-blue-950 p-0 overflow-hidden">
              <div className="relative" style={{ height: '420px' }}>
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <div className="mb-3 flex justify-center gap-1">
                          <span className="h-3 w-3 animate-bounce rounded-full bg-yellow-300" style={{ animationDelay: '0ms' }} />
                          <span className="h-3 w-3 animate-bounce rounded-full bg-yellow-300" style={{ animationDelay: '150ms' }} />
                          <span className="h-3 w-3 animate-bounce rounded-full bg-yellow-300" style={{ animationDelay: '300ms' }} />
                        </div>
                        <p className="text-sm font-bold text-blue-200">{tr('spaceExplorer.flyingToSolarSystem')}</p>
                      </div>
                    </div>
                  }
                >
                  <Planet3D onSelect={(p) => { sfxTap(); setSelected(p); }} />
                </Suspense>
              </div>
              <div className="bg-blue-950/80 p-3 text-center">
                <p className="text-xs font-bold text-blue-200">
                  {tr('spaceExplorer.dragZoomClick')}
                </p>
              </div>
            </Panel>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 行星卡片网格 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {PLANETS.map(planet => (
                <button
                  key={planet.id}
                  onClick={() => { sfxTap(); setSelected(planet); }}
                  className="flex flex-col items-center justify-center rounded-3xl border-2 border-blue-200 bg-white p-4 text-center shadow-candy-sm transition-all hover:scale-105 active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${planet.model3D.color}20, white)` }}
                >
                  <span className="text-5xl">{planet.emoji}</span>
                  <span className="mt-2 text-base font-black text-ink">{planet.nameZh}</span>
                  <span className="text-xs font-bold text-blue-600">{planet.nameEn}</span>
                  {planet.bodyType === 'planet' && (
                    <span className="mt-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">
                      {tr('spaceExplorer.planetNo', { order: planet.order })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 行星详情 */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <PlanetDetail planet={selected} onClose={() => setSelected(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const SpaceExplorer = memo(SpaceExplorerImpl);
