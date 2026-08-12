/**
 * 写实猫 3D 养育大本营 (Realistic Cat House Page)
 * ------------------------------------------------------------
 * 替换原有羊毛毡猫咪养育页面，升级为写实风格：
 * 1. 写实猫 3D 渲染（Three.js PBR）
 * 2. 四维状态系统（亲密度/饱腹度/清洁度/活力）
 * 3. 养护互动（喂食/抚摸/洗澡）
 * 4. 品种切换（6种真实猫品种）
 * 5. 配饰装扮（3D配饰模型）
 * 6. 光照场景（4种HDRI环境）
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useStore } from '@/store/useStore';
import { RealisticCat3D } from './RealisticCat3D';
import type { CatBreed, CatExpression } from './types';
import {
  BREED_CONFIGS
} from './types';
import { getAnimationsForExpression } from './CatAnimations';
import { sfxTap, sfxCorrect } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';

/** 配件类型 */
interface Outfit {
  id: string;
  name: string;
  emoji: string;
  type: 'hat' | 'neck' | 'collar' | 'glasses';
  cost: number;
}

const OUTFITS: Outfit[] = [
  { id: 'crown', name: '学霸皇冠', emoji: '👑', type: 'hat', cost: 10 },
  { id: 'glasses', name: '读书眼镜', emoji: '👓', type: 'glasses', cost: 5 },
  { id: 'bow', name: '粉色蝴蝶结', emoji: '🎀', type: 'neck', cost: 5 },
  { id: 'tie', name: '绅士领结', emoji: '👔', type: 'collar', cost: 8 },
  { id: 'wizard_hat', name: '魔法师帽', emoji: '🧙', type: 'hat', cost: 15 },
  { id: 'flower_collar', name: '花环项圈', emoji: '🌸', type: 'collar', cost: 12 },
];

/** 可用品种列表 */
const BREED_LIST: CatBreed[] = [
  'british_shorthair',
  'siamese',
  'ginger',
  'ragdoll',
  'mainecoon',
  'scottish_fold',
];

/** 光照场景配置 */
const LIGHTING_SCENES = [
  { id: 'sunlight' as const, label: '☀️ 暖阳日光', desc: '户外自然光' },
  { id: 'nebula' as const, label: '🌸 梦幻粉紫', desc: '柔和梦幻氛围' },
  { id: 'starry' as const, label: '🌌 荧光夜空', desc: '星空夜景' },
  { id: 'indoor_warm' as const, label: '💡 室内暖光', desc: '温馨室内照明' },
];

/**
 * 写实猫养育大本营主页面
 */
