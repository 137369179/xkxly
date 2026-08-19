/**
 * 错题徽章展示
 * ------------------------------------------------------------------
 * 10 枚错题徽章（从"错题初遇"到"错题终结者"，含铜银金三级消灭者）
 * 已解锁/未解锁状态 + 进度条 + 点击查看解锁条件
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useBadges, useBadgeDates, useBadgeMetricProgress } from '@/store/useStore';
import { BADGE_MAP } from '@/data/badges';
import { TONE_STYLE } from '@/lib/tones';
import { sfxTap } from '@/lib/sfx';
import type { BadgeDef, Progress } from '@/types';
import { useTranslation } from '@/i18n/useTranslation';

/* ------------------------------------------------------------------ */
/* 错题徽章定义（与 badges.ts 同步）                                    */
/* ------------------------------------------------------------------ */
const WRONG_BADGE_IDS = [
  'wrong-first',
  'wrong-10',
  'wrong-50',
  'wrong-kill-5',
  'wrong-kill-20',
  'wrong-kill-50',
  'wrong-streak-10',
  'wrong-streak-30',
  'wrong-zero-day',
  'wrong-terminator',
];

/* ------------------------------------------------------------------ */
/* 组件                                                                */
/* ------------------------------------------------------------------ */
export function WrongBookBadgeList() {
  const { t: tr } = useTranslation();
  const badges = useBadges();
  const metric = useBadgeMetricProgress();
  const [selected, setSelected] = useState<string | null>(null);

  const badgeItems = useMemo(() => {
    return WRONG_BADGE_IDS.map((id) => BADGE_MAP.get(id))
      .filter((b): b is BadgeDef => !!b)
      .map((b) => {
        const unlocked = badges.includes(b.id);
        const meter = b.meter ? b.meter(metric as Progress) : [unlocked ? 1 : 0, 1];
        const current = meter[0]!;
        const target = meter[1]!;
        const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
        return { ...b, unlocked, current, target, pct };
      });
  }, [badges, metric]);

  const unlockedCount = badgeItems.filter((b) => b.unlocked).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-extrabold text-ink">{tr('wrongBookBadge.title')}</h3>
        <span className="text-sm font-bold text-ink-soft">
          {tr('wrongBookBadge.unlockedCount', { count: String(unlockedCount), total: String(badgeItems.length) })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {badgeItems.map((b) => {
          const tone = TONE_STYLE[b.tone];
          return (
            <motion.button
              key={b.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                sfxTap();
                setSelected(b.id);
              }}
              className="relative overflow-hidden rounded-2xl p-3 text-center transition"
              style={{
                background: b.unlocked ? tone.soft : '#f7edf0',
                opacity: b.unlocked ? 1 : 0.6,
              }}
            >
              {/* 锁标记 */}
              {!b.unlocked && (
                <span className="absolute right-2 top-2 text-xs">🔒</span>
              )}
              {/* Emoji */}
              <div className={`text-4xl ${!b.unlocked ? 'grayscale' : ''}`}>
                {b.emoji}
              </div>
              {/* 名称 */}
              <div
                className="mt-1 text-sm font-extrabold"
                style={{ color: b.unlocked ? tone.deep : '#b38894' }}
              >
                {b.name}
              </div>
              {/* 进度条 */}
              {!b.unlocked && b.target! > 1 && (
                <div className="mt-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${b.pct}%`, background: tone.main }}
                    />
                  </div>
                  <div className="mt-0.5 text-xs font-bold text-gray-500">
                    {b.current}/{b.target}
                  </div>
                </div>
              )}
              {b.unlocked && (
                <div className="mt-1 text-xs font-bold" style={{ color: tone.deep }}>
                  {tr('wrongBookBadge.unlocked')}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* 详情弹窗 */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: 'spring' }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 w-full max-w-sm"
            >
              <BadgeDetail
                badge={badgeItems.find((b) => b.id === selected)!}
                onClose={() => setSelected(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 徽章详情面板                                                         */
/* ------------------------------------------------------------------ */
function BadgeDetail({
  badge,
  onClose,
}: {
  badge: BadgeDef & { unlocked: boolean; current: number; target: number; pct: number };
  onClose: () => void;
}) {
  const { t: tr } = useTranslation();
  const tone = TONE_STYLE[badge.tone];
  const badgeDate = useBadgeDates()?.[badge.id];

  return (
    <div style={{ background: tone.soft }}><Panel className="space-y-3 text-center">
      <div className="text-6xl">{badge.emoji}</div>
      <h3 className="text-xl font-extrabold" style={{ color: tone.deep }}>
        {badge.name}
      </h3>
      <p className="text-sm font-bold text-ink-soft">{badge.desc}</p>

      {badge.unlocked ? (
        <div className="rounded-xl bg-white/60 p-3">
          <div className="text-sm font-extrabold" style={{ color: tone.deep }}>
            {tr('wrongBookBadge.unlockedEx')}
          </div>
          {badgeDate && (
            <div className="mt-1 text-xs font-bold text-ink-soft">
              {tr('wrongBookBadge.unlockTime', { date: new Date(badgeDate).toLocaleDateString('zh-CN') })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white/60 p-3">
          <div className="text-sm font-bold text-ink-soft">{tr('wrongBookBadge.unlockCondition')}</div>
          <div className="mt-1 text-sm font-extrabold" style={{ color: tone.deep }}>
            {badge.desc}
          </div>
          {badge.target > 1 && (
            <>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${badge.pct}%`, background: tone.main }}
                />
              </div>
              <div className="mt-1 text-xs font-bold text-ink-soft">
                {tr('wrongBookBadge.progress', { current: String(badge.current), target: String(badge.target), pct: String(badge.pct) })}
              </div>
            </>
          )}
        </div>
      )}

      <CandyButton tone={badge.tone} size="md" fullWidth onClick={onClose}>
        {tr('wrongBookBadge.close')}
      </CandyButton>
    </Panel></div>
  );
}
