import { Suspense, lazy, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useRoute } from '@/lib/router';
import { NAV_MAP } from '@/data/nav';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomTabs } from '@/components/layout/BottomTabs';
import { TopBar } from '@/components/layout/TopBar';
import { ComboIndicator } from '@/components/feedback/ComboIndicator';
import { StudyGuard } from '@/components/study/StudyGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineToast } from '@/components/OfflineIndicator';
import { RouteSkeleton } from '@/components/RouteSkeleton';
import { useTtsStore } from '@/store/useTtsStore';
import { useProfilesStore } from '@/store/useProfilesStore';
import { OnboardingModal } from '@/components/OnboardingModal';
import { stopSpeaking } from '@/lib/speechCore';
import { useTranslation } from '@/i18n/useTranslation';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import { SwUpdateToast } from '@/components/SwUpdateToast';
import { BackupRestorePanel } from '@/components/BackupRestorePanel';
import { startAutoBackup, useBackupDetection } from '@/lib/autoBackup';
import { useStore } from '@/store/useStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { putStorybookContent } from '@/lib/storybookStore';
import { announceToScreenReader } from '@/components/Accessibility';
import { useSoundSync } from '@/hooks/useSoundSync';
import { updateAppBadge } from '@/lib/badgeSync';
const CatCompanion = lazy(() =>
  import('@/modules/companion/CatCompanion').then((m) => ({ default: m.CatCompanion })) as Promise<{ default: React.ComponentType<any> }>
);
// P1-1：BadgeUnlock 仅「徽章解锁」低频事件才需要，懒加载使整套 TTS + AI 任务
// 库 + badges/medals 语料不再随首屏主包加载（解锁时按需拉取）。
// ⚠️ BadgeUnlock 仅命名导出，必须 .then 映射 default，否则 React.lazy 初始化抛错白屏。
const BadgeUnlock = lazy(() =>
  import('@/components/feedback/BadgeUnlock').then((m) => ({ default: m.BadgeUnlock })),
);
// Part B · Step 3：AiVoiceModal 仅打开语音对话时才需要，懒加载使整套
// speech(真实语音) + speechRecog + AI 流式链路离开首屏主包。
const AiVoiceModal = lazy(() =>
  import('@/components/ai/AiVoiceModal').then((m) => ({ default: m.AiVoiceModal })),
);

const HomePage = lazy(() => import('@/modules/home/HomePage'));
const CompanionPage = lazy(() => import('@/modules/companion/CompanionPage'));
const TodayPage = lazy(() => import('@/modules/today/TodayPage'));
const LettersPage = lazy(() => import('@/modules/letters/LettersPage'));
const PoemsPage = lazy(() => import('@/modules/poems/PoemsPage'));
const NumbersPage = lazy(() => import('@/modules/numbers/NumbersPage'));
const LogicPage = lazy(() => import('@/modules/logic/LogicPage'));
const AdventurePage = lazy(() => import('@/modules/adventure/AdventurePage'));
const RewardsPage = lazy(() => import('@/modules/rewards/RewardsPage'));
const StudyPassport = lazy(() => import('@/modules/rewards/StudyPassport'));
const ParentPage = lazy(() => import('@/modules/parent/ParentPage'));
const TtsTestPage = lazy(() => import('@/modules/parent/TtsTestPage'));
const HanziPage = lazy(() => import('@/modules/hanzi/HanziPage'));
const HanziListenPage = lazy(() => import('@/modules/hanzi/HanziListen'));
const PinyinPage = lazy(() => import('@/modules/pinyin/PinyinPage'));
const WordsPage = lazy(() => import('@/modules/words/WordsPage'));
const FunPage = lazy(() => import('@/modules/fun/FunPage'));
const IdiomsPage = lazy(() => import('@/modules/idioms/IdiomsPage'));
const SongsPage = lazy(() => import('@/modules/songs/SongsPage'));
const SciencePage = lazy(() => import('@/modules/science/SciencePage'));
const MusicPage = lazy(() => import('@/modules/music/MusicPage'));
const ArtPage = lazy(() => import('@/modules/art/ArtPage'));
const SafetyPage = lazy(() => import('@/modules/safety/SafetyPage'));
const GeographyPage = lazy(() => import('@/modules/geography/GeographyPage'));
const VehiclesPage = lazy(() => import('@/modules/vehicles/VehiclesPage'));
const FestivalsPage = lazy(() => import('@/modules/festivals/FestivalsPage'));
const PlantsPage = lazy(() => import('@/modules/plants/PlantsPage'));
const CatHousePage = lazy(() => import('@/modules/pet/CatHousePage'));
const RealisticCatHousePage = lazy(() => import('@/modules/pet/realistic/RealisticCatHousePage'));
const DesktopPetPage = lazy(() => import('@/modules/pet/desktop/DesktopPetPage'));
const StorybookPage = lazy(() => import('@/modules/storybook/StorybookPage'));
const WrongBookPage = lazy(() => import('@/modules/wrongbook/WrongBookDashboard'));
const GameCenterPage = lazy(() => import('@/modules/game/GameCenterPage'));
const StoryLibraryPage = lazy(() => import('@/modules/story/StoryLibraryPage'));
const GrowthMuseumPage = lazy(() => import('@/modules/growth/GrowthMuseumPage'));
const ContentStationPage = lazy(() => import('@/modules/content/ContentStationPage'));
const ResearchModePage = lazy(() => import('@/modules/research/ResearchModePage'));
const DiscoveryGallery = lazy(() => import('@/modules/research/DiscoveryGallery'));
const DesignSystemPage = lazy(() => import('@/modules/design/DesignSystemPage'));
const AchievementCenter = lazy(() => import('@/modules/achievement/AchievementCenter'));
const NurseryPage = lazy(() => import('@/modules/fun/NurseryPage'));
const ParentChildDuel = lazy(() => import('@/modules/game/ParentChildDuel'));

