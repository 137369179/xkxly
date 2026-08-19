/**
 * 家长报告增强组件 · 纯 SVG 手绘（零第三方依赖）
 * ------------------------------------------------------------
 * GrowthTrend   近 14 天整体掌握率趋势曲线（数据来自 progress.growth 每日快照）
 * SubjectBalance 各学科掌握度均衡条（汉字/数学/古诗/逻辑/字母/数字/拼音/英语）
 * StudyTips     基于薄弱点 + 学科均衡 + 趋势的规则化学习建议
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore, useGrowth, useMastery } from '@/store/useStore';
import type { Progress } from '@/types';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { SUBJECTS } from '@/lib/srs';
import { useTranslation } from '@/i18n/useTranslation';

/* 工具：近 N 天日期（YYYY-MM-DD） */
function recentDays(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return out;
}

// 学科单一真相源统一从 srs 引入（见 @/lib/srs 的 SUBJECTS）；此处仅转发导出，
// 避免改动依赖它的 PdfExport 等模块。
export { SUBJECTS };

/* ============================================================ */
/* 1. 成长轨迹趋势（近 14 天掌握率）                              */
/* ============================================================ */
export function GrowthTrend() {
  const { t: tr } = useTranslation();
  const growth = useGrowth();

  const { series, latest, first } = useMemo(() => {
    const days = recentDays(14);
    const byDate = new Map(growth.map((s) => [s.date, s]));
    let last: (typeof growth)[number] | null = null;
    const arr = days.map((d) => {
      const snap = byDate.get(d);
      if (snap) last = snap;
      return last ? last.rate : 0;
    });
    return {
      series: arr,
      latest: arr[arr.length - 1] ?? 0,
      first: arr[0] ?? 0,
    };
  }, [growth]);

  const hasData = growth.length >= 2;

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <PanelTitle emoji="📈" title={tr('parent.growthTitle')} subtitle={tr('parent.growthSub14')} tone="blue" />
        <span className="text-sm font-extrabold text-candy-blue-deep">{Math.round(latest * 100)}%</span>
      </div>

      {!hasData ? (
        <p className="py-4 text-center text-sm font-bold text-ink-soft">
          {tr('parent.growthEmpty')}
        </p>
      ) : (
        <svg viewBox="0 0 100 42" className="w-full" style={{ height: 130 }}>
          {/* 网格线 */}
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <line key={r} x1={0} y1={40 - r * 36} x2={100} y2={40 - r * 36} stroke="#f0dde2" strokeWidth={0.3} />
          ))}
          {/* 面积 + 折线 */}
          {(() => {
            const n = series.length;
            const pts = series.map((r, i) => {
              const x = n <= 1 ? 50 : (i / (n - 1)) * 100;
              const y = 40 - Math.max(0, Math.min(1, r)) * 36;
              return [x, y] as const;
            });
            const line = pts.map((p) => p.join(',')).join(' ');
            const area = `0,40 ${line} 100,40`;
            return (
              <>
                <polygon points={area} fill="rgba(46,147,201,0.12)" />
                <polyline points={line} fill="none" stroke="#2e93c9" strokeWidth={0.8} strokeLinejoin="round" />
                {pts.map((p, i) => (
                  <circle key={`p-${i}`} cx={p[0]} cy={p[1]} r={0.9} fill="#2e93c9" />
                ))}
              </>
            );
          })()}
          {/* 趋势标注 */}
          <text x={2} y={4} fontSize={2.4} fill="#cda6b0">
            {tr('parent.startPoint', { pct: Math.round(first * 100) })}
          </text>
        </svg>
      )}
    </Panel>
  );
}

