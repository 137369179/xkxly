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

export interface VoiceCatStageProps {
  isListening: boolean;
  isTtsSpeaking: boolean;
  isMuted: boolean;
  status: AiStatus;
  expression: 'thinking' | 'excited' | 'happy' | 'cute';
  outfits: Record<string, string>;
  sttNotice: string;
}

export function VoiceCatStage({
  isListening,
  isTtsSpeaking,
  isMuted,
  status,
  expression,
  outfits,
  sttNotice,
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

  return (
    <div className="relative mx-4 flex flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-3 shadow-inner backdrop-blur-md">
      {isListening && (
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.6, 0.2] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-emerald-400 bg-emerald-400/20"
        />
      )}

      <CyberMasterCat3D
        size={112}
        expression={catExpression}
        hat={outfits['hat']}
        neck={outfits['neck']}
      />

      {/* 实时通话状态 */}
      <div className="mt-1.5 flex flex-col items-center gap-1">
        <span
          className={`flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-black shadow-md ${
            isTtsSpeaking
              ? 'bg-purple-600 text-white'
              : status === 'streaming'
                ? 'bg-amber-500 text-white'
                : isListening
                  ? 'bg-emerald-500 text-white'
                  : 'bg-indigo-600 text-white'
          }`}
        >
          {(isListening || isTtsSpeaking) && (
            <span className="flex h-3 items-center gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  animate={{ height: ['4px', '14px', '4px'] }}
                  transition={{ repeat: Infinity, duration: isTtsSpeaking ? 0.35 : 0.5, delay: i * 0.1 }}
                  className="inline-block w-0.5 rounded-full bg-white"
                />
              ))}
            </span>
          )}
          <span>{statusText}</span>
        </span>

        {sttNotice && (
          <span className="rounded-full border border-amber-500/40 bg-amber-900/80 px-3 py-0.5 text-[10px] font-bold text-amber-200">
            {sttNotice}
          </span>
        )}
      </div>
    </div>
  );
}

/** 通话标题（从 CatVoiceChatModal 拆出的独立展示） */
export function VoiceTitle() {
  const { t } = useTranslation();
  return (
    <div className="px-4 pb-2 text-center">
      <h2 className="flex items-center justify-center gap-2 text-xl font-black text-amber-200">
        <CatPurrIcon size={26} /> {t('catCompanion.voice.title')}
      </h2>
      <div className="mt-0.5 text-[10px] font-bold text-amber-300/80">
        {t('catCompanion.voice.engine')}
      </div>
    </div>
  );
}
