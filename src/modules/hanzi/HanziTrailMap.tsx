/**
 * 汉字闯关地图（对标洪恩识字单字解锁路径）
 * ------------------------------------------------------------
 * 把「启蒙」阶段（level1）最常用的汉字排成一条 S 形解锁路径：
 *   - ✅ 已学（lv≥1）：绿色圆点，点击可复习；
 *   - 🌟 当前推荐（nextHanzi）：大字号 + 脉冲光圈，点击开始学习；
 *   - 🔒 未解锁：灰色锁，点击提示「先学前面的字」。
 *
 * 与旧「闯关路线图」（3 个静态学习流程节点）不同，本组件是**真正的
 * 单字解锁地图**，路径终点 = 用户当前学习进度，视觉上更直观。
 */
import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useProgress } from '@/store/useStore';
import { getHanziByLevel, nextHanzi, type HanziEntry } from '@/data/hanziIndex';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface HanziTrailMapProps {
  /** 展示的启蒙字数量（默认 20） */
  count?: number;
  /** 点击可学习/复习的字时回调 */
  onSelect: (hanzi: HanziEntry) => void;
}

export function HanziTrailMap({ count = 20, onSelect }: HanziTrailMapProps) {
  const { t } = useTranslation();
  const progress = useProgress();

  const chars = useMemo(() => getHanziByLevel(1).slice(0, count), [count]);
  const current = useMemo(() => nextHanzi(progress.mastery), [progress.mastery]);
  const currentChar = current?.level === 1 ? current.c : null;

  // 已解锁到哪个位置：第一个「未学」的字即路径前沿
  const frontierIdx = useMemo(() => {
    const idx = chars.findIndex((h) => (progress.mastery[`hanzi:${h.c}`]?.lv ?? 0) < 1);
    return idx === -1 ? chars.length : idx;
  }, [chars, progress.mastery]);

  const learnedCount = chars.filter(
    (h) => (progress.mastery[`hanzi:${h.c}`]?.lv ?? 0) >= 1,
  ).length;

  return (
    <div className="space-y-3">
      {/* 顶部进度 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-ink">{t('hanzi.trailMapTitle')}</span>
        <span className="text-xs font-bold text-candy-orange-deep">
          {t('hanzi.trailMapProgress', { done: learnedCount, total: chars.length })}
        </span>
      </div>

      {/* S 形解锁路径 */}
      <div className="grid grid-cols-5 gap-2">
        {chars.map((h, i) => {
          const lv = progress.mastery[`hanzi:${h.c}`]?.lv ?? 0;
          const learned = lv >= 1;
          const isCurrent = currentChar === h.c;
          // 锁定：未学且在路径前沿之后
          const locked = !learned && !isCurrent && i > frontierIdx;

          return (
            <button
              key={h.c}
              onClick={() => {
                if (locked) {
                  sfxTap();
                  return;
                }
                sfxTap();
                onSelect(h);
              }}
              aria-label={
                locked
                  ? t('hanzi.trailMapLocked', { char: h.c })
                  : t('hanzi.trailMapNode', { char: h.c, state: learned ? 'learned' : 'current' })
              }
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-2xl border-2 transition-all active:scale-95',
                learned && 'border-candy-green-deep bg-candy-green-soft',
                isCurrent && 'border-candy-orange-deep bg-candy-orange-soft',
                locked && 'border-slate-200 bg-slate-100',
              )}
            >
              {isCurrent && (
                <motion.span
                  className="absolute inset-0 rounded-2xl ring-4 ring-candy-orange-deep/50"
                  animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.6 }}
                />
              )}
              <span
                className={cn(
                  'text-2xl font-black leading-none',
                  learned && 'text-candy-green-deep',
                  isCurrent && 'text-candy-orange-deep',
                  locked && 'text-slate-300',
                )}
              >
                {h.c}
              </span>
              {/* 状态角标 */}
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
                {learned ? '✅' : isCurrent ? '🌟' : locked ? '🔒' : '⭐'}
              </span>
              {/* 序号（小字） */}
              <span className="mt-0.5 text-[9px] font-bold text-ink-soft/70">{i + 1}</span>
            </button>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-ink-soft">
        <span className="flex items-center gap-1">✅ {t('hanzi.trailMapLegendLearned')}</span>
        <span className="flex items-center gap-1">🌟 {t('hanzi.trailMapLegendCurrent')}</span>
        <span className="flex items-center gap-1">🔒 {t('hanzi.trailMapLegendLocked')}</span>
      </div>
    </div>
  );
}
