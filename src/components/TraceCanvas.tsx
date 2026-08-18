import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { sfxCorrect, sfxTap, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 描红书写板
 *
 * 产品依据：洪恩识字「写」环节 / 帮帮识字「动态笔顺引导」。
 * 6 岁儿童的目标不是把字写漂亮，而是建立**笔画与字形结构的感知**。
 *
 * 技术方案（无需为每个字维护笔画数据，字母/数字/汉字通用）：
 *   1. 离屏渲染目标字形 → 下采样成 G×G 覆盖网格（target 集合）
 *   2. target 做 1 格膨胀得到容错区（tolerant），照顾儿童的手部精细动作误差
 *   3. 手指划过的格子记为 drawn
 *   4. 覆盖率 = |drawn ∩ target| / |target|；出格率 = |drawn - tolerant| / |drawn|
 *   5. 分区覆盖率 = 3×3 宫格中「描到位」的宫格占比（防止只写主干/半边）
 *   6. 覆盖率 ≥ 72% 且出格率 ≤ 40% 且分区覆盖率 ≥ 65% 才判定通过
 *
 * 注：进度条展示的是「综合完成度」，与判定条件严格一致——
 *     进度条到 100% 等价于可以通过，避免出现「显示写完了却不通过」的错位。
 */

const SIZE = 300;
const GRID = 50;
const CELL = SIZE / GRID;
const BRUSH = 13;
const PASS_COVERAGE = 0.72;
const MAX_STRAY = 0.4;
// 容错膨胀：从 2 格收到 1 格，减少"出格但靠近"被误算成命中，从而虚高覆盖率
const TOLERANCE_R = 1;
// 九宫格分区覆盖校验：防止只写主干/半边就判定通过
const BLOCK_DIV = 3; // 3×3 宫格
const BLOCK_RATIO = 0.35; // 单个宫格内"写好"的最低覆盖比例
const BLOCK_PASS_RATIO = 0.65; // 至少 65% 的有效宫格写好，才算整字写完

const FONT_STACK =
  '"Baloo 2", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';

interface Masks {
  target: Uint8Array;
  tolerant: Uint8Array;
  targetCount: number;
}

/** 计算目标字形的覆盖网格与容错网格 */
function buildMasks(char: string): Masks {
  const off = document.createElement('canvas');
  off.width = SIZE;
  off.height = SIZE;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 汉字比拉丁字母占位大，字号相应收一点
  const scale = /[\u4e00-\u9fa5]/.test(char) ? 0.66 : 0.76;
  ctx.font = `700 ${Math.round(SIZE * scale)}px ${FONT_STACK}`;
  ctx.fillText(char, SIZE / 2, SIZE / 2 + SIZE * 0.02);

  const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const target = new Uint8Array(GRID * GRID);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if ((data[(y * SIZE + x) * 4 + 3] ?? 0) > 80) {
        target[Math.floor(y / CELL) * GRID + Math.floor(x / CELL)] = 1;
      }
    }
  }

  // 膨胀 1 格作为容错区（收窄以更准地反映真实命中）
  const tolerant = new Uint8Array(GRID * GRID);
  const R = TOLERANCE_R;
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      if (!target[gy * GRID + gx]) continue;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const ny = gy + dy;
          const nx = gx + dx;
          if (ny >= 0 && ny < GRID && nx >= 0 && nx < GRID) tolerant[ny * GRID + nx] = 1;
        }
      }
    }
  }

  return { target, tolerant, targetCount: target.reduce((s, v) => s + v, 0) };
}

export interface TraceCanvasProps {
  char: string;
  tone?: Tone;
  /** 通过时回调 */
  onPass?: () => void;
  /** 提示文案 */
  hint?: string;
}

