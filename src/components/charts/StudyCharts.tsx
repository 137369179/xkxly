/**
 * 学习统计图表组件 · 纯 SVG 手绘
 * ------------------------------------------------------------------
 * 4 个图表：时长柱状图、掌握率雷达图、错题分布饼图、打卡热力图
 * 零第三方依赖，纯 SVG + Tailwind
 */

import { useMemo } from 'react';
import { useProgress } from '@/store/useStore';
import { dateKey } from '@/lib/dailyPlan';
import { SUBJECTS, subjectLabel, subjectColor } from '@/lib/srs';
import { useTranslation } from '@/i18n/useTranslation';

/* ------------------------------------------------------------------ */
/* 工具：取近 N 天日期列表                                              */
/* ------------------------------------------------------------------ */
function recentDays(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 1. 学习时长柱状图（近 14 天）                                        */
/* ------------------------------------------------------------------ */
export function StudyTimeChart() {
  const { t: tr } = useTranslation();
  const progress = useProgress();
  const today = dateKey();
  const days = useMemo(() => recentDays(14), [today]);
  const data = days.map((d) => ({
    date: d,
    sec: progress.dailyLog[d]?.sec ?? 0,
  }));
  const maxSec = Math.max(...data.map((d) => d.sec), 600);
  const barWidth = 100 / data.length;

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <span className="text-sm font-bold text-ink-soft">{tr('charts.studyTimeTitle')}</span>
        <span className="text-xs font-bold text-ink-soft">
          {tr('charts.totalMinutes', { count: Math.round(data.reduce((s, d) => s + d.sec, 0) / 60) })}
        </span>
      </div>
      <svg viewBox="0 0 100 40" className="w-full" style={{ height: 120 }}>
        {data.map((d, i) => {
          const h = (d.sec / maxSec) * 32;
          const x = i * barWidth + barWidth * 0.15;
          const w = barWidth * 0.7;
          const y = 36 - h;
          const today = d.date === dateKey();
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={0.5}
                fill={today ? '#f59e0b' : '#60a5fa'}
                opacity={d.sec > 0 ? 0.85 : 0.2}
              />
              {d.sec > 0 && (
                <text x={x + w / 2} y={y - 0.8} fontSize={2.2} textAnchor="middle" fill="#374151" fontWeight="bold">
                  {Math.round(d.sec / 60)}
                </text>
              )}
              {(i % 2 === 0 || today) && (
                <text x={x + w / 2} y={39} fontSize={2} textAnchor="middle" fill="#9ca3af">
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={0} y1={36} x2={100} y2={36} stroke="#e5e7eb" strokeWidth={0.3} />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. 知识点掌握率雷达图（8 维）                                        */
/* ------------------------------------------------------------------ */
const RADAR_DIMS = SUBJECTS.slice(0, 8);

export function MasteryRadar() {
  const { t: tr } = useTranslation();
  const progress = useProgress();

  const values = useMemo(() => {
    return RADAR_DIMS.map((dim) => {
      const items = Object.entries(progress.mastery).filter(([k]) => k.startsWith(dim.key + ':'));
      if (items.length === 0) return 0;
      const avg = items.reduce((s, [, m]) => s + m.lv, 0) / items.length;
      return (avg / 5) * 100;
    });
  }, [progress.mastery]);

  const cx = 50;
  const cy = 50;
  const r = 38;
  const angleStep = (Math.PI * 2) / RADAR_DIMS.length;

  const polygonPoints = values
    .map((v, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const dist = (v / 100) * r;
      return `${cx + Math.cos(angle) * dist},${cy + Math.sin(angle) * dist}`;
    })
    .join(' ');

  return (
    <div className="space-y-2">
      <span className="text-sm font-bold text-ink-soft">{tr('charts.masteryTitle')}</span>
      <svg viewBox="0 0 100 100" className="mx-auto" style={{ width: 200, height: 200 }}>
        {/* 背景网格 */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((ratio) => (
          <polygon
            key={ratio}
            points={RADAR_DIMS.map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              return `${cx + Math.cos(angle) * r * ratio},${cy + Math.sin(angle) * r * ratio}`;
            }).join(' ')}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={0.3}
          />
        ))}
        {/* 轴线 */}
        {RADAR_DIMS.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line
              key={`_-${i}`}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(angle) * r}
              y2={cy + Math.sin(angle) * r}
              stroke="#e5e7eb"
              strokeWidth={0.3}
            />
          );
        })}
        {/* 数据多边形 */}
        <polygon points={polygonPoints} fill="rgba(96,165,250,0.25)" stroke="#3b82f6" strokeWidth={0.6} />
        {/* 维度标签 */}
        {RADAR_DIMS.map((dim, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelR = r + 8;
          return (
            <g key={dim.key}>
              <text
                x={cx + Math.cos(angle) * labelR}
                y={cy + Math.sin(angle) * labelR}
                fontSize={3}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={dim.color}
                fontWeight="bold"
              >
                {dim.label}
              </text>
              <text
                x={cx + Math.cos(angle) * labelR}
                y={cy + Math.sin(angle) * labelR + 3.5}
                fontSize={2.2}
                textAnchor="middle"
                fill="#9ca3af"
              >
                {Math.round(values[i]!)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. 错题分布饼图                                                     */
/* ------------------------------------------------------------------ */
export function WrongDistribution() {
  const { t: tr } = useTranslation();
  const progress = useProgress();

  const data = useMemo(() => {
    const cats: Record<string, number> = {};
    for (const skill of progress.wrongBook) {
      const cat = skill.split(':')[0] ?? 'other';
      cats[cat] = (cats[cat] ?? 0) + 1;
    }
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    if (total === 0) return [];
    return Object.entries(cats)
      .map(([cat, count]) => ({
        cat,
        count,
        ratio: count / total,
        color: subjectColor(cat),
        label: subjectLabel(cat),
      }))
      .sort((a, b) => b.count - a.count);
  }, [progress.wrongBook]);

  if (data.length === 0) {
    return (
      <div className="space-y-2">
        <span className="text-sm font-bold text-ink-soft">{tr('charts.wrongDistTitle')}</span>
        <p className="py-4 text-center text-sm font-bold text-ink-soft">🎉 {tr('charts.wrongEmpty')}</p>
      </div>
    );
  }

  let cumulative = 0;
  const cx = 50;
  const cy = 50;
  const r = 35;

  return (
    <div className="space-y-2">
      <span className="text-sm font-bold text-ink-soft">{tr('charts.wrongDistCount', { count: progress.wrongBook.length })}</span>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 100 100" style={{ width: 120, height: 120 }} className="shrink-0">
          {data.map((d) => {
            const startAngle = cumulative * Math.PI * 2 - Math.PI / 2;
            cumulative += d.ratio;
            const endAngle = cumulative * Math.PI * 2 - Math.PI / 2;
            const x1 = cx + Math.cos(startAngle) * r;
            const y1 = cy + Math.sin(startAngle) * r;
            const x2 = cx + Math.cos(endAngle) * r;
            const y2 = cy + Math.sin(endAngle) * r;
            const largeArc = d.ratio > 0.5 ? 1 : 0;
            return (
              <path
                key={d.cat}
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={d.color}
                opacity={0.85}
                stroke="#fff"
                strokeWidth={0.4}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={14} fill="#fff" />
          <text x={cx} y={cy - 1} fontSize={5} textAnchor="middle" fill="#374151" fontWeight="bold">
            {progress.wrongBook.length}
          </text>
          <text x={cx} y={cy + 4} fontSize={2.5} textAnchor="middle" fill="#9ca3af">
            {tr('charts.wrongCount')}
          </text>
        </svg>
        <div className="flex-1 space-y-1">
          {data.map((d) => (
            <div key={d.cat} className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded" style={{ background: d.color }} />
              <span className="font-bold text-ink">{d.label}</span>
              <span className="font-bold text-ink-soft">{tr('charts.questionCount', { count: d.count })}</span>
              <span className="ml-auto font-bold text-ink-soft">{Math.round(d.ratio * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. 打卡热力图（近 12 周）                                           */
/* ------------------------------------------------------------------ */
export function StudyHeatmap() {
  const { t: tr } = useTranslation();
  const progress = useProgress();

  const weeks = useMemo(() => {
    const now = Date.now();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const days: { date: string; sec: number; level: number }[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const sec = progress.dailyLog[key]?.sec ?? 0;
      const level = sec === 0 ? 0 : sec < 300 ? 1 : sec < 600 ? 2 : sec < 1200 ? 3 : 4;
      days.push({ date: key, sec, level });
    }
    // 分成 12 周
    const w: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, i + 7));
    }
    return w;
  }, [progress.dailyLog]);

  const levelColors = ['#e5e7eb', '#bbf7d0', '#4ade80', '#16a34a', '#15803d'];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-ink-soft">{tr('charts.heatmapTitle')}</span>
        <div className="flex items-center gap-1 text-xs text-ink-soft">
          <span>{tr('charts.less')}</span>
          {levelColors.map((c, i) => (
            <span key={`c-${i}`} className="h-3 w-3 rounded-sm" style={{ background: c }} />
          ))}
          <span>{tr('charts.more')}</span>
        </div>
      </div>
      <div className="flex gap-[2px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[2px]">
            {week.map((day) => (
              <div
                key={day.date}
                title={tr('charts.heatmapCell', { date: day.date, minutes: Math.round(day.sec / 60) })}
                className="h-3 w-3 rounded-sm transition hover:scale-125"
                style={{ background: levelColors[day.level] }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
