import { useEffect, useMemo, useState } from 'react';
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
import { hanziStoryTask, hanziSentenceTask, rhymeCreateTask } from '@/lib/ai/tasks';
import { speak } from '@/lib/speech';
import { answerCorrect, answerWrong } from '@/lib/feedback';
import { streakTargetForLevel } from '@/lib/difficulty';
import { StreakBar } from '@/components/study/StreakBar';
import { sfxTap, sfxCorrect, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateBig } from '@/lib/celebrate';
import { useMastery, useStore } from '@/store/useStore';
import { makeHanziQuestion } from '@/lib/hanziQuestions';
import { useTranslation } from '@/i18n/useTranslation';
import { liushuOf } from '@/lib/hanziEtymology';
import { LiushuBadge } from '@/modules/hanzi/LiushuBadge';
import { FormationExplainer } from '@/modules/hanzi/FormationExplainer';
import { ComponentBreakdown } from '@/modules/hanzi/ComponentBreakdown';
import { AssemblyAnimation } from '@/modules/hanzi/AssemblyAnimation';
import { HanziFamilyTree } from '@/modules/hanzi/HanziFamilyTree';
import type { HanziEntry } from '@/data/hanziIndex';
import { filterMasteredTexts } from '@/modules/hanzi/masteredChars';

/**
 * 描红需要写满的遍数（儿童识字铁律：写字不止一遍）。
 * 一遍过关孩子只是在「描线」，写 3 遍才真正形成肌肉记忆；
 * 下方仍保留「写好了 ➔」按钮作为容错出口，绝不让手写慢的孩子卡住。
 */
const TRACE_ROUNDS_NEEDED = 3;

/**
 * AI 故事生成等待态（第 1 步「玩」专用）
 * ------------------------------------------------------------------
 * 网络慢时最典型的体验断点：孩子点了「听故事」后是一整片空白。
 * 这里给一个「有东西可看」的等待态：
 *   1. 目标汉字放大展示 —— 等故事的时候继续看字，呼应「字是唯一焦点」；
 *   2. 骨架微光 + 三点循环动画 —— 明确的「还在进行中」感知；
 *   3. 全部复用仓库既有的 animate-pulse / animate-bounce-soft（RouteSkeleton 同款写法），
 *      零新增依赖；两者都是纯 CSS 动画，会被 index.css 的全局
 *      prefers-reduced-motion 规则降级为静态终态（骨架条终态可见），不绕过降级策略。
 */
