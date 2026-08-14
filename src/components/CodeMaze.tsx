/**
 * 方向迷宫升级 🧭 (S3)
 * 指令序列编程 — 给小机器人写指令到达终点
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface Level {
  grid: number; // grid size
  start: [number, number];
  end: [number, number];
  walls: [number, number][];
  stars: [number, number][];
  maxCommands: number;
}

const LEVELS: Level[] = [
  { grid: 4, start: [0,0], end: [3,0], walls: [], stars: [[1,0]], maxCommands: 5 },
  { grid: 4, start: [0,0], end: [3,3], walls: [[1,1]], stars: [[2,0],[0,2]], maxCommands: 8 },
  { grid: 5, start: [0,0], end: [4,4], walls: [[2,1],[2,2],[1,3]], stars: [[2,0],[3,2],[0,4]], maxCommands: 12 },
  { grid: 5, start: [0,0], end: [4,0], walls: [[1,0],[2,1],[3,1]], stars: [[0,2],[2,3],[4,2]], maxCommands: 10 },
  { grid: 6, start: [0,0], end: [5,5], walls: [[2,0],[2,1],[3,3],[4,3],[1,4]], stars: [[1,0],[3,0],[0,3],[5,3]], maxCommands: 15 },
];

type Cmd = '⬆️' | '⬇️' | '⬅️' | '➡️';
const CMDS: Cmd[] = ['⬆️','⬇️','⬅️','➡️'];

export function CodeMaze() {
  const { t: tr } = useTranslation();
  const [levelIdx, setLevelIdx] = useState(0);
  const [program, setProgram] = useState<Cmd[]>([]);
  const [robot, setRobot] = useState<[number, number]>(() => LEVELS[0]?.start ?? [0, 0]);
  const [collected, setCollected] = useState<[number, number][]>([]);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [failed, setFailed] = useState(false);

  const level = LEVELS[levelIdx] ?? LEVELS[0]!;

  const reset = () => {
    setProgram([]);
    setRobot(level.start);
    setCollected([]);
    setWon(false);
    setFailed(false);
    setRunning(false);
  };

  const newLevel = (idx: number) => {
    setLevelIdx(idx);
    setProgram([]);
    setRobot(LEVELS[idx]?.start ?? [0, 0]);
    setCollected([]);
    setWon(false);
    setFailed(false);
    setRunning(false);
  };

  const addCmd = (cmd: Cmd) => {
    if (running || won) return;
    if (program.length >= level.maxCommands) return;
    sfxTap();
    setProgram(p => [...p, cmd]);
  };

  const removeCmd = (idx: number) => {
    if (running || won) return;
    sfxTap();
    setProgram(p => p.filter((_, i) => i !== idx));
  };

  const run = async () => {
    if (running || program.length === 0) return;
    setRunning(true);
    let [r, c] = level.start;
    const newCollected: [number, number][] = [];

    for (const cmd of program) {
      let nr = r, nc = c;
      if (cmd === '⬆️') nr--;
      else if (cmd === '⬇️') nr++;
      else if (cmd === '⬅️') nc--;
      else if (cmd === '➡️') nc++;

      // 边界
      if (nr < 0 || nr >= level.grid || nc < 0 || nc >= level.grid) {
        setFailed(true); sfxWrong(); setRunning(false); return;
      }
      // 墙
      if (level.walls.some(([wr, wc]) => wr === nr && wc === nc)) {
        setFailed(true); sfxWrong(); setRunning(false); return;
      }

      r = nr; c = nc;
      setRobot([r, c]);

      // 收集星星
      if (level.stars.some(([sr, sc]) => sr === r && sc === c) && !newCollected.some(([cr, cc]) => cr === r && cc === c)) {
        newCollected.push([r, c]);
        setCollected([...newCollected]);
        sfxStar();
      }

      await new Promise(res => setTimeout(res, 350));
    }

    // 检查是否到达终点
    if (r === level.end[0] && c === level.end[1]) {
      setWon(true); sfxCorrect();
    } else {
      setFailed(true); sfxWrong();
    }
    setRunning(false);
  };

  const cellSize = Math.min(60, 280 / level.grid);

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{tr('codeMaze.title')}</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">{tr('codeMaze.subtitle')}</p>

      <div className="mb-3 flex justify-center gap-2">
        {LEVELS.map((_, i) => (
          <button key={`_-${i}`} onClick={()=>newLevel(i)}
            className={cn('rounded-lg px-3 py-1 text-xs font-extrabold',
              levelIdx===i ? 'bg-candy-purple-deep text-white' : 'bg-white text-ink-soft shadow-sm'
            )}>
            {tr('codeMaze.levelN', { i: String(i + 1) })}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* 迷宫 */}
        <div className="relative rounded-2xl bg-candy-purple-soft/20 p-2 shadow-inner" style={{ width: level.grid * cellSize + 16, height: level.grid * cellSize + 16 }}>
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
                <div key={`cell-${i}`} className={cn('flex items-center justify-center', isWall && 'bg-gray-700')}
                  style={{ width: cellSize, height: cellSize }}>
                  {isWall ? '🧱' : isEnd ? '🎯' : isStar && !isCollected ? '⭐' : ''}
                  {isRobot && <motion.div initial={{scale:0.5}} animate={{scale:1}} className="absolute text-2xl">🤖</motion.div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* 指令序列 */}
        <div className="w-full max-w-md">
          <p className="mb-1 text-center text-xs font-bold text-ink-soft">
            {tr('codeMaze.program', { current: String(program.length), max: String(level.maxCommands) })}
          </p>
          <div className="mb-3 flex flex-wrap justify-center gap-1 min-h-[40px] rounded-xl bg-white p-2 shadow-sm">
            {program.length === 0 ? <span className="text-xs text-ink-muted self-center">{tr('codeMaze.emptyHint')}</span> :
              program.map((cmd, i) => (
                <button key={`cmd-${i}`} onClick={()=>removeCmd(i)} className="rounded-lg bg-candy-purple-soft/50 px-2 py-1 text-lg hover:bg-red-100">
                  {cmd}
                </button>
              ))
            }
          </div>

          <div className="flex justify-center gap-2">
            {CMDS.map(cmd => (
              <button key={cmd} onClick={()=>addCmd(cmd)} disabled={running || won}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm transition-all hover:scale-110 active:scale-95 disabled:opacity-50">
                {cmd}
              </button>
            ))}
          </div>

          <div className="mt-3 flex justify-center gap-2">
            <CandyButton tone="green" size="md" onClick={run} disabled={running || program.length === 0}>
              {tr('codeMaze.run')}
            </CandyButton>
            <CandyButton tone="blue" size="md" onClick={reset}>{tr('codeMaze.reset')}</CandyButton>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {won && (
          <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1}} className="mt-3 text-center">
            <p className="text-2xl font-extrabold text-candy-green-deep">
              {tr('codeMaze.win', { got: String(collected.length), total: String(level.stars.length) })}
            </p>
            {levelIdx < LEVELS.length - 1 && <CandyButton tone="purple" size="sm" className="mt-2" onClick={()=>newLevel(levelIdx + 1)}>{tr('codeMaze.next')}</CandyButton>}
          </motion.div>
        )}
        {failed && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} className="mt-3 text-center">
            <p className="text-lg font-extrabold text-candy-pink-deep">{tr('codeMaze.fail')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
