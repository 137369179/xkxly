import { useMemo, useRef } from 'react';
import type { Progress } from '@/types';
import { Panel } from '@/components/ui/Card';
import { AiAvatar } from '@/components/ai';
import { useAiTask } from '@/lib/ai/useAi';
import { genTodayPlan } from '@/lib/ai/tasks';
import type { TodayPlan } from '@/lib/ai/prompts';
import { buildDailyPlan } from '@/lib/dailyPlan';
import { useTranslation } from '@/i18n/useTranslation';

/* ========================================================================
 * AI 今日排课建议（从 TodayPage 拆分）
 * ===================================================================== */
export function AiPlanCard({ progress }: { progress: Progress }) {
  const { t: tr } = useTranslation();
  const planState = useAiTask<TodayPlan>(() => genTodayPlan(progress), true);
  const p = planState.result?.data;
  if (!p) {
    return planState.loading ? (
      <Panel>
        <div className="flex items-center gap-2 py-1">
          <AiAvatar size={30} mood="thinking" />
          <span className="text-sm font-bold text-ink-soft">{tr('today.aiPlanning')}</span>
        </div>
      </Panel>
    ) : null;
  }
  return (
    <Panel>
      <div className="mb-2 flex items-center gap-2">
        <AiAvatar size={30} />
        <span className="text-base font-extrabold text-candy-purple-deep">{tr('today.aiTodayPlan')}</span>
      </div>
      <p className="text-base font-bold text-ink">{p.greeting}</p>
      <p className="mt-1 text-sm font-bold text-candy-orange-deep">🎯 {p.focus}</p>
      <ol className="mt-3 space-y-2">
        {p.steps.map((s, i) => (
          <li key={`s-${i}`} className="flex items-start gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-candy-purple-soft text-sm font-extrabold text-candy-purple-deep">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-extrabold text-ink">{s.title}</p>
              <p className="text-xs font-semibold text-ink-soft">{s.reason}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm font-bold text-candy-green-deep">💬 {p.cheer}</p>
      {planState.result?.fallback && (
        <p className="mt-2 text-xs font-semibold text-ink-soft">{tr('today.offlinePlan')}</p>
      )}
    </Panel>
  );
}

/* ========================================================================
 * AI 每日学习总结（从 TodayPage 拆分）
 * ===================================================================== */
import { dailySummaryTask } from '@/lib/ai/tasks';
import { useAiStream as useAiStreamSummary } from '@/lib/ai/useAi';
import { AiPanel as AiPanelSummary } from '@/components/ai';

export function DailySummary({ progress, plan }: { progress: Progress; plan: ReturnType<typeof buildDailyPlan> }) {
  const learnedItems = plan.sections
    .filter((s) => s.kind !== 'review' && s.kind !== 'quiz')
    .map((s) => {
      if (s.kind === 'letter') return `字母 ${s.refs?.[0] ?? ''}`;
      if (s.kind === 'number') return `数字 ${(s.refs ?? []).join('/')}`;
      if (s.kind === 'hanzi') return `汉字 ${s.refs?.[0] ?? ''}`;
      if (s.kind === 'pinyin') return `拼音 ${s.refs?.[0] ?? ''}`;
      if (s.kind === 'poem') return `古诗 ${s.refs?.[0] ?? ''}`;
      if (s.kind === 'word') return `单词 ${s.refs?.[0] ?? ''}`;
      return s.kind;
    })
    .join('、');
  const task = useMemo(
    () => dailySummaryTask(learnedItems || '今日课程', progress.stars, progress.streak),
    [learnedItems, progress.stars, progress.streak],
  );
  const ai = useAiStreamSummary(task);
  return (
    <div className="mt-4 text-left">
      <AiPanelSummary state={ai} tone="purple" compact />
    </div>
  );
}

/* ========================================================================
 * 今日课程内嵌活动（从 TodayPage 拆分）
 * ===================================================================== */
import { QuizCard } from '@/components/QuizCard';
import { CandyButton } from '@/components/ui/Button';
import { LearnFlow, type FlowStep, type FlowStepApi } from '@/components/LearnFlow';
import { HanziLearn } from '@/modules/hanzi/HanziLearn';
import { PinyinLearn } from '@/modules/pinyin/PinyinLearn';
import { HANZI_DATA } from '@/data/hanzi';
import { getAllPinyin } from '@/data/pinyinIndex';
import { WORD_THEMES } from '@/data/words';
import { speakSequence, speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';
import POEMS from '@/data/poems';
import { makePoemQuestion } from '@/lib/questions';

/* —— 古诗学习活动 —— */
export function PoemActivity({ poemId, onDone }: { poemId: string; onDone: () => void }) {
  const { t: tr } = useTranslation();
  const poem = POEMS.find((p) => p.id === poemId);
  const readPoem = useStore((s) => s.readPoem);
  const practice = useStore((s) => s.practice);
  const learnSkill = useStore((s) => s.learnSkill);
  const ctrlRef = useRef<ReturnType<typeof speakSequence> | null>(null);

  if (!poem) {
    return (
      <div className="py-6 text-center">
        <CandyButton tone="green" size="lg" onClick={onDone}>
          {tr('today.continue')}
        </CandyButton>
      </div>
    );
  }

  const skill = `poem:${poem.id}`;
  const lines = poem.lines.map((t) => t.replace(/[，。？！]$/, ''));

  const steps: FlowStep[] = [
    {
      key: 'listen',
      label: '听',
      emoji: '👂',
      render: (api: FlowStepApi) => (
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="text-center">
            <div className="text-2xl font-extrabold text-candy-pink-deep">《{poem.title}》</div>
            <div className="text-sm font-bold text-ink-soft">
              {poem.dynasty} · {poem.author}
            </div>
          </div>
          <CandyButton
            tone="pink"
            size="lg"
            fullWidth
            onClick={() => {
              readPoem(poem.id);
              learnSkill(skill);
              ctrlRef.current?.cancel();
              ctrlRef.current = speakSequence(lines, { rate: 0.7, gap: 420, module: 'story' });
              api.ready();
            }}
          >
            {tr('today.listenTeacher')}
          </CandyButton>
        </div>
      ),
    },
    {
      key: 'read',
      label: '读',
      emoji: '📖',
      gate: true,
      render: (api: FlowStepApi) => (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="w-full space-y-1 rounded-2xl bg-white/70 p-4 text-center">
            {lines.map((t, i) => (
              <p key={`t-${i}`} className="text-lg font-bold text-ink">
                {t}
              </p>
            ))}
          </div>
          <CandyButton
            tone="pink"
            size="lg"
            fullWidth
            onClick={() => {
              readPoem(poem.id);
              ctrlRef.current?.cancel();
              ctrlRef.current = speakSequence(lines, { rate: 0.7, gap: 360, module: 'story' });
              api.ready();
            }}
          >
            {tr('today.followRead')}
          </CandyButton>
        </div>
      ),
    },
    {
      key: 'fill',
      label: '填',
      emoji: '✏️',
      gate: true,
      render: (api: FlowStepApi) => (
        <QuizCard
          question={makePoemQuestion(POEMS, 1, poem.id) ?? makePoemQuestion(POEMS, 1)!}
          autoSpeak={false}
          onAnswer={(correct) => {
            readPoem(poem.id);
            if (correct) {
              practice(skill, true);
              api.ready();
            } else {
              practice(skill, false);
            }
          }}
        />
      ),
    },
    {
      key: 'recite',
      label: '背',
      emoji: '🌟',
      render: (api: FlowStepApi) => (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="w-full space-y-1 rounded-2xl bg-white/70 p-4 text-center">
            {lines.map((t, i) => (
              <p key={`t-${i}`} className="text-lg font-bold text-ink">
                {t}
              </p>
            ))}
          </div>
          <CandyButton
            tone="green"
            size="lg"
            fullWidth
            onClick={() => {
              readPoem(poem.id);
              api.ready();
            }}
          >
            {tr('today.iRecited')}
          </CandyButton>
        </div>
      ),
    },
  ];

  return <LearnFlow steps={steps} tone="pink" onFinish={onDone} finishLabel={tr('today.poemDone')} />;
}

/* —— 汉字学习活动（今日课程内嵌） —— */
export function HanziActivity({ char, onDone }: { char: string; onDone: () => void }) {
  const { t: tr } = useTranslation();
  const entry = useMemo(() => HANZI_DATA.find((h) => h.c === char), [char]);
  if (!entry) {
    return (
      <div className="py-8 text-center">
        <p className="text-ink-soft">{tr('today.hanziNotFound', { char })}</p>
        <CandyButton tone="green" size="sm" onClick={onDone} className="mt-3">{tr('today.skip')}</CandyButton>
      </div>
    );
  }
  return <HanziLearn hanzi={entry} onDone={onDone} />;
}

/* —— 拼音学习活动（今日课程内嵌） —— */
export function PinyinActivity({ p, onDone }: { p: string; onDone: () => void }) {
  const { t: tr } = useTranslation();
  const entry = useMemo(() => getAllPinyin().find((e) => e.p === p), [p]);
  if (!entry) {
    return (
      <div className="py-8 text-center">
        <p className="text-ink-soft">{tr('today.pinyinNotFound', { p })}</p>
        <CandyButton tone="blue" size="sm" onClick={onDone} className="mt-3">{tr('today.skip')}</CandyButton>
      </div>
    );
  }
  return <PinyinLearn entry={entry} onDone={onDone} />;
}

/* —— 英语单词学习活动（今日课程内嵌） —— */
export function WordActivity({ word, onDone }: { word: string; onDone: () => void }) {
  const { t: tr } = useTranslation();
  const learnSkill = useStore((s) => s.learnSkill);
  const practice = useStore((s) => s.practice);
  const entry = useMemo(() => {
    for (const theme of WORD_THEMES) {
      const found = theme.words.find((w) => w.word === word);
      if (found) return found;
    }
    return null;
  }, [word]);

  if (!entry) {
    return (
      <div className="py-8 text-center">
        <p className="text-ink-soft">{tr('today.wordNotFound', { word })}</p>
        <CandyButton tone="pink" size="sm" onClick={onDone} className="mt-3">{tr('today.skip')}</CandyButton>
      </div>
    );
  }

  const handleLearn = () => {
    learnSkill(`word:${entry.word}`);
    void speak(entry.word, { rate: 0.8, module: 'word' });
  };

  return (
    <LearnFlow
      tone="pink"
      onFinish={onDone}
      finishLabel={tr('today.wordDone')}
      steps={[
        {
          key: 'see',
          label: '认',
          emoji: '👀',
          render: (api: FlowStepApi) => (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-7xl">{entry.emoji}</div>
              <div className="text-4xl font-black text-ink">{entry.word}</div>
              <div className="text-lg font-bold text-ink-soft">{entry.zh}</div>
              <div className="text-sm font-bold text-ink-soft">{entry.phonetic}</div>
              <CandyButton
                tone="pink"
                size="lg"
                fullWidth
                onClick={() => {
                  handleLearn();
                  api.ready();
                }}
              >
                {tr('today.listenWord')}
              </CandyButton>
            </div>
          ),
        },
        {
          key: 'say',
          label: '说',
          emoji: '🗣️',
          gate: true,
          render: (api: FlowStepApi) => (
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-base font-bold text-ink">{tr('today.followReadWord', { word: entry.word })}</p>
              <p className="text-sm font-bold text-ink-soft">{entry.sentenceZh}</p>
              <CandyButton tone="pink" size="lg" onClick={() => void speak(entry.word, { rate: 0.6, module: 'word' })}>
                {tr('today.listenAgain')}
              </CandyButton>
              <CandyButton tone="green" size="lg" fullWidth onClick={() => { practice(`word:${entry.word}`, true, 1); api.ready(); }}>
                {tr('today.iCanRead')}
              </CandyButton>
            </div>
          ),
        },
      ]}
    />
  );
}