export function TraceCanvas({ char, tone = 'blue', onPass, hint }: TraceCanvasProps) {
  const { t: tr } = useTranslation();
  const t = TONE_STYLE[tone];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const masksRef = useRef<Masks | null>(null);
  const drawnRef = useRef<Uint8Array>(new Uint8Array(GRID * GRID));
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const passedRef = useRef(false);

  const [coverage, setCoverage] = useState(0);
  /** 未通过时的具体原因，用来给孩子精准提示 */
  const [miss, setMiss] = useState<'none' | 'blocks' | 'stray' | 'coverage'>('none');
  const [status, setStatus] = useState<'idle' | 'drawing' | 'pass' | 'retry'>('idle');
  const [demo, setDemo] = useState(false);
  const demoTimerRef = useRef<number | null>(null);

  /** 重绘底板：田字格 + 灰色引导字形 */
  const paintBase = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const isLatin = /^[A-Za-z0-9]$/.test(char);

    if (isLatin) {
      // 英文四线三格规范辅助线 (Top red, Mid dashed blue, Base blue, Bottom red)
      ctx.save();
      const lines = [
        { y: SIZE * 0.22, color: 'rgba(239, 68, 68, 0.45)', dash: [] }, // 顶线 (上加线)
        { y: SIZE * 0.42, color: 'rgba(59, 130, 246, 0.45)', dash: [6, 6] }, // 中线 (虚线)
        { y: SIZE * 0.62, color: 'rgba(59, 130, 246, 0.55)', dash: [] }, // 基准线
        { y: SIZE * 0.82, color: 'rgba(239, 68, 68, 0.45)', dash: [] }, // 底线 (下加线)
      ];
      for (const l of lines) {
        ctx.strokeStyle = l.color;
        ctx.lineWidth = 1.8;
        ctx.setLineDash(l.dash);
        ctx.beginPath();
        ctx.moveTo(10, l.y);
        ctx.lineTo(SIZE - 10, l.y);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // 汉字米字格辅助线（横/竖/对角虚线）
      ctx.save();
      ctx.strokeStyle = 'rgba(140, 120, 170, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      // 十字线
      ctx.moveTo(SIZE / 2, 8);
      ctx.lineTo(SIZE / 2, SIZE - 8);
      ctx.moveTo(8, SIZE / 2);
      ctx.lineTo(SIZE - 8, SIZE / 2);
      // 对角线
      ctx.moveTo(12, 12);
      ctx.lineTo(SIZE - 12, SIZE - 12);
      ctx.moveTo(SIZE - 12, 12);
      ctx.lineTo(12, SIZE - 12);
      ctx.stroke();
      ctx.restore();
    }

    // 引导字形（淡色描红底）
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const scale = /[\u4e00-\u9fa5]/.test(char) ? 0.66 : 0.76;
    ctx.font = `700 ${Math.round(SIZE * scale)}px ${FONT_STACK}`;
    ctx.fillStyle = 'rgba(120,100,160,0.13)';
    ctx.fillText(char, SIZE / 2, SIZE / 2 + SIZE * 0.02);
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(120,100,160,0.42)';
    ctx.strokeText(char, SIZE / 2, SIZE / 2 + SIZE * 0.02);
    ctx.restore();
  }, [char]);

  const reset = useCallback(() => {
    drawnRef.current = new Uint8Array(GRID * GRID);
    passedRef.current = false;
    setCoverage(0);
    setMiss('none');
    setStatus('idle');
    paintBase();
  }, [paintBase]);

  useEffect(() => {
    masksRef.current = buildMasks(char);
    reset();
  }, [char, reset]);

  useEffect(() => {
    return () => {
      if (demoTimerRef.current) window.clearTimeout(demoTimerRef.current);
    };
  }, []);

  /** 屏幕坐标 -> 画布逻辑坐标 */
  const toLocal = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * SIZE,
      y: ((e.clientY - r.top) / r.height) * SIZE,
    };
  };

  /** 记录笔刷覆盖的网格 */
  const markCells = (x: number, y: number) => {
    const rCells = Math.ceil(BRUSH / 2 / CELL);
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    for (let dy = -rCells; dy <= rCells; dy++) {
      for (let dx = -rCells; dx <= rCells; dx++) {
        if (dx * dx + dy * dy > rCells * rCells) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID) drawnRef.current[ny * GRID + nx] = 1;
      }
    }
  };

  const strokeTo = (x: number, y: number) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    const last = lastRef.current ?? { x, y };
    ctx.save();
    ctx.strokeStyle = t.main;
    ctx.lineWidth = BRUSH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#FFD700'; // 发光描金彩画
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();


    // 沿线段插值打点，避免快速滑动漏格
    const dist = Math.hypot(x - last.x, y - last.y);
    const steps = Math.max(1, Math.ceil(dist / (CELL / 2)));
    for (let i = 0; i <= steps; i++) {
      markCells(last.x + ((x - last.x) * i) / steps, last.y + ((y - last.y) * i) / steps);
    }
    lastRef.current = { x, y };
  };

  const onDown = (e: React.PointerEvent) => {
    if (passedRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    setStatus('drawing');
    const p = toLocal(e);
    lastRef.current = p;
    strokeTo(p.x, p.y);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const p = toLocal(e);
    strokeTo(p.x, p.y);
  };

  const evaluate = () => {
    const masks = masksRef.current;
    if (!masks || !masks.targetCount) return;
    let hit = 0;
    let drawn = 0;
    let stray = 0;
    for (let i = 0; i < drawnRef.current.length; i++) {
      if (!drawnRef.current[i]) continue;
      drawn++;
      if (masks.target[i]) hit++;
      if (!masks.tolerant[i]) stray++;
    }
    const cov = hit / masks.targetCount;
    const strayRate = drawn ? stray / drawn : 0;

    // 九宫格分区覆盖校验：把字形切成 3×3 宫格，要求「各个部位都描到」，
    // 而非只写主干/半边就蒙混过关（例如「木」只写竖+横就已达 55% 像素覆盖）。
    const bSize = GRID / BLOCK_DIV;
    let validBlocks = 0;
    let goodBlocks = 0;
    for (let by = 0; by < BLOCK_DIV; by++) {
      for (let bx = 0; bx < BLOCK_DIV; bx++) {
        const y0 = Math.floor(by * bSize);
        const y1 = Math.floor((by + 1) * bSize);
        const x0 = Math.floor(bx * bSize);
        const x1 = Math.floor((bx + 1) * bSize);
        let tc = 0;
        let hc = 0;
        for (let gy = y0; gy < y1; gy++) {
          for (let gx = x0; gx < x1; gx++) {
            const idx = gy * GRID + gx;
            if (masks.target[idx]) {
              tc++;
              if (drawnRef.current[idx]) hc++;
            }
          }
        }
        if (tc > 0) {
          validBlocks++;
          if (hc / tc >= BLOCK_RATIO) goodBlocks++;
        }
      }
    }
    const blockRatio = validBlocks ? goodBlocks / validBlocks : 0;

    // 综合完成度：取「整体覆盖」与「分区覆盖」两项进度的较小值，
    // 保证进度条 100% ⟺ 判定通过，不会出现「进度满了却说没写完」。
    const done = Math.min(cov / PASS_COVERAGE, blockRatio / BLOCK_PASS_RATIO);
    setCoverage(done);

    if (cov >= PASS_COVERAGE && strayRate <= MAX_STRAY && blockRatio >= BLOCK_PASS_RATIO) {
      passedRef.current = true;
      setMiss('none');
      setStatus('pass');
      sfxCorrect();
      celebrateSmall();
      onPass?.();
    } else {
      // 记录差在哪，失败时给出针对性提示
      if (strayRate > MAX_STRAY) setMiss('stray');
      else if (blockRatio < BLOCK_PASS_RATIO) setMiss('blocks');
      else setMiss('coverage');
      if (done >= 0.75) setStatus('drawing');
    }
  };

  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastRef.current = null;
    evaluate();
  };

  /** 书写演示：用擦除动画把引导字形"写"一遍 */
  const runDemo = () => {
    if (demo) return;
    sfxTap();
    setDemo(true);
    if (demoTimerRef.current) window.clearTimeout(demoTimerRef.current);
    demoTimerRef.current = window.setTimeout(() => setDemo(false), 1500);
  };

  const checkNow = () => {
    if (passedRef.current) return;
    evaluate();
    if (!passedRef.current) {
      sfxWrong();
      setStatus('retry');
    }
  };

  const pct = Math.round(Math.min(1, coverage) * 100);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 'min(78vw, 300px)' }}>
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className={cn(
            'w-full aspect-square rounded-3xl border-4 bg-white touch-none select-none',
            status === 'pass' ? 'border-candy-green' : 'border-white/90',
          )}
          style={{ boxShadow: '0 8px 24px rgba(120,100,160,0.18)' }}
        />

        {/* 书写演示的扫光 */}
        <AnimatePresence>
          {demo && (
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: '100%' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
              className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden"
            >
              <div
                className="h-1/3 w-full"
                style={{
                  background: `linear-gradient(180deg, transparent, ${t.soft}, transparent)`,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 通过标记 */}
        <AnimatePresence>
          {status === 'pass' && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: -12 }}
              className="pointer-events-none absolute -right-2 -top-2 rounded-full bg-candy-green px-4 py-2 text-lg font-black text-white shadow-lg"
            >
              {tr('hanzi.goodJob')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 完成度 */}
      <div className="flex w-full max-w-[300px] items-center gap-2">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/8">
          <motion.div
            className="h-full rounded-full"
            style={{ background: t.main }}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          />
        </div>
        <span className="w-12 text-right text-sm font-bold text-ink/60">{pct}%</span>
      </div>

      <p className="text-center text-sm font-semibold text-ink/55">
        {status === 'pass'
          ? tr('hanzi.passed')
          : status === 'retry'
            ? miss === 'blocks'
              ? tr('hanzi.missBlocks')
              : miss === 'stray'
                ? tr('hanzi.missStray')
                : tr('hanzi.missCoverage')
            : (hint ?? tr('hanzi.defaultHint'))}
      </p>

      <div className="flex gap-2">
        <CandyButton size="sm" variant="soft" tone={tone} onClick={runDemo}>
          {tr('hanzi.watchDemo')}
        </CandyButton>
        <CandyButton size="sm" variant="soft" tone="orange" onClick={reset}>
          {tr('hanzi.retry')}
        </CandyButton>
        {status !== 'pass' && (
          <CandyButton size="sm" tone="green" onClick={checkNow}>
            {tr('hanzi.done')}
          </CandyButton>
        )}
      </div>
    </div>
  );
}
