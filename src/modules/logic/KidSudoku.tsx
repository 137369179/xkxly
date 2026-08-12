/**
 * 幼儿数独入门 🧩 (N2)
 * ------------------------------------------------------------
 * 4×4 迷你数独，用动物 emoji 替代数字，
 * 适合 5-6 岁幼儿的极简推理训练。
 *
 * 设计依据：蒙台梭利感官数学 + 幼小衔接逻辑推理
 * 规则：每行、每列、每个 2×2 小方格都要包含 4 种不同动物
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const ANIMALS = ['🐱', '🐶', '🐰', '🐻'];

interface Puzzle {
  grid: string[][];
  fixed: boolean[][];
  solution: string[][];
}

/** 生成合法的 4×4 数独解 */
function generateSolution(): string[][] {
  // 手工预设一个经典 4×4 解，然后做行列随机置换
  const base = [
    ['🐱', '🐶', '🐰', '🐻'],
    ['🐰', '🐻', '🐱', '🐶'],
    ['🐶', '🐱', '🐻', '🐰'],
    ['🐻', '🐰', '🐶', '🐱'],
  ];
  // 随机行交换（同组内）
  const swap = (arr: string[][], i: number, j: number) => {
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  };
  if (Math.random() < 0.5) swap(base, 0, 1);
  if (Math.random() < 0.5) swap(base, 2, 3);
  // 随机列交换
  for (let r = 0; r < 4; r++) {
    if (Math.random() < 0.5) {
      const t = base[r]!![0]!; base[r]![0] = base[r]!![1]!; base[r]![1] = t;
    }
    if (Math.random() < 0.5) {
      const t = base[r]!![2]!; base[r]![2] = base[r]!![3]!; base[r]![3] = t;
    }
  }
  return base;
}

function createPuzzle(solution: string[][], difficulty: number): Puzzle {
  const grid = solution.map(row => [...row]);
  const fixed = grid.map(row => row.map(() => true));
  const cells: [number, number][] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      cells.push([r, c]);
  // shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j]!, cells[i]!];
  }
  // remove cells based on difficulty
  const removeCount = difficulty >= 3 ? 8 : difficulty >= 2 ? 6 : 4;
  for (let i = 0; i < removeCount && i < cells.length; i++) {
    const [r, c] = cells[i]!;
    grid[r]![c] = '';
    fixed[r]![c] = false;
  }
  return { grid, fixed, solution };
}

