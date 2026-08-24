import { useMemo, useEffect, useState } from 'react';
import { lazy, Suspense } from 'react';
import { WORD_THEMES, searchWords, getWordCount, getSightWordsByGrade } from '@/data/wordIndex';
import type { WordEntry } from '@/data/wordIndex';
import { PageHeader, Panel } from '@/components/ui/Card';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CandyButton } from '@/components/ui/Button';
import { useMastery, useStreak } from '@/store/useStore';
import type { Progress } from '@/types';
import { sfxTap } from '@/lib/sfx';
import { speak } from '@/lib/speech';

import { TONE_STYLE } from '@/lib/tones';
import { useTranslation } from '@/i18n/useTranslation';
import { ENGLISH_STAGES, currentStage, stageOverview, type EnglishStage } from '@/lib/englishCurriculum';
import { WordLearn } from './WordLearn';
import { useTrainingTarget } from '@/hooks/useTrainingTarget';
import { TrainingBanner } from '@/components/study/TrainingBanner';

const PhonicsPage = lazy(() => import('./PhonicsPage').then((m) => ({ default: m.PhonicsPage })));
const SpellingTest = lazy(() => import('./SpellingTest').then((m) => ({ default: m.SpellingTest })));
const DialoguePage = lazy(() => import('./DialoguePage').then((m) => ({ default: m.DialoguePage })));
const WordMatch = lazy(() => import('./WordMatch').then((m) => ({ default: m.WordMatch })));
const WordReview = lazy(() => import('./WordReview').then((m) => ({ default: m.WordReview })));
const PhonicsListen = lazy(() => import('./PhonicsListen').then((m) => ({ default: m.PhonicsListen })));
const BodyParts = lazy(() => import('./BodyParts').then((m) => ({ default: m.BodyParts })));
const CvcWordBuilder = lazy(() => import('./CvcWordBuilder').then((m) => ({ default: m.CvcWordBuilder })));
const WordFamilyGame = lazy(() => import('./WordFamilyGame').then((m) => ({ default: m.WordFamilyGame })));
const SentencePage = lazy(() => import('./SentencePage'));

type MainTab = 'course' | 'words' | 'practice' | 'review';
type PracticeTab = 'phonics' | 'sentences' | 'spell' | 'dialogue' | 'match' | 'listen' | 'builder' | 'wordfamily' | 'body';
type GradeFilter = 'all' | 1 | 2 | 3;

/** 练习板块功能清单 */
const PRACTICE_ITEMS: { id: PracticeTab; emoji: string; labelKey: string; descKey: string }[] = [
  { id: 'phonics', emoji: '🔤', labelKey: 'words.tab.phonics', descKey: 'words.practicePhonicsDesc' },
  { id: 'spell', emoji: '✏️', labelKey: 'words.tab.spell', descKey: 'words.practiceSpellDesc' },
  { id: 'dialogue', emoji: '💬', labelKey: 'words.tab.dialogue', descKey: 'words.practiceDialogueDesc' },
  { id: 'sentences', emoji: '🗣️', labelKey: 'words.tab.sentences', descKey: 'words.practiceSentenceDesc' },
  { id: 'match', emoji: '🔗', labelKey: 'words.tab.match', descKey: 'words.practiceMatchDesc' },
  { id: 'listen', emoji: '👂', labelKey: 'words.tab.listen', descKey: 'words.practiceListenDesc' },
  { id: 'builder', emoji: '🧱', labelKey: 'words.tab.builder', descKey: 'words.practiceBuilderDesc' },
  { id: 'wordfamily', emoji: '🔗', labelKey: 'words.tab.wordFamily', descKey: 'words.practiceFamilyDesc' },
  { id: 'body', emoji: '👤', labelKey: 'words.tab.body', descKey: 'words.practiceBodyDesc' },
];

/** 阶段 → 练习入口映射（课程页的「开始学习」跳转） */
const STAGE_ACTIONS: Record<EnglishStage, { main: MainTab; practice?: PracticeTab }> = {
  1: { main: 'words' },
  2: { main: 'practice', practice: 'phonics' },
  3: { main: 'words' },
  4: { main: 'practice', practice: 'sentences' },
  5: { main: 'practice', practice: 'dialogue' },
};

