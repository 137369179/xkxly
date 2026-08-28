import { Suspense, lazy, useEffect } from 'react';
import { useRoute } from '@/lib/router';
import { NAV_MAP } from '@/data/nav';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomTabs } from '@/components/layout/BottomTabs';
import { TopBar } from '@/components/layout/TopBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTtsStore } from '@/store/useTtsStore';
import { useProfilesStore } from '@/store/useProfilesStore';
import { useTranslation } from '@/i18n/useTranslation';
import { startAutoBackup, useBackupDetection } from '@/lib/autoBackup';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { putStorybookContent } from '@/lib/storybookStore';
import { announceToScreenReader } from '@/components/Accessibility';
import { useSoundSync } from '@/hooks/useSoundSync';
import { updateAppBadge } from '@/lib/badgeSync';
import { performLogArchival } from '@/lib/indexedDbStore';
import { preloadCoreAudioAssets } from '@/lib/audioCache';
import { preloadHighFrequencyRoutes } from '@/lib/routerPreload';

// Page 组件懒加载，延迟 motion 库 124KB 的解析执行，减少 TBT
const Page = lazy(() => import('@/Page'));

const CatCompanion = lazy(() =>
  import('@/modules/companion/CatCompanion').then((m) => ({ default: m.CatCompanion })) as Promise<{ default: React.ComponentType<any> }>
);
// P1-1：BadgeUnlock 仅「徽章解锁」低频事件才需要，懒加载使整套 TTS + AI 任务
// 库 + badges/medals 语料不再随首屏主包加载（解锁时按需拉取）。
// ⚠️ BadgeUnlock 仅命名导出，必须 .then 映射 default，否则 React.lazy 初始化抛错白屏。
const BadgeUnlock = lazy(() =>
  import('@/components/feedback/BadgeUnlock').then((m) => ({ default: m.BadgeUnlock })),
);
// 低频组件懒加载：OnboardingModal 仅首次打开时加载，PwaInstallBanner 仅可安装时，
// SwUpdateToast 仅 SW 更新时，BackupRestorePanel 仅需恢复时，OfflineToast 仅离线时，
// ComboIndicator 连击事件低频，StudyGuard 学习护盾覆盖层，均不进首屏主包。
const OnboardingModal = lazy(() =>
  import('@/components/OnboardingModal').then((m) => ({ default: m.OnboardingModal })),
);
const PwaInstallBanner = lazy(() =>
  import('@/components/PwaInstallBanner').then((m) => ({ default: m.PwaInstallBanner })),
);
const SwUpdateToast = lazy(() =>
  import('@/components/SwUpdateToast').then((m) => ({ default: m.SwUpdateToast })),
);
const BackupRestorePanel = lazy(() =>
  import('@/components/BackupRestorePanel').then((m) => ({ default: m.BackupRestorePanel })),
);
const OfflineToast = lazy(() =>
  import('@/components/OfflineIndicator').then((m) => ({ default: m.OfflineToast })),
);
const ComboIndicator = lazy(() =>
  import('@/components/feedback/ComboIndicator').then((m) => ({ default: m.ComboIndicator })),
);
const StudyGuard = lazy(() =>
  import('@/components/study/StudyGuard').then((m) => ({ default: m.StudyGuard })),
);

// Part B · Step 3：AiVoiceModal 仅打开语音对话时才需要，懒加载使整套
// speech(真实语音) + speechRecog + AI 流式链路离开首屏主包。
const AiVoiceModal = lazy(() =>
  import('@/components/ai/AiVoiceModal').then((m) => ({ default: m.AiVoiceModal })),
);

