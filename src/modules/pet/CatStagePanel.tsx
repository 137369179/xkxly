import { motion } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap } from '@/lib/sfx';
import { RealisticCat3D } from './realistic';
import {
  CatFishIcon, CatHeartIcon, CatDanceIcon, CatStretchIcon, CatRollIcon, CatPurrIcon,
  CatCombIcon, CatBathIcon, CatGiftIcon,
} from './PetIcons';
import {
  ACTION_IMG, EVOLVE_IMG, EVOLVE_INFO, STAGE_THEME, OUTFITS,
  type CatAction,
} from './catData';

/** 羊毛毡动作 → 写实 3D 表情映射 */
const catActionToExpression = (act: CatAction): 'happy' | 'cute' | 'excited' | 'love' | 'sleepy' => {
  switch (act) {
    case 'dance': return 'excited';
    case 'purr': return 'love';
    case 'stretch': return 'cute';
    case 'jump': return 'excited';
    case 'roll': return 'happy';
    default: return 'happy';
  }
};

export function CatStagePanel({
  catAction,
  feedback,
  envLighting,
  setEnvLighting,
  realisticMode,
  setRealisticMode,
  catLevel,
  catAffection,
  fishCount,
  fullness,
  cleanliness,
  equippedOutfits,
  onFeed,
  onPet,
  onBath,
  onAddFish,
  onTriggerMotion,
  onOpenVoice,
  onOpenMiniGame,
}: {
  catAction: CatAction;
  feedback: string;
  envLighting: 'sunlight' | 'nebula' | 'starry';
  setEnvLighting: (v: 'sunlight' | 'nebula' | 'starry') => void;
  realisticMode: boolean;
  setRealisticMode: (v: boolean) => void;
  catLevel: number;
  catAffection: number;
  fishCount: number;
  fullness: number;
  cleanliness: number;
  equippedOutfits: Record<string, string>;
  onFeed: () => void;
  onPet: () => void;
  onBath: () => void;
  onAddFish: () => void;
  onTriggerMotion: (act: CatAction) => void;
  onOpenVoice: () => void;
  onOpenMiniGame: () => void;
}) {
  const { t } = useTranslation();
  const stageTheme = STAGE_THEME[envLighting];
  const playMotion = (act: CatAction) => onTriggerMotion(act);

  return (
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

      {/* 写实 / 羊毛毡 外观切换开关 */}
      <div className="flex justify-center items-center gap-2 my-1 relative z-10">
        <button
          type="button"
          onClick={() => { sfxTap(); setRealisticMode(!realisticMode); }}
          className={`rounded-full px-4 py-1.5 text-xs font-black transition-colors shadow-xs ${
            realisticMode
              ? 'bg-gradient-to-r from-orange-400 to-pink-400 text-white'
              : 'bg-white/80 text-amber-700 border-2 border-amber-300'
          }`}
        >
          {realisticMode ? t('pet.realisticOn') : t('pet.realisticOff')}
        </button>
      </div>

      {realisticMode ? (
        <div
          className={`relative mx-auto my-4 h-56 w-56 cursor-pointer overflow-hidden rounded-3xl border-4 bg-white shadow-fluffy relative z-10 ${stageTheme.frame}`}
          onClick={() => playMotion('jump')}
        >
          <RealisticCat3D
            size={220}
            breed="british_shorthair"
            expression={catActionToExpression(catAction)}
            hat={equippedOutfits['hat']}
            neck={equippedOutfits['neck']}
            envLighting={envLighting}
            autoRotate={false}
            showControls={false}
            className="h-full w-full"
          />
          {/* 当前等级徽章叠加 */}
          <div className="badge-chip badge-chip--amber" style={{ top: '0.5rem', left: '0.5rem', right: 'auto' }}>
            Lv.{catLevel} {t(EVOLVE_INFO[catLevel]?.title ?? '')} {EVOLVE_INFO[catLevel]?.emoji ?? '🐱'}
          </div>
          {/* 当前装扮角标叠加 */}
          {(equippedOutfits['hat'] || equippedOutfits['neck'] || equippedOutfits['decor']) && (
            <div className="badge-chip badge-chip--pink" style={{ top: '0.5rem', right: '0.5rem' }}>
              {['hat', 'neck', 'decor'].map(type => equippedOutfits[type]).filter(Boolean).map(id => {
                const o = OUTFITS.find(x => x.id === id);
                return o ? o.emoji : '';
              }).join(' ')}
            </div>
          )}
        </div>
      ) : (
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
        onClick={() => playMotion('jump')}
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
      )}

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
          onClick={onOpenVoice}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all border-2 border-white animate-bounce-soft"
        >
          <span className="text-lg">🎙️</span>
          <span>{t('pet.voiceChatBtn')}</span>
        </button>

        <button
          onClick={onOpenMiniGame}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all border-2 border-white"
        >
          <span className="text-lg">🎮</span>
          <span>{t('pet.fishCatchChallengeBtn')}</span>
        </button>
      </div>

      {/* 动作动画手动播报控制栏 */}
      <div className="flex justify-center flex-wrap gap-2 my-2 relative z-10">
        <button
          onClick={() => playMotion('dance')}
          className="flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-xs hover:bg-amber-100"
        >
          <CatDanceIcon size={18} /> {t('pet.motionDance')}
        </button>
        <button
          onClick={() => playMotion('stretch')}
          className="flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-xs hover:bg-amber-100"
        >
          <CatStretchIcon size={18} /> {t('pet.motionStretch')}
        </button>
        <button
          onClick={() => playMotion('roll')}
          className="flex items-center gap-1 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-900 shadow-xs hover:bg-amber-100"
        >
          <CatRollIcon size={18} /> {t('pet.motionRoll')}
        </button>
        <button
          onClick={() => playMotion('purr')}
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
        <CandyButton tone="orange" size="md" onClick={onFeed}>
          <span className="inline-flex items-center gap-1"><CatFishIcon size={20} /> {t('pet.feedBtn')} (-2)</span>
        </CandyButton>
        <CandyButton tone="pink" size="md" onClick={onPet}>
          <span className="inline-flex items-center gap-1"><CatCombIcon size={20} /> {t('pet.combBtn')}</span>
        </CandyButton>
        <CandyButton tone="blue" size="md" onClick={onBath}>
          <span className="inline-flex items-center gap-1"><CatBathIcon size={20} /> {t('pet.bathBtn')}</span>
        </CandyButton>
        <CandyButton tone="purple" variant="soft" size="sm" onClick={onAddFish}>
          <span className="inline-flex items-center gap-1"><CatGiftIcon size={18} /> {t('pet.dailyFishBtn')} (+5)</span>
        </CandyButton>
      </div>
    </Panel>
  );
}
