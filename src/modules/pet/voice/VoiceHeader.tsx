/**
 * 语音通话顶部栏（从 CatVoiceChatModal 拆分）
 * ------------------------------------------------------------
 * 纯展示组件：通话时长徽标 + 关闭按钮。
 */
import { useTranslation } from '@/i18n/useTranslation';

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function VoiceHeader({
  seconds,
  onClose,
  closeBtnRef,
}: {
  seconds: number;
  onClose: () => void;
  closeBtnRef?: React.Ref<HTMLButtonElement>;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between px-4 sm:px-5 pt-3.5 pb-1">
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xs font-black tracking-wide text-emerald-300 shadow-xs">
        <span className="inline-block h-2 w-2 animate-ping rounded-full bg-emerald-400" />
        {t('catCompanion.voice.callStatus', { time: formatTime(seconds) })}
      </span>
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label={t('catCompanion.voice.close')}
        className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/10 text-base font-bold text-amber-100 transition-all hover:bg-white/20 active:scale-90"
      >
        ✕
      </button>
    </div>
  );
}
