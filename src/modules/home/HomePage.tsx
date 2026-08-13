import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { NAV_ITEMS, type NavItem } from '@/data/nav';
import { useProgress } from '@/store/useStore';
import { navigate, type RouteId } from '@/lib/router';
import { dateKey } from '@/lib/dailyPlan';
import { TONE_STYLE } from '@/lib/tones';
import { sfxTap } from '@/lib/sfx';
import { useTranslation, translate } from '@/i18n/useTranslation';
import type { Progress } from '@/types';

// 首页极简组件
import HomeHeader from '@/components/home/HomeHeader';
import { HomeHero } from '@/components/home/HomeHero';
import ExploreMore from '@/components/home/ExploreMore';
import { CategorySheet } from '@/components/layout/CategorySheet';
import type { NavCategory } from '@/data/nav';
import { DailyChallenge } from '@/components/DailyChallenge';
import { AiAvatar } from '@/components/ai/AiAvatar';

export default function HomePage() {
  const p = useProgress();
  const { t } = useTranslation();
  const [catOpen, setCatOpen] = useState(false);
  const [catInit] = useState<NavCategory | undefined>(undefined);

  const today = dateKey();
  const done = !!p.dailyLog[today]?.lesson;

  // 推荐模块 id 列表（供 ExploreMore 去重用）
  const recommendIds = useMemo(
    () => pickRecommendations(p, done).map((r) => r.item.id),
    [p, done],
  );

  return (
    <div className="space-y-6">
      {/* 1. 顶部状态与极简关卡卡片 (Top Status & Super Hero) */}
      <HomeHeader />
      <HomeHero />

      {/* 2. 4 大核心学科巨型入口 (4 Clean Core Subject Cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌈</span>
            <h2 className="text-xl font-black text-rainbow">探索学习乐园</h2>
          </div>
          <span className="text-xs font-black text-candy-purple-deep bg-candy-purple-soft px-3 py-1 rounded-full border border-candy-purple/30">
            一键启程
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {[
            { id: 'hanzi', name: '🀄 汉字乐园', desc: '看图识字 · 字源故事 · 组词游戏', tone: 'green' as const, tag: '必学关卡' },
            { id: 'numbers', name: '🔢 数学城堡', desc: '趣味数感 · 10内加减 · 逻辑推理', tone: 'yellow' as const, tag: '思维训练' },
            { id: 'letters', name: '🔤 英语启蒙', desc: '26 字母大冒险 · Phonics 自然拼读', tone: 'pink' as const, tag: '双语启蒙' },
            { id: 'storybook', name: '📚 故事绘本', desc: '经典成语 · 寓言故事 · AI绘本', tone: 'purple' as const, tag: '听故事' },
          ].map((k) => {
            const tk = TONE_STYLE[k.tone]!;
            return (
              <motion.button
                key={k.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  sfxTap();
                  navigate(k.id as RouteId);
                }}
                className="no-select text-left relative overflow-hidden rounded-[2.2rem] border-4 p-6 shadow-fluffy transition-all flex flex-col justify-between min-h-[160px]"
                style={{
                  borderColor: tk.soft,
                  background: `linear-gradient(135deg, ${tk.soft} 0%, #ffffff 80%)`,
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-2xl font-black" style={{ color: tk.deep }}>
                      {k.name}
                    </span>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-white/90 shadow-sm" style={{ color: tk.deep }}>
                      {k.tag}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-ink-soft">{k.desc}</p>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm font-black text-white px-4 py-2 rounded-2xl shadow-candy-sm flex items-center gap-1.5" style={{ background: tk.main }}>
                    🚀 马上开始
                  </span>
                  <span className="text-3xl">✨</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* 3. 小智伙伴与每日挑战 (Companion & Daily Challenge) */}
      <section className="space-y-4">
        <motion.button
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            sfxTap();
            navigate('companion');
          }}
          className="no-select relative w-full overflow-hidden rounded-[2.2rem] border-4 border-white bg-gradient-to-br from-candy-purple-soft to-candy-blue-soft p-5 text-left shadow-fluffy"
        >
          <div className="flex items-center gap-4">
            <AiAvatar size={56} />
            <div className="min-w-0 flex-1">
              <div className="text-base font-extrabold text-candy-purple-deep">🌟 {t('home.companionPark')}</div>
              <p className="mt-0.5 text-xs font-bold text-ink-soft">{t('home.companionParkDesc')}</p>
            </div>
            <span className="text-2xl font-black text-candy-purple-deep">→</span>
          </div>
        </motion.button>

        <DailyChallenge compact />
        <ExploreMore excludeIds={recommendIds} />
      </section>

      {/* 分类浏览浮层 */}
      <CategorySheet open={catOpen} onClose={() => setCatOpen(false)} initialCategory={catInit} />
    </div>
  );
}

