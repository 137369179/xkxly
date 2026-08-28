import { useState, lazy, Suspense, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui/Card';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { useStore, useStreak } from '@/store/useStore';
import { useTrainingTarget } from '@/hooks/useTrainingTarget';
import { TrainingBanner } from '@/components/study/TrainingBanner';
import { ModuleGameCard } from '@/components/study/ModuleGameCard';
import { recommendNumberSkill } from './recommendNumbers';
import { NumberRecommend } from './NumberRecommend';
import { calcMathSubProgress } from './mathProgress';

// ── 子组件全部懒加载以实现极优的首屏性能 ──
// 备注：NumberRecommend 保持静态导入（随 NumbersPage 主 chunk 一并加载）。
// 它体积极小(~1KB)且无外部依赖，拆成独立懒加载 chunk 在弱网反而多一次请求，
// 收益可忽略，故不进 Suspense 拆分。
const NumberWall = lazy(() => import('./NumberWall').then((m) => ({ default: m.NumberWall })));
const TenFrameMath = lazy(() => import('./TenFrameMath').then((m) => ({ default: m.TenFrameMath })));
const CountingGame = lazy(() => import('./CountingGame').then((m) => ({ default: m.CountingGame })));
const NumberTrace = lazy(() => import('./NumberTrace').then((m) => ({ default: m.NumberTrace })));
const SkipCounting = lazy(() => import('./SkipCounting').then((m) => ({ default: m.SkipCounting })));
const TenFrameBalance = lazy(() => import('./components/TenFrameBalance').then((m) => ({ default: m.TenFrameBalance })));

const MathChallengeGame = lazy(() => import('@/components/numbers/MathChallengeGame').then((m) => ({ default: m.MathChallengeGame })));
const MathQuiz = lazy(() => import('./MathQuiz').then((m) => ({ default: m.MathQuiz })));
const MathExtra = lazy(() => import('./MathExtra').then((m) => ({ default: m.MathExtra })));
const VerticalMath = lazy(() => import('./VerticalMath').then((m) => ({ default: m.VerticalMath })));
const MathLadder = lazy(() => import('./MathLadder').then((m) => ({ default: m.MathLadder })));
const RabbitRunMath = lazy(() => import('./RabbitRunMath').then((m) => ({ default: m.RabbitRunMath })));

const SpeedMath = lazy(() => import('./SpeedMath').then((m) => ({ default: m.SpeedMath })));
const WordProblems = lazy(() => import('./WordProblems').then((m) => ({ default: m.WordProblems })));

const ShapeLearn = lazy(() => import('./ShapeLearn').then((m) => ({ default: m.ShapeLearn })));
const ClockTrainer = lazy(() => import('./ClockTrainer').then((m) => ({ default: m.ClockTrainer })));
const MeasureCompare = lazy(() => import('./MeasureCompare').then((m) => ({ default: m.MeasureCompare })));
const FractionLearn = lazy(() => import('./FractionLearn').then((m) => ({ default: m.FractionLearn })));
const MoneyLearn = lazy(() => import('./MoneyLearn').then((m) => ({ default: m.MoneyLearn })));
const TangramBuilder = lazy(() => import('./components/TangramBuilder').then((m) => ({ default: m.TangramBuilder })));

type MathCategory = 'sensory' | 'arithmetic' | 'practice' | 'geometry';

interface SubTab {
  id: string;
  label: string;
  emoji: string;
}

const CATEGORIES: { id: MathCategory; label: string; emoji: string; desc: string; subTabs: SubTab[] }[] = [
  {
    id: 'sensory',
    label: '数感启蒙',
    emoji: '🔢',
    desc: '认数字 · 十格阵 · 空间天平 · 数数',
    subTabs: [
      { id: 'wall', label: '数字墙', emoji: '💯' },
      { id: 'balance', label: '十格天平', emoji: '⚖️' },
      { id: 'tenframe', label: '十格阵', emoji: '🥕' },
      { id: 'count', label: '数数乐', emoji: '🍎' },
      { id: 'trace', label: '数字描红', emoji: '✍️' },
      { id: 'skip', label: '跳数规律', emoji: '🐇' },
    ],
  },
  {
    id: 'arithmetic',
    label: '算术工坊',
    emoji: '➕',
    desc: '加减乘除 · 竖式进位 · 趣味闯关',
    subTabs: [
      { id: 'math', label: '加减法', emoji: '➕' },
      { id: 'challenge', label: '加减闯关', emoji: '🎲' },
      { id: 'extra', label: '乘除进阶', emoji: '✖️' },
      { id: 'vertical', label: '竖式进位', emoji: '📝' },
      { id: 'ladder', label: '算术梯', emoji: '🪜' },
      { id: 'run', label: '玉兔快跑', emoji: '🐇' },
    ],
  },
  {
    id: 'practice',
    label: '口算应用',
    emoji: '⚡',
    desc: '极速口算挑战 · 图文应用题',
    subTabs: [
      { id: 'speed', label: '极速口算', emoji: '⚡' },
      { id: 'word', label: '图文应用题', emoji: '📖' },
    ],
  },
  {
    id: 'geometry',
    label: '几何度量',
    emoji: '📐',
    desc: '形状 · 时钟 · 测量 · 分数 · 钱币',
    subTabs: [
      { id: 'shape', label: '形状认知', emoji: '📐' },
      { id: 'tangram', label: '七巧板工坊', emoji: '🧩' },
      { id: 'clock', label: '认识时钟', emoji: '⏰' },
      { id: 'measure', label: '比较测量', emoji: '📏' },
      { id: 'fraction', label: '披萨分数', emoji: '🍕' },
      { id: 'money', label: '认识钱币', emoji: '💰' },
    ],
  },
];

/** 深链 param（子活动 id）→ 分类 + 子标签 */
const NUMBERS_PARAM_MAP: Record<string, { cat: MathCategory; sub: string }> = {
  tenframe: { cat: 'sensory', sub: 'tenframe' },
  count: { cat: 'sensory', sub: 'count' },
  trace: { cat: 'sensory', sub: 'trace' },
  skip: { cat: 'sensory', sub: 'skip' },
  ladder: { cat: 'arithmetic', sub: 'ladder' },
  rabbit: { cat: 'arithmetic', sub: 'run' },
  word: { cat: 'practice', sub: 'word' },
  shape: { cat: 'geometry', sub: 'shape' },
  tangram: { cat: 'geometry', sub: 'tangram' },
  time: { cat: 'geometry', sub: 'clock' },
  compare: { cat: 'geometry', sub: 'measure' },
  fraction: { cat: 'geometry', sub: 'fraction' },
  money: { cat: 'geometry', sub: 'money' },
};

export default function NumbersPage() {
  const { t } = useTranslation();
  const streak = useStreak();
  const [activeCategory, setActiveCategory] = useState<MathCategory>('sensory');
  const [activeSubTab, setActiveSubTab] = useState<string>('wall');
  const { target, clear } = useTrainingTarget('numbers');

  // 页面内「猜你接下来想练」个性化推荐（基于 SRS 掌握度）
  const mastery = useStore((s) => s.progress.mastery);
  const mathStars = useStore((s) => s.progress.stars);
  const recommendation = useMemo(() => recommendNumberSkill(mastery), [mastery]);

  // 子功能 → 掌握度进度（0-100）：优先用具体 math:<key> 回写（含子项后缀键），
  // 无独立回写的用分类聚合近似。算法见 src/modules/numbers/mathProgress.ts
  const subProgress = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of CATEGORIES) {
      const ids = c.subTabs.map((s) => s.id);
      for (const s of c.subTabs) map[s.id] = calcMathSubProgress(mastery, s.id, ids);
    }
    return map;
  }, [mastery]);
  const recDef = useMemo(() => {
    if (!recommendation) return null;
    for (const c of CATEGORIES) {
      const def = c.subTabs.find((s) => s.id === recommendation.game);
      if (def) return { cat: c.id, def };
    }
    return null;
  }, [recommendation]);

  // 深链 param → 打开对应数学子游戏
  useEffect(() => {
    const p = target?.param;
    if (!p) return;
    const mapped = NUMBERS_PARAM_MAP[p];
    if (mapped) {
      setActiveCategory(mapped.cat);
      setActiveSubTab(mapped.sub);
    }
  }, [target]);

  // 全局键盘快捷键响应 (1-4 专区切换)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1') {
        e.preventDefault();
        triggerHaptic(20);
        handleSelectCategory('sensory');
      } else if (e.key === '2') {
        e.preventDefault();
        triggerHaptic(20);
        handleSelectCategory('arithmetic');
      } else if (e.key === '3') {
        e.preventDefault();
        triggerHaptic(20);
        handleSelectCategory('practice');
      } else if (e.key === '4') {
        e.preventDefault();
        triggerHaptic(20);
        handleSelectCategory('geometry');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentCategory = CATEGORIES.find((c) => c.id === activeCategory)!;

  const handleSelectCategory = (cat: MathCategory) => {
    sfxTap();
    triggerHaptic(20);
    setActiveCategory(cat);
    const catMeta = CATEGORIES.find((c) => c.id === cat)!;
    setActiveSubTab(catMeta.subTabs[0]!.id);
  };

  const handleSelectSubTab = (subId: string) => {
    sfxTap();
    triggerHaptic(20);
    setActiveSubTab(subId);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        emoji="🔢"
        title={t('numbersPage.title') || '数字王国'}
        subtitle={t('numbersPage.subtitle') || '数感启蒙 · 算术工坊 · 口算应用 · 几何度量'}
        tone="yellow"
      />

      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-amber-900 font-bold bg-amber-50/90 px-3 py-1 rounded-xl border border-amber-200">
          ⌨️ 键盘快捷操作：数字 1-4 切换专区 (数感启蒙/算术工坊/口算应用/几何度量)
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 shadow-sm">
          🔥 连续学习 {streak} 天
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700 shadow-sm">
          ⭐ 星星 {mathStars}
        </span>
      </div>

      <TrainingBanner target={target} onClose={clear} />

      {/* ✨ 页面内智能推荐：静态打包、随用随绘，弱网下无额外请求 */}
      {!target && recDef && recommendation && (
        <NumberRecommend
          emoji={recDef.def.emoji}
          label={recDef.def.label}
          weakness={(mastery[recommendation.skill]?.ng ?? 0) > 0}
          onGo={() => {
            sfxTap();
            triggerHaptic(30);
            setActiveCategory(recDef.cat);
            setActiveSubTab(recDef.def.id);
          }}
        />
      )}

      {/* 👑 一级大分类导航卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {CATEGORIES.map((cat) => {
          const isAct = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              type="button"
              data-testid={`cat-${cat.id}`}
              aria-pressed={isAct}
              onClick={() => handleSelectCategory(cat.id)}
              className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all text-center ${
                isAct
                  ? 'border-candy-yellow-deep bg-gradient-to-b from-yellow-50 to-amber-100/70 shadow-candy-sm scale-[1.02]'
                  : 'border-yellow-200/70 bg-white/90 hover:border-yellow-300 hover:bg-yellow-50/50'
              }`}
            >
              <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{cat.emoji}</span>
              <span className={`text-base font-black ${isAct ? 'text-amber-900' : 'text-ink'}`}>{cat.label}</span>
              <span className="text-xs font-semibold text-ink-soft line-clamp-1 mt-0.5">{cat.desc}</span>
            </button>
          );
        })}
      </div>

      {/* 🏷️ 二级功能：游戏化功能卡网格（每卡独立展示进度/星星，强化进入前目标感） */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {currentCategory.subTabs.map((sub) => {
          const isSubAct = sub.id === activeSubTab;
          return (
            <div
              key={sub.id}
              className={isSubAct ? 'ring-2 ring-amber-400 rounded-3xl' : undefined}
            >
              <ModuleGameCard
                emoji={sub.emoji}
                title={sub.label}
                tone="yellow"
                progress={subProgress[sub.id] ?? 0}
                stars={mathStars}
                pressed={isSubAct}
                testId={`sub-${sub.id}`}
                onEnter={() => handleSelectSubTab(sub.id)}
              />
            </div>
          );
        })}
      </div>

      {/* 🚀 主体内容区域（带友好 Loading） */}
      <Suspense fallback={<div className="py-16 text-center text-3xl animate-bounce">🔢</div>}>
        {activeSubTab === 'wall' && <NumberWall />}
        {activeSubTab === 'balance' && <TenFrameBalance />}
        {activeSubTab === 'tenframe' && <TenFrameMath />}
        {activeSubTab === 'count' && <CountingGame />}
        {activeSubTab === 'trace' && <NumberTrace />}
        {activeSubTab === 'skip' && <SkipCounting />}

        {activeSubTab === 'challenge' && <MathChallengeGame />}
        {activeSubTab === 'math' && <MathQuiz />}
        {activeSubTab === 'extra' && <MathExtra />}
        {activeSubTab === 'vertical' && <VerticalMath />}
        {activeSubTab === 'ladder' && <MathLadder />}
        {activeSubTab === 'run' && <RabbitRunMath />}

        {activeSubTab === 'speed' && <SpeedMath />}
        {activeSubTab === 'word' && <WordProblems />}

        {activeSubTab === 'shape' && <ShapeLearn />}
        {activeSubTab === 'tangram' && <TangramBuilder />}
        {activeSubTab === 'clock' && <ClockTrainer />}
        {activeSubTab === 'measure' && <MeasureCompare />}
        {activeSubTab === 'fraction' && <FractionLearn />}
        {activeSubTab === 'money' && <MoneyLearn />}
      </Suspense>
    </div>
  );
}
