/**
 * 迷宫探索 - 上下左右导航+收集物品
 */

import { useState, useCallback, useEffect } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxStar, sfxWin } from '@/lib/sfx';
import { celebrateBig, celebrateSmall } from '@/lib/celebrate';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '@/i18n/useTranslation';

const DIRS: Record<string, [number, number]> = {
  '⬆️': [-1, 0],
  '⬇️': [1, 0],
  '⬅️': [0, -1],
  '➡️': [0, 1],
};

interface MazeLevel {
  name: string;
  emoji: string;
  grid: string[][];
  start: [number, number];
  end: [number, number];
  items: [number, number][];
}

const WALL = '🧱';
const PATH = '⬜';
const END = '🏠';

const LEVELS: MazeLevel[] = [
  {
    name: 'mazeGame.level1',
    emoji: '🏠',
    grid: [
      ['🧱','🧱','🧱','🧱','🧱'],
      [PATH,'🧱',PATH,PATH,END],
      [PATH,PATH,PATH,'🧱','🧱'],
      ['🧱','🧱',PATH,PATH,'🧱'],
      ['🧱','🧱','🧱',PATH,'🧱'],
    ],
    start: [1, 0],
    end: [1, 4],
    items: [[2, 2]],
  },
  {
    name: 'mazeGame.level2',
    emoji: '⭐',
    grid: [
      [PATH,PATH,'🧱',PATH,END],
      ['🧱',PATH,'🧱',PATH,'🧱'],
      ['🧱',PATH,PATH,PATH,'🧱'],
      ['🧱','🧱','🧱',PATH,'🧱'],
      ['🧱','🧱','🧱',PATH,'🧱'],
    ],
    start: [0, 0],
    end: [0, 4],
    items: [[2, 3], [1, 1]],
  },
  {
    name: 'mazeGame.level3',
    emoji: '🌟',
    grid: [
      [PATH,PATH,'🧱',PATH,PATH],
      ['🧱',PATH,'🧱',PATH,'🧱'],
      ['🧱',PATH,PATH,PATH,'🧱'],
      ['🧱','🧱','🧱',PATH,END],
      [PATH,PATH,PATH,PATH,'🧱'],
    ],
    start: [0, 0],
    end: [3, 4],
    items: [[0, 3], [2, 1], [4, 2]],
  },
  {
    name: 'mazeGame.level4',
    emoji: '💎',
    grid: [
      [PATH,'🧱',PATH,PATH,PATH],
      [PATH,'🧱',PATH,'🧱',END],
      [PATH,PATH,PATH,'🧱','🧱'],
      ['🧱','🧱',PATH,PATH,'🧱'],
      [PATH,PATH,PATH,'🧱',PATH],
    ],
    start: [0, 0],
    end: [1, 4],
    items: [[0, 2], [2, 4], [4, 0], [3, 2]],
  },
  {
    name: 'mazeGame.level5',
    emoji: '🏆',
    grid: [
      [PATH,'🧱',PATH,PATH,PATH,'🧱'],
      [PATH,'🧱',PATH,'🧱',PATH,PATH],
      [PATH,PATH,PATH,'🧱','🧱',PATH],
      ['🧱','🧱',PATH,PATH,'🧱',PATH],
      [PATH,PATH,PATH,'🧱','🧱',PATH],
      ['🧱','🧱',PATH,PATH,PATH,END],
    ],
    start: [0, 0],
    end: [5, 5],
    items: [[0, 2], [2, 0], [2, 5], [4, 2], [5, 0]],
  },
];

