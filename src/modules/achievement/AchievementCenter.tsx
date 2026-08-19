import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useBadges, useBadgeDates, useBadgeMetricProgress, useStars } from '@/store/useStore';
import { MEDALS, REWARD_META, type MedalDef, type MedalCategory } from '@/data/medals';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTranslation } from '@/i18n/useTranslation';
import type { Progress } from '@/types';

/**
 * 宝贝成就中心
 * 对齐「宝贝成就中心」视觉稿：顶部标题 + 统计卡（已收集勋章 / 累计星星）
 * + 三分类 Tab（成就 / 里程碑 / 行为激励）+ 勋章网格。
 * 数据来自真实勋章体系（src/data/medals.ts 的 16 枚 MEDALS），展示 AI 生成的
 * 勋章图片、解锁状态、进度条与自动奖励，与 BadgeUnlock / AchievementWall 共用一套数据源。
 */

type Tab = 'all' | MedalCategory;

const TABS: { key: Tab; labelKey: string; tone: Tone; emoji: string }[] = [
  { key: 'all', labelKey: 'achievementCenter.tabAll', tone: 'pink', emoji: '🌈' },
  { key: 'achievement', labelKey: 'achievementCenter.tabAchievement', tone: 'pink', emoji: '🎯' },
  { key: 'milestone', labelKey: 'achievementCenter.tabMilestone', tone: 'yellow', emoji: '🏁' },
  { key: 'behavior', labelKey: 'achievementCenter.tabBehavior', tone: 'green', emoji: '💡' },
];

export default function AchievementCenter() {
  const { t } = useTranslation();
  const badges = useBadges();
  const badgeDates = useBadgeDates();
  const stars = useStars();
  const metric = useBadgeMetricProgress();
  const owned = useMemo(() => new Set(badges), [badges]);
  const [tab, setTab] = useState<Tab>('all');

  const total = MEDALS.length;
  const doneCount = MEDALS.filter((m) => owned.has(m.id)).length;

  const list = useMemo(
    () => (tab === 'all' ? MEDALS : MEDALS.filter((m) => m.category === tab)),
    [tab],
  );

  // 各分类数量（Tab 角标）
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: total, achievement: 0, milestone: 0, behavior: 0 };
    for (const m of MEDALS) c[m.category]++;
    return c;
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        emoji="🏆"
        title={t('achievementCenter.title')}
        subtitle={t('achievementCenter.subtitle', { done: doneCount, total })}
        tone="pink"
      />

      {/* 统计卡：已收集勋章 + 累计星星 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard tone="pink" emoji="🏅" value={`${doneCount}/${total}`} label={t('achievementCenter.statCollected')} />
        <StatCard tone="blue" emoji="⭐" value={String(stars ?? 0)} label={t('achievementCenter.statStars')} />
      </div>

      {/* 分类 Tab */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tb) => {
          const ts = TONE_STYLE[tb.tone] ?? TONE_STYLE.pink;
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-extrabold transition',
                active ? 'shadow' : 'text-ink-soft',
              )}
              style={{ background: active ? ts.main : ts.soft, color: active ? '#fff' : ts.deep }}
            >
              {tb.emoji} {t(tb.labelKey)}
              <span className="ml-1 opacity-70">{counts[tb.key]}</span>
            </button>
          );
        })}
      </div>

      {/* 勋章网格 */}
      <Panel>
        <PanelTitle emoji="✨" title={t('achievementCenter.progress')} tone="pink" />
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          {list.map((m) => (
            <MedalCard
              key={m.id}
              medal={m}
              unlocked={owned.has(m.id)}
              date={badgeDates[m.id]}
              progress={metric as Progress}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}

/** 单个统计卡 */
function StatCard({ tone, emoji, value, label }: { tone: Tone; emoji: string; value: string; label: string }) {
  const ts = TONE_STYLE[tone] ?? TONE_STYLE.pink;
  return (
    <div
      className="flex items-center gap-3 rounded-3xl p-4"
      style={{ background: ts.soft, border: `2px solid ${ts.main}` }}
    >
      <span className="text-3xl">{emoji}</span>
      <div className="flex flex-col">
        <span className="text-2xl font-extrabold" style={{ color: ts.deep }}>{value}</span>
        <span className="text-[11px] font-bold text-ink-soft">{label}</span>
      </div>
    </div>
  );
}

/** 单个勋章卡片：优先展示 AI 图片，未解锁显示剪影 + 进度条 */
function MedalCard({
  medal,
  unlocked,
  date,
  progress,
}: {
  medal: MedalDef;
  unlocked: boolean;
  date: number | undefined;
  progress: Progress;
}) {
  const { t } = useTranslation();
  const ts = TONE_STYLE[medal.tone ?? 'blue'] ?? TONE_STYLE.blue;
  const [imgOk, setImgOk] = useState(true);
  const meter = medal.meter?.(progress);
  const reward = medal.reward ? REWARD_META[medal.reward.type] : undefined;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn('flex flex-col items-center gap-1.5 rounded-3xl p-3 text-center', !unlocked && 'opacity-70')}
      style={{ background: unlocked ? ts.soft : '#F0EEF4', border: `2px solid ${unlocked ? ts.main : '#D9D4E4'}` }}
      title={medal.desc}
    >
      <div
        className={cn('grid h-16 w-16 place-items-center rounded-full text-4xl', !unlocked && 'grayscale opacity-40')}
        style={{ background: unlocked ? '#fff' : '#E6E2EE', boxShadow: unlocked ? `0 6px 14px -6px ${ts.main}` : 'none' }}
      >
        {medal.image && imgOk ? (
          <img
            src={medal.image}
            alt={medal.name}
            className="h-full w-full rounded-full object-cover"
            onError={() => setImgOk(false)}
          />
        ) : (
          medal.emoji
        )}
      </div>
      <span className="line-clamp-1 text-[11px] font-extrabold" style={{ color: unlocked ? ts.deep : '#8B7F96' }}>
        {medal.name}
      </span>
      {unlocked ? (
        <div className="flex flex-col items-center gap-0.5">
          {reward && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: `${ts.main}22`, color: ts.deep }}
            >
              {reward.emoji} {medal.reward?.amount}
            </span>
          )}
          <span className="text-[10px] font-bold text-candy-green-deep">
            {date ? `✅ ${date}` : `✅ ${t('achievementCenter.unlocked')}`}
          </span>
        </div>
      ) : meter ? (
        <div className="w-full">
          <ProgressBar value={Math.min(meter[0], meter[1])} max={meter[1]} tone={medal.tone} height={6} />
          <span className="mt-0.5 block text-[10px] font-bold text-ink-soft">
            {Math.min(meter[0], meter[1])}/{meter[1]}
          </span>
        </div>
      ) : (
        <span className="text-[10px] font-bold text-ink-soft">{t('achievementCenter.notStarted')}</span>
      )}
    </motion.div>
  );
}
