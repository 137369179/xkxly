import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { PageHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { CandyButton } from '@/components/ui/Button';
import { RoundRunner } from '@/components/quiz/RoundRunner';
import { makeLogicQuestion, type Difficulty, type LogicKind } from '@/lib/questions';
import { makeSpacedDrill } from '@/lib/drill';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/study/AdaptiveDifficultyHint';
import { logicExplainTask } from '@/lib/ai/tasks';
import { useStore } from '@/store/useStore';
import { CodeBot } from './CodeBot';
import { MazeGame } from './MazeGame';
import { KidSudoku } from './KidSudoku';
import { useTrainingTarget } from '@/hooks/useTrainingTarget';
import { TrainingBanner } from '@/components/study/TrainingBanner';

type TabId = 'pattern' | 'match' | 'order' | 'condition' | 'mixed' | 'code' | 'maze' | 'sudoku';

/** 深链 param → 逻辑页 tab（codebot 映射到 code，condition 为条件判断） */
const LOGIC_PARAM_MAP: Record<string, TabId> = {
  pattern: 'pattern',
  match: 'match',
  order: 'order',
  condition: 'condition',
  mixed: 'mixed',
  code: 'code',
  codebot: 'code',
  maze: 'maze',
  sudoku: 'sudoku',
};

export default function LogicPage() {
  const { t } = useTranslation();
  const recordLogic = useStore((s) => s.recordLogic);
  // 🦉 逻辑小达人统计：累计答题/答对（progress 持久化，驱动激励展示）
  const logicCorrect = useStore((s) => s.progress.logicCorrect);
  const logicTotal = useStore((s) => s.progress.logicTotal);
  const TABS: { id: TabId; label: string; emoji: string }[] = [
    { id: 'pattern', label: t('logic.tabPattern'), emoji: '🔍' },
    { id: 'match', label: t('logic.tabMatch'), emoji: '🧩' },
    { id: 'order', label: t('logic.tabOrder'), emoji: '🔢' },
    { id: 'condition', label: t('logic.tabCondition'), emoji: '🚦' },
    { id: 'mixed', label: t('logic.tabMixed'), emoji: '🎲' },
    { id: 'code', label: t('logic.tabCode'), emoji: '🤖' },
    { id: 'maze', label: t('logic.tabMaze'), emoji: '🗺️' },
    { id: 'sudoku', label: t('logic.tabSudoku'), emoji: '🧩' },
  ];
  const DIFFS: { id: Difficulty; label: string; age: string }[] = [
    { id: 1, label: t('levels.begin'), age: t('logic.ageBegin') },
    { id: 2, label: t('levels.advance'), age: t('logic.ageAdvance') },
    { id: 3, label: t('levels.challenge'), age: t('logic.ageChallenge') },
  ];
  const [tab, setTab] = useState<TabId>('pattern');
  const [diff, setDiff, diffMeta] = useAdaptiveDifficultyState('logic');
  const { target, clear } = useTrainingTarget('logic');

  // 深链 param → 对应 tab（maze / sudoku / codebot / 其它已知 tab）
  useEffect(() => {
    const p = target?.param;
    if (!p) return;
    const nextTab = LOGIC_PARAM_MAP[p];
    if (nextTab) setTab(nextTab);
  }, [target]);

  const makeQuestion = (d: Difficulty) =>
    makeSpacedDrill('logic', (dd) => makeLogicQuestion(tab === 'mixed' ? 'mixed' : (tab as LogicKind), dd), () => useStore.getState().progress)(d);

  return (
    <div>
      <PageHeader
        emoji="🧩"
        title="逻辑挑战"
        subtitle={t('logic.pageSubtitle')}
        tone="green"
      />

      <TrainingBanner target={target} onClose={clear} />

      <Tabs<TabId>
        tone="green"
        layoutId="logic-tabs"
        value={tab}
        onChange={setTab}
        items={TABS}
      />

      {tab !== 'code' && (
        <>
          {/* 🎮 阶梯式难度：三档对应分龄认知（对齐帮帮识字/洪恩分龄体系） */}
          <div className="mb-2 flex gap-2.5">
            {DIFFS.map((d) => (
              <CandyButton
                key={d.id}
                tone={diff === d.id ? 'green' : 'purple'}
                variant={diff === d.id ? 'solid' : 'soft'}
                size="sm"
                fullWidth
                onClick={() => setDiff(d.id)}
              >
                <span className="block leading-tight">{d.label}</span>
                <span className="block text-[10px] font-bold opacity-80">{d.age}</span>
              </CandyButton>
            ))}
          </div>

          {/* 🦉 逻辑小达人：答题进度 / 正确率即时可见（游戏化激励） */}
          <LogicStats correct={logicCorrect} total={logicTotal} />

          <AdaptiveDifficultyHint
            meta={diffMeta}
            labels={{ 1: t('levels.begin'), 2: t('levels.advance'), 3: t('levels.challenge') }}
            className="mb-4"
          />

          <RoundRunner
            key={`${tab}-${diff}`}
            makeQuestion={makeQuestion}
            difficulty={diff}
            tone="green"
            questionsPerRound={5}
            onRoundStart={diffMeta.syncNow}
            onAnswered={(q, c) => recordLogic(c, q.skill)}
            aiExplain={(q, _chosen, correct) =>
              logicExplainTask(q.prompt, (q.displayShapes ?? []).join(' '), correct)
            }
          />
        </>
      )}
      {tab === 'code' && <CodeBot />}
      {tab === 'maze' && <MazeGame />}
      {tab === 'sudoku' && <KidSudoku />}
    </div>
  );
}

/** 🦉 逻辑小达人统计条：累计答题 / 答对 / 正确率（儿童友好、即时激励） */
function LogicStats({ correct, total }: { correct: number; total: number }) {
  const { t } = useTranslation();
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border-2 border-candy-green-soft bg-gradient-to-r from-green-50 to-emerald-50/70 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-sm">🦉</span>
        <div className="leading-tight">
          <p className="text-xs font-extrabold text-candy-green-deep">{t('logic.statsTitle')}</p>
          <p className="text-sm font-bold text-ink">
            {total === 0 ? t('logic.statsEmpty') : t('logic.statsLine', { correct, total, pct })}
          </p>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-amber-600 shadow-sm">
        ⭐ {pct}%
      </span>
    </div>
  );
}
