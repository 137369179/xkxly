import { useEffect, useState } from 'react';
import { LearnFlow, type FlowStep } from '@/components/LearnFlow';
import { TraceCanvas } from '@/components/TraceCanvas';
import { StrokeAnimation } from '@/components/StrokeAnimation';
import { StrokeTrace } from '@/components/StrokeTrace';
import { warmupStrokes } from '@/lib/strokes';
import { SpeechEvalButton } from '@/components/feedback/SpeechEvalButton';
import { QuizCard } from '@/components/QuizCard';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/study/AdaptiveDifficultyHint';
import { AiPanel } from '@/components/ai';
import { CandyButton } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { useAiStream } from '@/lib/ai/useAi';
import { hanziStoryTask, hanziSentenceTask } from '@/lib/ai/tasks';
import { speak } from '@/lib/speech';
import { answerCorrect, answerWrong } from '@/lib/feedback';
import { streakTargetForLevel } from '@/lib/difficulty';
import { StreakBar } from '@/components/study/StreakBar';
import { sfxTap, sfxCorrect, sfxWin } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { makeHanziQuestion } from '@/lib/hanziQuestions';
import { useTranslation } from '@/i18n/useTranslation';
import { liushuOf } from '@/lib/hanziEtymology';
import { LiushuBadge } from '@/modules/hanzi/LiushuBadge';
import { FormationExplainer } from '@/modules/hanzi/FormationExplainer';
import { ComponentBreakdown } from '@/modules/hanzi/ComponentBreakdown';
import { AssemblyAnimation } from '@/modules/hanzi/AssemblyAnimation';
import { HanziFamilyTree } from '@/modules/hanzi/HanziFamilyTree';
import type { HanziEntry } from '@/data/hanziIndex';

