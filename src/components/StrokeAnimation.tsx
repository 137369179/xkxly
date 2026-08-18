/**
 * 🖌️ 真实汉字笔顺动画组件
 * ------------------------------------------------------------------
 * 数据源：hanzi-writer-data 真实笔画 SVG（Make Me a Hanzi 项目）。
 * 渲染原理（与 hanzi-writer 相同）：
 *   - 每笔形状 path 作为 clipPath；
 *   - 沿该笔中线画一条粗圆头线段，用 dashoffset 从全长→0 做"书写"动画；
 *   - 线段被 clipPath 裁剪后，看起来就是这笔被一笔一画写出来。
 * 坐标系：1024×1024 书法坐标（y 向上），渲染时整体 scale(1,-1) translate(0,-900)。
 * 无数据的字回退为静态米字格字形展示。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { sfxTap } from '@/lib/sfx';
import { ensureStrokeData, medianLength, type StrokeData } from '@/lib/strokes';
import { useTranslation } from '@/i18n/useTranslation';

interface StrokeAnimationProps {
  char: string;
  /** 自动播放（默认 true）；false 时显示"播放"按钮，由孩子手动触发 */
  autoPlay?: boolean;
  /** 每笔间隔 ms（默认 750） */
  strokeMs?: number;
}

const INK = '#5c2e3d'; // 主墨色（--color-ink 暖墨）
const INK_DONE = '#471f2c';
const GUIDE = '#ece5ff';

function medianToPath(m: [number, number][]): string {
  return m.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
}

export function StrokeAnimation({ char, autoPlay = true, strokeMs = 750 }: StrokeAnimationProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<StrokeData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState(-1); // 正在写的笔序；-1 = 未开始
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = data?.s.length ?? 0;
  const done = current >= total - 1 && total > 0;

  // 加载笔顺数据
  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setData(null);
    setCurrent(-1);
    setPlaying(false);
    ensureStrokeData(char).then((d) => {
      if (!alive) return;
      setData(d);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [char]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  useEffect(() => clearTimer, []);

  const play = () => {
    if (!total) return;
    clearTimer();
    setCurrent(-1);
    setPlaying(true);
    let i = -1;
    const tick = () => {
      i++;
      setCurrent(i);
      if (i < total - 1) {
        timerRef.current = setTimeout(tick, strokeMs);
      } else {
        setPlaying(false);
      }
    };
    timerRef.current = setTimeout(tick, 120);
  };

  // 自动播放（数据就绪后）
  useEffect(() => {
    if (autoPlay && loaded && total > 0) play();
    // intentional: only re-play when these specific flags change, not on full data object
  }, [loaded, total, char]);

  // 每笔中线长度（驱动 dash 动画）
  const medianLens = useMemo(() => (data ? data.m.map(medianLength) : []), [data]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
      <div className="flex w-full items-center justify-between">
        <span className="text-xs font-black text-indigo-700">
          {t('strokeAnimation.demoTitle')}{total > 0 && current >= 0 ? ` · ${t('strokeAnimation.strokeCount', { current: Math.min(current + 1, total), total })}` : ''}
        </span>
        <button
          onClick={() => { sfxTap(); play(); }}
          disabled={!total}
          className="text-xs font-bold text-indigo-600 underline disabled:opacity-40"
        >
          {playing ? t('strokeAnimation.writing') : done ? t('strokeAnimation.replayDone') : t('strokeAnimation.play')}
        </button>
      </div>

      <div className="relative flex h-44 w-44 items-center justify-center rounded-2xl border-2 border-indigo-300 bg-white shadow-fluffy">
        {/* 米字格 */}
        <svg className="absolute inset-0 h-full w-full" stroke="#d9c6f5" strokeDasharray="5,5">
          <line x1="0" y1="50%" x2="100%" y2="50%" strokeWidth="1" />
          <line x1="50%" y1="0" x2="50%" y2="100%" strokeWidth="1" />
          <line x1="0" y1="0" x2="100%" y2="100%" strokeWidth="1" />
          <line x1="100%" y1="0" x2="0" y2="100%" strokeWidth="1" />
        </svg>

        {total > 0 ? (
          <svg viewBox="0 0 1024 1024" className="relative z-10 h-40 w-40">
            <defs>
              {(data?.s ?? []).map((d, i) => (
                <clipPath key={`d-${i}`} id={`hz-clip-${char}-${i}`}>
                  <path d={d} />
                </clipPath>
              ))}
            </defs>
            <g transform="scale(1,-1) translate(0,-900)">
              {/* 浅灰字形底（未写到的笔） */}
              {(data?.s ?? []).map((d, i) => (
                <path key={`g${i}`} d={d} fill={i <= current ? 'none' : GUIDE} />
              ))}
              {/* 已完成的笔：实心墨色 */}
              {(data?.s ?? []).map((d, i) =>
                i < current || (done && i <= current) ? (
                  <path key={`f${i}`} d={d} fill={INK_DONE} />
                ) : null,
              )}
              {/* 正在书写的笔：中线粗线 + dash 动画，被笔形裁剪 */}
              {current >= 0 && current < total && data?.m[current] && (
                <g clipPath={`url(#hz-clip-${char}-${current})`}>
                  <path
                    key={`stroke-${char}-${current}`}
                    d={medianToPath(data?.m[current] ?? [])}
                    fill="none"
                    stroke={INK}
                    strokeWidth={110}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      strokeDasharray: medianLens[current],
                      strokeDashoffset: medianLens[current],
                      animation: `hz-draw-${char} ${Math.max(0.35, strokeMs / 1000 - 0.15)}s linear forwards`,
                    }}
                  />
                </g>
              )}
            </g>
          </svg>
        ) : (
          // 无笔顺数据：静态展示
          <span className="relative z-10 text-8xl font-black text-indigo-900">{char}</span>
        )}
      </div>

      {/* dash 动画关键帧（长度由 style 注入） */}
      <style>{`@keyframes hz-draw-${char} { to { stroke-dashoffset: 0; } }`}</style>

      <p className="text-xs font-bold text-indigo-600">
        {total > 0
          ? done
            ? t('strokeAnimation.remember', { char, total })
            : playing
              ? t('strokeAnimation.watchOrder')
              : t('strokeAnimation.clickToPlay', { char })
          : loaded
            ? t('strokeAnimation.noData')
            : t('strokeAnimation.loading')}
      </p>
    </div>
  );
}
