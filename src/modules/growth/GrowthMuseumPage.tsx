import { Suspense, lazy, useMemo } from 'react';
import { motion } from 'motion/react';
import { BADGES } from '@/data/badges';
import { useProgress, useStars, useStreak } from '@/store/useStore';
import { masteryRate } from '@/lib/srs';
import { mapProgress } from '@/components/MapView';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CandyButton } from '@/components/ui/Button';
import { FriendlyLoading } from '@/components/FriendlyLoading';
import { navigate } from '@/lib/router';
import { useTranslation } from '@/i18n/useTranslation';

const GrowthTree = lazy(() =>
  import('@/components/GrowthTree').then((m) => ({ default: m.GrowthTree })),
);

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function GrowthMuseumPage() {
  const { t } = useTranslation();
  const p = useProgress();
  const stars = useStars();
  const streak = useStreak();

  const owned = useMemo(() => new Set(p.badges), [p.badges]);
  const badgeDates = useMemo(
    () =>
      Object.entries(p.badgeDates ?? {})
        .filter(([, ts]) => ts > 0)
        .sort((a, b) => b[1] - a[1]),
    [p.badgeDates],
  );

  const researchStats = p.researchStats;
  const discoveryCount = p.discoveries?.length ?? 0;
  const noteCount = Object.keys(p.researchNotes ?? {}).filter((k) => p.researchNotes?.[k]?.trim()).length;

  const statCards = [
    { emoji: '⭐', label: t('growth.stars'), value: String(stars), tone: 'yellow' as Tone },
    { emoji: '🔥', label: t('growth.streak'), value: `${streak} 天`, tone: 'orange' as Tone },
    { emoji: '🏅', label: t('growth.badges'), value: `${owned.size}/${BADGES.length}`, tone: 'purple' as Tone },
    { emoji: '📈', label: t('growth.mastery'), value: `${Math.round(masteryRate(p) * 100)}%`, tone: 'green' as Tone },
  ];

  const levelPct = Math.round(mapProgress(p) * 20); // 平均掌握度 0-5 → 0-100

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="🏆"
        title={t('growth.title')}
        subtitle={t('growth.subtitle')}
        tone="purple"
      />

      {/* 数据总览 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((c) => {
          const tone = TONE_STYLE[c.tone]!;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border-4 border-white p-4 text-center shadow-fluffy"
              style={{ background: `linear-gradient(160deg, ${tone.soft}, #fff)` }}
            >
              <div className="text-3xl">{c.emoji}</div>
              <div className="mt-1 text-2xl font-black tabular-nums" style={{ color: tone.deep }}>
                {c.value}
              </div>
              <div className="mt-0.5 text-xs font-bold text-ink-soft">{c.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* 平均掌握度进度 */}
      <Panel>
        <PanelTitle emoji="🗺️" title={t('growth.level')} tone="green" />
        <div className="flex items-center gap-3">
          <span className="text-4xl">{levelPct >= 80 ? '🏆' : levelPct >= 50 ? '🌟' : '🌱'}</span>
          <div className="flex-1">
            <ProgressBar value={levelPct} max={100} tone="green" showLabel />
          </div>
        </div>
      </Panel>

      {/* 研究乐园（F19 行为量 + 发现画廊入口，R8：零正确率） */}
      <Panel>
        <PanelTitle emoji="🔬" title={t('research.growthBlock.title')} subtitle={t('research.growthBlock.subtitle')} tone="blue" />
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          {[
            { label: t('research.growthBlock.explored'), value: `${researchStats?.topicsExplored.length ?? 0}`, emoji: '🗺️' },
            { label: t('research.growthBlock.actions'), value: `${researchStats?.exploreActions ?? 0}`, emoji: '🔍' },
            { label: t('research.growthBlock.sessions'), value: `${researchStats?.sessionsCompleted ?? 0}`, emoji: '🎉' },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl bg-blue-50 px-2 py-2.5">
              <div className="text-xl">{c.emoji}</div>
              <div className="mt-0.5 text-lg font-black tabular-nums text-candy-blue-deep">{c.value}</div>
              <div className="text-[10px] font-bold text-ink-soft">{c.label}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <CandyButton tone="blue" size="md" onClick={() => navigate('discoveries')}>
            ⭐ {t('research.gallery.entry')}（{discoveryCount}）
          </CandyButton>
          <CandyButton tone="pink" size="md" variant="ghost" onClick={() => navigate('research')}>
            🔬 {t('research.growthBlock.goResearch')}
          </CandyButton>
        </div>
        {noteCount > 0 && (
          <p className="mt-2 text-xs font-bold text-ink-soft">📝 {t('research.growthBlock.notes', { n: noteCount })}</p>
        )}
      </Panel>

      {/* 徽章墙 */}
      <Panel>
        <PanelTitle
          emoji="🏅"
          title={t('growth.badgeWall')}
          subtitle={`${owned.size} / ${BADGES.length} ${owned.size === BADGES.length ? t('growth.allDone') : ''}`}
          tone="purple"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BADGES.map((badge, i) => {
            const has = owned.has(badge.id);
            const tone = TONE_STYLE[(badge.tone ?? 'blue') as Tone];
            const meter = badge.meter?.(p);
            const pct = meter ? Math.min(100, Math.round((meter[0] / meter[1]) * 100)) : 0;
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.6) }}
                className={cn(
                  'rounded-2xl border-2 p-3 text-center transition-all',
                  has ? 'shadow-fluffy' : 'opacity-75 grayscale',
                )}
                style={{
                  borderColor: has ? tone.main : '#e5e7eb',
                  background: has ? tone.soft : '#f9fafb',
                }}
              >
                <div className={cn('text-3xl', has && 'animate-bounce-soft')}>{badge.emoji}</div>
                <div className="mt-1 truncate text-sm font-extrabold" style={{ color: has ? tone.deep : '#9ca3af' }}>
                  {badge.name}
                </div>
                <div className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-ink-soft">{badge.desc}</div>
                {meter && (
                  <div className="mt-2">
                    <ProgressBar value={pct} max={100} tone={has ? (badge.tone as Tone) : 'blue'} showLabel={false} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </Panel>

      {/* 成长树 */}
      <Suspense fallback={<FriendlyLoading message={t('home.loadingTree')} />}>
        <Panel>
          <PanelTitle emoji="🌳" title={t('growth.tree')} tone="green" />
          <GrowthTree />
        </Panel>
      </Suspense>

      {/* 成就时间线 */}
      <Panel>
        <PanelTitle emoji="⏳" title={t('growth.timeline')} tone="orange" />
        {badgeDates.length === 0 ? (
          <p className="py-6 text-center text-sm font-bold text-ink-soft">✨ {t('growth.timelineEmpty')}</p>
        ) : (
          <div className="relative space-y-4 pl-6">
            <div className="absolute bottom-2 left-[9px] top-2 w-1 rounded-full bg-gradient-to-b from-yellow-300 via-pink-300 to-purple-300" />
            {badgeDates.slice(0, 20).map(([id, ts], i) => {
              const badge = BADGES.find((b) => b.id === id);
              const tone = TONE_STYLE[((badge?.tone ?? 'blue') as Tone)];
              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative flex items-center gap-3"
                >
                  <span
                    className="absolute -left-6 grid h-5 w-5 place-items-center rounded-full border-2 border-white shadow-sm"
                    style={{ background: tone.main }}
                  />
                  <span className="text-2xl">{badge?.emoji ?? '🏅'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold text-ink">{badge?.name ?? id}</div>
                    <div className="truncate text-xs font-bold text-ink-soft">{badge?.desc}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-bold tabular-nums text-ink-soft">
                    {formatDate(ts)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
