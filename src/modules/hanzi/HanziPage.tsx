import { memo, useMemo, useState } from 'react';
import { HANZI_LEVELS, getHanziByLevel, searchHanzi, nextHanzi } from '@/data/hanziIndex';
import type { HanziEntry, HanziLevel } from '@/data/hanziIndex';
import { PageHeader, Panel } from '@/components/ui/Card';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CandyButton } from '@/components/ui/Button';
import { QuizCard } from '@/components/QuizCard';
import { useProgress } from '@/store/useStore';
import { sfxTap } from '@/lib/sfx';
import { TONE_STYLE } from '@/lib/tones';
import { cn } from '@/lib/utils';
import type { Question } from '@/types';
import { HanziLearn } from './HanziLearn';
import { HanziWorksheet } from './HanziWorksheet';
import { RadicalBrowser } from './RadicalBrowser';
import { Hanzi500Page } from './Hanzi500Page';
import { HanziDictation } from './HanziDictation';
import { PhoneticFamilies } from './PhoneticFamilies';
import { HanziEvolve } from '@/components/HanziEvolve';
import { WordBuilder } from './WordBuilder';
import { RadicalsMagic } from '@/components/RadicalsMagic';
import { makeHanziMixedQuestion } from '@/lib/hanziQuestions';
import { useTranslation } from '@/i18n/useTranslation';

type Tab = 'level1' | 'level2' | 'level3' | 'worksheet' | 'radical' | 'h500' | 'evolve' | 'builder' | 'magic' | 'dictation' | 'family';

const TABS: TabItem<Tab>[] = [
  { id: 'level1', label: '启蒙', emoji: '🌱' },
  { id: 'level2', label: '常用', emoji: '🌿' },
  { id: 'level3', label: '进阶', emoji: '🌳' },
  { id: 'dictation', label: '听写', emoji: '🎧' },
  { id: 'family', label: '字族', emoji: '🧬' },
  { id: 'worksheet', label: '字帖', emoji: '✍️' },
  { id: 'radical', label: '部首', emoji: '🔤' },
  { id: 'magic', label: '部首魔法', emoji: '🪄' },
  { id: 'h500', label: '字库', emoji: '📚' },
  { id: 'evolve', label: '演变', emoji: '📜' },
  { id: 'builder', label: '组词', emoji: '✏️' },
];

/** 从数组中随机取 n 个 */
function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const v = copy.splice(Math.floor(Math.random() * copy.length), 1)[0];
    if (v !== undefined) out.push(v);
  }
  return out;
}

/** 生成 3 道随机测试题（从当前阶段已学汉字中抽题，混合题型：认读/拼读/组词/听音/部首/形近字） */
function buildQuiz(level: number, mastery: Record<string, { lv: number }>): Question[] {
  const pool = getHanziByLevel(level);
  const learned = pool.filter((h) => (mastery[`hanzi:${h.c}`]?.lv ?? 0) >= 1);
  if (learned.length < 3) return [];
  const targets = pickRandom(learned, 3);
  return targets.map((h) => makeHanziMixedQuestion(h, pool));
}

/** 单个汉字按钮 —— memo 化，只有 learned 状态变化时才重渲染 */
const HanziCell = memo(function HanziCell({
  hanzi,
  learned,
  toneStyle,
  onClick,
}: {
  hanzi: HanziEntry;
  learned: boolean;
  toneStyle: { soft: string; deep: string };
  onClick: (h: HanziEntry) => void;
}) {
  return (
    <button
      key={hanzi.c}
      onClick={() => { sfxTap(); onClick(hanzi); }}
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl p-3 transition-all active:translate-y-[2px]',
        'min-h-[68px] shadow-candy-sm',
      )}
      style={{
        background: learned ? toneStyle.soft : 'rgba(255,255,255,0.7)',
        opacity: learned ? 1 : 0.85,
      }}
    >
      <span className="text-3xl font-black text-ink">{hanzi.c}</span>
      <span className="text-[10px] font-bold" style={{ color: toneStyle.deep }}>{hanzi.pd}</span>
      {learned && <span className="text-xs">✓</span>}
    </button>
  );
});