/* ============================================================ */
/* 2. 学科掌握均衡（雷达图总览 + 紧凑列表）                         */
/* ============================================================ */
function SubjectRadar({ data }: { data: { label: string; color: string; pct: number }[] }) {
  const cx = 120;
  const cy = 104;
  const R = 72;
  const n = data.length;
  const ang = (i: number) => ((-90 + i * (360 / n)) * Math.PI) / 180;
  const pt = (i: number, r: number): [number, number] => [
    cx + Math.cos(ang(i)) * R * r,
    cy + Math.sin(ang(i)) * R * r,
  ];
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox="0 0 240 210" className="w-full" style={{ height: 196 }} role="img" aria-label="学科掌握均衡雷达图">
      {/* 网格圈 */}
      {rings.map((r, ri) => (
        <polygon
          key={ri}
          points={data.map((_, i) => pt(i, r).join(',')).join(' ')}
          fill="none"
          stroke="#f0dde2"
          strokeWidth={0.6}
        />
      ))}
      {/* 轴线 */}
      {data.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={`_-${i}`} x1={cx} y1={cy} x2={x} y2={y} stroke="#f0dde2" strokeWidth={0.6} />;
      })}
      {/* 数据多边形 */}
      <polygon
        points={data.map((d, i) => pt(i, Math.max(0, Math.min(1, d.pct))).join(',')).join(' ')}
        fill="rgba(168,85,247,0.18)"
        stroke="#8b6ef0"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      {/* 数据端点 */}
      {data.map((d, i) => {
        const [x, y] = pt(i, Math.max(0, Math.min(1, d.pct)));
        return <circle key={`d-${i}`} cx={x} cy={y} r={2.1} fill={d.color} stroke="#fff" strokeWidth={0.9} />;
      })}
      {/* 轴标签 */}
      {data.map((d, i) => {
        const [x, y] = pt(i, 1.17);
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle';
        return (
          <text key={`d-${i}`} x={x} y={y + 3} fontSize={9} textAnchor={anchor} fill={d.color} fontWeight={700}>
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

export function SubjectBalance({ onPracticeSubject }: { onPracticeSubject?: (subject: string) => void }) {
  const { t: tr } = useTranslation();
  const mastery = useMastery();

  const data = useMemo(
    () =>
      SUBJECTS.map((s) => {
        const items = Object.entries(mastery).filter(([k]) => k.startsWith(s.key + ':'));
        const pct = items.length
          ? items.reduce((sum, [, m]) => sum + (m.lv ?? 0), 0) / (items.length * 5)
          : 0;
        return { ...s, pct, count: items.length };
      }),
    [mastery],
  );

  const touched = data.filter((d) => d.count > 0).length;

  return (
    <Panel>
      <PanelTitle emoji="📊" title={tr('parent.balanceTitle')} subtitle={tr('parent.balanceSub', { touched, total: SUBJECTS.length })} tone="purple" />
      <SubjectRadar data={data.map((d) => ({ label: d.label, color: d.color, pct: d.pct }))} />
      <div className="mt-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.key} className="flex items-center gap-2">
            <span className="w-9 shrink-0 text-[11px] font-extrabold" style={{ color: d.color }}>
              {d.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-dark">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.round(d.pct * 100)}%`, background: d.color }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-[11px] font-bold tabular-nums text-ink-soft">
              {Math.round(d.pct * 100)}%
            </span>
            {onPracticeSubject && (
              <button
                type="button"
                onClick={() => onPracticeSubject(d.key)}
                className="shrink-0 rounded-full bg-candy-purple-soft px-2 py-0.5 text-[10px] font-extrabold text-candy-purple-deep active:scale-95"
              >
                {tr('parent.goPractice')}
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-center text-xs font-bold text-ink-soft">
        {tr('parent.radarTip')}
      </p>
    </Panel>
  );
}

/* ============================================================ */
/* 3. 智能学习建议（规则化，无需联网）                             */
/* ============================================================ */
export function StudyTips({ onPracticeSubject }: { onPracticeSubject?: (subject: string) => void }) {
  const { t: tr } = useTranslation();
  // buildTips 仅读取 mastery / wrongBook / growth / streak
  const tipsP = useStore(
    useShallow(
      (s) =>
        ({
          mastery: s.progress.mastery,
          wrongBook: s.progress.wrongBook,
          growth: s.progress.growth,
          streak: s.progress.streak,
        }) as Progress,
    ),
  );

  const tips = useMemo(() => buildTips(tipsP), [tipsP]);

  return (
    <Panel>
      <PanelTitle emoji="💡" title={tr('parent.tipsTitle')} subtitle={tr('parent.tipsSub')} tone="green" />
      {tips.length === 0 ? (
        <p className="py-3 text-center text-sm font-bold text-ink-soft">{tr('parent.tipsEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {tips.map((t, i) => (
            <li key={`t-${i}`} className="flex items-center gap-2 rounded-2xl bg-white/70 p-3 text-sm">
              <span className="shrink-0 text-base">{t.emoji}</span>
              <span className="flex-1 font-bold text-ink">{t.text}</span>
              {onPracticeSubject && t.subject && (
                <button
                  type="button"
                  onClick={() => onPracticeSubject(t.subject ?? '')}
                  className="shrink-0 rounded-full bg-candy-green-soft px-2.5 py-1 text-[11px] font-extrabold text-candy-green-deep active:scale-95"
                >
                  {tr('parent.goPractice')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function buildTips(p: Progress): { emoji: string; text: string; subject?: string }[] {
  const out: { emoji: string; text: string; subject?: string }[] = [];

  // 1) 薄弱学科（平均掌握率最低且已接触）
  const subs = SUBJECTS.map((s) => {
    const items = Object.entries(p.mastery).filter(([k]) => k.startsWith(s.key + ':'));
    const pct = items.length ? items.reduce((a, [, m]) => a + (m.lv ?? 0), 0) / (items.length * 5) : 1;
    return { ...s, pct, count: items.length };
  }).filter((s) => s.count > 0);
  const weak = [...subs].sort((a, b) => a.pct - b.pct)[0];
  if (weak && weak.pct < 0.6) {
    out.push({ emoji: '🎯', text: `${weak.label}掌握率只有 ${Math.round(weak.pct * 100)}%，建议每天多加 2 道${weak.label}题`, subject: weak.key });
  }

  // 2) 错题最多的类别
  const catCount: Record<string, number> = {};
  for (const skill of p.wrongBook) {
    const c = skill.split(':')[0] ?? '';
    catCount[c] = (catCount[c] ?? 0) + 1;
  }
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    const label = SUBJECTS.find((s) => s.key === topCat[0])?.label ?? topCat[0];
    out.push({ emoji: '🔁', text: `错题本里「${label}」最多（${topCat[1]} 题），周末安排一次专项回炉`, subject: topCat[0] });
  }

  // 3) 趋势
  if (p.growth.length >= 2) {
    const arr = p.growth.slice(-14).map((s) => s.rate);
    const delta = (arr[arr.length - 1] ?? 0) - (arr[0] ?? 0);
    if (delta > 0.05) {
      out.push({ emoji: '📈', text: `近两周整体掌握率提升了 ${Math.round(delta * 100)} 个百分点，进步明显，值得表扬！` });
    } else if (delta < -0.02) {
      out.push({ emoji: '🌱', text: '最近掌握率略有回落，可能是题目变难了，多鼓励宝贝别泄气' });
    }
  }

  // 4) 连续打卡
  if (p.streak >= 3) {
    out.push({ emoji: '🔥', text: `已连续学习 ${p.streak} 天，规律打卡比突击更有效，明天也来哦` });
  }

  return out.slice(0, 4);
}
