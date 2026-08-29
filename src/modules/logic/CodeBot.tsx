import { useState, useCallback, useRef, useEffect } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { AiPanel } from '@/components/ai';
import { useAiStream } from '@/lib/ai/useAi';
import { logicExplainTask } from '@/lib/ai/tasks';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { motion } from 'motion/react';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';

type Dir = 'up' | 'down' | 'left' | 'right';
type Cell = 'empty' | 'wall' | 'goal' | 'star';

interface Level {
  id: number;
  name: string;
  grid: Cell[][];
  start: { x: number; y: number };
  maxSteps: number;
  hint: string;
}

const LEVELS: Level[] = [
  {
    id: 1,
    name: '第 1 关：直走',
    grid: [
      ['empty', 'empty', 'goal'],
    ],
    start: { x: 0, y: 0 },
    maxSteps: 5,
    hint: '向右走 2 步到达 🏁',
  },
  {
    id: 2,
    name: '第 2 关：拐弯',
    grid: [
      ['empty', 'empty', 'wall'],
      ['wall', 'empty', 'empty'],
      ['wall', 'wall', 'goal'],
    ],
    start: { x: 0, y: 0 },
    maxSteps: 8,
    hint: '先向右 2 步，再向下 2 步',
  },
  {
    id: 3,
    name: '第 3 关：捡星星',
    grid: [
      ['empty', 'star', 'empty'],
      ['wall', 'wall', 'empty'],
      ['empty', 'empty', 'goal'],
    ],
    start: { x: 0, y: 0 },
    maxSteps: 10,
    hint: '先去捡 ⭐，再到 🏁',
  },
  {
    id: 4,
    name: '第 4 关：迷宫',
    grid: [
      ['empty', 'wall', 'empty', 'goal'],
      ['empty', 'wall', 'empty', 'wall'],
      ['empty', 'empty', 'empty', 'empty'],
    ],
    start: { x: 0, y: 0 },
    maxSteps: 12,
    hint: '向下一路走到右下角',
  },
  {
    id: 5,
    name: '第 5 关：大冒险',
    grid: [
      ['empty', 'empty', 'wall', 'star'],
      ['wall', 'empty', 'wall', 'empty'],
      ['empty', 'empty', 'empty', 'empty'],
      ['empty', 'wall', 'wall', 'goal'],
    ],
    start: { x: 0, y: 0 },
    maxSteps: 15,
    hint: '捡星星再到达终点',
  },
];

