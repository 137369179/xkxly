import { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { CandyButton } from '@/components/ui/Button';
import { useMastery, useDailyLog, useStreak } from '@/store/useStore';
import { navigate, type RouteId } from '@/lib/router';
import { skillLabel } from '@/lib/srs';
import POEMS from '@/data/poems';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 成长树系统
 * 每完成 10 题长一片叶子，每完成 1 课长一朵花，每连续 7 天长一个果实
 * 树的形态随季节变化（春绿/夏蓝/秋金/冬白）
 *
 * 增强：每个已掌握的知识点（mastery lv >= 3）在树上显示为一颗果实，
 * 点击果实可查看知识点名称并跳转复习。
 */

function getSeason(now = Date.now()): 'spring' | 'summer' | 'autumn' | 'winter' {
  const m = new Date(now).getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

const SEASON_STYLE = {
  spring: { bg: 'from-emerald-100 to-green-50', leaf: '🍃', flower: '🌸', fruit: '🍎', label: '春' },
  summer: { bg: 'from-sky-100 to-blue-50', leaf: '🌿', flower: '🌻', fruit: '🍐', label: '夏' },
  autumn: { bg: 'from-amber-100 to-yellow-50', leaf: '🍂', flower: '🌼', fruit: '🍊', label: '秋' },
  winter: { bg: 'from-slate-100 to-gray-50', leaf: '❄️', flower: '🤍', fruit: '🧊', label: '冬' },
};

/** 果实展示上限：超过此数则只取最近 N 个 */
const FRUIT_SHOW_MAX = 50;
const FRUIT_RENDER_MAX = 20;

/** 知识点 skill 前缀 -> 路由 */
function skillRoute(skill: string): { route: RouteId; param?: string } {
  const [key, val = ''] = skill.split(':');
  switch (key) {
    case 'letter':
      return { route: 'letters' };
    case 'number':
    case 'math':
    case 'count':
    case 'speed':
      return { route: 'numbers' };
    case 'poem':
      return { route: 'poems', param: val };
    case 'logic':
    case 'code':
      return { route: 'logic' };
    case 'hanzi':
      return { route: 'hanzi' };
    case 'pinyin':
      return { route: 'pinyin' };
    case 'word':
    case 'phonics':
    case 'sentence':
      return { route: 'words' };
    case 'idiom':
      return { route: 'idioms' };
    case 'listen':
      return { route: 'fun' };
    default:
      return { route: 'today' };
  }
}

const poemTitle = (id: string) => POEMS.find((p) => p.id === id)?.title;

export function GrowthTree() {
  const { t } = useTranslation();
  const mastery = useMastery();
  const dailyLog = useDailyLog();
  const streak = useStreak();
  const season = useMemo(() => getSeason(), []);
  const s = SEASON_STYLE[season] ?? SEASON_STYLE.spring;
  const [picked, setPicked] = useState<string | null>(null);

  // 统计：总题数、完成课数、连续天数
  const totalAnswered = useMemo(() => {
    return Object.values(mastery).reduce((sum, m) => sum + (m?.ok ?? 0) + (m?.ng ?? 0), 0);
  }, [mastery]);

  const lessonsDone = useMemo(() => {
    return Object.values(dailyLog).filter((d) => d?.lesson).length;
  }, [dailyLog]);

  const streakValue = streak ?? 0;

  // 计算成长阶段
  const leaves = Math.floor(totalAnswered / 10);     // 每 10 题一片叶子
  const flowers = lessonsDone;                         // 每完成 1 课一朵花

  // 树等级（1-5）
  const treeLevel = Math.min(5, 1 + Math.floor(totalAnswered / 50));
  const treeEmoji = ['🌱', '🌿', '🌳', '🌴', '🎄'][treeLevel - 1];

  // 已掌握的知识点（lv >= 3）作为果实
  const masteredFruits = useMemo(() => {
    const items = Object.entries(mastery)
      .filter(([, m]) => m && m.lv >= 3)
      .map(([skill, m]) => ({ skill, lastAt: m.last ?? m.lastAt ?? 0 }))
      .sort((a, b) => b.lastAt - a.lastAt);
    // 超过 FRUIT_SHOW_MAX 时只显示最近 FRUIT_RENDER_MAX 个
    if (items.length > FRUIT_SHOW_MAX) return items.slice(0, FRUIT_RENDER_MAX);
    return items;
  }, [mastery]);

  const masteredTotal = useMemo(
    () => Object.values(mastery).filter((m) => m && m.lv >= 3).length,
    [mastery],
  );

  // 生成树上的装饰位置（伪随机但稳定）
  const leafPositions = useMemo(() => {
    const arr: { x: number; y: number; delay: number }[] = [];
    for (let i = 0; i < Math.min(leaves, 20); i++) {
      const seed = i * 137.5;
      arr.push({
        x: 50 + Math.sin(seed) * 35,
        y: 55 + Math.cos(seed * 1.3) * 25,
        delay: i * 0.05,
      });
    }
    return arr;
  }, [leaves]);

  const flowerPositions = useMemo(() => {
    const arr: { x: number; y: number; delay: number }[] = [];
    for (let i = 0; i < Math.min(flowers, 10); i++) {
      const seed = i * 211.3 + 50;
      arr.push({
        x: 50 + Math.sin(seed) * 28,
        y: 50 + Math.cos(seed * 0.7) * 20,
        delay: i * 0.08,
      });
    }
    return arr;
  }, [flowers]);

  // 果实位置（基于已掌握知识点）
  const fruitPositions = useMemo(() => {
    const arr: { x: number; y: number; delay: number }[] = [];
    for (let i = 0; i < masteredFruits.length; i++) {
      const seed = i * 173.2 + 100;
      arr.push({
        x: 50 + Math.sin(seed * 1.7) * 32,
        y: 56 + Math.cos(seed * 2.1) * 22,
        delay: i * 0.06,
      });
    }
    return arr;
  }, [masteredFruits]);

  const handleReview = () => {
    if (!picked) return;
    const { route, param } = skillRoute(picked);
    navigate(route, param);
    setPicked(null);
  };

  const [isWatering, setIsWatering] = useState(false);
  const waterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 卸载时清理浇水定时器
  useEffect(() => () => {
    if (waterTimerRef.current) clearTimeout(waterTimerRef.current);
  }, []);

  const doWater = () => {
    setIsWatering(true);
    if (waterTimerRef.current) clearTimeout(waterTimerRef.current);
    waterTimerRef.current = setTimeout(() => setIsWatering(false), 2000);
  };

  return (
    <Panel className="relative overflow-hidden">
      <PanelTitle
        iconType="heart"
        title={t('growth.knowledgeTree')}
        subtitle={t('growth.fruitOnTree', { count: masteredTotal })}
        right={
          <CandyButton tone="green" size="sm" onClick={doWater} disabled={isWatering}>
            {t('growth.waterTree')}
          </CandyButton>
        }
      />

      {/* 浇水动画 */}
      {isWatering && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 30 }}
          exit={{ opacity: 0 }}
          className="absolute left-1/2 top-10 z-20 -translate-x-1/2 text-5xl pointer-events-none"
        >
          🚿💦✨
        </motion.div>
      )}

      {/* 7日连胜大奖展示 */}
      <div className="mb-4 flex items-center justify-between rounded-2xl border-2 border-pink-200 bg-pink-50/80 p-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <span className="text-xs font-black text-pink-700">{t('growth.sevenDayReward')}</span>
        </div>
        <span className="rounded-full bg-pink-500 px-2.5 py-0.5 text-[11px] font-black text-white">
          {t('growth.streakReward')}
        </span>
      </div>

      {/* 树可视化 */}
      <div className="relative mx-auto" style={{ width: '100%', maxWidth: 280, height: 220 }}>
        {/* 树干 */}
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 text-6xl">{treeEmoji}</div>

        {/* 叶子 */}
        {leafPositions.map((p, i) => (
          <motion.div
            key={`leaf-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: p.delay, type: 'spring' }}
            className="absolute text-lg"
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            {s.leaf}
          </motion.div>
        ))}

        {/* 花朵 */}
        {flowerPositions.map((p, i) => (
          <motion.div
            key={`flower-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: p.delay, type: 'spring' }}
            className="absolute text-xl"
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            {s.flower}
          </motion.div>
        ))}

        {/* 果实 —— 每颗对应一个已掌握的知识点，可点击复习 */}
        {fruitPositions.map((p, i) => {
          const item = masteredFruits[i];
          if (!item) return null;
          return (
            <motion.button
              key={`fruit-${item.skill}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: p.delay, type: 'spring' }}
              whileHover={{ scale: 1.25 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setPicked(item.skill)}
              aria-label={t('growth.reviewThis')}
              className="absolute text-lg leading-none"
              style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {s.fruit}
            </motion.button>
          );
        })}
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/60 p-2">
          <div className="text-2xl font-black text-candy-green-deep">{leaves}</div>
          <div className="text-xs font-bold text-ink-soft">{s.leaf} {t('growth.leaf')}</div>
        </div>
        <div className="rounded-xl bg-white/60 p-2">
          <div className="text-2xl font-black text-candy-pink-deep">{flowers}</div>
          <div className="text-xs font-bold text-ink-soft">{s.flower} {t('growth.flower')}</div>
        </div>
        <div className="rounded-xl bg-white/60 p-2">
          <div className="text-2xl font-black text-candy-orange-deep">{masteredTotal}</div>
          <div className="text-xs font-bold text-ink-soft">{s.fruit} {t('growth.fruit')}</div>
        </div>
      </div>

      {/* 下一个里程碑 */}
      <div className="mt-2 space-y-1">
        <div>
          <div className="flex justify-between text-xs font-bold text-ink-soft">
            <span>{t('growth.nextLeaf')}</span>
            <span>{totalAnswered % 10}/10 {t('growth.questions')}</span>
          </div>
          <ProgressBar value={totalAnswered % 10} max={10} tone="green" height={8} />
        </div>
        <div>
          <div className="flex justify-between text-xs font-bold text-ink-soft">
            <span>{t('growth.nextFruit')}</span>
            <span>{streakValue % 7}/7 {t('growth.days')}</span>
          </div>
          <ProgressBar value={streakValue % 7} max={7} tone="orange" height={8} />
        </div>
      </div>

      {/* 果实复习弹窗 */}
      <Modal open={!!picked} onClose={() => setPicked(null)} className="max-w-sm text-center">
        <div className="text-6xl">{s.fruit}</div>
        <h3 className="mt-3 text-2xl font-extrabold text-rainbow">
          {picked ? skillLabel(picked, poemTitle) : ''}
        </h3>
        <p className="mt-2 text-base font-bold text-ink-soft">
          {t('growth.fruitDesc')}
        </p>
        <div className="mt-6 flex gap-3">
          <CandyButton tone="purple" variant="soft" size="lg" fullWidth onClick={() => setPicked(null)}>
            {t('growth.maybeLater')}
          </CandyButton>
          <CandyButton tone="orange" size="lg" fullWidth onClick={handleReview}>
            {t('growth.practiceAgain')}
          </CandyButton>
        </div>
      </Modal>
    </Panel>
  );
}
