import { useMemo, useState } from 'react';
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
import type { Question } from '@/types';
import { HanziLearn } from './HanziLearn';
import { HanziWorksheet } from './HanziWorksheet';
import { RadicalBrowser } from './RadicalBrowser';
import { Hanzi500Page } from './Hanzi500Page';
import { HanziDictation } from './HanziDictation';
import { PhoneticFamilies } from './PhoneticFamilies';
import { HanziEvolve } from '@/modules/hanzi/HanziEvolve';
import { WordBuilder } from './WordBuilder';
import { RadicalsMagic } from '@/components/RadicalsMagic';
import { makeHanziMixedQuestion } from '@/lib/hanziQuestions';
import { useTranslation } from '@/i18n/useTranslation';
import { HanziVideoCard } from '@/components/hanzi/HanziVideoCard';
import { HanziStrokeWriter } from '@/components/hanzi/HanziStrokeWriter';
import { HanziQuizGame } from '@/components/hanzi/HanziQuizGame';

type MainZone = 'trail' | 'library' | 'playground';
type LibraryTab = 'level1' | 'level2' | 'level3' | 'h500' | 'radical' | 'evolve' | 'family';
type PlaygroundTab = 'quizgame' | 'writer' | 'dictation' | 'builder' | 'magic' | 'worksheet';

