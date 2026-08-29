import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap, triggerHaptic } from '@/lib/sfx';
import {
  FlatCat2D,
  type PetActionCategory,
  type PetExpressionCategory,
} from '@/components/games/FlatCat2D';
import { RealisticCat3D } from './realistic';
import {
  CatFishIcon, CatHeartIcon, CatDanceIcon, CatStretchIcon, CatRollIcon, CatPurrIcon,
  CatCombIcon, CatBathIcon, CatGiftIcon,
} from './PetIcons';
import {
  EVOLVE_IMG, EVOLVE_INFO, STAGE_THEME, OUTFITS,
  type CatAction,
} from './catData';

const MOOD_TIPS = [
  '你知道吗？小猫咪每天要睡14个小时哦！💤',
  '摸摸我的小耳朵，聪明又伶俐～✨',
  '做功课答对题目，就能喂小鱼干啦！🐟',
  '和宝贝在一起的每一秒，小茜都好开心！💖',
  '戳戳我的小脸蛋，变出大微笑～🌸',
  'High Five！今天也是超棒的学习小达人！🐾',
];

/** 羊毛毡动作 → RealisticCat3D 专属表情映射 */
const catActionToRealisticExpression = (act: CatAction): 'happy' | 'cute' | 'excited' | 'love' | 'sleepy' => {
  switch (act) {
    case 'dance': return 'excited';
    case 'purr': return 'love';
    case 'stretch': return 'cute';
    case 'jump': return 'excited';
    case 'roll': return 'happy';
    case 'pounce': return 'excited';
    case 'groom': return 'happy';
    case 'highFive': return 'excited';
    default: return 'happy';
  }
};

