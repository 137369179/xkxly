/**
 * 3D 羊毛毡猫咪养育大本营 🐱 (Pet Cat House)
 * ------------------------------------------------------------
 * 1. 3D 羊毛毡猫咪渲染与 4 维状态 (亲密度/饱腹度/清洁度/活力)
 * 2. 养护互动：喂小鱼干 🐟、抚摸梳毛 🧹、洗泡泡澡 🧼
 * 3. 猫咪装扮：小皇冠 👑、眼镜 👓、领结 👔
 * 4. 学科技能树：语文喵 📖、数学喵 🧮、英语喵 🔤、科学喵 🦕
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';
import { CatStudyHelpCard } from '@/components/pet/CatStudyHelpCard';
import { CatVoiceChatModal } from '@/components/pet/CatVoiceChatModal';
import { CatMiniGameModal } from '@/components/pet/CatMiniGameModal';






import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import {
  CatFishIcon,
  CatHeartIcon,
  CatBathIcon,
  CatCombIcon,
  CatGiftIcon,
  CatCrownIcon,
  CatGlassesIcon,
  CatBowIcon,
  CatTieIcon,
  CatBedIcon,
  CatWandIcon,
  CatYarnIcon,
  CatnipIcon,
  CatDanceIcon,
  CatStretchIcon,
  CatRollIcon,
  CatPurrIcon,
  CatPinyinQuestIcon,
  CatMathQuestIcon,
  CatHanziQuestIcon,
  CatWardrobeIcon,
  CatManorIcon,
  CatToyboxIcon,
} from '@/components/pet/PetIcons';
import {
  CatScholarMedal,
  CatPinyinMedal,
  CatMathMedal,
  CatNurtureMedal,
} from '@/components/pet/PetMedalIcons';

interface Outfit {
  id: string;
  name: string;
  icon: React.FC<{ size?: number; className?: string }>;
  type: 'hat' | 'neck' | 'decor';
  cost: number;
  emoji: string;
}

const OUTFITS: Outfit[] = [
  { id: 'crown', name: 'pet.crown', icon: CatCrownIcon, type: 'hat', cost: 10, emoji: '👑' },
  { id: 'glasses', name: 'pet.glasses', icon: CatGlassesIcon, type: 'hat', cost: 5, emoji: '👓' },
  { id: 'bow', name: 'pet.bow', icon: CatBowIcon, type: 'neck', cost: 5, emoji: '🎀' },
  { id: 'tie', name: 'pet.tie', icon: CatTieIcon, type: 'neck', cost: 8, emoji: '👔' },
  { id: 'bed', name: 'pet.bed', icon: CatBedIcon, type: 'decor', cost: 12, emoji: '🛏️' },
];

/** 猫咪动作 → 统一羊毛毡图片映射 */
const ACTION_IMG: Record<'idle' | 'dance' | 'stretch' | 'roll' | 'jump' | 'purr', string> = {
  idle: '/cat/cat-idle-default.jpg',
  dance: '/cat/cat-dance-celebrate.jpg',
  stretch: '/cat/cat-stretch-yoga.jpg',
  roll: '/cat/cat-roll-playful.jpg',
  jump: '/cat/cat-jump-excited.jpg',
  purr: '/cat/cat-purr-love.jpg',
};

/** 猫咪进化等级 → 统一羊毛毡图片映射 */
const EVOLVE_IMG: Record<number, string> = {
  1: '/cat/cat-evolve-level1.jpg',
  2: '/cat/cat-evolve-level2.jpg',
  3: '/cat/cat-evolve-level3.jpg',
  4: '/cat/cat-evolve-level4.jpg',
};

/** 进化等级标题和描述 */
const EVOLVE_INFO: Record<number, { title: string; desc: string; emoji: string }> = {
  1: { title: 'pet.evolve1Title', desc: 'pet.evolve1Desc', emoji: '🍼' },
  2: { title: 'pet.evolve2Title', desc: 'pet.evolve2Desc', emoji: '🧣' },
  3: { title: 'pet.evolve3Title', desc: 'pet.evolve3Desc', emoji: '📖' },
  4: { title: 'pet.evolve4Title', desc: 'pet.evolve4Desc', emoji: '👑' },
};

/** 探险任务配置（id 唯一，用于 store 中去重） */
interface QuestConfig {
  id: string;
  name: string;
  durationSec: number;
  reward: number;
  Icon: React.FC<{ size?: number; className?: string }>;
}

const EMPTY_OUTFITS: Record<string, string> = Object.freeze({});
const EMPTY_UNLOCKED: readonly string[] = Object.freeze([]);
const EMPTY_QUESTS: readonly { id: string; name: string; endAt: number; reward: number }[] = Object.freeze([]);
const EMPTY_MASTERY: Readonly<Record<string, any>> = Object.freeze({});

const QUESTS: QuestConfig[] = [
  { id: 'pinyin', name: 'pet.questPinyin', durationSec: 30, reward: 10, Icon: CatPinyinQuestIcon },
  { id: 'math', name: 'pet.questMath', durationSec: 60, reward: 25, Icon: CatMathQuestIcon },
  { id: 'hanzi', name: 'pet.questHanzi', durationSec: 90, reward: 40, Icon: CatHanziQuestIcon },
];