const MAIN_ZONES: TabItem<MainZone>[] = [
  { id: 'trail', label: '今日闯关', emoji: '🌟' },
  { id: 'library', label: '汉字宝库', emoji: '📚' },
  { id: 'playground', label: '复习游乐场', emoji: '🎪' },
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
  { id: 'quizgame', label: '听音识字', emoji: '🎧' },
  { id: 'writer', label: '笔画描红', emoji: '✍️' },
  { id: 'dictation', label: '听写测试', emoji: '📝' },
  { id: 'builder', label: '组词造句', emoji: '✏️' },
  { id: 'magic', label: '部首魔法', emoji: '🪄' },
  { id: 'worksheet', label: '字帖打印', emoji: '📄' },
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
  const [playTab, setPlayTab] = useState<PlaygroundTab>('dictation');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<HanziEntry | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const progress = useProgress();

  const isLevelTab = zone === 'library' && (libTab === 'level1' || libTab === 'level2' || libTab === 'level3');
  const levelNum = libTab === 'level2' ? 2 : libTab === 'level3' ? 3 : 1;
  const levelInfo = HANZI_LEVELS.find((l) => l.id === levelNum)!;
  const tone = zone === 'trail' ? 'orange' : zone === 'playground' ? 'purple' : levelInfo.tone;

  const list = useMemo(() => {
    if (!isLevelTab) return [];
    if (query.trim()) return searchHanzi(query.trim());
    return getHanziByLevel(levelNum);
  }, [isLevelTab, levelNum, query]);

  const learnedInLevel = useMemo(() => {
    return getHanziByLevel(levelNum).filter(
      (h) => (progress.mastery[`hanzi:${h.c}`]?.lv ?? 0) >= 1,
    ).length;
  }, [levelNum, progress.mastery]);

  const totalLearnedCount = useMemo(() => {
    return Object.keys(progress.mastery).filter(
      (k) => k.startsWith('hanzi:') && (progress.mastery[k]?.lv ?? 0) >= 1,
    ).length;
  }, [progress.mastery]);

  const recommended = useMemo(() => nextHanzi(progress.mastery), [progress.mastery]);

  const startMiniQuiz = () => {
    sfxTap();
    const qs = buildQuiz(levelNum, progress.mastery);
    if (qs.length) {
      setQuizQuestions(qs);
      setQuizOpen(true);
    }
  };

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

  const recLevelInfo = recommended ? HANZI_LEVELS.find((l) => l.id === recommended.level)! : null;

  return (
    <div className="space-y-5">
      <PageHeader emoji="🔤" title={t('hanzi.pageTitle')} subtitle={t('hanzi.subtitle')} tone={tone} />

      {/* 核心三区降维导向菜单 */}
      <Tabs
        items={MAIN_ZONES}
        value={zone}
        onChange={(v) => { setZone(v); setQuery(''); }}
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
              onClick={() => setSelected(recommended)}
            />
          ) : (
            <div className="relative w-full overflow-hidden rounded-[1.5rem] bg-candy-yellow-soft p-5 text-center shadow-candy-sm">
              <div className="text-5xl">🎉🏆🎉</div>
              <p className="mt-2 text-lg font-extrabold text-ink">{t('hanzi.allDone')}</p>
              <p className="mt-1 text-sm font-bold text-ink-soft">{t('hanzi.allDoneTip')}</p>
            </div>
          )}

          {/* 关卡线路图节点展示 (Adventure Trail Map) */}
          <Panel>
            <h4 className="text-sm font-extrabold text-ink mb-3">📍 闯关路线图</h4>
            <div className="flex items-center justify-around gap-2 py-2">
              <div
                onClick={() => recommended && setSelected(recommended)}
                className="flex flex-col items-center cursor-pointer group active:scale-95 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-candy-orange-soft border-2 border-candy-orange-deep flex items-center justify-center text-2xl font-black text-candy-orange-deep shadow-candy-sm group-hover:scale-105">
                  {recommended ? recommended.c : '⭐'}
                </div>
                <span className="text-xs font-bold text-ink mt-1">1. 核心字</span>
                <span className="text-[10px] text-candy-orange-deep font-extrabold">当前关卡</span>
              </div>

              <div className="h-0.5 flex-1 bg-candy-orange-soft" />

              <div
                onClick={() => { setZone('playground'); setPlayTab('dictation'); }}
                className="flex flex-col items-center cursor-pointer group active:scale-95 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-candy-blue-soft border-2 border-candy-blue-deep flex items-center justify-center text-2xl font-black text-candy-blue-deep shadow-candy-sm group-hover:scale-105">
                  🎧
                </div>
                <span className="text-xs font-bold text-ink mt-1">2. 听写复习</span>
                <span className="text-[10px] text-ink-soft font-bold">巩固记忆</span>
              </div>

              <div className="h-0.5 flex-1 bg-candy-orange-soft" />

              <div
                onClick={() => { setZone('playground'); setPlayTab('builder'); }}
                className="flex flex-col items-center cursor-pointer group active:scale-95 transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-candy-green-soft border-2 border-candy-green-deep flex items-center justify-center text-2xl font-black text-candy-green-deep shadow-candy-sm group-hover:scale-105">
                  ✏️
                </div>
                <span className="text-xs font-bold text-ink mt-1">3. 组词游戏</span>
                <span className="text-[10px] text-ink-soft font-bold">学以致用</span>
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
            onChange={(v) => { setLibTab(v); setQuery(''); }}
            tone={tone}
            layoutId="hanzi-library-tabs"
          />

          {isLevelTab && (
            <Panel>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-ink-soft">{levelInfo.emoji} {levelInfo.name} · {levelInfo.desc}</span>
                <span className="text-sm font-bold" style={{ color: TONE_STYLE[tone]!.deep }}>{learnedInLevel}/{list.length}</span>
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

          {isLevelTab && (
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
              {list.map((h) => (
                <HanziVideoCard
                  key={h.c}
                  char={h.c}
                  pinyin={h.pd}
                  tone={h.tone}
                  learned={(progress.mastery[`hanzi:${h.c}`]?.lv ?? 0) >= 1}
                  onClick={() => setSelected(h)}
                />
              ))}
            </div>
          )}

          {list.length === 0 && isLevelTab && (
            <p className="py-8 text-center text-base font-bold text-ink-soft">{t('hanzi.notFound')}</p>
          )}

          {libTab === 'h500' && <Hanzi500Page />}
          {libTab === 'radical' && <RadicalBrowser />}
          {libTab === 'evolve' && <HanziEvolve />}
          {libTab === 'family' && <PhoneticFamilies onLearn={setSelected} />}
        </div>
      )}

      {/* 🎪 3. 复习游乐场区 (Playground & Review) */}
      {zone === 'playground' && (
        <div className="space-y-4">
          <Tabs
            items={PLAYGROUND_TABS}
            value={playTab}
            onChange={setPlayTab}
            tone="purple"
            layoutId="hanzi-playground-tabs"
          />

          {playTab === 'quizgame' && (
            <HanziQuizGame
              level={levelNum}
              onSelectWriting={(h) => setSelected(h)}
            />
          )}
          {playTab === 'writer' && (
            <HanziStrokeWriter
              hanzi={recommended || getHanziByLevel(1)[0]!}
            />
          )}
          {playTab === 'dictation' && <HanziDictation />}
          {playTab === 'builder' && <WordBuilder />}
          {playTab === 'magic' && <RadicalsMagic />}
          {playTab === 'worksheet' && <HanziWorksheet />}
        </div>
      )}

      {/* 小测验弹层 */}
      {quizOpen && quizQuestions.length > 0 && (
        <MiniQuiz questions={quizQuestions} onClose={() => setQuizOpen(false)} />
      )}
    </div>
  );
}


