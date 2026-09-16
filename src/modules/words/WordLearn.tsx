import { useCallback, useState, type ReactNode } from 'react';
import { LearnFlow, type FlowStep } from '@/components/LearnFlow';
import { SpeechEvalButton } from '@/components/feedback/SpeechEvalButton';

import { getAllWords, type WordEntry } from '@/data/wordIndex';
import { TraceCanvas } from '@/components/TraceCanvas';
import { QuizCard } from '@/components/QuizCard';
import { AiPanel } from '@/components/ai';
import { CandyButton } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { useAiStream } from '@/lib/ai/useAi';
import { wordStoryTask, wordPhonicsTask } from '@/lib/ai/tasks';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, triggerHaptic } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { answerCorrect, answerWrong } from '@/lib/feedback';
import { praiseByScene, encourageByScene } from '@/lib/praise';
import { StreakBar } from '@/components/study/StreakBar';
import { StarSettlementCard } from '@/components/gamification/StarSettlementCard';
import { ModuleGameShell } from '@/components/gamification/ModuleGameShell';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';
import { earnStars, type EarnResult } from '@/game/rewardEconomy';
import { masteryNoteFor, newlyMasteredThisWeek } from '@/game/masteryNarrative';
import { useAdaptiveDifficulty } from '@/game/useAdaptiveDifficulty';
import type { Question } from '@/types';

/** 单词池用于生成干扰项（模块级一次性读取，避免每次作答重复遍历） */
const WORD_POOL = getAllWords();

