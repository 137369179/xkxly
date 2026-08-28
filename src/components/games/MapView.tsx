/**
 * 学习叙事地图（核心加强 B - M3）+ P1 阶段化
 * ------------------------------------------------------------
 * 设计依据：Khan Kids 自适应学习路径 + 洪恩识字三阶解锁。
 * 首页大地图旅程模式，可视化学习进度，按掌握度解锁区域。
 *
 * 地图结构：
 *   - 7 个区域，对应 7 大学习模块
 *   - 每个区域有 3-5 个节点（按等级分档）
 *   - 节点颜色：🔒未解锁/🌱未开始/🌿进行中/🌳已掌握
 *   - P1：区域按「启蒙 → 进阶 → 思维」三阶段归档，
 *     前一阶段平均节点等级 ≥ 2 才解锁下一阶段（阶段化进程感）
 */
import { useMemo } from 'react';
import { motion } from 'motion/react';
import type { Progress } from '@/types';
import { useMastery } from '@/store/useStore';
import { TONE_STYLE } from '@/lib/tones';
import { subjectLabel, subjectEmoji, subjectTone } from '@/lib/srs';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface MapNode {
  id: string;
  label: string;
  emoji: string;
  lv: number;
  unlocked: boolean;
}

interface MapRegion {
  id: string;
  label: string;
  emoji: string;
  tone: 'pink' | 'purple' | 'blue' | 'green' | 'yellow' | 'orange';
  nodes: MapNode[];
}

function buildNodes(
  entries: [string, { lv: number }][],
  nodeLabels: { emoji: string; label: string }[],
  total: number,
): MapNode[] {
  const learned = Object.values(entries).length;
  const nodes: MapNode[] = [];
  let prevUnlocked = true;
  for (let i = 0; i < nodeLabels.length; i++) {
    const threshold = Math.ceil(total / nodeLabels.length) * (i + 1);
    const nodeEntries = entries.slice(
      Math.floor((total / nodeLabels.length) * i),
      i === nodeLabels.length - 1 ? entries.length : Math.floor((total / nodeLabels.length) * (i + 1)),
    );
    const avgLv = nodeEntries.length
      ? Math.round(nodeEntries.reduce((s, [, m]) => s + m.lv, 0) / nodeEntries.length)
      : 0;
    nodes.push({
      id: `${i}`,
      label: nodeLabels[i]?.label ?? '',
      emoji: nodeLabels[i]?.emoji ?? '',
      lv: avgLv,
      unlocked: prevUnlocked || learned >= threshold * 0.15,
    });
    prevUnlocked = nodes[nodes.length - 1]?.unlocked ?? false;
  }
  return nodes;
}

const LV_EMOJI: Record<number, string> = {
  0: '🔒',
  1: '🌱',
  2: '🌿',
  3: '🪴',
  4: '🌳',
  5: '⭐',
};
// 学科 label/emoji/tone 已统一取自 @/lib/srs 单一真相源（见下方 REGION_META + .map 注入）。
// 区域结构（math 与 number 合并为「数字」大区、专属节点）保留自定义，不替换。
const REGION_META: Record<string, string> = {
  letter: 'letter',
  math: 'number', // 数字大区合并 math+number
  hanzi: 'hanzi',
  pinyin: 'pinyin',
  poem: 'poem',
  word: 'word',
  logic: 'logic',
};

/** P1：三阶段归档（启蒙 → 进阶 → 思维） */
const STAGE_META: {
  key: string;
  titleKey: string;
  emoji: string;
  tone: 'pink' | 'purple' | 'blue' | 'green' | 'yellow' | 'orange';
  regions: string[];
}[] = [
  { key: 's1', titleKey: 'mapStage.stage1', emoji: '🌱', tone: 'green', regions: ['letter', 'pinyin', 'math'] },
  { key: 's2', titleKey: 'mapStage.stage2', emoji: '📚', tone: 'blue', regions: ['hanzi', 'poem', 'word'] },
  { key: 's3', titleKey: 'mapStage.stage3', emoji: '🧠', tone: 'purple', regions: ['logic'] },
];