/** 动作 → FlatCat2D 表情映射 */
const catActionToExpression = (act: CatAction): PetExpressionCategory => {
  switch (act) {
    case 'dance': return 'excited';
    case 'purr': return 'love';
    case 'stretch': return 'cute';
    case 'jump': return 'excited';
    case 'roll': return 'happy';
    case 'pounce': return 'curious';
    case 'groom': return 'comforting';
    case 'highFive': return 'cheering';
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
  const playMotion = useCallback((act: CatAction) => {
    triggerHaptic(20);
    onTriggerMotion(act);
  }, [onTriggerMotion]);

  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % MOOD_TIPS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === '1') {
        e.preventDefault();
        triggerHaptic(25);
        onFeed();
      } else if (e.key === '2') {
        e.preventDefault();
        triggerHaptic(25);
        onPet();
      } else if (e.key === '3') {
        e.preventDefault();
        triggerHaptic(25);
        onBath();
      } else if (e.key === '4') {
        e.preventDefault();
        triggerHaptic(25);
        onAddFish();
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        playMotion('dance');
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        playMotion('stretch');
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        playMotion('roll');
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        playMotion('purr');
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        playMotion('highFive');
      } else if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        triggerHaptic(30);
        onOpenVoice();
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        triggerHaptic(30);
        onOpenMiniGame();
      } else if (e.key === ' ') {
        e.preventDefault();
        playMotion('jump');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFeed, onPet, onBath, onAddFish, playMotion, onOpenVoice, onOpenMiniGame]);

  return (
    <Panel className={`text-center space-y-4 relative overflow-hidden transition-colors duration-500 ${stageTheme.panel}`}>
      {/* 快捷操作提示条 */}
      <div className="text-center relative z-10">
        <span className="inline-block text-xs text-pink-900 font-bold bg-pink-50/90 px-3 py-1 rounded-xl border border-pink-200">
          ⌨️ 键盘快捷操作：数字 1-3 护理 · D/S/R/H 动作 · V 语音对话 · M 接鱼小游戏 · 空格 跳跃
        </span>
      </div>

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

      {/* 4 级进化天团横幅 */}
      <div className="flex justify-center mb-2 relative z-10">
        <div className={`relative overflow-hidden rounded-3xl border-4 shadow-xl max-w-[440px] w-full ${
          envLighting === 'starry' ? 'border-indigo-400' : 'border-pink-300'
        }`}>
          <div className="grid grid-cols-4 gap-0">
            {[1, 2, 3, 4].map((lv) => (
              <div key={lv} className="relative aspect-square overflow-hidden">
                <img src={EVOLVE_IMG[lv]} alt={`Lv.${lv}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-center">
                  <span className="text-xs font-black text-white">Lv.{lv}</span>
                </div>
                {catLevel === lv && (
                  <div className="absolute inset-0 border-4 border-yellow-300 bg-yellow-400/20 flex items-center justify-center">
                    <span className="bg-yellow-400 text-yellow-950 font-black text-xs px-2 py-0.5 rounded-full shadow-md">
                      {t('pet.currentEvolve')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3D 拟真与高保真毛绒模式切换 */}
      <div className="flex justify-center items-center gap-3 relative z-10">
        <button
          onClick={() => {
            sfxTap();
            setRealisticMode(!realisticMode);
          }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black border-2 transition-all shadow-md ${
            realisticMode
              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-candy-blue-on border-purple-300'
              : 'bg-gradient-to-r from-pink-400 to-rose-500 text-candy-pink-on border-pink-200'
          }`}
        >
          <span>{realisticMode ? '🎮 3D WebGL 写实模式' : '✨ 3D 毛绒矢量模式'}</span>
          <span className="text-xs opacity-80">({t('pet.clickSwitch')})</span>
        </button>
      </div>

      {/* ── 主舞台：毛绒 3D 猫咪 / WebGL 3D 猫咪 ── */}
      <div className="relative mx-auto my-3 flex flex-col items-center justify-center">
        {/* 心情气泡 */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2.4 }}
          onClick={() => setTipIndex((prev) => (prev + 1) % MOOD_TIPS.length)}
          className="mb-2 cursor-pointer rounded-full border border-pink-300 bg-white/95 px-3.5 py-1 text-xs font-black text-pink-700 shadow-md backdrop-blur-xs hover:scale-105"
        >
          {MOOD_TIPS[tipIndex]}
        </motion.div>

        {realisticMode ? (
          <div
            className={`relative h-60 w-60 cursor-pointer overflow-hidden rounded-3xl border-4 bg-white/40 shadow-fluffy backdrop-blur-xs ${stageTheme.frame}`}
            onClick={() => playMotion('jump')}
          >
            <RealisticCat3D
              size={230}
              breed="british_shorthair"
              expression={catActionToRealisticExpression(catAction)}
              hat={equippedOutfits['hat']}
              neck={equippedOutfits['neck']}
              envLighting={envLighting}
              autoRotate={false}
              showControls={false}
              className="h-full w-full"
            />
            <div className="badge-chip badge-chip--amber" style={{ top: '0.5rem', left: '0.5rem', right: 'auto' }}>
              Lv.{catLevel} {t(EVOLVE_INFO[catLevel]?.title ?? '')} {EVOLVE_INFO[catLevel]?.emoji ?? '🐱'}
            </div>
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
          <div
            className={`relative h-60 w-60 flex items-center justify-center rounded-3xl border-4 bg-gradient-to-b from-white/95 to-pink-50/80 shadow-fluffy backdrop-blur-xs relative z-10 ${stageTheme.frame}`}
          >
            <FlatCat2D
              size={220}
              action={catAction as PetActionCategory}
              expression={catActionToExpression(catAction)}
              hat={equippedOutfits['hat']}
              neck={equippedOutfits['neck']}
              envLighting={envLighting}
              onInteractZone={() => {
                onPet();
              }}
            />
            <div className="badge-chip badge-chip--amber" style={{ top: '0.5rem', left: '0.5rem', right: 'auto' }}>
              Lv.{catLevel} {t(EVOLVE_INFO[catLevel]?.title ?? '')} {EVOLVE_INFO[catLevel]?.emoji ?? '🐱'}
            </div>
            {(equippedOutfits['hat'] || equippedOutfits['neck'] || equippedOutfits['decor']) && (
              <div className="badge-chip badge-chip--pink" style={{ top: '0.5rem', right: '0.5rem' }}>
                {['hat', 'neck', 'decor'].map(type => equippedOutfits[type]).filter(Boolean).map(id => {
                  const o = OUTFITS.find(x => x.id === id);
                  return o ? o.emoji : '';
                }).join(' ')}
              </div>
            )}
          </div>
        )}

        {/* 身体触控微提示 */}
        <span className="mt-1 text-xs font-bold text-pink-700">
          ✨ 戳戳耳朵、捏捏脸蛋、碰碰小爪、摸摸肚皮有惊喜动作哦～
        </span>
      </div>

      {/* 3D HDR 氛围场景模式选择 */}
      <div className={`flex justify-center items-center gap-2 my-2 text-xs font-black relative z-10 ${
        envLighting === 'starry' ? 'text-indigo-100' : 'text-pink-900'
      }`}>
        <span className="icon-chip icon-chip--static">🎛️</span>
        <span>{t('pet.sceneLabel')}</span>
        <button
          onClick={() => setEnvLighting('nebula')}
          className={`px-3 py-1 rounded-full border ${
            envLighting === 'nebula' ? 'bg-pink-500 text-candy-pink-on border-pink-600' : 'bg-white text-pink-900 border-pink-200'
          }`}
        >
          {t('pet.sceneNebula')}
        </button>
        <button
          onClick={() => setEnvLighting('sunlight')}
          className={`px-3 py-1 rounded-full border ${
            envLighting === 'sunlight' ? 'bg-amber-500 text-candy-orange-on border-amber-600' : 'bg-white text-amber-900 border-amber-200'
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

      {/* 🎙️ 语音伴学对话 & 🎮 接鱼干小游戏大按钮 */}
      <div className="flex justify-center flex-wrap gap-3 my-3 relative z-10">
        <button
          onClick={onOpenVoice}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-candy-orange-on font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all border-2 border-white animate-bounce-soft"
        >
          <span className="text-lg">🎙️</span>
          <span>{t('pet.voiceChatBtn')}</span>
        </button>

        <button
          onClick={onOpenMiniGame}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-candy-pink-on font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all border-2 border-white"
        >
          <span className="text-lg">🎮</span>
          <span>{t('pet.fishCatchChallengeBtn')}</span>
        </button>
      </div>

      {/* 动作动画控制栏（扩充 8 种高频动作） */}
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
        <button
          onClick={() => playMotion('highFive')}
          className="flex items-center gap-1 rounded-xl border border-pink-300 bg-white px-3 py-1.5 text-xs font-black text-pink-900 shadow-xs hover:bg-pink-100"
        >
          <span>🐾</span> 击掌
        </button>
        <button
          onClick={() => playMotion('pounce')}
          className="flex items-center gap-1 rounded-xl border border-indigo-300 bg-white px-3 py-1.5 text-xs font-black text-indigo-900 shadow-xs hover:bg-indigo-100"
        >
          <span>🦋</span> 抓蝴蝶
        </button>
        <button
          onClick={() => playMotion('groom')}
          className="flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-black text-emerald-900 shadow-xs hover:bg-emerald-100"
        >
          <span>🧼</span> 洗洗脸
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

      {/* 交互护理与趣味互动按键 */}
      <div className="flex justify-center flex-wrap gap-2.5 pt-2 relative z-10">
        <CandyButton tone="orange" size="md" onClick={onFeed}>
          <span className="inline-flex items-center gap-1"><CatFishIcon size={20} /> {t('pet.feedBtn')} (-2)</span>
        </CandyButton>
        <CandyButton tone="pink" size="md" onClick={onPet}>
          <span className="inline-flex items-center gap-1"><CatCombIcon size={20} /> {t('pet.combBtn')}</span>
        </CandyButton>
        <CandyButton tone="blue" size="md" onClick={onBath}>
          <span className="inline-flex items-center gap-1"><CatBathIcon size={20} /> {t('pet.bathBtn')}</span>
        </CandyButton>
        <CandyButton tone="purple" variant="soft" size="md" onClick={onOpenVoice}>
          <span className="inline-flex items-center gap-1">🎙️ 和小茜说话</span>
        </CandyButton>
        <CandyButton tone="yellow" variant="soft" size="md" onClick={onOpenMiniGame}>
          <span className="inline-flex items-center gap-1">🎮 接鱼小游戏</span>
        </CandyButton>
        <CandyButton tone="purple" variant="ghost" size="sm" onClick={onAddFish}>
          <span className="inline-flex items-center gap-1"><CatGiftIcon size={18} /> {t('pet.dailyFishBtn')} (+5)</span>
        </CandyButton>
      </div>
    </Panel>
  );
}
