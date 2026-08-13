/**
 * 简易七巧板拼图
 * 7块基本图形拖拽拼成目标图案
 */

import { useState, useRef, useCallback } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { useTranslation } from '@/i18n/useTranslation';

interface Piece {
  id: string;
  shape: 'triangle-lg' | 'triangle-md' | 'triangle-sm' | 'square' | 'parallelogram';
  color: string;
  x: number;
  y: number;
  rotation: number;
}

interface Puzzle {
  id: string;
  name: string;
  emoji: string;
  hint: string;
}

const PUZZLES: Puzzle[] = [
  { id: 'cat', name: '小猫', emoji: '🐱', hint: '尖耳朵，长尾巴' },
  { id: 'house', name: '小房子', emoji: '🏠', hint: '尖屋顶，方身体' },
  { id: 'boat', name: '小船', emoji: '⛵', hint: '三角帆，船身平' },
  { id: 'rocket', name: '火箭', emoji: '🚀', hint: '尖头朝上' },
  { id: 'bird', name: '小鸟', emoji: '🐦', hint: '翅膀展开' },
];

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#C7CEEA', '#B5EAD7'];

const INITIAL_PIECES: Piece[] = [
  { id: 'p1', shape: 'triangle-lg', color: COLORS[0]!, x: 50, y: 50, rotation: 0 },
  { id: 'p2', shape: 'triangle-lg', color: COLORS[1]!, x: 200, y: 50, rotation: 90 },
  { id: 'p3', shape: 'triangle-md', color: COLORS[2]!, x: 100, y: 180, rotation: 0 },
  { id: 'p4', shape: 'triangle-sm', color: COLORS[3]!, x: 250, y: 180, rotation: 180 },
  { id: 'p5', shape: 'triangle-sm', color: COLORS[4]!, x: 50, y: 250, rotation: 270 },
  { id: 'p6', shape: 'square', color: COLORS[5]!, x: 180, y: 250, rotation: 0 },
  { id: 'p7', shape: 'parallelogram', color: COLORS[6]!, x: 280, y: 280, rotation: 0 },
];

function PieceSvg({ piece, onDrag }: { piece: Piece; onDrag: (id: string, x: number, y: number) => void }) {
  const ref = useRef<SVGGElement>(null);
  const dragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    onDrag(piece.id, e.clientX, e.clientY);
  };

  const onPointerUp = () => { dragging.current = false; };

  const renderShape = () => {
    const c = piece.color;
    switch (piece.shape) {
      case 'triangle-lg':
        return <polygon points="0,-40 40,40 -40,40" fill={c} stroke="#fff" strokeWidth={2} />;
      case 'triangle-md':
        return <polygon points="0,-30 30,30 -30,30" fill={c} stroke="#fff" strokeWidth={2} />;
      case 'triangle-sm':
        return <polygon points="0,-20 20,20 -20,20" fill={c} stroke="#fff" strokeWidth={2} />;
      case 'square':
        return <rect x={-28} y={-28} width={56} height={56} fill={c} stroke="#fff" strokeWidth={2} />;
      case 'parallelogram':
        return <polygon points="-30,-20 30,-20 20,20 -40,20" fill={c} stroke="#fff" strokeWidth={2} />;
    }
  };

  return (
    <g
      ref={ref}
      transform={`translate(${piece.x},${piece.y}) rotate(${piece.rotation})`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ cursor: 'grab', touchAction: 'none' }}
    >
      {renderShape()}
    </g>
  );
}

export function Tangram() {
  const { t } = useTranslation();
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [pieces, setPieces] = useState(INITIAL_PIECES);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const puzzle = PUZZLES[puzzleIdx]!

  const handleDrag = useCallback((id: string, x: number, y: number) => {
    setPieces(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
  }, []);

  const rotatePiece = (id: string) => {
    sfxTap();
    setPieces(prev => prev.map(p => p.id === id ? { ...p, rotation: (p.rotation + 45) % 360 } : p));
  };

  const checkComplete = () => {
    sfxStar();
    celebrateSmall();
    setCompleted(prev => new Set([...prev, puzzle.id]));
  };

  const nextPuzzle = () => {
    sfxTap();
    setPuzzleIdx(i => (i + 1) % PUZZLES.length);
    setPieces(INITIAL_PIECES);
  };

  const resetPieces = () => {
    sfxTap();
    setPieces(INITIAL_PIECES);
  };

  return (
    <div className="space-y-4">
      <PageHeader emoji="📐" title={t('tangram.title')} subtitle={t('tangram.subtitle')} tone="blue" />

      {/* 关卡选择 */}
      <div className="flex flex-wrap gap-2">
        {PUZZLES.map((p, i) => (
          <button
            key={p.id}
            onClick={() => { sfxTap(); setPuzzleIdx(i); setPieces(INITIAL_PIECES); }}
            className={`flex items-center gap-1 rounded-xl border-4 px-3 py-1.5 text-sm font-extrabold transition-all ${
              i === puzzleIdx
                ? 'border-candy-blue-deep bg-candy-blue-soft text-candy-blue-deep'
                : 'border-gray-200 bg-white text-ink-soft'
            }`}
          >
            <span className="text-lg">{p.emoji}</span>
            {p.name}
            {completed.has(p.id) && <span className="ml-1">✅</span>}
          </button>
        ))}
      </div>

      <Panel>
        <div className="mb-2 text-center text-sm font-bold text-ink-soft">
          {t('tangram.goal', { emoji: puzzle.emoji, name: puzzle.name, hint: puzzle.hint })}
        </div>

        {/* SVG 画布 */}
        <div className="relative mx-auto overflow-hidden rounded-2xl bg-gradient-to-br from-candy-blue-soft to-candy-purple-soft" style={{ aspectRatio: '4/3', maxWidth: 400 }}>
          {/* 目标图案轮廓 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-8xl opacity-20">{puzzle.emoji}</span>
          </div>

          <svg width="100%" height="100%" viewBox="0 0 400 350" style={{ position: 'absolute', inset: 0 }}>
            {pieces.map(p => (
              <PieceSvg key={p.id} piece={p} onDrag={handleDrag} />
            ))}
          </svg>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {pieces.map(p => (
            <CandyButton
              key={p.id}
              tone="blue"
              variant="soft"
              size="sm"
              onClick={() => rotatePiece(p.id)}
            >
              🔄 {p.id.toUpperCase()}
            </CandyButton>
          ))}
        </div>

        <div className="mt-3 flex justify-center gap-2">
          <CandyButton tone="purple" variant="soft" size="sm" onClick={resetPieces}>
            🔄 {t('tangram.reset')}
          </CandyButton>
          <CandyButton tone="green" size="sm" onClick={checkComplete}>
            ✅ {t('tangram.done')}
          </CandyButton>
          <CandyButton tone="blue" size="sm" onClick={nextPuzzle}>
            ➡️ {t('tangram.next')}
          </CandyButton>
        </div>
      </Panel>

      <p className="text-center text-xs font-bold text-ink-soft">
        {t('tangram.tip')}
      </p>
    </div>
  );
}
