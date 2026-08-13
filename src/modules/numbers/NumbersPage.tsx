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
import { useTranslation } from '@/i18n/useTranslation';


type TabId = 'wall' | 'math' | 'extra' | 'speed' | 'ladder' | 'run' | 'tenframe' | 'word' | 'count' | 'trace' | 'vertical' | 'shape' | 'clock' | 'measure' | 'skip' | 'fraction' | 'money';


export default function NumbersPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>('wall');

  return (
    <div>
      <PageHeader
        emoji="🔢"
        title={t('numbersPage.title')}
        subtitle={t('numbersPage.subtitle')}
        tone="yellow"
      />

      <Tabs<TabId>
        tone="yellow"
        layoutId="numbers-tabs"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'wall', label: t('numbersPage.tabWall'), emoji: '💯' },
          { id: 'tenframe', label: t('numbersPage.tabTenframe'), emoji: '🥕' },

          { id: 'math', label: t('numbersPage.tabMath'), emoji: '➕' },
          { id: 'extra', label: t('numbersPage.tabExtra'), emoji: '✖️' },
          { id: 'speed', label: t('numbersPage.tabSpeed'), emoji: '⚡' },
          { id: 'ladder', label: t('numbersPage.tabLadder'), emoji: '🪜' },
          { id: 'run', label: t('numbersPage.tabRun'), emoji: '🐇' },
          { id: 'vertical', label: t('numbersPage.tabVertical'), emoji: '📝' },
          { id: 'shape', label: t('numbersPage.tabShape'), emoji: '📐' },
          { id: 'clock', label: t('numbersPage.tabClock'), emoji: '⏰' },
          { id: 'measure', label: t('numbersPage.tabMeasure'), emoji: '📐' },
          { id: 'skip', label: t('numbersPage.tabSkip'), emoji: '🔢' },
          { id: 'fraction', label: t('numbersPage.tabFraction'), emoji: '🍕' },
          { id: 'money', label: t('numbersPage.tabMoney'), emoji: '💰' },
          { id: 'word', label: t('numbersPage.tabWord'), emoji: '📐' },
          { id: 'count', label: t('numbersPage.tabCount'), emoji: '🍎' },
          { id: 'trace', label: t('numbersPage.tabTrace'), emoji: '✍️' },
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
