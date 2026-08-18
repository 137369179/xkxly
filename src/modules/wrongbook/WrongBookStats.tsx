/**
 * 错题本统计可视化 · 纯 SVG 手绘
 * ------------------------------------------------------------------
 * 3 个图表：错题趋势折线图、薄弱学科雷达图、消灭进度环
 * 零第三方依赖，纯 SVG + Tailwind
 */

import { useMemo } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useProgress } from '@/store/useStore';
import { dateKey } from '@/lib/dailyPlan';
import { SUBJECTS } from '@/lib/srs';

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */
function recentDays(n: number, anchorKey?: string): string[] {
  const out: string[] = [];
  const now = anchorKey ? new Date(anchorKey).getTime() : Date.now();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 1. 错题趋势折线图（近 7 天每日错题数）                               */
/* ------------------------------------------------------------------ */
export function WrongTrendChart() {
  const { t: tr } = useTranslation();
  const progress = useProgress();
  const today = dateKey();
  const days = useMemo(() => recentDays(7, today), [today]);

  const data = useMemo(() => {
    return days.map((d) => {
      const snap = progress.growth.find((s) => s.date === d);
      return {
        date: d,
        total: snap?.wrongCount ?? progress.wrongBook.length,
        new: snap?.wrongNew ?? 0,
      };
    });
  }, [days, progress.growth, progress.wrongBook.length]);

  const maxVal = Math.max(...data.map((d) => d.total), 5);
  const W = 100;
  const H = 45;
  const padX = 10;
  const padY = 6;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;

  const xStep = data.length > 1 ? plotW / (data.length - 1) : 0;

  const totalPoints = data.map((d, i) => {
    const x = padX + i * xStep;
    const y = padY + plotH - (d.total / maxVal) * plotH;
    return `${x},${y}`;
  });

  const newPoints = data.map((d, i) => {
    const x = padX + i * xStep;
    const y = padY + plotH - (d.new / maxVal) * plotH;
    return `${x},${y}`;
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-ink-soft">{tr('wrongbook.trend7Days')}</span>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 font-bold text-ink-soft">
            <span className="h-2 w-2 rounded-full" style={{ background: '#ff5c7a' }} />
            {tr('wrongbook.totalWrong')}
          </span>
          <span className="flex items-center gap-1 font-bold text-ink-soft">
            <span className="h-2 w-2 rounded-full" style={{ background: '#e5ac2e' }} />
            {tr('wrongbook.new')}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
        {/* 网格线 */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <line
            key={r}
            x1={padX}
            y1={padY + plotH * (1 - r)}
            x2={W - padX}
            y2={padY + plotH * (1 - r)}
            stroke="#f0dde2"
            strokeWidth={0.2}
            strokeDasharray="1,1"
          />
        ))}
        {/* 总错题折线 */}
        <polyline
          points={totalPoints.join(' ')}
          fill="none"
          stroke="#ff5c7a"
          strokeWidth={0.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => {
          const x = padX + i * xStep;
          const y = padY + plotH - (d.total / maxVal) * plotH;
          const isToday = d.date === today;
          return (
            <circle
              key={`t-${d.date}`}
              cx={x}
              cy={y}
              r={isToday ? 1.6 : 1}
              fill={isToday ? '#ff5c7a' : '#fff'}
              stroke="#ff5c7a"
              strokeWidth={0.5}
            />
          );
        })}
        {/* 新增错题折线 */}
        <polyline
          points={newPoints.join(' ')}
          fill="none"
          stroke="#e5ac2e"
          strokeWidth={0.8}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="2,1"
        />
        {data.map((d, i) => {
          const x = padX + i * xStep;
          const y = padY + plotH - (d.new / maxVal) * plotH;
          return (
            <circle
              key={`n-${d.date}`}
              cx={x}
              cy={y}
              r={0.8}
              fill="#e5ac2e"
            />
          );
        })}
        {/* X 轴标签 */}
        {data.map((d, i) => (
          <text
            key={`x-${d.date}`}
            x={padX + i * xStep}
            y={H - 1}
            fontSize={2}
            textAnchor="middle"
            fill={d.date === today ? '#ff5c7a' : '#b38894'}
            fontWeight={d.date === today ? 'bold' : 'normal'}
          >
            {d.date.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. 薄弱学科雷达图（各学科错误率）                                    */
/* ------------------------------------------------------------------ */
const RADAR_KEYS = ['math', 'hanzi', 'pinyin', 'poem', 'word', 'logic'];

export function WeaknessRadar() {
  const { t: tr } = useTranslation();
  const progress = useProgress();

  const dims = useMemo(() => {
    return RADAR_KEYS.map((key) => {
      const subject = SUBJECTS.find((s) => s.key === key);
      const wrong = progress.wrongBook.filter((s) => s.startsWith(key + ':')).length;
      const total = Object.keys(progress.mastery).filter((k) => k.startsWith(key + ':')).length;
      const ratio = total > 0 ? wrong / total : 0;
      return {
        key,
        label: subject?.label ?? key,
        color: subject?.color ?? '#b38894',
        wrong,
        total,
        ratio,
      };
    });
  }, [progress.wrongBook, progress.mastery]);

  const cx = 50;
  const cy = 50;
  const r = 35;
  const angleStep = (Math.PI * 2) / dims.length;

  const polygonPoints = dims
    .map((d, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const dist = d.ratio * r;
      return `${cx + Math.cos(angle) * dist},${cy + Math.sin(angle) * dist}`;
    })
    .join(' ');

  return (
    <div className="space-y-2">
      <span className="text-sm font-bold text-ink-soft">{tr('wrongbook.weaknessDistribution')}</span>
      <svg viewBox="0 0 100 100" className="mx-auto" style={{ width: 200, height: 200 }}>
        {/* 背景网格 */}
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <polygon
            key={ratio}
            points={dims
              .map((_, i) => {
                const angle = i * angleStep - Math.PI / 2;
                return `${cx + Math.cos(angle) * r * ratio},${cy + Math.sin(angle) * r * ratio}`;
              })
              .join(' ')}
            fill="none"
            stroke="#f0dde2"
            strokeWidth={0.3}
          />
        ))}
        {/* 轴线 */}
        {dims.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(angle) * r}
              y2={cy + Math.sin(angle) * r}
              stroke="#f0dde2"
              strokeWidth={0.3}
            />
          );
        })}
        {/* 数据多边形 */}
        <polygon
          points={polygonPoints}
          fill="rgba(255,92,122,0.2)"
          stroke="#ff5c7a"
          strokeWidth={0.6}
        />
        {/* 维度标签 */}
        {dims.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelR = r + 10;
          return (
            <g key={d.key}>
              <text
                x={cx + Math.cos(angle) * labelR}
                y={cy + Math.sin(angle) * labelR}
                fontSize={3}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={d.color}
                fontWeight="bold"
              >
                {tr(`subject.${d.key}`)}
              </text>
              <text
                x={cx + Math.cos(angle) * labelR}
                y={cy + Math.sin(angle) * labelR + 3.5}
                fontSize={2.2}
                textAnchor="middle"
                fill="#b38894"
              >
                {d.wrong}/{d.total || 0}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. 消灭进度环                                                       */
/* ------------------------------------------------------------------ */
export function KillProgressRing() {
  const { t: tr } = useTranslation();
  const progress = useProgress();

  const { cleared, current, pct } = useMemo(() => {
    const wh = progress.wrongHistory;
    const cleared = wh?.cleared ?? 0;
    const current = progress.wrongBook.length;
    const total = cleared + current;
    const pct = total > 0 ? Math.round((cleared / total) * 100) : 0;
    return { cleared, current, pct };
  }, [progress.wrongHistory, progress.wrongBook.length]);

  const cx = 50;
  const cy = 50;
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const dashLen = (pct / 100) * circumference;

  return (
    <div className="space-y-2">
      <span className="text-sm font-bold text-ink-soft">{tr('wrongbook.progress')}</span>
      <div className="flex items-center justify-center">
        <svg viewBox="0 0 100 100" style={{ width: 160, height: 160 }}>
          {/* 背景圆环 */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#f0dde2"
            strokeWidth={6}
          />
          {/* 进度圆环 */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#33a863"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${dashLen} ${circumference}`}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
          {/* 中心文字 */}
          <text x={cx} y={cy - 2} fontSize={10} textAnchor="middle" fill="#33a863" fontWeight="bold">
            {pct}%
          </text>
          <text x={cx} y={cy + 6} fontSize={3.5} textAnchor="middle" fill="#b38894">
            {tr('wrongbook.killRate')}
          </text>
          <text x={cx} y={cy + 12} fontSize={2.8} textAnchor="middle" fill="#b38894">
            {tr('wrongbook.killCount', { cleared, current })}
          </text>
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 统计卡片                                                             */
/* ------------------------------------------------------------------ */
export function WrongBookStatCards() {
  const { t: tr } = useTranslation();
  const progress = useProgress();

  const stats = useMemo(() => {
    const today = dateKey();
    const todaySnap = progress.growth.find((s) => s.date === today);
    const todayNew = todaySnap?.wrongNew ?? 0;
    const due = progress.wrongBook.filter((s) => {
      const m = progress.mastery[s];
      return m && (m.due ?? Infinity) <= Date.now();
    }).length;
    const cleared = progress.wrongHistory?.cleared ?? 0;

    return [
      { label: tr('wrongbook.totalWrong'), value: progress.wrongBook.length, emoji: '📝', color: '#ff5c7a' },
      { label: tr('wrongbook.killed'), value: cleared, emoji: '✅', color: '#33a863' },
      { label: tr('wrongbook.toReview'), value: due, emoji: '⏰', color: '#e5ac2e' },
      { label: tr('wrongbook.todayNew'), value: todayNew, emoji: '🆕', color: '#2e93c9' },
    ];
  }, [progress.wrongBook, progress.mastery, progress.growth, progress.wrongHistory, tr]);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl bg-white/80 p-3 text-center shadow-sm"
        >
          <div className="text-2xl">{s.emoji}</div>
          <div className="text-2xl font-black" style={{ color: s.color }}>
            {s.value}
          </div>
          <div className="text-xs font-bold text-ink-soft">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
