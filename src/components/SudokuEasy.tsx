/**
 * 简单数独升级 🎯 (R4)
 * 4x4 数独 + 图形数独（水果/动物/颜色）
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

type Cell = number; // 0 = empty
type Board = Cell[]; // 16 cells

const THEMES = {
  emoji: { items: ['🍎','🍌','🍇','🍊'], name: '水果' },
  animal: { items: ['🐱','🐶','🐰','🐼'], name: '动物' },
  color: { items: ['🔴','🟡','🟢','🔵'], name: '颜色' },
};

const PUZZLES: Board[] = [
  [1,0,0,4, 0,4,1,0, 4,1,0,0, 0,0,4,1],
  [0,2,0,0, 1,0,3,0, 0,1,0,4, 0,0,2,0],
  [3,0,1,0, 0,2,0,0, 0,0,4,1, 0,1,0,2],
  [0,4,0,1, 2,0,0,0, 0,0,1,3, 4,0,0,0],
];

const SOLUTIONS: Board[] = [
  [1,3,2,4, 3,4,1,2, 4,1,3,2, 2,3,4,1],
  [3,2,4,1, 1,4,3,2, 2,1,3,4, 3,4,2,1],
  [3,2,1,4, 4,2,3,1, 2,3,4,1, 4,1,3,2],
  [2,4,3,1, 2,1,3,4, 2,3,1,3, 4,1,2,3],
];

function isCorrect(board: Board, sol: Board): boolean {
  return board.every((v, i) => v === sol[i]!);
}

export function SudokuEasy() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<keyof typeof THEMES>('emoji');
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [board, setBoard] = useState<Board>([...PUZZLES[0]!]);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const puzzle = PUZZLES[puzzleIdx]!!
  const solution = SOLUTIONS[puzzleIdx]!!
  const items = THEMES[theme]!!.items;

  const newGame = (idx: number) => {
    setPuzzleIdx(idx);
    setBoard([...PUZZLES[idx]!]);
    setSelected(null);
    setDone(false);
  };

  const placeNumber = (num: number) => {
    if (selected === null || done) return;
    if (puzzle[selected] !== 0) return; // 原题不能改
    sfxTap();
    const nb = [...board];
    nb[selected] = num;
    setBoard(nb);
    if (isCorrect(nb, solution)) {
      sfxCorrect();
      setDone(true);
    } else if (nb.every(v => v !== 0)) {
      sfxWrong();
    }
  };

  const clearCell = () => {
    if (selected === null || done) return;
    if (puzzle[selected] !== 0) return;
    sfxTap();
    const nb = [...board];
    nb[selected] = 0;
    setBoard(nb);
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">🎯 {t('sudokuEasy.learnTitle')}</h3>

      <div className="mb-3 flex justify-center gap-2">
        {(Object.keys(THEMES) as (keyof typeof THEMES)[]).map(t => (
          <button key={t} onClick={()=>setTheme(t)}
            className={cn('rounded-xl px-3 py-1.5 text-xs font-extrabold',
              theme===t ? 'bg-candy-purple-deep text-white' : 'bg-white text-ink-soft shadow-sm'
            )}>
            {THEMES[t]!.name}
          </button>
        ))}
      </div>

      <div className="mb-3 flex justify-center gap-2">
        {PUZZLES.map((_, i) => (
          <button key={`_-${i}`} onClick={()=>newGame(i)}
            className={cn('rounded-lg px-3 py-1 text-xs font-extrabold',
              puzzleIdx===i ? 'bg-candy-orange-deep text-white' : 'bg-white text-ink-soft shadow-sm'
            )}>
            {t('sudokuEasy.levelN', { n: i + 1 })}
          </button>
        ))}
      </div>

      <div className="mx-auto mb-4" style={{ maxWidth: '280px' }}>
        <div className="grid grid-cols-4 gap-1.5">
          {board.map((val, i) => {
            const isFixed = puzzle[i] !== 0;
            const isCorrectCell = val !== 0 && val === solution[i]!;
            const isWrongCell = val !== 0 && val !== solution[i]! && !isFixed;
            return (
              <button key={`val-${i}`} onClick={()=>setSelected(i)}
                className={cn('aspect-square rounded-lg flex items-center justify-center text-2xl shadow-sm transition-all',
                  isFixed ? 'bg-gray-100' : 'bg-white hover:bg-candy-purple-soft/30',
                  selected === i && 'ring-2 ring-candy-purple-deep',
                  !isFixed && isCorrectCell && board.every((v,j) => v === solution[j]!) && 'bg-candy-green-soft',
                  isWrongCell && 'bg-red-100'
                )}>
                {val === 0 ? '' : items[val - 1]}
              </button>
            );
          })}
        </div>
      </div>

      {!done && selected !== null && puzzle[selected] === 0 && (
        <div className="flex justify-center gap-2">
          {items.map((emoji, i) => (
            <button key={`emoji-${i}`} onClick={()=>placeNumber(i + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm transition-all hover:scale-110 active:scale-95">
              {emoji}
            </button>
          ))}
          <button aria-label="🗑️" onClick={clearCell} className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xl shadow-sm">
            🗑️
          </button>
        </div>
      )}

      {done && (
        <div className="text-center">
          <motion.p initial={{scale:0.5}} animate={{scale:1}} className="text-2xl font-extrabold text-candy-green-deep">🎉 {t('sudokuEasy.done')}</motion.p>
          <CandyButton tone="purple" size="sm" className="mt-2" onClick={()=>newGame((puzzleIdx + 1) % PUZZLES.length)}>⏭️ {t('sudokuEasy.next')}</CandyButton>
        </div>
      )}

      <p className="mt-2 text-center text-xs font-bold text-ink-soft">{t('sudokuEasy.rule')}</p>
    </div>
  );
}