export default function RealisticCatHousePage() {
  const { t } = useTranslation();
  // Store 数据
  const fishCount = useStore((s) => s.progress.fishCount ?? 10);
  const catAffection = useStore((s) => s.progress.catAffection ?? 20);
  const feedCat = useStore((s) => s.feedCat);
  const addFish = useStore((s) => s.addFish);

  // 本地状态
  const [selectedBreed, setSelectedBreed] = useState<CatBreed>('british_shorthair');
  const [expression, setExpression] = useState<CatExpression>('happy');
  const [fullness, setFullness] = useState(60);
  const [cleanliness, setCleanliness] = useState(80);
  const [energy, setEnergy] = useState(75);
  const [equippedHat, setEquippedHat] = useState<string | undefined>(undefined);
  const [equippedNeck, setEquippedNeck] = useState<string | undefined>(undefined);
  const [envLighting, setEnvLighting] = useState<'sunlight' | 'nebula' | 'starry' | 'indoor_warm'>('indoor_warm');
  const [autoRotate, setAutoRotate] = useState(false);
  const [feedback, setFeedback] = useState(t('cat.welcome'));
  const [showAnimationPanel, setShowAnimationPanel] = useState(false);

  const breedConfig = BREED_CONFIGS[selectedBreed]!!
  const availableAnimations = getAnimationsForExpression(expression);

  /** 喂食 */
  const handleFeed = useCallback(() => {
    if (fishCount >= 2) {
      if (feedCat(2)) {
        sfxCorrect();
        setFullness((v) => Math.min(100, v + 25));
        setEnergy((v) => Math.min(100, v + 10));
        setExpression('love');
        const msg = t('cat.feedMsg', { name: breedConfig.name });
        setFeedback(msg);
        speak(msg, { lang: 'zh-CN' });
      }
    } else {
      sfxTap();
      setFeedback(t('cat.noFish'));
      speak('小鱼干不够啦，快去学习赚鱼干吧！', { lang: 'zh-CN' });
    }
  }, [fishCount, feedCat, breedConfig]);

  /** 抚摸 */
  const handlePet = useCallback(() => {
    sfxCorrect();
    addFish(1);
    setExpression('love');
    const msgs = [
      t('cat.petMsg', { name: breedConfig.name }),
      t('cat.petMsg2'),
      t('cat.petMsg3', { name: breedConfig.name }),
    ];
    const msg = msgs[Math.floor(Math.random() * msgs.length)]!
    setFeedback(msg);
    speak(msg, { lang: 'zh-CN' });
  }, [addFish, breedConfig]);

  /** 洗澡 */
  const handleBath = useCallback(() => {
    sfxTap();
    setCleanliness(100);
    setFullness((v) => Math.max(0, v - 5));
    setFeedback(t('cat.bathMsg', { name: breedConfig.name }));
    speak('洗澡好舒服呀！现在干干净净啦喵！', { lang: 'zh-CN' });
  }, [breedConfig]);

  /** 装备配件 */
  const handleEquip = useCallback((o: Outfit) => {
    sfxTap();
    if (o.type === 'hat') {
      setEquippedHat(equippedHat === o.id ? undefined : o.id);
    }
    if (o.type === 'neck' || o.type === 'collar') {
      setEquippedNeck(equippedNeck === o.id ? undefined : o.id);
    }
    const action = equippedHat === o.id || equippedNeck === o.id ? t('cat.equipOff') : t('cat.equipOn');
    setFeedback(t('cat.equipMsg', { action, name: o.name, emoji: o.emoji }));
    speak(`${action}${o.name}啦！`, { lang: 'zh-CN' });
  }, [equippedHat, equippedNeck]);

  return (
    <div className="space-y-5">
      <PageHeader
        iconType="parent"
        title={t('cat.pageTitle')}
        subtitle={t('cat.subtitle', { name: breedConfig.name, personality: breedConfig.personality })}
        tone="pink"
      />

      {/* 状态栏 */}
      <Panel className="border-2 border-pink-300 bg-gradient-to-r from-pink-50 via-white to-amber-50">
        <div className="flex justify-between items-center text-xs font-bold flex-wrap gap-2">
          <span>{t('cat.fish')}<strong className="text-amber-600">{fishCount}</strong></span>
          <span>{t('cat.affection')}<strong className="text-pink-600">{catAffection}</strong>/100</span>
          <span>{t('cat.fullness')}<strong className="text-orange-600">{fullness}</strong>%</span>
          <span>{t('cat.cleanliness')}<strong className="text-blue-600">{cleanliness}</strong>%</span>
          <span>{t('cat.energy')}<strong className="text-green-600">{energy}</strong>%</span>
        </div>

        {/* 数值条 */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[
            { label: t('cat.affectionShort'), value: catAffection, color: 'bg-pink-500' },
            { label: t('cat.fullnessShort'), value: fullness, color: 'bg-orange-500' },
            { label: t('cat.cleanlinessShort'), value: cleanliness, color: 'bg-blue-500' },
            { label: t('cat.energyShort'), value: energy, color: 'bg-green-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="space-y-0.5">
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>{label}</span>
                <span>{value}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 3D 猫咪舞台 */}
      <Panel className="border-2 border-amber-300 bg-gradient-to-br from-white via-pink-50/30 to-amber-50/30 relative overflow-hidden">
        {/* 反馈消息 */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[280px] rounded-2xl border-2 border-pink-300 bg-white/95 backdrop-blur-sm px-4 py-2 text-xs font-bold text-pink-900 shadow-lg"
            >
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3D 猫咪渲染区域 */}
        <div className="flex justify-center py-4">
          <RealisticCat3D
            size={Math.min(380, window.innerWidth - 80)}
            breed={selectedBreed}
            expression={expression}
            hat={equippedHat}
            neck={equippedNeck}
            envLighting={envLighting}
            autoRotate={autoRotate}
            showControls={true}
            onPet={handlePet}
          />
        </div>

        {/* 光照场景选择 */}
        <div className="flex justify-center items-center gap-2 my-3 text-xs font-bold">
          <span className="text-gray-600">{t('cat.light')}</span>
          {LIGHTING_SCENES.map((scene) => (
            <button
              key={scene.id}
              onClick={() => setEnvLighting(scene.id)}
              className={`px-3 py-1 rounded-full border transition-all ${
                envLighting === scene.id
                  ? 'bg-pink-500 text-white border-pink-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-pink-50'
              }`}
              title={scene.desc}
            >
              {scene.label.includes('暖阳') ? t('pet.sceneSunlight') : scene.label.includes('梦幻') ? t('pet.sceneNebula') : scene.label.includes('荧光') ? t('pet.sceneStarry') : t('cat.sceneIndoor')}
            </button>
          ))}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1 rounded-full border transition-all ${
              autoRotate
                ? 'bg-indigo-500 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-indigo-50'
            }`}
          >
            🔄 {t('cat.autoRotate')}
          </button>
        </div>
      </Panel>

      {/* 品种选择 */}
      <Panel className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <h3 className="text-sm font-black text-purple-900 mb-2">🐱 {t('cat.chooseBreed')}</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {BREED_LIST.map((breed) => {
            const config = BREED_CONFIGS[breed]!!
            const isSelected = selectedBreed === breed;
            return (
              <button
                key={breed}
                onClick={() => setSelectedBreed(breed)}
                className={`relative p-2 rounded-xl border-2 transition-all text-center ${
                  isSelected
                    ? 'border-pink-400 bg-pink-50 shadow-md scale-105'
                    : 'border-gray-200 bg-white hover:border-pink-200 hover:scale-102'
                }`}
              >
                {/* 品种颜色预览 */}
                <div
                  className="w-8 h-8 mx-auto rounded-full mb-1 border-2 shadow-inner"
                  style={{ backgroundColor: config.primaryColor }}
                />
                <span className="text-[10px] font-bold text-gray-700 block truncate">
                  {config.name}
                </span>
                {isSelected && (
                  <span className="absolute -top-1 -right-1 text-xs">✨</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          {t('cat.current', { name: breedConfig.name, nameEn: breedConfig.nameEn, personality: breedConfig.personality })}
        </p>
      </Panel>

      {/* 表情与动画控制 */}
      <Panel className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-black text-blue-900">😺 {t('cat.expression')}</h3>
          <button
            onClick={() => setShowAnimationPanel(!showAnimationPanel)}
            className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            {showAnimationPanel ? t('cat.collapse') : t('cat.expand')}
          </button>
        </div>

        {/* 表情按钮 */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(['happy', 'cute', 'thinking', 'sleepy', 'love', 'excited'] as CatExpression[]).map(
            (exp) => (
              <button
                key={exp}
                onClick={() => setExpression(exp)}
                className={`px-2.5 py-1 text-[11px] rounded-full border transition-all font-bold ${
                  expression === exp
                    ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'
                }`}
              >
                {EXPRESSION_EMOJIS[exp]} {t(`cat.${exp}`)}
              </button>
            )
          )}
        </div>

        {/* 动画面板（可折叠） */}
        <AnimatePresence>
          {showAnimationPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1 pt-2 border-t border-blue-100">
                {availableAnimations.map((anim) => (
                  <button
                    key={anim}
                    onClick={() => {
                      sfxTap();
                      setFeedback(t('cat.playAnim', { name: ANIMATION_LABELS[anim] || anim }));
                    }}
                    className="px-2 py-0.5 text-[10px] rounded-full border bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    {ANIMATION_LABELS[anim] || anim}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      {/* 互动操作栏 */}
      <div className="grid grid-cols-3 gap-3">
        <CandyButton
          variant="solid"
          size="lg"
          onClick={handleFeed}
          disabled={fishCount < 2}
          className="flex flex-col items-center gap-1 py-3"
        >
          <span className="text-xl">🐟</span>
          <span className="text-xs font-bold">{t('cat.feed')}</span>
        </CandyButton>

        <CandyButton
          variant="soft"
          size="lg"
          onClick={handlePet}
          className="flex flex-col items-center gap-1 py-3"
        >
          <span className="text-xl">🤚</span>
          <span className="text-xs font-bold">{t('cat.pet')}</span>
        </CandyButton>

        <CandyButton
          variant="soft"
          size="lg"
          onClick={handleBath}
          className="flex flex-col items-center gap-1 py-3"
        >
          <span className="text-xl">🧼</span>
          <span className="text-xs font-bold">{t('cat.bath')}</span>
        </CandyButton>
      </div>

      {/* 配饰装扮 */}
      <Panel className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
        <h3 className="text-sm font-black text-amber-900 mb-2">👒 {t('cat.outfits')}</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {OUTFITS.map((o) => {
            const isEquipped =
              (o.type === 'hat' && equippedHat === o.id) ||
              ((o.type === 'neck' || o.type === 'collar') && equippedNeck === o.id);
            return (
              <button
                key={o.id}
                onClick={() => handleEquip(o)}
                className={`p-2 rounded-xl border-2 transition-all text-center ${
                  isEquipped
                    ? 'border-amber-400 bg-amber-100 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-amber-200'
                }`}
              >
                <span className="text-2xl block">{o.emoji}</span>
                <span className="text-[9px] font-bold text-gray-700 block mt-0.5">
                  {o.name}
                </span>
                <span className="text-[8px] text-amber-600">🐟{o.cost}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* 学科技能树提示 */}
      <Panel className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <h3 className="text-sm font-black text-green-900 mb-2">📚 {t('cat.skillTree')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { breed: 'british_shorthair' as CatBreed, subject: '语文', icon: '📖', color: 'text-red-600' },
            { breed: 'siamese' as CatBreed, subject: '数学', icon: '🧮', color: 'text-blue-600' },
            { breed: 'ginger' as CatBreed, subject: '拼音', icon: '🔤', color: 'text-green-600' },
            { breed: 'ragdoll' as CatBreed, subject: '科学', icon: '🦕', color: 'text-purple-600' },
          ].map(({ breed, subject, icon, color }) => (
            <button
              key={subject}
              onClick={() => setSelectedBreed(breed)}
              className={`p-2 rounded-xl border-2 border-gray-200 bg-white hover:border-green-300 hover:shadow-sm transition-all text-center ${
                selectedBreed === breed ? 'ring-2 ring-green-300' : ''
              }`}
            >
              <span className="text-xl block">{icon}</span>
              <span className={`text-xs font-bold ${color} block`}>{t('cat.subjectCat', { subject })}</span>
              <span className="text-[9px] text-gray-500">{BREED_CONFIGS[breed]!.name}</span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/** 表情 Emoji */
const EXPRESSION_EMOJIS: Record<CatExpression, string> = {
  happy: '😊',
  cute: '🥰',
  thinking: '🤔',
  sleepy: '😴',
  love: '😻',
  excited: '🤩',
  hungry: '🙀',
  dirty: '🫣',
  angry: '😾',
  scared: '😿',
};

/** 动画中文标签 */
const ANIMATION_LABELS: Record<string, string> = {
  idle_breathing: '🌬️ 呼吸',
  idle_sitting: '🪑 坐姿',
  walk_cycle: '🚶 行走',
  run_cycle: '🏃 奔跑',
  sit_lick: '👅 舔毛',
  stretch_yawn: '🤸 伸懒腰',
  pounce_play: '🎯 扑击',
  roll_over: '🔄 打滚',
  beg_food: '🍽️ 讨食',
  groom_self: '🧹 梳理',
  tail_swish: '🌊 摇尾',
  ear_twitch: '👂 抖耳',
  jump_pounce: '⬆️ 跳跃',
  purr_vibrate: '💗 咕噜',
  fall_asleep: '💤 入睡',
};