function Page() {
  const { route, param } = useRoute();

  useEffect(() => {
    // 切页副作用：停语音 + 回顶部
    stopSpeaking();
    window.scrollTo({ top: 0 });
  }, [route, param]);

  const page = useMemo(() => {
    switch (route) {
      case 'home': return <HomePage />;
      case 'today': return <TodayPage />;
      case 'companion': return <CompanionPage />;
      case 'letters': return <LettersPage />;
      case 'poems': return <PoemsPage />;
      case 'numbers': return <NumbersPage />;
      case 'logic': return <LogicPage />;
      case 'adventure': return <AdventurePage />;
      case 'rewards': return <RewardsPage />;
      case 'passport': return <StudyPassport />;
      case 'parent': return <ParentPage />;
      case 'ttstest': return <TtsTestPage />;
      case 'hanzi': return <HanziPage />;
      case 'hanzi-listen': return <HanziListenPage />;
      case 'pinyin': return <PinyinPage />;
      case 'words': return <WordsPage />;
      case 'fun': return <FunPage />;
      case 'idioms': return <IdiomsPage />;
      case 'songs': return <SongsPage />;
      case 'science': return <SciencePage />;
      case 'music': return <MusicPage />;
      case 'art': return <ArtPage />;
      case 'safety': return <SafetyPage />;
      case 'geography': return <GeographyPage />;
      case 'vehicles': return <VehiclesPage />;
      case 'festivals': return <FestivalsPage />;
      case 'plants': return <PlantsPage />;
      case 'cat_house': return <CatHousePage />;
      case 'realistic_cat': return <RealisticCatHousePage />;
      case 'desktop_pet': return <DesktopPetPage />;
      case 'storybook': return <StorybookPage />;
      case 'wrongbook': return <WrongBookPage />;
      case 'gamecenter': return <GameCenterPage />;
      case 'story': return <StoryLibraryPage />;
      case 'growth': return <GrowthMuseumPage />;
      case 'content': return <ContentStationPage />;
      case 'research': return <ResearchModePage />;
      case 'discoveries': return <DiscoveryGallery />;
      case 'design': return <DesignSystemPage />;
      case 'achievement': return <AchievementCenter />;
      case 'nursery': return <NurseryPage />;
      case 'duel': return <ParentChildDuel />;
      default: return <HomePage />;
    }
  }, [route]);

  return (
    <ErrorBoundary resetKey={`${route}:${param ?? ''}`} >
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* P1-7：路由级轻量骨架屏（内容骨架占位，替代全屏 Loading，减少 CLS） */}
          <Suspense fallback={<RouteSkeleton />}>{page}</Suspense>
        </motion.div>
      </AnimatePresence>
    </ErrorBoundary>
  );
}

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
    const dueCount = Object.values(mastery).filter((m) => m && m.lv > 0 && m.due <= Date.now()).length;
    updateAppBadge(dueCount);

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
      if (stripped.some((b, i) => b !== list[i])) {
        useStore.setState({ progress: { ...p, storybooks: stripped } });
      }
    };
    void migrateStorybooks();
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
    <MotionConfig reducedMotion="user">
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
        <ComboIndicator />
        <StudyGuard />
        {/* E2 · 护眼模式暖色滤镜叠加层（pointer-events:none，绝不拦截交互） */}
        <div className="eyecare-overlay" aria-hidden="true" />
        <OfflineToast />
        <PwaInstallBanner />
        <SwUpdateToast />
        {showRestorePanel && (
          <BackupRestorePanel onRestoreComplete={handleRestoreComplete} />
        )}
        <Suspense fallback={null}>
          <AiVoiceModal isOpen={voiceModalOpen} onClose={closeVoiceModal} />
        </Suspense>
        {!onboarded && (
          <OnboardingModal
            onComplete={(n, a, c, age) => completeOnboarding(n, a, c, age)}
          />
        )}
      </div>
    </MotionConfig>
  );
}

export default App;
