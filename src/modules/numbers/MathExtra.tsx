import { useState, useRef } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { RoundRunner } from '@/components/RoundRunner';
import { makeSpacedDrill } from '@/lib/drill';
import type { Question } from '@/types';
import type { Difficulty } from '@/lib/questions';
import { makeMulQuestion, makeDivQuestion, makeShapeQuestion, makeTimeQuestion, makeCoinQuestion } from '@/lib/questions';
import { useStore } from '@/store/useStore';
import { sfxTap } from '@/lib/sfx';
import { useAdaptiveDifficultyState } from '@/store/adaptiveDifficulty';
import { AdaptiveDifficultyHint } from '@/components/AdaptiveDifficultyHint';

type SubTab = 'mul' | 'div' | 'shape' | 'time' | 'coin';

const SUB_TABS: { id: SubTab; label: string; emoji: string }[] = [
  { id: 'mul', label: '乘法', emoji: '✖️' },
  { id: 'div', label: '除法', emoji: '➗' },
  { id: 'shape', label: '认图形', emoji: '🔺' },
  { id: 'time', label: '认钟表', emoji: '🕐' },
  { id: 'coin', label: '认钱币', emoji: '🪙' },
];

const SKILL_MAP: Record<SubTab, string> = {
  mul: 'math:mul',
  div: 'math:div',
  shape: 'shape:recognize',
  time: 'time:clock',
  coin: 'coin:recognize',
};

/** 自适应难度按学科大类分桶（skill 的冒号前缀），乘法/除法共用 math 的水平画像 */
const CAT_OF: Record<SubTab, string> = {
  mul: 'math',
  div: 'math',
  shape: 'shape',
  time: 'time',
  coin: 'coin',
};

function makeQuestion(sub: SubTab, diff: Difficulty): Question {
  switch (sub) {
    case 'mul': return makeMulQuestion(diff);
    case 'div': return makeDivQuestion(diff);
    case 'shape': return makeShapeQuestion(diff);
    case 'time': return makeTimeQuestion(diff);
    case 'coin': return makeCoinQuestion(diff);
  }
}

export function MathExtra() {
  const [sub, setSub] = useState<SubTab>('mul');
  const [diff, setDiff, diffMeta] = useAdaptiveDifficultyState(CAT_OF[sub]);
  const [round, setRound] = useState(0);
  const genRef = useRef(0);

  const practice = useStore(s => s.practice);

  const baseGen = () => makeQuestion(sub, diff);
  const make = makeSpacedDrill(SKILL_MAP[sub], baseGen, () => useStore.getState().progress);

  const handleAnswer = (_q: Question, correct: boolean, d?: Difficulty) => {
    // P1-3: 透传实际出题难度给 SRS，启用难度感知升降级（高难答对升 2 / 低难答错降 2）
    practice(SKILL_MAP[sub], correct, 1, d ?? diff);
  };

  const switchSub = (s: SubTab) => {
    sfxTap();
    setSub(s);
    genRef.current++;
    setRound(r => r + 1);
  };

  const switchDiff = (d: Difficulty) => {
    sfxTap();
    setDiff(d);
    genRef.current++;
    setRound(r => r + 1);
  };

  return (
    <div className="space-y-4">
      {/* 子分类 */}
      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map(t => (
          <CandyButton
            key={t.id}
            tone={sub === t.id ? 'orange' : 'yellow'}
            variant={sub === t.id ? 'solid' : 'soft'}
            size="sm"
            onClick={() => switchSub(t.id)}
          >
            {t.emoji} {t.label}
          </CandyButton>
        ))}
      </div>

      {/* 难度 */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {([1, 2, 3] as Difficulty[]).map(d => (
            <CandyButton
              key={d}
              tone={diff === d ? 'green' : 'purple'}
              variant={diff === d ? 'solid' : 'soft'}
              size="sm"
              onClick={() => switchDiff(d)}
            >
              {d === 1 ? '启蒙' : d === 2 ? '进阶' : '挑战'}
            </CandyButton>
          ))}
        </div>
        <AdaptiveDifficultyHint meta={diffMeta} />
      </div>

      {/* 答题 */}
      <Panel>
        <PanelTitle emoji={SUB_TABS.find(t => t.id === sub)!.emoji} title={`${SUB_TABS.find(t => t.id === sub)!.label}练习`} subtitle="5 题一轮" tone="orange" />
        <RoundRunner
          key={`${sub}-${diff}-${round}`}
          makeQuestion={make}
          difficulty={diff}
          questionsPerRound={5}
          onRoundStart={diffMeta.syncNow}
          onAnswered={handleAnswer}
          tone="orange"
        />
      </Panel>
    </div>
  );
}
