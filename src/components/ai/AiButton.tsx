/**
 * 「问问小智」触发按钮 —— 全站 AI 入口的统一样式
 * 与 CandyButton 保持一致的按压手感，但带小智头像，让孩子一眼认出这是 AI。
 */
import { AiAvatar } from './AiAvatar';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { sfxTap } from '@/lib/sfx';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

export function AiButton({
  onClick,
  children,
  tone = 'purple',
  loading = false,
  disabled = false,
  size = 'md',
  className,
}: {
  onClick: () => void;
  children?: string;
  tone?: Tone;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { t } = useTranslation();
  const ts = TONE_STYLE[tone]!!
  const off = disabled || loading;
  return (
    <button
      type="button"
      disabled={off}
      onClick={() => {
        if (off) return;
        sfxTap();
        onClick();
      }}
      style={{
        background: ts.main,
        color: ts.on,
        boxShadow: off ? 'none' : `0 5px 0 0 ${ts.deep}`,
      }}
      className={cn(
        'no-select inline-flex items-center justify-center gap-2 font-extrabold',
        'transition-all duration-100 active:translate-y-[4px] active:shadow-none',
        size === 'sm'
          ? 'min-h-[44px] rounded-2xl px-4 text-base'
          : 'min-h-[52px] rounded-[1.25rem] px-6 text-lg',
        off && 'opacity-60',
        className,
      )}
    >
      <AiAvatar size={size === 'sm' ? 24 : 28} mood={loading ? 'thinking' : 'idle'} />
      {loading ? t('aiButton.thinking') : (children ?? t('aiButton.defaultLabel'))}
    </button>
  );
}