export function App() {
  const { t } = useTranslation();
  const { route } = useRoute();
  // 音效开关同步 Hook（避免重复使用 setMuted）
  useSoundSync();
  const voiceModalOpen = useTtsStore((s) => s.voiceModalOpen);
  const closeVoiceModal = useTtsStore((s) => s.closeVoiceModal);
  const onboarded = useProfilesStore((s) => s.onboarded);
  const completeOnboarding = useProfilesStore((s) => s.completeOnboarding);
  // E2 · 护眼模式：驱动根节点 data-eyecare / data-motion，联动暖色滤镜 + 降密度
  const eyeCareMode = useSettingsStore((s) => s.settings.eyeCareMode);
  
  // P0-2: 备份恢复检测
  const { showRestorePanel, handleRestoreComplete } = useBackupDetection();
  
  // P0-2: 自动备份定时器
  useEffect(() => {
    const cleanup = startAutoBackup(() => {
      const { progress } = useStore.getState();
      // 尝试创建备份（简单实现）
      try {
        localStorage.setItem('bb_backup_last', JSON.stringify({
          timestamp: Date.now(),
          progress
        }));
      } catch (e) {
        console.warn('[Backup] 自动备份失败:', e);
      }
    });
    return cleanup;
  }, []);

  useEffect(() => {
    // P1-2：多档案启动迁移 —— 首次把当前进度转为「宝贝」档案，老数据零丢失；
    // 之后每次启动把运行时最新进度同步回 active 仓库，保证两份持久化一致。
    useProfilesStore.getState().ensureInit();

    // PWA 角标同步：根据到期复习题数更新桌面角标
    const mastery = useStore.getState().progress.mastery ?? {};
    const dueCount = Object.values(mastery).filter((m) => m && m.lv > 0 && typeof m.due === 'number' && m.due <= Date.now()).length;
    updateAppBadge(dueCount);

    // 非关键初始化推迟到 requestIdleCallback，不阻塞首屏渲染
    const schedule = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000));

    schedule(() => {
      // P1-10：一次性迁移 —— 老版本 progress 携带的绘本全文迁入 IndexedDB，
      // 并从 progress 剥离（只留轻量元数据，控制 localStorage 体积）。幂等：无 data 即跳过。
      // ⚠️ 仅剥离「写入成功」的条目：写失败保留 data，下次启动自动重试，杜绝数据丢失。
      const migrateStorybooks = async () => {
        const p = useStore.getState().progress;
        const list = p.storybooks ?? [];
        if (!list.some((b) => b.data)) return;
        const results = await Promise.all(
          list.filter((b) => b.data).map(async (b) => [b, await putStorybookContent(b)] as const),
        );
        const failedIds = new Set(results.filter(([, ok]) => !ok).map(([b]) => b.id));
        const stripped = list.map((b) => {
          if (!b.data || failedIds.has(b.id)) return b;
          return {
            id: b.id,
            title: b.title ?? b.data.bookTitle,
            theme: b.theme,
            style: b.style,
            character: b.character,
            createdAt: b.createdAt,
            readCount: b.readCount,
            favorite: b.favorite,
          };
        });
        if (stripped.length !== list.length || stripped.some((b, i) => b !== list[i])) {
          useStore.setState({ progress: { ...p, storybooks: stripped } });
        }
      };
      void migrateStorybooks();

      // 数据冷热归档：将 >14 天的打卡日志移入 IndexedDB
      const archiveLogs = async () => {
        const p = useStore.getState().progress;
        const { hotLogs, archivedCount } = await performLogArchival(p.dailyLog ?? {});
        if (archivedCount > 0) {
          useStore.setState({ progress: { ...p, dailyLog: hotLogs } });
        }
      };
      void archiveLogs();
      // 基础高频发音离线预热
      preloadCoreAudioAssets();
      // 高频下一路由预测性静默预加载
      preloadHighFrequencyRoutes();
    }, { timeout: 5000 });
  }, []);

  // SEO（规格十五）：按路由动态更新 document.title，提升各页可识别度与分享体验
  // P0-2 隐私：标题不再拼入儿童真实姓名（避免姓名进入浏览器标签页/历史记录），
  // 改用默认称呼「宝贝」+ 头像 emoji 保留个性化又不含 PII。
  useEffect(() => {
    const st = useProfilesStore.getState();
    const meta = st.meta[st.activeProfileId];
    const child = meta?.avatar ? ` · ${meta.avatar}` : '';
    const item = NAV_MAP.get(route);
    if (route === 'home') {
      document.title = `${t('app.name')} · ${t('app.tagline')}${child}`;
    } else if (item) {
      document.title = `🌈 ${item.label}${child} | ${t('app.name')}`;
    } else {
      document.title = `${t('app.name')}${child}`;
    }
    // 页面切换时通知屏幕阅读器
    announceToScreenReader(item?.label ?? t('app.name'));
  }, [route]);

  return (
    <div
        className="min-h-screen bg-gradient-to-br from-[#FFF0F4] via-[#FFE4EF] to-[#F2EAFD] selection:bg-pink-200"
        data-eyecare={eyeCareMode ? 'on' : 'off'}
        data-motion={eyeCareMode ? 'density-low' : undefined}
      >
        <TopBar />
        <div className="mx-auto flex max-w-7xl items-start gap-4 px-2 sm:px-4 py-3 sm:py-6">
          <Sidebar active={route} />
          <main className="flex-1 min-w-0 pb-24 md:pb-8">
            <Page />
          </main>
        </div>
        <BottomTabs active={route} />
        {/* CatCompanion 含 AI 流式 / 语音等易抛错逻辑，单独加边界，避免拖垮整个外壳 */}
        <ErrorBoundary>
          <Suspense fallback={null}><CatCompanion /></Suspense>
        </ErrorBoundary>
        <Suspense fallback={null}><BadgeUnlock /></Suspense>
        <Suspense fallback={null}><ComboIndicator /></Suspense>
        <Suspense fallback={null}><StudyGuard /></Suspense>
        {/* E2 · 护眼模式暖色滤镜叠加层（pointer-events:none，绝不拦截交互） */}
        <div className="eyecare-overlay" aria-hidden="true" />
        <Suspense fallback={null}><OfflineToast /></Suspense>
        <Suspense fallback={null}><PwaInstallBanner /></Suspense>
        <Suspense fallback={null}><SwUpdateToast /></Suspense>
        {showRestorePanel && (
          <Suspense fallback={null}>
            <BackupRestorePanel onRestoreComplete={handleRestoreComplete} />
          </Suspense>
        )}
        <Suspense fallback={null}>
          <AiVoiceModal isOpen={voiceModalOpen} onClose={closeVoiceModal} />
        </Suspense>
        {!onboarded && (
          <Suspense fallback={null}>
            <OnboardingModal
              onComplete={(n, a, c, age) => completeOnboarding(n, a, c, age)}
            />
          </Suspense>
        )}
      </div>
  );
}

export default App;
