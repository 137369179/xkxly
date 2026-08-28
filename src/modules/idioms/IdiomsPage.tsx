/**
 * 成语故事屋 · 看故事学成语 + 猜成语游戏 + AI 讲故事 + AI 造句
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { AiPanel } from '@/components/ai/AiPanel';
import { useStore } from '@/store/useStore';
import { speak } from '@/lib/speech';
import { sfxTap, sfxWin, sfxStar, triggerHaptic } from '@/lib/sfx';
import { IDIOMS, getIdiomsByLevel, IDIOM_CATEGORIES, type Idiom, type IdiomCategory } from '@/data/idioms';
import { IdiomChain } from './IdiomChain';
import { IdiomMatchGame } from './IdiomMatchGame';
import { IdiomReviewCenter } from './IdiomReviewCenter';
import { useDueIdiomSkills } from './idiomSrs';
import { shuffle } from '@/lib/utils';
import { useAiStream, useAiTask } from '@/lib/ai/useAi';
import { idiomStoryTask, idiomSentenceTask, type IdiomSentenceData } from '@/lib/ai/tasks/idiom';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { useTranslation } from '@/i18n/useTranslation';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/study/AdaptiveDifficultyHint';
import { QuizSessionRunner } from '@/components/quiz/QuizSessionRunner';
import { AllusionBrowser } from '@/modules/poems/AllusionBrowser';
import type { Question } from '@/types';

type Tab = 'library' | 'guess' | 'match' | 'chain' | 'allusion';

/** 主题 → 糖果色（与 TONES 对齐） */
const CAT_TONE: Record<IdiomCategory, Tone> = {
  study: 'purple',
  wisdom: 'blue',
  nature: 'green',
  character: 'pink',
  fable: 'orange',
};

function CategoryBadge({ category }: { category: IdiomCategory }) {
  const t = TONE_STYLE[CAT_TONE[category]];
  const meta = IDIOM_CATEGORIES.find(c => c.id === category);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold"
      style={{ background: t.soft, color: t.deep }}
    >
      <span>{meta?.emoji}</span>
      <span>{categoryLabel(category)}</span>
    </span>
  );
}

/** 主题中文标签（避免在数据/组件里散落文案，集中在此） */
function categoryLabel(category: IdiomCategory): string {
  const labels: Record<IdiomCategory, string> = {
    study: '勤学',
    wisdom: '智慧',
    nature: '自然',
    character: '品格',
    fable: '寓言',
  };
  return labels[category];
}

/**
 * 成语插图（本地资源 + 加载优化）：
 *  - 读本地 public/idioms/<id>.png，不依赖任何外部链接
 *  - 详情大图设置 fetchpriority="high"、列表 keep lazy 并降优先级
 *  - 加载完成前先显示 emoji 兜底，图就绪后淡入，避免白屏
 */
