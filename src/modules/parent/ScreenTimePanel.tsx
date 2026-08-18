/**
 * 家长控制面板 - 屏幕时间报告
 * ------------------------------------------------------------
 * 数据来源：useStore progress.dailyLog（StudyClock / tickTime 实时写入）
 * 展示：今日时长、本周趋势、模块分布、每日上限设置
 */

import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { dateKey } from '@/lib/dailyPlan';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { useTranslation } from '@/i18n/useTranslation';

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function ScreenTimeReport() {
  const { t } = useTranslation();
  const dailyLog = useStore((s) => s.progress.dailyLog);
  const dailyLimitMin = useSettingsStore((s) => s.settings.dailyLimitMin);

  // 今日数据
  const todaySec = dailyLog[dateKey()]?.sec ?? 0;
  const todayItems = dailyLog[dateKey()]?.items ?? 0;
  const todayStars = dailyLog[dateKey()]?.stars ?? 0;

  // 本周数据（最近 7 天）
  const weekData = useMemo(() => {
    const entries: { day: string; min: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const sec = dailyLog[key]?.sec ?? 0;
      entries.push({ day: DAYS[6 - i] ?? '', min: Math.round(sec / 60) });
    }
    return entries;
  }, [dailyLog]);

  const weekTotal = weekData.reduce((sum, d) => sum + d.min, 0);
  const maxDailyMin = Math.max(...weekData.map((d) => d.min), 1);
  const limit = dailyLimitMin || 30;
  const todayPercent = Math.min(100, Math.round((todaySec / 60 / limit) * 100));

  return (
    <Panel>
      <PanelTitle emoji="⏰" title={t('parent.screenTimeTitle') ?? '屏幕时间'} tone="purple" />
      <div className="space-y-5">
        {/* 今日概览 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center rounded-2xl bg-purple-50 p-3">
            <div className="text-2xl font-black text-candy-purple-deep tabular-nums">{Math.round(todaySec / 60)}</div>
            <div className="text-[10px] font-bold text-ink-soft mt-0.5">{t('parent.todayTime') ?? '今日学习'}</div>
          </div>
          <div className="text-center rounded-2xl bg-blue-50 p-3">
            <div className="text-2xl font-black text-candy-blue-deep tabular-nums">{todayItems}</div>
            <div className="text-[10px] font-bold text-ink-soft mt-0.5">{t('parent.todayItems') ?? '练习题数'}</div>
          </div>
          <div className="text-center rounded-2xl bg-yellow-50 p-3">
            <div className="text-2xl font-black text-candy-yellow-deep tabular-nums">{todayStars}</div>
            <div className="text-[10px] font-bold text-ink-soft mt-0.5">{t('parent.todayStars') ?? '获得星星'}</div>
          </div>
        </div>

        {/* 进度条 */}
        <div>
          <div className="flex justify-between text-xs font-bold text-ink-soft mb-1">
            <span>{t('parent.todayProgress') ?? '今日进度'}</span>
            <span>{todayPercent}%</span>
          </div>
          <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${todayPercent}%`,
                background: todayPercent >= 100 ? '#e05a80' : '#8b6ef0',
              }}
            />
          </div>
          <p className="text-xs text-ink-soft mt-1">
            {todayPercent >= 100
              ? (t('parent.limitReached') ?? '⚠️ 已达今日上限')
              : `${t('parent.timeLeft') ?? '剩余'} ${limit - Math.round(todaySec / 60)} ${t('parent.minutes') ?? '分钟'}`}
          </p>
        </div>

        {/* 本周趋势 */}
        <div>
          <div className="text-sm font-extrabold text-ink mb-2">{t('parent.weekTrend') ?? '本周趋势'}</div>
          <div className="flex items-end justify-between h-28 gap-1.5">
            {weekData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-t-lg bg-candy-purple-soft transition-all"
                  style={{
                    height: `${(d.min / maxDailyMin) * 100}%`,
                    minHeight: d.min > 0 ? '6px' : '2px',
                  }}
                />
                <span className="text-[9px] font-bold text-ink-soft">{d.day}</span>
                <span className="text-[8px] text-ink-soft tabular-nums">{d.min}分</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-center">
            <span className="text-xs font-bold text-ink-soft">
              {t('parent.weekTotal') ?? '本周总计'}：{weekTotal} {t('parent.minutes') ?? '分钟'}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
