import { useMemo, useState } from 'react';
import { WORD_THEMES, searchWords, getWordCount, getSightWordsByGrade } from '@/data/wordIndex';
import type { WordEntry } from '@/data/wordIndex';
import { PageHeader, Panel } from '@/components/ui/Card';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useProgress } from '@/store/useStore';
import { sfxTap } from '@/lib/sfx';
import { speak } from '@/lib/speech';

import { TONE_STYLE } from '@/lib/tones';
import { useTranslation } from '@/i18n/useTranslation';
import { WordLearn } from './WordLearn';
import { PhonicsPage } from './PhonicsPage';
import { SpellingTest } from './SpellingTest';
import { DialoguePage } from './DialoguePage';
import { WordMatch } from './WordMatch';
import { WordReview } from './WordReview';
import { PhonicsListen } from './PhonicsListen';
import { BodyParts } from './BodyParts';
import { CvcWordBuilder } from './CvcWordBuilder';
import { WordFamilyGame } from './WordFamilyGame';
import { lazy, Suspense } from 'react';

const SentencePage = lazy(() => import('./SentencePage'));

type Tab = 'animals' | 'colors' | 'numbers' | 'family' | 'food' | 'nature' | 'phonics' | 'sentences' | 'spell' | 'dialogue' | 'match' | 'review' | 'listen' | 'body' | 'builder' | 'wordfamily';

const THEME_MAP: Record<string, string> = {
  animals: 'animals', colors: 'colors', numbers: 'numbers',
  family: 'family', food: 'food', nature: 'nature',
};

export default function WordsPage() {
  const [tab, setTab] = useState<Tab>('animals');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<WordEntry | null>(null);
  const [sightGrade, setSightGrade] = useState<1 | 2 | 3>(1);
  const progress = useProgress();
  const { t: tr } = useTranslation();
  // 标签的 i18n 必须在组件内随语言刷新（原模块级 translate() 会在首屏固化语言，
  // 切换语言后标签不变）；useMemo 仅在语言变化时重算。
  const TABS: TabItem<Tab>[] = useMemo(() => [
    { id: 'animals', label: tr('words.tab.animals'), emoji: '🐱' },
    { id: 'colors', label: tr('words.tab.colors'), emoji: '🌈' },
    { id: 'numbers', label: tr('words.tab.numbers'), emoji: '🔢' },
    { id: 'family', label: tr('words.tab.family'), emoji: '👨‍👩‍👧' },
    { id: 'food', label: tr('words.tab.food'), emoji: '🍎' },
    { id: 'nature', label: tr('words.tab.nature'), emoji: '🌳' },
    { id: 'phonics', label: tr('words.tab.phonics'), emoji: '🔤' },
    { id: 'sentences', label: tr('words.tab.sentences'), emoji: '🗣️' },
    { id: 'spell', label: tr('words.tab.spell'), emoji: '✏️' },
    { id: 'dialogue', label: tr('words.tab.dialogue'), emoji: '💬' },
    { id: 'match', label: tr('words.tab.match'), emoji: '🔗' },
    { id: 'review', label: tr('words.tab.review'), emoji: '📚' },
    { id: 'listen', label: tr('words.tab.listen'), emoji: '👂' },
    { id: 'builder', label: tr('words.tab.builder'), emoji: '🔤' },
    { id: 'wordfamily', label: tr('words.tab.wordFamily'), emoji: '🔗' },
    { id: 'body', label: tr('words.tab.body'), emoji: '👤' },
  ], [tr]);

  const themeId = THEME_MAP[tab]! || 'animals';
  const theme = WORD_THEMES.find((t) => t.id === themeId) ?? WORD_THEMES[0]!;
  const tone = theme.tone;

  const list = useMemo(() => {
    if (query.trim()) return searchWords(query.trim());
    return theme.words;
  }, [theme, query]);

  if (tab === 'phonics') {
    return (
      <div className="space-y-5">
        <PageHeader iconType="town" title={tr('words.phonicsTitle')} subtitle={tr('words.phonicsSubtitle')} tone="purple" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="purple" layoutId="words-tabs" />
        <PhonicsPage />
      </div>
    );
  }

  if (tab === 'listen') {

    return (
      <div className="space-y-5">
        <PageHeader emoji="👂" title={tr('words.listenTitle')} subtitle={tr('words.listenSubtitle')} tone="blue" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="blue" layoutId="words-tabs" />
        <PhonicsListen />
      </div>
    );
  }

  if (tab === 'body') {
    return (
      <div className="space-y-5">
        <PageHeader emoji="👤" title={tr('words.bodyTitle')} subtitle={tr('words.bodySubtitle')} tone="blue" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="blue" layoutId="words-tabs" />
        <BodyParts />
      </div>
    );
  }



  if (tab === 'spell') {
    return (
      <div className="space-y-5">
        <PageHeader emoji="✏️" title={tr('words.spellTitle')} subtitle={tr('words.spellSubtitle')} tone="pink" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="pink" layoutId="words-tabs" />
        <SpellingTest />
      </div>
    );
  }

  if (tab === 'dialogue') {
    return (
      <div className="space-y-5">
        <PageHeader emoji="💬" title={tr('words.dialogueTitle')} subtitle={tr('words.dialogueSubtitle')} tone="pink" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="pink" layoutId="words-tabs" />
        <DialoguePage />
      </div>
    );
  }

  if (tab === 'sentences') {
    return (
      <div className="space-y-5">
        <PageHeader emoji="🗣️" title={tr('words.sentencesTitle')} subtitle={tr('words.sentencesSubtitle')} tone="blue" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="blue" layoutId="words-tabs" />
        <Suspense fallback={<div className="py-8 text-center text-sm font-bold text-ink-soft">加载中…</div>}>
          <SentencePage />
        </Suspense>
      </div>
    );
  }

  if (tab === 'match') {
    return (
      <div className="space-y-5">
        <Tabs items={TABS} value={tab} onChange={setTab} tone="green" layoutId="words-tabs" />
        <WordMatch />
      </div>
    );
  }

  if (tab === 'review') {
    return (
      <div className="space-y-5">
        <Tabs items={TABS} value={tab} onChange={setTab} tone="green" layoutId="words-tabs" />
        <WordReview />
      </div>
    );
  }

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

  if (tab === 'wordfamily') {
    return (
      <div className="space-y-5">
        <PageHeader iconType="town" title={tr('words.wordFamilyPageTitle')} subtitle={tr('words.wordFamilyPageSub')} tone="purple" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="purple" layoutId="words-tabs" />
        <WordFamilyGame />
      </div>
    );
  }

  if (tab === 'builder') {
    return (
      <div className="space-y-5">
        <PageHeader iconType="town" title={tr('words.builderTitle')} subtitle={tr('words.builderSubtitle')} tone="pink" />
        <Tabs items={TABS} value={tab} onChange={(v) => setTab(v as Tab)} tone="pink" />


        <CvcWordBuilder />
      </div>
    );
  }


  const learnedCount = list.filter(w => (progress.mastery[`word:${w.word}`]?.lv ?? 0) >= 1).length;

  return (
    <div className="space-y-5">
      <PageHeader iconType="town" title={tr('words.builderTitle')} subtitle={tr('words.homeSubtitle', { count: getWordCount() })} tone={tone} />
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
          const learned = (progress.mastery[`word:${w.word}`]?.lv ?? 0) >= 1;
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
