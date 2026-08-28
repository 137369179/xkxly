/**
 * 3D 羊毛毡猫咪养育大本营 🐱 (Pet Cat House)
 * ------------------------------------------------------------
 * 1. 3D 羊毛毡猫咪渲染与 4 维状态 (亲密度/饱腹度/清洁度/活力)
 * 2. 养护互动：喂小鱼干 🐟、抚摸梳毛 🧹、洗泡泡澡 🧼
 * 3. 猫咪装扮：小皇冠 👑、眼镜 👓、领结 👔
 * 4. 学科技能树：语文喵 📖、数学喵 🧮、英语喵 🔤、科学喵 🦕
 */

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/ui/Card';
import { useStore } from '@/store/useStore';
import { CatStudyHelpCard } from '@/modules/pet/CatStudyHelpCard';
import { CatVoiceChatModal } from '@/modules/pet/CatVoiceChatModal';
import { CatMiniGameModal } from '@/modules/pet/CatMiniGameModal';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap, sfxCorrect, sfxPurr, sfxBubble, sfxMagic, sfxBoing, sfxMeow, sfxStar, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import {
  EMPTY_OUTFITS, EMPTY_UNLOCKED, EMPTY_QUESTS, EMPTY_MASTERY,
  EVOLVE_THRESHOLDS, EVOLVE_INFO, formatDuration,
  type CatAction, type Outfit, type QuestConfig,
} from './catData';
import { CatStagePanel } from './CatStagePanel';
import { CatQuestManorSection } from './CatQuestManorSection';
import { CatToyBoxSection } from './CatToyBoxSection';
import { CatEvolveSection } from './CatEvolveSection';
import { CatWardrobeSection } from './CatWardrobeSection';
import { CatSkillTreeSection } from './CatSkillTreeSection';
import { CatPostcardSection } from './CatPostcardSection';
import { CatMedalWallSection } from './CatMedalWallSection';
import { PetDiaryModal } from './components/PetDiaryModal';

const TOY_SPEAK: Record<CatAction, string> = {
  jump: 'pet.wandSpeak', roll: 'pet.yarnSpeak', purr: 'pet.catnipSpeak',
  dance: '', stretch: '', idle: '', pounce: 'pet.wandSpeak', groom: 'pet.catnipSpeak', highFive: 'pet.wandSpeak',
};

