import { useTranslation } from '@/i18n/useTranslation';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useActiveProfileMeta } from '@/store/useProfilesStore';
import { dateKey } from '@/lib/dailyPlan';
import { Panel, PanelTitle } from '@/components/ui/Card';

function StatTile({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-pink-100 bg-white/80 px-3 py-4 text-center shadow-sm">
      <span className="text-3xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="text-2xl font-extrabold text-ink">{value}</span>
      <span className="text-xs font-bold text-ink-soft">{label}</span>
    </div>
  );
}

function GuardRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="font-extrabold text-ink">{value}</span>
    </li>
  );
}

/**
 * 家长学习报告面板（E1）· 复用既有护眼/时长/进度数据源，零新增依赖。
 * - 学习概览：今日时长 / 星星 / 连续天数 / 徽章 / 已熟练 / 接触知识点 / 正确率
 * - 护眼守护：护眼模式 · 护眼提醒间隔 · 每日时长上限
 * 数据来自 useStore.progress（与 studyClock 同源读取）、useSettingsStore、useActiveProfileMeta，
 * 全部为已提交干净模块，不触碰任何用户 WIP 文件。
 */
export function LearningReportPanel() {
  const { t: translate } = useTranslation();
  const meta = useActiveProfileMeta();
  const childName = meta?.name || translate('parent.childName');

  const todaySec = useStore((s) => s.progress.dailyLog[dateKey()]?.sec ?? 0);
  const stars = useStore((s) => s.progress.stars);
  const streak = useStore((s) => s.progress.streak);
  const badges = useStore((s) => s.progress.badges);
  const mathCorrect = useStore((s) => s.progress.mathCorrect);
  const mathTotal = useStore((s) => s.progress.mathTotal);
  const mastery = useStore((s) => s.progress.mastery);
  const lettersHeard = useStore((s) => s.progress.lettersHeard);
  const numbersHeard = useStore((s) => s.progress.numbersHeard);
  const poemsRead = useStore((s) => s.progress.poemsRead);

  const eyeCareMode = useSettingsStore((s) => s.settings.eyeCareMode);
  const eyeCareMin = useSettingsStore((s) => s.settings.eyeCareMin);
  const dailyLimitMin = useSettingsStore((s) => s.settings.dailyLimitMin);

  const mathRate = mathTotal > 0 ? Math.round((mathCorrect / mathTotal) * 100) : 0;
  const masteryCount = mastery ? Object.keys(mastery).length : 0;
  const touchedCount =
    (lettersHeard?.length ?? 0) + (numbersHeard?.length ?? 0) + (poemsRead?.length ?? 0);
  const todayMin = Math.max(0, Math.round((todaySec ?? 0) / 60));

  const hasData = stars > 0 || todaySec > 0 || masteryCount > 0 || badges?.length > 0;

  return (
    <Panel>
      <PanelTitle
        emoji="📊"
        title={translate('parent.report')}
        subtitle={translate('parent.dashboardSubtitle')}
        tone="blue"
      />
      {!hasData && (
        <p className="mb-4 rounded-2xl bg-pink-50 px-4 py-3 text-sm font-bold text-ink-soft">
          {translate('parent.noLearningYet')}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          emoji="⏱️"
          label={translate('parent.todayPractice')}
          value={translate('common.minutes', { count: todayMin })}
        />
        <StatTile emoji="⭐" label={translate('common.star')} value={String(stars)} />
        <StatTile emoji="🔥" label={translate('common.days')} value={String(streak)} />
        <StatTile emoji="🏅" label={translate('parent.badges')} value={String(badges?.length ?? 0)} />
        <StatTile emoji="🌟" label={translate('parent.mastered')} value={String(masteryCount)} />
        <StatTile emoji="📚" label={translate('parent.touched')} value={String(touchedCount)} />
        <StatTile emoji="✅" label={translate('parent.accuracy')} value={`${mathRate}%`} />
      </div>

      <div className="mt-5 rounded-2xl border-2 border-purple-100 bg-purple-50/60 p-4">
        <div className="mb-2 text-sm font-extrabold text-ink">{translate('parent.eyeCare')}</div>
        <ul className="space-y-1.5 text-sm font-bold text-ink-soft">
          <GuardRow
            label={translate('parent.eyeCareMode')}
            value={eyeCareMode ? translate('common.on') : translate('common.close')}
          />
          <GuardRow
            label={translate('parent.eyeCareInterval')}
            value={
              eyeCareMin > 0 ? translate('common.minutes', { count: eyeCareMin }) : translate('common.close')
            }
          />
          <GuardRow
            label={translate('parent.dailyLimit')}
            value={
              dailyLimitMin > 0
                ? translate('common.minutes', { count: dailyLimitMin })
                : translate('parent.noLimit')
            }
          />
        </ul>
      </div>
      <p className="mt-3 text-xs font-bold text-ink-soft">
        {translate('parent.growthSubtitle')} · {childName}
      </p>
    </Panel>
  );
}
