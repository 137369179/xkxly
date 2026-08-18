/**
 * ✍️ 逐笔跟写板（真实笔顺数据驱动）
 * ------------------------------------------------------------------
 * 与 TraceCanvas（覆盖率判定、适合字母/数字）不同，本组件面向汉字：
 *   - 孩子必须**按笔顺**一笔一笔写；
 *   - 每一笔用该笔的「中线」做判定：孩子轨迹需覆盖中线采样点 ≥80%，
 *     且 70% 轨迹点落在线条附近（防止乱涂），轨迹长度 ≥ 中线一半；
 *   - 写对一笔墨色填充一笔，写错只清当前笔、给儿童化提示，不清整字。
 *
 * 坐标系：hanzi-writer 1024 书法坐标（y 向上）。
 * 屏幕坐标 → 原始坐标：x_r = x_svg，y_r = 900 - y_svg。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { sfxCorrect, sfxTap, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import {
  ensureStrokeData,
  densifyMedian,
  medianLength,
  type StrokeData,
} from '@/lib/strokes';

const VIEW = 1024;
const TOL = 120; // 命中容差（1024 空间单位），约等于屏幕 35px
const COVER_NEED = 0.8;
const NEAR_NEED = 0.7;
const LEN_RATIO = 0.5;

type Pt = [number, number];

function dist(a: Pt, b: Pt) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function pathLen(pts: Pt[]) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[i - 1];
    if (a !== undefined && b !== undefined) l += dist(a, b);
  }
  return l;
}

/** 判定一条轨迹是否写出了这一笔 */
function validateStroke(drawn: Pt[], median: Pt[]): boolean {
  if (drawn.length < 2) return false;
  const dense = densifyMedian(median, 24);
  // 覆盖：中线每个采样点附近都要有孩子的轨迹
  let hit = 0;
  for (const mp of dense) {
    for (const dp of drawn) {
      if (dist(dp, mp) <= TOL) {
        hit++;
        break;
      }
    }
  }
  const coverage = hit / dense.length;
  // 防乱涂：孩子的大部分轨迹点要落在笔画附近
  let near = 0;
  for (const dp of drawn) {
    for (const mp of dense) {
      if (dist(dp, mp) <= TOL * 1.3) {
        near++;
        break;
      }
    }
  }
  const nearRate = near / drawn.length;
  return coverage >= COVER_NEED && nearRate >= NEAR_NEED && pathLen(drawn) >= medianLength(median) * LEN_RATIO;
}

export interface StrokeTraceProps {
  char: string;
  tone?: Tone;
  onPass?: () => void;
}

