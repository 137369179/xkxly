import { useState, lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/ui/Card';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { useStore, useStreak } from '@/store/useStore';
import { useTrainingTarget } from '@/hooks/useTrainingTarget';
import { TrainingBanner } from '@/components/study/TrainingBanner';
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
type IslandTone = 'yellow' | 'orange' | 'pink' | 'purple';

/** 单个玩法（一个懒加载子组件 = 一个玩法） */
interface Activity {
  id: string;
  label: string;
  emoji: string;
}

/**
 * 群岛分区：一级分组 + 卡内网格，**不再有二级 Tab**。
 * featured = 该分区最推荐的 ≤4 个玩法，直接以大按钮铺在卡面；
 * more = 同类其余玩法，收进「更多玩法」折叠区（默认收起，但始终挂载以便深链直达）。
 */
interface Island {
  id: MathCategory;
  label: string;
  emoji: string;
  desc: string;
  tone: IslandTone;
  featured: Activity[];
  more: Activity[];
}

const ISLANDS: Island[] = [
  {
    id: 'sensory',
    label: '数感启蒙',
    emoji: '🔢',
    desc: '先认数字、再数一数、动手描一描',
    tone: 'yellow',
    featured: [
      { id: 'wall', label: '数字墙', emoji: '💯' },
      { id: 'count', label: '数数乐', emoji: '🍎' },
      { id: 'trace', label: '数字描红', emoji: '✍️' },
      { id: 'tenframe', label: '十格阵', emoji: '🥕' },
    ],
    more: [
      { id: 'balance', label: '十格天平', emoji: '⚖️' },
      { id: 'skip', label: '跳数规律', emoji: '🐇' },
    ],
  },
  {
    id: 'arithmetic',
    label: '算术工坊',
    emoji: '➕',
    desc: '加减法打底，闯关和竖式一步步来',
    tone: 'orange',
    featured: [
      { id: 'math', label: '加减法', emoji: '➕' },
      { id: 'challenge', label: '加减闯关', emoji: '🎲' },
      { id: 'vertical', label: '竖式进位', emoji: '📝' },
      { id: 'ladder', label: '算术梯', emoji: '🪜' },
    ],
    more: [
      { id: 'extra', label: '乘除进阶', emoji: '✖️' },
      { id: 'run', label: '玉兔快跑', emoji: '🐇' },
    ],
  },
  {
    id: 'practice',
    label: '口算应用',
    emoji: '⚡',
    desc: '练速度，也练把题目读懂',
    tone: 'pink',
    featured: [
      { id: 'speed', label: '极速口算', emoji: '⚡' },
      { id: 'word', label: '图文应用题', emoji: '📖' },
    ],
    more: [],
  },
  {
    id: 'geometry',
    label: '几何度量',
    emoji: '📐',
    desc: '形状、时钟、分数和钱币，生活里都用得上',
    tone: 'purple',
    featured: [
      { id: 'shape', label: '形状认知', emoji: '📐' },
      { id: 'clock', label: '认识时钟', emoji: '⏰' },
      { id: 'fraction', label: '披萨分数', emoji: '🍕' },
      { id: 'money', label: '认识钱币', emoji: '💰' },
    ],
    more: [
      { id: 'tangram', label: '七巧板工坊', emoji: '🧩' },
      { id: 'measure', label: '比较测量', emoji: '📏' },
    ],
  },
];

/** 分区全部玩法 id（featured + more），用于进度聚合与推荐查表 */
const ALL_IDS: Record<MathCategory, string[]> = ISLANDS.reduce((acc, isl) => {
  acc[isl.id] = [...isl.featured, ...isl.more].map((a) => a.id);
  return acc;
}, {} as Record<MathCategory, string[]>);

/** 分区 id → 分区定义 */
const ISLAND_BY_ID: Record<MathCategory, Island> = ISLANDS.reduce((acc, isl) => {
  acc[isl.id] = isl;
  return acc;
}, {} as Record<MathCategory, Island>);

/** 玩法 id → 所属分区（用于深链/推荐定位） */
const ISLAND_OF_ACTIVITY: Record<string, MathCategory> = ISLANDS.reduce((acc, isl) => {
  for (const a of [...isl.featured, ...isl.more]) acc[a.id] = isl.id;
  return acc;
}, {} as Record<string, MathCategory>);

const ACTIVITY_LABEL: Record<string, string> = ISLANDS.reduce((acc, isl) => {
  for (const a of [...isl.featured, ...isl.more]) acc[a.id] = a.label;
  return acc;
}, {} as Record<string, string>);

/** 深链 param（子活动 id）→ 分区 + 玩法 */
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

/** 糖果色分区皮肤：deep 承载白字，浅底承载墨字（设计系统 v1） */
const TONE_SKIN: Record<
  IslandTone,
  { shell: string; chip: string; title: string; idle: string; active: string; dashed: string }
> = {
  yellow: {
    shell: 'border-candy-yellow-soft bg-candy-yellow',
    chip: 'bg-candy-yellow-deep text-white',
    title: 'text-candy-yellow-deep',
    idle: 'border-white bg-white text-ink hover:border-candy-yellow-deep',
    active: 'border-candy-yellow-deep bg-candy-yellow-deep text-white',
    dashed: 'border-candy-yellow-deep/50 text-candy-yellow-deep',
  },
  orange: {
    shell: 'border-candy-orange-soft bg-candy-orange',
    chip: 'bg-candy-orange-deep text-white',
    title: 'text-candy-orange-deep',
    idle: 'border-white bg-white text-ink hover:border-candy-orange-deep',
    active: 'border-candy-orange-deep bg-candy-orange-deep text-white',
    dashed: 'border-candy-orange-deep/50 text-candy-orange-deep',
  },
  pink: {
    shell: 'border-candy-pink-soft bg-candy-pink-light',
    chip: 'bg-candy-pink-deep text-white',
    title: 'text-candy-pink-deep',
    idle: 'border-white bg-white text-ink hover:border-candy-pink-deep',
    active: 'border-candy-pink-deep bg-candy-pink-deep text-white',
    dashed: 'border-candy-pink-deep/50 text-candy-pink-deep',
  },
  purple: {
    shell: 'border-candy-purple-soft bg-candy-purple',
    chip: 'bg-candy-purple-deep text-white',
    title: 'text-candy-purple-deep',
    idle: 'border-white bg-white text-ink hover:border-candy-purple-deep',
    active: 'border-candy-purple-deep bg-candy-purple-deep text-white',
    dashed: 'border-candy-purple-deep/50 text-candy-purple-deep',
  },
};

/** 玩法大按钮：min-h 72px，图标 + 中文名，底部细进度条 */
function PlayButton({
  activity,
  catId,
  tone,
  pressed,
  progress,
  onPick,
}: {
  activity: Activity;
  catId: MathCategory;
  tone: IslandTone;
  pressed: boolean;
  progress: number;
  onPick: (cat: MathCategory, sub: string) => void;
}) {
  const skin = TONE_SKIN[tone];
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <button
      type="button"
      data-testid={`sub-${activity.id}`}
      aria-pressed={pressed}
      onClick={() => onPick(catId, activity.id)}
      className={`relative flex min-h-[72px] w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 px-2 py-3 text-center shadow-candy-sm transition-all active:scale-[0.97] ${
        pressed ? skin.active : skin.idle
      }`}
    >
      <span className="text-2xl leading-none">{activity.emoji}</span>
      <span className="text-base font-black leading-tight">{activity.label}</span>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-current/15">
        <span className="block h-full rounded-full bg-current" style={{ width: `${pct}%` }} />
      </span>
      {pressed && (
        <span className="absolute right-1.5 top-1.5 text-sm font-black">●</span>
      )}
    </button>
  );
}