/** 推荐学习卡片 —— 大字号 + 脉冲光圈动画，点击直接进入 HanziLearn */
function RecommendCard({
  hanzi,
  levelInfo,
  onClick,
}: {
  hanzi: HanziEntry;
  levelInfo: HanziLevel;
  onClick: () => void;
}) {
  const toneStyle = TONE_STYLE[levelInfo.tone]!;
  const { t } = useTranslation();
  return (
    <button
      onClick={() => { sfxTap(); onClick(); }}
      className="relative w-full overflow-hidden rounded-[1.5rem] p-5 text-left shadow-candy-sm active:translate-y-[2px]"
      style={{ background: toneStyle.soft }}
    >
      {/* 脉冲光圈动画 */}
      <span
        className="pointer-events-none absolute right-8 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full animate-ping"
        style={{ background: toneStyle.main + '33' }}
      />
      <span
        className="pointer-events-none absolute right-12 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full animate-pulse"
        style={{ background: toneStyle.main + '22' }}
      />
      {/* 今日推荐标签 */}
      <span
        className="inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-extrabold"
        style={{ color: toneStyle.deep }}
      >
        ✨ {t('hanzi.recommend', { emoji: levelInfo.emoji, name: levelInfo.name })}
      </span>
      {/* 汉字 + 拼音 */}
      <div className="relative mt-2 flex items-center gap-4">
        <span className="text-7xl font-black text-ink animate-bounce-soft" style={{ lineHeight: 1 }}>
          {hanzi.c}
        </span>
        <div>
          <div className="text-2xl font-extrabold" style={{ color: toneStyle.deep }}>{hanzi.pd}</div>
          <div className="text-sm font-bold text-ink-soft">{t('hanzi.radicalStrokes', { radical: hanzi.radical, strokes: hanzi.strokes })}</div>
        </div>
        <span
          className="ml-auto self-center rounded-full bg-white/80 px-4 py-2 text-sm font-extrabold"
          style={{ color: toneStyle.deep }}
        >
          {t('hanzi.goLearn')}
        </span>
      </div>
    </button>
  );
}

/** 小测验弹层 —— 3 道题，全对解锁下一批，否则提示再练练 */
function MiniQuiz({ questions, onClose }: { questions: Question[]; onClose: () => void }) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  // 只记录每题第一次作答结果，判断是否一次答对
  const [firstTry, setFirstTry] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);

  const allCorrect = finished && firstTry.length === questions.length && firstTry.every(Boolean);

  if (finished) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 text-center shadow-pop">
          <div className="text-6xl">{allCorrect ? '🎉' : '💪'}</div>
          <p className="mt-3 text-xl font-extrabold text-ink">
            {allCorrect ? t('hanzi.allCorrect') : t('hanzi.keepTrying')}
          </p>
          <p className="mt-1 text-sm font-bold text-ink-soft">
            {allCorrect ? t('hanzi.allCorrectTip') : t('hanzi.keepTryingTip')}
          </p>
          <CandyButton tone="green" size="lg" className="mt-5" fullWidth onClick={onClose}>
            {allCorrect ? t('hanzi.continue') : t('hanzi.goPractice')}
          </CandyButton>
        </div>
      </div>
    );
  }

  const q = questions[idx]!!
  if (!q) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-extrabold text-white drop-shadow">
            {t('hanzi.quizTitle', { current: idx + 1, total: questions.length })}
          </span>
          <button aria-label={t('hanzi.close')}
            onClick={onClose}
            className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-ink-soft"
          >
            ✕ {t('hanzi.close')}
          </button>
        </div>
        <QuizCard
          question={q}
          meta={t('hanzi.qMeta', { current: idx + 1, total: questions.length })}
          nextLabel={idx < questions.length - 1 ? t('hanzi.nextQ') : t('hanzi.result')}
          onAnswer={(correct) => {
            setFirstTry((prev) => {
              if (prev[idx] !== undefined) return prev;
              const next = [...prev];
              next[idx] = correct;
              return next;
            });
          }}
          onNext={() => {
            if (idx < questions.length - 1) {
              setIdx(idx + 1);
            } else {
              setFinished(true);
            }
          }}
        />
      </div>
    </div>
  );
}

