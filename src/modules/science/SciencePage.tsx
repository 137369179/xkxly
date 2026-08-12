/**
 * 🧪 自然科学百科馆 (Science & Nature)
 * ------------------------------------------------------------
 * 5-6 岁儿童常识百科互动入口
 * Tab 导航：恐龙 / 太空 / 天气 / 动物 / 人体
 * 每个模块懒加载，独立交互
 */

import { useState, Suspense, lazy } from 'react';
import { PageHeader } from '@/components/ui/Card';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';

// 懒加载 5 大模块
const DinoWorld = lazy(() => import('./components/DinoWorld').then(m => ({ default: m.DinoWorld })));
const SpaceExplorer = lazy(() => import('./components/SpaceExplorer').then(m => ({ default: m.SpaceExplorer })));
const WeatherLab = lazy(() => import('./components/WeatherLab').then(m => ({ default: m.WeatherLab })));
const AnimalWorld = lazy(() => import('./components/AnimalWorld').then(m => ({ default: m.AnimalWorld })));
const BodyAdventure = lazy(() => import('./components/BodyAdventure').then(m => ({ default: m.BodyAdventure })));

type SciTab = 'dino' | 'space' | 'weather' | 'animal' | 'body';

interface TabConfig {
  id: SciTab;
  label: string;
  emoji: string;
  color: string;
  activeColor: string;
}

const TABS: TabConfig[] = [
  { id: 'dino', label: '恐龙', emoji: '🦖', color: 'text-green-700', activeColor: 'bg-green-400 text-white' },
  { id: 'space', label: '太空', emoji: '🪐', color: 'text-blue-700', activeColor: 'bg-blue-400 text-white' },
  { id: 'weather', label: '天气', emoji: '🌈', color: 'text-orange-700', activeColor: 'bg-orange-400 text-white' },
  { id: 'animal', label: '动物', emoji: '🦁', color: 'text-emerald-700', activeColor: 'bg-emerald-400 text-white' },
  { id: 'body', label: '人体', emoji: '🫀', color: 'text-red-700', activeColor: 'bg-red-400 text-white' },
];

/** 加载占位 */
function LoadingFallback({ emoji }: { emoji: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="mb-3 flex justify-center gap-1">
          <span className="h-3 w-3 animate-bounce rounded-full bg-green-400" style={{ animationDelay: '0ms' }} />
          <span className="h-3 w-3 animate-bounce rounded-full bg-green-400" style={{ animationDelay: '150ms' }} />
          <span className="h-3 w-3 animate-bounce rounded-full bg-green-400" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-sm font-bold text-ink-soft">{emoji} 正在加载…</p>
      </div>
    </div>
  );
}

export default function SciencePage() {
  const [tab, setTab] = useState<SciTab>('dino');

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="town"
        title="自然科学百科馆"
        subtitle="恐龙 · 太空 · 天气 · 动物 · 人体双语探险"
        tone="green"
      />

      {/* Tab 导航 */}
      <div className="scrollbar-none flex gap-2 overflow-x-auto rounded-[1.4rem] bg-white/60 p-1.5 shadow-candy-sm">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { sfxTap(); setTab(t.id); }}
            className={cn(
              'flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-[1rem] px-4 py-2.5 text-sm font-extrabold transition-all whitespace-nowrap',
              tab === t.id ? t.activeColor : cn('bg-white/50', t.color, 'hover:bg-white')
            )}
          >
            <span className="text-lg">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <Suspense fallback={<LoadingFallback emoji={TABS.find(t => t.id === tab)?.emoji ?? '🔬'} />}>
        {tab === 'dino' && <DinoWorld />}
        {tab === 'space' && <SpaceExplorer />}
        {tab === 'weather' && <WeatherLab />}
        {tab === 'animal' && <AnimalWorld />}
        {tab === 'body' && <BodyAdventure />}
      </Suspense>
    </div>
  );
}