export default function CatHousePage({ initialRealisticMode = false }: { initialRealisticMode?: boolean }) {
  const { t } = useTranslation();
  const fishCount = useStore((s) => s.progress.fishCount ?? 10);
  const catAffection = useStore((s) => s.progress.catAffection ?? 20);
  const fullness = useStore((s) => s.progress.catFullness ?? 80);
  const cleanliness = useStore((s) => s.progress.catCleanliness ?? 80);
  const stars = useStore((s) => s.progress.stars ?? 0);
  const catLevel = useStore((s) => s.progress.catLevel ?? 1);
  const catQuests = useStore((s) => s.progress.catQuests ?? EMPTY_QUESTS);
  const mastery = useStore((s) => s.progress.mastery ?? EMPTY_MASTERY);

  const feedCatStats = useStore((s) => s.feedCatStats);
  const addFish = useStore((s) => s.addFish);
  const tickCatStats = useStore((s) => s.tickCatStats);
  const petCat = useStore((s) => s.petCat);
  const bathCat = useStore((s) => s.bathCat);
  const equipOutfit = useStore((s) => s.equipOutfit);
  const buyOutfit = useStore((s) => s.buyOutfit);
  const dispatchCatQuest = useStore((s) => s.dispatchCatQuest);
  const claimCatQuest = useStore((s) => s.claimCatQuest);
  const evolveCat = useStore((s) => s.evolveCat);
  const equippedOutfits = useStore((s) => s.progress.equippedOutfits ?? EMPTY_OUTFITS);
  const unlockedOutfits = useStore((s) => s.progress.unlockedOutfits ?? EMPTY_UNLOCKED);

  useEffect(() => {
    tickCatStats(); // Decay stats on mount based on offline time
    // intentional: mount-only side effect
  }, []);

  const [catAction, setCatAction] = useState<CatAction>('idle');
  const [feedback, setFeedback] = useState(t('pet.welcomeMsg'));
  const [showVoiceChatModal, setShowVoiceChatModal] = useState(false);
  const [showMiniGameModal, setShowMiniGameModal] = useState(false);
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [envLighting, setEnvLighting] = useState<'sunlight' | 'nebula' | 'starry'>('nebula');
  const [realisticMode, setRealisticMode] = useState(initialRealisticMode);
  const motionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (motionTimerRef.current) clearTimeout(motionTimerRef.current);
    };
  }, []);

  // 全局键盘快捷键响应 (1-6 快捷互动)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1' || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        triggerHaptic(20);
        handleFeed();
      } else if (e.key === '2' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        triggerHaptic(20);
        handlePetCat();
      } else if (e.key === '3' || e.key.toLowerCase() === 'b') {
        e.preventDefault();
        triggerHaptic(20);
        handleBath();
      } else if (e.key === '4' || e.key.toLowerCase() === 'v') {
        e.preventDefault();
        triggerHaptic(20);
        setShowVoiceChatModal(true);
      } else if (e.key === '5' || e.key.toLowerCase() === 'g') {
        e.preventDefault();
        triggerHaptic(20);
        setShowMiniGameModal(true);
      } else if (e.key === '6' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        triggerHaptic(20);
        setShowDiaryModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullness, fishCount]);

  /** 拼音已解锁技能点数（用于徽章判定） */
  const pinyinMasteryCount = Object.keys(mastery).filter((k) => k.startsWith('pinyin:')).length;
  /** 徽章解锁条件（与 data/badges.ts 保持一致的近似判定） */
  const medalScholar = catLevel >= 2;                      // 学霸猫：进化等级 ≥ 2
  const medalPinyin  = pinyinMasteryCount >= 10;           // 拼音探险家：至少 10 个拼音技能点
  const medalMath    = stars >= 5;                         // 数学魔法师：累计 5 颗星
  const medalNurture = catAffection >= 20;                 // 贴心铲屎官：亲密度 ≥ 20

  const triggerMotion = (act: CatAction, msg: string) => {
    sfxTap();
    setCatAction(act);
    setFeedback(msg);
    speak(msg, { lang: 'zh-CN' });
    if (motionTimerRef.current) clearTimeout(motionTimerRef.current);
    motionTimerRef.current = setTimeout(() => setCatAction('idle'), 1600);
  };
  const motionMsg: Record<CatAction, string> = {
    dance: t('pet.motionDanceMsg'),
    stretch: t('pet.motionStretchMsg'),
    roll: t('pet.motionRollMsg'),
    jump: t('pet.motionJumpMsg'),
    purr: t('pet.motionPurrMsg'),
    idle: '',
    pounce: '喵呜！小茜飞扑抓住小彩蝶啦！🦋',
    groom: '洗洗小脸蛋，梳理得干干净净～🧼',
    highFive: '耶！跟小茜击个掌！High Five！🐾',
  };
  const onTriggerMotion = (act: CatAction) => triggerMotion(act, motionMsg[act]);

  const handleFeed = () => {
    if (fishCount >= 2) {
      if (feedCatStats(15, 2)) {
        sfxCorrect();
        setFeedback(t('pet.feedSuccess'));
        speak(t('pet.speakFeed'), { lang: 'zh-CN' });
      }
    } else {
      sfxTap();
      setFeedback(t('pet.fishNotEnough'));
    }
  };

  const handlePetCat = () => {
    sfxPurr();
    petCat();
    triggerMotion('purr', t('pet.petSuccess'));
  };

  const handleBath = () => {
    sfxBubble();
    bathCat();
    setFeedback(t('pet.bathSuccess'));
    speak(t('pet.speakBath'), { lang: 'zh-CN' });
  };

  const handleEquip = (o: Outfit) => {
    sfxMagic();
    const wasEquipped = equippedOutfits[o.type] === o.id;
    equipOutfit(o.type, o.id);
    if (wasEquipped) {
      setFeedback(t('pet.unequipMsg', { name: t(o.name) }));
      speak(t('pet.speakUnequip'), { lang: 'zh-CN' });
    } else {
      setFeedback(t('pet.equipMsg', { name: t(o.name) }));
      speak(t('pet.speakEquip'), { lang: 'zh-CN' });
    }
  };

  const handleOutfitClick = (o: Outfit) => {
    if (unlockedOutfits.includes(o.id)) {
      handleEquip(o);
    } else if (buyOutfit(o.id, o.cost)) {
      // 购买成功后自动装备，形成购买→穿戴闭环
      sfxStar();
      sfxMagic();
      equipOutfit(o.type, o.id);
      setFeedback(t('pet.buySuccess', { name: t(o.name) }));
      speak(t('pet.buySpeak', { name: t(o.name) }), { lang: 'zh-CN' });
    } else {
      sfxTap();
      setFeedback(t('pet.notEnoughFish', { count: o.cost }));
    }
  };

  const handleDispatch = (q: QuestConfig) => {
    sfxTap();
    dispatchCatQuest(q.id, q.name, q.durationSec, q.reward);
    speak(t('pet.questGoSpeak', { name: t(q.name), time: formatDuration(q.durationSec, t) }), { lang: 'zh-CN' });
  };

  const handleClaim = (q: QuestConfig) => {
    claimCatQuest(q.id);
    sfxCorrect();
    setFeedback(t('pet.questComplete', { name: t(q.name), count: q.reward }));
    speak(t('pet.questDoneSpeak', { count: q.reward }), { lang: 'zh-CN' });
    setCatAction('dance');
    setTimeout(() => setCatAction('idle'), 1600);
  };

  const handleToy = (act: CatAction) => {
    if (act === 'roll') {
      sfxBoing();
    } else if (act === 'jump') {
      sfxMeow();
    } else if (act === 'purr') {
      sfxPurr();
    } else {
      sfxCorrect();
    }
    setCatAction(act);
    const key = TOY_SPEAK[act];
    if (key) speak(t(key), { lang: 'zh-CN' });
  };

  const handleEvolve = () => {
    const threshold = EVOLVE_THRESHOLDS[catLevel];
    if (catLevel < 4 && threshold && stars >= threshold.stars && catAffection >= threshold.affection) {
      const ok = evolveCat();
      if (ok) {
        sfxMagic();
        celebrateSmall();
        setCatAction('dance');
        setFeedback(t('pet.evolveSuccess', { level: catLevel + 1, title: t(EVOLVE_INFO[catLevel + 1]?.title ?? '') }));
        speak(t('pet.evolveSpeak', { title: t(EVOLVE_INFO[catLevel + 1]?.title ?? '') }), { lang: 'zh-CN' });
        setTimeout(() => setCatAction('idle'), 2000);
      }
    } else {
      sfxTap();
      setFeedback(t('pet.evolveFail'));
      speak(t('pet.evolveEncourage'), { lang: 'zh-CN' });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="parent"
        title={t('pet.pageTitle')}
        subtitle={t('pet.pageSubtitle')}
        tone="pink"
      />

      {/* 快捷操作提示条 */}
      <div className="text-center">
        <span className="inline-block text-xs text-pink-900 font-bold bg-pink-50/90 px-3 py-1 rounded-xl border border-pink-200">
          ⌨️ 键盘快捷操作：数字 1-6 / 字母键 (1/F 喂鱼 · 2/P 抚摸 · 3/B 洗澡 · 4/V 语音 · 5/G 小游戏 · 6/D 日记)
        </span>
      </div>

      <CatStagePanel
        catAction={catAction}
        feedback={feedback}
        envLighting={envLighting}
        setEnvLighting={setEnvLighting}
        realisticMode={realisticMode}
        setRealisticMode={setRealisticMode}
        catLevel={catLevel}
        catAffection={catAffection}
        fishCount={fishCount}
        fullness={fullness}
        cleanliness={cleanliness}
        equippedOutfits={equippedOutfits}
        onFeed={handleFeed}
        onPet={handlePetCat}
        onBath={handleBath}
        onAddFish={() => addFish(5)}
        onTriggerMotion={onTriggerMotion}
        onOpenVoice={() => setShowVoiceChatModal(true)}
        onOpenMiniGame={() => setShowMiniGameModal(true)}
      />

      {/* 📖 萌宠学情日记与明信片入口 */}
      <div className="rounded-3xl border-3 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-bounce">💌</span>
          <div>
            <h4 className="text-sm sm:text-base font-black text-amber-950">
              猫咪伴读手账与学情明信片
            </h4>
            <p className="text-xs text-amber-700 font-bold">
              记录小主人的成长足迹，一键生成专属纪念明信片
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { sfxTap(); setShowDiaryModal(true); }}
          className="rounded-2xl bg-amber-500 px-4 py-2 text-xs sm:text-sm font-black text-white shadow-md hover:bg-amber-600 active:scale-95 transition-all shrink-0"
        >
          翻开手账 📖
        </button>
      </div>

      <PetDiaryModal
        isOpen={showDiaryModal}
        onClose={() => setShowDiaryModal(false)}
      />

      {/* 🎏 猫咪打工探险庄园 */}
      <CatQuestManorSection catQuests={catQuests} onDispatch={handleDispatch} onClaim={handleClaim} />

      {/* 🙋‍♂️ 猫咪的“学习求助”卡片 */}
      <CatStudyHelpCard />

      {/* 🎒 互动玩具箱 & 进化成就 */}
      <CatToyBoxSection onToy={handleToy} />

      {/* 🌟 猫咪进化系统 */}
      <CatEvolveSection catLevel={catLevel} stars={stars} catAffection={catAffection} onEvolve={handleEvolve} />

      {/* 3D 羊毛毡猫咪装扮小铺 */}
      <CatWardrobeSection
        fishCount={fishCount}
        unlockedOutfits={unlockedOutfits}
        equippedOutfits={equippedOutfits}
        onOutfitClick={handleOutfitClick}
      />

      {/* 学科技能树 */}
      <CatSkillTreeSection />

      {/* 💌 猫咪游学明信片图鉴 */}
      <CatPostcardSection catAffection={catAffection} />

      {/* 🏅 猫咪学霸荣誉勋章墙 */}
      <CatMedalWallSection
        medalScholar={medalScholar}
        medalPinyin={medalPinyin}
        medalMath={medalMath}
        medalNurture={medalNurture}
      />

      {/* 🎙️ 语音说话 Modal */}
      <CatVoiceChatModal
        isOpen={showVoiceChatModal}
        onClose={() => setShowVoiceChatModal(false)}
      />

      {/* 🎮 猫爪接鱼干小游戏 Modal */}
      <CatMiniGameModal
        isOpen={showMiniGameModal}
        onClose={() => setShowMiniGameModal(false)}
      />
    </div>
  );
}
