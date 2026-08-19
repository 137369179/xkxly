/**
 * 本周 vs 上周学习对比
 */

import { useMemo } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { useDailyLog } from '@/store/useStore';
import { dateKey } from '@/lib/dailyPlan';

interface WeekData {
  minutes: number;
  items: number;
  ok: number;
  stars: number;
  days: number;
}

function getWeekData(dailyLog: Record<string, { sec: number; items: number; ok: number; stars: number }>, daysAgo: number): WeekData {
  const now = new Date();
  let minutes = 0, items = 0, ok = 0, stars = 0, days = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - (daysAgo + i) * 86400000);
    const key = dateKey(d.getTime());
    const entry = dailyLog[key];
    if (entry) {
      minutes += Math.floor((entry.sec ?? 0) / 60);
      items += entry.items ?? 0;
      ok += entry.ok ?? 0;
      stars += entry.stars ?? 0;
      if ((entry.sec ?? 0) > 0) days++;
    }
  }

  return { minutes, items, ok, stars, days };
}

function Trend({ value, suffix = '', invert = false }: { value: number; suffix?: string; invert?: boolean }) {
  if (value === 0) return <span className="text-ink-soft">—</span>;
  const isUp = value > 0;
  const good = invert ? !isUp : isUp;
  const emoji = isUp ? '↑' : '↓';
  const color = good ? 'text-candy-green-deep' : 'text-candy-red-deep';
  return (
    <span className={`text-sm font-extrabold ${color}`}>
      {emoji} {Math.abs(value)}{suffix}
    </span>
  );
}

function RingChart({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#f0dde2" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s' }}
        />
        <text x="40" y="44" textAnchor="middle" className="rotate-90 fill-ink text-sm font-extrabold" style={{ transformOrigin: '40px 40px', transform: 'rotate(90deg)' }}>
          {value}
        </text>
      </svg>
      <span className="mt-1 text-xs font-bold text-ink-soft">{label}</span>
    </div>
  );
}

export function WeekCompare() {
  const { t } = useTranslation();
  const dailyLog = useDailyLog();

  const thisWeek = useMemo(() => getWeekData(dailyLog, 0), [dailyLog]);
  const lastWeek = useMemo(() => getWeekData(dailyLog, 7), [dailyLog]);

  const maxMin = Math.max(thisWeek.minutes, lastWeek.minutes, 1);

  const metrics = [
    { labelKey: 'weekCompare.daysLabel', thisW: thisWeek.days, lastW: lastWeek.days, suffixKey: 'weekCompare.daysSuffix' },
    { labelKey: 'weekCompare.durationLabel', thisW: thisWeek.minutes, lastW: lastWeek.minutes, suffixKey: 'weekCompare.minutesSuffix' },
    { labelKey: 'weekCompare.itemsLabel', thisW: thisWeek.items, lastW: lastWeek.items, suffixKey: 'weekCompare.questionsSuffix' },
    { labelKey: 'weekCompare.correctLabel', thisW: thisWeek.ok, lastW: lastWeek.ok, suffixKey: 'weekCompare.questionsSuffix' },
    { labelKey: 'weekCompare.starsLabel', thisW: thisWeek.stars, lastW: lastWeek.stars, suffixKey: 'weekCompare.starsSuffix' },
  ];

  return (
    <Panel>
      <PanelTitle emoji="📊" title={t('weekCompare.title')} subtitle={t('weekCompare.subtitle')} tone="blue" />

      {/* 环形图对比 */}
      <div className="mb-4 flex items-center justify-around">
        <RingChart value={thisWeek.minutes} max={maxMin} label={t('weekCompare.thisWeekMin')} color="#5fd68b" />
        <div className="text-2xl font-black text-ink-soft">VS</div>
        <RingChart value={lastWeek.minutes} max={maxMin} label={t('weekCompare.lastWeekMin')} color="#ff8db0" />
      </div>

      {/* 指标对比表 */}
      <div className="space-y-2">
        {metrics.map(m => {
          const diff = m.thisW - m.lastW;
          return (
            <div key={m.labelKey} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
              <span className="text-sm font-bold text-ink-soft w-20">{t(m.labelKey)}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-extrabold text-candy-blue-deep w-12 text-right">{m.lastW}</span>
                <span className="text-ink-soft">→</span>
                <span className="text-sm font-extrabold text-candy-green-deep w-12 text-right">{m.thisW}</span>
                <div className="w-16 text-right">
                  <Trend value={diff} suffix={t(m.suffixKey)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 总结 */}
      <div className="mt-3 rounded-xl bg-candy-blue-soft p-3 text-center">
        <p className="text-sm font-bold text-ink">
          {thisWeek.minutes > lastWeek.minutes
            ? t('weekCompare.summaryMore')
            : thisWeek.minutes < lastWeek.minutes
            ? t('weekCompare.summaryLess')
            : t('weekCompare.summarySame')}
        </p>
      </div>
    </Panel>
  );
}
