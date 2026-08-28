import { useEffect, useMemo, useState } from 'react';
import { HANZI_LEVELS, getHanziByLevel, searchHanzi, nextHanzi, getHanziByChar } from '@/data/hanziIndex';
import type { HanziEntry, HanziLevel } from '@/data/hanziIndex';
import { PageHeader, Panel } from '@/components/ui/Card';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CandyButton } from '@/components/ui/Button';
import { QuizCard } from '@/components/QuizCard';
import { useMastery, useStore } from '@/store/useStore';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import { TONE_STYLE } from '@/lib/tones';
import type { Question } from '@/types';
import { HanziLearn } from './HanziLearn';
import { HanziWorksheet } from './HanziWorksheet';
import { RadicalBrowser } from './RadicalBrowser';
import { Hanzi500Page } from './Hanzi500Page';
import { HanziDictation } from './HanziDictation';
import { PhoneticFamilies } from './PhoneticFamilies';
import { HanziEvolve } from '@/modules/hanzi/HanziEvolve';
import { WordBuilder } from './WordBuilder';
import { RadicalsMagic } from '@/components/games/RadicalsMagic';
import { makeHanziMixedQuestion } from '@/lib/hanziQuestions';
import { useTranslation } from '@/i18n/useTranslation';
import { HanziStrokeWriter } from '@/modules/hanzi/HanziStrokeWriter';
import { HanziQuizGame } from '@/modules/hanzi/HanziQuizGame';
import { HanziFlashReview } from '@/modules/hanzi/HanziFlashReview';
import { HanziTrailMap } from '@/modules/hanzi/HanziTrailMap';
import { VirtualHanziGrid } from '@/components/games/VirtualHanziGrid';
import { useTrainingTarget } from '@/hooks/useTrainingTarget';
import { TrainingBanner } from '@/components/study/TrainingBanner';
import { useOptimizedHanziQuery, useDebounceSearch } from '@/hooks/useOptimizedHanzi';

type MainZone = 'trail' | 'library' | 'playground' | 'review';
type LibraryTab = 'level1' | 'level2' | 'level3' | 'h500' | 'radical' | 'evolve' | 'family';
type PlaygroundTab = 'builder' | 'quizgame' | 'writer' | 'dictation' | 'magic';
type ReviewTab = 'worksheet' | 'flash';

const MAIN_ZONES: TabItem<MainZone>[] = [
  { id: 'trail', label: '今日闯关', emoji: '🌟' },
  { id: 'library', label: '汉字宝库', emoji: '📚' },
  { id: 'playground', label: '游乐工坊', emoji: '🎪' },
  { id: 'review', label: '字帖复习', emoji: '📜' },
];

const LIBRARY_TABS: TabItem<LibraryTab>[] = [
  { id: 'level1', label: '启蒙', emoji: '🌱' },
  { id: 'level2', label: '常用', emoji: '🌿' },
  { id: 'level3', label: '进阶', emoji: '🌳' },
  { id: 'h500', label: '500字', emoji: '📚' },
  { id: 'radical', label: '部首', emoji: '🔤' },
  { id: 'evolve', label: '字源', emoji: '📜' },
  { id: 'family', label: '字族', emoji: '🧬' },
];

const PLAYGROUND_TABS: TabItem<PlaygroundTab>[] = [
  { id: 'builder', label: '组词造句', emoji: '✏️' },
  { id: 'quizgame', label: '听音识字', emoji: '🎧' },
  { id: 'writer', label: '笔画描红', emoji: '✍️' },
  { id: 'dictation', label: '听写测试', emoji: '📝' },
  { id: 'magic', label: '部首魔法', emoji: '🪄' },
];

