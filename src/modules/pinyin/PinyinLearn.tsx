import { useState, useEffect } from 'react';
import { LearnFlow, type FlowStep } from '@/components/LearnFlow';
import { TraceCanvas } from '@/components/TraceCanvas';
import { QuizCard } from '@/components/QuizCard';
import { SpeechEvalButton } from '@/components/feedback/SpeechEvalButton';
import { AiPanel } from '@/components/ai';
import { CandyButton } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Card';
import { useAiStream } from '@/lib/ai/useAi';
import { pinyinTutorTask } from '@/lib/ai/tasks';
import { speak } from '@/lib/speech';
import { sfxTap, sfxCorrect, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall, celebrateBig } from '@/lib/celebrate';
import { useStore } from '@/store/useStore';
import { getAllPinyin, type PinyinEntry } from '@/data/pinyinIndex';
import type { Question } from '@/types';
import { useTranslation } from '@/i18n/useTranslation';

// 拼音池用于生成干扰项
const PINYIN_POOL = getAllPinyin();

function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr]; const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]!);
  return out;
}

export function PinyinLearn({ entry, onDone }: { entry: PinyinEntry; onDone: () => void }) {
  const { t: tr } = useTranslation();
  const learnSkill = useStore(s => s.learnSkill);
  const practice = useStore(s => s.practice);
  const markTraced = useStore(s => s.markTraced);
  const addStars = useStore(s => s.addStars);
  const tutor = useAiStream();

  const skill = `pinyin:${entry.p}`;
  const typeLabel = entry.type === 'shengmu' ? tr('pinyin.shengmu') : entry.type === 'yunmu' ? tr('pinyin.yunmu') : tr('pinyin.wholeSyllable');

  // 键盘快捷监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerHaptic(20);
        onDone();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        triggerHaptic(20);
        void speak(`${entry.p}。${entry.rhyme}`, { lang: 'zh-CN', rate: 0.7 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entry, onDone]);

  function createQuestion(): Question {
    const correct = entry.rhyme;
    const all = PINYIN_POOL.filter(p => p.p !== entry.p);
    const distractors = pick(all, 3).map(p => p.rhyme);
    const opts = pick([correct, ...distractors], 4);
    return {
      id: `pinyin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'pinyin-quiz',
      skill,
      prompt: tr('pinyin.rhymePrompt', { p: entry.p }),
      display: entry.p,
      speak: entry.p,
      options: opts.map((r, i) => ({ id: `o${i}`, label: r, emoji: '' })),
      answerId: `o${opts.indexOf(correct)}`,
      hint: entry.sound,
      why: `${entry.p}：${entry.sound}`,
    };
  }

  const [question, setQuestion] = useState<Question>(createQuestion);

  const nextQuestion = () => setQuestion(createQuestion());



  const steps: FlowStep[] = [
    {
      key: 'know',
      label: '认',
      emoji: '👀',
      render: (api) => (
        <div className="space-y-4">
          <Panel className="text-center">
            <div className="text-8xl font-black text-ink">{entry.p}</div>
            <p className="mt-2 text-lg font-bold text-candy-blue-deep">{typeLabel}</p>
            <div className="mt-4 space-y-2 text-left">
              <p className="text-sm font-bold text-ink-soft">{tr('pinyin.sound')}</p>
              <p className="text-base font-semibold text-ink">{entry.sound}</p>
              <p className="text-sm font-bold text-ink-soft mt-2">{tr('pinyin.mouth')}</p>
              <p className="text-base font-semibold text-ink">{entry.mouth}</p>
              <p className="text-sm font-bold text-ink-soft mt-2">{tr('pinyin.rhyme')}</p>
              <p className="text-xl font-extrabold text-candy-purple-deep">{entry.rhyme}</p>
            </div>
            {entry.tones && (
              <div className="mt-4">
                <p className="text-sm font-bold text-ink-soft">{tr('pinyin.tones')}</p>
                <div className="mt-1 flex justify-center gap-3">
                  {entry.tones.map(t => (
                    <button key={t} onClick={() => speak(t, { lang: 'zh-CN', rate: 0.6 })} className="text-3xl font-black text-candy-orange-deep active:scale-95">{t}</button>
                  ))}
                </div>
              </div>
            )}
            {entry.examples.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-bold text-ink-soft">{tr('pinyin.examples')}</p>
                <div className="mt-1 flex justify-center gap-2">
                  {entry.examples.map(ex => (
                    <button key={ex} onClick={() => speak(ex, { lang: 'zh-CN', rate: 0.7 })} className="rounded-full bg-candy-pink-soft px-4 py-2 text-xl font-bold text-candy-pink-deep active:scale-95">{ex}</button>
                  ))}
                </div>
              </div>
            )}
          </Panel>
          <div className="flex justify-center gap-3">
            <CandyButton tone="blue" size="sm" onClick={() => speak(entry.p, { lang: 'zh-CN', rate: 0.6 })}>{tr('common.listen')}</CandyButton>
            <CandyButton tone="purple" size="sm" variant="soft" onClick={() => { sfxTap(); tutor.run(pinyinTutorTask({ symbol: entry.p, type: entry.type === 'shengmu' ? 'initial' : entry.type === 'yunmu' ? 'final' : 'whole' })); }}>{tr('pinyin.aiTeach')}</CandyButton>
          </div>
          <AiPanel state={tutor} tone="purple" title={tr('pinyin.aiTitle')} />
          <div className="flex justify-center">
            <CandyButton tone="green" size="lg" onClick={() => { learnSkill(skill); api.ready(); }}>{tr('pinyin.knowIt')}</CandyButton>
          </div>
        </div>
      ),
    },
    {
      key: 'read',
      label: '读',
      emoji: '🗣️',
      gate: true,
      render: (api) => (
        <div className="space-y-4">
          <Panel className="text-center">
            <div className="text-6xl font-black text-ink">{entry.p}</div>
            <p className="mt-2 text-lg font-bold text-candy-purple-deep">{entry.rhyme}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <CandyButton tone="blue" size="md" onClick={() => speak(entry.p, { lang: 'zh-CN', rate: 0.6 })}>{tr('pinyin.readPinyin')}</CandyButton>
              <CandyButton tone="purple" size="md" onClick={() => speak(entry.rhyme, { lang: 'zh-CN', rate: 0.7 })}>{tr('pinyin.readRhyme')}</CandyButton>
              {entry.syllables.map(s => (
                <CandyButton key={s} tone="orange" size="md" variant="soft" onClick={() => speak(s, { lang: 'zh-CN', rate: 0.7 })}>🔊 {s}</CandyButton>
              ))}
            </div>
          </Panel>
          <div className="flex justify-center">
            <CandyButton tone="green" size="lg" onClick={() => {
              triggerHaptic(30);
              api.ready();
            }}>{tr('pinyin.readDone1')}</CandyButton>
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
          <QuizCard
            question={question}
            onAnswer={(correct: boolean) => {
              practice(skill, correct);
              if (correct) {
                sfxCorrect();
                triggerHaptic(45);
                celebrateSmall();
                addStars(1);
                api.ready();
              } else {
                triggerHaptic(20);
                nextQuestion();
              }
            }}
            onNext={() => {}}
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
            <div className="text-6xl font-black text-ink">{entry.p}</div>
          </div>
          <TraceCanvas
            char={entry.p}
            tone="blue"
            onPass={() => {
              triggerHaptic(45);
              markTraced(`pinyin:${entry.p}`);
              api.ready();
            }}
          />
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
            <div className="text-6xl font-black text-ink">{entry.p}</div>
            <p className="mt-2 text-lg font-bold text-candy-purple-deep">{entry.rhyme}</p>
            
            {/* 智能语音跟读评测 */}
            <div className="my-4 p-3 bg-blue-50/80 rounded-2xl border border-blue-200">
              <p className="text-xs font-bold text-blue-900 mb-2">🎙️ 大声读出拼音「{entry.p}」，小茜为你评分：</p>
              <SpeechEvalButton
                targetText={entry.p}
                lang="zh-CN"
                onPass={() => {
                  sfxWin();
                  triggerHaptic([60, 40, 60, 40, 100]);
                  celebrateBig();
                  learnSkill(skill);
                  addStars(2);
                  api.ready();
                }}
              />
            </div>

            {entry.tones && (
              <div className="mt-3">
                <p className="text-sm font-bold text-ink-soft">{tr('pinyin.tonesChain')}</p>
                <div className="mt-1 flex justify-center gap-3">
                  {entry.tones.map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        triggerHaptic(20);
                        speak(t, { lang: 'zh-CN', rate: 0.6 });
                      }}
                      className="text-3xl font-black text-candy-orange-deep active:scale-95"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Panel>
          <div className="flex flex-col gap-3">
            <CandyButton tone="blue" size="lg" fullWidth onClick={() => {
              triggerHaptic(20);
              speak(entry.p, { lang: 'zh-CN', rate: 0.6 });
            }}>
              {tr('pinyin.followRead')}
            </CandyButton>
            <CandyButton tone="purple" size="md" variant="soft" fullWidth onClick={() => {
              triggerHaptic(20);
              speak(entry.rhyme, { lang: 'zh-CN', rate: 0.7 });
            }}>
              {tr('pinyin.readRhyme')}
            </CandyButton>
          </div>
          <div className="flex justify-center">
            <CandyButton tone="green" size="lg" onClick={() => {
              triggerHaptic(30);
              learnSkill(skill);
              api.ready();
            }}>
              {tr('pinyin.readDone2')}
            </CandyButton>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 顶部操作提示条 */}
      <div className="flex items-center justify-between text-xs text-blue-800 font-bold bg-blue-50/90 px-3 py-1.5 rounded-xl border border-blue-200">
        <span>⌨️ 键盘快捷操作：R 听拼音口诀 · Esc 返回拼音表</span>
        <button
          onClick={onDone}
          className="text-xs text-blue-700 hover:text-blue-900 underline font-black"
        >
          返回拼音表 ➔
        </button>
      </div>

      <LearnFlow steps={steps} tone="blue" finishLabel={tr('learning.finish')} onFinish={onDone} />
    </div>
  );
}