function buildMap(p: Progress): MapRegion[] {
  const all = Object.entries(p.mastery);
  const hanzi = all.filter(([k]) => k.startsWith('hanzi:'));
  const pinyin = all.filter(([k]) => k.startsWith('pinyin:'));
  const word = all.filter(([k]) => k.startsWith('word:'));
  const math = all.filter(([k]) => k.startsWith('math:') || k.startsWith('number:') || k.startsWith('count:'));
  const letter = all.filter(([k]) => k.startsWith('letter:'));
  const poem = all.filter(([k]) => k.startsWith('poem:'));
  const logic = all.filter(([k]) => k.startsWith('logic:') || k.startsWith('compare:') || k.startsWith('sort:') || k.startsWith('pair:') || k.startsWith('similar:'));

  return [
    {
      id: 'letter',
      nodes: buildNodes(letter, [
        { emoji: '🔤', label: 'A-G' },
        { emoji: '🔤', label: 'H-N' },
        { emoji: '🔤', label: 'O-T' },
        { emoji: '✨', label: 'U-Z' },
      ], 26),
    },
    {
      id: 'math',
      nodes: buildNodes(math, [
        { emoji: '🔢', label: '1-10' },
        { emoji: '➕', label: '加减法' },
        { emoji: '✖️', label: '乘除' },
        { emoji: '🧮', label: '应用题' },
        { emoji: '⚡', label: '速算' },
      ], 40),
    },
    {
      id: 'hanzi',
      nodes: buildNodes(hanzi, [
        { emoji: '🌱', label: '启蒙' },
        { emoji: '🌿', label: '常用' },
        { emoji: '🌳', label: '进阶' },
        { emoji: '📖', label: '阅读' },
      ], 300),
    },
    {
      id: 'pinyin',
      nodes: buildNodes(pinyin, [
        { emoji: '🗣️', label: '声母' },
        { emoji: '🎶', label: '韵母' },
        { emoji: '🔗', label: '拼读' },
      ], 63),
    },
    {
      id: 'poem',
      nodes: buildNodes(poem, [
        { emoji: '🌸', label: '启蒙' },
        { emoji: '📜', label: '经典' },
        { emoji: '🏛️', label: '名篇' },
      ], 42),
    },
    {
      id: 'word',
      nodes: buildNodes(word, [
        { emoji: '🐱', label: '基础词' },
        { emoji: '📖', label: '句子' },
        { emoji: '🗣️', label: '对话' },
      ], 74),
    },
    {
      id: 'logic',
      nodes: buildNodes(logic, [
        { emoji: '🔍', label: '找规律' },
        { emoji: '🧩', label: '配对' },
        { emoji: '🤖', label: '编程' },
      ], 20),
    },
  ].map((r) => ({
    ...r,
    // 学科 label/emoji/tone 取自 @/lib/srs 单一真相源，消除硬编码漂移
    label: subjectLabel(REGION_META[r.id] ?? r.id),
    emoji: subjectEmoji(REGION_META[r.id] ?? r.id),
    tone: subjectTone(REGION_META[r.id] ?? r.id),
  }));
}

export function MapView() {
  const { t } = useTranslation();
  const mastery = useMastery();
  const regions = useMemo(() => buildMap({ mastery } as Progress), [mastery]);

  // P1：阶段化 —— 前一阶段平均节点等级 ≥ 2 才解锁下一阶段
  const stages = useMemo(() => {
    const byId = new Map(regions.map((r) => [r.id, r]));
    let prevUnlocked = true;
    return STAGE_META.map((stage) => {
      const rs = (stage.regions.map((id) => byId.get(id)).filter(Boolean) as MapRegion[]);
      const avg = rs.length
        ? rs.reduce(
            (sum, r) => sum + r.nodes.reduce((s, n) => s + n.lv, 0) / Math.max(1, r.nodes.length),
            0,
          ) / rs.length
        : 0;
      const unlocked = prevUnlocked;
      prevUnlocked = prevUnlocked && avg >= 2;
      return { ...stage, regions: rs, avg, unlocked };
    });
  }, [regions]);

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-3 text-center text-lg font-extrabold text-ink">{t('map.title')}</h3>
      <p className="mb-4 text-center text-xs font-bold text-ink-soft">
        {t('map.subtitle')}
      </p>

      <div className="space-y-4">
        {stages.map((stage) => {
          const toneStyle = TONE_STYLE[stage.tone];
          return (
            <div
              key={stage.key}
              className="relative overflow-hidden rounded-2xl border-2 p-3"
              style={{ borderColor: toneStyle.main + '44', background: toneStyle.soft + '44' }}
            >
              {/* 阶段头 */}
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-xl">{stage.emoji}</span>
                  <span className="truncate text-sm font-extrabold" style={{ color: toneStyle.deep }}>
                    {t(stage.titleKey)}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-black text-white shadow-sm',
                      !stage.unlocked && 'bg-gray-400',
                    )}
                    style={stage.unlocked ? { background: toneStyle.main } : undefined}
                  >
                    {stage.unlocked ? `✓ ${t('mapStage.unlocked')}` : '🔒'}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-ink-soft">
                  {Math.round(Math.min(1, stage.avg / 5) * 100)}%
                </span>
              </div>

              <div className={cn('space-y-3', !stage.unlocked && 'pointer-events-none')}>
                {stage.regions.map((region) => {
                  const rTone = TONE_STYLE[region.tone];
                  return (
                    <div key={region.id} className="rounded-2xl border-2 p-3" style={{ borderColor: rTone.main + '44', background: 'white' }}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xl">{region.emoji}</span>
                        <span className="text-sm font-extrabold" style={{ color: rTone.deep }}>{region.label}</span>
                      </div>
                      <div className="flex gap-2">
                        {region.nodes.map((node, i) => (
                          <motion.div
                            key={node.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.08 }}
                            className={cn(
                              'flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-center transition-all',
                              node.unlocked ? 'opacity-100' : 'opacity-40 grayscale',
                            )}
                            style={{ background: node.lv >= 4 ? rTone.main + '22' : 'white' }}
                          >
                            <div className="text-2xl">{node.lv >= 3 ? node.emoji : LV_EMOJI[node.lv]}</div>
                            <div className="text-xs font-bold text-ink-soft">{node.label}</div>
                            <div className="text-xs font-semibold text-ink-muted">{t(`map.lv${node.lv}`)}</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 锁定遮罩 */}
              {!stage.unlocked && (
                <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-white/60 backdrop-blur-[2px]">
                  <div className="rounded-2xl border-2 border-white bg-white/90 px-4 py-3 text-center shadow-fluffy">
                    <div className="text-2xl">🔒</div>
                    <div className="mt-1 max-w-[14rem] text-xs font-extrabold text-ink">{t('mapStage.lockedHint')}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 所有区域节点的平均等级（0-5），用于总览进度 */
export function mapProgress(p: Progress): number {
  const all = Object.values(p.mastery);
  if (!all.length) return 0;
  return Math.round((all.reduce((s, m) => s + m.lv, 0) / all.length) * 10) / 10;
}