export function StrokeTrace({ char, tone = 'green', onPass }: StrokeTraceProps) {
  const t = TONE_STYLE[tone];
  const { t: translate } = useTranslation();
  const [data, setData] = useState<StrokeData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [strokeIdx, setStrokeIdx] = useState(0); // 当前要写第几笔
  const [doneStrokes, setDoneStrokes] = useState(0); // 已完成笔数
  const [trail, setTrail] = useState<Pt[]>([]); // 当前笔的轨迹（原始坐标）
  const [status, setStatus] = useState<'idle' | 'drawing' | 'pass' | 'retry'>('idle');
  const passedRef = useRef(false);
  const drawingRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const total = data?.s.length ?? 0;

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setData(null);
    setStrokeIdx(0);
    setDoneStrokes(0);
    setTrail([]);
    setStatus('idle');
    passedRef.current = false;
    ensureStrokeData(char).then((d) => {
      if (!alive) return;
      setData(d);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [char]);

  const reset = useCallback(() => {
    setStrokeIdx(0);
    setDoneStrokes(0);
    setTrail([]);
    setStatus('idle');
    passedRef.current = false;
  }, []);

  /** 屏幕事件 → 1024 原始坐标（y 翻转回来） */
  const toRaw = (e: React.PointerEvent): Pt => {
    const el = svgRef.current ?? null;
    if (!el) return [0, 0];
    const r = el.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * VIEW;
    const sy = ((e.clientY - r.top) / r.height) * VIEW;
    return [sx, 900 - sy];
  };

  const onDown = (e: React.PointerEvent) => {
    if (passedRef.current || !total) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    setStatus('drawing');
    setTrail([toRaw(e)]);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const p = toRaw(e);
    setTrail((prev) => {
      // 抽稀：距离上一个采样点太近就丢弃，减少判定计算量
      const last = prev[prev.length - 1];
      if (last && dist(last, p) < 10) return prev;
      return [...prev, p];
    });
  };

  const onUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (!data) return;
    const ok = validateStroke(trail, (data.m[strokeIdx] ?? []) as Pt[]);
    if (ok) {
      sfxCorrect();
      const nextDone = doneStrokes + 1;
      setDoneStrokes(nextDone);
      setTrail([]);
      if (nextDone >= total) {
        passedRef.current = true;
        setStatus('pass');
        celebrateSmall();
        onPass?.();
      } else {
        setStrokeIdx(strokeIdx + 1);
        setStatus('idle');
      }
    } else {
      sfxWrong();
      setTrail([]);
      setStatus('retry');
    }
  };

  const trailPath = useMemo(
    () => (trail.length ? trail.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') : ''),
    [trail],
  );

  // 当前笔的起点标记（提示孩子从哪里起笔）
  const startDot: Pt | null =
    data && strokeIdx < total ? ((data.m[strokeIdx]?.[0] ?? null) as Pt | null) : null;

  if (loaded && !total) {
    return (
      <p className="py-6 text-center text-sm font-bold text-ink-soft">
        {translate('hanzi.noStrokeData')}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 'min(78vw, 300px)' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className={cn(
            'w-full aspect-square rounded-3xl border-4 bg-white touch-none select-none',
            status === 'pass' ? 'border-candy-green' : 'border-white/90',
          )}
          style={{ boxShadow: '0 8px 24px rgba(120,100,160,0.18)' }}
        >
          {/* 米字格 */}
          <g stroke="#ece5ff" strokeDasharray="14,14" strokeWidth="3">
            <line x1={0} y1={VIEW / 2} x2={VIEW} y2={VIEW / 2} />
            <line x1={VIEW / 2} y1={0} x2={VIEW / 2} y2={VIEW} />
            <line x1={0} y1={0} x2={VIEW} y2={VIEW} />
            <line x1={VIEW} y1={0} x2={0} y2={VIEW} />
          </g>

          <g transform="scale(1,-1) translate(0,-900)">
            {/* 未写的笔：浅灰底 */}
            {data?.s.map((d, i) => (
              <path key={`g${i}`} d={d} fill={i < doneStrokes ? 'none' : '#ece5ff'} />
            ))}
            {/* 已完成的笔：墨色实心 */}
            {data?.s.map((d, i) =>
              i < doneStrokes ? <path key={`f${i}`} d={d} fill="#5c2e3d" /> : null,
            )}
            {/* 当前笔：呼吸高亮轮廓 */}
            {data && strokeIdx < total && status !== 'pass' && (
              <path
                d={data.s[strokeIdx]}
                fill={t.main}
                opacity={0.28}
                className="animate-pulse"
              />
            )}
            {/* 起笔提示点 */}
            {startDot && status !== 'pass' && (
              <circle cx={startDot[0]} cy={startDot[1]} r={34} fill="#e5ac2e" className="animate-ping" />
            )}
            {/* 当前轨迹 */}
            {trailPath && (
              <path
                d={trailPath}
                fill="none"
                stroke={t.main}
                strokeWidth={52}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        </svg>

        <AnimatePresence>
          {status === 'pass' && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: -12 }}
              className="pointer-events-none absolute -right-2 -top-2 rounded-full bg-candy-green px-4 py-2 text-lg font-black text-white shadow-lg"
            >
              {translate('hanzi.strokeAllRight')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 笔顺进度 */}
      {total > 0 && (
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={`_-${i}`}
              className={cn(
                'h-2.5 w-2.5 rounded-full transition-all',
                i < doneStrokes ? 'scale-110' : i === strokeIdx ? 'animate-pulse' : '',
              )}
              style={{
                background: i < doneStrokes ? '#33a863' : i === strokeIdx ? t.main : '#f0dde2',
              }}
            />
          ))}
          <span className="ml-2 text-xs font-bold text-ink-soft">
            {translate('hanzi.strokeN', { current: Math.min(strokeIdx + 1, total), total })}
          </span>
        </div>
      )}

      <p className="text-center text-sm font-semibold text-ink/55">
        {status === 'pass'
          ? translate('hanzi.strokePassMsg')
          : status === 'retry'
            ? translate('hanzi.strokeRetryMsg')
            : !loaded
              ? translate('hanzi.strokeLoading')
              : translate('hanzi.strokeGuide')}
      </p>

      <div className="flex gap-2">
        <CandyButton size="sm" variant="soft" tone="orange" onClick={() => { sfxTap(); reset(); }}>
          {translate('hanzi.rewriteAll')}
        </CandyButton>
        {status === 'retry' && (
          <CandyButton size="sm" tone={tone} onClick={() => { sfxTap(); setStatus('idle'); }}>
            {translate('hanzi.keepWriting')}
          </CandyButton>
        )}
      </div>
    </div>
  );
}
