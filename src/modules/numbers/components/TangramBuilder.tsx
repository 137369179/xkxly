/**
 * 🧩 洪恩数学/宝宝巴士级「七巧板空间几何与创意工坊」 (Tangram Space Builder)
 * ------------------------------------------------------------------
 * 1. 经典 7 色几何七巧板（2大三角、1中三角、2小三角、1正方形、1平行四边形）；
 * 2. 7 大目标创意图案挑战（小猫/狐狸/帆船/火箭/小房/天鹅/小鱼）；
 * 3. 自由创作画板与旋转吸附判定；
 * 4. 通关生动复活动画与空间几何语音启发。
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';

export type PieceShape = 'large-tri' | 'med-tri' | 'small-tri' | 'square' | 'parallelogram';

export interface TangramPiece {
  id: string;
  name: string;
  shape: PieceShape;
  color: string;
  x: number;
  y: number;
  rotation: number;
}

export interface TangramPuzzle {
  id: string;
  name: string;
  emoji: string;
  intro: string;
  revivalText: string;
  targets: { id: string; x: number; y: number; rotation: number }[];
}

const DEFAULT_PIECES: TangramPiece[] = [
  { id: 'lt1', name: '大三角 1', shape: 'large-tri', color: '#ff5c7a', x: 40, y: 40, rotation: 0 },
  { id: 'lt2', name: '大三角 2', shape: 'large-tri', color: '#3b82f6', x: 130, y: 40, rotation: 90 },
  { id: 'mt1', name: '中三角', shape: 'med-tri', color: '#eab308', x: 220, y: 40, rotation: 180 },
  { id: 'st1', name: '小三角 1', shape: 'small-tri', color: '#10b981', x: 40, y: 130, rotation: 45 },
  { id: 'st2', name: '小三角 2', shape: 'small-tri', color: '#06b6d4', x: 110, y: 130, rotation: 135 },
  { id: 'sq1', name: '正方形', shape: 'square', color: '#8b5cf6', x: 180, y: 130, rotation: 0 },
  { id: 'pl1', name: '平行四边形', shape: 'parallelogram', color: '#f97316', x: 245, y: 130, rotation: 0 },
];

const PUZZLES: TangramPuzzle[] = [
  {
    id: 'cat',
    name: '机灵小猫',
    emoji: '🐱',
    intro: '尖尖的耳朵，长长的尾巴，喵喵叫！',
    revivalText: '小猫拼好啦！喵喵喵~ 好聪明的宝贝！',
    targets: [
      { id: 'lt1', x: 120, y: 140, rotation: 0 },
      { id: 'lt2', x: 180, y: 140, rotation: 90 },
      { id: 'sq1', x: 150, y: 80, rotation: 45 },
      { id: 'st1', x: 125, y: 45, rotation: 0 },
      { id: 'st2', x: 175, y: 45, rotation: 90 },
      { id: 'mt1', x: 230, y: 160, rotation: 45 },
      { id: 'pl1', x: 260, y: 130, rotation: 45 },
    ],
  },
  {
    id: 'boat',
    name: '乘风帆船',
    emoji: '⛵',
    intro: '高高的三角白帆，向着大海前进！',
    revivalText: '小帆船扬帆起航啦！呜呜呜~',
    targets: [
      { id: 'lt1', x: 130, y: 90, rotation: 0 },
      { id: 'lt2', x: 180, y: 90, rotation: 270 },
      { id: 'mt1', x: 150, y: 40, rotation: 0 },
      { id: 'sq1', x: 150, y: 160, rotation: 0 },
      { id: 'st1', x: 90, y: 160, rotation: 180 },
      { id: 'st2', x: 210, y: 160, rotation: 90 },
      { id: 'pl1', x: 150, y: 190, rotation: 0 },
    ],
  },
  {
    id: 'rocket',
    name: '太空火箭',
    emoji: '🚀',
    intro: '尖尖的火箭头，飞向浩瀚宇宙！',
    revivalText: '3、2、1，火箭发射！飞向太空！',
    targets: [
      { id: 'mt1', x: 150, y: 40, rotation: 0 },
      { id: 'sq1', x: 150, y: 90, rotation: 0 },
      { id: 'lt1', x: 120, y: 145, rotation: 270 },
      { id: 'lt2', x: 180, y: 145, rotation: 90 },
      { id: 'st1', x: 80, y: 190, rotation: 180 },
      { id: 'st2', x: 220, y: 190, rotation: 90 },
      { id: 'pl1', x: 150, y: 190, rotation: 90 },
    ],
  },
  {
    id: 'house',
    name: '温馨小屋',
    emoji: '🏠',
    intro: '红红的三角形屋顶，方方正正的小屋！',
    revivalText: '漂亮的小房子盖好啦！欢迎回家！',
    targets: [
      { id: 'lt1', x: 120, y: 70, rotation: 0 },
      { id: 'lt2', x: 180, y: 70, rotation: 270 },
      { id: 'sq1', x: 150, y: 140, rotation: 0 },
      { id: 'mt1', x: 90, y: 140, rotation: 90 },
      { id: 'st1', x: 210, y: 140, rotation: 270 },
      { id: 'st2', x: 150, y: 190, rotation: 0 },
      { id: 'pl1', x: 210, y: 190, rotation: 0 },
    ],
  },
  {
    id: 'fish',
    name: '欢快小鱼',
    emoji: '🐟',
    intro: '摇摇小尾巴，在水草里捉迷藏！',
    revivalText: '小鱼游来游去真欢快！咕噜噜~',
    targets: [
      { id: 'lt1', x: 120, y: 110, rotation: 90 },
      { id: 'lt2', x: 180, y: 110, rotation: 180 },
      { id: 'sq1', x: 150, y: 110, rotation: 45 },
      { id: 'mt1', x: 230, y: 110, rotation: 270 },
      { id: 'st1', x: 70, y: 80, rotation: 0 },
      { id: 'st2', x: 70, y: 140, rotation: 180 },
      { id: 'pl1', x: 260, y: 110, rotation: 45 },
    ],
  },
  {
    id: 'fox',
    name: '机智红狐',
    emoji: '🦊',
    intro: '尖尖的狐狸嘴，蓬松的大尾巴！',
    revivalText: '聪明的小狐狸跳出来啦！',
    targets: [
      { id: 'sq1', x: 120, y: 70, rotation: 45 },
      { id: 'st1', x: 95, y: 40, rotation: 0 },
      { id: 'st2', x: 145, y: 40, rotation: 90 },
      { id: 'lt1', x: 150, y: 130, rotation: 0 },
      { id: 'lt2', x: 190, y: 130, rotation: 270 },
      { id: 'mt1', x: 220, y: 160, rotation: 45 },
      { id: 'pl1', x: 250, y: 120, rotation: 45 },
    ],
  },
  {
    id: 'swan',
    name: '优雅天鹅',
    emoji: '🦢',
    intro: '长长的天鹅颈，在湖面上优雅漫游！',
    revivalText: '美丽的大天鹅展翅飞翔啦！',
    targets: [
      { id: 'st1', x: 100, y: 50, rotation: 180 },
      { id: 'pl1', x: 110, y: 90, rotation: 45 },
      { id: 'sq1', x: 130, y: 130, rotation: 0 },
      { id: 'lt1', x: 170, y: 140, rotation: 90 },
      { id: 'lt2', x: 220, y: 140, rotation: 180 },
      { id: 'mt1', x: 170, y: 180, rotation: 0 },
      { id: 'st2', x: 230, y: 180, rotation: 270 },
    ],
  },
  {
    id: 'dog',
    name: '忠诚小狗',
    emoji: '🐶',
    intro: '垂着小耳朵，摇着尾巴汪汪叫！',
    revivalText: '小狗摇着尾巴跑过来啦！汪汪汪~',
    targets: [
      { id: 'sq1', x: 110, y: 70, rotation: 0 },
      { id: 'st1', x: 85, y: 50, rotation: 180 },
      { id: 'lt1', x: 150, y: 120, rotation: 0 },
      { id: 'lt2', x: 190, y: 120, rotation: 90 },
      { id: 'mt1', x: 130, y: 170, rotation: 180 },
      { id: 'st2', x: 210, y: 170, rotation: 0 },
      { id: 'pl1', x: 230, y: 100, rotation: 45 },
    ],
  },
  {
    id: 'tree',
    name: '苍翠松树',
    emoji: '🌲',
    intro: '层层叠叠的三角形树冠，高耸入云！',
    revivalText: '大松树长得又高又壮！真棒！',
    targets: [
      { id: 'st1', x: 150, y: 40, rotation: 0 },
      { id: 'st2', x: 130, y: 80, rotation: 0 },
      { id: 'mt1', x: 170, y: 80, rotation: 270 },
      { id: 'lt1', x: 120, y: 130, rotation: 0 },
      { id: 'lt2', x: 180, y: 130, rotation: 270 },
      { id: 'sq1', x: 150, y: 180, rotation: 0 },
      { id: 'pl1', x: 150, y: 220, rotation: 0 },
    ],
  },
  {
    id: 'teapot',
    name: '功夫茶壶',
    emoji: '🫖',
    intro: '弯弯的壶嘴，圆圆的壶肚，茶香四溢！',
    revivalText: '热气腾腾的香茶沏好啦！咕咚咕咚~',
    targets: [
      { id: 'sq1', x: 150, y: 120, rotation: 0 },
      { id: 'lt1', x: 120, y: 120, rotation: 90 },
      { id: 'lt2', x: 180, y: 120, rotation: 270 },
      { id: 'st1', x: 90, y: 90, rotation: 180 },
      { id: 'st2', x: 150, y: 60, rotation: 0 },
      { id: 'mt1', x: 210, y: 90, rotation: 45 },
      { id: 'pl1', x: 150, y: 170, rotation: 0 },
    ],
  },
];

const FALLBACK_PUZZLE: TangramPuzzle = {
  id: 'cat',
  name: '机灵小猫',
  emoji: '🐱',
  intro: '尖尖的耳朵，长长的尾巴，喵喵叫！',
  revivalText: '小猫拼好啦！喵喵喵~ 好聪明的宝贝！',
  targets: [
    { id: 'lt1', x: 120, y: 140, rotation: 0 },
    { id: 'lt2', x: 180, y: 140, rotation: 90 },
    { id: 'sq1', x: 150, y: 80, rotation: 45 },
    { id: 'st1', x: 125, y: 45, rotation: 0 },
    { id: 'st2', x: 175, y: 45, rotation: 90 },
    { id: 'mt1', x: 230, y: 160, rotation: 45 },
    { id: 'pl1', x: 260, y: 130, rotation: 45 },
  ],
};

export function TangramBuilder() {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [pieces, setPieces] = useState<TangramPiece[]>(DEFAULT_PIECES);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isFreeMode, setIsFreeMode] = useState(false);

  const currentPuzzle = useMemo(() => {
    return PUZZLES[puzzleIdx % PUZZLES.length] ?? PUZZLES[0] ?? FALLBACK_PUZZLE;
  }, [puzzleIdx]);

  // 重置七巧板位置
  const handleResetPieces = useCallback(() => {
    sfxTap();
    triggerHaptic(20);
    setPieces(DEFAULT_PIECES);
    setSelectedPieceId(null);
    setIsCompleted(false);
  }, []);

  // 切换谜题
  const handleSwitchPuzzle = useCallback((idx: number) => {
    sfxTap();
    triggerHaptic(25);
    setPuzzleIdx(idx);
    setPieces(DEFAULT_PIECES);
    setSelectedPieceId(null);
    setIsCompleted(false);
    const p = PUZZLES[idx % PUZZLES.length] ?? PUZZLES[0] ?? FALLBACK_PUZZLE;
    void speak(`${p.name}。${p.intro}`, { lang: 'zh-CN' });
  }, []);

  // 旋转选中的拼图
  const handleRotateSelected = useCallback((delta: number) => {
    if (!selectedPieceId) return;
    sfxTap();
    triggerHaptic(25);
    setPieces((prev) =>
      prev.map((p) =>
        p.id === selectedPieceId
          ? { ...p, rotation: (p.rotation + delta + 360) % 360 }
          : p,
      ),
    );
  }, [selectedPieceId]);

  // 一键智能吸附拼装 / 验证拼装
  const handleSnapAndComplete = useCallback(() => {
    sfxCorrect();
    celebrateBig();
    sfxWin();
    triggerHaptic([50, 40, 50, 40, 80]);
    setIsCompleted(true);
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    addStars(1);
    practice('math:tangram', true, 2, 1);

    // 将积木对齐到目标位置
    setPieces(
      DEFAULT_PIECES.map((p) => {
        const target = currentPuzzle.targets.find((t) => t.id === p.id);
        if (target) {
          return { ...p, x: target.x, y: target.y, rotation: target.rotation };
        }
        return p;
      }),
    );

    void speak(currentPuzzle.revivalText, { lang: 'zh-CN' });
  }, [currentPuzzle, streak, addStars, practice]);

  // 键盘快捷控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (PUZZLES[idx]) {
          e.preventDefault();
          setIsFreeMode(false);
          handleSwitchPuzzle(idx);
        }
      } else if (e.key === '8' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        sfxTap();
        triggerHaptic(25);
        setIsFreeMode(true);
        handleResetPieces();
        void speak('开启自由创作画板！发挥你的空间想象力吧！', { lang: 'zh-CN' });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsFreeMode(false);
        setPuzzleIdx((prev) => (prev > 0 ? prev - 1 : PUZZLES.length - 1));
        setIsCompleted(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsFreeMode(false);
        setPuzzleIdx((prev) => (prev < PUZZLES.length - 1 ? prev + 1 : 0));
        setIsCompleted(false);
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'ArrowUp') {
        e.preventDefault();
        handleRotateSelected(45);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleRotateSelected(-45);
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (!isCompleted && !isFreeMode) {
          e.preventDefault();
          handleSnapAndComplete();
        }
      } else if (e.key === 'Backspace' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleResetPieces();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRotateSelected, handleSnapAndComplete, handleSwitchPuzzle, handleResetPieces, isCompleted, isFreeMode]);

  // 拖拽积木支持
  const handlePiecePointerDown = (id: string, e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    sfxTap();
    triggerHaptic(20);
    setSelectedPieceId(id);

    const svg = (e.currentTarget as SVGElement).ownerSVGElement;
    if (!svg) return;

    const piece = pieces.find((p) => p.id === id);
    if (!piece) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    const offsetX = svgP.x - piece.x;
    const offsetY = svgP.y - piece.y;

    const onPointerMove = (ev: PointerEvent) => {
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const curSvgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      const newX = Math.max(15, Math.min(305, curSvgP.x - offsetX));
      const newY = Math.max(15, Math.min(205, curSvgP.y - offsetY));
      setPieces((prev) =>
        prev.map((p) => (p.id === id ? { ...p, x: Math.round(newX), y: Math.round(newY) } : p))
      );
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      // 磁吸判定：如果距离目标位置小于 26px，自动对齐
      if (!isFreeMode) {
        const target = currentPuzzle.targets.find((t) => t.id === id);
        if (target) {
          setPieces((prev) =>
            prev.map((p) => {
              if (p.id === id) {
                const dist = Math.hypot(p.x - target.x, p.y - target.y);
                const rotDiff = Math.abs((p.rotation % 360) - (target.rotation % 360));
                if (dist < 26 && (rotDiff === 0 || rotDiff === 360)) {
                  triggerHaptic(30);
                  return { ...p, x: target.x, y: target.y, rotation: target.rotation };
                }
              }
              return p;
            })
          );
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div className="space-y-4">
      {/* 顶部挑战关卡切换 */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="七巧板关卡切换">
          {PUZZLES.map((p, i) => {
            const isSel = !isFreeMode && puzzleIdx === i;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={isSel}
                onClick={() => {
                  setIsFreeMode(false);
                  handleSwitchPuzzle(i);
                }}
                className={`min-h-[44px] py-1.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center gap-1 border-2 focus-visible:ring-4 focus-visible:ring-amber-300 focus:outline-none ${
                  isSel
                    ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-md scale-[1.03]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 active:scale-95'
                }`}
              >
                <span>{p.emoji}</span>
                <span>{p.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            role="tab"
            aria-selected={isFreeMode}
            onClick={() => {
              sfxTap();
              triggerHaptic(25);
              setIsFreeMode(true);
              handleResetPieces();
              void speak('开启自由创作画板！发挥你的空间想象力吧！', { lang: 'zh-CN' });
            }}
            className={`min-h-[44px] py-1.5 px-3 rounded-2xl text-xs font-black transition-all flex items-center gap-1 border-2 focus-visible:ring-4 focus-visible:ring-purple-300 focus:outline-none ${
              isFreeMode
                ? 'bg-purple-500 text-candy-purple-on border-purple-600 shadow-md scale-[1.03]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 active:scale-95'
            }`}
          >
            <span>🎨</span>
            <span>自由拼图</span>
          </button>
        </div>

        <StreakBar streak={streak} target={3} />
      </div>

      {/* 快捷操作提示条 */}
      <div className="flex items-center justify-between text-xs text-amber-900 font-bold bg-amber-50/90 px-3 py-1 rounded-xl border border-amber-200">
        <span>⌨️ 键盘快捷操作：数字键 1-7 切换关卡 · ←/→ 切换 · R 旋转积木 · 空格 吸附拼装</span>
      </div>

      {/* 七巧板交互舞台 */}
      <div className="relative bg-gradient-to-b from-amber-50 via-sky-50 to-emerald-50 rounded-3xl border-4 border-amber-200 p-4 shadow-md min-h-[360px] flex flex-col justify-between">
        {/* 顶部提示 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{isFreeMode ? '🎨' : currentPuzzle.emoji}</span>
            <div>
              <h4 className="text-base font-black text-slate-800">
                {isFreeMode ? '自由创意拼图工坊' : currentPuzzle.name}
              </h4>
              <p className="text-xs text-slate-500 font-bold">
                {isFreeMode ? '点击选定形状，拖拽、旋转并自由拼接' : currentPuzzle.intro}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetPieces}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50 active:scale-95 focus-visible:ring-4 focus-visible:ring-slate-300"
          >
            🔄 重置积木
          </button>
        </div>

        {/* 目标轮廓与七巧板积木画布 (SVG 画板) */}
        <div className="relative mx-auto my-3 w-full max-w-[380px] h-[240px] bg-white/80 rounded-2xl border-2 border-dashed border-amber-300 shadow-inner overflow-hidden flex items-center justify-center touch-none">
          <svg className="w-full h-full select-none" viewBox="0 0 320 220">
            {/* 网格参考背景 */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* 目标轮廓阴影（闯关模式） */}
            {!isFreeMode && !isCompleted && (
              <g opacity="0.18">
                {currentPuzzle.targets.map((t) => (
                  <g key={`target-${t.id}`} transform={`translate(${t.x}, ${t.y}) rotate(${t.rotation})`}>
                    <polygon
                      points={
                        t.id.startsWith('lt')
                          ? '0,-32 32,32 -32,32'
                          : t.id.startsWith('mt')
                            ? '0,-24 24,24 -24,24'
                            : t.id.startsWith('st')
                              ? '0,-16 16,16 -16,16'
                              : t.id.startsWith('sq')
                                ? '-20,-20 20,-20 20,20 -20,20'
                                : '-25,-16 25,-16 15,16 -35,16'
                      }
                      fill="#334155"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                  </g>
                ))}
              </g>
            )}

            {/* 7 块实体积木 */}
            {pieces.map((p) => {
              const isSelected = selectedPieceId === p.id;
              return (
                <g
                  key={p.id}
                  transform={`translate(${p.x}, ${p.y}) rotate(${p.rotation})`}
                  onPointerDown={(e) => handlePiecePointerDown(p.id, e)}
                  className="cursor-grab active:cursor-grabbing transition-transform hover:opacity-90 touch-none"
                >
                  <polygon
                    points={
                      p.shape === 'large-tri'
                        ? '0,-32 32,32 -32,32'
                        : p.shape === 'med-tri'
                          ? '0,-24 24,24 -24,24'
                          : p.shape === 'small-tri'
                            ? '0,-16 16,16 -16,16'
                            : p.shape === 'square'
                              ? '-20,-20 20,-20 20,20 -20,20'
                              : '-25,-16 25,-16 15,16 -35,16'
                    }
                    fill={p.color}
                    stroke={isSelected ? '#ffffff' : '#ffffff88'}
                    strokeWidth={isSelected ? 3.5 : 2}
                    filter={isSelected ? 'drop-shadow(0 0 6px rgba(234,179,8,0.8))' : undefined}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* 底部控制器 */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-slate-600">旋转积木 (或按 R 键)：</span>
            <button
              type="button"
              onClick={() => handleRotateSelected(-45)}
              disabled={!selectedPieceId}
              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white border-2 border-slate-200 text-xs font-black text-slate-700 disabled:opacity-40 hover:bg-slate-50 active:scale-95 focus-visible:ring-4 focus-visible:ring-amber-300"
            >
              ↺ 逆时针 45°
            </button>
            <button
              type="button"
              onClick={() => handleRotateSelected(45)}
              disabled={!selectedPieceId}
              className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white border-2 border-slate-200 text-xs font-black text-slate-700 disabled:opacity-40 hover:bg-slate-50 active:scale-95 focus-visible:ring-4 focus-visible:ring-amber-300"
            >
              ↻ 顺时针 45°
            </button>
          </div>

          {!isFreeMode && !isCompleted && (
            <button
              type="button"
              onClick={handleSnapAndComplete}
              className="min-h-[44px] px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-candy-orange-on font-black text-xs shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all focus-visible:ring-4 focus-visible:ring-orange-300"
            >
              ✨ 吸附拼装 & 唤醒小动物
            </button>
          )}
        </div>

        {/* 通关动画横幅 */}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-3 p-3 bg-amber-100 border-2 border-amber-300 rounded-2xl text-center space-y-1 shadow-sm"
            >
              <p className="text-sm font-black text-amber-900">
                🎉 {currentPuzzle.revivalText}
              </p>
              <p className="text-xs text-amber-700 font-bold">
                ⭐ 获得 1 颗空间几何星星与「小小空间建筑师」荣誉！
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