/** 深链 param → 练习板块 tab */
const WORDS_PARAM_MAP: Record<string, PracticeTab> = {
  sentence: 'sentences',
  dialogue: 'dialogue',
  phonics: 'phonics',
  practice: 'phonics',
};

export default function WordsPage() {
  const [mainTab, setMainTab] = useState<MainTab>('course');
  const [practiceTab, setPracticeTab] = useState<PracticeTab>('phonics');
  const [query, setQuery] = useState('');
  const [themeId, setThemeId] = useState('animals');
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all');
  const [selected, setSelected] = useState<WordEntry | null>(null);
  const [sightGrade, setSightGrade] = useState<1 | 2 | 3>(1);
  const mastery = useMastery();
  const streak = useStreak();
  const { t: tr } = useTranslation();
  const { target, clear } = useTrainingTarget('words');

  // 深链 param → 练习板块对应 tab（sentence/dialogue/phonics/practice）
  useEffect(() => {
    const p = target?.param;
    if (!p) return;
    const practice = WORDS_PARAM_MAP[p];
    if (practice) {
      setMainTab('practice');
      setPracticeTab(practice);
    }
  }, [target]);

  const MAIN_TABS: TabItem<MainTab>[] = useMemo(() => [
    { id: 'course', label: tr('words.tab.course'), emoji: '📚' },
    { id: 'words', label: tr('words.tab.words'), emoji: '📖' },
    { id: 'practice', label: tr('words.tab.practice'), emoji: '🎯' },
    { id: 'review', label: tr('words.tab.review'), emoji: '🔁' },
  ], [tr]);

  const theme = WORD_THEMES.find((t) => t.id === themeId) ?? WORD_THEMES[0]!;
  const tone = theme.tone;

  const list = useMemo(() => {
    if (query.trim()) return searchWords(query.trim());
    let words = theme.words;
    if (gradeFilter !== 'all') words = words.filter((w) => (w.grade ?? w.level) === gradeFilter);
    return words;
  }, [theme, query, gradeFilter]);

  /** 课程页：开始某阶段 */
  const goStage = (stage: EnglishStage) => {
    sfxTap();
    const act = STAGE_ACTIONS[stage];
    setMainTab(act.main);
    if (act.practice) setPracticeTab(act.practice);
  };

  /* ============ 课程板块 ============ */
  if (mainTab === 'course') {
    const cur = currentStage({ mastery } as Progress);
    const overview = stageOverview({ mastery } as Progress);
    return (
      <div className="space-y-5">
        <PageHeader iconType="town" title={tr('words.courseTitle')} subtitle={tr('words.courseSubtitle')} tone="purple" />
        <TrainingBanner target={target} onClose={clear} />
        <Tabs items={MAIN_TABS} value={mainTab} onChange={setMainTab} tone="purple" layoutId="words-main-tabs" />

        {/* 当前阶段横幅 */}
        <Panel className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{ENGLISH_STAGES[cur - 1]!.emoji}</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-ink-soft">{tr('words.courseNowOn')}</p>
              <p className="text-lg font-black text-ink">{ENGLISH_STAGES[cur - 1]!.name} · {tr('words.courseStage')} {cur}/5</p>
              <p className="text-sm font-bold text-ink-soft">{ENGLISH_STAGES[cur - 1]!.desc}</p>
            </div>
            <CandyButton tone="purple" size="sm" onClick={() => goStage(cur)}>
              {tr('words.courseStart')}
            </CandyButton>
          </div>
        </Panel>

        {/* 5 阶段卡片 */}
        <div className="space-y-3">
          {overview.map(({ def, done, unlocked, completed }) => {
            const isCurrent = def.stage === cur;
            return (
              <button
                key={def.stage}
                onClick={() => unlocked && goStage(def.stage)}
                disabled={!unlocked}
                className={`w-full rounded-2xl border-4 p-3 text-left transition-all active:translate-y-[1px] ${
                  completed ? 'border-candy-green-soft bg-candy-green-soft/40'
                  : isCurrent ? 'border-purple-300 bg-white shadow-md'
                  : unlocked ? 'border-purple-100 bg-white'
                  : 'border-gray-100 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{unlocked ? def.emoji : '🔒'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-extrabold text-ink">
                        {tr('words.courseStage')} {def.stage} · {def.name}
                        {completed && <span className="ml-2 text-xs text-candy-green-deep">✅ {tr('words.courseDone')}</span>}
                        {isCurrent && !completed && <span className="ml-2 rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-black text-white">{tr('words.courseNow')}</span>}
                      </p>
                      <span className="text-xs font-bold text-ink-soft">{done}/{def.targetCount}</span>
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-ink-soft">{def.desc} · {tr('words.courseGoal')}：{def.goal}</p>
                    <ProgressBar value={done} max={def.targetCount || 1} tone={def.tone} className="mt-2" />
                    {!unlocked && <p className="mt-1 text-[11px] font-bold text-ink/50">{def.unlockHint}</p>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ============ 练习板块 ============ */
  if (mainTab === 'practice') {
    const practiceTabs: TabItem<PracticeTab>[] = PRACTICE_ITEMS.map((it) => ({
      id: it.id, label: tr(it.labelKey), emoji: it.emoji,
    }));
    return (
      <div className="space-y-5">
        <PageHeader emoji="🎯" title={tr('words.practiceTitle')} subtitle={tr('words.practiceSubtitle')} tone="pink" />
        <TrainingBanner target={target} onClose={clear} />
        <Tabs items={MAIN_TABS} value={mainTab} onChange={setMainTab} tone="pink" layoutId="words-main-tabs" />
        <Tabs items={practiceTabs} value={practiceTab} onChange={setPracticeTab} tone="purple" layoutId="words-practice-tabs" />

        <Suspense fallback={<div className="py-12 text-center text-3xl animate-bounce">🔤</div>}>
          {practiceTab === 'phonics' && <PhonicsPage />}
          {practiceTab === 'spell' && <SpellingTest />}
          {practiceTab === 'dialogue' && <DialoguePage />}
          {practiceTab === 'sentences' && <SentencePage />}
          {practiceTab === 'match' && <WordMatch />}
          {practiceTab === 'listen' && <PhonicsListen />}
          {practiceTab === 'builder' && <CvcWordBuilder />}
          {practiceTab === 'wordfamily' && <WordFamilyGame />}
          {practiceTab === 'body' && <BodyParts />}
        </Suspense>
      </div>
    );
  }

  /* ============ 复习板块 ============ */
  if (mainTab === 'review') {
    return (
      <div className="space-y-5">
        <PageHeader emoji="🔁" title={tr('words.tab.review')} subtitle={tr('words.reviewSubtitle')} tone="green" />
        <TrainingBanner target={target} onClose={clear} />
        <Tabs items={MAIN_TABS} value={mainTab} onChange={setMainTab} tone="green" layoutId="words-main-tabs" />
        <Suspense fallback={<div className="py-12 text-center text-3xl animate-bounce">🔁</div>}>
          <WordReview />
        </Suspense>
      </div>
    );
  }

  /* ============ 词库板块 ============ */
  if (selected) {
    return (
      <div className="space-y-5">
        <button onClick={() => setSelected(null)} className="text-sm font-bold text-ink-soft">
          {tr('words.backToList')}
        </button>
        <WordLearn word={selected} onDone={() => setSelected(null)} />
      </div>
    );
  }

  const learnedCount = list.filter(w => (mastery[`word:${w.word}`]?.lv ?? 0) >= 1).length;

  return (
    <div className="space-y-5">
      <PageHeader iconType="town" title={tr('words.wordsTitle')} subtitle={tr('words.homeSubtitle', { count: getWordCount() })} tone={tone} />
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700 shadow-sm">
          🔥 连续学习 {streak} 天
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-700 shadow-sm">
          ⭐ 已学 {learnedCount} 词
        </span>
      </div>
      <TrainingBanner target={target} onClose={clear} />
      <Tabs items={MAIN_TABS} value={mainTab} onChange={setMainTab} tone="blue" layoutId="words-main-tabs" />

      {/* 3D 羊毛毡 Sight Words 魔法高频词宝盒 */}
      <Panel className="border-2 border-pink-300 bg-gradient-to-r from-pink-50 via-purple-50 to-rose-50">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <img
            src="/english/sight_words.jpg"
            alt="3D Felt Sight Words Box"
            loading="lazy"
            decoding="async"
            draggable={false}
            className="w-28 h-28 shrink-0 rounded-2xl object-cover border-4 border-white shadow-fluffy"
          />
          <div className="flex-1 text-center sm:text-left">
            <span className="inline-block rounded-full bg-pink-500 px-3 py-0.5 text-xs font-black text-white">
              {tr('words.sightWordsBadge')}
            </span>
            <h3 className="mt-1 text-lg font-black text-pink-900">{tr('words.sightWordsTitle')}</h3>
            <p className="text-xs font-bold text-pink-600">
              {tr('words.sightWordsDesc')}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[1, 2, 3].map((g) => (
                <button
                  key={g}
                  onClick={() => { sfxTap(); setSightGrade(g as 1 | 2 | 3); }}
                  className={`no-select rounded-full px-3 py-1 text-xs font-extrabold transition-transform hover:scale-105 active:scale-95 ${sightGrade === g ? 'bg-pink-500 text-white' : 'bg-white text-pink-700 border border-pink-200'}`}
                >
                  {tr('words.sightGrade' + g)}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-1.5">
              {getSightWordsByGrade(sightGrade).slice(0, 12).map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    sfxTap();
                    speak(w, { lang: 'en-US', rate: 0.75, module: 'word' });
                  }}
                  className="no-select rounded-xl bg-white px-3 py-1 text-xs font-extrabold text-pink-700 shadow-sm border border-pink-200 hover:scale-105 active:scale-95 transition-transform"
                >
                  {w.toUpperCase()} 🔊
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* 主题 + 学段筛选 */}
      <div className="flex flex-wrap gap-1.5">
        {WORD_THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => { sfxTap(); setThemeId(t.id); }}
            className={`no-select rounded-full px-3 py-1 text-xs font-extrabold transition-transform hover:scale-105 ${themeId === t.id ? 'bg-blue-500 text-white' : 'bg-white text-ink-soft border border-blue-200'}`}
          >
            {t.emoji} {t.name}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        {(['all', 1, 2, 3] as GradeFilter[]).map((g) => (
          <button
            key={g}
            onClick={() => { sfxTap(); setGradeFilter(g); }}
            className={`no-select rounded-full px-3 py-1 text-xs font-extrabold ${gradeFilter === g ? 'bg-candy-orange-soft text-candy-orange-deep' : 'bg-white text-ink-soft border border-orange-200'}`}
          >
            {g === 'all' ? tr('words.gradeAll') : tr('words.grade' + g)}
          </button>
        ))}
      </div>

      <Panel>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold text-ink-soft">{theme.emoji} {theme.name} · {theme.desc}</span>
          <span className="text-sm font-bold" style={{ color: TONE_STYLE[tone]!.deep }}>{learnedCount}/{list.length}</span>
        </div>
        <ProgressBar value={learnedCount} max={list.length || 1} tone={tone} />
      </Panel>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={tr('words.searchPlaceholder')}
        className="w-full rounded-2xl border-4 border-candy-blue-soft bg-white px-4 py-3 text-base font-bold text-ink outline-none placeholder:text-ink/30"
      />

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {list.map(w => {
          const learned = (mastery[`word:${w.word}`]?.lv ?? 0) >= 1;
          const t = TONE_STYLE[tone]!
          return (
            <button
              key={w.word}
              onClick={() => { sfxTap(); setSelected(w); }}
              className="flex flex-col items-center justify-center rounded-2xl p-3 min-h-[100px] shadow-candy-sm transition-all active:translate-y-[2px]"
              style={{ background: learned ? t.soft : 'rgba(255,255,255,0.7)' }}
            >
              <span className="text-4xl">{w.emoji}</span>
              <span className="mt-1 text-base font-black text-ink">{w.word}</span>
              <span className="text-xs font-bold text-ink-soft">{w.zh}</span>
              {learned && <span className="text-xs">✓</span>}
            </button>
          );
        })}
      </div>

      {list.length === 0 && (
        <p className="py-8 text-center text-base font-bold text-ink-soft">{tr('words.noWordsFound')}</p>
      )}
    </div>
  );
}
