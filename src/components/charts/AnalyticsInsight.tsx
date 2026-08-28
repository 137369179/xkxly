/**
 * 学习行为分析洞察（规格二十三 · 纯前端可落地部分）
 * ------------------------------------------------------------------
 * 覆盖：活跃度（7/14/30 天活跃天数 = DAU/WAU/MAU 客户端代理）、
 *       最长连续学习、周活跃偏好、AI 互动次数与近 7 天趋势、
 *       累计学习总览（题量/时长/正确率）。
 * 零第三方依赖，纯 SVG + Tailwind，风格与 StudyCharts 一致。
 */
import { useMemo } from 'react';
import { useDailyLog, useMastery, useChatHistory } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';
import { cn } from '@/lib/utils';

const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

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

export function AnalyticsInsight() {
  const { t } = useTranslation();
  const dailyLog = useDailyLog();
  const mastery = useMastery();
  const chatHistory = useChatHistory();

  const stats = useMemo(() => {
    const log = dailyLog;

    // —— 活跃天数（近 7/14/30 天，items>0 或 sec>0 记活跃） ——
    const active = (n: number) =>
      recentDays(n).filter((d) => {
        const v = log[d];
        return !!v && ((v.items ?? 0) > 0 || (v.sec ?? 0) > 0);
      }).length;
    const active7 = active(7);
    const active14 = active(14);
    const active30 = active(30);

    // —— 最长连续活跃段（取最近 60 天） ——
    const days60 = recentDays(60);
    let longest = 0;
    let cur = 0;
    for (const d of days60) {
      const v = log[d];
      if (v && ((v.items ?? 0) > 0 || (v.sec ?? 0) > 0)) cur += 1;
      else cur = 0;
      longest = Math.max(longest, cur);
    }

    // —— 周活跃偏好（近 28 天按星期聚合时长） ——
    const byWeekday = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 28; i++) {
      const d = new Date(Date.now() - i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const sec = log[key]?.sec ?? 0;
      if (sec > 0) byWeekday[d.getDay()] = (byWeekday[d.getDay()] ?? 0) + sec;
    }
    const favIdx = byWeekday.indexOf(Math.max(...byWeekday));

    // —— AI 互动 ——
    const aiDay = (n: number) =>
      recentDays(n).reduce((s, d) => s + ((chatHistory?.[`chatCount_${d}`] as number | undefined) ?? 0), 0);
    const aiToday = aiDay(1);
    const aiWeek = aiDay(7);
    const aiTotal = Object.entries(chatHistory ?? {}).reduce(
      (s, [k, v]) => (k.startsWith('chatCount_') && typeof v === 'number' ? s + v : s),
      0,
    );
    const aiLast7 = recentDays(7).map((d) => (chatHistory?.[`chatCount_${d}`] as number | undefined) ?? 0);

    // —— 总览 ——
    const totalItems = Object.values(log).reduce((s, v) => s + (v?.items ?? 0), 0);
    const totalSec = Object.values(log).reduce((s, v) => s + (v?.sec ?? 0), 0);
    const masteryVals = Object.values(mastery);
    const okSum = masteryVals.reduce((s, m) => s + (m?.ok ?? 0), 0);
    const ngSum = masteryVals.reduce((s, m) => s + (m?.ng ?? 0), 0);
    const accuracy = okSum + ngSum > 0 ? Math.round((okSum / (okSum + ngSum)) * 100) : 0;

    return {
      active7, active14, active30, longest, favIdx,
      aiToday, aiWeek, aiTotal, aiLast7,
      totalItems, totalSec, accuracy,
    };
  }, [dailyLog, mastery, chatHistory]);

  const aiMax = Math.max(...stats.aiLast7, 1);
  const todayActive = stats.active7 > 0;

  return (
    <div className="space-y-4">
      {/* 活跃度三卡 */}
      <div className="grid grid-cols-3 gap-2">
        <ActiveCard label={t('analyticsInsight.active7')} value={t('analyticsInsight.days', { count: stats.active7 })} tone="bg-amber-50 text-amber-600 border-amber-200" />
        <ActiveCard label={t('analyticsInsight.active14')} value={t('analyticsInsight.days', { count: stats.active14 })} tone="bg-pink-50 text-pink-600 border-pink-200" />
        <ActiveCard label={t('analyticsInsight.active30')} value={t('analyticsInsight.days', { count: stats.active30 })} tone="bg-purple-50 text-purple-600 border-purple-200" />
      </div>

      {/* 连续与偏好 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/70 p-3 text-center">
          <div className="text-2xl font-black text-orange-500 tabular-nums">🔥 {stats.longest}</div>
          <div className="mt-0.5 text-xs font-bold text-ink-soft">{t('analyticsInsight.longestStreak')}</div>
        </div>
        <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-3 text-center">
          <div className="text-2xl font-black text-blue-500">📅 周{stats.favIdx >= 0 ? WEEK_DAYS[stats.favIdx] : '—'}</div>
          <div className="mt-0.5 text-xs font-bold text-ink-soft">{t('analyticsInsight.favWeekday')}</div>
        </div>
      </div>

      {/* AI 互动 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-extrabold text-candy-purple-deep">{t('analyticsInsight.aiTitle')}</span>
          <span className="text-xs font-bold text-ink-soft">{t('analyticsInsight.aiSummary', { today: stats.aiToday, week: stats.aiWeek, total: stats.aiTotal })}</span>
        </div>
        <div className="flex items-end gap-1.5 rounded-2xl bg-white/80 p-3">
          {stats.aiLast7.map((v, i) => {
            const isToday = i === 6;
            const h = Math.max(4, (v / aiMax) * 56);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={cn('w-full rounded-md', isToday ? 'bg-candy-purple-deep' : 'bg-candy-purple-soft')}
                  style={{ height: h }}
                  title={t('analyticsInsight.aiCount', { count: v })}
                />
                <span className={cn('text-xs font-bold', isToday ? 'text-candy-purple-deep' : 'text-ink-soft')}>
                  {['一', '二', '三', '四', '五', '六', '日'][i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 总览 */}
      <div className="grid grid-cols-3 gap-2">
        <ActiveCard label={t('analyticsInsight.totalPractice')} value={t('analyticsInsight.questions', { count: stats.totalItems })} tone="bg-green-50 text-green-600 border-green-200" />
        <ActiveCard label={t('analyticsInsight.totalDuration')} value={t('analyticsInsight.minutes', { count: Math.round(stats.totalSec / 60) })} tone="bg-cyan-50 text-cyan-600 border-cyan-200" />
        <ActiveCard label={t('analyticsInsight.avgAccuracy')} value={`${stats.accuracy}%`} tone="bg-yellow-50 text-yellow-600 border-yellow-200" />
      </div>

      <p className="text-center text-xs font-bold text-ink-soft">
        {todayActive ? t('analyticsInsight.todayActiveTip') : t('analyticsInsight.todayIdleTip')}
      </p>
    </div>
  );
}

function ActiveCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={cn('rounded-2xl border-2 p-3 text-center', tone)}>
      <div className="text-xl font-black tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs font-bold text-ink-soft">{label}</div>
    </div>
  );
}
