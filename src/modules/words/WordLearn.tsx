import { useState } from 'react';
import { LearnFlow, type FlowStep } from '@/components/LearnFlow';
import { SpeechEvalButton } from '@/components/feedback/SpeechEvalButton';


import { TraceCanvas } from '@/components/TraceCanvas';
import { QuizCard } from '@/components/QuizCard';
import { AiPanel } from '@/components/ai';
import { CandyButton } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { useAiStream } from '@/lib/ai/useAi';
import { wordStoryTask, wordPhonicsTask } from '@/lib/ai/tasks';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { answerCorrect, answerWrong } from '@/lib/feedback';
import { StreakBar } from '@/components/study/StreakBar';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';
import type { WordEntry } from '@/data/wordIndex';
import type { Question } from '@/types';

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    const item = copy.splice(idx, 1)[0];
    if (item !== undefined) out.push(item);
  }
  return out;
}

export function WordLearn({ word, onDone }: { word: WordEntry; onDone: () => void }) {
  const { t: tr } = useTranslation();
  const learnSkill = useStore(s => s.learnSkill);
  const practice = useStore(s => s.practice);
  const markTraced = useStore(s => s.markTraced);
  const story = useAiStream();
  const phonics = useAiStream();
  // 练习环节「3 连对闯关」：连续答对点亮里程碑，答错归零温和引导
  const [streak, setStreak] = useState(0);
  const [q, setQ] = useState<Question>(() => makeQuestion());

  const skill = `word:${word.word}`;

  function makeQuestion(): Question {
    const types = ['emoji', 'zh', 'word'] as const;
    const type = types[Math.floor(Math.random() * types.length)] ?? 'emoji';
    const pool = WORD_POOL.filter(w => w.word !== word.word);
    const distractors = pick(pool, 3);

    if (type === 'emoji') {
      const opts = pick([word, ...distractors], 4);
      return {
        id: `word-${Date.now().toString(36)}`,
        kind: 'word-emoji',
        skill,
        prompt: tr('words.qEmoji', { zh: word.zh }),
        display: word.emoji,
        speak: word.emoji,
        options: opts.map(w => ({ id: w.word, label: w.word, emoji: w.emoji })),
        answerId: word.word,
        hint: tr('words.hintStart', { letter: word.word[0] ?? '' }),
        why: tr('words.whyEmoji', { word: word.word, zh: word.zh, emoji: word.emoji }),
      };
    }
    if (type === 'zh') {
      const opts = pick([word, ...distractors], 4);
      return {
        id: `word-${Date.now().toString(36)}`,
        kind: 'word-zh',
        skill,
        prompt: tr('words.qZh', { word: word.word }),
        display: word.word,
        speak: word.word,
        options: opts.map(w => ({ id: w.word, label: w.zh, emoji: w.emoji })),
        answerId: word.word,
        hint: word.emoji,
        why: tr('words.whyZh', { word: word.word, zh: word.zh }),
      };
    }
    // 听音选词
    const opts = pick([word, ...distractors], 4);
    return {
      id: `word-${Date.now().toString(36)}`,
      kind: 'word-listen',
      skill,
      prompt: tr('words.qListen'),
      display: '🔊',
      speak: word.word,
      options: opts.map(w => ({ id: w.word, label: w.word, emoji: w.emoji })),
      answerId: word.word,
      hint: word.zh,
      why: tr('words.whyZh', { word: word.word, zh: word.zh }),
    };
  }

  const steps: FlowStep[] = [
    {
      key: 'play',
      label: '玩',
      emoji: '🎮',
      render: (api) => (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-8xl">{word.emoji}</div>
            <div className="mt-2 text-6xl font-black leading-tight text-ink sm:text-7xl">{word.word}</div>
            <p className="text-lg font-bold text-candy-purple-deep">{word.zh}</p>
          </div>
          <CandyButton tone="green" size="lg" fullWidth onClick={() => { sfxTap(); story.run(wordStoryTask({ word: word.word, meaning: word.zh })); }}>
            {tr('words.listenStory')}
          </CandyButton>
          <AiPanel state={story} tone="green" title={tr('words.storyTitle')} />
          <div className="flex flex-col items-center justify-center gap-3">
            <SpeechEvalButton targetText={word.word} lang="en-US" onPass={() => { learnSkill(skill); api.ready(); }} />
            <div className="flex justify-center gap-3">
              <CandyButton tone="blue" size="sm" variant="soft" onClick={() => speak(word.word, { lang: 'en-US', rate: 0.72 })}>{tr('words.listenWord')}</CandyButton>
              <CandyButton tone="green" size="sm" onClick={() => { learnSkill(skill); api.ready(); }}>{tr('words.gotIt')}</CandyButton>
            </div>
          </div>

        </div>
      ),
    },
    {
      key: 'know',
      label: '认',
      emoji: '👀',
      gate: true,
      render: (api) => (
        <div className="space-y-4">
          <Panel>
            <div className="text-center">
              <div className="text-7xl">{word.emoji}</div>
              <div className="mt-1 text-5xl font-black leading-tight text-ink sm:text-6xl">{word.word}</div>
              <p className="text-base font-bold text-candy-purple-deep">{word.phonetic}</p>
              <p className="text-lg font-bold text-candy-orange-deep">{word.zh}</p>
            </div>
            <div className="mt-4 rounded-xl bg-candy-blue-soft p-3 text-center">
              <p className="text-sm font-bold text-ink-soft">{tr('words.phonicsBreak')}</p>
              <p className="text-lg font-extrabold text-candy-blue-deep">{word.phonics}</p>
            </div>
            <div className="mt-3 rounded-xl bg-candy-yellow-soft p-3">
              <p className="text-sm font-bold text-ink-soft">💬 {tr('words.exampleSent')}</p>
              <p className="mt-1 text-base font-semibold text-ink">{word.sentence}</p>
              <p className="text-sm font-bold text-ink-soft">{word.sentenceZh}</p>
              <div className="mt-2 flex gap-2">
                <CandyButton tone="blue" size="sm" variant="soft" onClick={() => speak(word.word, { lang: 'en-US', rate: 0.72 })}>{tr('words.wordBtn')}</CandyButton>
                <CandyButton tone="orange" size="sm" variant="soft" onClick={() => speak(word.sentence, { lang: 'en-US', rate: 0.8 })}>{tr('words.sentBtn')}</CandyButton>
              </div>
            </div>
          </Panel>
          <div className="flex justify-center">
            <CandyButton tone="purple" size="sm" variant="soft" onClick={() => { sfxTap(); phonics.run(wordPhonicsTask({ letters: word.word, sound: word.phonics })); }}>
              {tr('words.aiPhonicsBtn')}
            </CandyButton>
          </div>
          <AiPanel state={phonics} tone="purple" title={tr('words.aiPhonicsPanel')} />
          <div className="flex justify-center">
            <CandyButton tone="green" size="lg" onClick={() => { learnSkill(skill); api.ready(); }}>{tr('words.iKnow')}</CandyButton>
          </div>
        </div>
      ),
    },
    {
      key: 'practice',
      label: '练',
      emoji: '✏️',
      gate: true,
      render: (api) => (
        <div className="space-y-4">
          {/* 闯关里程碑：连续答对 3 题点亮「英语小达人」目标感；答错归零温和引导 */}
          <StreakBar streak={streak} target={3} tone="blue" />
          <QuizCard
            key={q.id}
            question={q}
            onAnswer={(correct: boolean) => {
              practice(skill, correct);
              if (correct) {
                const next = streak + 1;
                setStreak(next);
                if (next >= 3) {
                  // 3 连对闯关成功：庆祝 + 进入下一步
                  sfxCorrect();
                  celebrateBig();
                  api.ready();
                } else {
                  answerCorrect('pinyin');
                }
              } else {
                answerWrong('pinyin');
                setStreak(0);
              }
            }}
            onNext={() => {
              if (streak < 3) setQ(makeQuestion());
            }}
          />
        </div>
      ),
    },
    {
      key: 'write',
      label: '写',
      emoji: '✍️',
      gate: true,
      render: (api) => (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-6xl font-black leading-tight text-ink sm:text-7xl">{word.word}</div>
            <p className="mt-1 text-sm font-bold text-ink-soft">{tr('words.letterCount', { count: word.len })}</p>
          </div>
          <TraceCanvas char={word.word[0]!} tone="blue" onPass={() => { markTraced(`word:${word.word}`); api.ready(); }} />
        </div>
      ),
    },
    {
      key: 'speak',
      label: '说',
      emoji: '🗣️',
      render: (api) => (
        <div className="space-y-4">
          <Panel className="text-center">
            <div className="text-7xl">{word.emoji}</div>
            <div className="mt-1 text-5xl font-black leading-tight text-ink sm:text-6xl">{word.word}</div>
            <p className="text-lg font-bold text-candy-purple-deep">{word.zh}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <CandyButton tone="blue" size="md" onClick={() => speak(word.word, { lang: 'en-US', rate: 0.72 })}>{tr('words.readWord')}</CandyButton>
              <CandyButton tone="orange" size="md" onClick={() => speak(word.sentence, { lang: 'en-US', rate: 0.8 })}>{tr('words.readSent')}</CandyButton>
            </div>
          </Panel>
          <div className="flex justify-center">
            <CandyButton tone="green" size="lg" onClick={() => { sfxCorrect(); api.ready(); onDone(); }}>{tr('words.iReadDone')}</CandyButton>
          </div>
        </div>
      ),
    },
  ];

  return <LearnFlow steps={steps} tone="blue" finishLabel={tr('words.finishLabel')} onFinish={onDone} />;
}

// 单词池用于生成干扰项
import { getAllWords } from '@/data/wordIndex';
const WORD_POOL = getAllWords();