function IdiomArt({ idiom, size }: { idiom: Idiom; size: 'list' | 'detail' }) {
  const [loaded, setLoaded] = useState(!idiom.image);
  const src = idiom.image ?? null;

  useEffect(() => {
    setLoaded(!idiom.image);
  }, [idiom.image]);

  if (!src) {
    return <span className={size === 'detail' ? 'text-6xl' : 'text-4xl'}>{idiom.emoji}</span>;
  }

  return (
    <>
      {!loaded && <span className={size === 'detail' ? 'text-6xl' : 'text-4xl'}>{idiom.emoji}</span>}
      <img
        src={src}
        alt={idiom.word}
        loading={size === 'detail' ? 'eager' : 'lazy'}
        fetchPriority={size === 'detail' ? 'high' : 'low'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  );
}

export default function IdiomsPage() {
  const { t } = useTranslation();
  // 标签的 i18n 必须在组件内随语言刷新（原模块级 translate() 会在首屏固化语言，
  // 切换语言后标签不变）；useMemo 仅在语言变化时重算。
  const TABS: TabItem<Tab>[] = useMemo(() => [
    { id: 'library', label: t('idioms.library'), emoji: '📖' },
    { id: 'match', label: '成语消消乐', emoji: '🎴' },
    { id: 'guess', label: t('idioms.guess'), emoji: '🎯' },
    { id: 'chain', label: t('idioms.chain'), emoji: '🐉' },
    { id: 'allusion', label: t('allusionBrowser.title'), emoji: '📚' },
  ], [t]);
  const [tab, setTab] = useState<Tab>('library');
  const [level, setLevel, levelMeta] = useAdaptiveDifficultyState('idiom');
  const [category, setCategory] = useState<'all' | IdiomCategory>('all');
  const [selected, setSelected] = useState<Idiom | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const learnSkill = useStore(s => s.learnSkill);

  // 猜成语：用统一 QuizSessionRunner 驱动（出题循环/进度/连对/结算由 Runner 托管）
  const [guessStarted, setGuessStarted] = useState(false);

  // 库列表按「难度 + 主题」双维筛选；猜成语池仍只按难度（不随主题筛选变化）
  const levelList = useMemo(() => getIdiomsByLevel(level), [level]);
  const shown = useMemo(
    () => (category === 'all' ? levelList : levelList.filter(i => i.category === category)),
    [levelList, category],
  );
  // SRS 待复习数量（细粒度订阅，仅成语类 mastery 变化时重算）
  const dueCount = useDueIdiomSkills().length;

  /**
   * 猜成语的题库。以前这里直接从全量 IDIOMS 随机抽，等于难度选择器
   * 对游戏毫无作用——启蒙的孩子照样会被抽到最难的成语。
   * 现在跟着自适应难度走，池子太小（凑不出 4 个选项）才退回全量。
   */
  const quizPoolRef = useRef<Idiom[]>(IDIOMS);
  quizPoolRef.current = levelList.length >= 4 ? levelList : IDIOMS;

  /** 由当前难度池构造一道「看释义猜成语」题目（Question 契约对接 QuizCard） */
  const genIdiomQuestion = (): Question | null => {
    const pool = quizPoolRef.current;
    if (!pool.length) return null;
    const chosen = pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
    if (!chosen) return null;
    const samePool = pool.filter(i => i.word !== chosen.word);
    const wrongs = shuffle(
      samePool.length >= 3 ? samePool : IDIOMS.filter(i => i.word !== chosen.word),
    ).slice(0, 3);
    const options = shuffle([chosen, ...wrongs]).map(i => ({ id: i.word, label: i.word }));
    return {
      id: `idiom-${chosen.id}`,
      kind: 'idiom-guess',
      prompt: chosen.meaning,
      display: chosen.emoji,
      options,
      answerId: chosen.word,
      skill: `idiom:${chosen.id}`,
      difficulty: level as 1 | 2 | 3,
    };
  };

  // 全局键盘快捷键响应 (1-5 切换专区，Esc 返回)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (selected) {
        if (e.key === 'Escape') {
          e.preventDefault();
          triggerHaptic(20);
          setSelected(null);
        }
        return;
      }
      if (reviewOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          triggerHaptic(20);
          setReviewOpen(false);
        }
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        triggerHaptic(20);
        setTab('library');
      } else if (e.key === '2') {
        e.preventDefault();
        triggerHaptic(20);
        setTab('guess');
      } else if (e.key === '3') {
        e.preventDefault();
        triggerHaptic(20);
        setTab('match');
      } else if (e.key === '4') {
        e.preventDefault();
        triggerHaptic(20);
        setTab('chain');
      } else if (e.key === '5') {
        e.preventDefault();
        triggerHaptic(20);
        setTab('allusion');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, reviewOpen]);

  const startGuess = () => {
    sfxTap();
    triggerHaptic(30);
    // 开一局是安全边界：把小茜的最新建议应用上来
    levelMeta.syncNow();
    setGuessStarted(true);
  };

  if (tab === 'match') {
    return (
      <div className="space-y-5">
        <PageHeader emoji="🎴" title="成语消消乐" subtitle="点选汉字组合成语，探索成语智慧" tone="pink" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="pink" layoutId="idiom-tabs" />
        <IdiomMatchGame />
      </div>
    );
  }

  if (tab === 'chain') {
    return (
      <div className="space-y-5">
        <PageHeader emoji="🐉" title={t('idioms.chainTitle')} subtitle={t('idioms.chainSubtitle')} tone="purple" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="purple" layoutId="idiom-tabs" />
        <IdiomChain />
      </div>
    );
  }

  if (tab === 'guess') {
    if (!guessStarted) {
      return (
        <div className="space-y-5">
          <PageHeader emoji="🎯" title={t('idioms.guessTitle')} subtitle={t('idioms.guessSubtitle')} tone="orange" />
          <Tabs items={TABS} value={tab} onChange={setTab} tone="orange" layoutId="idiom-tabs" />
          <Panel className="text-center">
            <div className="text-5xl">🎯</div>
            <p className="mt-2 text-sm font-bold text-ink-soft">{t('idioms.guessTip')}</p>
            <div className="mt-4">
              <CandyButton tone="orange" size="lg" fullWidth onClick={startGuess}>
                🚀 {t('idioms.guessStart')}
              </CandyButton>
            </div>
          </Panel>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <PageHeader emoji="🎯" title={t('idioms.guessTitle')} subtitle={t('idioms.guessSubtitle')} tone="orange" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="orange" layoutId="idiom-tabs" />
        <QuizSessionRunner
          genQuestion={genIdiomQuestion}
          count={8}
          title={t('idioms.guessTitle')}
          tone="orange"
          onAnswer={(correct, q) => {
            // 答对即标记该成语为「已掌握」（保留原猜成语的专属行为）
            if (correct) learnSkill(q.skill);
          }}
          onExit={() => setGuessStarted(false)}
        />
      </div>
    );
  }

  // Library tab
  if (tab === 'allusion') {
    return (
      <div className="space-y-5">
        <PageHeader emoji="📚" title={t('allusionBrowser.title')} subtitle={t('allusionBrowser.subtitle')} tone="purple" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="purple" layoutId="idiom-tabs" />
        <AllusionBrowser />
      </div>
    );
  }

  if (selected) {
    return <IdiomDetail idiom={selected} onBack={() => setSelected(null)} onLearn={() => { learnSkill(`idiom:${selected.id}`); sfxWin(); }} />;
  }

  // SRS 复习中心（从成语库页点击「复习」进入，聚焦独立视图）
  if (reviewOpen) {
    return (
      <div className="space-y-5">
        <IdiomReviewCenter onExit={() => setReviewOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader emoji="🏯" title={t('idioms.storyHouse')} subtitle={t('idioms.storyCount', { count: IDIOMS.length })} tone="purple" />
      
      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-purple-900 font-bold bg-purple-50/90 px-3 py-1 rounded-xl border border-purple-200">
          ⌨️ 键盘快捷操作：数字 1-5 切换专区 (故事库/猜成语/消消乐/接龙/典故词林) · Esc 返回
        </span>
      </div>

      <Tabs items={TABS} value={tab} onChange={setTab} tone="purple" layoutId="idiom-tabs" />

      {/* SRS 复习中心入口 */}
      <button
        onClick={() => { sfxTap(); setReviewOpen(true); }}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-purple-200 bg-purple-50 p-3 text-left shadow-candy-sm transition-all active:translate-y-[2px]"
      >
        <span className="text-2xl">🔁</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-ink">{t('idioms.reviewEntry')}</span>
          <span className="block text-xs font-bold text-ink-soft">
            {dueCount > 0 ? t('idioms.reviewEntryDue', { count: dueCount }) : t('idioms.reviewEntryNone')}
          </span>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${dueCount > 0 ? 'bg-purple-600 text-white' : 'bg-white/70 text-ink-soft'}`}>
          {dueCount > 0 ? `${dueCount}` : '✓'}
        </span>
        <span className="shrink-0 text-ink-soft">›</span>
      </button>

      <div className="space-y-2">
        <div className="flex gap-2">
          {([1, 2, 3] as const).map(l => (
            <CandyButton
              key={l}
              tone={level === l ? 'purple' : 'blue'}
              variant={level === l ? 'solid' : 'soft'}
              size="sm"
              onClick={() => { sfxTap(); setLevel(l); }}
            >
              {l === 1 ? t('idioms.level1') : l === 2 ? t('idioms.level2') : t('idioms.level3')}
            </CandyButton>
          ))}
        </div>

        {/* 主题分类 Chip：难度之上再加一层主题筛选 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { sfxTap(); setCategory('all'); }}
            className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition-all active:scale-95 ${
              category === 'all' ? 'bg-purple-600 text-white shadow-md' : 'bg-white/70 text-ink-soft'
            }`}
          >
            🌟 {t('idioms.categoryAll')}
          </button>
          {IDIOM_CATEGORIES.map(c => {
            const color = TONE_STYLE[CAT_TONE[c.id]];
            const active = category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => { sfxTap(); setCategory(c.id); }}
                className="rounded-full px-3 py-1.5 text-xs font-extrabold transition-all active:scale-95"
                style={{
                  background: active ? color.main : color.soft,
                  color: active ? color.on : color.deep,
                  boxShadow: active ? `0 3px 0 0 ${color.deep}55` : 'none',
                }}
              >
                <span>{c.emoji}</span> {categoryLabel(c.id)}
              </button>
            );
          })}
        </div>
        <AdaptiveDifficultyHint
          meta={levelMeta}
          labels={{ 1: t('idioms.level1'), 2: t('idioms.level2'), 3: t('idioms.level3') }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {shown.map(i => (
          <motion.div key={i.id} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <button
              onClick={() => { sfxTap(); setSelected(i); }}
              className="group flex w-full items-center gap-3 rounded-2xl bg-white/70 p-3 text-left shadow-candy-sm transition-all active:translate-y-[2px]"
            >
              {/* 插图（精选）或主题色 emoji 牌（其余） */}
              <div
                className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-white shadow-sm"
                style={{ background: TONE_STYLE[CAT_TONE[i.category]].soft }}
              >
                <IdiomArt idiom={i} size="list" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-black text-ink">{i.word}</span>
                  <CategoryBadge category={i.category} />
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs font-bold text-ink-soft">{i.meaning}</div>
              </div>
              <span className="shrink-0 text-ink-soft">›</span>
            </button>
          </motion.div>
        ))}
        {shown.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm font-bold text-ink-soft">{t('idioms.noInCategory')}</p>
        )}
      </div>
    </div>
  );
}