const REVIEW_TABS: TabItem<ReviewTab>[] = [
  { id: 'worksheet', label: '字帖打印', emoji: '📄' },
  { id: 'flash', label: '艾宾浩斯闪卡', emoji: '🃏' },
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

/** 生成 3 道随机测试题 */
function buildQuiz(level: number, mastery: Record<string, { lv: number }>): Question[] {
  const pool = getHanziByLevel(level);
  const learned = pool.filter((h) => (mastery[`hanzi:${h.c}`]?.lv ?? 0) >= 1);
  if (learned.length < 3) return [];
  const targets = pickRandom(learned, 3);
  return targets.map((h) => makeHanziMixedQuestion(h, pool));
}

/** 推荐学习卡片 —— 大字号 + 脉冲光圈动画 */
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

/** 小测验弹层 */
function MiniQuiz({ questions, onClose }: { questions: Question[]; onClose: () => void }) {
  const { t } = useTranslation();
  const practice = useStore((s) => s.practice);
  const [idx, setIdx] = useState(0);
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

  const q = questions[idx];
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
            // SRS 回写：题目自带 skill（hanzi:<char>），QuizCard 保证每题只上报一次
            practice(q.skill, correct, correct ? 1 : 0, q.difficulty);
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
  const [zone, setZone] = useState<MainZone>('trail');
  const [libTab, setLibTab] = useState<LibraryTab>('level1');
  const [playTab, setPlayTab] = useState<PlaygroundTab>('builder');
  const [reviewTab, setReviewTab] = useState<ReviewTab>('worksheet');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounceSearch(query, 300);
  const [selected, setSelected] = useState<HanziEntry | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const mastery = useMastery();
  const { target, clear } = useTrainingTarget('hanzi');

  // 深链 stroke:<字> / build:<字> → 解析出目标字，直接下发给对应子组件预选
  const writerTarget = useMemo<HanziEntry | null>(() => {
    const p = target?.param;
    if (p?.startsWith('stroke:')) return getHanziByChar(p.slice('stroke:'.length)) ?? null;
    return null;
  }, [target]);
  const builderTargetChar = useMemo<string | undefined>(() => {
    const p = target?.param;
    if (p?.startsWith('build:')) return p.slice('build:'.length);
    return undefined;
  }, [target]);

  // 深链 param → 专项训练：<char> 进入该字学习；stroke:<char> 笔顺描红；build:<char> 组词
  useEffect(() => {
    const p = target?.param;
    if (!p) return;
    const colon = p.indexOf(':');
    const cmd = colon === -1 ? '' : p.slice(0, colon);
    const char = colon === -1 ? p : p.slice(colon + 1);
    if (cmd === 'stroke') {
      setZone('playground');
      setPlayTab('writer');
    } else if (cmd === 'build') {
      setZone('playground');
      setPlayTab('builder');
    } else {
      const entry = getHanziByChar(char);
      if (entry) setSelected(entry);
    }
  }, [target]);

  const isLevelTab = zone === 'library' && (libTab === 'level1' || libTab === 'level2' || libTab === 'level3');
  const levelNum = libTab === 'level2' ? 2 : libTab === 'level3' ? 3 : 1;
  const levelInfo = HANZI_LEVELS.find((l) => l.id === levelNum)!;
  const tone = zone === 'trail' ? 'orange' : zone === 'playground' ? 'purple' : zone === 'review' ? 'green' : levelInfo.tone;

  const list = useMemo(() => {
    if (!isLevelTab) return [];
    if (debouncedQuery.trim()) return searchHanzi(debouncedQuery.trim());
    return getHanziByLevel(levelNum);
  }, [isLevelTab, levelNum, debouncedQuery]);

  const learnedInLevel = useMemo(() => {
    return getHanziByLevel(levelNum).filter(
      (h) => (mastery[`hanzi:${h.c}`]?.lv ?? 0) >= 1,
    ).length;
  }, [levelNum, mastery]);

  const { learnedMap: cachedLearnedMap } = useOptimizedHanziQuery();

  const totalLearnedCount = useMemo(() => {
    return Object.keys(mastery).filter(
      (k) => k.startsWith('hanzi:') && (mastery[k]?.lv ?? 0) >= 1,
    ).length;
  }, [mastery]);

  const recommended = useMemo(() => nextHanzi(mastery), [mastery]);

  const startMiniQuiz = () => {
    sfxTap();
    triggerHaptic(30);
    const qs = buildQuiz(levelNum, mastery);
    if (qs.length) {
      setQuizQuestions(qs);
      setQuizOpen(true);
    }
  };

  // 全局键盘快捷键响应 (1-4 专区切换，空格开始推荐字)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (selected) return; // 单字学习状态交由 HanziLearn 处理
      if (e.key === '1') {
        e.preventDefault();
        triggerHaptic(20);
        setZone('trail');
      } else if (e.key === '2') {
        e.preventDefault();
        triggerHaptic(20);
        setZone('library');
      } else if (e.key === '3') {
        e.preventDefault();
        triggerHaptic(20);
        setZone('playground');
      } else if (e.key === '4') {
        e.preventDefault();
        triggerHaptic(20);
        setZone('review');
      } else if (e.key === ' ' && zone === 'trail' && recommended) {
        e.preventDefault();
        triggerHaptic(35);
        setSelected(recommended);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zone, recommended, selected]);

  if (selected) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => {
            triggerHaptic(20);
            setSelected(null);
          }}
          className="text-sm font-bold text-ink-soft hover:text-ink flex items-center gap-1"
        >
          ← {t('hanzi.backToWall')}
        </button>
        <HanziLearn hanzi={selected} onDone={() => setSelected(null)} />
      </div>
    );
  }

  const recLevelInfo = recommended ? HANZI_LEVELS.find((l) => l.id === recommended.level)! : null;

  return (
    <div className="space-y-5">
      <PageHeader emoji="🔤" title={t('hanzi.pageTitle')} subtitle={t('hanzi.subtitle')} tone={tone} />

      {/* 快捷操作提示条 */}
      <div className="text-center relative z-10">
        <span className="inline-block text-xs text-orange-900 font-bold bg-orange-50/90 px-3 py-1 rounded-xl border border-orange-200">
          ⌨️ 键盘快捷操作：数字 1-4 切换专区 (今日闯关/宝库/游乐场/字帖) · 空格 开启今日推荐关卡
        </span>
      </div>

      <TrainingBanner target={target} onClose={clear} />

      {/* 核心四大专区导航菜单 */}
      <Tabs
        items={MAIN_ZONES}
        value={zone}
        onChange={(v) => {
          triggerHaptic(20);
          setZone(v);
          setQuery('');
        }}
        tone={tone}
        layoutId="hanzi-main-zones"
      />

      {/* 🌟 1. 今日闯关区 (Daily Trail) */}
      {zone === 'trail' && (
        <div className="space-y-4">
          <Panel className="bg-candy-orange-soft/40">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-ink">🗺️ 今日学习冒险之旅</h3>
                <p className="text-xs font-bold text-ink-soft mt-0.5">循序渐进，每天轻松掌握 3-5 字</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-candy-orange-deep">{totalLearnedCount}</span>
                <span className="text-xs font-bold text-ink-soft block">已累计解锁</span>
              </div>
            </div>
          </Panel>

          {/* 今日推荐学习关卡卡片 */}
          {recommended && recLevelInfo ? (
            <RecommendCard
              hanzi={recommended}
              levelInfo={recLevelInfo}
              onClick={() => {
                triggerHaptic(30);
                setSelected(recommended);
              }}
            />
          ) : (
            <div className="relative w-full overflow-hidden rounded-[1.5rem] bg-candy-yellow-soft p-5 text-center shadow-candy-sm">
              <div className="text-5xl">🎉🏆🎉</div>
              <p className="mt-2 text-lg font-extrabold text-ink">{t('hanzi.allDone')}</p>
              <p className="mt-1 text-sm font-bold text-ink-soft">{t('hanzi.allDoneTip')}</p>
            </div>
          )}

          {/* 闯关解锁地图（对标洪恩：单字解锁路径） */}
          <Panel>
            <HanziTrailMap onSelect={(h) => {
              triggerHaptic(25);
              setSelected(h);
            }} />
          </Panel>

          {/* 学习/听写/组词三步指引 */}
          <Panel>
            <h4 className="text-sm font-extrabold text-ink mb-3">📍 闯关路线图</h4>
            <div className="flex items-center justify-around gap-2 py-2">
              <div
                onClick={() => {
                  if (recommended) {
                    triggerHaptic(25);
                    setSelected(recommended);
                  }
                }}
                className="flex flex-col items-center cursor-pointer group active:scale-95 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-candy-orange-soft border-2 border-candy-orange-deep flex items-center justify-center text-2xl font-black text-candy-orange-deep shadow-candy-sm group-hover:scale-105">
                  {recommended ? recommended.c : '⭐'}
                </div>
                <span className="text-xs font-bold text-ink mt-1">1. 核心字</span>
                <span className="text-xs text-candy-orange-deep font-extrabold">当前关卡</span>
              </div>

              <div className="h-0.5 flex-1 bg-candy-orange-soft" />

              <div
                onClick={() => {
                  triggerHaptic(20);
                  setZone('playground');
                  setPlayTab('dictation');
                }}
                className="flex flex-col items-center cursor-pointer group active:scale-95 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-candy-blue-soft border-2 border-candy-blue-deep flex items-center justify-center text-2xl font-black text-candy-blue-deep shadow-candy-sm group-hover:scale-105">
                  🎧
                </div>
                <span className="text-xs font-bold text-ink mt-1">2. 听写复习</span>
                <span className="text-xs text-ink-soft font-bold">巩固记忆</span>
              </div>

              <div className="h-0.5 flex-1 bg-candy-orange-soft" />

              <div
                onClick={() => {
                  triggerHaptic(20);
                  setZone('playground');
                  setPlayTab('builder');
                }}
                className="flex flex-col items-center cursor-pointer group active:scale-95 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-candy-green-soft border-2 border-candy-green-deep flex items-center justify-center text-2xl font-black text-candy-green-deep shadow-candy-sm group-hover:scale-105">
                  ✏️
                </div>
                <span className="text-xs font-bold text-ink mt-1">3. 组词游戏</span>
                <span className="text-xs text-ink-soft font-bold">学以致用</span>
              </div>
            </div>
          </Panel>

          {/* 挑战小测验快捷按钮 */}
          {totalLearnedCount >= 3 && (
            <CandyButton tone="orange" size="lg" fullWidth onClick={startMiniQuiz}>
              📝 随堂测验挑战（已学 {totalLearnedCount} 字）
            </CandyButton>
          )}
        </div>
      )}

      {/* 📚 2. 汉字宝库区 (Library & Exploration) */}
      {zone === 'library' && (
        <div className="space-y-4">
          <Tabs
            items={LIBRARY_TABS}
            value={libTab}
            onChange={(v) => {
              triggerHaptic(20);
              setLibTab(v);
              setQuery('');
            }}
            tone={tone}
            layoutId="hanzi-library-tabs"
          />

          {isLevelTab && (
            <Panel>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-ink-soft">{levelInfo.emoji} {levelInfo.name} · {levelInfo.desc}</span>
                <span className="text-sm font-bold" style={{ color: (TONE_STYLE[tone] ?? TONE_STYLE.purple).deep }}>{learnedInLevel}/{list.length}</span>
              </div>
              <ProgressBar value={learnedInLevel} max={list.length || 1} color={tone} />
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

          {isLevelTab && list.length > 0 && (
            <VirtualHanziGrid
              data={list}
              learnedMap={Object.fromEntries(
                Object.entries(cachedLearnedMap).map(([k, v]) => [k, (v?.lv ?? 0) >= 1]),
              )}
              onCardClick={(h) => {
                triggerHaptic(25);
                setSelected(h);
              }}
            />
          )}

          {list.length === 0 && isLevelTab && (
            <p className="py-8 text-center text-base font-bold text-ink-soft">{t('hanzi.notFound')}</p>
          )}

          {libTab === 'h500' && <Hanzi500Page />}
          {libTab === 'radical' && <RadicalBrowser />}
          {libTab === 'evolve' && <HanziEvolve />}
          {libTab === 'family' && <PhoneticFamilies onLearn={(h) => {
            triggerHaptic(25);
            setSelected(h);
          }} />}
        </div>
      )}

      {/* 🎪 3. 游乐工坊区 (Playground) */}
      {zone === 'playground' && (
        <div className="space-y-4">
          <Tabs
            items={PLAYGROUND_TABS}
            value={playTab}
            onChange={(v) => {
              triggerHaptic(20);
              setPlayTab(v);
            }}
            tone="purple"
            layoutId="hanzi-playground-tabs"
          />

          {playTab === 'builder' && <WordBuilder initialChar={builderTargetChar} />}
          {playTab === 'quizgame' && (
            <HanziQuizGame
              level={levelNum}
              onSelectWriting={(h) => {
                triggerHaptic(25);
                setSelected(h);
              }}
            />
          )}
          {playTab === 'writer' && (
            <HanziStrokeWriter
              hanzi={writerTarget ?? recommended ?? getHanziByLevel(1)[0]!}
            />
          )}
          {playTab === 'dictation' && <HanziDictation />}
          {playTab === 'magic' && <RadicalsMagic />}
        </div>
      )}

      {/* 📜 4. 字帖复习区 (Review & Worksheets) */}
      {zone === 'review' && (
        <div className="space-y-4">
          <Tabs
            items={REVIEW_TABS}
            value={reviewTab}
            onChange={(v) => {
              triggerHaptic(20);
              setReviewTab(v);
            }}
            tone="green"
            layoutId="hanzi-review-tabs"
          />

          {reviewTab === 'worksheet' && <HanziWorksheet />}
          {reviewTab === 'flash' && <HanziFlashReview />}
        </div>
      )}

      {/* 小测验弹层 */}
      {quizOpen && quizQuestions.length > 0 && (
        <MiniQuiz questions={quizQuestions} onClose={() => setQuizOpen(false)} />
      )}
    </div>
  );
}



