/**
 * 通话控制台（从 CatVoiceChatModal 拆分）
 * ------------------------------------------------------------
 * 纯展示组件：静音 / 挂断 / 结束说话（或重新说话）三键。
 */
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap } from '@/lib/sfx';

export function VoiceControls({
  isMuted,
  isListening,
  onToggleMute,
  onHangUp,
  onToggleListen,
}: {
  isMuted: boolean;
  isListening: boolean;
  onToggleMute: () => void;
  onHangUp: () => void;
  onToggleListen: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-3 gap-2 border-t border-white/10 px-4 pb-3 pt-2 sm:px-5 sm:pb-4">
      <button
        type="button"
        onClick={onToggleMute}
        className={`flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-black transition-all active:scale-95 ${
          isMuted
            ? 'border border-amber-400 bg-amber-600 text-white'
            : 'border border-white/20 bg-white/10 text-amber-100 hover:bg-white/20'
        }`}
      >
        {isMuted ? t('catCompanion.voice.unmute') : t('catCompanion.voice.muteOn')}
      </button>

      <button
        type="button"
        onClick={onHangUp}
        className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 py-2.5 text-xs font-black text-white shadow-lg transition-all hover:from-rose-700 hover:to-red-700 active:scale-95"
      >
        {t('catCompanion.voice.hangUp')}
      </button>

      <button
        type="button"
        onClick={onToggleListen}
        className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-xs font-black text-white shadow-md transition-all hover:bg-emerald-700 active:scale-95"
      >
        {isListening ? t('catCompanion.voice.doneSpeaking') : t('catCompanion.voice.speakAgain')}
      </button>
    </div>
  );
}

/** 快速提问词组（从 CatVoiceChatModal 拆出的独立展示） */
export function QuickPhrases({ onSend }: { onSend: (text: string) => void }) {
  const { t } = useTranslation();
  const QUICK_PHRASE_KEYS = [
    'catCompanion.quickPhrases.0',
    'catCompanion.quickPhrases.1',
    'catCompanion.quickPhrases.2',
    'catCompanion.quickPhrases.3',
    'catCompanion.quickPhrases.4',
    'catCompanion.quickPhrases.5',
  ];
  return (
    <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-4 pb-1 pt-2">
      {QUICK_PHRASE_KEYS.map((phrase, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => {
            sfxTap();
            onSend(t(phrase).replace(/^[\p{Emoji}\s]+/u, ''));
          }}
          className="flex-shrink-0 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-[11px] font-extrabold text-amber-100 shadow-xs transition-all hover:bg-white/30 active:scale-95"
        >
          {t(phrase)}
        </button>
      ))}
    </div>
  );
}