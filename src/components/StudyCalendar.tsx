/**
 * 学习日历热力图 · GitHub 风格
 * 展示全年每日学习时长
 */

import { useMemo } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { useProgress } from '@/store/useStore';
import { dateKey } from '@/lib/dailyPlan';
import { useTranslation } from '@/i18n/useTranslation';

interface DayData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const LEVEL_COLORS = [
  '#ebedf0',
  '#c6e48b',
  '#7bc96f',
  '#239a3b',
  '#196127',
];

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function getLevel(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes === 0) return 0;
  if (minutes < 5) return 1;
  if (minutes < 10) return 2;
  if (minutes < 20) return 3;
  return 4;
}

function buildYearData(dailyLog: Record<string, { sec?: number; items?: number }>): DayData[][] {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const days: DayData[] = [];
  const d = new Date(start);
  while (d <= end) {
    const key = dateKey(d.getTime());
    const entry = dailyLog[key]!
    const sec = entry?.sec ?? 0;
    const minutes = Math.floor(sec / 60);
    days.push({ date: key, count: minutes, level: getLevel(minutes) });
    d.setDate(d.getDate() + 1);
  }
  // 按周分组（每周从周日开始）
  const weeks: DayData[][] = [];
  const firstDow = new Date(year, 0, 1).getDay();
  // 补前面空位
  const padded: (DayData | null)[] = [];
  for (let i = 0; i < firstDow; i++) padded.push(null);
  padded.push(...days);
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7) as DayData[]);
  }
  return weeks;
}

export function StudyCalendar() {
  const { t } = useTranslation();
  const progress = useProgress();
  const weeks = useMemo(() => buildYearData(progress.dailyLog), [progress.dailyLog]);

  const today = dateKey(Date.now());
  const year = new Date().getFullYear();

  // 统计
  const stats = useMemo(() => {
    let totalDays = 0;
    let totalMinutes = 0;
    let maxStreak = 0;
    let curStreak = 0;
    let activeDays = 0;
    for (const week of weeks) {
      for (const day of week) {
        if (!day) continue;
        totalDays++;
        totalMinutes += day.count;
        if (day.count > 0) {
          activeDays++;
          curStreak++;
          if (curStreak > maxStreak) maxStreak = curStreak;
        } else {
          curStreak = 0;
        }
      }
    }
    return { totalDays, totalMinutes, maxStreak, activeDays };
  }, [weeks]);

  const currentMonth = new Date().getMonth();

  return (
    <Panel>
      <PanelTitle emoji="📅" title={t('studyCalendar.yearTitle', { year })} subtitle={t('studyCalendar.subtitleDetail', { days: stats.activeDays, hours: Math.floor(stats.totalMinutes / 60), minutes: stats.totalMinutes % 60, streak: stats.maxStreak })} tone="green" />


      {/* 图例 */}
      <div className="mb-3 flex items-center justify-end gap-1.5">
        <span className="text-xs font-bold text-ink-soft">{t('studyCalendar.less')}</span>
        {LEVEL_COLORS.map((c, i) => (
          <div key={`c-${i}`} className="h-3 w-3 rounded-sm" style={{ background: c }} />
        ))}
        <span className="text-xs font-bold text-ink-soft">{t('studyCalendar.more')}</span>
      </div>

      {/* 日历网格 */}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* 月份标签 */}
          <div className="mb-1 flex">
            <div className="w-6" />
            {MONTH_LABELS.map((m, i) => (
              <div key={`m-${i}`} className="text-xs font-bold text-ink-soft" style={{ minWidth: '14px', marginRight: '2px', opacity: Math.abs(i - currentMonth) <= 3 ? 1 : 0.4 }}>
                {m}
              </div>
            ))}
          </div>

          {/* 日历主体 */}
          <div className="flex gap-[2px]">
            {/* 星期标签 */}
            <div className="flex flex-col gap-[2px]">
              {WEEK_LABELS.map((w, i) => (
                <div key={`w-${i}`} className="h-3 text-xs font-bold text-ink-soft flex items-center" style={{ opacity: i % 2 === 1 ? 1 : 0 }}>
                  {i % 2 === 1 ? w : ''}
                </div>
              ))}
            </div>

            {/* 日期格子 */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((day, di) => {
                  if (!day) return <div key={di} className="h-3 w-3" />;
                  const isToday = day.date === today;
                  return (
                    <div
                      key={di}
                      className="h-3 w-3 rounded-sm transition-transform hover:scale-150"
                      style={{
                        background: LEVEL_COLORS[day.level],
                        outline: isToday ? '2px solid #f59e0b' : 'none',
                        outlineOffset: '1px',
                      }}
                      title={t('studyCalendar.minutesTooltip', { date: day.date, count: day.count })}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 底部统计 */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-candy-green-soft p-2">
          <div className="text-xl font-extrabold text-candy-green-deep">{stats.activeDays}</div>
          <div className="text-xs font-bold text-ink-soft">{t('studyCalendar.learnDays')}</div>
        </div>
        <div className="rounded-xl bg-candy-blue-soft p-2">
          <div className="text-xl font-extrabold text-candy-blue-deep">{Math.floor(stats.totalMinutes / 60)}h{stats.totalMinutes % 60}m</div>
          <div className="text-xs font-bold text-ink-soft">{t('studyCalendar.totalDuration')}</div>
        </div>
        <div className="rounded-xl bg-candy-orange-soft p-2">
          <div className="text-xl font-extrabold text-candy-orange-deep">{stats.maxStreak}</div>
          <div className="text-xs font-bold text-ink-soft">{t('studyCalendar.longestStreak')}</div>
        </div>
      </div>
    </Panel>
  );
}
