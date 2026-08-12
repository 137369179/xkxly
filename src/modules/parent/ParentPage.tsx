import { useMemo, useState, useEffect, useRef } from 'react';
import { WorksheetGenerator } from '@/components/WorksheetGenerator';
import { useStore, useProgress } from '@/store/useStore';
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
import { ProgressBar } from '@/components/ui/ProgressBar';
import { aiLogs, onAiLog } from '@/lib/ai/client';
import type { AiLogEntry } from '@/lib/ai/types';
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
import { AiReport, WrongAnalyzeCard, Stat } from './ParentSections';
import { generateAchievementPoster } from '@/lib/posterGenerator';
import {
  hashPin,
  verifyPin,
  isLocked,
  lockRemaining,
  formatLock,
  isLegacyPin,
  PIN_FAIL_LIMIT,
} from '@/lib/pin';
import {
  buildBackup,
  parseBackup,
  downloadBackup,
  readBackupFile,
  type BackupPayload,
} from '@/lib/backup';
import { navigate } from '@/lib/router';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap } from '@/lib/sfx';
import { useProfilesStore } from '@/store/useProfilesStore';

const poemTitle = (id: string) => POEMS.find((p) => p.id === id)?.title;

const LIMITS = [0, 15, 30, 45, 60];
const EYE = [0, 15, 20, 30];

