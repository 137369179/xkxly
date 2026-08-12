import { Suspense, lazy, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useRoute } from '@/lib/router';
import { NAV_MAP } from '@/data/nav';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomTabs } from '@/components/layout/BottomTabs';
import { TopBar } from '@/components/layout/TopBar';
import { BadgeUnlock } from '@/components/BadgeUnlock';
import { ComboIndicator } from '@/components/ComboIndicator';
import { StudyGuard } from '@/components/StudyGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineToast } from '@/components/OfflineIndicator';
import { FriendlyLoading } from '@/components/FriendlyLoading';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTtsStore } from '@/store/useTtsStore';
import { useProfilesStore } from '@/store/useProfilesStore';
import { OnboardingModal } from '@/components/OnboardingModal';
import { setMuted } from '@/lib/sfx';
import { stopSpeaking } from '@/lib/speech';
import { AiVoiceModal } from '@/components/ai/AiVoiceModal';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import { SwUpdateToast } from '@/components/SwUpdateToast';
const CatCompanion = lazy(() =>
  import('@/components/CatCompanion').then((m) => ({ default: m.CatCompanion })) as Promise<{ default: React.ComponentType<any> }>
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
const TtsTestPage = lazy(() => import('@/modules/tts-test/TtsTestPage'));
const HanziPage = lazy(() => import('@/modules/hanzi/HanziPage'));
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
const RealisticCatHousePage = lazy(() => import('@/components/realistic-cat/RealisticCatHousePage'));
const StorybookPage = lazy(() => import('@/modules/storybook/StorybookPage'));
const WrongBookPage = lazy(() => import('@/modules/wrongbook/WrongBookDashboard'));
const GameCenterPage = lazy(() => import('@/modules/game/GameCenterPage'));
const StoryLibraryPage = lazy(() => import('@/modules/story/StoryLibraryPage'));
const GrowthMuseumPage = lazy(() => import('@/modules/growth/GrowthMuseumPage'));
const ContentStationPage = lazy(() => import('@/modules/content/ContentStationPage'));
const ResearchModePage = lazy(() => import('@/modules/research/ResearchModePage'));

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
      case 'storybook': return <StorybookPage />;
      case 'wrongbook': return <WrongBookPage />;
      case 'gamecenter': return <GameCenterPage />;
      case 'story': return <StoryLibraryPage />;
      case 'growth': return <GrowthMuseumPage />;
      case 'content': return <ContentStationPage />;
      case 'research': return <ResearchModePage />;
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
          <Suspense fallback={<FriendlyLoading />}>{page}</Suspense>
        </motion.div>
      </AnimatePresence>
    </ErrorBoundary>
  );
}

export function App() {
  const { route } = useRoute();
  const sound = useSettingsStore((s) => s.settings.sound);
  const voiceModalOpen = useTtsStore((s) => s.voiceModalOpen);
  const closeVoiceModal = useTtsStore((s) => s.closeVoiceModal);
  const onboarded = useProfilesStore((s) => s.onboarded);
  const completeOnboarding = useProfilesStore((s) => s.completeOnboarding);

  useEffect(() => {
    // 静音开关同步到音效模块；Service Worker 注册统一由 main.tsx 的 registerSW() 完成
    setMuted(!sound);
  }, [sound]);

  useEffect(() => {
    // P1-2：多档案启动迁移 —— 首次把当前进度转为「宝贝」档案，老数据零丢失；
    // 之后每次启动把运行时最新进度同步回 active 仓库，保证两份持久化一致。
    useProfilesStore.getState().ensureInit();
  }, []);

  // SEO（规格十五）：按路由动态更新 document.title，提升各页可识别度与分享体验
  useEffect(() => {
    const st = useProfilesStore.getState();
    const meta = st.meta[st.activeProfileId];
    const child = meta?.name && meta.name !== '宝贝' ? ` · ${meta.name}` : '';
    const item = NAV_MAP.get(route);
    if (route === 'home') {
      document.title = `宝贝学习乐园 · AI 儿童成长学习乐园${child}`;
    } else if (item) {
      document.title = `🌈 ${item.label}${child} | 宝贝学习乐园`;
    } else {
      document.title = `宝贝学习乐园${child}`;
    }
  }, [route]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-white to-purple-100">
        <TopBar />
        <div className="flex">
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
        <BadgeUnlock />
        <ComboIndicator />
        <StudyGuard />
        <OfflineToast />
        <PwaInstallBanner />
        <SwUpdateToast />
        <AiVoiceModal isOpen={voiceModalOpen} onClose={closeVoiceModal} />
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
