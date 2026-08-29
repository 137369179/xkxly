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
  onClear,
  isMuted,
  onToggleMute,
  closeBtnRef,
}: {
  seconds: number;
  onClose: () => void;
  onClear?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  closeBtnRef?: React.Ref<HTMLButtonElement>;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between border-b border-pink-200/40 bg-white/60 px-4 py-2.5 backdrop-blur-md sm:px-5">
      {/* 在线与时长徽标 */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/90 px-3 py-1 text-xs font-black text-emerald-800 shadow-xs">
          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-emerald-500" />
          <span>{formatTime(seconds)}</span>
        </span>
        <span className="hidden text-xs font-bold text-pink-700 sm:inline-block">
          {t('catCompanion.voice.engine')}
        </span>
      </div>

      {/* 顶部快捷操作 */}
      <div className="flex items-center gap-1.5">
        {onToggleMute && (
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? '取消静音' : '静音'}
            title={isMuted ? '点击开启小茜语音朗读' : '点击静音小茜语音'}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-pink-200 bg-white/80 text-sm font-bold text-pink-600 shadow-xs transition-all hover:bg-pink-50 active:scale-90"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        )}

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="清空对话"
            title="清空当前对话记录"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-pink-200 bg-white/80 text-xs font-bold text-pink-600 shadow-xs transition-all hover:bg-pink-50 active:scale-90"
          >
            🗑️
          </button>
        )}

        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label={t('catCompanion.voice.close')}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-pink-300 bg-pink-100/80 text-sm font-black text-pink-700 shadow-xs transition-all hover:bg-pink-200 active:scale-90"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
