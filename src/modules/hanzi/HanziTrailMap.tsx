/**
 * 汉字闯关地图（对标洪恩识字分阶段解锁路径）
 * ------------------------------------------------------------
 * 覆盖全部 300 字，按 3 阶段 × 5 关 × 每关 20 字组织：
 *   - 阶段（启蒙🌱 / 常用🌿 / 进阶🌳）：前一阶段全部通关才解锁下一阶段；
 *   - 关卡（每阶段 5 关，每关 20 字）：前一关通关才解锁下一关；
 *   - 字节点：✅ 已学 / 🌟 当前（阶段内第一个未学字，脉冲光圈）/ ⭐ 本关可学 / 🔒 未解锁。
 *
 * 与旧「闯关路线图」（3 个静态学习流程节点）不同，本组件是**真正的
 * 单字解锁地图**，路径终点 = 用户当前学习进度，视觉上更直观。
 */
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useProgress } from '@/store/useStore';
import { getHanziByLevel, HANZI_LEVELS, type HanziEntry } from '@/data/hanziIndex';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface HanziTrailMapProps {
  /** 点击可学习/复习的字时回调 */
  onSelect: (hanzi: HanziEntry) => void;
}

const PER_CHAPTER = 20; // 每关字数

interface Chapter {
  chars: HanziEntry[];
  learnedCount: number;
  unlocked: boolean;
}

