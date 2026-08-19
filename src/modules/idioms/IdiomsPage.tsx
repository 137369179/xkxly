/**
 * 成语故事屋 · 看故事学成语 + 猜成语游戏 + AI 讲故事 + AI 造句
 */

import { useState, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { AiPanel } from '@/components/ai/AiPanel';
import { useStore } from '@/store/useStore';
import { speak } from '@/lib/speech';
import { sfxTap, sfxWin, sfxStar } from '@/lib/sfx';
import { IDIOMS, getIdiomsByLevel, type Idiom } from '@/data/idioms';
import { IdiomChain } from './IdiomChain';
import { shuffle } from '@/lib/utils';
import { useAiStream, useAiTask } from '@/lib/ai/useAi';
import { idiomStoryTask, idiomSentenceTask, type IdiomSentenceData } from '@/lib/ai/tasks/idiom';
import { TONE_STYLE } from '@/lib/tones';
import { useTranslation } from '@/i18n/useTranslation';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/AdaptiveDifficultyHint';
import { QuizSessionRunner } from '@/components/QuizSessionRunner';
import { AllusionBrowser } from '@/modules/poems/AllusionBrowser';
import type { Question } from '@/types';

type Tab = 'library' | 'guess' | 'chain' | 'allusion';

export default function IdiomsPage() {
  const { t } = useTranslation();
  // 标签的 i18n 必须在组件内随语言刷新（原模块级 translate() 会在首屏固化语言，
  // 切换语言后标签不变）；useMemo 仅在语言变化时重算。
  const TABS: TabItem<Tab>[] = useMemo(() => [
    { id: 'library', label: t('idioms.library'), emoji: '📖' },
    { id: 'guess', label: t('idioms.guess'), emoji: '🎯' },
    { id: 'chain', label: t('idioms.chain'), emoji: '🐉' },
    { id: 'allusion', label: t('allusionBrowser.title'), emoji: '📚' },
  ], [t]);
  const [tab, setTab] = useState<Tab>('library');
  const [level, setLevel, levelMeta] = useAdaptiveDifficultyState('idiom');
  const [selected, setSelected] = useState<Idiom | null>(null);
  const learnSkill = useStore(s => s.learnSkill);

  // 猜成语：用统一 QuizSessionRunner 驱动（出题循环/进度/连对/结算由 Runner 托管）
  const [guessStarted, setGuessStarted] = useState(false);

  const list = useMemo(() => getIdiomsByLevel(level), [level]);

  /**
   * 猜成语的题库。以前这里直接从全量 IDIOMS 随机抽，等于难度选择器
   * 对游戏毫无作用——启蒙的孩子照样会被抽到最难的成语。
   * 现在跟着自适应难度走，池子太小（凑不出 4 个选项）才退回全量。
   */
  const quizPoolRef = useRef<Idiom[]>(IDIOMS);
  quizPoolRef.current = list.length >= 4 ? list : IDIOMS;

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

  const startGuess = () => {
    sfxTap();
    // 开一局是安全边界：把小智的最新建议应用上来
    levelMeta.syncNow();
    setGuessStarted(true);
  };

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

  return (
    <div className="space-y-5">
      <PageHeader emoji="🏯" title={t('idioms.storyHouse')} subtitle={t('idioms.storyCount', { count: IDIOMS.length })} tone="purple" />
      <Tabs items={TABS} value={tab} onChange={setTab} tone="purple" layoutId="idiom-tabs" />

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
        <AdaptiveDifficultyHint
          meta={levelMeta}
          labels={{ 1: t('idioms.level1'), 2: t('idioms.level2'), 3: t('idioms.level3') }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map(i => (
          <motion.div key={i.id} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <button
              onClick={() => { sfxTap(); setSelected(i); }}
              className="flex w-full items-center gap-3 rounded-2xl bg-white/70 p-3 text-left shadow-candy-sm transition-all active:translate-y-[2px]"
            >
              <span className="text-3xl">{i.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-black text-ink">{i.word}</div>
                <div className="truncate text-xs font-bold text-ink-soft">{i.meaning}</div>
              </div>
              <span className="text-ink-soft">›</span>
            </button>
          </motion.div>
        ))}
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
          <span className="text-6xl">{idiom.emoji}</span>
          <h2 className="mt-2 text-3xl font-black text-ink">{idiom.word}</h2>
          <p className="text-sm font-bold text-ink-soft">{idiom.pinyin}</p>
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

        {/* 基础操作按钮 */}
        <div className="mt-4 flex flex-wrap gap-2">
          <CandyButton tone="blue" variant="soft" size="sm" onClick={() => speak(idiom.word, { rate: 0.7 })}>
            🔊 {t('idioms.read')}
          </CandyButton>
          <CandyButton tone="green" variant="soft" size="sm" onClick={onLearn}>
            ✅ {t('idioms.learned')}
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
            ✨ {t('idioms.aiSentence')}
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
                      🔊 {t('idioms.read')}
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
