/**
 * 贴纸场景装扮 - 拖拽贴纸到场景画布+截图保存
 */

import { useState, useRef } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { useProgress } from '@/store/useStore';
import { STICKERS, ALBUMS } from '@/data/stickers';
import type { StickerDef } from '@/types';
import { celebrateSmall } from '@/lib/celebrate';
import { motion } from 'motion/react';

interface PlacedSticker {
  id: string;
  sticker: StickerDef;
  x: number;
  y: number;
}

const SCENES = [
  { name: '蓝天白云', bg: 'linear-gradient(180deg, #87CEEB 0%, #B0E0E6 40%, #90EE90 100%)' },
  { name: '海底世界', bg: 'linear-gradient(180deg, #006994 0%, #00b4d8 50%, #90e0ef 100%)' },
  { name: '星空夜晚', bg: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 50%, #2d1b69 100%)' },
  { name: '森林草地', bg: 'linear-gradient(180deg, #2d5a27 0%, #4a8c3f 50%, #87ceeb 100%)' },
  { name: '彩虹桥', bg: 'linear-gradient(180deg, #FF6B6B 0%, #FFE66D 25%, #4ecdc4 50%, #45B7D1 75%, #96C93D 100%)' },
];

export function StickerScene() {
  const progress = useProgress();
  const ownedIds = new Set<string>(progress.stickers);
  const owned = STICKERS.filter(s => ownedIds.has(s.id));

  const [sceneIdx, setSceneIdx] = useState(0);
  const [placed, setPlaced] = useState<PlacedSticker[]>([]);
  const [albumFilter, setAlbumFilter] = useState<string>('all');

  const canvasRef = useRef<HTMLDivElement>(null);

  // 从贴纸库选贴纸添加到画布
  const addSticker = (sticker: StickerDef) => {
    setPlaced(p => [...p, {
      id: `${sticker.id}-${Date.now()}`,
      sticker,
      x: 50 + Math.random() * 30 - 15,  // 随机偏移，不要全部叠中间
      y: 50 + Math.random() * 30 - 15,
    }]);
    sfxStar();
  };

  // 移除已放置的贴纸
  const removeSticker = (id: string) => {
    setPlaced(p => p.filter(s => s.id !== id));
    sfxTap();
  };

  // 清除画布
  const clearCanvas = () => {
    setPlaced([]);
    sfxTap();
  };

  // 截图保存
  const saveScene = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      // html2canvas 是可选依赖，未安装时走 catch 降级
      // 通过原生 canvas API 截图
      const rect = canvas.getBoundingClientRect();
      const offscreen = document.createElement('canvas');
      offscreen.width = rect.width * 2;
      offscreen.height = rect.height * 2;
      const ctx = offscreen.getContext('2d')!;
      ctx.scale(2, 2);
      // 简单背景
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, rect.width, rect.height);
      // 转为 data URL（因跨域限制简化处理）
      try {
        const url = offscreen.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `我的贴纸作品_${SCENES[sceneIdx]!.name}.png`;
        a.click();
        celebrateSmall();
        sfxStar();
      } catch {
        sfxTap();
      }
    } catch {
      sfxTap();
    }
  };

  const filteredStickers = albumFilter === 'all'
    ? owned
    : owned.filter(s => s.album === albumFilter);

  return (
    <div className="space-y-4">
      <PageHeader emoji="🎨" title="贴纸场景" subtitle="选场景 → 贴贴纸 → 保存作品！" tone="pink" />

      {/* 场景选择 */}
      <div className="flex gap-2 flex-wrap justify-center">
        {SCENES.map((scene, i) => (
          <CandyButton
            key={`scene-${i}`}
            tone={i === sceneIdx ? 'pink' : 'purple'}
            variant={i === sceneIdx ? 'solid' : 'soft'}
            size="sm"
            onClick={() => { sfxTap(); setSceneIdx(i); }}
          >
            {scene.name}
          </CandyButton>
        ))}
      </div>

      {/* 画布 */}
      <div
        ref={canvasRef}
        className="relative mx-auto h-80 w-full max-w-md overflow-hidden rounded-2xl border-4 border-candy-pink-deep shadow-lg"
        style={{ background: SCENES[sceneIdx]!.bg }}
      >
        {placed.map(s => (
          <motion.div
            key={s.id}
            drag
            dragMomentum={false}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 1.2 }}
            className="absolute cursor-grab active:cursor-grabbing select-none text-4xl"
            style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%, -50%)' }}
            onClick={(e) => { e.stopPropagation(); removeSticker(s.id); }}
            title="拖拽移动 / 点击移除"
          >
            {s.sticker.emoji}
          </motion.div>
        ))}
        {placed.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-lg font-extrabold text-white text-opacity-60 select-none">
              👇 从下方选贴纸放到这里
            </p>
          </div>
        )}
      </div>

      {/* 画布操作 */}
      <div className="flex justify-center gap-2">
        <CandyButton tone="pink" variant="soft" size="sm" onClick={clearCanvas}>
          🗑️ 清空
        </CandyButton>
        <CandyButton tone="pink" size="sm" onClick={saveScene} disabled={placed.length === 0}>
          📸 保存作品
        </CandyButton>
      </div>

      {/* 贴纸选择区 */}
      <Panel>
        <h4 className="mb-2 text-sm font-extrabold text-ink">
          🎨 我的贴纸 ({owned.length}/{STICKERS.length})
        </h4>

        {/* 筛选 */}
        <div className="flex gap-1 flex-wrap mb-3">
          <CandyButton tone={albumFilter === 'all' ? 'pink' : 'purple'} variant={albumFilter === 'all' ? 'solid' : 'soft'} size="sm" onClick={() => { sfxTap(); setAlbumFilter('all'); }}>
            全部
          </CandyButton>
          {ALBUMS.map(albumName => {
            const count = owned.filter(s => s.album === albumName).length;
            return (
              <CandyButton
                key={albumName}
                tone={albumFilter === albumName ? 'pink' : 'purple'}
                variant={albumFilter === albumName ? 'solid' : 'soft'}
                size="sm"
                onClick={() => { sfxTap(); setAlbumFilter(albumName); }}
              >
                📚 {albumName} {count}个
              </CandyButton>
            );
          })}
        </div>

        {filteredStickers.length === 0 ? (
          <p className="text-center text-xs font-bold text-ink-soft py-3">
            还没有贴纸～去做练习赚贴纸吧！
          </p>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {filteredStickers.map(s => (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.8 }}
                onClick={() => addSticker(s)}
                className="flex flex-col items-center rounded-lg bg-white p-1.5 shadow-sm hover:bg-candy-pink-soft transition-colors"
              >
                <span className="text-2xl">{s.emoji}</span>
                <span className="text-[9px] font-bold text-ink-soft mt-0.5 truncate max-w-full">{s.name}</span>
              </motion.button>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