function AiStoryWaiting({ char }: { char: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-3xl border-2 border-candy-green-soft bg-white/85 p-5 text-center shadow-sm"
    >
      <p className="text-base font-extrabold text-candy-green-deep">📖 故事正在赶来，先看看这个字～</p>

      <div className="my-3 flex items-center justify-center gap-3">
        <span className="text-7xl font-black leading-none text-ink">{char}</span>
        <span className="animate-bounce-soft text-3xl" aria-hidden>💭</span>
      </div>

      {/* 骨架条：模拟故事正文，微光表示「正在写」 */}
      <div className="mx-auto max-w-sm space-y-2">
        <div className="h-4 w-full animate-pulse rounded-full bg-candy-green/15" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-candy-green/15" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-candy-green/15" />
      </div>

      {/* 三点循环动画：错峰延迟，纯 CSS，reduced-motion 下自动静止 */}
      <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={`wait-dot-${i}`}
            className="h-2.5 w-2.5 animate-bounce-soft rounded-full bg-candy-green"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>

      <p className="mt-2.5 text-xs font-bold text-ink-soft">小茜正在编故事，马上就好啦～</p>
    </div>
  );
}

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
  const addStars = useStore(s => s.addStars);
  const addFish = useStore(s => s.addFish);
  const story = useAiStream();
  const sentence = useAiStream();
  const rhyme = useAiStream();
  // 描红已完成的遍数（写满 TRACE_ROUNDS_NEEDED 遍才判定通过）
  const [traceRounds, setTraceRounds] = useState(0);
  const mastery = useMastery();

  // 组词/例句只展示「孩子每个字都认得」的内容，避免生字打断阅读兴趣；
  // 全部含生字时回退原数据（保证永远有内容，详见 masteredChars.ts 注释）。
  const masteredWords = useMemo(
    () => filterMasteredTexts(hanzi.words, hanzi.c, mastery),
    [hanzi.words, hanzi.c, mastery],
  );
  const masteredSentence = useMemo(
    () => filterMasteredTexts([hanzi.sentence], hanzi.c, mastery)[0] ?? hanzi.sentence,
    [hanzi.sentence, hanzi.c, mastery],
  );

  // 换字学习时重置描红遍数（同一组件实例会复用 state）
  useEffect(() => {
    setTraceRounds(0);
  }, [hanzi.c]);

  // 进入学习页即后台预载笔顺数据，到「写」环节时秒开
  useEffect(() => {
    warmupStrokes();
  }, [hanzi.c]);

  const skill = `hanzi:${hanzi.c}`;

  // 全局键盘快捷键响应（空格朗读/下一步，Esc 返回）
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
        void speak(`${hanzi.c}，拼音是 ${hanzi.pd}。${hanzi.origin || ''}`, { lang: 'zh-CN', rate: 0.8 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hanzi, onDone]);

  const steps: FlowStep[] = [
    {
      key: 'play',
      label: '1. 玩·象形探秘',
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
                    src={`/hanzi-imgs/${hanzi.c}.webp`}
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
              triggerHaptic(25);
              story.run(hanziStoryTask({ char: hanzi.c, meaning: hanzi.origin, origin: hanzi.origin, evolve: hanzi.evolve }));
              learnSkill(skill);
              api.ready();
            }}
          >
            {t('hanzi.listenStory')}
          </CandyButton>
          {/* AI 还在生成（含「已连接但还没出字」）时先显示等待态，不留白；
              生成完成或失败兜底后自动切回 AiPanel 展示正文，兜底逻辑完全不变 */}
          {story.status === 'thinking' || (story.status === 'streaming' && !story.text) ? (
            <AiStoryWaiting char={hanzi.c} />
          ) : (
            <AiPanel state={story} tone="green" title={t('hanzi.storyTitle')} />
          )}
          <div className="flex justify-center gap-3">
            <CandyButton tone="blue" size="sm" variant="soft" onClick={() => {
              triggerHaptic(20);
              speak(hanzi.c, { lang: 'zh-CN', rate: 0.7 });
            }}>
              {t('hanzi.listenCharAgain')}
            </CandyButton>
            <CandyButton tone="orange" size="sm" variant="soft" onClick={() => {
              triggerHaptic(20);
              speak(`${hanzi.c}。${hanzi.origin}`, { lang: 'zh-CN', rate: 0.8 });
            }}>
              🔊 朗读字源解说
            </CandyButton>
          </div>
        </div>
      ),
    },
    {
      key: 'know',
      label: '2. 认·形音解析',
      emoji: '👀',
      gate: true,
      render: (api) => {
        const liushu = liushuOf(hanzi.c);
        return (
          <div className="space-y-4">
            <Panel>
              <div className="text-center">
                <div className="text-[9rem] leading-tight font-black text-ink tracking-wide">{hanzi.c}</div>
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
            </Panel>

            {/* 部件拆解 / 拼字动画 / 字族等辅助内容默认收起：
                认字环节汉字必须是唯一视觉焦点（家长反馈：动画太抢戏，孩子只顾看动画不看字）。
                功能一个没删，想看的孩子点一下就能展开。 */}
            <details className="rounded-2xl border-2 border-candy-purple-soft/40 bg-white/60 p-3">
              <summary className="cursor-pointer select-none text-sm font-extrabold text-candy-purple-deep">
                🔍 想看看「{hanzi.c}」是怎么拼出来的？（选看）
              </summary>
              <div className="mt-3 space-y-3">
                {liushu && <FormationExplainer char={hanzi.c} />}
                <ComponentBreakdown char={hanzi.c} />
                <AssemblyAnimation char={hanzi.c} />
                <HanziFamilyTree char={hanzi.c} />
              </div>
            </details>

            <div className="flex justify-center">
              <CandyButton tone="green" size="lg" onClick={() => {
                sfxCorrect();
                triggerHaptic(40);
                learnSkill(skill);
                api.ready();
              }}>
                {t('hanzi.knowIt')}
              </CandyButton>
            </div>
          </div>
        );
      },
    },
    {
      key: 'speak',
      label: '3. 读·智能跟读',
      emoji: '🗣️',
      gate: true,
      render: (api) => (
        <div className="space-y-4">
          <Panel className="text-center">
            <div className="text-7xl font-black text-ink">{hanzi.c}</div>
            <p className="mt-1 text-2xl font-bold text-candy-purple-deep">{hanzi.pd}</p>

            <div className="my-5 rounded-2xl bg-gradient-to-r from-candy-blue-soft/30 via-candy-purple-soft/30 to-candy-pink-soft/30 p-4">
              {/* 跟读服务于「认字」：不再突出分数与庆祝动效，读准字音即可，
                  避免孩子为了刷高分反复重读、把注意力从字形上挪走 */}
              <p className="text-xs font-bold text-ink-soft mb-2">🎙️ 大声跟着读一遍，读准字音就好：</p>
              <SpeechEvalButton
                targetText={hanzi.c}
                lang="zh-CN"
                lowKey
                onPass={() => {
                  sfxWin();
                  triggerHaptic([60, 40, 60, 40, 100]);
                  learnSkill(skill);
                  api.ready();
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <CandyButton tone="blue" size="sm" fullWidth className="!px-2 whitespace-nowrap" onClick={() => {
                triggerHaptic(20);
                speak(hanzi.c, { lang: 'zh-CN', rate: 0.7 });
              }}>
                {t('hanzi.readChar')}
              </CandyButton>
              <CandyButton tone="purple" size="sm" fullWidth className="!px-2 whitespace-nowrap" onClick={() => {
                triggerHaptic(20);
                speak(masteredWords.join('，'), { lang: 'zh-CN', rate: 0.75 });
              }}>
                {t('hanzi.readWords')}
              </CandyButton>
              <CandyButton tone="orange" size="sm" fullWidth className="!px-2 whitespace-nowrap" onClick={() => {
                triggerHaptic(20);
                speak(masteredSentence, { lang: 'zh-CN', rate: 0.8 });
              }}>
                {t('hanzi.readSentence')}
              </CandyButton>
            </div>
          </Panel>
          <div className="flex justify-center">
            <CandyButton tone="green" size="lg" onClick={() => {
              sfxCorrect();
              triggerHaptic(30);
              api.ready();
            }}>
              {t('hanzi.readDone')}
            </CandyButton>
          </div>
        </div>
      ),
    },
    {
      key: 'practice',
      label: '4. 练·趣味闯关',
      emoji: '🎯',
      gate: true,
      render: (api) => (
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {([1, 2, 3] as const).map(d => (
              <div key={d} className="flex flex-col items-center gap-0.5">
                <CandyButton tone={difficulty === d ? 'green' : 'purple'} variant={difficulty === d ? 'solid' : 'soft'} size="sm" onClick={() => {
                  triggerHaptic(20);
                  setDifficulty(d);
                }}>
                  {[t('hanzi.qPinyin'), t('hanzi.qHanzi'), t('hanzi.qWords')][d - 1]}
                </CandyButton>
                {d === diffMeta.recommended && (
                  <span className="text-xs font-extrabold leading-none text-candy-purple-deep">🌟 小茜建议</span>
                )}
              </div>
            ))}
          </div>
          <AdaptiveDifficultyHint
            meta={diffMeta}
            labels={{ 1: t('hanzi.qPinyin'), 2: t('hanzi.qHanzi'), 3: t('hanzi.qWords') }}
            className="justify-center"
          />
          {/* 闯关里程碑：连续答对点亮「识字小达人」目标感；答错归零温和引导 */}
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
                  triggerHaptic([60, 40, 60, 40, 100]);
                  celebrateBig();
                  api.ready();
                } else {
                  triggerHaptic(45);
                  answerCorrect('hanzi');
                }
              } else {
                triggerHaptic([60, 40, 60]);
                answerWrong('hanzi');
                setStreak(0);
              }
            }}
            onNext={() => {
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
      label: '5. 写·笔画描红',
      emoji: '✍️',
      gate: true,
      render: (api) => {
        // 写满 TRACE_ROUNDS_NEEDED 遍才判定通过：写一遍只是描线，多写几遍才记得住。
        // 每完成一遍就用 key 重挂载描红板，自动清空墨迹开始下一遍。
        const handleTracePass = () => {
          triggerHaptic(45);
          markTraced(`hanzi:${hanzi.c}`);
          const next = traceRounds + 1;
          setTraceRounds(next);
          if (next >= TRACE_ROUNDS_NEEDED) {
            sfxCorrect();
            api.ready();
          } else {
            sfxTap();
          }
        };
        const roundNow = Math.min(traceRounds + 1, TRACE_ROUNDS_NEEDED);
        return (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-6xl font-black text-ink">{hanzi.c}</div>
              <p className="mt-1 text-sm font-bold text-ink-soft">{t('hanzi.writeInfo', { strokes: hanzi.strokes, radical: hanzi.radical })}</p>
              <p className="mt-1 text-sm font-extrabold text-candy-green-deep">
                {traceRounds >= TRACE_ROUNDS_NEEDED ? '✅ 已经写了 3 遍，很棒！' : `✍️ 第 ${roundNow} / ${TRACE_ROUNDS_NEEDED} 遍，多写几遍记得牢`}
              </p>
            </div>
            <StrokeAnimation char={hanzi.c} />
            <div className="flex justify-center gap-2">
              <CandyButton tone={writeMode === 'stroke' ? 'green' : 'purple'} variant={writeMode === 'stroke' ? 'solid' : 'soft'} size="sm" onClick={() => { sfxTap(); triggerHaptic(20); setWriteMode('stroke'); }}>
                {t('hanzi.strokeWrite')}
              </CandyButton>
              <CandyButton tone={writeMode === 'free' ? 'green' : 'purple'} variant={writeMode === 'free' ? 'solid' : 'soft'} size="sm" onClick={() => { sfxTap(); triggerHaptic(20); setWriteMode('free'); }}>
                {t('hanzi.freeTrace')}
              </CandyButton>
            </div>
            {writeMode === 'stroke' ? (
              <StrokeTrace
                key={`stroke-${hanzi.c}-${traceRounds}`}
                char={hanzi.c}
                tone="green"
                onPass={handleTracePass}
              />
            ) : (
              <TraceCanvas
                key={`free-${hanzi.c}-${traceRounds}`}
                char={hanzi.c}
                tone="green"
                onPass={handleTracePass}
              />
            )}
            <div className="flex justify-center pt-2">
              {/* 容错出口：手写慢的孩子随时可以带着当前进度进入下一步，不会被卡住 */}
              <CandyButton tone="green" size="lg" onClick={() => {
                sfxCorrect();
                triggerHaptic(35);
                api.ready();
              }}>
                写好了 ➔
              </CandyButton>
            </div>
          </div>
        );
      },
    },
    {
      key: 'apply',
      label: '6. 用·组词造句',
      emoji: '📝',
      gate: true,
      // 本步的 🏆 按钮直接走 onDone 退出（原因见下方注释：避免与 LearnFlow 的
      // onFinish 形成双出口重复发奖），因此 render 用不到 api，以下划线前缀
      // 标记（noUnusedParameters）。
      render: (_api) => (
        <div className="space-y-4">
          <Panel>
            <div className="text-center">
              <span className="text-6xl font-black text-ink">{hanzi.c}</span>
              <p className="mt-1 text-xl font-bold text-candy-purple-deep">{hanzi.pd}</p>
            </div>

            {/* 常用组词卡片 —— 只展示孩子认得的字组成的词（全部含生字时回退原数据） */}
            <div className="mt-4">
              <p className="text-sm font-bold text-ink-soft text-center mb-2">🔊 我会读的词语拼搭</p>
              <div className="flex flex-wrap gap-2.5 justify-center">
                {masteredWords.map(w => (
                  <button
                    key={w}
                    onClick={() => {
                      sfxTap();
                      triggerHaptic(20);
                      speak(w, { lang: 'zh-CN', rate: 0.75 });
                    }}
                    className="rounded-full bg-candy-pink-soft px-4 py-2 text-base font-bold text-candy-pink-deep shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 border border-pink-200"
                  >
                    <span>🔊</span>
                    <span>{w}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 生活造句例句 */}
            <div className="mt-4 rounded-2xl bg-candy-yellow-soft p-4 border border-amber-200">
              <p className="text-xs font-bold text-amber-900 mb-1">📖 生活语境例句：</p>
              <p className="text-base font-semibold text-ink leading-relaxed">{masteredSentence}</p>
              <CandyButton tone="yellow" size="sm" variant="soft" className="mt-2" onClick={() => {
                triggerHaptic(20);
                speak(masteredSentence, { lang: 'zh-CN', rate: 0.8 });
              }}>
                🔊 朗读生活例句
              </CandyButton>
            </div>

            {/* AI 造句与儿歌扩展 */}
            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              <CandyButton tone="purple" size="sm" variant="soft" onClick={() => {
                sfxTap();
                triggerHaptic(20);
                // AI 造句也只用已掌握的字组词，避免生成孩子读不懂的句子
                sentence.run(hanziSentenceTask({ char: hanzi.c, words: masteredWords, sentence: masteredSentence }));
              }}>
                {t('hanzi.aiSentence')}
              </CandyButton>
              <CandyButton tone="pink" size="sm" variant="soft" onClick={() => {
                sfxTap();
                triggerHaptic(20);
                rhyme.run(rhymeCreateTask(hanzi.c, 'hanzi'));
              }}>
                ✨ 编儿歌顺口溜
              </CandyButton>
            </div>
            <AiPanel state={sentence} tone="purple" title={t('hanzi.aiSentenceTitle')} />
            <AiPanel state={rhyme} tone="pink" title="🎶 汉字儿歌顺口溜" />
          </Panel>

          <div className="flex justify-center pt-2">
            <CandyButton tone="green" size="xl" onClick={() => {
              sfxWin();
              triggerHaptic([60, 40, 60, 40, 100]);
              celebrateBig();
              addStars(3);
              addFish(2);
              // 只保留 onDone 一个出口：这里刻意【不】调 api.ready()。
              // 最后一步调 ready() 会让底部 LearnFlow 按钮解锁，再点一次就会走
              // onFinish(=onDone)，导致星星/小鱼干重复发放、今日课程 step 被推进两格。
              // 退出通道仍有两个兜底（顶部「返回宝库 ➔」与 Esc 键），不会卡住孩子。
              onDone();
            }}>
              🏆 掌握本字 · 领取通关奖励
            </CandyButton>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 顶部操作提示条 */}
      <div className="flex items-center justify-between text-xs text-green-800 font-bold bg-green-50/90 px-3 py-1.5 rounded-xl border border-green-200">
        <span>⌨️ 键盘快捷操作：R 听字音释义 · Esc 返回识字乐园</span>
        <button
          onClick={onDone}
          className="text-xs text-green-700 hover:text-green-900 underline font-black"
        >
          返回宝库 ➔
        </button>
      </div>

      <LearnFlow steps={steps} tone="green" finishLabel={t('hanzi.finishLearn')} onFinish={onDone} />
    </div>
  );
}


