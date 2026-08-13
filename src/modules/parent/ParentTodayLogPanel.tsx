import { useTranslation } from '@/i18n/useTranslation';
import { useProgress } from '@/store/useStore';
import { dateKey } from '@/lib/dailyPlan';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Stat } from './ParentSections';

export function ParentTodayLogPanel() {
  const { t: translate } = useTranslation();
  const progress = useProgress();
  const todayLog = progress.dailyLog[dateKey()];
  if (!todayLog) return null;

  return (
    <Panel>
      <PanelTitle emoji="📅" title={translate('parent.todayStudy')} tone="purple" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={translate('parent.studyDuration')} value={`${Math.round(todayLog.sec / 60)}${translate('common.minutesShort', { count: 0 }).replace('0', '')}`} />
        <Stat label={translate('parent.practiceCount')} value={`${todayLog.items}`} />
        <Stat label={translate('study.correct')} value={`${todayLog.ok}`} />
        <Stat label={translate('parent.starsEarnedLabel')} value={`${todayLog.stars}⭐`} />
      </div>
      <div className="mt-4">
        <ProgressBar value={todayLog.items} max={Math.max(1, todayLog.items)} tone="purple" showLabel />
      </div>
    </Panel>
  );
}
