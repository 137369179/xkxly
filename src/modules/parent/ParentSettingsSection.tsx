import { useTranslation } from '@/i18n/useTranslation';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStore } from '@/store/useStore';
import { useProfilesStore } from '@/store/useProfilesStore';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';
import { LearningReportPanel } from './LearningReportPanel';

const LIMITS = [0, 15, 30, 45, 60];
const EYE = [0, 15, 20, 30];

export function ParentSettingsSection() {
  const { t: translate } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const setDailyLimit = useStore((s) => s.setDailyLimit);
  const setEyeCare = useStore((s) => s.setEyeCare);
  const setVoiceGuide = useStore((s) => s.setVoiceGuide);
  const setEyeCareMode = useSettingsStore((s) => s.setEyeCareMode);

  return (
    <>
    <Panel>
      <PanelTitle emoji="⚙️" title={translate('common.settings')} tone="green" />
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-sm font-extrabold text-ink">{translate('parent.dailyLimit')}</div>
          <div className="flex flex-wrap gap-2">
            {LIMITS.map((m) => (
              <CandyButton
                key={m}
                tone={settings.dailyLimitMin === m ? 'green' : 'purple'}
                variant={settings.dailyLimitMin === m ? 'solid' : 'soft'}
                size="sm"
                onClick={() => setDailyLimit(m)}
              >
                {m === 0 ? translate('parent.noLimit') : translate('common.minutes', { count: m })}
              </CandyButton>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-sm font-extrabold text-ink">{translate('parent.eyeCareInterval')}</div>
          <div className="flex flex-wrap gap-2">
            {EYE.map((m) => (
              <CandyButton
                key={m}
                tone={settings.eyeCareMin === m ? 'green' : 'purple'}
                variant={settings.eyeCareMin === m ? 'solid' : 'soft'}
                size="sm"
                onClick={() => setEyeCare(m)}
              >
                {m === 0 ? translate('common.close') : translate('common.minutes', { count: m })}
              </CandyButton>
            ))}
          </div>
        </div>
        {/* E2 · 护眼模式主开关：暖色滤镜 + 降视觉密度，对标 2026 护眼焦点 */}
        <div>
          <div className="mb-2 text-sm font-extrabold text-ink">{translate('parent.eyeCareMode')}</div>
          <div className="flex flex-wrap gap-2">
            <CandyButton
              tone={settings.eyeCareMode ? 'green' : 'purple'}
              variant={settings.eyeCareMode ? 'solid' : 'soft'}
              size="sm"
              onClick={() => setEyeCareMode(true)}
            >
              {translate('common.on')}
            </CandyButton>
            <CandyButton
              tone={!settings.eyeCareMode ? 'green' : 'purple'}
              variant={!settings.eyeCareMode ? 'solid' : 'soft'}
              size="sm"
              onClick={() => setEyeCareMode(false)}
            >
              {translate('common.close')}
            </CandyButton>
          </div>
          <p className="mt-1 text-xs font-bold text-ink-soft">
            {translate('parent.eyeCareModeDesc')}
          </p>
        </div>
        {/* A2 · 语音引导开关：控制页面/步骤切换时的引导朗读，默认开 */}
        <div>
          <div className="mb-2 text-sm font-extrabold text-ink">{translate('parent.voiceGuide')}</div>
          <div className="flex flex-wrap gap-2">
            <CandyButton
              tone={settings.voiceGuide ? 'green' : 'purple'}
              variant={settings.voiceGuide ? 'solid' : 'soft'}
              size="sm"
              onClick={() => setVoiceGuide(true)}
            >
              {translate('common.on')}
            </CandyButton>
            <CandyButton
              tone={!settings.voiceGuide ? 'green' : 'purple'}
              variant={!settings.voiceGuide ? 'solid' : 'soft'}
              size="sm"
              onClick={() => setVoiceGuide(false)}
            >
              {translate('common.close')}
            </CandyButton>
          </div>
          <p className="mt-1 text-xs font-bold text-ink-soft">
            {translate('parent.voiceGuideDesc')}
          </p>
        </div>
        {/* 自动登录配置：重新打开首启引导，修改孩子名字 / 头像 / 主题色 */}
        <div>
          <div className="mb-2 text-sm font-extrabold text-ink">{translate('onboarding.configTitle')}</div>
          <CandyButton
            tone="purple"
            variant="soft"
            size="sm"
            onClick={() => { sfxTap(); useProfilesStore.getState().reopenOnboarding(); }}
          >
            ⚙️ {translate('onboarding.configBtn')}
          </CandyButton>
          <p className="mt-1 text-xs font-bold text-ink-soft">
            {translate('onboarding.configDesc')}
          </p>
        </div>
      </div>
    </Panel>
    <LearningReportPanel />
    </>
  );
}