export function MazeGame() {
  const { t: tr } = useTranslation();
  const [level, setLevel] = useState(0);
  const [pos, setPos] = useState<[number, number]>(LEVELS[0]!.start);
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [complete, setComplete] = useState(false);
  const [moves, setMoves] = useState(0);

  const lv = LEVELS[level]!!

  const resetLevel = useCallback((i: number) => {
    setLevel(i);
    setPos(LEVELS[i]!.start);
    setCollected(new Set());
    setComplete(false);
    setMoves(0);
  }, []);

  const move = (d: string) => {
    if (complete) return;
    sfxTap();
    const [dr, dc] = DIRS[d]!;
    const [r, c] = pos;
    const nr = r + dr;
    const nc = c + dc;

    // 边界检查
    if (nr < 0 || nr >= lv.grid.length || nc < 0 || nc >= lv.grid[0]!.length) return;
    // 撞墙
    if (lv.grid[nr]![nc] === WALL) return;

    const newPos: [number, number] = [nr, nc];
    setPos(newPos);
    setMoves(m => m + 1);

    // 收集物品
    const itemIdx = lv.items.findIndex(([ir, ic]) => ir === nr && ic === nc);
    if (itemIdx >= 0) {
      const key = `${nr},${nc}`;
      if (!collected.has(key)) {
        sfxStar();
        setCollected(c => new Set([...c, key]));
      }
    }

    // 到达终点
    if (nr === lv.end[0] && nc === lv.end[1]) {
      sfxWin();
      setComplete(true);
      if (collected.size >= lv.items.length - (lv.items.some(([ir, ic]) => ir === nr && ic === nc) ? 0 : 0)) {
        celebrateBig();
      } else {
        celebrateSmall();
      }
    }
  };

  // 键盘控制
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': move('⬆️'); break;
        case 'ArrowDown': move('⬇️'); break;
        case 'ArrowLeft': move('⬅️'); break;
        case 'ArrowRight': move('➡️'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pos, complete, collected]);

  const allCollected = collected.size >= lv.items.length;

  return (
    <div className="space-y-4">
      <PageHeader emoji="🗺️" title={tr(lv.name)} subtitle={tr('mazeGame.subtitle', { level: level + 1, total: LEVELS.length, moves })} tone="green" />

      <div className="flex justify-center">
        <div className="inline-block rounded-2xl bg-candy-green-soft p-3">
          {lv.grid.map((row, r) => (
            <div key={r} className="flex">
              {row.map((cell, c) => {
                const isPos = r === pos[0]! && c === pos[1]!;
                const isItem = lv.items.some(([ir, ic]) => ir === r && ic === c) && !collected.has(`${r},${c}`);
                const isCollected = collected.has(`${r},${c}`);

                return (
                  <motion.div
                    key={`${r}-${c}`}
                    animate={isPos ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="flex h-12 w-12 items-center justify-center text-2xl"
                  >
                    {isPos ? (
                      <span className="text-3xl">🐱</span>
                    ) : isCollected ? (
                      <span className="text-sm opacity-40">✅</span>
                    ) : isItem ? (
                      <span className="animate-bounce">💎</span>
                    ) : cell === WALL ? (
                      '🧱'
                    ) : cell === END ? (
                      <span className="text-2xl">{allCollected ? '🏆' : '🏠'}</span>
                    ) : (
                      <span className="text-xs opacity-20">·</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 方向键 */}
      <div className="flex flex-col items-center gap-2">
        <CandyButton tone="green" size="sm" onClick={() => move('⬆️')} className="text-xl">⬆️</CandyButton>
        <div className="flex gap-3">
          <CandyButton tone="green" size="sm" onClick={() => move('⬅️')} className="text-xl">⬅️</CandyButton>
          <CandyButton tone="green" size="sm" onClick={() => move('⬇️')} className="text-xl">⬇️</CandyButton>
          <CandyButton tone="green" size="sm" onClick={() => move('➡️')} className="text-xl">➡️</CandyButton>
        </div>
      </div>

      <p className="text-center text-xs font-bold text-ink-soft">💡 {tr('mazeGame.keyboardHint')}</p>

      {collected.size > 0 && (
        <div className="text-center">
          <span className="text-xs font-bold text-candy-green-deep">💎 {tr('mazeGame.collected', { n: collected.size, total: lv.items.length })}</span>
        </div>
      )}

      <AnimatePresence>
        {complete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Panel className="text-center">
              <div className="text-4xl">{allCollected ? '🎊' : '🎉'}</div>
              <h3 className="mt-1 text-lg font-black text-ink">
                {allCollected ? tr('mazeGame.perfect', { moves }) : tr('mazeGame.arrived')}
              </h3>
              {allCollected && <p className="text-xs font-bold text-ink-soft">{tr('mazeGame.allGems')}</p>}
              <div className="mt-3 flex justify-center gap-2">
                <CandyButton tone="green" variant="soft" size="sm" onClick={() => resetLevel(level)}>
                  🔄 {tr('mazeGame.restart')}
                </CandyButton>
                {level < LEVELS.length - 1 && (
                  <CandyButton tone="orange" size="sm" onClick={() => resetLevel(level + 1)}>
                    ▶️ {tr('mazeGame.next')}
                  </CandyButton>
                )}
              </div>
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