export default function ParentPage() {
  const { t: translate } = useTranslation();
  const progress = useProgress();
  const settings = useStore((s) => s.settings);
  const setParentPin = useStore((s) => s.setParentPin);
  const recordPinFail = useStore((s) => s.recordPinFail);
  const recordPinSuccess = useStore((s) => s.recordPinSuccess);
  const clearPin = useStore((s) => s.clearPin);
  const restoreProgress = useStore((s) => s.restoreProgress);
  const setDailyLimit = useStore((s) => s.setDailyLimit);
  const setEyeCare = useStore((s) => s.setEyeCare);
  const setVoiceGuide = useStore((s) => s.setVoiceGuide);

  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [setMode, setSetMode] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [pinError, setPinError] = useState('');
  const [now, setNow] = useState(Date.now());

  // 成果海报状态
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);

  // 备份导入状态
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState<BackupPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 锁定倒计时刷新
  useEffect(() => {
    if (!settings.parentPin || unlocked) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [settings.parentPin, unlocked]);

  // 卸载时清理 importMsg 定时器
  useEffect(() => () => {
    if (importMsgTimerRef.current) clearTimeout(importMsgTimerRef.current);
  }, []);

  const weak = useMemo(() => weakSkills(progress, 8), [progress]);
  const grid = useMemo(
    () =>
      Object.entries(progress.mastery).map(([skill, m]) => ({ skill, m })),
    [progress.mastery],
  );
  const todayLog = progress.dailyLog[dateKey()];

  // AI 调用日志（订阅服务层，家长可查最近与小智的对话）
  const [logs, setLogs] = useState<readonly AiLogEntry[]>(() => aiLogs());
  useEffect(() => onAiLog(() => setLogs(aiLogs())), []);

  const handleGeneratePoster = async () => {
    setIsGeneratingPoster(true);
    try {
      const url = await generateAchievementPoster({
        progress,
        childName: '宝贝',
        aiRemark: '学习专注度极高，古诗与数学表现突出，继续加油哦！',
      });
      setPosterUrl(url);
    } catch (e) {
      if (import.meta.env.DEV) console.error('Poster gen error:', e);
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  /* —— 备份导出 —— */
  const handleExport = () => {
    const payload = buildBackup(progress, settings);
    downloadBackup(payload);
    setImportMsg({ ok: true, text: translate('parent.backupDownloaded') });
    if (importMsgTimerRef.current) clearTimeout(importMsgTimerRef.current);
    importMsgTimerRef.current = setTimeout(() => setImportMsg(null), 4000);
  };

  /* —— 备份导入：读取文件 → 校验 → 弹确认 —— */
  const handleFilePicked = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readBackupFile(file);
      const payload = parseBackup(text);
      if (!payload) {
        setImportMsg({ ok: false, text: translate('parent.backupInvalid') });
        return;
      }
      setShowImportConfirm(payload);
    } catch {
      setImportMsg({ ok: false, text: translate('parent.backupReadFail') });
    }
  };

  /* —— 确认导入：覆盖当前进度 —— */
  const handleConfirmImport = () => {
    if (!showImportConfirm) return;
    restoreProgress(showImportConfirm.progress);
    const date = new Date(showImportConfirm.exportedAt).toLocaleDateString('zh-CN');
    setShowImportConfirm(null);
    setImportMsg({ ok: true, text: translate('parent.backupRestored', { date }) });
    if (importMsgTimerRef.current) clearTimeout(importMsgTimerRef.current);
    importMsgTimerRef.current = setTimeout(() => setImportMsg(null), 6000);
  };

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
      <Panel className="bg-gradient-to-r from-candy-purple-soft via-candy-blue-soft to-candy-green-soft">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-ink-main flex items-center gap-2">
              {translate('parent.posterTitle')}
            </h3>
            <p className="text-xs font-bold text-ink-soft mt-1">
              {translate('parent.posterDesc')}
            </p>
          </div>
          <CandyButton
            tone="purple"
            size="md"
            onClick={handleGeneratePoster}
            disabled={isGeneratingPoster}
          >
            {isGeneratingPoster ? translate('parent.posterGenerating') : translate('parent.posterGenerate')}
          </CandyButton>

        </div>
      </Panel>

      {/* 智能可打印练习册生成器 */}
      <WorksheetGenerator />




      {/* 概览 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: translate('parent.touched'), value: touchedCount(progress), tone: 'blue' as const },
          { label: translate('parent.mastered'), value: masteredCount(progress), tone: 'green' as const },
          { label: translate('parent.masteryRate'), value: `${Math.round(masteryRate(progress) * 100)}%`, tone: 'purple' as const },
          { label: translate('parent.todayPractice'), value: todayLog?.items ?? 0, tone: 'orange' as const },
        ].map((c) => {
          const t = TONE_STYLE[c.tone]!
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

      {/* 朗读设置（音色 / 语速 / 多音字纠音） */}
      <VoiceSettings />

      {/* 语音引擎诊断（家长诊断工具，PIN 解锁后可见） */}
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

      {/* AI 调用日志 */}
      <Panel>
        <PanelTitle emoji="🤖" title={translate('parent.aiLogsTitle')} subtitle={translate('parent.aiLogsSubtitle')} tone="purple" />
        {logs.length === 0 ? (
          <p className="py-2 text-center text-sm font-bold text-ink-soft">{translate('parent.noAiLogs')}</p>
        ) : (
          <div className="space-y-1.5">
            {logs.slice(0, 12).map((e, i) => (
              <div key={`e-${i}`} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold">
                <span className="shrink-0 rounded-full bg-candy-purple-soft px-2 py-0.5 text-candy-purple-deep">{e.scene}</span>
                <span className={e.ok ? 'text-emerald-700' : 'text-rose-600'}>{e.ok ? (e.cached ? translate('parent.cacheHit') : translate('parent.aiOk')) : translate('parent.aiFail')}</span>
                <span className="text-ink-soft">{e.ms}ms</span>
                {e.model && e.model !== 'cache' && <span className="text-ink-soft/70">{e.model}</span>}
                {e.errCode && <span className="text-rose-500">{e.errCode}</span>}
                <span className="ml-auto text-ink-soft/70">
                  {new Date(e.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* 今日学习日志 */}
      {todayLog && (
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
      )}

      {/* 海报预览模态框 */}
      {posterUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] flex-col items-center overflow-hidden rounded-3xl bg-white p-4 shadow-2xl">
            <h3 className="mb-2 text-xl font-extrabold text-ink-main">{translate('parent.posterCardTitle')}</h3>
            <div className="max-h-[70vh] overflow-y-auto rounded-2xl border-2 border-candy-purple/30">
              <img src={posterUrl} alt={translate('parent.posterAlt')} loading="lazy" decoding="async" className="h-auto w-[320px] rounded-xl sm:w-[420px]" />
            </div>
            <div className="mt-4 flex w-full gap-3">
              <a
                href={posterUrl}
                download="宝贝学习成果海报.png"
                className="flex-1 rounded-2xl bg-candy-purple py-2.5 text-center font-extrabold text-white shadow-md hover:bg-candy-purple-deep transition-colors"
              >
                {translate('parent.downloadPoster')}
              </a>
              <button
                onClick={() => setPosterUrl(null)}
                className="rounded-2xl bg-cream-dark px-5 py-2.5 font-bold text-ink-soft hover:bg-candy-yellow"
              >
                {translate('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 数据备份与恢复 */}
      <Panel>
        <PanelTitle emoji="💾" title={translate('parent.backupTitle')} subtitle={translate('parent.backupSubtitle')} tone="blue" />
        <div className="space-y-3">
          <p className="text-xs font-bold text-ink-soft">
            {translate('parent.backupDesc')}
          </p>
          <div className="flex flex-wrap gap-2">
            <CandyButton tone="blue" size="sm" onClick={handleExport}>
              {translate('parent.exportBackup')}
            </CandyButton>
            <CandyButton
              tone="purple"
              variant="soft"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              {translate('parent.importRestore')}
            </CandyButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                void handleFilePicked(f);
                // 重置 value 允许重复选同一文件
                e.target.value = '';
              }}
            />
          </div>
          {importMsg && (
            <p
              className={`text-sm font-bold ${importMsg.ok ? 'text-candy-green-deep' : 'text-candy-orange-deep'}`}
            >
              {importMsg.ok ? '✅ ' : '⚠️ '}
              {importMsg.text}
            </p>
          )}
        </div>
      </Panel>

      {/* 导入确认弹窗 */}
      {showImportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <h3 className="mb-2 text-lg font-extrabold text-ink-main">{translate('parent.confirmRestore')}</h3>
            <p className="mb-4 text-sm font-bold text-ink-soft">
              {translate('parent.restoreWarn1')}
              <span className="text-candy-orange-deep">{translate('parent.restoreWarnStrong')}</span>
              {translate('parent.restoreWarn2')}
            </p>
            <p className="mb-4 text-xs font-bold text-ink-soft">
              {translate('parent.backupTime')}
              {new Date(showImportConfirm.exportedAt).toLocaleString('zh-CN')}
              <br />
              {translate('parent.backupStars', { stars: showImportConfirm.progress.stars, badges: showImportConfirm.progress.badges.length })}
            </p>
            <div className="flex gap-3">
              <CandyButton tone="orange" size="md" fullWidth onClick={handleConfirmImport}>
                {translate('parent.confirmOverwrite')}
              </CandyButton>
              <button
                onClick={() => setShowImportConfirm(null)}
                className="rounded-2xl bg-cream-dark px-5 py-2.5 font-bold text-ink-soft hover:bg-candy-yellow"
              >
                {translate('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setUnlocked(false)} className="mx-auto block text-sm font-bold text-ink-soft">
        {translate('parent.exit')}
      </button>
    </div>
  );
}

