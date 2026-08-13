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
import { useTranslation } from '@/i18n/useTranslation';

type SubTab = 'mul' | 'div' | 'shape' | 'time' | 'coin';

const SUB_TABS: { id: SubTab; labelKey: string; emoji: string }[] = [
  { id: 'mul', labelKey: 'mathExtra.subTabs.mul', emoji: '✖️' },
  { id: 'div', labelKey: 'mathExtra.subTabs.div', emoji: '➗' },
  { id: 'shape', labelKey: 'mathExtra.subTabs.shape', emoji: '🔺' },
  { id: 'time', labelKey: 'mathExtra.subTabs.time', emoji: '🕐' },
  { id: 'coin', labelKey: 'mathExtra.subTabs.coin', emoji: '🪙' },
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
  const { t } = useTranslation();
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
        {SUB_TABS.map((tb) => (
          <CandyButton
            key={tb.id}
            tone={sub === tb.id ? 'orange' : 'yellow'}
            variant={sub === tb.id ? 'solid' : 'soft'}
            size="sm"
            onClick={() => switchSub(tb.id)}
          >
            {tb.emoji} {t(tb.labelKey)}
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
              {t(d === 1 ? 'mathExtra.difficulty.1' : d === 2 ? 'mathExtra.difficulty.2' : 'mathExtra.difficulty.3')}
            </CandyButton>
          ))}
        </div>
        <AdaptiveDifficultyHint meta={diffMeta} />
      </div>

      {/* 答题 */}
      <Panel>
        <PanelTitle emoji={SUB_TABS.find((tb) => tb.id === sub)!.emoji} title={`${t(SUB_TABS.find((tb) => tb.id === sub)!.labelKey)}练习`} subtitle="5 题一轮" tone="orange" />
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