/** 进化阈值：每个等级升级所需的星星 + 亲密度（与 store.evolveCat 保持一致） */
const EVOLVE_THRESHOLDS: Record<number, { stars: number; affection: number; title: string }> = {
  1: { stars: 50, affection: 50, title: 'pet.evolve1to2' },
  2: { stars: 200, affection: 80, title: 'pet.evolve2to3' },
  3: { stars: 500, affection: 100, title: 'pet.evolve3to4' },
};

/** 把秒数格式化为 m:ss */
function formatDuration(sec: number, t: (k: string, p?: Record<string, string | number>) => string): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? t('pet.minSec', { m, s }) : t('pet.sec', { s });
}

/** 探险倒计时 hook：返回剩余秒数（每秒刷新） */
function useCountdown(endAt: number | undefined): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [endAt]);
  if (!endAt) return 0;
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

/** 单个探险任务卡片：三种状态（空闲/进行中/可领取） */
function QuestCard({
  config,
  quest,
  onDispatch,
  onClaim,
}: {
  config: QuestConfig;
  quest: { id: string; name: string; endAt: number; reward: number } | undefined;
  onDispatch: () => void;
  onClaim: () => void;
}) {
  const { t } = useTranslation();
  const { Icon } = config;
  const remaining = useCountdown(quest?.endAt);
  const isDone = quest && remaining === 0;

  return (
    <div className="rounded-2xl bg-white p-3 border border-indigo-200 shadow-xs flex flex-col justify-between items-center text-center">
      <div>
        <div className="flex justify-center mb-1">
          <Icon size={36} />
        </div>
        <span className="text-base">{t(config.name)}</span>
        <p className="text-[10px] text-indigo-600 mt-1">
          {t('pet.questDuration', { time: formatDuration(config.durationSec, t), count: config.reward })}
        </p>
      </div>

      {/* 空闲：派遣按钮 */}
      {!quest && (
        <button
          onClick={onDispatch}
          className="mt-3 w-full rounded-xl bg-indigo-600 py-1.5 text-white hover:bg-indigo-700 active:scale-95"
        >
          {t('pet.dispatchBtn')}
        </button>
      )}

      {/* 进行中：倒计时 */}
      {quest && !isDone && (
        <div className="mt-3 w-full rounded-xl bg-indigo-100 py-1.5 text-indigo-700 flex items-center justify-center gap-1">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
          {t('pet.exploring', { time: formatDuration(remaining, t) })}
        </div>
      )}

      {/* 完成：领取按钮 */}
      {isDone && (
        <button
          onClick={onClaim}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-1.5 text-white font-black hover:from-amber-600 hover:to-orange-600 active:scale-95 animate-pulse"
        >
          {t('pet.claimBtn', { count: config.reward })}
        </button>
      )}
    </div>
  );
}

