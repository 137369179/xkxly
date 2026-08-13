/**
 * 拼图还原 🧩 (Q5)
 * 数字拼图 3×3/4×4，滑块还原
 */
import { useState } from 'react';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { CandyButton } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';

type Grid = number[][];
const SIZES = [3, 4];

function genGrid(size: number): Grid {
  const total = size * size;
  const arr = Array.from({ length: total - 1 }, (_, i) => i + 1);
  arr.push(0); // 空格
  // 随机打乱（通过有效移动确保可解）
  let grid: Grid = [];
  for (let i = 0; i < size; i++) grid.push(arr.slice(i * size, (i + 1) * size));
  for (let i = 0; i < 200; i++) {
    const [br, bc] = findBlank(grid, size);
    const moves = getMoves(br, bc, size);
    const [mr, mc] = moves[Math.floor(Math.random() * moves.length)]!;
    [grid[br]![bc], grid[mr]![mc]] = [grid[mr]![mc]!, grid[br]![bc]!];
  }
  return grid;
}

function findBlank(g: Grid, s: number): [number, number] {
  for (let r = 0; r < s; r++) for (let c = 0; c < s; c++) if (g[r]![c] === 0) return [r, c];
  return [0, 0];
}

function getMoves(r: number, c: number, s: number): [number, number][] {
  const m: [number, number][] = [];
  if (r > 0) m.push([r - 1, c]);
  if (r < s - 1) m.push([r + 1, c]);
  if (c > 0) m.push([r, c - 1]);
  if (c < s - 1) m.push([r, c + 1]);
  return m;
}

function isSolved(g: Grid, s: number): boolean {
  for (let r = 0; r < s; r++) for (let c = 0; c < s; c++) {
    const expected = r * s + c + 1;
    if (r === s - 1 && c === s - 1) return g[r]![c] === 0;
    if (g[r]![c] !== expected) return false;
  }
  return true;
}

export function SlidingPuzzle() {
  const { t } = useTranslation();
  const [size, setSize] = useState(3);
  const [grid, setGrid] = useState<Grid>(() => genGrid(3));
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);

  const newGame = (s: number) => {
    setSize(s);
    setGrid(genGrid(s));
    setMoves(0);
    setDone(false);
  };

  const click = (r: number, c: number) => {
    if (done) return;
    const [br, bc] = findBlank(grid, size);
    const dr = Math.abs(r - br), dc = Math.abs(c - bc);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      sfxTap();
      const ng = grid.map(row => [...row]);
      [ng[r]![c], ng[br]![bc]] = [ng[br]![bc]!, ng[r]![c]!];
      setGrid(ng);
      setMoves(m => m + 1);
      if (isSolved(ng, size)) {
        sfxCorrect();
        setDone(true);
      }
    }
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('slidingPuzzle.title')}</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">{t('slidingPuzzle.instruction')}</p>
      <div className="mb-3 flex justify-center gap-2">
        {SIZES.map(s => (
          <button key={s} onClick={()=>newGame(s)}
            className={cn('rounded-xl px-4 py-1.5 text-sm font-extrabold',
              size===s ? 'bg-candy-purple-deep text-white' : 'bg-white text-ink-soft shadow-sm'
            )}>
            {s===3 ? '3×3 🌱' : '4×4 🌳'}
          </button>
        ))}
      </div>
      <div className="mb-3 flex justify-between text-xs font-bold text-ink-soft">
        <span>{t('slidingPuzzle.moves', { moves })}</span>{done && <span className="text-candy-green-deep">{t('slidingPuzzle.done')}</span>}
      </div>
      <div className="mx-auto" style={{ maxWidth: '320px' }}>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
          {grid.map((row, r) => row.map((val, c) => (
            <button key={`${r}-${c}`} onClick={()=>click(r, c)}
              className={cn('aspect-square rounded-xl flex items-center justify-center text-2xl font-extrabold shadow-sm transition-all',
                val === 0 ? 'bg-transparent' : 'bg-white hover:bg-candy-purple-soft/30 active:scale-95',
                done && val !== 0 && 'bg-candy-green-soft'
              )}>
              {val !== 0 ? val : ''}
            </button>
          )))}
        </div>
      </div>
      <CandyButton tone="purple" size="sm" className="mt-4 w-full" onClick={()=>newGame(size)}>🔄 重新打乱</CandyButton>
    </div>
  );
}
