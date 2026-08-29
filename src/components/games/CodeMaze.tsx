/**
 * 方向迷宫升级 🧭 (S3)
 * 指令序列编程 — 给小机器人写指令到达终点
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong, sfxStar, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
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

  const level = LEVELS[levelIdx] ?? { grid: 5, start: [0, 0], end: [4, 4], walls: [], stars: [], maxCommands: 10 };

  const reset = useCallback(() => {
    sfxTap();
    triggerHaptic(25);
    setProgram([]);
    setRobot(level.start);
    setCollected([]);
    setWon(false);
    setFailed(false);
    setRunning(false);
  }, [level.start]);

  const newLevel = useCallback((idx: number) => {
    sfxTap();
    triggerHaptic(30);
    setLevelIdx(idx);
    setProgram([]);
    setRobot(LEVELS[idx]?.start ?? [0, 0]);
    setCollected([]);
    setWon(false);
    setFailed(false);
    setRunning(false);
  }, []);

  const addCmd = useCallback((cmd: Cmd) => {
    if (running || won) return;
    if (program.length >= level.maxCommands) return;
    sfxTap();
    triggerHaptic(20);
    setProgram(p => [...p, cmd]);
  }, [running, won, program.length, level.maxCommands]);

  const removeCmd = useCallback((idx: number) => {
    if (running || won) return;
    sfxTap();
    triggerHaptic(20);
    setProgram(p => p.filter((_, i) => i !== idx));
  }, [running, won]);

  const run = useCallback(async () => {
    if (running || program.length === 0) return;
    setRunning(true);
    setWon(false);
    setFailed(false);
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
        setFailed(true);
        sfxWrong();
        triggerHaptic(25);
        setRunning(false);
        return;
      }
      // 墙
      if (level.walls.some(([wr, wc]) => wr === nr && wc === nc)) {
        setFailed(true);
        sfxWrong();
        triggerHaptic(25);
        setRunning(false);
        return;
      }

      r = nr; c = nc;
      setRobot([r, c]);

      // 收集星星
      if (level.stars.some(([sr, sc]) => sr === r && sc === c) && !newCollected.some(([cr, cc]) => cr === r && cc === c)) {
        newCollected.push([r, c]);
        setCollected([...newCollected]);
        sfxStar();
        triggerHaptic(30);
      }

      await new Promise(res => setTimeout(res, 350));
    }

    // 检查是否到达终点
    if (r === level.end[0] && c === level.end[1]) {
      setWon(true);
      sfxCorrect();
      sfxWin();
      celebrateSmall();
      triggerHaptic([60, 40, 60, 40, 100]);
    } else {
      setFailed(true);
      sfxWrong();
      triggerHaptic(25);
    }
    setRunning(false);
  }, [running, program, level]);

  // 键盘快捷监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (LEVELS[idx]) {
          e.preventDefault();
          newLevel(idx);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        addCmd('⬆️');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        addCmd('⬇️');
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        addCmd('⬅️');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        addCmd('➡️');
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (program.length > 0) {
          removeCmd(program.length - 1);
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (won && levelIdx < LEVELS.length - 1) {
          newLevel(levelIdx + 1);
        } else if (!running && program.length > 0) {
          void run();
        }
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addCmd, removeCmd, run, reset, newLevel, program.length, won, levelIdx, running]);

  const cellSize = Math.min(60, 280 / level.grid);

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{tr('codeMaze.title')}</h3>
      <p className="mb-2 text-center text-xs font-bold text-ink-soft">{tr('codeMaze.subtitle')}</p>

      {/* 快捷操作提示条 */}
      <div className="mb-3 text-center">
        <span className="inline-block text-xs text-purple-900 font-bold bg-purple-50/90 px-3 py-1 rounded-xl border border-purple-200">
          ⌨️ 键盘快捷操作：方向键/WASD 添加指令 · Backspace 删除 · 空格 运行/下一关 · R 重置 · 1-5 选关
        </span>
      </div>

      <div className="mb-3 flex justify-center gap-2" role="tablist" aria-label="编程迷宫关卡选择">
        {LEVELS.map((_, i) => (
          <button
            key={`_-${i}`}
            type="button"
            role="tab"
            aria-selected={levelIdx === i}
            onClick={() => newLevel(i)}
            className={cn(
              'min-h-[44px] rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all focus-visible:ring-4 focus-visible:ring-purple-300 focus:outline-none',
              levelIdx === i ? 'bg-candy-purple-deep text-candy-purple-on shadow-md scale-105' : 'bg-white text-ink-soft shadow-sm hover:bg-purple-50'
            )}
          >
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
              const isRobot = robot[0] === r && robot[1] === c;
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
          <div className="mb-3 flex flex-wrap justify-center gap-1.5 min-h-[48px] rounded-xl bg-white p-2 shadow-sm border border-slate-100">
            {program.length === 0 ? <span className="text-xs text-ink-muted self-center">{tr('codeMaze.emptyHint')}</span> :
              program.map((cmd, i) => (
                <button
                  key={`cmd-${i}`}
                  type="button"
                  onClick={() => removeCmd(i)}
                  className="min-h-[40px] min-w-[40px] rounded-lg bg-candy-purple-soft/50 px-2 py-1 text-lg hover:bg-red-100 active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-purple-300 focus:outline-none"
                  title="点击移除此指令"
                >
                  {cmd}
                </button>
              ))
            }
          </div>

          <div className="flex justify-center gap-3">
            {CMDS.map(cmd => (
              <button
                key={cmd}
                type="button"
                onClick={() => addCmd(cmd)}
                disabled={running || won}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-md transition-all hover:scale-110 active:scale-95 disabled:opacity-40 focus-visible:ring-4 focus-visible:ring-purple-300 focus:outline-none border-2 border-slate-100"
              >
                {cmd}
              </button>
            ))}
          </div>

          <div className="mt-4 flex justify-center gap-3">
            <CandyButton tone="green" size="md" onClick={run} disabled={running || program.length === 0} className="min-h-[48px] px-6 text-sm font-black">
              ▶️ {tr('codeMaze.run')}
            </CandyButton>
            <CandyButton tone="blue" size="md" onClick={reset} className="min-h-[48px] px-6 text-sm font-black">
              🔄 {tr('codeMaze.reset')}
            </CandyButton>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {won && (
          <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1}} className="mt-3 text-center">
            <p className="text-2xl font-extrabold text-candy-green-deep">
              🎉 {tr('codeMaze.win', { got: String(collected.length), total: String(level.stars.length) })}
            </p>
            {levelIdx < LEVELS.length - 1 && (
              <CandyButton tone="purple" size="sm" className="mt-2 min-h-[44px] px-5" onClick={() => newLevel(levelIdx + 1)}>
                ➡️ {tr('codeMaze.next')}
              </CandyButton>
            )}
          </motion.div>
        )}
        {failed && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} className="mt-3 text-center">
            <p className="text-lg font-extrabold text-candy-pink-deep">❌ {tr('codeMaze.fail')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