export function HanziTrailMap({ onSelect }: HanziTrailMapProps) {
  const { t } = useTranslation();
  const progress = useProgress();

  // 每个阶段的字（已按 freq 降序排好）
  const stages = useMemo(
    () => HANZI_LEVELS.map((lv) => ({ ...lv, chars: getHanziByLevel(lv.id) })),
    [],
  );

  const learned = (c: string) => progress.mastery[`hanzi:${c}`]?.lv ?? 0;

  // 阶段解锁状态：第 0 阶段永远解锁，其余需前一阶段全部通关
  const stageUnlocked = useMemo(
    () =>
      stages.map((_, i) =>
        i === 0 ? true : stages[i - 1]!.chars.every((h) => learned(h.c) >= 1),
      ),
    [stages, progress.mastery],
  );

  // 默认选中第一个「未全部通关」的阶段；全通关则停在最后一阶段
  const defaultStage = useMemo(() => {
    for (let i = 0; i < stages.length; i++) {
      if (!stages[i]!.chars.every((h) => learned(h.c) >= 1)) return i;
    }
    return stages.length - 1;
  }, [stages, progress.mastery]);

  const [stageIdx, setStageIdx] = useState(defaultStage);
  const stage = stages[stageIdx]!;
  const unlocked = stageUnlocked[stageIdx]!;

  // 分关
  const chapters = useMemo<Chapter[]>(() => {
    const out: Chapter[] = [];
    for (let i = 0; i < stage.chars.length; i += PER_CHAPTER) {
      const chars = stage.chars.slice(i, i + PER_CHAPTER);
      out.push({
        chars,
        learnedCount: chars.filter((h) => learned(h.c) >= 1).length,
        unlocked: false,
      });
    }
    // 关卡解锁：第 0 关永远，其余前一关满
    out.forEach((ch, i) => {
      ch.unlocked = i === 0 || out[i - 1]!.learnedCount === out[i - 1]!.chars.length;
    });
    return out;
  }, [stage, progress.mastery]);

  const stageLearned = chapters.reduce((s, ch) => s + ch.learnedCount, 0);
  const stageTotal = stage.chars.length;

  // 当前关：第一个 unlocked 且未满的关；全满则最后一关
  const currentChapterIdx = useMemo(() => {
    const idx = chapters.findIndex((ch) => ch.unlocked && ch.learnedCount < ch.chars.length);
    return idx === -1 ? chapters.length - 1 : idx;
  }, [chapters]);

  // 当前字：当前关内第一个未学字
  const currentChar = useMemo(() => {
    const ch = chapters[currentChapterIdx];
    if (!ch) return null;
    return ch.chars.find((h) => learned(h.c) < 1)?.c ?? null;
  }, [chapters, currentChapterIdx, progress.mastery]);

  const [expandedIdx, setExpandedIdx] = useState<number | null>(currentChapterIdx);

  return (
    <div className="space-y-3">
      {/* 顶部标题 + 阶段进度 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-extrabold text-ink">{t('hanzi.trailMapTitle')}</span>
        <span className="text-xs font-bold text-candy-orange-deep">
          {t('hanzi.trailMapStageProgress', { done: stageLearned, total: stageTotal })}
        </span>
      </div>

      {/* 阶段切换 */}
      <div className="flex gap-2">
        {stages.map((s, i) => {
          const active = i === stageIdx;
          const canEnter = stageUnlocked[i];
          return (
            <button
              key={s.id}
              onClick={() => {
                if (!canEnter) {
                  sfxTap();
                  return;
                }
                sfxTap();
                setStageIdx(i);
                setExpandedIdx(null);
              }}
              disabled={!canEnter}
              className={cn(
                'flex-1 rounded-xl border-2 px-2 py-1.5 text-xs font-extrabold transition-all active:scale-95',
                active && 'border-candy-orange-deep bg-candy-orange-soft text-candy-orange-deep',
                !active && canEnter && 'border-ink-soft/20 bg-white text-ink-soft hover:border-ink-soft/40',
                !canEnter && 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed',
              )}
            >
              {canEnter ? `${s.emoji} ${s.name}` : `🔒 ${s.name}`}
            </button>
          );
        })}
      </div>

      {/* 阶段解锁提示 */}
      {!unlocked && (
        <p className="text-center text-xs font-bold text-ink-soft">
          {t('hanzi.trailMapStageLocked')}
        </p>
      )}

      {/* 关卡列表 */}
      {unlocked && (
        <div className="space-y-2">
          {chapters.map((ch, ci) => {
            const done = ch.learnedCount === ch.chars.length;
            const isCurrent = ci === currentChapterIdx;
            const expanded = expandedIdx === ci;

            if (!ch.unlocked) {
              return (
                <div
                  key={ci}
                  className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-slate-100 px-3 py-2 text-slate-400"
                >
                  <span className="text-base">🔒</span>
                  <span className="text-xs font-extrabold">{t('hanzi.trailMapChapter', { n: ci + 1 })}</span>
                  <span className="ml-auto text-[10px] font-bold">{t('hanzi.trailMapChapterLocked')}</span>
                </div>
              );
            }

            return (
              <div
                key={ci}
                className={cn(
                  'rounded-xl border-2 transition-colors',
                  done && 'border-candy-green-deep bg-candy-green-soft/40',
                  isCurrent && !done && 'border-candy-orange-deep bg-candy-orange-soft/40',
                  !done && !isCurrent && 'border-ink-soft/20 bg-white',
                )}
              >
                {/* 关卡头（可折叠） */}
                <button
                  onClick={() => {
                    sfxTap();
                    setExpandedIdx(expanded ? null : ci);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                >
                  <span className="text-base">{done ? '✅' : isCurrent ? '🌟' : '⭐'}</span>
                  <span className="text-xs font-extrabold text-ink">
                    {t('hanzi.trailMapChapter', { n: ci + 1 })}
                  </span>
                  <span className="text-[10px] font-bold text-ink-soft">
                    {ch.learnedCount}/{ch.chars.length}
                  </span>
                  {done && (
                    <span className="ml-auto text-[10px] font-extrabold text-candy-green-deep">
                      {t('hanzi.trailMapChapterDone')}
                    </span>
                  )}
                  <span className={cn('ml-auto text-xs text-ink-soft transition-transform', expanded && 'rotate-180')}>
                    ▾
                  </span>
                </button>

                {/* 展开的 20 字网格 */}
                {expanded && (
                  <div className="grid grid-cols-5 gap-1.5 px-3 pb-3">
                    {ch.chars.map((h) => {
                      const lv = learned(h.c);
                      const isLearned = lv >= 1;
                      const isCur = h.c === currentChar;
                      const locked = !isLearned && !isCur && ci > currentChapterIdx;
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
                              : t('hanzi.trailMapNode', { char: h.c, state: isLearned ? 'learned' : 'current' })
                          }
                          className={cn(
                            'relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 transition-all active:scale-95',
                            isLearned && 'border-candy-green-deep bg-candy-green-soft',
                            isCur && 'border-candy-orange-deep bg-candy-orange-soft',
                            !isLearned && !isCur && !locked && 'border-candy-blue-deep/40 bg-white',
                            locked && 'border-slate-200 bg-slate-100',
                          )}
                        >
                          {isCur && (
                            <motion.span
                              className="absolute inset-0 rounded-xl ring-4 ring-candy-orange-deep/50"
                              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                              transition={{ repeat: Infinity, duration: 1.6 }}
                            />
                          )}
                          <span
                            className={cn(
                              'text-xl font-black leading-none',
                              isLearned && 'text-candy-green-deep',
                              isCur && 'text-candy-orange-deep',
                              !isLearned && !isCur && !locked && 'text-ink',
                              locked && 'text-slate-300',
                            )}
                          >
                            {h.c}
                          </span>
                          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px]">
                            {isLearned ? '✅' : isCur ? '🌟' : locked ? '🔒' : '⭐'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-ink-soft">
        <span className="flex items-center gap-1">✅ {t('hanzi.trailMapLegendLearned')}</span>
        <span className="flex items-center gap-1">🌟 {t('hanzi.trailMapLegendCurrent')}</span>
        <span className="flex items-center gap-1">⭐ {t('hanzi.trailMapLegendAvailable')}</span>
        <span className="flex items-center gap-1">🔒 {t('hanzi.trailMapLegendLocked')}</span>
      </div>
    </div>
  );
}