export function HanziLearn({ hanzi, onDone }: { hanzi: HanziEntry; onDone: () => void }) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty, diffMeta] = useAdaptiveDifficultyState('hanzi');
  const [writeMode, setWriteMode] = useState<'stroke' | 'free'>('stroke');
  // 练习环节「3 连对闯关」：连续答对点亮里程碑，答错归零温和引导
  const [streak, setStreak] = useState(0);
  const [q, setQ] = useState(() => makeHanziQuestion(hanzi, 1, t));
  const learnSkill = useStore(s => s.learnSkill);
  const practice = useStore(s => s.practice);
  const markTraced = useStore(s => s.markTraced);
  const story = useAiStream();
  const sentence = useAiStream();

  // 进入学习页即后台预载笔顺数据，到「写」环节时秒开
  useEffect(() => {
    warmupStrokes();
  }, [hanzi.c]);

  const skill = `hanzi:${hanzi.c}`;

  const steps: FlowStep[] = [
    {
      key: 'play',
      label: t('hanzi.steps.play'),
      emoji: '🎮',
      gate: true,
      render: (api) => (
        <div className="space-y-4">
          <div className="rounded-3xl border-3 border-candy-orange-soft/40 bg-gradient-to-b from-candy-orange-soft/30 via-white to-candy-yellow-soft/30 p-5 text-center shadow-md">
            <div className="inline-block rounded-full bg-candy-orange-deep/10 px-3 py-1 text-xs font-black text-candy-orange-deep mb-2">
              ✨ 象形探秘 · 汉字起源
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 my-3 sm:gap-8">
              <div className="flex flex-col items-center">
                <div className="grid h-44 w-44 place-items-center rounded-3xl border-2 border-dashed border-candy-orange-deep/40 bg-white/90 shadow-sm sm:h-48 sm:w-48">
                  <img
                    src={`/hanzi-imgs/${hanzi.c}.png`}
                    alt={hanzi.c}
                    className="h-36 w-36 object-contain sm:h-40 sm:w-40"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLElement).parentElement;
                      if (parent && !parent.querySelector('.fallback-glyph')) {
                        const span = document.createElement('span');
                        span.className = 'fallback-glyph text-7xl';
                        span.innerText = '📜';
                        parent.appendChild(span);
                      }
                    }}
                  />
                </div>
                <span className="mt-2 text-lg font-bold text-ink-soft sm:text-xl">古代物象</span>
              </div>
              <div className="text-3xl font-black text-candy-orange-deep animate-pulse sm:text-5xl">➔</div>
              <div className="flex flex-col items-center">
                <div className="grid h-44 w-44 place-items-center rounded-3xl bg-white shadow-md border-2 border-candy-orange-soft sm:h-48 sm:w-48">
                  <span className="text-8xl font-black text-ink sm:text-9xl">{hanzi.c}</span>
                </div>
                <span className="mt-2 text-lg font-bold text-candy-orange-deep sm:text-xl">{hanzi.pd}</span>
              </div>
            </div>
            <p className="mt-4 text-base font-semibold text-ink leading-relaxed max-w-md mx-auto sm:text-lg">
              {hanzi.origin || `古代人根据物体的形状创造了“${hanzi.c}”字，快来听听它的有趣故事吧！`}
            </p>
          </div>

          <CandyButton
            tone="green"
            size="lg"
            fullWidth
            onClick={() => {
              sfxTap();
              story.run(hanziStoryTask({ char: hanzi.c, meaning: hanzi.origin, origin: hanzi.origin, evolve: hanzi.evolve }));
              learnSkill(skill);
              api.ready();
            }}
          >
            {t('hanzi.listenStory')}
          </CandyButton>
          <AiPanel state={story} tone="green" title={t('hanzi.storyTitle')} />
          <div className="flex justify-center gap-3">
            <CandyButton tone="blue" size="sm" variant="soft" onClick={() => speak(hanzi.c, { lang: 'zh-CN', rate: 0.7 })}>
              {t('hanzi.listenCharAgain')}
            </CandyButton>
            <CandyButton tone="orange" size="sm" variant="soft" onClick={() => speak(`${hanzi.c}。${hanzi.origin}`, { lang: 'zh-CN', rate: 0.8 })}>
              🔊 朗读字源解说
            </CandyButton>
          </div>
        </div>
      ),
    },
    {
      key: 'know',
      label: t('hanzi.steps.know'),
      emoji: '👀',
      gate: true,
      render: (api) => {
        const liushu = liushuOf(hanzi.c);
        return (
          <div className="space-y-4">
            <Panel>
              <div className="text-center">
                <div className="text-[10rem] leading-tight font-black text-ink tracking-wide">{hanzi.c}</div>
                <p className="mt-2 text-4xl font-bold text-candy-purple-deep">{hanzi.pd}</p>
                {liushu && (
                  <div className="mt-4 flex justify-center">
                    <LiushuBadge liushu={liushu} />
                  </div>
                )}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-candy-blue-soft p-4 shadow-sm">
                  <div className="text-base font-bold text-ink-soft">{t('hanzi.radical')}</div>
                  <div className="mt-1 text-3xl font-extrabold text-candy-blue-deep">{hanzi.radical}</div>
                </div>
                <div className="rounded-xl bg-candy-green-soft p-4 shadow-sm">
                  <div className="text-base font-bold text-ink-soft">笔画数</div>
                  <div className="mt-1 text-3xl font-extrabold text-candy-green-deep">{t('hanzi.strokesCount', { count: hanzi.strokes })}</div>
                </div>
                <div className="rounded-xl bg-candy-orange-soft p-4 shadow-sm">
                  <div className="text-base font-bold text-ink-soft">声调</div>
                  <div className="mt-1 text-3xl font-extrabold text-candy-orange-deep">{t('hanzi.toneN', { tone: hanzi.tone })}</div>
                </div>
              </div>
              <div className="mt-5 space-y-2 rounded-2xl bg-white/70 p-4 border border-candy-purple-soft/30">
                <p className="text-base font-bold text-candy-purple-deep">📖 字形演变与解析</p>
                <p className="text-base font-semibold text-ink leading-relaxed">{hanzi.evolve || hanzi.origin}</p>
              </div>
              <div className="mt-4">
                <p className="text-sm font-bold text-ink-soft">{t('hanzi.words')}</p>
                <div className="mt-2 flex flex-wrap gap-2 justify-center">
                  {hanzi.words.map(w => (
                    <button
                      key={w}
                      onClick={() => {
                        sfxTap();
                        speak(w, { lang: 'zh-CN', rate: 0.75 });
                      }}
                      className="rounded-full bg-candy-pink-soft px-4 py-2 text-base font-bold text-candy-pink-deep shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                    >
                      <span>🔊</span>
                      <span>{w}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-candy-yellow-soft p-3">
                <p className="text-sm font-bold text-ink-soft">{t('hanzi.sentence')}</p>
                <p className="mt-1 text-base font-semibold text-ink">{hanzi.sentence}</p>
                <CandyButton tone="yellow" size="sm" variant="soft" className="mt-2" onClick={() => speak(hanzi.sentence, { lang: 'zh-CN', rate: 0.8 })}>
                  {t('hanzi.listenSentence')}
                </CandyButton>
              </div>
            </Panel>

            {liushu && <FormationExplainer char={hanzi.c} />}
            <ComponentBreakdown char={hanzi.c} />
            <AssemblyAnimation char={hanzi.c} />
            <HanziFamilyTree char={hanzi.c} />

            <div className="flex justify-center gap-3">
              <CandyButton tone="purple" size="sm" variant="soft" onClick={() => { sfxTap(); sentence.run(hanziSentenceTask({ char: hanzi.c, words: hanzi.words, sentence: hanzi.sentence })); }}>
                {t('hanzi.aiSentence')}
              </CandyButton>
            </div>
            <AiPanel state={sentence} tone="purple" title={t('hanzi.aiSentenceTitle')} />
            <div className="flex justify-center">
              <CandyButton tone="green" size="lg" onClick={() => { learnSkill(skill); api.ready(); }}>
                {t('hanzi.knowIt')}
              </CandyButton>
            </div>
          </div>
        );
      },
    },
    {
      key: 'speak',
      label: t('hanzi.steps.speak'),
      emoji: '🗣️',
      gate: true,
      render: (api) => (
        <div className="space-y-4">
          <Panel className="text-center">
            <div className="text-7xl font-black text-ink">{hanzi.c}</div>
            <p className="mt-1 text-2xl font-bold text-candy-purple-deep">{hanzi.pd}</p>

            <div className="my-5 rounded-2xl bg-gradient-to-r from-candy-blue-soft/30 via-candy-purple-soft/30 to-candy-pink-soft/30 p-4">
              <p className="text-xs font-bold text-ink-soft mb-2">🎙️ 点击下方大声跟读，小智为你评分：</p>
              <SpeechEvalButton
                targetText={hanzi.c}
                lang="zh-CN"
                onPass={() => {
                  sfxWin();
                  celebrateBig();
                  learnSkill(skill);
                  api.ready();
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <CandyButton tone="blue" size="sm" fullWidth className="!px-2 whitespace-nowrap" onClick={() => speak(hanzi.c, { lang: 'zh-CN', rate: 0.7 })}>
                {t('hanzi.readChar')}
              </CandyButton>
              <CandyButton tone="purple" size="sm" fullWidth className="!px-2 whitespace-nowrap" onClick={() => speak(hanzi.words.join('，'), { lang: 'zh-CN', rate: 0.75 })}>
                {t('hanzi.readWords')}
              </CandyButton>
              <CandyButton tone="orange" size="sm" fullWidth className="!px-2 whitespace-nowrap" onClick={() => speak(hanzi.sentence, { lang: 'zh-CN', rate: 0.8 })}>
                {t('hanzi.readSentence')}
              </CandyButton>
            </div>
          </Panel>
          <div className="flex justify-center">
            <CandyButton tone="green" size="lg" onClick={() => { sfxCorrect(); api.ready(); }}>
              {t('hanzi.readDone')}
            </CandyButton>
          </div>
        </div>
      ),
    },
    {
      key: 'practice',
      label: t('hanzi.steps.practice'),
      emoji: '✏️',
      gate: true,
      render: (api) => (
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {([1, 2, 3] as const).map(d => (
              <div key={d} className="flex flex-col items-center gap-0.5">
                <CandyButton tone={difficulty === d ? 'green' : 'purple'} variant={difficulty === d ? 'solid' : 'soft'} size="sm" onClick={() => setDifficulty(d)}>
                  {[t('hanzi.qPinyin'), t('hanzi.qHanzi'), t('hanzi.qWords')][d - 1]}
                </CandyButton>
                {d === diffMeta.recommended && (
                  <span className="text-[10px] font-extrabold leading-none text-candy-purple-deep">🌟 小智建议</span>
                )}
              </div>
            ))}
          </div>
          <AdaptiveDifficultyHint
            meta={diffMeta}
            labels={{ 1: t('hanzi.qPinyin'), 2: t('hanzi.qHanzi'), 3: t('hanzi.qWords') }}
            className="justify-center"
          />
          {/* 闯关里程碑：连续答对（目标随难度爬坡）点亮「识字小达人」目标感；答错归零温和引导 */}
          <StreakBar streak={streak} target={streakTargetForLevel(difficulty)} tone="green" />
          <QuizCard
            key={q.id}
            question={q}
            onAnswer={(correct: boolean) => {
              practice(skill, correct, 1, difficulty);
              if (correct) {
                const next = streak + 1;
                setStreak(next);
                if (next >= streakTargetForLevel(difficulty)) {
                  // 3 连对闯关成功：庆祝 + 进入下一步
                  sfxCorrect();
                  celebrateBig();
                  api.ready();
                } else {
                  answerCorrect('hanzi');
                }
              } else {
                answerWrong('hanzi');
                setStreak(0);
              }
            }}
            onNext={() => {
              // 未满 3 连对：换下一题继续挑战；已通关则不再触发（onAnswer 已 ready）
              if (streak < streakTargetForLevel(difficulty)) {
                setQ(makeHanziQuestion(hanzi, difficulty, t));
              }
            }}
          />
        </div>
      ),
    },
    {
      key: 'write',
      label: t('hanzi.steps.write'),
      emoji: '✍️',
      gate: true,
      render: (api) => (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-6xl font-black text-ink">{hanzi.c}</div>
            <p className="mt-1 text-sm font-bold text-ink-soft">{t('hanzi.writeInfo', { strokes: hanzi.strokes, radical: hanzi.radical })}</p>
          </div>
          <StrokeAnimation char={hanzi.c} />
          <div className="flex justify-center gap-2">
            <CandyButton tone={writeMode === 'stroke' ? 'green' : 'purple'} variant={writeMode === 'stroke' ? 'solid' : 'soft'} size="sm" onClick={() => { sfxTap(); setWriteMode('stroke'); }}>
              {t('hanzi.strokeWrite')}
            </CandyButton>
            <CandyButton tone={writeMode === 'free' ? 'green' : 'purple'} variant={writeMode === 'free' ? 'solid' : 'soft'} size="sm" onClick={() => { sfxTap(); setWriteMode('free'); }}>
              {t('hanzi.freeTrace')}
            </CandyButton>
          </div>
          {writeMode === 'stroke' ? (
            <StrokeTrace
              char={hanzi.c}
              tone="green"
              onPass={() => { markTraced(`hanzi:${hanzi.c}`); api.ready(); }}
            />
          ) : (
            <TraceCanvas
              char={hanzi.c}
              tone="green"
              onPass={() => { markTraced(`hanzi:${hanzi.c}`); api.ready(); }}
            />
          )}
          <div className="flex justify-center pt-2">
            <CandyButton tone="green" size="lg" onClick={() => { sfxWin(); api.ready(); onDone(); }}>
              {t('hanzi.finishLearn')}
            </CandyButton>
          </div>
        </div>
      ),
    },
  ];

  return <LearnFlow steps={steps} tone="green" finishLabel={t('hanzi.finishLearn')} onFinish={onDone} />;
}

