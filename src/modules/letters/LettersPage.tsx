import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { PageHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { LetterWall } from './LetterWall';
import { MatchGame } from './MatchGame';
import { LetterStudy } from './LetterStudy';
import { LetterTrace } from './LetterTrace';
import { LetterOrder } from './LetterOrder';

type TabId = 'wall' | 'match' | 'study' | 'trace' | 'order';

export default function LettersPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>('wall');

  return (
    <div>
      <PageHeader
        iconType="phonics"
        title={t('letters.title')}
        subtitle={t('letters.subtitle')}
        tone="blue"
      />

      <Tabs<TabId>
        tone="blue"
        layoutId="letters-tabs"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'wall', label: t('letters.tabWall'), emoji: '🌳' },
          { id: 'match', label: t('letters.tabMatch'), emoji: '🧩' },
          { id: 'study', label: t('letters.tabStudy'), emoji: '🎯' },
          { id: 'trace', label: t('letters.tabTrace'), emoji: '✍️' },
          { id: 'order', label: t('letters.tabOrder'), emoji: '🅰️' },
        ]}
      />


      {tab === 'wall' && <LetterWall />}
      {tab === 'match' && <MatchGame />}
      {tab === 'study' && <LetterStudy />}
      {tab === 'trace' && <LetterTrace />}
      {tab === 'order' && <LetterOrder />}
    </div>
  );
}
