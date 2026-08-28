import { useEffect, useMemo, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRoute } from '@/lib/router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteSkeleton } from '@/components/RouteSkeleton';
import { stopSpeaking } from '@/lib/speechCore';
import HomePage from '@/modules/home/HomePage';
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
const VoiceStudioPage = lazy(() => import('@/modules/voice/VoiceStudioPage'));
const StoryLibraryPage = lazy(() => import('@/modules/story/StoryLibraryPage'));
const GrowthMuseumPage = lazy(() => import('@/modules/growth/GrowthMuseumPage'));
const ContentStationPage = lazy(() => import('@/modules/content/ContentStationPage'));
const ResearchModePage = lazy(() => import('@/modules/research/ResearchModePage'));
const DiscoveryGallery = lazy(() => import('@/modules/research/DiscoveryGallery'));
const DesignSystemPage = lazy(() => import('@/modules/design/DesignSystemPage'));
const AchievementCenter = lazy(() => import('@/modules/achievement/AchievementCenter'));
const NurseryPage = lazy(() => import('@/modules/fun/NurseryPage'));
const ParentChildDuel = lazy(() => import('@/modules/game/ParentChildDuel'));

export default function Page() {
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
      case 'voicestudio': return <VoiceStudioPage />;
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