export default function HanziPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('level1');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<HanziEntry | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const progress = useProgress();

  // 三个「阶段字墙」Tab 才显示阶段面板/搜索/推荐/字格；其余为独立功能页
  const isLevelTab = tab === 'level1' || tab === 'level2' || tab === 'level3';
  const levelNum = tab === 'level2' ? 2 : tab === 'level3' ? 3 : 1;
  const levelInfo = HANZI_LEVELS.find((l) => l.id === levelNum)!;
  const tone = isLevelTab ? levelInfo.tone : 'green';

  const list = useMemo(() => {
    if (!isLevelTab) return [];
    if (query.trim()) return searchHanzi(query.trim());
    return getHanziByLevel(levelNum);
  }, [isLevelTab, levelNum, query]);

  // 当前阶段已学汉字数（mastery 中 lv>=1）
  const learnedInLevel = useMemo(() => {
    return getHanziByLevel(levelNum).filter(
      (h) => (progress.mastery[`hanzi:${h.c}`]?.lv ?? 0) >= 1,
    ).length;
  }, [levelNum, progress.mastery]);

  // 推荐下一个要学的汉字
  const recommended = useMemo(() => nextHanzi(progress.mastery), [progress.mastery]);

  if (selected) {
    return (
      <div className="space-y-5">
        <button onClick={() => setSelected(null)} className="text-sm font-bold text-ink-soft">
          {t('hanzi.backToWall')}
        </button>
        <HanziLearn hanzi={selected} onDone={() => setSelected(null)} />
      </div>
    );
  }

  const learnedCount = list.filter(
    (h) => (progress.mastery[`hanzi:${h.c}`]?.lv ?? 0) >= 1,
  ).length;

  // 已学字数是 10 的倍数且 >0 时显示小测验入口（仅阶段字墙 Tab）
  const showQuiz = isLevelTab && !query.trim() && learnedInLevel > 0 && learnedInLevel % 10 === 0;

  const recLevelInfo = recommended ? HANZI_LEVELS.find((l) => l.id === recommended.level)! : null;

  return (
    <div className="space-y-5">
      <PageHeader emoji="🔤" title={t('hanzi.pageTitle')} subtitle={t('hanzi.subtitle')} tone={tone} />

      <Tabs items={TABS} value={tab} onChange={(v) => { setTab(v); setQuery(''); }} tone={tone} layoutId="hanzi-tabs" />

      {tab === 'magic' && (
        <RadicalsMagic />
      )}

      {isLevelTab && (
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-ink-soft">{levelInfo.emoji} {levelInfo.name} · {levelInfo.desc}</span>
            <span className="text-sm font-bold" style={{ color: TONE_STYLE[tone]!.deep }}>{learnedCount}/{list.length}</span>
          </div>
          <ProgressBar value={learnedCount} max={list.length || 1} color={tone} />
        </Panel>
      )}


      {isLevelTab && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('hanzi.searchPlaceholder')}
          className="w-full rounded-2xl border-4 border-candy-purple-soft bg-white px-4 py-3 text-base font-bold text-ink outline-none placeholder:text-ink/30"
        />
      )}

      {/* 推荐学习卡片（非搜索时显示） */}
      {isLevelTab && !query.trim() && recommended && recLevelInfo && (
        <RecommendCard
          hanzi={recommended}
          levelInfo={recLevelInfo}
          onClick={() => setSelected(recommended)}
        />
      )}

      {/* 全部学完庆祝卡片 */}
      {isLevelTab && !query.trim() && !recommended && (
        <div className="relative w-full overflow-hidden rounded-[1.5rem] bg-candy-yellow-soft p-5 text-center shadow-candy-sm">
          <div className="text-5xl">🎉🏆🎉</div>
          <p className="mt-2 text-lg font-extrabold text-ink">{t('hanzi.allDone')}</p>
          <p className="mt-1 text-sm font-bold text-ink-soft">{t('hanzi.allDoneTip')}</p>
        </div>
      )}

      {/* 每 10 字小测验入口 */}
      {showQuiz && (
        <CandyButton
          tone="orange"
          size="lg"
          fullWidth
          onClick={() => {
            sfxTap();
            const qs = buildQuiz(levelNum, progress.mastery);
            if (qs.length) {
              setQuizQuestions(qs);
              setQuizOpen(true);
            }
          }}
        >
          📝 {t('hanzi.quizBtn', { count: learnedInLevel })}
        </CandyButton>
      )}

      {isLevelTab && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {list.map((h) => (
            <HanziCell
              key={h.c}
              hanzi={h}
              learned={(progress.mastery[`hanzi:${h.c}`]?.lv ?? 0) >= 1}
              toneStyle={TONE_STYLE[tone]}
              onClick={setSelected}
            />
          ))}
        </div>
      )}

      {list.length === 0 && isLevelTab && (
        <p className="py-8 text-center text-base font-bold text-ink-soft">{t('hanzi.notFound')}</p>
      )}

      {tab === 'worksheet' && <HanziWorksheet />}
      {tab === 'radical' && <RadicalBrowser />}
      {tab === 'h500' && <Hanzi500Page />}
      {tab === 'evolve' && <HanziEvolve />}
      {tab === 'builder' && <WordBuilder />}
      {tab === 'dictation' && <HanziDictation />}
      {tab === 'family' && <PhoneticFamilies onLearn={setSelected} />}

      {/* 小测验弹层 */}
      {quizOpen && quizQuestions.length > 0 && (
        <MiniQuiz questions={quizQuestions} onClose={() => setQuizOpen(false)} />
      )}
    </div>
  );
}
