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

type TabId = 'pattern' | 'match' | 'order' | 'mixed' | 'code' | 'maze' | 'sudoku';

/** 深链 param → 逻辑页 tab（codebot 映射到 code） */
const LOGIC_PARAM_MAP: Record<string, TabId> = {
  pattern: 'pattern',
  match: 'match',
  order: 'order',
  mixed: 'mixed',
  code: 'code',
  codebot: 'code',
  maze: 'maze',
  sudoku: 'sudoku',
};

export default function LogicPage() {
  const { t } = useTranslation();
  const recordLogic = useStore((s) => s.recordLogic);
  const TABS: { id: TabId; label: string; emoji: string }[] = [
    { id: 'pattern', label: t('logic.tabPattern'), emoji: '🔍' },
    { id: 'match', label: t('logic.tabMatch'), emoji: '🧩' },
    { id: 'order', label: t('logic.tabOrder'), emoji: '🔢' },
    { id: 'mixed', label: t('logic.tabMixed'), emoji: '🎲' },
    { id: 'code', label: t('logic.tabCode'), emoji: '🤖' },
    { id: 'maze', label: t('logic.tabMaze'), emoji: '🗺️' },
    { id: 'sudoku', label: t('logic.tabSudoku'), emoji: '🧩' },
  ];
  const DIFFS: { id: Difficulty; label: string }[] = [
    { id: 1, label: t('levels.begin') },
    { id: 2, label: t('levels.advance') },
    { id: 3, label: t('levels.challenge') },
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
        subtitle="找规律 · 图形配对 · 排排序"
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
                {d.label}
              </CandyButton>
            ))}
          </div>
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
