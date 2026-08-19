import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useBadges, useBadgeDates, useBadgeMetricProgress } from '@/store/useStore';
import { BADGE_MAP } from '@/data/badges';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AchievementWall } from '@/components/AchievementWall';
import type { BadgeDef, Progress } from '@/types';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 学习护照
 * 以盖章方式记录每个模块阶段的学习里程碑。
 * 每个里程碑对应一枚徽章：已解锁 -> 彩色印章 + 日期；未解锁 -> 灰色剪影 + 进度条。
 */

/** 护照模块分组：每组包含若干里程碑（对应徽章 id） */
interface PassportGroup {
  key: string;
  label: string;
  emoji: string;
  tone: Tone;
  milestones: string[];
}

const PASSPORT_GROUPS: PassportGroup[] = [
  {
    key: 'letters',
    label: 'studyPassport.groupLetters',
    emoji: '🔤',
    tone: 'blue',
    milestones: ['letter-10', 'letter-all'],
  },
  {
    key: 'numbers',
    label: 'studyPassport.groupNumbers',
    emoji: '🔢',
    tone: 'yellow',
    milestones: ['number-20', 'number-all', 'math-20', 'math-100'],
  },
  {
    key: 'hanzi',
    label: 'studyPassport.groupHanzi',
    emoji: '🀄',
    tone: 'green',
    milestones: ['hanzi-50', 'hanzi-150', 'hanzi-300'],
  },
  {
    key: 'pinyin',
    label: 'studyPassport.groupPinyin',
    emoji: '📋',
    tone: 'blue',
    milestones: ['pinyin-30', 'pinyin-all'],
  },
  {
    key: 'poems',
    label: 'studyPassport.groupPoems',
    emoji: '🌸',
    tone: 'pink',
    milestones: ['poem-1', 'poem-10', 'poem-50', 'poem-100', 'recite-10'],
  },
  {
    key: 'words',
    label: 'studyPassport.groupWords',
    emoji: '🌐',
    tone: 'purple',
    milestones: ['word-30', 'word-all', 'sentence-10'],
  },
];

/** 时间戳 -> YYYY-MM-DD */
function fmtDate(ts: number | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function StudyPassport() {
  const { t } = useTranslation();
  const badges = useBadges();
  const badgeDates = useBadgeDates();
  const metric = useBadgeMetricProgress();
  const ownedBadges = useMemo(() => new Set(badges), [badges]);

  // 总盖章数
  const stampedCount = useMemo(
    () => PASSPORT_GROUPS.flatMap((g) => g.milestones).filter((id) => ownedBadges.has(id)).length,
    [ownedBadges],
  );
  const totalCount = useMemo(
    () => PASSPORT_GROUPS.reduce((s, g) => s + g.milestones.length, 0),
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        emoji="🛂"
        title={t('studyPassport.title')}
        subtitle={t('studyPassport.subtitle', { stamped: stampedCount, total: totalCount })}
        tone="purple"
      />

      {PASSPORT_GROUPS.map((group) => {
        const groupDone = group.milestones.filter((id) => ownedBadges.has(id)).length;
        return (
          <Panel key={group.key}>
            <PanelTitle
              emoji={group.emoji}
              title={t('studyPassport.journey', { label: t(group.label) })}
              subtitle={t('studyPassport.stampCount', { done: groupDone, total: group.milestones.length })}
              tone={group.tone}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.milestones.map((badgeId) => {
                const badge = BADGE_MAP.get(badgeId);
                if (!badge) return null;
                const stamped = ownedBadges.has(badgeId);
                const date = badgeDates[badgeId];
                const meter = badge.meter?.(metric as Progress);
                return (
                  <Stamp
                    key={badgeId}
                    badge={badge}
                    stamped={stamped}
                    date={fmtDate(date)}
                    meter={meter}
                  />
                );
              })}
            </div>
            {/* 分组整体进度 */}
            <div className="mt-4">
              <ProgressBar
                value={groupDone}
                max={group.milestones.length}
                tone={group.tone}
                height={8}
                showLabel
              />
            </div>
          </Panel>
        );
      })}

      {/* 成就墙：按金 / 银 / 铜分类展示全部徽章 */}
      <AchievementWall />
    </div>
  );
}

/** 单个盖章卡片 */
function Stamp({
  badge,
  stamped,
  date,
  meter,
}: {
  badge: BadgeDef;
  stamped: boolean;
  date: string;
  meter?: [number, number];
}) {
  const t = TONE_STYLE[badge.tone ?? 'blue']!
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'flex flex-col items-center gap-1 rounded-2xl p-3 text-center',
        !stamped && 'opacity-60',
      )}
      style={{
        background: stamped ? t.soft : '#F0EEF4',
        border: stamped ? `2px dashed ${t.main}` : '2px dashed #CFC8DA',
      }}
    >
      <span className={cn('text-4xl', !stamped && 'grayscale opacity-40')}>{badge.emoji}</span>
      <span
        className="line-clamp-1 text-xs font-extrabold"
        style={{ color: stamped ? t.deep : '#8B7F96' }}
      >
        {badge.name}
      </span>
      {stamped ? (
        <span className="text-[10px] font-bold text-candy-green-deep">
          ✅ {date || '已盖章'}
        </span>
      ) : meter ? (
        <div className="w-full">
          <ProgressBar value={Math.min(meter[0], meter[1])} max={meter[1]} tone={badge.tone} height={6} />
          <span className="mt-0.5 block text-[10px] font-bold text-ink-soft">
            {Math.min(meter[0], meter[1])}/{meter[1]}
          </span>
        </div>
      ) : (
        <span className="text-[10px] font-bold text-ink-soft">未开始</span>
      )}
    </motion.div>
  );
}
