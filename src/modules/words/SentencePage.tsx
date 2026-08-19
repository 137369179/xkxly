/**
 * 英语句子学习页 · 逐词高亮朗读 + 跟读
 */

import { useState, useRef, useEffect } from 'react';
import { shuffle } from "@/lib/utils";
import { motion } from 'motion/react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore } from '@/store/useStore';
import { SpeechEvalButton } from '@/components/SpeechEvalButton';
import { speak } from '@/lib/speech';
import { sfxTap, sfxWin } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { SENTENCES, SENTENCE_THEMES, getSentencesByTheme, type Sentence } from '@/data/sentences';
import { cn } from '@/lib/utils';

type Tab = 'learn' | 'quiz';

export default function SentencePage() {
  const { t: tr } = useTranslation();
  const TABS: TabItem<Tab>[] = [
    { id: 'learn', label: tr('sentencePage.learn'), emoji: '📖' },
    { id: 'quiz', label: tr('sentencePage.quiz'), emoji: '🎯' },
  ];
  const [tab, setTab] = useState<Tab>('learn');
  const [theme, setTheme] = useState(SENTENCE_THEMES[0]!.id);
  const [hi, setHi] = useState(-1);
  const [quizMode, setQuizMode] = useState(false);
  const [quizSent, setQuizSent] = useState<Sentence | null>(null);
  const [quizChosen, setQuizChosen] = useState<string | null>(null);
  const [quizOk, setQuizOk] = useState(0);
  const learnSkill = useStore(s => s.learnSkill);
  const practice = useStore(s => s.practice);
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清理定时器，防止内存泄漏与 setState on unmounted
  useEffect(() => {
    return () => {
      if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    };
  }, [theme]);

  const sentences = getSentencesByTheme(theme);

  // 逐词朗读
  const speakSentence = async (s: Sentence) => {
    setHi(-1);
    for (let i = 0; i < s.words.length; i++) {
      setHi(i);
      try { await speak(s.words[i]!, { lang: 'en-US', rate: 0.7 }); } catch { /* TTS 失败不阻断逐词高亮 */ }
    }
    setHi(-1);
    // 朗读完整句
    try { await speak(s.en, { lang: 'en-US', rate: 0.75 }); } catch { /* TTS 失败不阻断 */ }
  };

  // 测验
  const startQuiz = () => {
    sfxTap();
    setQuizMode(true);
    setQuizOk(0);
    nextQuiz();
  };

  const nextQuiz = () => {
    const s = SENTENCES[Math.floor(Math.random() * SENTENCES.length)]!
    setQuizSent(s);
    setQuizChosen(null);
  };

  const handleQuiz = (opt: string) => {
    if (quizChosen) return;
    setQuizChosen(opt);
    const correct = opt === quizSent!.zh;
    const skill = `word:sentence:${quizSent!.id}`;
    if (correct) {
      sfxWin();
      celebrateSmall();
      setQuizOk(o => o + 1);
      learnSkill(skill);
      practice(skill, true);
    } else {
      // 答错记录到错题本，便于后续复习
      practice(skill, false);
    }
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
    nextTimerRef.current = setTimeout(() => nextQuiz(), 1500);
  };

  if (tab === 'quiz') {
    if (!quizMode && !quizSent) {
      return (
        <div className="space-y-5">
          <PageHeader emoji="🎯" title={tr('sentencePage.quizTitle')} subtitle={tr('sentencePage.quizSub')} tone="pink" />
          <Tabs items={TABS} value={tab} onChange={setTab} tone="pink" layoutId="sentence-tabs" />
          <Panel className="text-center">
            <div className="text-5xl">🎯</div>
            <p className="mt-2 text-sm font-bold text-ink-soft">{tr('sentencePage.quizHint')}</p>
            <div className="mt-4">
              <CandyButton tone="pink" size="lg" fullWidth onClick={startQuiz}>
                🚀 {tr('sentencePage.start')}
              </CandyButton>
            </div>
          </Panel>
        </div>
      );
    }

    if (!quizSent) return null;

    // 生成 4 个选项（shuffle 随机打乱）
    const wrongs = shuffle(SENTENCES.filter(s => s.zh !== quizSent.zh))
      .slice(0, 3)
      .map(s => s.zh);
    const options = shuffle([quizSent.zh, ...wrongs]);

    return (
      <div className="space-y-5">
        <PageHeader emoji="🎯" title={tr('sentencePage.quizTitle')} subtitle={tr('sentencePage.quizOk', { n: quizOk })} tone="pink" />
        <Tabs items={TABS} value={tab} onChange={setTab} tone="pink" layoutId="sentence-tabs" />
        <Panel className="text-center">
          <div className="mb-4">
            <span className="text-5xl">{quizSent.emoji}</span>
          </div>
          <motion.p
            key={quizSent.id}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-3xl font-extrabold leading-tight text-ink sm:text-4xl"
          >
            {quizSent.en}
          </motion.p>
          <button
            onClick={() => { void speak(quizSent.en, { lang: 'en-US', rate: 0.7 }).catch(() => {}); }}
            className="mt-2 text-sm font-bold text-candy-pink-deep"
          >
            🔊 {tr('sentencePage.listenAgain')}
          </button>

          <div className="mt-4 grid grid-cols-1 gap-2">
            {options.map(opt => {
              const isAnswer = opt === quizSent.zh;
              const isChosen = opt === quizChosen;
              return (
                <CandyButton
                  key={opt}
                  tone={isChosen ? (isAnswer ? 'green' : 'orange') : 'purple'}
                  variant={isChosen ? 'solid' : 'soft'}
                  size="lg"
                  fullWidth
                  onClick={() => handleQuiz(opt)}
                >
                  {opt}
                </CandyButton>
              );
            })}
          </div>

          {quizChosen && (
            <p className={cn('mt-3 text-sm font-bold', quizChosen === quizSent.zh ? 'text-candy-green-deep' : 'text-candy-orange-deep')}>
              {quizChosen === quizSent.zh ? `✅ ${tr('sentencePage.correct')}` : `❌ ${tr('sentencePage.wrongAns', { zh: quizSent.zh })}`}
            </p>
          )}
        </Panel>
      </div>
    );
  }

  // Learn tab
  return (
    <div className="space-y-5">
      <PageHeader emoji="🗣️" title={tr('sentencePage.enTitle')} subtitle={tr('sentencePage.enSub')} tone="blue" />
      <Tabs items={TABS} value={tab} onChange={setTab} tone="blue" layoutId="sentence-tabs" />

      {/* 主题选择 */}
      <div className="flex flex-wrap gap-2">
        {SENTENCE_THEMES.map(t => (
          <CandyButton
            key={t.id}
            tone={theme === t.id ? t.tone : 'purple'}
            variant={theme === t.id ? 'solid' : 'soft'}
            size="sm"
            onClick={() => { sfxTap(); setTheme(t.id); }}
          >
            {t.emoji} {t.name}
          </CandyButton>
        ))}
      </div>

      {/* 句子卡片列表 */}
      <div className="space-y-3">
        {sentences.map(s => (
          <motion.div
            key={s.id}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Panel>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{s.emoji}</span>
                <div className="min-w-0 flex-1">
                  {/* 英文逐词 */}
                  <div className="flex flex-wrap gap-1">
                    {s.words.map((w, i) => (
                      <span
                        key={`w-${i}`}
                        className={cn(
                          'rounded-lg px-2 py-1 text-xl font-extrabold leading-tight transition sm:text-2xl',
                          hi === i ? 'bg-candy-yellow-soft text-candy-orange-deep scale-110' : 'text-ink'
                        )}
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-base font-bold leading-tight text-ink-soft sm:text-lg">{s.zh}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <CandyButton
                      tone="blue"
                      variant="soft"
                      size="sm"
                      onClick={() => speakSentence(s)}
                    >
                      🔊 {tr('sentencePage.read')}
                    </CandyButton>
                    <SpeechEvalButton
                      targetText={s.en}
                      lang="en-US"
                      className="min-w-[120px]"
                      onPass={() => {
                        learnSkill(`sentence:${s.id}`);
                        sfxWin();
                        celebrateSmall();
                      }}
                    />
                  </div>
                </div>
              </div>
            </Panel>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
