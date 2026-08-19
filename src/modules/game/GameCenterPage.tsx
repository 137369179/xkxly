import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { NAV_MAP } from '@/data/nav';
import { navigate, type RouteId } from '@/lib/router';
import { useStore, useDailyLog, useStars } from '@/store/useStore';
import type { Progress } from '@/types';
import { TONE_STYLE } from '@/lib/tones';
import { moduleStat } from '@/lib/moduleStats';
import { cn } from '@/lib/utils';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { PageHeader } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { FluffyIcon } from '@/components/ui/FluffyIcon';
import { useTranslation } from '@/i18n/useTranslation';

interface GameGroup {
  key: string;
  titleKey: string;
  emoji: string;
  tone: 'purple' | 'blue' | 'green' | 'orange';
  desc: string;
  items: RouteId[];
}

// 品类货架：把真实游戏模块按主题分组成「游戏中心」
const GAME_GROUPS: GameGroup[] = [
  {
    key: 'adventure',
    titleKey: 'gamecenter.group.adventure',
    emoji: '🚀',
    tone: 'purple',
    desc: '冒险闯关 · 职业挑战',
    items: ['adventure', 'vehicles'],
  },
  {
    key: 'battle',
    titleKey: 'gamecenter.group.battle',
    emoji: '⚔️',
    tone: 'blue',
    desc: '双人对战 · 亲子 PK · 趣味小游戏',
    items: ['fun'],
  },
  {
    key: 'brain',
    titleKey: 'gamecenter.group.brain',
    emoji: '🧩',
    tone: 'green',
    desc: '逻辑推理 · 找规律 · 动脑筋',
    items: ['logic'],
  },
  {
    key: 'create',
    titleKey: 'gamecenter.group.create',
    emoji: '🎨',
    tone: 'orange',
    desc: '音乐律动 · 艺术色彩 · 创意表达',
    items: ['music', 'art'],
  },
];

export default function GameCenterPage() {
  const { t } = useTranslation();
  const dailyLog = useDailyLog();
  const stars = useStars();
  // moduleStat 仅读取这 6 个字段（本页游戏分组 adventure/vehicles/fun/logic/music/art）
  const p = useStore(
    useShallow(
      (s) =>
        ({
          mastery: s.progress.mastery,
          levelStars: s.progress.levelStars,
          pkCount: s.progress.pkCount,
          creativeCount: s.progress.creativeCount,
          gameBest: s.progress.gameBest,
          logicCorrect: s.progress.logicCorrect,
        }) as Progress,
    ),
  );

  // 累计玩耍题量（从每日日志聚合），作为游戏中心的「投入度量」
  const playItems = useMemo(
    () => Object.values(dailyLog).reduce((s, d) => s + (d?.items ?? 0), 0),
    [dailyLog],
  );

  const allGameRoutes = useMemo(() => GAME_GROUPS.flatMap((g) => g.items), []);

  const openRandom = () => {
    sfxStar();
    const pick = allGameRoutes[Math.floor(Math.random() * allGameRoutes.length)]!;
    navigate(pick);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        emoji="🎮"
        title={t('gamecenter.title')}
        subtitle={t('gamecenter.subtitle')}
        tone="purple"
        right={
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={openRandom}
            className="no-select hidden shrink-0 rounded-2xl border-2 border-white bg-white/70 px-4 py-2.5 text-sm font-extrabold text-candy-purple-deep shadow-sm sm:block"
          >
            🎲 {t('gamecenter.random')}
          </motion.button>
        }
      />

      {/* 概览数据条 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border-4 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-100 p-4 text-center shadow-fluffy">
          <div className="text-3xl font-black text-amber-600 tabular-nums">⭐ {stars}</div>
          <div className="mt-1 text-xs font-bold text-ink-soft">{t('gamecenter.stars')}</div>
        </div>
        <div className="rounded-3xl border-4 border-pink-200 bg-gradient-to-br from-pink-50 to-rose-100 p-4 text-center shadow-fluffy">
          <div className="text-3xl font-black text-pink-600 tabular-nums">🎯 {playItems}</div>
          <div className="mt-1 text-xs font-bold text-ink-soft">{t('gamecenter.playtime')}</div>
        </div>
      </div>

      {/* 分类货架 */}
      {GAME_GROUPS.map((group) => {
        const tone = TONE_STYLE[group.tone]!;
        return (
          <section key={group.key}>
            <header className="mb-3 flex items-center gap-2">
              <span
                className="grid h-11 w-11 place-items-center rounded-2xl text-2xl border-2 border-white shadow-sm"
                style={{ background: tone.soft }}
              >
                {group.emoji}
              </span>
              <div>
                <h2 className="text-lg font-extrabold" style={{ color: tone.deep }}>
                  {t(group.titleKey)}
                </h2>
                <p className="text-xs font-bold text-ink-soft">{group.desc}</p>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {group.items.map((routeId, i) => {
                const item = NAV_MAP.get(routeId);
                if (!item) return null;
                const stat = moduleStat(routeId, p);
                const pct = Math.round(stat.rate * 100);
                return (
                  <motion.button
                    key={routeId}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      sfxTap();
                      navigate(routeId);
                    }}
                    className="no-select group flex items-center gap-3.5 rounded-[2rem] border-4 border-pink-200/90 bg-white/95 p-4 text-left shadow-fluffy transition-all"
                  >
                    <FluffyIcon type={routeId} size="lg" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-base font-extrabold text-ink">
                          {t(`nav.${routeId}.label`) || item.label}
                        </span>
                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm"
                          style={{ background: tone.main }}
                        >
                          {t('gamecenter.start')} →
                        </span>
                      </div>
                      <p className="mb-2 truncate text-xs font-bold text-ink-soft">
                        {t(`nav.${routeId}.desc`) || item.desc}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ProgressBar value={pct} max={100} tone={group.tone} showLabel={false} />
                        </div>
                        <span className="shrink-0 text-[11px] font-extrabold tabular-nums" style={{ color: tone.deep }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* 移动端随机按钮 */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={openRandom}
        className={cn(
          'no-select flex w-full items-center justify-center gap-2 rounded-[1.8rem] border-4 border-white py-4 text-lg font-black text-white shadow-pop sm:hidden',
        )}
        style={{ background: 'linear-gradient(90deg,#8b6ef0,#ff6b96)' }}
      >
        🎲 {t('gamecenter.random')}
      </motion.button>
    </div>
  );
}
