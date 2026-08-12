import { useState } from 'react';
import { PageHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { NumberWall } from './NumberWall';
import { MathQuiz } from './MathQuiz';
import { CountingGame } from './CountingGame';
import { NumberTrace } from './NumberTrace';
import { MathExtra } from './MathExtra';
import { SpeedMath } from './SpeedMath';
import { WordProblems } from './WordProblems';
import { MathLadder } from './MathLadder';
import { VerticalMath } from './VerticalMath';
import { ShapeLearn } from './ShapeLearn';
import { ClockTrainer } from './ClockTrainer';
import { MeasureCompare } from './MeasureCompare';
import { SkipCounting } from './SkipCounting';
import { FractionLearn } from './FractionLearn';
import { MoneyLearn } from './MoneyLearn';
import { RabbitRunMath } from './RabbitRunMath';


import { TenFrameMath } from './TenFrameMath';


type TabId = 'wall' | 'math' | 'extra' | 'speed' | 'ladder' | 'run' | 'tenframe' | 'word' | 'count' | 'trace' | 'vertical' | 'shape' | 'clock' | 'measure' | 'skip' | 'fraction' | 'money';


export default function NumbersPage() {
  const [tab, setTab] = useState<TabId>('wall');

  return (
    <div>
      <PageHeader
        emoji="🔢"
        title="数字王国"
        subtitle="认数字 · 学算术 · 蒙氏十格阵凑十法"
        tone="yellow"
      />

      <Tabs<TabId>
        tone="yellow"
        layoutId="numbers-tabs"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'wall', label: '认数字', emoji: '💯' },
          { id: 'tenframe', label: '凑十法', emoji: '🥕' },

          { id: 'math', label: '加减法', emoji: '➕' },
          { id: 'extra', label: '进阶', emoji: '✖️' },
          { id: 'speed', label: '速算', emoji: '⚡' },
          { id: 'ladder', label: '阶梯', emoji: '🪜' },
          { id: 'run', label: '小兔赛跑', emoji: '🐇' },
          { id: 'vertical', label: '竖式', emoji: '📝' },
          { id: 'shape', label: '图形', emoji: '📐' },
          { id: 'clock', label: '时钟', emoji: '⏰' },
          { id: 'measure', label: '测量', emoji: '📐' },
          { id: 'skip', label: '跳数', emoji: '🔢' },
          { id: 'fraction', label: '分数', emoji: '🍕' },
          { id: 'money', label: '钱币', emoji: '💰' },
          { id: 'word', label: '应用题', emoji: '📐' },
          { id: 'count', label: '数一数', emoji: '🍎' },
          { id: 'trace', label: '描红', emoji: '✍️' },
        ]}
      />

      {tab === 'wall' && <NumberWall />}
      {tab === 'tenframe' && <TenFrameMath />}
      {tab === 'math' && <MathQuiz />}

      {tab === 'extra' && <MathExtra />}
      {tab === 'speed' && <SpeedMath />}
      {tab === 'ladder' && <MathLadder />}
      {tab === 'run' && <RabbitRunMath />}
      {tab === 'word' && <WordProblems />}
      {tab === 'count' && <CountingGame />}
      {tab === 'trace' && <NumberTrace />}
      {tab === 'vertical' && <VerticalMath />}
      {tab === 'shape' && <ShapeLearn />}
      {tab === 'clock' && <ClockTrainer />}
      {tab === 'measure' && <MeasureCompare />}
      {tab === 'skip' && <SkipCounting />}
      {tab === 'fraction' && <FractionLearn />}
      {tab === 'money' && <MoneyLearn />}

    </div>
  );
}
