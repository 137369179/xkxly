import { useMemo, useState, useEffect } from 'react';
import { WorksheetGenerator } from '@/components/WorksheetGenerator';
import { useStore, useProgress } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { dateKey } from '@/lib/dailyPlan';
import {
  touchedCount,
  masteredCount,
  masteryRate,
  weakSkills,
  skillLabel,
  LEVEL_TEXT,
  levelColor,
  dueText,
} from '@/lib/srs';
import POEMS from '@/data/poems';
import { TONE_STYLE } from '@/lib/tones';
import { PageHeader, Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { StudyTimeChart, MasteryRadar, WrongDistribution, StudyHeatmap } from '@/components/charts/StudyCharts';
import { AnalyticsInsight } from '@/components/charts/AnalyticsInsight';
import { GrowthTrend, SubjectBalance, StudyTips } from '@/components/charts/ParentEnhance';
import { StudyCalendar } from '@/components/StudyCalendar';
import { ReportExporter } from '@/components/ReportExporter';
import { WeekCompare } from '@/components/WeekCompare';
import { PdfExport } from '@/components/PdfExport';
import { Leaderboard } from '@/components/Leaderboard';
import { ChainDashboard } from '@/components/ChainDashboard';
import { ParentAdvicePanel } from '@/components/ParentAdvicePanel';
import { LearningCoach } from '@/components/LearningPath';
import { StudyReminder } from '@/components/StudyReminder';
import VoiceSettings from './VoiceSettings';
import { AiReport, WrongAnalyzeCard } from './ParentSections';
import {
  hashPin,
  verifyPin,
  isLocked,
  lockRemaining,
  formatLock,
  isLegacyPin,
  PIN_FAIL_LIMIT,
} from '@/lib/pin';
import { navigate } from '@/lib/router';
import { openTraining, skillToTarget } from '@/lib/skillRouting';
import { useTranslation } from '@/i18n/useTranslation';
import { ParentPosterSection } from './ParentPosterSection';
import { ParentBackupSection } from './ParentBackupSection';
import { ParentSettingsSection } from './ParentSettingsSection';
import { ParentPrivacySection } from './ParentPrivacySection';
import { ParentTtsDiagPanel } from './ParentTtsDiagPanel';
import { ParentAiLogsPanel } from './ParentAiLogsPanel';
import { ParentTodayLogPanel } from './ParentTodayLogPanel';
import { ScreenTimeReport } from './ScreenTimePanel';

const poemTitle = (id: string) => POEMS.find((p) => p.id === id)?.title;

export default function ParentPage() {
  const { t: translate } = useTranslation();
  const progress = useProgress();
  const settings = useSettingsStore((s) => s.settings);
  const setParentPin = useStore((s) => s.setParentPin);
  const recordPinFail = useStore((s) => s.recordPinFail);
  const recordPinSuccess = useStore((s) => s.recordPinSuccess);
  const clearPin = useStore((s) => s.clearPin);

  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [setMode, setSetMode] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [pinError, setPinError] = useState('');
  const [now, setNow] = useState(Date.now());

  // 锁定倒计时刷新
  useEffect(() => {
    if (!settings.parentPin || unlocked) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [settings.parentPin, unlocked]);

  const weak = useMemo(() => weakSkills(progress, 8), [progress]);
  const grid = useMemo(
    () =>
      Object.entries(progress.mastery).map(([skill, m]) => ({ skill, m })),
    [progress.mastery],
  );

  /* —— 未设置密码：引导设置 —— */
  if (!settings.parentPin) {
    if (setMode) {
      return (
        <div className="space-y-5">
          <PageHeader emoji="👨‍👩‍👧" title={translate('parent.title')} subtitle={translate('parent.setPinSubtitle')} tone="green" />
          <Panel className="text-center">
            <p className="mb-4 text-base font-bold text-ink-soft">{translate('parent.pinSetupDesc')}</p>
            <p className="mb-2 text-xs font-bold text-ink-soft">
              {translate('parent.pinNoticePrefix')}<b>{translate('parent.touchGuard')}</b>{translate('parent.pinNoticeSuffix')}
            </p>
            <input
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="●●●●"
              className="mx-auto mb-5 block w-40 rounded-2xl border-4 border-candy-green-soft bg-white px-4 py-3 text-center text-3xl font-extrabold tracking-[0.5em] text-candy-green-deep outline-none"
            />
            <CandyButton
              tone="green"
              size="lg"
              fullWidth
              disabled={newPin.length !== 4}
              onClick={async () => {
                const hash = await hashPin(newPin);
                setParentPin(hash);
                setUnlocked(true);
                setSetMode(false);
                setNewPin('');
              }}
            >
              {translate('common.save')}
            </CandyButton>
            <button onClick={() => setSetMode(false)} className="mt-3 text-sm font-bold text-ink-soft">
              {translate('common.back')}
            </button>
          </Panel>
        </div>
      );
    }
    return (
      <div className="space-y-5">
        <PageHeader emoji="👨‍👩‍👧" title={translate('parent.title')} subtitle={translate('parent.growthSubtitle')} tone="green" />
        <Panel className="text-center">
          <div className="text-6xl">🔐</div>
          <p className="mt-3 text-base font-bold text-ink-soft">{translate('parent.introDesc')}</p>
          <div className="mt-5">
            <CandyButton tone="green" size="lg" fullWidth onClick={() => setSetMode(true)}>
              {translate('parent.setPinAction')}
            </CandyButton>
          </div>
        </Panel>
      </div>
    );
  }

  /* —— 已设置但未解锁：验证 —— */
  if (!unlocked) {
    const locked = isLocked(settings.pinFails, settings.pinLockUntil, now);
    const remain = lockRemaining(settings.pinLockUntil, now);
    const legacy = isLegacyPin(settings.parentPin);
    const canSubmit = pinInput.length === 4 && !locked && !verifying;
    return (
      <div className="space-y-5">
        <PageHeader emoji="👨‍👩‍👧" title={translate('parent.title')} subtitle={translate('parent.enterPin')} tone="green" />
        <Panel className="text-center">
          <div className="text-6xl">🔐</div>
          <input
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
              setPinError('');
            }}
            inputMode="numeric"
            placeholder="●●●●"
            disabled={locked}
            className="mx-auto my-4 block w-40 rounded-2xl border-4 border-candy-green-soft bg-white px-4 py-3 text-center text-3xl font-extrabold tracking-[0.5em] text-candy-green-deep outline-none disabled:opacity-50"
          />
          <p className="mb-1 text-xs font-bold text-ink-soft">
            {translate('parent.lockNoticePrefix')}<b>{translate('parent.touchGuard')}</b>{translate('parent.lockNoticeSuffix')}
          </p>
          {locked ? (
            <div className="space-y-3">
              <p className="text-sm font-bold text-candy-orange-deep">
                🔒 {translate('parent.lockTooMany', { time: formatLock(remain) })}
              </p>
              <button
                onClick={() => {
                  clearPin();
                  setSetMode(false);
                  setPinInput('');
                  setPinError('');
                }}
                className="text-xs font-bold text-ink-soft underline"
              >
                {translate('parent.forgotPin')}
              </button>
            </div>
          ) : (
            <>
              <CandyButton
                tone="green"
                size="lg"
                fullWidth
                disabled={!canSubmit}
                onClick={async () => {
                  setVerifying(true);
                  setPinError('');
                  try {
                    const ok = await verifyPin(pinInput, settings.parentPin);
                    if (ok) {
                      recordPinSuccess();
                      setUnlocked(true);
                      setPinInput('');
                      // 旧明文 PIN 升级为哈希
                      if (legacy) {
                        const hash = await hashPin(pinInput);
                        setParentPin(hash);
                      }
                    } else {
                      recordPinFail();
                      setPinError(translate('parent.pinWrong'));
                      setPinInput('');
                    }
                  } catch {
                    setPinError(translate('parent.pinVerifyFail'));
                  } finally {
                    setVerifying(false);
                  }
                }}
              >
                {verifying ? translate('parent.verifying') : translate('parent.enter')}
              </CandyButton>
              {pinError && (
                <p className="mt-3 text-sm font-bold text-candy-orange-deep">{pinError}</p>
              )}
              {settings.pinFails > 0 && !pinError && (
                <p className="mt-3 text-xs font-bold text-ink-soft">
                  {translate('parent.pinFailsNotice', { count: settings.pinFails, limit: PIN_FAIL_LIMIT })}
                </p>
              )}
              <button
                onClick={() => {
                  clearPin();
                  setSetMode(false);
                  setPinInput('');
                  setPinError('');
                }}
                className="mt-3 text-xs font-bold text-ink-soft underline"
              >
                {translate('parent.forgotPin')}
              </button>
            </>
          )}
        </Panel>
      </div>
    );
  }

  /* —— 已解锁：仪表盘 —— */
  return (
    <div className="space-y-5">
      <PageHeader emoji="👨‍👩‍👧" title={translate('parent.title')} subtitle={translate('parent.dashboardSubtitle')} tone="green" />

      {/* 海报生成入口 */}
      <ParentPosterSection />

      {/* 智能可打印练习册生成器 */}
      <WorksheetGenerator />

      {/* 概览 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: translate('parent.touched'), value: touchedCount(progress), tone: 'blue' as const },
          { label: translate('parent.mastered'), value: masteredCount(progress), tone: 'green' as const },
          { label: translate('parent.masteryRate'), value: `${Math.round(masteryRate(progress) * 100)}%`, tone: 'purple' as const },
          { label: translate('parent.todayPractice'), value: progress.dailyLog[dateKey()]?.items ?? 0, tone: 'orange' as const },
        ].map((c) => {
          const t = TONE_STYLE[c.tone]!;
          return (
            <div key={c.label} className="card-candy flex flex-col items-center gap-1 p-4 text-center" style={{ background: t.soft }}>
              <span className="text-3xl font-extrabold tabular-nums" style={{ color: t.deep }}>
                {c.value}
              </span>
              <span className="text-xs font-bold" style={{ color: t.deep }}>
                {c.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* 研究乐园（F4：行为量 + 笔记，零正确率，R8 缓解文案必放顶部） */}
      <Panel>
        <PanelTitle emoji="🔬" title={translate('research.parentBlock.title')} subtitle={translate('research.parentBlock.subtitle')} tone="blue" />
        <p className="mb-3 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold leading-relaxed text-ink-soft">
          {translate('research.parentBlock.r8Hint')}
        </p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: translate('research.growthBlock.explored'), value: `${progress.researchStats?.topicsExplored.length ?? 0}`, emoji: '🗺️' },
            { label: translate('research.growthBlock.actions'), value: `${progress.researchStats?.exploreActions ?? 0}`, emoji: '🔍' },
            { label: translate('research.gallery.savedCards'), value: `${progress.discoveries?.length ?? 0}`, emoji: '⭐' },
            { label: translate('research.gallery.notes'), value: `${Object.keys(progress.researchNotes ?? {}).length}`, emoji: '📝' },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl bg-blue-50 px-1 py-2">
              <div className="text-lg">{c.emoji}</div>
              <div className="mt-0.5 text-base font-black tabular-nums text-candy-blue-deep">{c.value}</div>
              <div className="mt-0.5 text-[10px] font-bold text-ink-soft">{c.label}</div>
            </div>
          ))}
        </div>
        {Object.entries(progress.researchNotes ?? {}).filter(([, v]) => v?.trim()).length > 0 && (
          <div className="mt-3 space-y-1.5">
            {Object.entries(progress.researchNotes ?? {})
              .filter(([, v]) => v?.trim())
              .slice(0, 4)
              .map(([topicId, text]) => (
                <div key={topicId} className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2">
                  <span className="text-base">{['🔬', '🗺️', '📝', '✨'][topicId.length % 4]}</span>
                  <p className="text-xs font-bold leading-relaxed text-ink">{text}</p>
                </div>
              ))}
          </div>
        )}
        <div className="mt-3">
          <CandyButton tone="blue" size="sm" onClick={() => navigate('discoveries')}>
            ⭐ {translate('research.gallery.entry')}
          </CandyButton>
        </div>
      </Panel>

      {/* AI 学情分析 */}
      <AiReport progress={progress} />

      {/* 学习统计图表 */}
      <Panel>
        <PanelTitle emoji="📊" title={translate('parent.statsTitle')} tone="blue" />
        <div className="space-y-4">
          <StudyTimeChart />
          <MasteryRadar />
          <WrongDistribution />
          <StudyHeatmap />
        </div>
      </Panel>

      {/* 学习行为分析洞察（规格二十三：活跃度/连续/周偏好/AI 互动/总览） */}
      <Panel>
        <PanelTitle
          emoji="🧭"
          title={translate('parent.insightTitle')}
          subtitle={translate('parent.insightSubtitle')}
          tone="purple"
        />
        <AnalyticsInsight />
      </Panel>

      {/* 报告增强：趋势 / 均衡 / 建议 */}
      <GrowthTrend />
      <SubjectBalance onPracticeSubject={(s) => navigate('today', s)} />
      <StudyTips onPracticeSubject={(s) => navigate('today', s)} />

      {/* 学习日历热力图 */}
      <StudyCalendar />
      <WeekCompare />

      {/* 掌握度热力图 */}
      <Panel>
        <PanelTitle emoji="🔥" title={translate('parent.heatmapTitle')} subtitle={translate('parent.heatmapSubtitle')} tone="blue" />
        {grid.length === 0 ? (
          <p className="py-2 text-center text-sm font-bold text-ink-soft">{translate('parent.noLearningYet')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {grid.map(({ skill, m }) => (
              <div
                key={skill}
                title={`${skillLabel(skill, poemTitle)} · ${LEVEL_TEXT[m.lv]}`}
                className="h-7 w-7 rounded-lg"
                style={{ background: levelColor(m.lv) }}
              />
            ))}
          </div>
        )}
      </Panel>

      {/* 薄弱知识点 */}
      <Panel>
        <PanelTitle emoji="💡" title={translate('parent.weakTitle')} subtitle={translate('parent.weakSubtitle')} tone="orange" />
        {weak.length === 0 ? (
          <p className="py-2 text-center text-sm font-bold text-ink-soft">{translate('parent.noWeak')}</p>
        ) : (
          <div className="space-y-2">
            {weak.map(({ skill, m }) => {
              const t = TONE_STYLE[skill.split(':')[0] as keyof typeof TONE_STYLE] ?? TONE_STYLE.purple;
              const target = skillToTarget(skill);
              return (
                <div key={skill} className="flex items-center gap-3 rounded-2xl bg-white/70 p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-extrabold" style={{ background: t.soft, color: t.deep }}>
                    {LEVEL_TEXT[m.lv]![0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-extrabold text-ink">{skillLabel(skill, poemTitle)}</div>
                    <div className="text-xs font-bold text-ink-soft">
                      {translate('parent.weakDetail', { wrong: m.ng, right: m.ok, due: dueText(m) })}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full px-3 py-1 text-xs font-extrabold" style={{ background: t.soft, color: t.deep }}>
                    {LEVEL_TEXT[m.lv]}
                  </span>
                  {target && (
                    <button
                      onClick={() => openTraining(skill)}
                      className="shrink-0 rounded-full bg-candy-orange-soft px-3 py-1 text-xs font-extrabold text-candy-orange-deep transition hover:brightness-105 active:scale-95"
                    >
                      🎯 去练习
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* v6: AI 错题分析 */}
      <WrongAnalyzeCard progress={progress} />

      {/* 报告导出 */}
      <ReportExporter />
      <PdfExport />
      <Leaderboard />

      <ChainDashboard />

      {/* AI 教练点评（个性化学习路径 · 家长视角） */}
      <LearningCoach />

      <ParentAdvicePanel />
      <StudyReminder />

      {/* 设置 */}
      <ParentSettingsSection />

      {/* 朗读设置（音色 / 语速 / 多音字纠音） */}
      <VoiceSettings />

      {/* 语音引擎诊断（家长诊断工具，PIN 解锁后可见） */}
      <ParentTtsDiagPanel />

      {/* AI 调用日志 */}
      <ParentAiLogsPanel />

      {/* 今日学习日志 */}
      <ParentTodayLogPanel />

      {/* 屏幕时间报告 */}
      <ScreenTimeReport />

      {/* 数据备份与恢复 */}
      <ParentBackupSection />

      {/* 隐私与数据管理（P0-1/P0-3：声明 / 同意 / 留存 / 清除） */}
      <ParentPrivacySection />

      <button onClick={() => setUnlocked(false)} className="mx-auto block text-sm font-bold text-ink-soft">
        {translate('parent.exit')}
      </button>
    </div>
  );
}
