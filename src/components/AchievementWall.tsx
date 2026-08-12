import { useMemo } from 'react';
import { motion } from 'motion/react';
import { BADGES } from '@/data/badges';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useProgress } from '@/store/useStore';
import type { BadgeDef } from '@/types';

/**
 * 成就墙
 * 徽章按金 / 银 / 铜三档分类展示：
 *   金色 —— 通关类（adv-*）、全通类（letter-all、pinyin-all 等）
 *   银色 —— 数量类（letter-10、poem-10、math-20 等）
 *   铜色 —— 入门类（first-step、poem-1、match-1 等）
 * 已解锁的徽章显示彩色 + 解锁日期；未解锁的显示剪影 + 进度条（badge.meter）。
 */

type Tier = 'gold' | 'silver' | 'bronze';

interface TierConfig {
  label: string;
  emoji: string;
  tone: Tone;
  /** 奖牌边框色 */
  ring: string;
  /** 奖牌背景渐变 */
  bg: string;
}

const TIER_CONFIG: Record<Tier, TierConfig> = {
  gold: { label: '金牌成就', emoji: '🥇', tone: 'yellow', ring: '#D99C0E', bg: 'linear-gradient(135deg, #FFF3D2, #FFE6A8)' },
  silver: { label: '银牌成就', emoji: '🥈', tone: 'blue', ring: '#2196C9', bg: 'linear-gradient(135deg, #DDF2FD, #E8F4FB)' },
  bronze: { label: '铜牌成就', emoji: '🥉', tone: 'orange', ring: '#E0742B', bg: 'linear-gradient(135deg, #FFEBDB, #FFE0CC)' },
};

/** 金色：通关类 + 全通类 */
const GOLD_IDS = new Set([
  'adv-1', 'adv-6', 'adv-all', 'adv-perfect',
  'letter-all', 'number-all', 'pinyin-all', 'word-all', 'code-all',
  'hanzi-300', 'poem-100', 'math-100', 'logic-60', 'star-500', 'streak-30', 'tree-lv5',
]);

/** 铜色：入门类 */
const BRONZE_IDS = new Set([
  'first-step', 'match-1', 'poem-1', 'streak-3', 'pk-1', 'tree-lv3', 'creative-1',
]);

/** 其余为银色 */
function badgeTier(id: string): Tier {
  if (GOLD_IDS.has(id)) return 'gold';
  if (BRONZE_IDS.has(id)) return 'bronze';
  return 'silver';
}

/** 时间戳 -> YYYY-MM-DD */
function fmtDate(ts: number | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function AchievementWall() {
  const progress = useProgress();
  const owned = useMemo(() => new Set(progress.badges), [progress.badges]);

  // 按档位分组
  const grouped = useMemo(() => {
    const map: Record<Tier, BadgeDef[]> = { gold: [], silver: [], bronze: [] };
    for (const b of BADGES) {
      map[badgeTier(b.id)].push(b);
    }
    return map;
  }, []);

  const tierOrder: Tier[] = ['gold', 'silver', 'bronze'];

  return (
    <div className="space-y-5">
      {tierOrder.map((tier) => {
        const cfg = TIER_CONFIG[tier]!!
        const list = grouped[tier]!!
        const done = list.filter((b) => owned.has(b.id)).length;
        return (
          <Panel key={tier}>
            <PanelTitle
              emoji={cfg.emoji}
              title={cfg.label}
              subtitle={`${done} / ${list.length} 已解锁`}
              tone={cfg.tone}
            />
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
              {list.map((b) => (
                <Medal
                  key={b.id}
                  badge={b}
                  unlocked={owned.has(b.id)}
                  date={fmtDate(progress.badgeDates[b.id])}
                  meter={b.meter?.(progress)}
                  tier={tier}
                />
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

/** 单个奖牌卡片 */
function Medal({
  badge,
  unlocked,
  date,
  meter,
  tier,
}: {
  badge: BadgeDef;
  unlocked: boolean;
  date: string;
  meter?: [number, number];
  tier: Tier;
}) {
  const cfg = TIER_CONFIG[tier]!!
  const t = TONE_STYLE[badge.tone ?? 'blue']!
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'flex flex-col items-center gap-1 rounded-2xl p-3 text-center',
        !unlocked && 'opacity-60',
      )}
      style={{
        background: unlocked ? cfg.bg : '#F0EEF4',
        border: unlocked ? `2px solid ${cfg.ring}` : '2px solid #D9D4E4',
      }}
      title={badge.desc}
    >
      {/* 奖牌图标 */}
      <div
        className={cn('grid h-14 w-14 place-items-center rounded-full text-3xl', !unlocked && 'grayscale opacity-40')}
        style={{
          background: unlocked ? t.soft : '#E6E2EE',
          border: unlocked ? `3px solid ${cfg.ring}` : '3px solid #CFC8DA',
        }}
      >
        {badge.emoji}
      </div>
      <span
        className="line-clamp-1 text-[11px] font-extrabold"
        style={{ color: unlocked ? t.deep : '#8B7F96' }}
      >
        {badge.name}
      </span>
      {unlocked ? (
        <span className="text-[10px] font-bold text-candy-green-deep">
          ✅ {date || '已解锁'}
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
