import { sfxTap } from '@/lib/sfx';
import { useTranslation } from '@/i18n/useTranslation';

export interface TrainingBannerTarget {
  label: string;
}

/** 专项训练提示横幅：深链进入时提示当前打开的专项，可关闭 */
export function TrainingBanner({
  target,
  onClose,
}: {
  target: TrainingBannerTarget | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (!target) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-candy-orange-soft bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 shadow-candy-sm">
      <span className="text-2xl">🎯</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-extrabold text-candy-orange-deep">{t('training.banner')}</p>
        <p className="truncate text-sm font-black text-ink">{target.label}</p>
      </div>
      <button
        type="button"
        aria-label="关闭专项训练提示"
        onClick={() => {
          sfxTap();
          onClose();
        }}
        className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-ink-soft hover:bg-white"
      >
        ✕
      </button>
    </div>
  );
}
