import { useState } from 'react';
import { navigate } from '@/lib/router';
import { useProgress } from '@/store/useStore';
import { masteredCount } from '@/lib/englishCurriculum';
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
  const [tab, setTab] = useState<TabId>('wall');
  const progress = useProgress();
  const { t } = useTranslation();
  const lettersDone = masteredCount(progress, 'letter:');
  const unlockedPhonics = lettersDone >= 8;

  return (
    <div>
      <PageHeader
        iconType="phonics"
        title={t('letters.title')}
        subtitle={t('letters.subtitle')}
        tone="blue"
      />

      {unlockedPhonics && (
        <button
          onClick={() => navigate('words')}
          className="w-full rounded-2xl border-4 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 p-3 text-left transition-all hover:bg-purple-100 active:translate-y-[1px]"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div className="flex-1">
              <p className="text-sm font-black text-purple-900">{t('letters.phonicsUnlockTitle')}</p>
              <p className="text-xs font-bold text-purple-600">{t('letters.phonicsUnlockDesc', { n: lettersDone })}</p>
            </div>
            <span className="text-xl">→</span>
          </div>
        </button>
      )}

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
