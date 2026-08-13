import { useTranslation } from '@/i18n/useTranslation';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';
import { navigate } from '@/lib/router';

export function ParentTtsDiagPanel() {
  const { t: translate } = useTranslation();
  return (
    <Panel>
      <PanelTitle emoji="🎙️" title={translate('parent.ttsDiagTitle')} subtitle={translate('parent.ttsDiagDesc')} tone="purple" />
      <div className="flex flex-wrap gap-2">
        <CandyButton
          tone="purple"
          size="md"
          onClick={() => { sfxTap(); navigate('ttstest'); }}
        >
          🎙️ {translate('parent.ttsDiagOpen')}
        </CandyButton>
      </div>
    </Panel>
  );
}