/* ================================================================
 * 成语详情 · 含 AI 讲故事 + AI 造句
 * ================================================================ */

function IdiomDetail({ idiom, onBack, onLearn }: { idiom: Idiom; onBack: () => void; onLearn: () => void }) {
  const { t } = useTranslation();
  const [aiMode, setAiMode] = useState<'none' | 'story' | 'sentence'>('none');
  const [favoriteSentence, setFavoriteSentence] = useState<string | null>(null);

  // AI 故事讲解（流式）
  const storyState = useAiStream();

  // AI 造句（结构化）
  const sentenceState = useAiTask<IdiomSentenceData>(
    () => idiomSentenceTask(idiom),
    false,
  );

  const handleAiStory = () => {
    sfxTap();
    setAiMode('story');
    setFavoriteSentence(null);
    storyState.run(idiomStoryTask(idiom));
  };

  const handleAiSentence = () => {
    sfxTap();
    setAiMode('sentence');
    setFavoriteSentence(null);
    sentenceState.run();
  };

  const handleFavoriteSentence = (text: string) => {
    sfxStar();
    setFavoriteSentence(text);
  };

  return (
    <div className="space-y-5">
      <button onClick={() => { sfxTap(); onBack(); }} className="text-sm font-bold text-ink-soft">
        ← {t('idioms.backToList')}
      </button>

      <Panel>
        <div className="text-center">
          {/* 精选成语：大图主视觉；其余用主题色 emoji 大牌 */}
          <div
            className={`overflow-hidden rounded-[1.75rem] border-4 border-white shadow-lg ${
              idiom.imagePrompt ? 'h-44 sm:h-56' : 'grid place-items-center py-8'
            }`}
          >
            <IdiomArt idiom={idiom} size="detail" />
          </div>
          <div className="mt-3 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-4xl font-black tracking-wide text-ink">{idiom.word}</h2>
              <CategoryBadge category={idiom.category} />
            </div>
            <p className="text-sm font-bold text-ink-soft">{idiom.pinyin}</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <h3 className="text-sm font-extrabold text-candy-blue-deep">📖 {t('idioms.meaningLabel')}</h3>
            <p className="mt-1 text-sm text-ink">{idiom.meaning}</p>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-candy-green-deep">📚 {t('idioms.storyLabel')}</h3>
            <p className="mt-1 text-sm text-ink">{idiom.story}</p>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-candy-orange-deep">✏️ {t('idioms.exampleLabel')}</h3>
            <p className="mt-1 text-sm text-ink">{idiom.example}</p>
          </div>
        </div>

        {/* 精选成语：讲故事 → 懂道理 的教育启示高亮 */}
        {idiom.lesson && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl p-3 text-center"
            style={{ background: TONE_STYLE.yellow.soft }}
          >
            <p className="text-sm font-extrabold" style={{ color: TONE_STYLE.yellow.deep }}>
              🌟 {t('idioms.lessonLabel')}
            </p>
            <p className="mt-1 text-lg font-extrabold leading-relaxed" style={{ color: '#3B3355' }}>{idiom.lesson}</p>
          </motion.div>
        )}

        {/* 基础操作按钮 */}
        <div className="mt-4 flex flex-wrap gap-2">
          <CandyButton tone="blue" variant="soft" size="sm" onClick={() => speak(idiom.word, { rate: 0.7 })}>
            {t('idioms.read')}
          </CandyButton>
          <CandyButton tone="green" variant="soft" size="sm" onClick={onLearn}>
            {t('idioms.learned')}
          </CandyButton>
          <CandyButton
            tone="purple"
            variant="solid"
            size="sm"
            onClick={handleAiStory}
          >
            🤖 {t('idioms.aiStory')}
          </CandyButton>
          <CandyButton
            tone="orange"
            variant="solid"
            size="sm"
            onClick={handleAiSentence}
          >
            {t('idioms.aiSentence')}
          </CandyButton>
        </div>
      </Panel>

      {/* AI 故事讲解面板 */}
      {aiMode === 'story' && (
        <AiPanel state={storyState} tone="purple" />
      )}

      {/* AI 造句面板 */}
      {aiMode === 'sentence' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.4rem] border-2 p-4 sm:p-5"
          style={{ background: TONE_STYLE.orange.soft, borderColor: `${TONE_STYLE.orange.main}55` }}
        >
          <header className="mb-2 flex items-center gap-2.5">
            <span className="text-2xl">✨</span>
            <span className="text-base font-extrabold sm:text-lg" style={{ color: TONE_STYLE.orange.deep }}>
              ✨ {t('idioms.aiSentenceTitle')}
            </span>
          </header>

          {sentenceState.loading && (
            <div className="flex items-center gap-2 py-4">
              <motion.span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: TONE_STYLE.orange.main }}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span className="text-base text-ink-soft">{t('idioms.aiThinking')}</span>
            </div>
          )}

          {!sentenceState.loading && sentenceState.result && (
            <div className="space-y-3">
              {sentenceState.result.data.sentences.map((s, i) => {
                const isFav = favoriteSentence === s.text;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex items-start gap-2"
                  >
                    <span
                      className="mt-0.5 rounded-lg px-2 py-0.5 text-xs font-bold"
                      style={{ background: TONE_STYLE.orange.soft, color: TONE_STYLE.orange.deep }}
                    >
                      {s.scene}
                    </span>
                    <p className="flex-1 text-base font-medium leading-relaxed" style={{ color: '#3B3355' }}>
                      {s.text}
                    </p>
                    <button
                      onClick={() => handleFavoriteSentence(s.text)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl transition active:translate-y-[2px]"
                      style={{
                        background: isFav ? TONE_STYLE.yellow.main : '#FFFFFF',
                        boxShadow: `0 3px 0 0 ${TONE_STYLE.orange.main}44`,
                      }}
                    >
                      <span className="text-xl">{isFav ? '⭐' : '☆'}</span>
                    </button>
                  </motion.div>
                );
              })}

              {favoriteSentence && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-3 text-center"
                  style={{ background: TONE_STYLE.yellow.soft }}
                >
                  <p className="text-sm font-bold" style={{ color: TONE_STYLE.yellow.deep }}>
                    ⭐ {t('idioms.favSuccess')}
                  </p>
                  <p className="mt-1 text-base font-extrabold" style={{ color: '#3B3355' }}>
                    {favoriteSentence}
                  </p>
                  <div className="mt-2 flex justify-center gap-2">
                    <CandyButton
                      tone="blue"
                      variant="soft"
                      size="sm"
                      onClick={() => speak(favoriteSentence, { rate: 0.8 })}
                    >
                      {t('idioms.read')}
                    </CandyButton>
                  </div>
                </motion.div>
              )}

              {sentenceState.result.fallback && (
                <p className="text-xs text-ink-soft">{t('idioms.aiOffline')}</p>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
