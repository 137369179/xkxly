/**
 * 学习排行榜 - 本地历史记录排行
 */

import { useState, useMemo } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useDailyLog } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';

type Period = 'day' | 'week' | 'month';

export function Leaderboard() {
  const { t } = useTranslation();
  const dailyLog = useDailyLog();
  const [period, setPeriod] = useState<Period>('week');

  const records = useMemo(() => {
    const now = Date.now();
    const periodMs = period === 'day' ? 86400000 : period === 'week' ? 86400000 * 7 : 86400000 * 30;
    const cutoff = now - periodMs;

    return Object.entries(dailyLog)
      .filter(([date]) => {
        const t = new Date(date).getTime();
        return t >= cutoff;
      })
      .map(([date, log]) => ({
        date,
        minutes: Math.floor((log.sec ?? 0) / 60),
        items: log.items ?? 0,
        ok: log.ok ?? 0,
        stars: log.stars ?? 0,
        rate: log.items ? Math.round(((log.ok ?? 0) / log.items) * 100) : 0,
      }))
      .sort((a, b) => {
        if (period === 'day') return b.date.localeCompare(a.date);
        return b.stars - a.stars || b.minutes - a.minutes;
      });
  }, [dailyLog, period]);

  const totals = useMemo(() => {
    return records.reduce(
      (acc, r) => ({
        minutes: acc.minutes + r.minutes,
        items: acc.items + r.items,
        ok: acc.ok + r.ok,
        stars: acc.stars + r.stars,
      }),
      { minutes: 0, items: 0, ok: 0, stars: 0 }
    );
  }, [records]);

  const bestDay = records.reduce((best, r) => (r.stars > (best?.stars ?? 0) ? r : best), records[0]);

  return (
    <Panel>
      <PanelTitle emoji="🏆" title={t('leaderboard.title')} subtitle={t('leaderboard.subtitle')} tone="orange" />

      <div className="mb-3 flex gap-2">
        {(['day', 'week', 'month'] as Period[]).map(p => (
          <CandyButton
            key={p}
            tone={period === p ? 'orange' : 'purple'}
            variant={period === p ? 'solid' : 'soft'}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {p === 'day' ? t('leaderboard.today') : p === 'week' ? t('leaderboard.week') : t('leaderboard.month')}
          </CandyButton>
        ))}
      </div>

      {/* 汇总 */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        {[
          { labelKey: 'leaderboard.dayCount', value: records.length, emoji: '📅' },
          { labelKey: 'leaderboard.totalTime', value: t('leaderboard.minutesValue', { count: totals.minutes }), emoji: '⏰' },
          { labelKey: 'leaderboard.totalItems', value: totals.items, emoji: '✏️' },
          { labelKey: 'leaderboard.totalStars', value: totals.stars, emoji: '⭐' },
        ].map(s => (
          <div key={s.labelKey} className="rounded-xl bg-candy-orange-soft p-2 text-center">
            <div className="text-lg">{s.emoji}</div>
            <div className="text-base font-black text-candy-orange-deep">{s.value}</div>
            <div className="text-[10px] font-bold text-ink-soft">{t(s.labelKey)}</div>
          </div>
        ))}
      </div>

      {/* 最佳一天 */}
      {bestDay && (
        <div className="mb-3 rounded-xl bg-gradient-to-r from-candy-yellow-soft to-candy-orange-soft p-3 text-center">
          <p className="text-xs font-bold text-ink-soft">🌟 最佳一天</p>
          <p className="text-sm font-extrabold text-ink">
            {bestDay.date} · ⭐{bestDay.stars} · {bestDay.minutes}分钟 · 正确率{bestDay.rate}%
          </p>
        </div>
      )}

      {/* 每日列表 */}
      {records.length === 0 ? (
        <p className="py-4 text-center text-sm font-bold text-ink-soft">{t('leaderboard.empty')}</p>
      ) : (
        <div className="space-y-1">
          {records.slice(0, 20).map((r, i) => (
            <div
              key={r.date}
              className={`flex items-center gap-2 rounded-xl p-2 ${
                i === 0 ? 'bg-candy-yellow-soft' : 'bg-white/60'
              }`}
            >
              <span className="w-6 text-center text-sm font-black text-ink-soft">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </span>
              <span className="flex-1 text-xs font-bold text-ink">{r.date}</span>
              <span className="text-xs font-bold text-ink-soft">{r.minutes}分</span>
              <span className="text-xs font-bold text-ink-soft">{r.items}题</span>
              <span className="text-xs font-extrabold text-candy-orange-deep">⭐{r.stars}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