/** 练习环节「3 连对闯关」里程碑：连续答对点亮目标感，答错归零温和引导 */
const STREAK_TARGET = 3;

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
  const addStars = useStore(s => s.addStars);
  const progress = useStore(s => s.progress);
  const story = useAiStream();
  const phonics = useAiStream();

  /**
   * ⚠️ skill 必须声明在 `useState(makeQuestion)` 之前（R168 修复的 P0 崩溃）。
   *
   * 原实现把 `const skill = …` 写在了 `const [q, setQ] = useState(() => makeQuestion())`
   * **之后**，而 `makeQuestion()` 内部要读 `skill` 填 Question.skill。
   * `const` 存在暂时性死区（TDZ），useState 的初始化函数在**首次渲染时同步执行**，
   * 于是每次挂载 WordLearn 都直接抛 `ReferenceError: Cannot access 'skill'
   * before initialization` —— 孩子点进词语学习看到的是白屏 / 错误兜底卡片。
   * 该组件由 WordsPage 真实挂载，属可直接触发的生产缺陷。
   */
  const skill = `word:${word.word}`;

  const [streak, setStreak] = useState(0);
  /** 本节作答统计（R168 新增）：星星结算的唯一依据，与「是否闯关成功」解耦 */
  const [answered, setAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  /**
   * 实时反馈气泡（R168 新增）。
   * 原实现只在答对/答错时播一段音效 —— 听觉反馈对还没建立拼读直觉的孩子
   * 是「一次性」的：声音过去了就过去了，孩子抓不住自己到底哪一步做对了。
   * 这里补上可见的文案气泡（正确积极强化 / 错误温和引导 + 提示正解）。
   */
  const [feedback, setFeedback] = useState<{ correct: boolean; msg: string } | null>(null);
  /** 本轮星星结算结果：展示「实际入账」的星数，与成长荣誉馆同一份数据 */
  const [settlement, setSettlement] = useState<EarnResult | null>(null);
  /** 渐进式难度：随连对表现爬坡，与识字/数学两模块口径一致 */
  const adapt = useAdaptiveDifficulty({ initialLevel: 1 });

  const [q, setQ] = useState<Question>(() => makeQuestion());

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

  /**
   * 本轮结算 —— 词语模块「赚星星」的唯一出口（R168 新增）。
   *
   * 这是三核心里最后一块拼图：识字（HanziQuizGame）与数学（MathQuiz）早在
   * R162 就接上了统一账本，唯独词语模块一直只调 `practice()` 写 SRS，
   * 孩子在这里答对的每一题都**不入账**。同一个孩子在三个模块里看到两套
   * 规则（这边努力半天星星不动，那边一动就涨），是最伤信任的不一致。
   *
   * 走全站既有通道：earnStars() 统一口径 → addStars() 入全局账本。
   * 不另建账本、不另定阈值。
   */
  const settleRound = useCallback(
    (total: number, correct: number, best: number): EarnResult => {
      const result = earnStars({ module: 'words', total, correct, bestCombo: best });
      if (result.granted > 0) addStars(result.granted);
      setSettlement(result);
      void speak(`太棒了！词语闯关一共获得 ${result.granted} 颗星！`).catch(() => {});
      return result;
    },
    [addStars],
  );

  const handleAnswer = useCallback(
    (correct: boolean, api: { ready: () => void }) => {
      practice(skill, correct);

      // 结算三元组在作答时一次算清：闯关条件是「连对 3 题」，但中途答错的题
      // 也必须计入 total —— 否则「错了 5 次才连对 3 次」会被算成满分，
      // 星级口径与识字 / 数学两模块不一致。
      const nextAnswered = answered + 1;
      const nextCorrect = correctCount + (correct ? 1 : 0);
      const nextBest = correct ? Math.max(bestCombo, streak + 1) : bestCombo;
      setAnswered(nextAnswered);
      setCorrectCount(nextCorrect);
      setBestCombo(nextBest);

      if (correct) {
        const next = streak + 1;
        setStreak(next);
        adapt.onCorrect();
        setFeedback({ correct: true, msg: praiseByScene('word') });

        if (next >= STREAK_TARGET) {
          // 3 连对闯关成功：庆祝 + 结算入账 + 进入下一步
          sfxCorrect();
          triggerHaptic(40);
          celebrateBig();
          settleRound(nextAnswered, nextCorrect, nextBest);
          api.ready();
        } else {
          triggerHaptic(15);
          answerCorrect('word');
        }
      } else {
        // 温和引导：不批评，直接把正解摆出来（帮帮识字「错了不批评」原则）
        answerWrong('word');
        adapt.onWrong();
        setStreak(0);
        setFeedback({
          correct: false,
          msg: `${encourageByScene('word')} 正确答案是「${word.zh}」哦`,
        });
      }
    },
    [practice, skill, streak, answered, correctCount, bestCombo, settleRound, adapt, word.zh],
  );

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
          <StreakBar streak={streak} target={STREAK_TARGET} tone="blue" />
          <QuizCard
            key={q.id}
            question={q}
            onAnswer={(correct: boolean) => handleAnswer(correct, api)}
            onNext={() => {
              if (streak < STREAK_TARGET) setQ(makeQuestion());
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
          {/* 原实现用 `word.word[0]!` 非空断言：空词条目会直接渲染出空白描红板。
              改为受控兜底，取不到首字符时用整词，保证描红始终有内容。 */}
          <TraceCanvas char={word.word[0] ?? word.word} tone="blue" onPass={() => { markTraced(`word:${word.word}`); api.ready(); }} />
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

          {/* 结算卡：让孩子在「说」这一步回头看见自己这一课真正赚到了多少星 */}
          {settlement ? (
            <StarSettlementCard
              result={settlement}
              moduleName="词语"
              masteryNote={masteryNoteFor(
                newlyMasteredThisWeek(progress.mastery, ['word']),
                '个词语',
              )}
            />
          ) : null}

          <div className="flex justify-center">
            <CandyButton tone="green" size="lg" onClick={() => { sfxCorrect(); api.ready(); onDone(); }}>{tr('words.iReadDone')}</CandyButton>
          </div>
        </div>
      ),
    },
  ];

  /** 已掌握词语量：驱动星星奖励淡出阶段（外部牵引淡出、胜任感保留） */
  const masteredCount = Object.keys(progress.mastery).filter(k => k.startsWith('word:')).length;

  /**
   * 统一外壳：冒险路线 + 星星小屋（奖励解锁）+ 成就墙 + 连击条 + 错误边界。
   * 词语模块此前是三核心里唯一一个完全没有游戏化外壳的模块 —— 孩子在这里
   * 既看不见连击、也看不见成就、更没有星星可以花。
   */
  const wrap = (body: ReactNode) => (
    <ModuleGameShell
      module="words"
      level={adapt.level}
      progress={progress}
      combo={streak}
      feedback={feedback ? { correct: feedback.correct, message: feedback.msg } : null}
      masteredCount={masteredCount}
      title="词语闯关"
    >
      {body}
    </ModuleGameShell>
  );

  return wrap(
    <LearnFlow steps={steps} tone="blue" finishLabel={tr('words.finishLabel')} onFinish={onDone} />,
  );
}
