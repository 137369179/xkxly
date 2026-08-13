/**
 * 简单数独 3×3 🎯 (P5)
 * 幼儿版数独：3×3 每行每列不重复
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const EMOJIS = ['🐱','🐶','🐰'];

function genBoard(): { grid: (string|null)[][]; solution: string[][] } {
  // 3x3 Latin square
  const base = [['🐱','🐶','🐰'],['🐶','🐰','🐱'],['🐰','🐱','🐶']];
  // shuffle rows
  const rows = [0,1,2].sort(()=>Math.random()-0.5);
  const cols = [0,1,2].sort(()=>Math.random()-0.5);
  const solution = rows.map(r => cols.map(c => base[r]![c]!));
  // make puzzle: remove 3-4 cells
  const grid = solution.map(row => [...row]) as (string|null)[][];
  let removed = 0;
  const targets = 4;
  while (removed < targets) {
    const r = Math.floor(Math.random()*3);
    const c = Math.floor(Math.random()*3);
    if (grid[r]![c] !== null) { grid[r]![c] = null; removed++; }
  }
  return { grid, solution };
}

export function MiniSudoku() {
  const { t } = useTranslation();
  const [{ grid, solution }, setState] = useState(genBoard);
  const [selected, setSelected] = useState<[number,number] | null>(null);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const newGame = () => { setState(genBoard()); setSelected(null); setFeedback(''); };

  const checkWin = (g: (string|null)[][]) => {
    for (let r=0;r<3;r++) for (let c=0;c<3;c++) if (!g[r]![c]) return false;
    return g.every((row,r) => row.every((cell,c) => cell === solution[r]!![c]));
  };

  const fillCell = (emoji: string) => {
    if (!selected || lockRef.current) return;
    const [r,c] = selected;
    if (grid[r]![c] !== null && grid[r]![c] === solution[r]!![c]) return; // pre-filled
    sfxTap();
    const newGrid = grid.map(row=>[...row]) as (string|null)[][];
    newGrid[r]![c] = emoji;
    setState({ grid: newGrid, solution });
    setSelected(null);
    if (checkWin(newGrid)) {
      sfxCorrect();
      setFeedback(t('miniSudoku.win'));
      setScore(s=>s+1);
      void speak('太棒了！数独完成了！', { lang:'zh-CN', rate:0.85, module:'praise' });
      lockRef.current = true;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { timerRef.current = null; newGame(); lockRef.current = false; }, 2000);
    }
  };

  const isPrefilled = (_r:number,_c:number) => {
    // A cell is prefilled if it was originally given (not null at start)
    // We check by comparing with a fresh board — but simpler: just let user fill any null cell
    return false; // allow editing any cell
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('miniSudoku.title')}</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">{t('miniSudoku.subtitle')}</p>

      <div className="mx-auto mb-4" style={{maxWidth:'240px'}}>
        <div className="grid grid-cols-3 gap-1.5">
          {grid.map((row, r) => row.map((cell, c) => (
            <button key={`${r}-${c}`} onClick={()=>{if(cell===null||!isPrefilled(r,c)){sfxTap();setSelected([r,c]);}}}
              className={cn('aspect-square rounded-xl flex items-center justify-center text-3xl shadow-sm transition-all',
                selected && selected[0]===r && selected[1]===c ? 'ring-2 ring-candy-purple-deep scale-105' : '',
                cell ? 'bg-white' : 'bg-candy-purple-soft/30 hover:bg-candy-purple-soft/50'
              )}>
              {cell || '·'}
            </button>
          )))}
        </div>
      </div>

      {selected && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex justify-center gap-3">
          {EMOJIS.map(e => (
            <CandyButton key={e} tone="purple" size="lg" onClick={()=>fillCell(e)}>{e}</CandyButton>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-candy-purple-deep">{feedback}</motion.div>}
      </AnimatePresence>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-bold text-ink-soft">{t('miniSudoku.score', { count: score })}</span>
        <CandyButton tone="blue" size="sm" onClick={newGame}>{t('miniSudoku.newPuzzle')}</CandyButton>
      </div>
    </div>
  );
}
