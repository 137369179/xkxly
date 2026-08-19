/**
 * 家长中心 · 隐私与数据管理（P0-1 / P0-3 合规）
 * ------------------------------------------------------------------
 *  - 隐私与数据说明（收集了什么 / 存在哪 / 是否上传 / 语音告知）
 *  - 父母同意状态显示
 *  - 数据留存说明
 *  - 一键清除全部学习数据（双重确认，防止孩子误触）
 */
import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStore } from '@/store/useStore';
import { useProfilesStore } from '@/store/useProfilesStore';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap } from '@/lib/sfx';
import { safeRemoveItem } from '@/lib/safeStorage';

/** 应用相关的全部持久化 key（清除数据时一并清理） */
const STORAGE_KEYS_TO_CLEAR = [
  'baby-learning-park-v1',          // 主 Store 进度
  'baby-learning-settings',         // 设置
  'baby-learning-park-profiles-v1', // 多孩子档案
  'bb_backup_sign_key_v1',          // 备份签名密钥（一并作废）
  'baby_park_selected_teacher',     // 主讲老师偏好
];

export function ParentPrivacySection() {
  const { t: tr } = useTranslation();
  const privacyAccepted = useSettingsStore((s) => s.settings.privacyAccepted);
  const [confirming, setConfirming] = useState(false);

  /** 一键清除全部学习数据：重置三个 store + 清理 localStorage 键 */
  const handleClearAll = () => {
    sfxTap();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    // 第二层确认，防止误触
    try {
      // 重置运行时状态
      useStore.getState().resetAll();
      useProfilesStore.setState({
        profiles: {},
        meta: {},
        activeProfileId: '',
        initialized: false,
        onboarded: false,
      });
      useSettingsStore.setState({
        settings: {
          ...useSettingsStore.getState().settings,
          privacyAccepted: false,
        },
      });
      // 清理持久化键（含备份签名密钥，作废旧备份签名）
      for (const key of STORAGE_KEYS_TO_CLEAR) safeRemoveItem(key);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Panel>
      <PanelTitle emoji="🛡️" title={tr('privacy.title')} subtitle={tr('privacy.subtitle')} tone="blue" />

      {/* 数据收集说明 */}
      <div className="space-y-3">
        <div className="rounded-2xl bg-blue-50/70 p-3">
          <p className="text-xs font-extrabold text-candy-blue-deep">{tr('privacy.collectTitle')}</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-ink">{tr('privacy.collectDesc')}</p>
        </div>

        {/* 语音采集告知（COPPA 2026：声纹/语音属个人信息） */}
        <div className="rounded-2xl bg-cream-light p-3">
          <p className="text-xs font-extrabold text-candy-orange-deep">{tr('privacy.voiceTitle')}</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-ink">{tr('privacy.voiceFull')}</p>
        </div>

        {/* 留存与删除 */}
        <div className="rounded-2xl bg-candy-green-soft/50 p-3">
          <p className="text-xs font-extrabold text-candy-green-deep">{tr('privacy.retainTitle')}</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-ink">{tr('privacy.retainDesc')}</p>
        </div>

        {/* 父母同意状态 */}
        <div className="flex items-center gap-2 rounded-2xl bg-white/70 p-3">
          <span className="text-lg">{privacyAccepted ? '✅' : '⚠️'}</span>
          <span className="text-xs font-bold text-ink">
            {privacyAccepted ? tr('privacy.consentGiven') : tr('privacy.consentPending')}
          </span>
        </div>

        {/* 清除全部数据（双重确认） */}
        <div className="rounded-2xl border-2 border-candy-red/25 p-3">
          <p className="text-xs font-extrabold text-candy-red">{tr('privacy.clearTitle')}</p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-ink-soft">{tr('privacy.clearDesc')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {confirming ? (
              <>
                <CandyButton tone="red" size="sm" onClick={handleClearAll}>
                  {tr('privacy.clearConfirm')}
                </CandyButton>
                <CandyButton tone="green" variant="soft" size="sm" onClick={() => setConfirming(false)}>
                  {tr('common.cancel')}
                </CandyButton>
              </>
            ) : (
              <CandyButton tone="red" variant="soft" size="sm" onClick={handleClearAll}>
                {tr('privacy.clearBtn')}
              </CandyButton>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
