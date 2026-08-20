import { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { CandyButton } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

/* ── 全部子组件懒加载，FunPage chunk 仅含框架 ~5KB ── */
const ParentChildPK = lazy(() => import('./ParentChildPK').then(m => ({ default: m.ParentChildPK })));
const StoryBook = lazy(() => import('@/modules/fun/StoryBook').then(m => ({ default: m.StoryBook })));
const CreativeExpress = lazy(() => import('@/components/games/CreativeExpress').then(m => ({ default: m.CreativeExpress })));
const ListenTrainer = lazy(() => import('@/components/games/ListenTrainer').then(m => ({ default: m.ListenTrainer })));
const DualPK = lazy(() => import('@/components/games/DualPK').then(m => ({ default: m.DualPK })));
const RiddleGame = lazy(() => import('@/components/games/RiddleGame').then(m => ({ default: m.RiddleGame })));
const Tangram = lazy(() => import('@/components/games/Tangram').then(m => ({ default: m.Tangram })));
const WhackAMole = lazy(() => import('./WhackAMole').then(m => ({ default: m.WhackAMole })));
const StorySort = lazy(() => import('@/components/games/StorySort').then(m => ({ default: m.StorySort })));
const ColorExplore = lazy(() => import('@/components/games/ColorExplore').then(m => ({ default: m.ColorExplore })));
const PositionLearn = lazy(() => import('@/components/games/PositionLearn').then(m => ({ default: m.PositionLearn })));
const WeatherSeasons = lazy(() => import('@/components/games/WeatherSeasons').then(m => ({ default: m.WeatherSeasons })));
const MemoryMatch = lazy(() => import('@/components/games/MemoryMatch').then(m => ({ default: m.MemoryMatch })));
const PairMatch = lazy(() => import('@/components/games/PairMatch').then(m => ({ default: m.PairMatch })));
const SpotDifference = lazy(() => import('@/components/games/SpotDifference').then(m => ({ default: m.SpotDifference })));
const TimeSequence = lazy(() => import('@/components/games/TimeSequence').then(m => ({ default: m.TimeSequence })));
const SortClassify = lazy(() => import('@/components/games/SortClassify').then(m => ({ default: m.SortClassify })));
const ConnectMaze = lazy(() => import('@/components/games/ConnectMaze').then(m => ({ default: m.ConnectMaze })));
const MiniSudoku = lazy(() => import('@/components/games/MiniSudoku').then(m => ({ default: m.MiniSudoku })));
const SymmetryLearn = lazy(() => import('@/components/games/SymmetryLearn').then(m => ({ default: m.SymmetryLearn })));
const SlidingPuzzle = lazy(() => import('@/components/games/SlidingPuzzle').then(m => ({ default: m.SlidingPuzzle })));
const VehicleExplore = lazy(() => import('@/components/games/VehicleExplore').then(m => ({ default: m.VehicleExplore })));
const RhythmRepeat = lazy(() => import('@/components/games/RhythmRepeat').then(m => ({ default: m.RhythmRepeat })));
const EmotionCards = lazy(() => import('@/components/games/EmotionCards').then(m => ({ default: m.EmotionCards })));
const ShadowMatch = lazy(() => import('@/components/games/ShadowMatch').then(m => ({ default: m.ShadowMatch })));
const SudokuEasy = lazy(() => import('@/components/games/SudokuEasy').then(m => ({ default: m.SudokuEasy })));
const SequenceLogic = lazy(() => import('@/components/games/SequenceLogic').then(m => ({ default: m.SequenceLogic })));
const AnimalCards = lazy(() => import('@/components/games/AnimalCards').then(m => ({ default: m.AnimalCards })));
const MirrorDraw = lazy(() => import('@/components/games/MirrorDraw').then(m => ({ default: m.MirrorDraw })));
const BalanceScale = lazy(() => import('@/components/games/BalanceScale').then(m => ({ default: m.BalanceScale })));
const CodeMaze = lazy(() => import('@/components/games/CodeMaze').then(m => ({ default: m.CodeMaze })));
const CalendarLearn = lazy(() => import('@/components/CalendarLearn').then(m => ({ default: m.CalendarLearn })));
const CodeBotPro = lazy(() => import('@/components/games/CodeBotPro').then(m => ({ default: m.CodeBotPro })));
const JobExplore = lazy(() => import('@/components/games/JobExplore').then(m => ({ default: m.JobExplore })));

const TABS = [
  { id: 'parentpk', label: '亲子PK', emoji: '⚔️' },
  { id: 'storybook', label: 'AI故事绘本', emoji: '📖' },
  { id: 'creative', label: '创意表达', emoji: '🎨' },
  { id: 'listen', label: '听力训练', emoji: '👂' },
  { id: 'pk', label: '双人对战', emoji: '🏆' },
  { id: 'riddle', label: '谜语猜猜', emoji: '🧩' },
  { id: 'tangram', label: '七巧板', emoji: '📐' },
  { id: 'whack', label: '打地鼠', emoji: '🔨' },
  { id: 'storysort', label: '排序', emoji: '📖' },
  { id: 'color', label: '颜色', emoji: '🌈' },
  { id: 'position', label: '方位', emoji: '🧭' },
  { id: 'weather', label: '天气', emoji: '🌤️' },
  { id: 'memory', label: '翻牌', emoji: '🃏' },
  { id: 'pair', label: '配对', emoji: '🧩' },
  { id: 'spot', label: '找不同', emoji: '🔍' },
  { id: 'time', label: '时间', emoji: '⏰' },
  { id: 'sort', label: '分类', emoji: '🗂️' },
  { id: 'maze2', label: '迷宫', emoji: '🧶' },
  { id: 'sudoku', label: '数独', emoji: '🎯' },
  { id: 'symmetry', label: '对称', emoji: '🦋' },
  { id: 'puzzle', label: '拼图', emoji: '🧩' },
  { id: 'vehicle', label: '交通', emoji: '🚗' },
  { id: 'rhythm', label: '节奏', emoji: '🥁' },
  { id: 'emotion', label: '情绪', emoji: '😊' },
  { id: 'shadow', label: '影子', emoji: '🌟' },
  { id: 'sudoku2', label: '图形数独', emoji: '🎯' },
  { id: 'sequence', label: '序列', emoji: '🔗' },
  { id: 'animal', label: '动物', emoji: '🦁' },
  { id: 'mirror', label: '镜像画', emoji: '🪞' },
  { id: 'balance', label: '天平', emoji: '⚖️' },
  { id: 'codemaze', label: '迷宫编程', emoji: '🧭' },
  { id: 'calendar', label: '日历', emoji: '📅' },
  { id: 'codebot', label: '机器人', emoji: '🤖' },
  { id: 'job', label: '职业', emoji: '👮' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const TAB_MAP: Record<TabId, React.LazyExoticComponent<React.ComponentType>> = {
  parentpk: ParentChildPK,
  storybook: StoryBook,
  creative: CreativeExpress,
  listen: ListenTrainer,
  pk: DualPK,
  riddle: RiddleGame,
  tangram: Tangram,
  whack: WhackAMole,
  storysort: StorySort,
  color: ColorExplore,
  position: PositionLearn,
  weather: WeatherSeasons,
  memory: MemoryMatch,
  pair: PairMatch,
  spot: SpotDifference,
  time: TimeSequence,
  sort: SortClassify,
  maze2: ConnectMaze,
  sudoku: MiniSudoku,
  symmetry: SymmetryLearn,
  puzzle: SlidingPuzzle,
  vehicle: VehicleExplore,
  rhythm: RhythmRepeat,
  emotion: EmotionCards,
  shadow: ShadowMatch,
  sudoku2: SudokuEasy,
  sequence: SequenceLogic,
  animal: AnimalCards,
  mirror: MirrorDraw,
  balance: BalanceScale,
  codemaze: CodeMaze,
  calendar: CalendarLearn,
  codebot: CodeBotPro,
  job: JobExplore,
};

interface GameCategory {
  id: string;
  label: string;
  emoji: string;
  tone: 'purple' | 'blue' | 'green' | 'orange';
  tabs: TabId[];
}

const CATEGORIES: GameCategory[] = [
  {
    id: 'battle',
    label: '对战互动',
    emoji: '⚔️',
    tone: 'purple',
    tabs: ['parentpk', 'pk', 'whack', 'listen', 'creative', 'riddle', 'storybook'],
  },
  {
    id: 'puzzle',
    label: '益智解谜',
    emoji: '🧩',
    tone: 'blue',
    tabs: ['tangram', 'puzzle', 'sudoku', 'sudoku2', 'maze2', 'spot', 'memory', 'pair', 'storysort', 'sort'],
  },
  {
    id: 'cognition',
    label: '生活百科',
    emoji: '🌱',
    tone: 'green',
    tabs: ['animal', 'vehicle', 'job', 'weather', 'calendar', 'time', 'position', 'color', 'emotion', 'shadow', 'symmetry'],
  },
  {
    id: 'logic',
    label: '思维编程',
    emoji: '🤖',
    tone: 'orange',
    tabs: ['codebot', 'codemaze', 'sequence', 'balance', 'mirror', 'rhythm'],
  },
];

function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <span className="animate-bounce text-3xl">🌈</span>
    </div>
  );
}

export default function FunPage() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('battle');
  const [tab, setTab] = useState<TabId>('parentpk');
  const Component = TAB_MAP[tab] ?? TAB_MAP.parentpk;
  const { tickTime } = useStore();
  const mountedRef = useRef(false);

  // 页面挂载时记录进入时长
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    tickTime(10);
  }, [tickTime]);

  const handleCategoryChange = (cat: GameCategory) => {
    setActiveCategory(cat.id);
    const firstTab = cat.tabs[0];
    if (firstTab && !cat.tabs.includes(tab)) {
      setTab(firstTab);
    }
  };

  const handleTabChange = (id: TabId) => {
    setTab(id);
    tickTime(3);
  };

  const currentCategory = CATEGORIES.find((c) => c.id === activeCategory) ?? CATEGORIES[0]!;

  return (
    <div className="space-y-4">
      {/* 一级主题分类栏 */}
      <div className="flex gap-2 rounded-2xl bg-white/80 p-1.5 shadow-sm border border-purple-100">
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat)}
              className={cn(
                'no-select flex-1 rounded-xl py-2 text-center text-xs sm:text-sm font-black transition-all',
                active
                  ? 'bg-candy-purple text-white shadow-sm scale-[1.02]'
                  : 'text-ink-soft hover:text-ink hover:bg-black/5',
              )}
            >
              {cat.emoji} {cat.label}
            </button>
          );
        })}
      </div>

      {/* 二级游戏小标签 */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-purple-50/50 p-2.5 border border-purple-100">
        {currentCategory.tabs.map((tabId) => {
          const tabItem = TABS.find((t) => t.id === tabId);
          if (!tabItem) return null;
          const active = tab === tabId;
          return (
            <CandyButton
              key={tabId}
              tone={active ? currentCategory.tone : 'blue'}
              variant={active ? 'solid' : 'soft'}
              size="sm"
              onClick={() => handleTabChange(tabId)}
            >
              {tabItem.emoji} {t(`fun.tab.${tabId}`) || tabItem.label}
            </CandyButton>
          );
        })}
      </div>

      {/* 游戏主体展示 */}
      <Suspense fallback={<Loading />}>
        <Component />
      </Suspense>
    </div>
  );
}