export function KidSudoku() {
  const { t: tr } = useTranslation();
  const [solution] = useState(() => generateSolution());
  const [puzzle, setPuzzle] = useState(() => createPuzzle(solution, 1));
  const [grid, setGrid] = useState(() => puzzle.grid.map(row => [...row]));
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [done, setDone] = useState(false);
  const [level, setLevel] = useState(1);
  const [hint, setHint] = useState('');

  const newGame = useCallback((lv: number) => {
    const sol = generateSolution();
    const puz = createPuzzle(sol, lv);
    setPuzzle(puz);
    setGrid(puz.grid.map(row => [...row]));
    setSelected(null);
    setDone(false);
    setHint('');
    setLevel(lv);
  }, []);

  const checkComplete = useCallback((g: string[][]) => {
    for (let r = 0; r < 4; r++) {
      const row = new Set(g[r]);
      if (row.size !== 4 || row.has('')) return false;
    }
    for (let c = 0; c < 4; c++) {
      const col = new Set([g[0]![c], g[1]![c], g[2]![c], g[3]![c]]);
      if (col.size !== 4 || col.has('')) return false;
    }
    for (let br = 0; br < 2; br++) {
      for (let bc = 0; bc < 2; bc++) {
        const box = new Set([
          g[br*2]![bc*2], g[br*2]![bc*2+1],
          g[br*2+1]![bc*2], g[br*2+1]![bc*2+1],
        ]);
        if (box.size !== 4 || box.has('')) return false;
      }
    }
    return true;
  }, []);

  const placeAnimal = (animal: string) => {
    if (!selected || done) return;
    const { r, c } = selected;
    if (puzzle.fixed[r]![c]) return;
    const newGrid = grid.map(row => [...row]);
    newGrid[r]![c] = animal;
    setGrid(newGrid);

    // 冲突检测
    const rowVals = newGrid[r]!!.filter(v => v !== '');
    const colVals = [newGrid[0]![c], newGrid[1]![c], newGrid[2]![c], newGrid[3]![c]].filter(v => v !== '');
    if (new Set(rowVals).size !== rowVals.length || new Set(colVals).size !== colVals.length) {
      sfxWrong();
      setHint(tr('kidSudoku.conflictHint', { row: r + 1, col: c + 1, animal }));
    } else {
      sfxCorrect();
      setHint('');
      void speak(animal, { lang: 'zh-CN', rate: 0.8, module: 'praise' });
    }

    if (checkComplete(newGrid)) {
      setDone(true);
      sfxCorrect();
      void speak('太棒了！你完成了数独！', { lang: 'zh-CN', rate: 0.85, module: 'praise' });
    }
  };

  const clearCell = () => {
    if (!selected || done) return;
    const { r, c } = selected;
    if (puzzle.fixed[r]![c]) return;
    const newGrid = grid.map(row => [...row]);
    newGrid[r]![c] = '';
    setGrid(newGrid);
    setHint('');
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-1 text-center text-lg font-extrabold text-ink">{tr('kidSudoku.title')}</h3>
      <p className="mb-4 text-center text-xs font-bold text-ink-soft">
        {tr('kidSudoku.rules')}
      </p>

      {/* 难度选择 */}
      <div className="mb-4 flex justify-center gap-2">
        {[1, 2, 3].map(lv => (
          <button
            key={lv}
            onClick={() => newGame(lv)}
            className={cn(
              'rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all',
              level === lv
                ? 'bg-candy-purple-deep text-white shadow-md'
                : 'bg-white text-ink-soft shadow-sm hover:bg-pink-50'
            )}
          >
            {lv === 1 ? tr('kidSudoku.easy') : lv === 2 ? tr('kidSudoku.medium') : tr('kidSudoku.hard')}
          </button>
        ))}
      </div>

      {/* 棋盘 */}
      <div className="mx-auto mb-4 w-fit">
        <div className="grid grid-cols-4 gap-0.5 overflow-hidden rounded-2xl border-4 border-candy-purple-deep">
          {[0, 1, 2, 3].map(r =>
            [0, 1, 2, 3].map(c => {
              const isFixed = puzzle.fixed[r]![c];
              const isSelected = selected?.r === r && selected?.c === c;
              const boxColor = (
                (r < 2 && c < 2) ? 'bg-amber-50' :
                (r < 2) ? 'bg-sky-50' :
                (c < 2) ? 'bg-pink-50' : 'bg-green-50'
              );
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => { sfxTap(); setSelected({ r, c }); }}
                  className={cn(
                    'flex h-16 w-16 items-center justify-center text-3xl transition-all sm:h-20 sm:w-20',
                    boxColor,
                    isSelected && 'ring-3 ring-candy-purple-deep scale-105 z-10',
                    isFixed && 'font-extrabold',
                    !isFixed && !grid[r]![c] && 'cursor-pointer hover:bg-white/60',
                  )}
                >
                  {grid[r]![c] || ''}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 动物选择栏 */}
      {selected && !puzzle.fixed[selected.r]![selected.c] && !done && (
        <div className="mb-3 flex justify-center gap-3">
          {ANIMALS.map(a => (
            <button
              key={a}
              onClick={() => placeAnimal(a)}
              className="rounded-xl bg-white px-4 py-2 text-2xl shadow-candy-sm transition-all hover:scale-110 active:scale-95"
            >
              {a}
            </button>
          ))}
          <button aria-label="🧹"
            onClick={clearCell}
            className="rounded-xl bg-candy-pink-soft px-3 py-2 text-lg font-bold text-candy-pink-deep shadow-sm"
          >
            🧹
          </button>
        </div>
      )}

      {/* 提示 */}
      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-3 text-center"
          >
            <span className="inline-block rounded-xl bg-candy-orange-soft px-3 py-1 text-sm font-bold text-candy-orange-deep">
              {hint}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 完成庆祝 */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <div className="text-4xl">🎉🏆🎉</div>
            <p className="mt-2 text-lg font-extrabold text-candy-purple-deep">{tr('kidSudoku.complete')}</p>
            <CandyButton tone="purple" size="lg" onClick={() => newGame(Math.min(level + 1, 3))} className="mt-3">
              {tr('kidSudoku.nextLevel')}
            </CandyButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
