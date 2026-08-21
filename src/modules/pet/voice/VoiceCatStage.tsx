/**
 * 猫咪 3D 通话舞台（从 CatVoiceChatModal 拆分）
 * ------------------------------------------------------------
 * 纯展示组件：监听光圈 + CyberMasterCat3D + 实时状态胶囊 + STT 提示。
 */
import { motion } from 'motion/react';
import { CyberMasterCat3D } from '@/components/games/CyberMasterCat3D';
import { CatPurrIcon } from '@/modules/pet/PetIcons';
import type { AiStatus } from '@/lib/ai/useAi';
import { useTranslation } from '@/i18n/useTranslation';
import { VoiceToys } from '@/modules/pet/voice/VoiceToys';

import type { CatExpressionType } from '@/components/games/FlatCat2D';

export interface VoiceCatStageProps {
  isListening: boolean;
  isTtsSpeaking: boolean;
  isMuted: boolean;
  status: AiStatus;
  expression: CatExpressionType;
  outfits: Record<string, string>;
  sttNotice: string;
  onPet?: () => void;
  onFeed?: () => void;
  onPraise?: () => void;
  onEquipOutfit?: (category: 'hat' | 'neck', outfitId: string) => void;
  onCatAction?: (msg: string, expression: CatExpressionType) => void;
  fishCount?: number;
}

export function VoiceCatStage({
  isListening,
  isTtsSpeaking,
  isMuted,
  status,
  expression,
  outfits,
  sttNotice,
  onPet,
  onFeed,
  onPraise,
  onEquipOutfit,
  onCatAction,
  fishCount = 0,
}: VoiceCatStageProps) {
  const { t } = useTranslation();
  const catExpression = isTtsSpeaking
    ? 'excited'
    : status === 'streaming'
      ? 'excited'
      : isListening
        ? 'cute'
        : expression;

  const statusText = isTtsSpeaking
    ? t('catCompanion.voice.speaking')
    : status === 'streaming'
      ? t('catCompanion.voice.thinking')
      : isListening
        ? t('catCompanion.voice.listening')
        : isMuted
          ? t('catCompanion.voice.muted')
          : t('catCompanion.voice.connected');

  const handleInteractZone = (zone: string) => {
    switch (zone) {
      case 'ears':
        onCatAction?.('耳朵痒痒的～小茜在竖起耳朵听宝贝说话呢！', 'cute');
        break;
      case 'forehead':
        onCatAction?.('摸摸头，宝贝今天真乖！小茜好喜欢你呀～', 'happy');
        onPet?.();
        break;
      case 'cheeks':
        onCatAction?.('捏捏软乎乎的小脸蛋～好舒服呀，喵呜～', 'happy');
        break;
      case 'nose':
        onCatAction?.('阿啾！碰碰小鼻尖，闻到了智慧的香味～', 'thinking');
        break;
      case 'belly':
        onCatAction?.('哈哈哈哈好痒好痒！小茜的肚皮最怕痒啦～', 'excited');
        break;
      case 'paws':
        onCatAction?.('耶！跟小茜击个掌！High Five！我们是最棒的学习搭档！', 'excited');
        break;
      case 'tail':
        onCatAction?.('摇一摇快乐尾巴～给宝贝加满活力能量！', 'happy');
        break;
    }
  };

  return (
    <div className="relative mx-4 flex flex-col items-center justify-center rounded-3xl border-2 border-pink-200/70 bg-gradient-to-b from-white/90 to-pink-50/80 p-3 shadow-md backdrop-blur-md">
      {isListening && (
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="pointer-events-none absolute inset-0 rounded-3xl border-2 border-pink-400 bg-pink-400/15"
        />
      )}

      <CyberMasterCat3D
        size={132}
        expression={catExpression}
        hat={outfits['hat']}
        neck={outfits['neck']}
        onInteractZone={handleInteractZone}
        onPet={onPet}
      />

      {/* 身体互动微提示 */}
      <span className="mt-1 text-[11px] font-bold text-pink-400">
        ✨ 戳戳耳朵、捏捏脸蛋、碰碰小爪有惊喜动作哦～
      </span>

      {/* 实时通话状态 */}
      <div className="mt-0.5 flex flex-col items-center gap-1">
        <span
          className={`flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-black shadow-sm ${
            isTtsSpeaking
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : status === 'streaming'
                ? 'bg-amber-400 text-amber-950'
                : isListening
                  ? 'bg-emerald-500 text-white'
                  : 'bg-pink-100 text-pink-700 border border-pink-200'
          }`}
        >
          {(isListening || isTtsSpeaking) && (
            <span className="flex h-3 items-center gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  animate={{ height: ['4px', '14px', '4px'] }}
                  transition={{ repeat: Infinity, duration: isTtsSpeaking ? 0.35 : 0.5, delay: i * 0.1 }}
                  className="inline-block w-0.5 rounded-full bg-current"
                />
              ))}
            </span>
          )}
          <span>{statusText}</span>
        </span>

        {/* 孩子互动快捷点赞投喂条 */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {onPet && (
            <button
              type="button"
              onClick={onPet}
              className="flex items-center gap-1 rounded-full border border-pink-200 bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-pink-600 shadow-xs transition-all hover:bg-pink-100 active:scale-90"
              title="摸摸小猫的头"
            >
              <span>💖</span>
              <span>摸摸</span>
            </button>
          )}

          {onFeed && (
            <button
              type="button"
              onClick={onFeed}
              className="flex items-center gap-1 rounded-full border border-pink-200 bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-pink-600 shadow-xs transition-all hover:bg-pink-100 active:scale-90"
              title={`喂一条小鱼干 (当前有 ${fishCount} 条)`}
            >
              <span>🐟</span>
              <span>喂鱼干 ({fishCount})</span>
            </button>
          )}

          {onPraise && (
            <button
              type="button"
              onClick={onPraise}
              className="flex items-center gap-1 rounded-full border border-pink-200 bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-pink-600 shadow-xs transition-all hover:bg-pink-100 active:scale-90"
              title="给小茜鼓鼓掌"
            >
              <span>👏</span>
              <span>鼓掌</span>
            </button>
          )}
        </div>

        {sttNotice && (
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-0.5 text-[11px] font-bold text-amber-800 shadow-xs">
            {sttNotice}
          </span>
        )}

        {/* 趣味百宝箱 */}
        <VoiceToys
          onEquipOutfit={onEquipOutfit}
          onCatAction={onCatAction}
          currentOutfits={outfits}
        />
      </div>
    </div>
  );
}

/** 通话标题（从 CatVoiceChatModal 拆出的独立展示） */
export function VoiceTitle() {
  const { t } = useTranslation();
  return (
    <div className="px-4 pb-1 pt-2 text-center">
      <h2 className="flex items-center justify-center gap-1.5 text-lg font-black text-ink">
        <CatPurrIcon size={24} /> {t('catCompanion.voice.title')}
      </h2>
    </div>
  );
}
