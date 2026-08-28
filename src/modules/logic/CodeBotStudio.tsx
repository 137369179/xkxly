/**
 * 🤖 可汗少儿/洪恩级「CodeBot 智能积木编程与太空迷宫探险」 (CodeBot Studio Pro)
 * -------------------------------------------------------------------------
 * 1. 🧩 积木指令系统：前进、左转 90°、右转 90°、拾取能量晶石、踩踏机关、循环 Repeat 3x / 4x；
 * 2. 🗺️ 6 大递进主题迷宫（直线巡航、直角转弯、激光门与开关、循环优化、终极全晶石收集）；
 * 3. ⚙️ 单步调试 ⏭️、正常/倍速执行 🐇、最优指令星级评价（⭐⭐⭐ 黄金算法工程师）；
 * 4. 实时碰撞声效与物理轨迹高亮展示，启发幼儿计算思维与空间逻辑！
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { StreakBar } from '@/components/study/StreakBar';

// ── 机器人朝向：0: 北(上), 1: 东(右), 2: 南(下), 3: 西(左) ──
export type Heading = 0 | 1 | 2 | 3;

const HEADING_DELTA: Record<Heading, { dx: number; dy: number }> = {
  0: { dx: 0, dy: -1 },
  1: { dx: 1, dy: 0 },
  2: { dx: 0, dy: 1 },
  3: { dx: -1, dy: 0 },
};

const HEADING_ROTATION: Record<Heading, number> = {
  0: -90,
  1: 0,
  2: 90,
  3: 180,
};

// ── 指令积木类型 ──
export type CommandType =
  | 'forward'
  | 'turn-left'
  | 'turn-right'
  | 'collect'
  | 'switch'
  | 'repeat-3'
  | 'repeat-4';

interface CommandDef {
  type: CommandType;
  label: string;
  emoji: string;
  color: string;
  desc: string;
}

const COMMAND_DEFS: CommandDef[] = [
  { type: 'forward', label: '前进 1 格', emoji: '⬆️', color: 'bg-blue-500 text-white border-blue-600', desc: '朝当前方向走 1 格' },
  { type: 'turn-left', label: '向左转 90°', emoji: '↺', color: 'bg-purple-500 text-white border-purple-600', desc: '原地向左转' },
  { type: 'turn-right', label: '向右转 90°', emoji: '↻', color: 'bg-indigo-500 text-white border-indigo-600', desc: '原地向右转' },
  { type: 'collect', label: '拾取晶石', emoji: '💎', color: 'bg-emerald-500 text-white border-emerald-600', desc: '收集脚下的能量晶石' },
  { type: 'switch', label: '按下开关', emoji: '🔘', color: 'bg-amber-500 text-white border-amber-600', desc: '踩踏解除前方激光门' },
  { type: 'repeat-3', label: '重复 3 次前进', emoji: '🔁×3', color: 'bg-rose-500 text-white border-rose-600', desc: '快速连续前进 3 步' },
];

// ── 关卡数据 ──
interface LevelData {
  id: number;
  title: string;
  subtitle: string;
  optimalSteps: number;
  gridSize: { cols: number; rows: number };
  start: { x: number; y: number; heading: Heading };
  goal: { x: number; y: number };
  walls: { x: number; y: number }[];
  gems: { x: number; y: number }[];
  switches?: { x: number; y: number }[];
  laserDoors?: { x: number; y: number }[];
  hint: string;
}

const LEVELS: LevelData[] = [
  {
    id: 1,
    title: '第 1 关：直线巡航',
    subtitle: '认识「前进」指令',
    optimalSteps: 4,
    gridSize: { cols: 4, rows: 2 },
    start: { x: 0, y: 0, heading: 1 }, // 朝东
    goal: { x: 3, y: 0 },
    walls: [],
    gems: [{ x: 1, y: 0 }],
    hint: '点击 2 次【前进】，再加 1 次【拾取晶石】和 1 次【前进】吧！',
  },
  {
    id: 2,
    title: '第 2 关：拐弯转角',
    subtitle: '转向指令与前进配合',
    optimalSteps: 5,
    gridSize: { cols: 3, rows: 3 },
    start: { x: 0, y: 0, heading: 1 }, // 朝东
    goal: { x: 2, y: 2 },
    walls: [{ x: 1, y: 1 }, { x: 0, y: 1 }],
    gems: [{ x: 2, y: 0 }],
    hint: '先前进到晶石处拾取，然后【向右转】，再前进到达终点！',
  },
  {
    id: 3,
    title: '第 3 关：能量机关',
    subtitle: '踩踏机关解除激光门',
    optimalSteps: 7,
    gridSize: { cols: 4, rows: 3 },
    start: { x: 0, y: 0, heading: 1 },
    goal: { x: 3, y: 0 },
    walls: [{ x: 1, y: 1 }],
    gems: [{ x: 3, y: 2 }],
    switches: [{ x: 0, y: 2 }],
    laserDoors: [{ x: 2, y: 0 }],
    hint: '先向下去踩【机关🔘】解除激光门，收集右下角水晶，再回到终点！',
  },
  {
    id: 4,
    title: '第 4 关：快速走廊',
    subtitle: '体验「重复执行」的高效',
    optimalSteps: 3,
    gridSize: { cols: 5, rows: 2 },
    start: { x: 0, y: 0, heading: 1 },
    goal: { x: 4, y: 0 },
    walls: [],
    gems: [{ x: 3, y: 0 }],
    hint: '使用【重复 3 次前进🔁】一步到位，再拾取水晶走向终点！',
  },
  {
    id: 5,
    title: '第 5 关：星际迷宫大冒险',
    subtitle: '综合计算思维挑战',
    optimalSteps: 8,
    gridSize: { cols: 4, rows: 4 },
    start: { x: 0, y: 0, heading: 2 }, // 朝南
    goal: { x: 3, y: 3 },
    walls: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }],
    gems: [{ x: 0, y: 3 }, { x: 3, y: 0 }],
    switches: [{ x: 0, y: 2 }],
    laserDoors: [{ x: 2, y: 3 }],
    hint: '仔细规划路线：踩机关解除大门，收集全部 2 颗晶石后进入火箭！',
  },
  {
    id: 6,
    title: '第 6 关：终极太空城堡',
    subtitle: '大师级双机关全收集',
    optimalSteps: 9,
    gridSize: { cols: 5, rows: 4 },
    start: { x: 0, y: 0, heading: 1 },
    goal: { x: 4, y: 3 },
    walls: [{ x: 2, y: 1 }, { x: 2, y: 2 }],
    gems: [{ x: 4, y: 0 }, { x: 0, y: 3 }],
    switches: [{ x: 2, y: 0 }],
    laserDoors: [{ x: 3, y: 3 }],
    hint: '先踩上方机关解除激光门，收集右上角与左下角晶石，再冲向终点！',
  },
];

const FALLBACK_LEVEL: LevelData = LEVELS[0] ?? {
  id: 1,
  title: '第 1 关：直线巡航',
  subtitle: '认识指令',
  optimalSteps: 4,
  gridSize: { cols: 4, rows: 2 },
  start: { x: 0, y: 0, heading: 1 },
  goal: { x: 3, y: 0 },
  walls: [],
  gems: [],
  hint: '出发！',
};

export function CodeBotStudio() {
  const addStars = useStore((s) => s.addStars);
  const practice = useStore((s) => s.practice);

  const [levelIdx, setLevelIdx] = useState(0);
  const [pipeline, setPipeline] = useState<CommandType[]>([]);
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [speed, setSpeed] = useState<'normal' | 'fast'>('normal');

  const currentLevel = useMemo(() => {
    return LEVELS[levelIdx % LEVELS.length] ?? LEVELS[0] ?? FALLBACK_LEVEL;
  }, [levelIdx]);

  // 物理机器人位置与状态
  const [botPos, setBotPos] = useState({
    x: currentLevel.start.x,
    y: currentLevel.start.y,
    heading: currentLevel.start.heading,
  });
  const [collectedGems, setCollectedGems] = useState<Set<string>>(new Set());
  const [activeSwitches, setActiveSwitches] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<string>('');

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // 切换关卡时重置
  const handleReset = useCallback(() => {
    setBotPos({
      x: currentLevel.start.x,
      y: currentLevel.start.y,
      heading: currentLevel.start.heading,
    });
    setCollectedGems(new Set());
    setActiveSwitches(new Set());
    setStepIdx(null);
    setRunning(false);
    setStatusMessage('');
  }, [currentLevel]);

  useEffect(() => {
    handleReset();
    setPipeline([]);
  }, [handleReset]);

  // 添加指令到流水线
  const handleAddCommand = useCallback((cmd: CommandType) => {
    if (running) return;
    sfxTap();
    triggerHaptic(25);
    setPipeline((prev) => [...prev, cmd]);
  }, [running]);

  // 删除单步指令
  const handleRemoveCommand = useCallback((idx: number) => {
    if (running) return;
    sfxTap();
    triggerHaptic(20);
    setPipeline((prev) => prev.filter((_, i) => i !== idx));
  }, [running]);

  // 清空流水线
  const handleClearPipeline = useCallback(() => {
    if (running) return;
    sfxTap();
    triggerHaptic(40);
    setPipeline([]);
    handleReset();
  }, [running, handleReset]);

  // 展开流水线中的循环指令为原子动作列表
  const unrolledCommands = useMemo(() => {
    const list: { cmd: CommandType; sourceIdx: number }[] = [];
    pipeline.forEach((cmd, idx) => {
      if (cmd === 'repeat-3') {
        list.push({ cmd: 'forward', sourceIdx: idx });
        list.push({ cmd: 'forward', sourceIdx: idx });
        list.push({ cmd: 'forward', sourceIdx: idx });
      } else if (cmd === 'repeat-4') {
        list.push({ cmd: 'forward', sourceIdx: idx });
        list.push({ cmd: 'forward', sourceIdx: idx });
        list.push({ cmd: 'forward', sourceIdx: idx });
        list.push({ cmd: 'forward', sourceIdx: idx });
      } else {
        list.push({ cmd, sourceIdx: idx });
      }
    });
    return list;
  }, [pipeline]);

  // 运行程序
  const handleRunPipeline = async () => {
    if (running || pipeline.length === 0) return;
    setRunning(true);
    handleReset();
    setStatusMessage('🚀 正在执行程序...');

    let curX = currentLevel.start.x;
    let curY = currentLevel.start.y;
    let curHeading = currentLevel.start.heading;
    const gems = new Set<string>();
    const switches = new Set<string>();

    const delayTime = speed === 'fast' ? 220 : 450;

    for (let i = 0; i < unrolledCommands.length; i++) {
      const step = unrolledCommands[i];
      if (!step) continue;
      setStepIdx(step.sourceIdx);

      // 动作解算
      if (step.cmd === 'forward') {
        const delta = HEADING_DELTA[curHeading];
        const nextX = curX + delta.dx;
        const nextY = curY + delta.dy;

        // 边界检查
        if (
          nextX < 0 ||
          nextX >= currentLevel.gridSize.cols ||
          nextY < 0 ||
          nextY >= currentLevel.gridSize.rows
        ) {
          sfxWrong();
          setStatusMessage('💥 撞到地图边缘啦！');
          void speak('哎呀，小机器人撞到边界啦！请检查路线。', { lang: 'zh-CN' });
          setRunning(false);
          setStreak(0);
          return;
        }

        // 障碍物检查
        const isWall = currentLevel.walls.some((w) => w.x === nextX && w.y === nextY);
        if (isWall) {
          sfxWrong();
          setStatusMessage('🪨 前方有障碍物阻挡！');
          void speak('前方有石头挡路，尝试换个方向转弯哦！', { lang: 'zh-CN' });
          setRunning(false);
          setStreak(0);
          return;
        }

        // 激光门检查
        const isLaserDoor =
          currentLevel.laserDoors?.some((d) => d.x === nextX && d.y === nextY) &&
          !switches.has('active');
        if (isLaserDoor) {
          sfxWrong();
          setStatusMessage('⚡ 激光门还未关闭，无法通行！');
          void speak('前面有激光门，先去踩下机关解除它吧！', { lang: 'zh-CN' });
          setRunning(false);
          setStreak(0);
          return;
        }

        curX = nextX;
        curY = nextY;
      } else if (step.cmd === 'turn-left') {
        curHeading = ((curHeading + 3) % 4) as Heading;
      } else if (step.cmd === 'turn-right') {
        curHeading = ((curHeading + 1) % 4) as Heading;
      } else if (step.cmd === 'collect') {
        const onGem = currentLevel.gems.some((g) => g.x === curX && g.y === curY);
        if (onGem) {
          gems.add(`${curX},${curY}`);
          setCollectedGems(new Set(gems));
          sfxCorrect();
        }
      } else if (step.cmd === 'switch') {
        const onSwitch = currentLevel.switches?.some((s) => s.x === curX && s.y === curY);
        if (onSwitch) {
          switches.add('active');
          setActiveSwitches(new Set(switches));
          sfxCorrect();
        }
      }

      setBotPos({ x: curX, y: curY, heading: curHeading });
      await new Promise((r) => setTimeout(r, delayTime));
      if (!aliveRef.current) return;
    }

    // 终点与胜利判定
    const reachedGoal = curX === currentLevel.goal.x && curY === currentLevel.goal.y;
    const allGemsCollected = currentLevel.gems.every((g) => gems.has(`${g.x},${g.y}`));

    if (reachedGoal && allGemsCollected) {
      sfxWin();
      celebrateBig();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      const isOptimal = pipeline.length <= currentLevel.optimalSteps;
      addStars(isOptimal ? 3 : 2);
      practice('logic:codebot-pro', true, 2, 1);
      setStatusMessage(`🎉 成功编写程序发射火箭！${isOptimal ? '⭐⭐⭐ 黄金最优算法！' : '⭐⭐ 完美通关！'}`);
      void speak('太棒啦！程序运行成功，小机器人搭乘火箭升空啦！', { lang: 'zh-CN' });
    } else if (reachedGoal && !allGemsCollected) {
      sfxWrong();
      setStatusMessage('💎 到达终点，但还有能量晶石未收集哦！');
      void speak('到达了终点，但是别忘了收集途中的所有晶石哦！', { lang: 'zh-CN' });
      setStreak(0);
    } else {
      sfxWrong();
      triggerHaptic(30);
      setStatusMessage('🏁 未能到达终点火箭，继续调整指令吧！');
      void speak('还没有走到火箭处哦，再加几条指令试试看吧！', { lang: 'zh-CN' });
      setStreak(0);
    }

    setRunning(false);
  };

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const cmdDef = COMMAND_DEFS[idx];
        if (cmdDef && !running) {
          e.preventDefault();
          handleAddCommand(cmdDef.type);
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        void handleRunPipeline();
      } else if (e.key === 'Backspace' || e.key === 'z' || e.key === 'Z') {
        if (pipeline.length > 0 && !running) {
          e.preventDefault();
          handleRemoveCommand(pipeline.length - 1);
        }
      } else if (e.key === 'c' || e.key === 'C') {
        if (!running) {
          e.preventDefault();
          handleClearPipeline();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (!running) {
          e.preventDefault();
          handleReset();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [running, pipeline, handleAddCommand, handleRemoveCommand, handleClearPipeline, handleReset]);

  return (
    <div className="space-y-4">
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-blue-900 font-bold bg-blue-50/90 px-3 py-1 rounded-xl border border-blue-200">
          ⌨️ 键盘快捷操作：数字键 1-6 选积木 · 空格/Enter 运行程序 · Z/退格 撤销单步 · C 清空 · R 复位
        </span>
      </div>

      {/* 关卡切换与连击状态 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map((lvl, idx) => {
            const isSel = levelIdx === idx;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => {
                  if (running) return;
                  sfxTap();
                  setLevelIdx(idx);
                }}
                className={`py-1.5 px-3 rounded-2xl font-black text-xs transition-all border-2 ${
                  isSel
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-105'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                }`}
              >
                {lvl.title.split('：')[0]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 'normal' ? 'fast' : 'normal'))}
            className="py-1 px-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs font-black text-slate-700"
          >
            {speed === 'fast' ? '🐇 2x 极速' : '🐢 1x 正常'}
          </button>
          <StreakBar streak={streak} target={3} />
        </div>
      </div>

      {/* 地图与控制面板两栏布局 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* 左侧：物理迷宫网格地图 */}
        <div className="md:col-span-7 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-5 border-3 border-indigo-800 shadow-lg flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-white">
            <div>
              <h3 className="text-base font-black flex items-center gap-1.5">
                <span>🤖</span>
                <span>{currentLevel.title}</span>
              </h3>
              <p className="text-xs text-indigo-300 font-semibold">{currentLevel.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              disabled={running}
              className="px-3 py-1 rounded-xl bg-indigo-800/80 hover:bg-indigo-700 text-xs font-bold text-indigo-200 border border-indigo-600 transition"
            >
              🔄 复位机器人
            </button>
          </div>

          {/* 网格渲染舞台 */}
          <div className="flex justify-center items-center py-2">
            <div
              className="grid gap-2 p-3 bg-indigo-950/60 rounded-3xl border-2 border-indigo-700/50 shadow-inner"
              style={{
                gridTemplateColumns: `repeat(${currentLevel.gridSize.cols}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: currentLevel.gridSize.rows }).map((_, r) =>
                Array.from({ length: currentLevel.gridSize.cols }).map((_, c) => {
                  const isBot = botPos.x === c && botPos.y === r;
                  const isGoal = currentLevel.goal.x === c && currentLevel.goal.y === r;
                  const isWall = currentLevel.walls.some((w) => w.x === c && w.y === r);
                  const isGem =
                    currentLevel.gems.some((g) => g.x === c && g.y === r) &&
                    !collectedGems.has(`${c},${r}`);
                  const isSwitch = currentLevel.switches?.some((s) => s.x === c && s.y === r);
                  const isSwitchActive = activeSwitches.has('active');
                  const isLaserDoor =
                    currentLevel.laserDoors?.some((d) => d.x === c && d.y === r) &&
                    !isSwitchActive;

                  return (
                    <div
                      key={`cell-${r}-${c}`}
                      className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center text-2xl relative transition-all ${
                        isWall
                          ? 'bg-slate-800 border-2 border-slate-700 shadow-md'
                          : 'bg-indigo-900/40 border border-indigo-700/30'
                      }`}
                    >
                      {/* 地图元素图标 */}
                      {isWall && <span className="text-2xl">🪨</span>}
                      {isGem && !isBot && (
                        <motion.span
                          animate={{ scale: [1, 1.15, 1], y: [0, -3, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="text-2xl drop-shadow-md"
                        >
                          💎
                        </motion.span>
                      )}
                      {isSwitch && (
                        <span className={`text-xl ${isSwitchActive ? 'opacity-40' : 'animate-pulse'}`}>
                          🔘
                        </span>
                      )}
                      {isLaserDoor && (
                        <span className="text-2xl animate-pulse text-rose-400">⚡🚪</span>
                      )}
                      {isGoal && !isBot && (
                        <motion.span
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="text-3xl"
                        >
                          🚀
                        </motion.span>
                      )}

                      {/* 机器人渲染 */}
                      {isBot && (
                        <motion.div
                          layout
                          style={{ rotate: HEADING_ROTATION[botPos.heading] }}
                          className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-2xl shadow-lg border-2 border-white z-10"
                        >
                          🤖
                        </motion.div>
                      )}
                    </div>
                  );
                }),
              )}
            </div>
          </div>

          {/* 状态与语音提示 */}
          <div className="bg-indigo-900/60 rounded-2xl p-3 border border-indigo-700/60 text-xs font-semibold text-indigo-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>💡</span>
              <p>{statusMessage || currentLevel.hint}</p>
            </div>
            <button
              type="button"
              onClick={() => void speak(currentLevel.hint, { lang: 'zh-CN' })}
              className="text-base hover:scale-110 active:scale-95 transition"
            >
              🔊
            </button>
          </div>
        </div>

        {/* 右侧：积木指令仓库与执行流水线 */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-4">
          {/* 指令积木仓库 */}
          <div className="bg-white rounded-3xl p-4 border-2 border-slate-200 shadow-sm space-y-3">
            <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">
              📦 指令积木仓库（点击添加）
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {COMMAND_DEFS.map((def) => (
                <button
                  key={def.type}
                  type="button"
                  disabled={running}
                  onClick={() => handleAddCommand(def.type)}
                  className={`py-2 px-3 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 border-2 shadow-sm hover:scale-[1.02] active:scale-[0.98] ${def.color}`}
                >
                  <span className="text-base">{def.emoji}</span>
                  <span>{def.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 执行流水线 */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-4 border-2 border-indigo-200 shadow-sm flex-1 flex flex-col justify-between space-y-3 min-h-[220px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-900">
                📜 程序流水线 ({pipeline.length} 步 / 最优 {currentLevel.optimalSteps} 步)
              </span>
              {pipeline.length > 0 && (
                <button
                  type="button"
                  disabled={running}
                  onClick={handleClearPipeline}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700"
                >
                  🗑️ 清空流水线
                </button>
              )}
            </div>

            {/* 流水线积木卡片序列 */}
            <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto p-1">
              {pipeline.length === 0 ? (
                <div className="w-full text-center py-8 text-xs font-bold text-slate-400">
                  请从上方点击积木，为机器人编写行动程序！
                </div>
              ) : (
                pipeline.map((cmd, idx) => {
                  const def = COMMAND_DEFS.find((d) => d.type === cmd) ?? COMMAND_DEFS[0];
                  const isCurrentExecuting = stepIdx === idx;

                  return (
                    <motion.div
                      key={`pipeline-${idx}-${cmd}`}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`py-1.5 px-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 border shadow-sm transition-all ${
                        isCurrentExecuting
                          ? 'ring-4 ring-amber-400 bg-amber-500 text-white scale-110 z-10'
                          : `${def?.color ?? 'bg-blue-500 text-white'}`
                      }`}
                    >
                      <span>{def?.emoji}</span>
                      <span>{def?.label}</span>
                      {!running && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCommand(idx)}
                          className="opacity-70 hover:opacity-100 ml-1 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* 运行与调试主控按钮 */}
            <div className="pt-2">
              <button
                type="button"
                disabled={running || pipeline.length === 0}
                onClick={handleRunPipeline}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 text-white font-black text-sm shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                <span>🚀</span>
                <span>{running ? '程序运行中...' : '运行编写好的程序'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