export default function CatHousePage() {
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

  const [catAction, setCatAction] = useState<'idle' | 'dance' | 'stretch' | 'roll' | 'jump' | 'purr'>('idle');
  const [feedback, setFeedback] = useState(t('pet.welcomeMsg'));
  const [showVoiceChatModal, setShowVoiceChatModal] = useState(false);
  const [showMiniGameModal, setShowMiniGameModal] = useState(false);
  const [envLighting, setEnvLighting] = useState<'sunlight' | 'nebula' | 'starry'>('nebula');

  /** 场景氛围 → 主舞台 Panel 背景/边框组合 */
  const STAGE_THEME: Record<'sunlight' | 'nebula' | 'starry', { panel: string; frame: string; glow: string }> = {
    nebula: {
      panel: 'border-2 border-pink-300 bg-gradient-to-tr from-fuchsia-50 via-pink-50 to-violet-50',
      frame: 'border-fuchsia-400 shadow-[0_10px_40px_-10px_rgba(217,70,239,0.55)]',
      glow: 'radial-gradient(circle at 50% 30%, rgba(244,114,182,0.35), transparent 65%)',
    },
    sunlight: {
      panel: 'border-2 border-amber-300 bg-gradient-to-tr from-amber-50 via-yellow-50 to-orange-50',
      frame: 'border-orange-400 shadow-[0_10px_40px_-10px_rgba(251,146,60,0.6)]',
      glow: 'radial-gradient(circle at 30% 20%, rgba(253,224,71,0.45), transparent 65%)',
    },
    starry: {
      panel: 'border-2 border-indigo-300 bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900 text-white',
      frame: 'border-indigo-400 shadow-[0_10px_40px_-10px_rgba(99,102,241,0.7)]',
      glow: 'radial-gradient(circle at 70% 20%, rgba(129,140,248,0.55), transparent 65%)',
    },
  };
  const stageTheme = STAGE_THEME[envLighting];

  /** 拼音已解锁技能点数（用于徽章判定） */
  const pinyinMasteryCount = Object.keys(mastery).filter((k) => k.startsWith('pinyin:')).length;
  /** 徽章解锁条件（与 data/badges.ts 保持一致的近似判定） */
  const medalScholar = catLevel >= 2;                      // 学霸猫：进化等级 ≥ 2
  const medalPinyin  = pinyinMasteryCount >= 10;           // 拼音探险家：至少 10 个拼音技能点
  const medalMath    = stars >= 5;                         // 数学魔法师：累计 5 颗星
  const medalNurture = catAffection >= 20;                 // 贴心铲屎官：亲密度 ≥ 20
  /** 明信片解锁阈值（按亲密度分 4 档，第 4 张初始拥有） */
  const postcardUnlocked = [
    catAffection >= 10,   // 拼音森林
    catAffection >= 25,   // 字母盒子
    catAffection >= 40,   // 羊毛毡小镇
    true,                 // 喵喵房间
  ];



  const triggerMotion = (act: 'dance' | 'stretch' | 'roll' | 'jump' | 'purr', msg: string) => {
    sfxTap();
    setCatAction(act);
    setFeedback(msg);
    speak(msg, { lang: 'zh-CN' });
    setTimeout(() => setCatAction('idle'), 1600);
  };


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
    sfxTap();
    petCat();
    triggerMotion('purr', t('pet.petSuccess'));
  };

  const handleBath = () => {
    sfxTap();
    bathCat();
    setFeedback(t('pet.bathSuccess'));
    speak(t('pet.speakBath'), { lang: 'zh-CN' });
  };

  const handleEquip = (o: Outfit) => {
    sfxTap();
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

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="parent"
        title={t('pet.pageTitle')}
        subtitle={t('pet.pageSubtitle')}
        tone="pink"
      />

      {/* 3D 羊毛毡猫咪舞台（按场景氛围切换主题） */}
      <Panel className={`text-center space-y-4 relative overflow-hidden transition-colors duration-500 ${stageTheme.panel}`}>
        {/* 氛围光晕层 */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-700"
          style={{ background: stageTheme.glow }}
        />
        {/* 背包显示 */}
        <div className={`flex justify-between items-center text-xs font-black rounded-2xl px-4 py-2 shadow-xs relative z-10 ${
          envLighting === 'starry'
            ? 'text-indigo-100 bg-white/10 backdrop-blur-sm'
            : 'text-amber-900 bg-white/80'
        }`}>
          <span className="flex items-center gap-1.5"><CatFishIcon size={20} /> {t('pet.haveFish')}<strong className={`text-sm ${envLighting === 'starry' ? 'text-amber-300' : 'text-amber-600'}`}>{fishCount}</strong> {t('pet.fishUnit')}</span>
          <span className="flex items-center gap-1.5"><CatHeartIcon size={20} /> {t('pet.affectionFull')}<strong className={`text-sm ${envLighting === 'starry' ? 'text-pink-300' : 'text-pink-600'}`}>{catAffection}</strong> / 100</span>
        </div>

        {/* 统一风格 3D 羊毛毡猫咪进化天团卡片（4 级进化横幅） */}
        <div className="flex justify-center mb-2 relative z-10">
          <div className={`relative overflow-hidden rounded-3xl border-4 shadow-xl max-w-[440px] w-full ${
            envLighting === 'starry' ? 'border-indigo-400' : 'border-pink-300'
          }`}>
            <div className="grid grid-cols-4 gap-0">
              {[1, 2, 3, 4].map((lv) => (
                <div key={lv} className="relative aspect-square overflow-hidden">
                  <img src={EVOLVE_IMG[lv]} alt={`Lv.${lv}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-center">
                    <span className="text-[10px] font-black text-white">Lv.{lv}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-pink-950/80 to-transparent p-2 text-white text-xs font-black flex justify-between items-center px-4">
              <span>{t('pet.catBadge')}</span>
              <span className="text-[10px] bg-pink-500/80 px-2 py-0.5 rounded-full">{t('pet.catBadgeTip')}</span>
            </div>
          </div>
        </div>


        {/* 统一羊毛毡风格猫咪主角舞台（按动作切换图片） */}
        <motion.div
          key={catAction}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{
            opacity: 1,
            scale: 1,
            ...(catAction === 'dance' ? { rotate: [0, -6, 6, -6, 0], y: [0, -12, 0, -12, 0] } :
               catAction === 'stretch' ? { scaleX: [1, 1.08, 1], scaleY: [1, 0.92, 1] } :
               catAction === 'roll' ? { rotate: [0, 10, -10, 0], scale: [1, 1.06, 1] } :
               catAction === 'jump' ? { y: [0, -24, 0], scaleY: [1, 1.1, 0.95, 1] } :
               catAction === 'purr' ? { rotate: [0, 4, -4, 3, 0], x: [0, -4, 4, 0] } :
               { y: [0, -4, 0] })
          }}
          transition={{
            duration: catAction === 'roll' ? 0.9 : 0.6,
            repeat: catAction === 'idle' ? Infinity : 1,
            ease: 'easeOut',
          }}
          className={`relative mx-auto my-4 h-56 w-56 cursor-pointer overflow-hidden rounded-3xl border-4 bg-white shadow-fluffy relative z-10 ${stageTheme.frame}`}
          onClick={() => triggerMotion('jump', t('pet.motionJumpMsg'))}
        >
          <img
            src={ACTION_IMG[catAction]}
            alt={t('pet.catActionAlt', { action: catAction })}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {/* 当前等级徽章叠加（统一 badge-chip 风格） */}
          <div className="badge-chip badge-chip--amber" style={{ top: '0.5rem', left: '0.5rem', right: 'auto' }}>
            Lv.{catLevel} {t(EVOLVE_INFO[catLevel]?.title ?? '')} {EVOLVE_INFO[catLevel]?.emoji ?? '🐱'}
          </div>
          {/* 当前装扮胶囊角标（统一 badge-chip 风格） */}
          {(equippedOutfits['hat'] || equippedOutfits['neck'] || equippedOutfits['decor']) && (
            <div className="badge-chip badge-chip--pink" style={{ top: '0.5rem', right: '0.5rem' }}>
              {['hat', 'neck', 'decor'].map(type => equippedOutfits[type]).filter(Boolean).map(id => {
                const o = OUTFITS.find(x => x.id === id);
                return o ? o.emoji : '';
              }).join(' ')}
            </div>
          )}
          {/* 装扮 emoji 叠加（统一 icon-chip-xl + 位置类） */}
          {equippedOutfits['hat'] && (() => {
            const o = OUTFITS.find(x => x.id === equippedOutfits['hat']);
            return o ? (
              <div className="icon-chip icon-chip--xl icon-chip--pos-hat select-none pointer-events-none">
                {o.emoji}
              </div>
            ) : null;
          })()}
          {equippedOutfits['neck'] && (() => {
            const o = OUTFITS.find(x => x.id === equippedOutfits['neck']);
            return o ? (
              <div className="icon-chip icon-chip--xl icon-chip--pos-neck select-none pointer-events-none">
                {o.emoji}
              </div>
            ) : null;
          })()}
        </motion.div>

        {/* 3D HDR 氛围场景模式选择 */}
        <div className={`flex justify-center items-center gap-2 my-2 text-xs font-black relative z-10 ${
          envLighting === 'starry' ? 'text-indigo-100' : 'text-pink-900'
        }`}>
          <span className="icon-chip icon-chip--static">🎛️</span>
          <span>{t('pet.sceneLabel')}</span>
          <button
            onClick={() => setEnvLighting('nebula')}
            className={`px-3 py-1 rounded-full border ${
              envLighting === 'nebula' ? 'bg-pink-500 text-white border-pink-600' : 'bg-white text-pink-900 border-pink-200'
            }`}
          >
            {t('pet.sceneNebula')}
          </button>
          <button
            onClick={() => setEnvLighting('sunlight')}
            className={`px-3 py-1 rounded-full border ${
              envLighting === 'sunlight' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-amber-900 border-amber-200'
            }`}
          >
            {t('pet.sceneSunlight')}
          </button>
          <button
            onClick={() => setEnvLighting('starry')}
            className={`px-3 py-1 rounded-full border ${
              envLighting === 'starry' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-indigo-900 border-indigo-200'
            }`}
          >
            {t('pet.sceneStarry')}
          </button>
        </div>






        {/* 🎙️ 核心推荐：直接跟猫咪语音对话 & 🎮 接鱼干小游戏大按钮 */}
        <div className="flex justify-center flex-wrap gap-3 my-3 relative z-10">
          <button
            onClick={() => setShowVoiceChatModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all border-2 border-white animate-bounce-soft"
          >
            <span className="text-lg">🎙️</span>
            <span>跟猫咪语音说话聊天 (+🐟1/+❤️2)</span>
          </button>

          <button
            onClick={() => setShowMiniGameModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all border-2 border-white"
          >
            <span className="text-lg">🎮</span>
            <span>30秒猫爪接鱼干挑战！</span>
          </button>
        </div>

        {/* 动作动画手动播报控制栏 */}
        <div className="flex justify-center flex-wrap gap-2 my-2 relative z-10">
          <button
            onClick={() => triggerMotion('dance', t('pet.motionDanceMsg'))}
            className="flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-xs hover:bg-amber-100"
          >
            <CatDanceIcon size={18} /> {t('pet.motionDance')}
          </button>
          <button
            onClick={() => triggerMotion('stretch', t('pet.motionStretchMsg'))}
            className="flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-xs hover:bg-amber-100"
          >
            <CatStretchIcon size={18} /> {t('pet.motionStretch')}
          </button>
          <button
            onClick={() => triggerMotion('roll', t('pet.motionRollMsg'))}
            className="flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-xs hover:bg-amber-100"
          >
            <CatRollIcon size={18} /> {t('pet.motionRoll')}
          </button>
          <button
            onClick={() => triggerMotion('purr', t('pet.motionPurrMsg'))}
            className="flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-xs hover:bg-amber-100"
          >
            <CatPurrIcon size={18} /> {t('pet.motionPurr')}
          </button>
        </div>


        <p className={`text-sm font-black inline-block px-4 py-1.5 rounded-full border shadow-xs relative z-10 ${
          envLighting === 'starry'
            ? 'text-indigo-100 bg-indigo-800/60 border-indigo-400'
            : 'text-amber-950 bg-white border-amber-200'
        }`}>
          {feedback}
        </p>

        {/* 养护四大动态指标 */}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-left text-xs font-black relative z-10">
          <div className="rounded-2xl bg-white p-3 border border-pink-200">
            <span className="flex items-center gap-1 text-pink-900"><CatHeartIcon size={16} /> {t('pet.affection')}: {catAffection}%</span>
            <div className="mt-1.5 h-2 w-full rounded-full bg-pink-100 overflow-hidden">
              <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${catAffection}%` }} />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3 border border-amber-200">
            <span className="flex items-center gap-1 text-amber-900"><CatFishIcon size={16} /> {t('pet.fullness')}: {fullness}%</span>
            <div className="mt-1.5 h-2 w-full rounded-full bg-amber-100 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${fullness}%` }} />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3 border border-blue-200">
            <span className="flex items-center gap-1 text-blue-900"><CatBathIcon size={16} /> {t('pet.cleanliness')}: {cleanliness}%</span>
            <div className="mt-1.5 h-2 w-full rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${cleanliness}%` }} />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3 border border-purple-200">
            <span className="flex items-center gap-1 text-purple-900"><CatPurrIcon size={16} /> {t('pet.energy')}: {t('pet.energyValue')}</span>
            <div className="mt-1.5 h-2 w-full rounded-full bg-purple-100 overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: '90%' }} />
            </div>
          </div>
        </div>

        {/* 交互护理按键 */}
        <div className="flex justify-center flex-wrap gap-3 pt-2 relative z-10">
          <CandyButton tone="orange" size="md" onClick={handleFeed}>
            <span className="inline-flex items-center gap-1"><CatFishIcon size={20} /> {t('pet.feedBtn')} (-2)</span>
          </CandyButton>
          <CandyButton tone="pink" size="md" onClick={handlePetCat}>
            <span className="inline-flex items-center gap-1"><CatCombIcon size={20} /> {t('pet.combBtn')}</span>
          </CandyButton>
          <CandyButton tone="blue" size="md" onClick={handleBath}>
            <span className="inline-flex items-center gap-1"><CatBathIcon size={20} /> {t('pet.bathBtn')}</span>
          </CandyButton>
          <CandyButton tone="purple" variant="soft" size="sm" onClick={() => addFish(5)}>
            <span className="inline-flex items-center gap-1"><CatGiftIcon size={18} /> {t('pet.dailyFishBtn')} (+5)</span>
          </CandyButton>
        </div>
      </Panel>

      {/* 🎏 猫咪打工探险庄园（场景横幅 + 3 任务卡片） */}
      <Panel className="border-2 border-indigo-300 bg-indigo-50 text-center space-y-3">
        <h3 className="text-lg font-black text-indigo-950 flex items-center justify-center gap-2">
          <CatManorIcon size={26} /> {t('pet.questManor')}
        </h3>
        {/* 探险场景横幅 */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-200 shadow-xs">
          <img
            src="/cat/cat-manor-adventure.jpg"
            alt={t('pet.manorAlt')}
            className="w-full h-44 object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/80 via-indigo-900/20 to-transparent flex items-end">
            <p className="p-3 text-white text-sm font-black text-left">
              {t('pet.questBanner')}
            </p>
          </div>
        </div>
        <p className="text-xs font-bold text-indigo-700">{t('pet.questDesc')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-black text-indigo-900">
          {QUESTS.map((q) => {
            const quest = catQuests.find((x) => x.id === q.id);
            // 倒计时 hook 必须在组件顶层调用，这里用一个子组件包裹
            return (
              <QuestCard
                key={q.id}
                config={q}
                quest={quest}
                onDispatch={() => {
                  sfxTap();
                  dispatchCatQuest(q.id, q.name, q.durationSec, q.reward);
                  speak(t('pet.questGoSpeak', { name: t(q.name), time: formatDuration(q.durationSec, t) }), { lang: 'zh-CN' });
                }}
                onClaim={() => {
                  claimCatQuest(q.id);
                  sfxCorrect();
                  setFeedback(t('pet.questComplete', { name: t(q.name), count: q.reward }));
                  speak(t('pet.questDoneSpeak', { count: q.reward }), { lang: 'zh-CN' });
                  setCatAction('dance');
                  setTimeout(() => setCatAction('idle'), 1600);
                }}
              />
            );
          })}
        </div>
      </Panel>

      {/* 🙋‍♂️ 猫咪的“学习求助”卡片 */}
      <CatStudyHelpCard />

      {/* 🎒 互动玩具箱 & 进化成就（彩虹玩具箱场景） */}
      <Panel className="border-2 border-pink-300 bg-pink-50 text-center space-y-3">
        <h3 className="text-lg font-black text-pink-950 flex items-center justify-center gap-2">
          <CatToyboxIcon size={26} /> {t('pet.toyboxTitle')}
        </h3>
        {/* 玩具箱场景横幅 */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-pink-200 shadow-xs">
          <img
            src="/cat/cat-toybox-fun.jpg"
            alt={t('pet.toyboxAlt')}
            className="w-full h-44 object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-pink-950/75 via-pink-900/10 to-transparent flex items-end">
            <p className="p-3 text-white text-sm font-black text-left">
              {t('pet.toyboxBanner')}
            </p>
          </div>
        </div>
        <div className="flex justify-center flex-wrap gap-3">
          <button
            onClick={() => {
              sfxCorrect();
              setCatAction('jump');
              speak(t('pet.wandSpeak'), { lang: 'zh-CN' });
            }}
            className="rounded-2xl border-2 border-pink-300 bg-white p-3 text-center shadow-xs hover:scale-105 transition-transform flex flex-col items-center"
          >
            <CatWandIcon size={40} />
            <p className="text-xs font-black text-pink-950 mt-1">{t('pet.wandName')}</p>
          </button>

          <button
            onClick={() => {
              sfxCorrect();
              setCatAction('roll');
              speak(t('pet.yarnSpeak'), { lang: 'zh-CN' });
            }}
            className="rounded-2xl border-2 border-pink-300 bg-white p-3 text-center shadow-xs hover:scale-105 transition-transform flex flex-col items-center"
          >
            <CatYarnIcon size={40} />
            <p className="text-xs font-black text-pink-950 mt-1">{t('pet.yarnName')}</p>
          </button>

          <button
            onClick={() => {
              sfxCorrect();
              setCatAction('purr');
              speak(t('pet.catnipSpeak'), { lang: 'zh-CN' });
            }}
            className="rounded-2xl border-2 border-pink-300 bg-white p-3 text-center shadow-xs hover:scale-105 transition-transform flex flex-col items-center"
          >
            <CatnipIcon size={40} />
            <p className="text-xs font-black text-pink-950 mt-1">{t('pet.catnipName')}</p>
          </button>
        </div>
      </Panel>

      {/* 🌟 猫咪进化系统（4 级进化图鉴 + 升级进度） */}
      <Panel className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 text-center space-y-3">
        <h3 className="text-lg font-black text-amber-950 flex items-center justify-center gap-2">
          <span className="icon-chip">🌟</span> {t('pet.evolveTitle')}
          <span className="ml-1 rounded-full bg-amber-500 px-3 py-0.5 text-sm text-white shadow-sm">
            Lv.{catLevel} · {t(EVOLVE_INFO[catLevel]?.title ?? 'pet.unknownForm')}
          </span>
        </h3>

        {/* 四级进化图鉴 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((lv) => {
            const info = EVOLVE_INFO[lv]!;
            const unlocked = catLevel >= lv;
            const current = catLevel === lv;
            return (
              <div
                key={lv}
                className={`relative overflow-hidden rounded-2xl border-2 p-2 text-center transition-all ${
                  current
                    ? 'border-amber-500 bg-amber-100 shadow-md scale-[1.02]'
                    : unlocked
                    ? 'border-green-300 bg-white shadow-xs'
                    : 'border-gray-200 bg-gray-50 grayscale opacity-70'
                }`}
              >
                {current && (
                  <div className="badge-chip badge-chip--pink animate-pulse">
                    CURRENT
                  </div>
                )}
                <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
                  <img
                    src={EVOLVE_IMG[lv]}
                    alt={t(info.title)}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  {!unlocked && (
                    <div className="absolute inset-0 grid place-items-center bg-black/40 text-2xl">
                      🔒
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs font-black text-amber-950 flex items-center justify-center gap-1">
                  {info.emoji} Lv.{lv} {t(info.title)}
                </p>
                <p className="text-[10px] text-amber-700 font-bold">{t(info.desc)}</p>
              </div>
            );
          })}
        </div>

        {/* 进化进度 + 按钮 */}
        {catLevel < 4 && (() => {
          const threshold = EVOLVE_THRESHOLDS[catLevel];
          if (!threshold) return null;
          const starsProgress = Math.min(100, (stars / threshold.stars) * 100);
          const affProgress = Math.min(100, (catAffection / threshold.affection) * 100);
          const canEvolve = stars >= threshold.stars && catAffection >= threshold.affection;

          return (
            <>
              <p className="text-xs font-bold text-amber-700">
                {t('pet.evolveProgress')} <span className="text-amber-900">{t(EVOLVE_THRESHOLDS[catLevel]?.title ?? '')}</span>
              </p>
              <div className="space-y-2 rounded-2xl bg-white/70 p-3 text-left text-xs font-bold text-amber-900">
                <div>
                  <div className="flex justify-between">
                    <span>⭐ {t('pet.starsLabel')}</span>
                    <span className={stars >= threshold.stars ? 'text-green-600' : 'text-amber-700'}>
                      {stars} / {threshold.stars}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-amber-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${starsProgress}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <span className="icon-chip icon-chip--static icon-chip--sm">💖</span>
                      {t('pet.affectionLabel')}
                    </span>
                    <span className={catAffection >= threshold.affection ? 'text-green-600' : 'text-amber-700'}>
                      {catAffection} / {threshold.affection}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-amber-100 overflow-hidden">
                    <div
                      className="h-full bg-pink-500 rounded-full transition-all"
                      style={{ width: `${affProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (canEvolve) {
                    const ok = evolveCat();
                    if (ok) {
                      sfxCorrect();
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
                }}
                disabled={!canEvolve}
                className={`mt-2 w-full rounded-xl py-2 text-base font-black transition active:scale-95 ${
                  canEvolve
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 animate-pulse shadow-md'
                    : 'cursor-not-allowed bg-gray-200 text-gray-400'
                }`}
              >
                {canEvolve ? t('pet.evolveBtn') : t('pet.evolveNeed', { stars: Math.max(0, threshold.stars - stars), aff: Math.max(0, threshold.affection - catAffection) })}
              </button>
            </>
          );
        })()}

        {catLevel >= 4 && (
          <p className="text-sm font-black text-amber-950 bg-gradient-to-r from-pink-100 via-amber-100 to-yellow-100 inline-block px-4 py-1.5 rounded-full border border-amber-300 shadow-sm">
            {t('pet.maxLevel')}
          </p>
        )}
      </Panel>

      {/* 3D 羊毛毡猫咪装扮小铺 */}
      <Panel className="border-2 border-purple-300 bg-purple-50 text-center space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black text-purple-900 flex items-center gap-2">
            <CatWardrobeIcon size={26} /> {t('pet.wardrobeTitle')}
          </h3>
          <span className="text-sm font-black text-amber-600 bg-white px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
            <CatFishIcon size={18} /> {t('pet.haveFishShort')} {fishCount}
          </span>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {OUTFITS.map((o) => {
            const isUnlocked = unlockedOutfits.includes(o.id);
            const isEquipped = equippedOutfits[o.type] === o.id;
            const canAfford = fishCount >= o.cost;
            const IconComp = o.icon;

            return (
              <button
                key={o.id}
                onClick={() => {
                  if (isUnlocked) {
                    handleEquip(o);
                  } else if (buyOutfit(o.id, o.cost)) {
                    // 购买成功后自动装备，形成购买→穿戴闭环
                    sfxCorrect();
                    equipOutfit(o.type, o.id);
                    setFeedback(t('pet.buySuccess', { name: t(o.name) }));
                    speak(t('pet.buySpeak', { name: t(o.name) }), { lang: 'zh-CN' });
                  } else {
                    sfxTap();
                    setFeedback(t('pet.notEnoughFish', { count: o.cost }));
                  }
                }}
                className={`rounded-2xl border-2 p-3 text-center shadow-sm hover:scale-105 active:scale-95 transition-transform w-28 relative flex flex-col items-center justify-between ${
                  isEquipped
                    ? 'border-pink-500 bg-pink-100 ring-2 ring-pink-300'
                    : isUnlocked
                      ? 'border-emerald-400 bg-emerald-50'
                      : canAfford
                        ? 'border-purple-200 bg-white'
                        : 'border-gray-200 bg-gray-50 opacity-70'
                }`}
              >
                <div className="my-1"><IconComp size={42} /></div>
                <p className="text-xs font-black text-purple-950 mt-1">{t(o.name)}</p>
                {!isUnlocked && (
                  <div className={`badge-chip ${canAfford ? 'badge-chip--amber' : 'badge-chip--gray'}`}>
                    <CatFishIcon size={12} /> {o.cost}
                  </div>
                )}
                {isEquipped && (
                  <div className="badge-chip badge-chip--pink">
                    {t('pet.wearing')}
                  </div>
                )}
                {isUnlocked && !isEquipped && (
                  <div className="badge-chip badge-chip--emerald">
                    {t('pet.owned')}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* 学科技能树（统一羊毛毡风格 - 四大学科喵） */}
      <Panel className="border-2 border-emerald-300 bg-emerald-50 text-center space-y-3">
        <h3 className="text-lg font-black text-emerald-900">{t('pet.skillTreeTitle')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-black text-emerald-900">
          <div className="rounded-2xl bg-white p-2 border border-emerald-200 flex flex-col items-center shadow-xs overflow-hidden">
            <div className="w-full aspect-square overflow-hidden rounded-xl bg-white mb-1">
              <img src={EVOLVE_IMG[3]} alt={t('pet.skillYuwen')} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </div>
            <span className="mt-1 flex items-center gap-1"><CatGlassesIcon size={16} /> {t('pet.skillYuwen')}</span>
            <p className="text-[10px] text-emerald-600 mt-0.5">{t('pet.skillYuwenDesc')}</p>
          </div>
          <div className="rounded-2xl bg-white p-2 border border-emerald-200 flex flex-col items-center shadow-xs overflow-hidden">
            <div className="w-full aspect-square overflow-hidden rounded-xl bg-white mb-1">
              <img src={EVOLVE_IMG[4]} alt={t('pet.skillMath')} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </div>
            <span className="mt-1 flex items-center gap-1"><CatCrownIcon size={16} /> {t('pet.skillMath')}</span>
            <p className="text-[10px] text-emerald-600 mt-0.5">{t('pet.skillMathDesc')}</p>
          </div>
          <div className="rounded-2xl bg-white p-2 border border-emerald-200 flex flex-col items-center shadow-xs overflow-hidden">
            <div className="w-full aspect-square overflow-hidden rounded-xl bg-white mb-1">
              <img src={EVOLVE_IMG[2]} alt={t('pet.skillPinyin')} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </div>
            <span className="mt-1 flex items-center gap-1"><CatBowIcon size={16} /> {t('pet.skillPinyin')}</span>
            <p className="text-[10px] text-emerald-600 mt-0.5">{t('pet.skillPinyinDesc')}</p>
          </div>
          <div className="rounded-2xl bg-white p-2 border border-emerald-200 flex flex-col items-center shadow-xs overflow-hidden">
            <div className="w-full aspect-square overflow-hidden rounded-xl bg-white mb-1">
              <img src={ACTION_IMG['idle']} alt={t('pet.skillScience')} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </div>
            <span className="mt-1 flex items-center gap-1"><CatTieIcon size={16} /> {t('pet.skillScience')}</span>
            <p className="text-[10px] text-emerald-600 mt-0.5">{t('pet.skillScienceDesc')}</p>
          </div>
        </div>
      </Panel>

      {/* 💌 猫咪游学明信片图鉴 */}
      <Panel className="border-2 border-rose-300 bg-rose-50 text-center space-y-3">
        <h3 className="text-lg font-black text-rose-950 flex items-center justify-center gap-2">
          {t('pet.postcardTitle')}
        </h3>
        <p className="text-xs font-bold text-rose-700">{t('pet.postcardDesc')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-black text-rose-950">
          {[
            { img: '/icons/felt_phonics.jpg', label: t('pet.postcard1'), tip: t('pet.unlockLv', { level: 1 }) },
            { img: '/icons/felt_box.jpg',     label: t('pet.postcard2'), tip: t('pet.unlockLv', { level: 2 }) },
            { img: '/icons/felt_town.jpg',    label: t('pet.postcard3'), tip: t('pet.unlockLv', { level: 3 }) },
            { img: '/icons/felt_room.jpg',    label: t('pet.postcard4'), tip: t('pet.initialOwned') },
          ].map((item, i) => {
            const unlocked = postcardUnlocked[i];
            return (
              <div
                key={`postcard-${i}`}
                className={`group relative overflow-hidden rounded-2xl border-2 bg-white p-2 shadow-xs hover:shadow-md transition-all ${
                  unlocked ? 'border-rose-200' : 'border-slate-200'
                }`}
              >
                <div className={`relative overflow-hidden rounded-xl ${unlocked ? '' : 'grayscale opacity-60'}`}>
                  <img
                    src={item.img}
                    alt={item.label}
                    className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                    decoding="async"
                  />
                  {!unlocked && (
                    <div className="absolute inset-0 grid place-items-center bg-black/50 text-2xl backdrop-blur-[1px]">
                      🔒
                    </div>
                  )}
                </div>
                <p className="mt-2 text-center">{item.label}</p>
                <span className="text-[10px] text-rose-500 font-normal">{item.tip}</span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 🏅 猫咪学霸荣誉勋章墙 */}
      <Panel className="border-2 border-amber-300 bg-amber-50 text-center space-y-3">
        <h3 className="text-lg font-black text-amber-950 flex items-center justify-center gap-2">
          {t('pet.medalWall')}
        </h3>
        <p className="text-xs font-bold text-amber-700">{t('pet.medalDesc')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-black text-amber-950">
          <div className="rounded-2xl bg-white p-3 border border-amber-200 flex flex-col items-center shadow-xs">
            <CatScholarMedal size={64} unlocked={medalScholar} />
            <span className="mt-2 text-amber-900">{t('pet.medalScholar')}</span>
            <span className="text-[10px] text-amber-600 font-normal">{t('pet.medalScholarDesc')}</span>
          </div>
          <div className="rounded-2xl bg-white p-3 border border-amber-200 flex flex-col items-center shadow-xs">
            <CatPinyinMedal size={64} unlocked={medalPinyin} />
            <span className="mt-2 text-emerald-900">{t('pet.medalPinyin')}</span>
            <span className="text-[10px] text-emerald-600 font-normal">{t('pet.medalPinyinDesc')}</span>
          </div>
          <div className="rounded-2xl bg-white p-3 border border-amber-200 flex flex-col items-center shadow-xs">
            <CatMathMedal size={64} unlocked={medalMath} />
            <span className="mt-2 text-amber-900">{t('pet.medalMath')}</span>
            <span className="text-[10px] text-amber-600 font-normal">{t('pet.medalMathDesc')}</span>
          </div>
          <div className="rounded-2xl bg-white p-3 border border-amber-200 flex flex-col items-center shadow-xs">
            <CatNurtureMedal size={64} unlocked={medalNurture} />
            <span className="mt-2 text-pink-900">{t('pet.medalNurture')}</span>
            <span className="text-[10px] text-pink-600 font-normal">{t('pet.medalNurtureDesc')}</span>
          </div>
        </div>
      </Panel>




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
