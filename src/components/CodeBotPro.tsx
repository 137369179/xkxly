/**
 * 机器人编程升级 🤖 (S5)
 * 函数化编程 — 定义"重复N次"函数块
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface Level {
  grid: number;
  start: [number, number];
  end: [number, number];
  walls: [number, number][];
  stars: [number, number][];
  maxBlocks: number;
}

const LEVELS: Level[] = [
  { grid: 4, start: [0,3], end: [0,0], walls: [], stars: [[0,1],[0,2]], maxBlocks: 4 },
  { grid: 4, start: [3,0], end: [0,3], walls: [[1,1]], stars: [[2,0],[3,3]], maxBlocks: 6 },
  { grid: 5, start: [4,0], end: [0,4], walls: [[2,1],[2,2],[2,3]], stars: [[3,0],[0,2],[4,4]], maxBlocks: 8 },
  { grid: 5, start: [0,0], end: [4,4], walls: [[1,2],[2,2],[3,2]], stars: [[0,4],[4,0],[2,4]], maxBlocks: 10 },
  { grid: 6, start: [5,0], end: [0,5], walls: [[1,1],[3,1],[3,2],[3,3],[1,3],[1,4]], stars: [[5,5],[2,5],[0,3]], maxBlocks: 12 },
];

type Block = { type: 'move'; dir: string } | { type: 'repeat'; count: number; dir: string };

export function CodeBotPro() {
  const { t: tr } = useTranslation();
  const [levelIdx, setLevelIdx] = useState(0);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [robot, setRobot] = useState<[number, number]>(LEVELS[0]!.start);
  const [collected, setCollected] = useState<[number, number][]>([]);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [failed, setFailed] = useState(false);
  const [repeatCount, setRepeatCount] = useState(3);

  const level = LEVELS[levelIdx]!

  const reset = () => {
    setBlocks([]);
    setRobot(level.start);
    setCollected([]);
    setWon(false);
    setFailed(false);
    setRunning(false);
  };

  const newLevel = (idx: number) => {
    setLevelIdx(idx);
    setBlocks([]);
    setRobot(LEVELS[idx]!.start);
    setCollected([]);
    setWon(false);
    setFailed(false);
    setRunning(false);
  };

  const addMove = (dir: string) => {
    if (running || won) return;
    if (blocks.length >= level.maxBlocks) return;
    sfxTap();
    setBlocks(b => [...b, { type: 'move', dir }]);
  };

  const addRepeat = (dir: string) => {
    if (running || won) return;
    if (blocks.length >= level.maxBlocks) return;
    sfxTap();
    setBlocks(b => [...b, { type: 'repeat', count: repeatCount, dir }]);
  };

  const removeBlock = (idx: number) => {
    if (running || won) return;
    sfxTap();
    setBlocks(b => b.filter((_, i) => i !== idx));
  };

  const run = async () => {
    if (running || blocks.length === 0) return;
    setRunning(true);
    let [r, c] = level.start;
    const newCollected: [number, number][] = [];

    for (const block of blocks) {
      const steps = block.type === 'repeat' ? block.count : 1;
      const dir = block.dir; // move 和 repeat 都有 dir 字段

      for (let s = 0; s < steps; s++) {
        let nr = r, nc = c;
        if (dir === '⬆️') nr--;
        else if (dir === '⬇️') nr++;
        else if (dir === '⬅️') nc--;
        else if (dir === '➡️') nc++;

        if (nr < 0 || nr >= level.grid || nc < 0 || nc >= level.grid) {
          setFailed(true); sfxWrong(); setRunning(false); return;
        }
        if (level.walls.some(([wr, wc]) => wr === nr && wc === nc)) {
          setFailed(true); sfxWrong(); setRunning(false); return;
        }

        r = nr; c = nc;
        setRobot([r, c]);

        if (level.stars.some(([sr, sc]) => sr === r && sc === c) && !newCollected.some(([cr, cc]) => cr === r && cc === c)) {
          newCollected.push([r, c]);
          setCollected([...newCollected]);
          sfxStar();
        }

        await new Promise(res => setTimeout(res, 300));
      }
    }

    if (r === level.end[0] && c === level.end[1]) {
      setWon(true); sfxCorrect();
    } else {
      setFailed(true); sfxWrong();
    }
    setRunning(false);
  };

  const cellSize = Math.min(55, 260 / level.grid);
  const DIRS = ['⬆️','⬇️','⬅️','➡️'];

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">🤖 {tr('codeBotPro.title')}</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">{tr('codeBotPro.subtitle')}</p>

      <div className="mb-3 flex justify-center gap-2">
        {LEVELS.map((_, i) => (
          <button key={`_-${i}`} onClick={()=>newLevel(i)}
            className={cn('rounded-lg px-3 py-1 text-xs font-extrabold',
              levelIdx===i ? 'bg-candy-green-deep text-white' : 'bg-white text-ink-soft shadow-sm'
            )}>
            {tr('codeBotPro.levelN', { n: i + 1 })}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* 迷宫 */}
        <div className="rounded-2xl bg-candy-green-soft/20 p-2 shadow-inner" style={{ width: level.grid * cellSize + 16, height: level.grid * cellSize + 16 }}>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${level.grid}, ${cellSize}px)`, gap: '0' }}>
            {Array.from({ length: level.grid * level.grid }, (_, i) => {
              const r = Math.floor(i / level.grid);
              const c = i % level.grid;
              const isWall = level.walls.some(([wr, wc]) => wr === r && wc === c);
              const isEnd = level.end[0] === r && level.end[1] === c;
              const isStar = level.stars.some(([sr, sc]) => sr === r && sc === c);
              const isCollected = collected.some(([cr, cc]) => cr === r && cc === c);
              const isRobot = robot[0]! === r && robot[1] === c;
              return (
                <div key={`cell-${i}`} className="relative flex items-center justify-center" style={{ width: cellSize, height: cellSize }}>
                  {isWall && '🧱'}
                  {isEnd && !isRobot && '🎯'}
                  {isStar && !isCollected && '⭐'}
                  {isRobot && <motion.div initial={{scale:0.5}} animate={{scale:1}} className="absolute text-xl">🤖</motion.div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* 程序块 */}
        <div className="w-full max-w-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-ink-soft">{tr('codeBotPro.program', { current: blocks.length, max: level.maxBlocks })}</span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-ink-soft">{tr('codeBotPro.repeat')}</span>
              {[2,3,4,5].map(n => (
                <button key={n} onClick={()=>setRepeatCount(n)} className={cn('rounded px-2 py-0.5 text-xs font-extrabold', repeatCount===n?'bg-candy-green-deep text-white':'bg-white shadow-sm')}>{n}</button>
              ))}
            </div>
          </div>
          <div className="mb-3 flex flex-wrap justify-center gap-1 min-h-[40px] rounded-xl bg-white p-2 shadow-sm">
            {blocks.length === 0 ? <span className="text-xs text-ink-muted self-center">{tr('codeBotPro.emptyHint')}</span> :
              blocks.map((b, i) => (
                <button key={`b-${i}`} onClick={()=>removeBlock(i)} className="rounded-lg bg-candy-green-soft/50 px-2 py-1 text-sm hover:bg-red-100">
                  {b.type === 'repeat' ? `🔄×${b.count} ${b.dir}` : b.dir}
                </button>
              ))
            }
          </div>

          <div className="flex justify-center gap-2">
            {DIRS.map(d => (
              <button key={d} onClick={()=>addMove(d)} disabled={running || won}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm hover:scale-110 active:scale-95 disabled:opacity-50">
                {d}
              </button>
            ))}
            <button onClick={()=>addRepeat('⬆️')} disabled={running || won}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-candy-green-soft text-xs font-extrabold shadow-sm hover:scale-110 active:scale-95 disabled:opacity-50">
              🔄↑×{repeatCount}
            </button>
          </div>

          {/* repeat for other directions */}
          <div className="mt-1 flex justify-center gap-2">
            {DIRS.map(d => (
              <button key={`r${d}`} onClick={()=>addRepeat(d)} disabled={running || won}
                className="flex h-8 px-2 items-center justify-center rounded-lg bg-candy-green-soft/50 text-xs font-bold shadow-sm hover:scale-105 disabled:opacity-50">
                🔄{d}×{repeatCount}
              </button>
            ))}
          </div>

          <div className="mt-3 flex justify-center gap-2">
            <CandyButton tone="green" size="md" onClick={run} disabled={running || blocks.length === 0}>▶️ {tr('codeBotPro.run')}</CandyButton>
            <CandyButton tone="blue" size="md" onClick={reset}>🔄 {tr('codeBotPro.reset')}</CandyButton>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {won && (
          <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1}} className="mt-3 text-center">
            <p className="text-2xl font-extrabold text-candy-green-deep">🎉 {tr('codeBotPro.clear', { got: collected.length, total: level.stars.length })} ⭐</p>
            {levelIdx < LEVELS.length - 1 && <CandyButton tone="purple" size="sm" className="mt-2" onClick={()=>newLevel(levelIdx + 1)}>⏭️ 下一关</CandyButton>}
          </motion.div>
        )}
        {failed && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} className="mt-3 text-center">
            <p className="text-lg font-extrabold text-candy-pink-deep">💥 {tr('codeBotPro.crashed')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