/* ========================================================================
 * 智能推荐算法（P3 升级：时段感知 + 兴趣感知 + 薄弱点感知）
 * ===================================================================== */

/** 可参与推荐的模块 id（排除 home/today/parent 等非学习模块） */
const RECOMMENDABLE_IDS: RouteId[] = [
  'letters', 'numbers', 'hanzi', 'pinyin', 'words', 'poems',
  'logic', 'fun', 'idioms', 'adventure',
  'songs', 'science', 'geography', 'music', 'art',
  'story', 'storybook', 'safety', 'vehicles', 'festivals', 'plants',
  'wrongbook', 'gamecenter', 'content',
];

/** 模块 RouteId -> mastery 前缀映射（用于统计兴趣与薄弱点） */
const ROUTE_PREFIX_MAP: Partial<Record<RouteId, string>> = {
  letters: 'letter',
  numbers: 'number',
  hanzi: 'hanzi',
  pinyin: 'pinyin',
  words: 'word',
  poems: 'poem',
  logic: 'logic',
};

/** 时段定义 */
type TimeSlot = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

/** 根据小时数返回当前时段 */
function currentTimeSlot(hour: number): TimeSlot {
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/** 各时段推荐的模块 id 集合 */
const TIME_SLOT_MODULES: Record<TimeSlot, Set<RouteId>> = {
  morning: new Set<RouteId>(['poems', 'letters', 'pinyin', 'hanzi', 'words']),
  noon: new Set<RouteId>(['science', 'geography']),
  afternoon: new Set<RouteId>(['numbers', 'logic']),
  evening: new Set<RouteId>(['songs', 'story', 'fun', 'art', 'music']),
  night: new Set<RouteId>(['story', 'storybook']),
};

/** 时段中文名称（用于推荐理由） */
const TIME_SLOT_LABEL: Record<TimeSlot, string> = {
  morning: '早上',
  noon: '中午',
  afternoon: '下午',
  evening: '晚上',
  night: '夜间',
};

/** 模块中文名（用于推荐理由） */
const MODULE_LABEL: Partial<Record<RouteId, string>> = {
  letters: '字母',
  numbers: '数学',
  hanzi: '汉字',
  pinyin: '拼音',
  words: '英语单词',
  poems: '古诗',
  logic: '逻辑',
  fun: '趣味乐园',
  idioms: '成语',
  adventure: '闯关冒险',
  songs: '儿歌',
  science: '自然百科',
  geography: '世界地理',
  music: '音乐',
  art: '艺术',
  story: '故事',
  storybook: '绘本',
  safety: '安全',
  vehicles: '交通',
  festivals: '节气',
  plants: '植物',
  wrongbook: '错题本',
  gamecenter: '游戏',
  content: 'AI内容',
};

/** 统计某模块下有 lv>0 的 skill 数量（兴趣指标） */
function moduleTouchedCount(p: Progress, routeId: RouteId): number {
  const prefix = ROUTE_PREFIX_MAP[routeId];
  if (!prefix) return 0;
  return Object.entries(p.mastery)
    .filter(([k, m]) => k.startsWith(`${prefix}:`) && (m.lv ?? 0) > 0)
    .length;
}

/** 统计某模块的错误率 ng/(ok+ng)（薄弱点指标） */
function moduleErrorRate(p: Progress, routeId: RouteId): number {
  const prefix = ROUTE_PREFIX_MAP[routeId];
  if (!prefix) return 0;
  const items = Object.entries(p.mastery).filter(([k]) => k.startsWith(`${prefix}:`));
  if (!items.length) return 0;
  let totalOk = 0;
  let totalNg = 0;
  for (const [, m] of items) {
    totalOk += m.ok;
    totalNg += m.ng;
  }
  const total = totalOk + totalNg;
  if (total === 0) return 0;
  return totalNg / total;
}

/** 模块掌握度（保留原逻辑供推荐理由使用） */
function moduleMasteryRate(p: Progress, routeId: RouteId): number {
  const prefix = ROUTE_PREFIX_MAP[routeId];
  if (!prefix) return 0;
  const items = Object.entries(p.mastery).filter(([k]) => k.startsWith(`${prefix}:`));
  if (!items.length) return 0;
  const sum = items.reduce((s, [, m]) => s + (m.lv ?? 0), 0);
  return sum / (items.length * 5);
}

/** 生成推荐理由 */
function reasonFor(
  routeId: RouteId,
  p: Progress,
  done: boolean,
  slot: TimeSlot,
  isTimeMatch: boolean,
  isWeakness: boolean,
  isInterest: boolean,
): string {
  if (routeId === 'today' && !done) return translate('home.todayNotStarted');
  if (routeId === 'today' && done) return translate('home.todayReview');

  const name = MODULE_LABEL[routeId] ?? '学习';
  const reasons: string[] = [];

  // 时段原因
  if (isTimeMatch) {
    reasons.push(`${TIME_SLOT_LABEL[slot]}适合学${name}`);
  }

  // 薄弱点原因
  if (isWeakness) {
    reasons.push(`${name}需要多练习`);
  }

  // 兴趣原因
  if (isInterest) {
    reasons.push(`${name}是宝贝喜欢的`);
  }

  // 如果没有特殊原因，按掌握度给理由
  if (reasons.length === 0) {
    const rate = moduleMasteryRate(p, routeId);
    if (rate === 0) return translate('home.reasonNotStarted', { name });
    if (rate < 0.4) return translate('home.reasonMorePractice', { name });
    if (rate < 0.7) return translate('home.reasonProgress', { name });
    return translate('home.reasonGood', { name });
  }

  return reasons.join('，');
}

/**
 * 智能推荐算法：综合时段感知、兴趣感知、薄弱点感知
 *
 * 评分公式：score = timeBonus * 0.4 + interestScore * 0.3 + weaknessScore * 0.3
 *   - timeBonus: 当前时段匹配的模块得 1.0，不匹配得 0.3
 *   - interestScore: touchedCount 归一化到 0-1
 *   - weaknessScore: 错误率归一化到 0-1（错误率越高分越高，因为需要加强）
 */
function pickRecommendations(p: Progress, done: boolean): { item: NavItem; reason: string }[] {
  const navMap = new Map(NAV_ITEMS.filter((n) => n.id !== 'home').map((n) => [n.id, n]));
  const picks: { item: NavItem; reason: string }[] = [];

  // 今日课程始终置顶
  if (!done) {
    const today = navMap.get('today');
    if (today) picks.push({ item: today, reason: reasonFor('today', p, done, 'morning', false, false, false) });
  }

  // 计算当前时段
  const slot = currentTimeSlot(new Date().getHours());
  const slotModules = TIME_SLOT_MODULES[slot];

  // 收集所有可推荐模块的统计信息
  const stats = RECOMMENDABLE_IDS.map((id) => {
    const touched = moduleTouchedCount(p, id);
    const errorRate = moduleErrorRate(p, id);
    return { id, touched, errorRate };
  });

  // 归一化：找到最大值用于归一化
  const maxTouched = Math.max(1, ...stats.map((s) => s.touched));
  const maxErrorRate = Math.max(0.001, ...stats.map((s) => s.errorRate));

  // 计算综合评分并排序
  const scored = stats
    .map(({ id, touched, errorRate }) => {
      const timeBonus = slotModules.has(id) ? 1.0 : 0.3;
      const interestScore = touched / maxTouched;
      const weaknessScore = errorRate / maxErrorRate;
      const score = timeBonus * 0.4 + interestScore * 0.3 + weaknessScore * 0.3;
      return { id, score, touched, errorRate, isTimeMatch: slotModules.has(id) };
    })
    .sort((a, b) => b.score - a.score);

  // 取 top 4（减去已占据的今日课程位置）
  const targetCount = 4;
  for (const { id, touched, errorRate, isTimeMatch } of scored) {
    if (picks.length >= targetCount) break;
    const item = navMap.get(id);
    if (!item || picks.some((x) => x.item.id === id)) continue;

    // 判断是否为薄弱点（错误率 > 0.3 视为薄弱）
    const isWeakness = errorRate > 0.3;
    // 判断是否为兴趣模块（touched >= maxTouched 的 50%）
    const isInterest = touched > 0 && touched >= maxTouched * 0.5;

    picks.push({
      item,
      reason: reasonFor(id, p, done, slot, isTimeMatch, isWeakness, isInterest),
    });
  }

  // 兜底：如果不足 4 个，从 NAV_ITEMS 补充
  if (picks.length < targetCount) {
    for (const n of NAV_ITEMS) {
      if (picks.length >= targetCount) break;
      if (n.id === 'home' || picks.some((x) => x.item.id === n.id)) continue;
      picks.push({ item: n, reason: n.desc });
    }
  }

  return picks.slice(0, targetCount);
}
