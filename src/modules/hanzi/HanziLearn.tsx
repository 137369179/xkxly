import { useEffect, useState } from 'react';
import { LearnFlow, type FlowStep } from '@/components/LearnFlow';
import { TraceCanvas } from '@/components/TraceCanvas';
import { StrokeAnimation } from '@/components/StrokeAnimation';
import { StrokeTrace } from '@/components/StrokeTrace';
import { warmupStrokes } from '@/lib/strokes';

import { QuizCard } from '@/components/QuizCard';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/AdaptiveDifficultyHint';
import { AiPanel } from '@/components/ai';
import { CandyButton } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { useAiStream } from '@/lib/ai/useAi';
import { hanziStoryTask, hanziSentenceTask } from '@/lib/ai/tasks';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { makeHanziQuestion } from '@/lib/hanziQuestions';
import { useTranslation } from '@/i18n/useTranslation';
import { liushuOf } from '@/lib/hanziEtymology';
import { LiushuBadge } from '@/components/hanzi/LiushuBadge';
import { FormationExplainer } from '@/components/hanzi/FormationExplainer';
import { ComponentBreakdown } from '@/components/hanzi/ComponentBreakdown';
import { AssemblyAnimation } from '@/components/hanzi/AssemblyAnimation';
import { HanziFamilyTree } from '@/components/hanzi/HanziFamilyTree';
import type { HanziEntry } from '@/data/hanziIndex';

export function HanziLearn({ hanzi, onDone }: { hanzi: HanziEntry; onDone: () => void }) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty, diffMeta] = useAdaptiveDifficultyState('hanzi');
  const [writeMode, setWriteMode] = useState<'stroke' | 'free'>('stroke');
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
      // gate: 必须点击"听一听这个故事"按钮触发 api.ready() 后才能解锁"认"步骤
      gate: true,
      render: (api) => (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-8xl font-black text-ink">{hanzi.c}</div>
            <p className="mt-2 text-lg font-bold text-ink-soft">{hanzi.pd}</p>
          </div>
          <CandyButton tone="green" size="lg" fullWidth onClick={() => { sfxTap(); story.run(hanziStoryTask({ char: hanzi.c, meaning: hanzi.origin, origin: hanzi.origin, evolve: hanzi.evolve })); learnSkill(skill); api.ready(); }}>
            {t('hanzi.listenStory')}
          </CandyButton>
          <AiPanel state={story} tone="green" title={t('hanzi.storyTitle')} />
          <div className="flex justify-center gap-3">
            <CandyButton tone="blue" size="sm" variant="soft" onClick={() => speak(hanzi.c, { lang: 'zh-CN', rate: 0.7 })}>
              {t('hanzi.listenCharAgain')}
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
              <div className="text-7xl font-black text-ink">{hanzi.c}</div>
              <p className="mt-1 text-xl font-bold text-candy-purple-deep">{hanzi.pd}</p>
              {liushu && (
                <div className="mt-2 flex justify-center">
                  <LiushuBadge liushu={liushu} size="sm" />
                </div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-candy-blue-soft p-3">
                <div className="text-xs font-bold text-ink-soft">{t('hanzi.radical')}</div>
                <div className="text-xl font-extrabold text-candy-blue-deep">{hanzi.radical}</div>
              </div>
              <div className="rounded-xl bg-candy-green-soft p-3">
                <div className="text-xs font-bold text-ink-soft">笔画</div>
                <div className="text-xl font-extrabold text-candy-green-deep">{t('hanzi.strokesCount', { count: hanzi.strokes })}</div>
              </div>
              <div className="rounded-xl bg-candy-orange-soft p-3">
                <div className="text-xs font-bold text-ink-soft">声调</div>
                <div className="text-xl font-extrabold text-candy-orange-deep">{t('hanzi.toneN', { tone: hanzi.tone })}</div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-bold text-ink-soft">{t('hanzi.origin')}</p>
              <p className="text-base font-semibold text-ink">{hanzi.origin}</p>
              <p className="text-sm font-bold text-ink-soft mt-2">{t('hanzi.evolve')}</p>
              <p className="text-base font-semibold text-ink">{hanzi.evolve}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm font-bold text-ink-soft">{t('hanzi.words')}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {hanzi.words.map(w => (
                  <button key={w} onClick={() => speak(w, { lang: 'zh-CN', rate: 0.75 })} className="rounded-full bg-candy-pink-soft px-4 py-2 text-base font-bold text-candy-pink-deep active:scale-95">
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-candy-yellow-soft p-3">
              <p className="text-sm font-bold text-ink-soft">{t('hanzi.sentence')}</p>
              <p className="mt-1 text-base font-semibold text-ink">{hanzi.sentence}</p>
              <CandyButton tone="yellow" size="sm" variant="soft" className="mt-2" onClick={() => speak(hanzi.sentence, { lang: 'zh-CN', rate: 0.8 })}>{t('hanzi.listenSentence')}</CandyButton>
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
          <QuizCard
            question={makeHanziQuestion(hanzi, difficulty, t)}
            onAnswer={(correct: boolean) => {
              // P1-3: 透传当前难度给 SRS（识字三种题型难度不同，高难答对应加速掌握）
              practice(skill, correct, 1, difficulty);
              if (correct) {
                sfxCorrect();
                celebrateSmall();
                api.ready();
              }
            }}
            onNext={() => {}}
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

        </div>
      ),
    },
    {
      key: 'speak',
      label: t('hanzi.steps.speak'),
      emoji: '🗣️',
      render: (api) => (
        <div className="space-y-4">
          <Panel className="text-center">
            <div className="text-6xl font-black text-ink">{hanzi.c}</div>
            <p className="mt-1 text-lg font-bold text-candy-purple-deep">{hanzi.pd}</p>
            <div className="mt-4 space-y-2">
              <CandyButton tone="blue" size="md" fullWidth onClick={() => speak(hanzi.c, { lang: 'zh-CN', rate: 0.7 })}>{t('hanzi.readChar')}</CandyButton>
              <CandyButton tone="purple" size="md" fullWidth onClick={() => speak(hanzi.words.join('，'), { lang: 'zh-CN', rate: 0.75 })}>{t('hanzi.readWords')}</CandyButton>
              <CandyButton tone="orange" size="md" fullWidth onClick={() => speak(hanzi.sentence, { lang: 'zh-CN', rate: 0.8 })}>{t('hanzi.readSentence')}</CandyButton>
            </div>
          </Panel>
          <div className="flex justify-center">
            <CandyButton tone="green" size="lg" onClick={() => { sfxCorrect(); api.ready(); onDone(); }}>
              {t('hanzi.readDone')}
            </CandyButton>
          </div>
        </div>
      ),
    },
  ];

  return <LearnFlow steps={steps} tone="green" finishLabel={t('hanzi.finishLearn')} onFinish={onDone} />;
}