export default function NumbersPage() {
  const { t } = useTranslation();
  const streak = useStreak();
  const [activeCategory, setActiveCategory] = useState<MathCategory>('sensory');
  const [activeSubTab, setActiveSubTab] = useState<string>('wall');
  // 「更多玩法」折叠区开合状态：按分区独立记忆
  const [expanded, setExpanded] = useState<Record<MathCategory, boolean>>({
    sensory: false,
    arithmetic: false,
    practice: false,
    geometry: false,
  });
  const { target, clear } = useTrainingTarget('numbers');

  // 舞台滚动：仅在「跳转式」选择（顶部快跳 / 推荐卡 / 深链）后滚动到舞台，
  // 直接点卡内按钮时舞台就在按钮下方，无需滚动。
  const stageRef = useRef<HTMLDivElement | null>(null);
  const scrollPendingRef = useRef(false);

  // 页面内「猜你接下来想练」个性化推荐（基于 SRS 掌握度）
  const mastery = useStore((s) => s.progress.mastery);
  const mathStars = useStore((s) => s.progress.stars);
  const recommendation = useMemo(() => recommendNumberSkill(mastery), [mastery]);

  // 玩法 → 掌握度进度（0-100）：优先用具体 math:<key> 回写（含子项后缀键），
  // 无独立回写的用分类聚合近似。算法见 src/modules/numbers/mathProgress.ts
  const subProgress = useMemo(() => {
    const map: Record<string, number> = {};
    for (const isl of ISLANDS) {
      const ids = ALL_IDS[isl.id];
      for (const id of ids) map[id] = calcMathSubProgress(mastery, id, ids);
    }
    return map;
  }, [mastery]);

  /** 打开某玩法：定位分区、必要时展开折叠区（深链/推荐可能指向折叠项） */
  const openActivity = (cat: MathCategory, sub: string, scroll: boolean) => {
    const isl = ISLAND_BY_ID[cat];
    if (isl?.more.some((a) => a.id === sub)) {
      setExpanded((prev) => (prev[cat] ? prev : { ...prev, [cat]: true }));
    }
    setActiveCategory(cat);
    setActiveSubTab(sub);
    if (scroll) scrollPendingRef.current = true;
  };

  const handlePickActivity = (cat: MathCategory, sub: string) => {
    sfxTap();
    triggerHaptic(20);
    openActivity(cat, sub, false);
  };

  /** 顶部快跳：切到该分区并直接打开它的第一个推荐玩法 */
  const handleJumpToIsland = (cat: MathCategory) => {
    sfxTap();
    triggerHaptic(20);
    const first = ISLAND_BY_ID[cat].featured[0]!;
    openActivity(cat, first.id, true);
  };

  const toggleMore = (cat: MathCategory) => {
    sfxTap();
    triggerHaptic(20);
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // 深链 param → 打开对应数学子游戏
  useEffect(() => {
    const p = target?.param;
    if (!p) return;
    const mapped = NUMBERS_PARAM_MAP[p];
    if (mapped) openActivity(mapped.cat, mapped.sub, true);
  }, [target]);

  // 跳转后把舞台滚到视野中央（jsdom 无 scrollIntoView，故做可选调用保护）
  useEffect(() => {
    if (!scrollPendingRef.current) return;
    scrollPendingRef.current = false;
    stageRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [activeCategory, activeSubTab]);

  // 全局键盘快捷键响应 (1-4 专区快跳)
  useEffect(() => {
    const cats: MathCategory[] = ['sensory', 'arithmetic', 'practice', 'geometry'];
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const idx = Number(e.key) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx > 3) return;
      e.preventDefault();
      triggerHaptic(20);
      handleJumpToIsland(cats[idx]!);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const recDef = useMemo(() => {
    if (!recommendation) return null;
    const cat = ISLAND_OF_ACTIVITY[recommendation.game];
    if (!cat) return null;
    const isl = ISLAND_BY_ID[cat];
    const def = [...isl.featured, ...isl.more].find((a) => a.id === recommendation.game);
    return def ? { cat, def } : null;
  }, [recommendation]);

  /** 舞台：同一时刻只渲染一个玩法，保证「一屏一事」 */
  const renderStage = () => {
    switch (activeSubTab) {
      case 'wall':
        return <NumberWall />;
      case 'balance':
        return <TenFrameBalance />;
      case 'tenframe':
        return <TenFrameMath />;
      case 'count':
        return <CountingGame />;
      case 'trace':
        return <NumberTrace />;
      case 'skip':
        return <SkipCounting />;

      case 'challenge':
        return <MathChallengeGame />;
      case 'math':
        return <MathQuiz />;
      case 'extra':
        return <MathExtra />;
      case 'vertical':
        return <VerticalMath />;
      case 'ladder':
        return <MathLadder />;
      case 'run':
        return <RabbitRunMath />;

      case 'speed':
        return <SpeedMath />;
      case 'word':
        return <WordProblems />;

      case 'shape':
        return <ShapeLearn />;
      case 'tangram':
        return <TangramBuilder />;
      case 'clock':
        return <ClockTrainer />;
      case 'measure':
        return <MeasureCompare />;
      case 'fraction':
        return <FractionLearn />;
      case 'money':
        return <MoneyLearn />;
      default:
        return null;
    }
  };

  const activeIsland = ISLAND_BY_ID[activeCategory];
  const activeLabel = ACTIVITY_LABEL[activeSubTab] ?? '';

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
        <span className="inline-block rounded-xl border border-candy-yellow-soft bg-candy-yellow px-3 py-1 text-sm font-bold text-candy-yellow-deep">
          ⌨️ 按数字 1-4 直接跳到专区开玩
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-candy-orange px-3 py-1 text-sm font-black text-candy-orange-deep shadow-sm">
          🔥 连续学习 {streak} 天
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-candy-yellow px-3 py-1 text-sm font-black text-candy-yellow-deep shadow-sm">
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
            openActivity(recDef.cat, recDef.def.id, true);
          }}
        />
      )}

      {/* 🧭 专区快跳：一步直达该分区最推荐的玩法 */}
      <nav aria-label="数字王国专区快跳" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ISLANDS.map((isl) => {
          const isAct = isl.id === activeCategory;
          const skin = TONE_SKIN[isl.tone];
          return (
            <button
              key={isl.id}
              type="button"
              data-testid={`cat-${isl.id}`}
              aria-pressed={isAct}
              onClick={() => handleJumpToIsland(isl.id)}
              className={`flex min-h-[72px] flex-col items-center justify-center rounded-2xl border-2 px-2 py-2 text-center transition-all active:scale-[0.97] ${
                isAct ? `${skin.active} shadow-candy` : 'border-candy-yellow-soft bg-white shadow-candy-sm'
              }`}
            >
              <span className="text-2xl leading-none">{isl.emoji}</span>
              <span className={`text-base font-black leading-tight ${isAct ? 'text-white' : 'text-ink'}`}>
                {isl.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 🏝️ 四大群岛分区：一级分组 + 卡内网格，无二级 Tab */}
      {ISLANDS.map((isl) => {
        const skin = TONE_SKIN[isl.tone];
        const isStageHere = isl.id === activeCategory && activeSubTab !== '';
        const open = expanded[isl.id];
        const total = isl.featured.length + isl.more.length;
        return (
          <section
            key={isl.id}
            id={`numbers-island-${isl.id}`}
            aria-label={isl.label}
            className={`rounded-[1.5rem] border-2 p-3 shadow-candy-sm sm:p-4 ${skin.shell}`}
          >
            {/* 分区大标题 */}
            <header className="mb-3 flex items-center gap-3">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl shadow-candy-sm ${skin.chip}`}>
                {isl.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className={`text-xl font-black leading-tight ${skin.title}`}>{isl.label}</h2>
                <p className="text-sm font-semibold text-ink-soft">{isl.desc}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-black ${skin.chip}`}>
                {total} 个玩法
              </span>
            </header>

            {/* 推荐玩法：最推荐的 ≤4 个，直接大按钮铺开 */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {isl.featured.map((a) => (
                <PlayButton
                  key={a.id}
                  activity={a}
                  catId={isl.id}
                  tone={isl.tone}
                  pressed={activeSubTab === a.id}
                  progress={subProgress[a.id] ?? 0}
                  onPick={handlePickActivity}
                />
              ))}
            </div>

            {/* 其余玩法：默认收起，展开后同样是大按钮（保持挂载，便于深链直达） */}
            {isl.more.length > 0 && (
              <div className="mt-2.5">
                <button
                  type="button"
                  data-testid={`more-${isl.id}`}
                  aria-expanded={open}
                  aria-controls={`more-panel-${isl.id}`}
                  onClick={() => toggleMore(isl.id)}
                  className={`flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-white/70 text-base font-black transition-all active:scale-[0.98] ${skin.dashed}`}
                >
                  <span>{open ? '收起更多玩法' : '更多玩法'}</span>
                  <span className="text-sm">({isl.more.length})</span>
                  <span className={`text-sm transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
                </button>
                <div
                  id={`more-panel-${isl.id}`}
                  hidden={!open}
                  className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4"
                >
                  {isl.more.map((a) => (
                    <PlayButton
                      key={a.id}
                      activity={a}
                      catId={isl.id}
                      tone={isl.tone}
                      pressed={activeSubTab === a.id}
                      progress={subProgress[a.id] ?? 0}
                      onPick={handlePickActivity}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 🎮 舞台：当前分区被选中时才在此分区内展开玩法，保证一屏一事 */}
            {isStageHere && (
              <div ref={stageRef} className="mt-3 rounded-[1.5rem] border-2 border-white bg-white/95 p-3 shadow-candy">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-base font-black text-ink">
                    🎮 正在玩：{activeIsland.emoji} {activeLabel}
                  </p>
                  <button
                    type="button"
                    data-testid={`stage-close-${isl.id}`}
                    onClick={() => {
                      sfxTap();
                      setActiveSubTab('');
                    }}
                    className="min-h-[44px] rounded-2xl border-2 border-candy-pink-soft bg-candy-pink-light px-3 text-base font-black text-candy-pink-deep"
                  >
                    收起
                  </button>
                </div>
                <Suspense fallback={<div className="py-16 text-center text-3xl animate-bounce">🔢</div>}>
                  {renderStage()}
                </Suspense>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