const DIR_EMOJI: Record<Dir, string> = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };
const DIR_DELTA: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function CodeBot() {
  const { t: tr } = useTranslation();
  const practice = useStore((s) => s.practice);
  const [levelIdx, setLevelIdx] = useState(0);
  const [commands, setCommands] = useState<Dir[]>([]);
  const [executing, setExecuting] = useState(false);
  const [robotPos, setRobotPos] = useState(LEVELS[0]!.start);
  const [collectedStars, setCollectedStars] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<'idle' | 'running' | 'win' | 'fail'>('idle');
  const [execStep, setExecStep] = useState(0);
  const explain = useAiStream();

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const level = LEVELS[levelIdx]!
  const rows = level.grid.length;
  const cols = level.grid[0]!.length;

  const reset = useCallback(() => {
    setCommands([]);
    setRobotPos(level.start);
    setCollectedStars(new Set());
    setStatus('idle');
    setExecStep(0);
    setExecuting(false);
  }, [level]);

  const addCmd = (dir: Dir) => {
    if (executing || status === 'win') return;
    sfxTap();
    setCommands(c => [...c, dir]);
  };

  const removeCmd = (i: number) => {
    if (executing) return;
    setCommands(c => c.filter((_, idx) => idx !== i));
  };

  const run = async () => {
    if (commands.length === 0 || executing) return;
    setExecuting(true);
    setStatus('running');
    let pos = { ...level.start };
    const stars = new Set<string>();
    setRobotPos(pos);
    setCollectedStars(stars);

    for (let i = 0; i < commands.length; i++) {
      setExecStep(i);
      const d = DIR_DELTA[commands[i]!];
      const nx = pos.x + d.x;
      const ny = pos.y + d.y;
      await new Promise(r => setTimeout(r, 500));
      if (!aliveRef.current) return;

      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
        setStatus('fail');
        sfxWrong();
        practice('logic:codebot', false);
        setExecuting(false);
        return;
      }
      const cell = level.grid[ny]![nx];
      if (cell === 'wall') {
        setStatus('fail');
        sfxWrong();
        practice('logic:codebot', false);
        setExecuting(false);
        return;
      }
      pos = { x: nx, y: ny };
      setRobotPos(pos);
      if (cell === 'star') {
        stars.add(`${nx},${ny}`);
        setCollectedStars(new Set(stars));
        sfxCorrect();
      }
      if (cell === 'goal') {
        setStatus('win');
        celebrateBig();
        practice('logic:codebot', true);
        setExecuting(false);
        return;
      }
    }
    setStatus('fail');
    sfxWrong();
    practice('logic:codebot', false);
    setExecuting(false);
  };

  const nextLevel = () => {
    if (levelIdx < LEVELS.length - 1) {
      setLevelIdx(i => i + 1);
      setCommands([]);
      setRobotPos(LEVELS[levelIdx + 1]!.start);
      setCollectedStars(new Set());
      setStatus('idle');
      setExecStep(0);
    }
  };

  const cellRender = (x: number, y: number) => {
    const cell = level.grid[y]![x];
    const isRobot = robotPos.x === x && robotPos.y === y;
    const isStarCollected = collectedStars.has(`${x},${y}`);

    let content = '';
    if (cell === 'wall') content = '🧱';
    else if (cell === 'goal') content = '🏁';
    else if (cell === 'star' && !isStarCollected) content = '⭐';
    else if (isRobot) content = '🤖';

    return (
      <div
        key={`${x},${y}`}
        className={`grid place-items-center rounded-xl text-2xl sm:text-3xl ${cell === 'wall' ? 'bg-gray-200' : 'bg-candy-blue-soft'}`}
        style={{ aspectRatio: '1', minHeight: 40 }}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 关卡选择 */}
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l, i) => (
          <CandyButton
            key={l.id}
            tone={levelIdx === i ? 'green' : 'purple'}
            variant={levelIdx === i ? 'solid' : 'soft'}
            size="sm"
            onClick={() => { setLevelIdx(i); setCommands([]); setRobotPos(l.start); setCollectedStars(new Set()); setStatus('idle'); setExecStep(0); }}
          >
            {l.name}
          </CandyButton>
        ))}
      </div>

      {/* 关卡信息 */}
      <Panel>
        <PanelTitle emoji="🤖" title={level.name} subtitle={tr('logic.maxSteps', { max: level.maxSteps, hint: level.hint })} tone="green" />
        {/* 棋盘 */}
        <div className="mx-auto" style={{ maxWidth: `${cols * 56}px` }}>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: rows }).map((_, y) =>
              Array.from({ length: cols }).map((_, x) => cellRender(x, y))
            )}
          </div>
        </div>
      </Panel>

      {/* 指令序列 */}
      <Panel>
        <PanelTitle emoji="📜" title={tr('logic.cmdSeq')} subtitle={tr('logic.cmdSeqHint')} tone="blue" />
        <div className="mb-3 flex flex-wrap gap-2">
          {(['up', 'down', 'left', 'right'] as Dir[]).map(d => (
            <CandyButton key={d} tone="blue" size="md" onClick={() => addCmd(d)} disabled={executing}>
              {DIR_EMOJI[d]}
            </CandyButton>
          ))}
        </div>
        <div className="min-h-[48px] rounded-xl bg-candy-purple-soft p-2">
          {commands.length === 0 ? (
            <span className="text-sm font-bold text-ink-soft">{tr('logic.noCmdYet')}</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {commands.map((cmd, i) => (
                <motion.button
                  key={`cmd-${i}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={() => removeCmd(i)}
                  className={`grid h-10 w-10 place-items-center rounded-lg text-xl font-bold ${execStep === i && executing ? 'bg-candy-orange-main text-candy-orange-on' : 'bg-white text-ink'}`}
                  disabled={executing}
                >
                  {DIR_EMOJI[cmd]}
                </motion.button>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1 text-xs font-bold text-ink-soft">{tr('logic.stepsUsed', { used: commands.length, max: level.maxSteps })}</p>
      </Panel>

      {/* 控制按钮 */}
      <div className="flex gap-3">
        <CandyButton tone="green" size="lg" fullWidth onClick={run} disabled={executing || commands.length === 0 || status === 'win'}>
          {tr('logic.run')}
        </CandyButton>
        <CandyButton tone="orange" size="lg" variant="soft" onClick={reset} disabled={executing}>
          {tr('logic.reset')}
        </CandyButton>
      </div>

      {/* 结果 */}
      {status === 'win' && (
        <Panel className="text-center">
          <div className="text-5xl">🎉</div>
          <p className="mt-2 text-lg font-extrabold text-candy-green-deep">{tr('logic.winMsg')}</p>
          {levelIdx < LEVELS.length - 1 && (
            <CandyButton tone="green" size="lg" className="mt-3" onClick={nextLevel}>{tr('logic.nextLevel')}</CandyButton>
          )}
        </Panel>
      )}
      {status === 'fail' && (
        <Panel className="text-center">
          <div className="text-4xl">🤔</div>
          <p className="mt-2 text-base font-bold text-candy-orange-deep">{tr('logic.failMsg')}</p>
          <div className="mt-2">
            <CandyButton tone="purple" size="sm" variant="soft" onClick={() => { try { explain.run(logicExplainTask(level.hint, '', '')); } catch { /* AI 讲解失败不阻断游戏 */ } }}>{tr('logic.aiHelp')}</CandyButton>
          </div>
          <AiPanel state={explain} tone="purple" title={tr('logic.aiHint')} />
        </Panel>
      )}
    </div>
  );
}
