import { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { CandyButton } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';

/* ── 全部子组件懒加载，FunPage chunk 仅含框架 ~5KB ── */
const ParentChildPK = lazy(() => import('./ParentChildPK').then(m => ({ default: m.ParentChildPK })));
const StoryBook = lazy(() => import('@/modules/fun/StoryBook').then(m => ({ default: m.StoryBook })));
const CreativeExpress = lazy(() => import('@/components/CreativeExpress').then(m => ({ default: m.CreativeExpress })));
const ListenTrainer = lazy(() => import('@/components/ListenTrainer').then(m => ({ default: m.ListenTrainer })));
const DualPK = lazy(() => import('@/components/DualPK').then(m => ({ default: m.DualPK })));
const RiddleGame = lazy(() => import('@/components/RiddleGame').then(m => ({ default: m.RiddleGame })));
const Tangram = lazy(() => import('@/components/Tangram').then(m => ({ default: m.Tangram })));
const NurseryPage = lazy(() => import('./NurseryPage').then(m => ({ default: m.default })));
const PoemFill = lazy(() => import('@/modules/poems/PoemFill').then(m => ({ default: m.PoemFill })));
const AllusionBrowser = lazy(() => import('@/modules/poems/AllusionBrowser').then(m => ({ default: m.AllusionBrowser })));
const LineNotes = lazy(() => import('@/modules/poems/LineNotes').then(m => ({ default: m.LineNotes })));
const Karaoke = lazy(() => import('@/modules/songs/Karaoke').then(m => ({ default: m.Karaoke })));
const WhackAMole = lazy(() => import('./WhackAMole').then(m => ({ default: m.WhackAMole })));
const StorySort = lazy(() => import('@/components/StorySort').then(m => ({ default: m.StorySort })));
const ColorExplore = lazy(() => import('@/components/ColorExplore').then(m => ({ default: m.ColorExplore })));
const PositionLearn = lazy(() => import('@/components/PositionLearn').then(m => ({ default: m.PositionLearn })));
const WeatherSeasons = lazy(() => import('@/components/WeatherSeasons').then(m => ({ default: m.WeatherSeasons })));
const MemoryMatch = lazy(() => import('@/components/MemoryMatch').then(m => ({ default: m.MemoryMatch })));
const PairMatch = lazy(() => import('@/components/PairMatch').then(m => ({ default: m.PairMatch })));
const SpotDifference = lazy(() => import('@/components/SpotDifference').then(m => ({ default: m.SpotDifference })));
const TimeSequence = lazy(() => import('@/components/TimeSequence').then(m => ({ default: m.TimeSequence })));
const SortClassify = lazy(() => import('@/components/SortClassify').then(m => ({ default: m.SortClassify })));
const ConnectMaze = lazy(() => import('@/components/ConnectMaze').then(m => ({ default: m.ConnectMaze })));
const MiniSudoku = lazy(() => import('@/components/MiniSudoku').then(m => ({ default: m.MiniSudoku })));
const SymmetryLearn = lazy(() => import('@/components/SymmetryLearn').then(m => ({ default: m.SymmetryLearn })));
const SlidingPuzzle = lazy(() => import('@/components/SlidingPuzzle').then(m => ({ default: m.SlidingPuzzle })));
const VehicleExplore = lazy(() => import('@/components/VehicleExplore').then(m => ({ default: m.VehicleExplore })));
const RhythmRepeat = lazy(() => import('@/components/RhythmRepeat').then(m => ({ default: m.RhythmRepeat })));
const EmotionCards = lazy(() => import('@/components/EmotionCards').then(m => ({ default: m.EmotionCards })));
const ShadowMatch = lazy(() => import('@/components/ShadowMatch').then(m => ({ default: m.ShadowMatch })));
const SudokuEasy = lazy(() => import('@/components/SudokuEasy').then(m => ({ default: m.SudokuEasy })));
const SequenceLogic = lazy(() => import('@/components/SequenceLogic').then(m => ({ default: m.SequenceLogic })));
const AnimalCards = lazy(() => import('@/components/AnimalCards').then(m => ({ default: m.AnimalCards })));
const MirrorDraw = lazy(() => import('@/components/MirrorDraw').then(m => ({ default: m.MirrorDraw })));
const BalanceScale = lazy(() => import('@/components/BalanceScale').then(m => ({ default: m.BalanceScale })));
const CodeMaze = lazy(() => import('@/components/CodeMaze').then(m => ({ default: m.CodeMaze })));
const CalendarLearn = lazy(() => import('@/components/CalendarLearn').then(m => ({ default: m.CalendarLearn })));
const CodeBotPro = lazy(() => import('@/components/CodeBotPro').then(m => ({ default: m.CodeBotPro })));
const JobExplore = lazy(() => import('@/components/JobExplore').then(m => ({ default: m.JobExplore })));

const TABS = [
  { id: 'parentpk', label: '亲子PK', emoji: '⚔️' },
  { id: 'storybook', label: 'AI故事绘本', emoji: '📖' },
  { id: 'creative', label: '创意表达', emoji: '🎨' },
  { id: 'listen', label: '听力训练', emoji: '👂' },
  { id: 'pk', label: '双人对战', emoji: '🏆' },
  { id: 'riddle', label: '谜语猜猜', emoji: '🧩' },
  { id: 'tangram', label: '七巧板', emoji: '📐' },
  { id: 'nursery', label: '儿歌', emoji: '🎵' },
  { id: 'fill', label: '古诗填字', emoji: '🌸' },
  { id: 'allusion', label: '典故', emoji: '📚' },
  { id: 'notes', label: '串讲', emoji: '📖' },
  { id: 'karaoke', label: '跟唱', emoji: '🎤' },
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
  nursery: NurseryPage,
  fill: PoemFill,
  allusion: AllusionBrowser,
  notes: LineNotes,
  karaoke: Karaoke,
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

function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <span className="animate-bounce text-3xl">🌈</span>
    </div>
  );
}

export default function FunPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>('storybook');
  const Component = TAB_MAP[tab]!;
  const { tickTime } = useStore();
  const mountedRef = useRef(false);

  // 页面挂载时记录进入时长
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    tickTime(10);
  }, [tickTime]);

  const handleTabChange = (id: TabId) => {
    setTab(id);
    tickTime(3);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tabItem) => (
          <CandyButton
            key={tabItem.id}
            tone={tab === tabItem.id ? 'purple' : 'blue'}
            variant={tab === tabItem.id ? 'solid' : 'soft'}
            size="sm"
            onClick={() => handleTabChange(tabItem.id)}
          >
            {tabItem.emoji} {t(`fun.tab.${tabItem.id}`)}
          </CandyButton>
        ))}
      </div>
      <Suspense fallback={<Loading />}>
        <Component />
      </Suspense>
    </div>
  );
}
