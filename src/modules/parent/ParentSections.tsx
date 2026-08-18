/**
 * ParentPage 子组件拆分
 * 从 ParentPage.tsx 提取的 AI 报告 / 错题分析 / 统计组件
 */
import { useMemo } from 'react';
import type { Progress } from '@/types';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { parentDeepReportTask, wrongAnalyzeTask } from '@/lib/ai/tasks';
import { useAiTask as useAiTaskWA } from '@/lib/ai/useAi';
import type { WrongAnalyze, DeepReport } from '@/lib/ai/prompts';
import { useTranslation } from '@/i18n/useTranslation';

/* AI 学情周报 */
export function AiReport({ progress }: { progress: Progress }) {
  const { t: tr } = useTranslation();
  const { loading, result, run } = useAiTaskWA<DeepReport>(() => parentDeepReportTask(progress), false);
  const data = result?.data;

  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <PanelTitle emoji="🤖" title={tr('parent.deepReport')} subtitle={tr('parent.deepReportSub')} tone="green" />
        <CandyButton tone="green" variant="soft" size="sm" onClick={run} disabled={loading}>
          {loading ? tr('common.analyzing') : data ? tr('common.regenerate') : tr('parent.genReport')}
        </CandyButton>
      </div>

      {!result && !loading && (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-candy-green-soft text-3xl">🤖</div>
          <p className="text-sm font-bold leading-relaxed text-ink-soft">
            点击「生成报告」，小智会结合宝贝的掌握率、错题和趋势，
            <br />
            给出结构化的深度学情分析
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-3 py-3">
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-cream-dark" />
          <div className="h-3 w-full animate-pulse rounded-full bg-cream-dark" />
          <div className="h-3 w-5/6 animate-pulse rounded-full bg-cream-dark" />
          <p className="pt-1 text-center text-xs font-bold text-ink-soft">小智正在深度分析中…</p>
        </div>
      )}

      {result && data && (
        <div className="space-y-3">
          {result.fallback && <p className="text-xs font-bold text-ink-soft">小智暂时连不上，下面是离线分析</p>}
          <div className="rounded-2xl bg-gradient-to-r from-candy-green-soft to-candy-blue-soft p-4">
            <p className="text-xs font-extrabold text-candy-green-deep">总评</p>
            <p className="mt-1 text-base font-bold text-ink">{data.summary}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ReportSection emoji="✅" title={tr('parent.strengths')} color="text-candy-green-deep" items={data.strengths} />
            <ReportSection emoji="⚠️" title={tr('parent.weaknesses')} color="text-candy-orange-deep" items={data.weaknesses} />
          </div>
          <div className="rounded-2xl bg-white/70 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-base">📈</span>
              <span className="text-sm font-extrabold text-candy-blue-deep">趋势</span>
            </div>
            <p className="text-sm font-bold text-ink">{data.trend}</p>
            <DeepSparkline progress={progress} />
          </div>
          <ReportSection emoji="📌" title={tr('parent.suggestions')} color="text-candy-purple-deep" items={data.suggestions} />
        </div>
      )}
    </Panel>
  );
}

export function ReportSection({ emoji, title, color, items }: { emoji: string; title: string; color: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-2xl bg-white/70 p-3">
      <p className={`mb-1.5 text-sm font-extrabold ${color}`}>
        {emoji} {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((t, i) => (
          <li key={`item-${i}`} className="flex items-start gap-1.5 text-sm font-medium text-ink">
            <span className="mt-0.5 text-ink-soft">•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DeepSparkline({ progress }: { progress: Progress }) {
  const { pts, has } = useMemo(() => {
    const days: string[] = [];
    const now = Date.now();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    const byDate = new Map(progress.growth.map((s) => [s.date, s]));
    let last: (typeof progress.growth)[number] | null = null;
    const arr = days.map((dd) => {
      const s = byDate.get(dd);
      if (s) last = s;
      return last ? last.rate : 0;
    });
    const n = arr.length;
    const p = arr.map((r, i) => {
      const x = n <= 1 ? 50 : (i / (n - 1)) * 100;
      const y = 40 - Math.max(0, Math.min(1, r)) * 36;
      return [x, y] as const;
    });
    return { pts: p, has: progress.growth.length >= 2 };
  }, [progress.growth]);

  if (!has) return null;
  const line = pts.map((p) => p.join(',')).join(' ');
  return (
    <svg viewBox="0 0 100 42" className="mt-2 w-full" style={{ height: 64 }} aria-hidden>
      <polygon points={`0,40 ${line} 100,40`} fill="rgba(51,168,99,0.12)" />
      <polyline points={line} fill="none" stroke="#33a863" strokeWidth={0.9} strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={`pt-${i}`} cx={p[0]} cy={p[1]} r={0.8} fill="#33a863" />
      ))}
    </svg>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-candy flex flex-col items-center gap-1 p-3 text-center">
      <span className="text-2xl font-extrabold tabular-nums text-candy-purple-deep">{value}</span>
      <span className="text-xs font-bold text-ink-soft">{label}</span>
    </div>
  );
}

/* AI 错题分析 */
export function WrongAnalyzeCard({ progress }: { progress: Progress }) {
  const { t: tr } = useTranslation();
  const { result, loading, run } = useAiTaskWA<WrongAnalyze>(
    () => wrongAnalyzeTask(progress),
    false,
  );
  const data = result?.data;
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <PanelTitle emoji="🔍" title={tr('parent.wrongAnalyze')} subtitle={tr('parent.wrongAnalyzeSub')} tone="orange" />
        <CandyButton tone="orange" variant="soft" size="sm" onClick={run} disabled={loading}>
          {loading ? tr('common.analyzing') : tr('parent.analyze')}
        </CandyButton>
      </div>
      {data && (
        <div className="space-y-2 text-sm">
          <div className="rounded-2xl bg-candy-orange-soft/50 p-3">
            <span className="font-extrabold text-candy-orange-deep">错误模式：</span>
            <span className="text-ink">{data.pattern}</span>
          </div>
          <div className="rounded-2xl bg-candy-green-soft/50 p-3">
            <span className="font-extrabold text-candy-green-deep">建议练习：</span>
            <span className="text-ink">{data.suggest}</span>
          </div>
          <div className="rounded-2xl bg-candy-pink-soft/50 p-3">
            <span className="font-extrabold text-candy-pink-deep">优先攻克：</span>
            <span className="text-ink">{data.priority}</span>
          </div>
          <p className="text-center text-xs font-bold text-ink-soft">{data.encourage}</p>
          {result?.fallback && <p className="text-center text-xs text-ink-soft">小智暂时连不上，这是离线分析</p>}
        </div>
      )}
    </Panel>
  );
}
