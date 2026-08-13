import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { TONE_STYLE, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import { sfxTap } from '@/lib/sfx';

type Size = 'sm' | 'md' | 'lg' | 'xl';

/**
 * 各尺寸最小高度保证（A1 · 大按钮防误触）：
 *   - sm ≥ 40px（实测 44px，留余量）
 *   - md ≥ 48px（实测 52px）
 *   - lg ≥ 56px（实测 64px）
 *   - xl 更大，给主要 CTA 用
 * 全部同时满足 WCAG ≥ 44×44px 触控目标推荐。
 */
const SIZE: Record<Size, string> = {
  sm: 'min-h-[44px] min-w-[44px] px-4 text-base rounded-2xl',
  md: 'min-h-[52px] min-w-[52px] px-6 text-lg rounded-[1.25rem]',
  lg: 'min-h-[64px] min-w-[64px] px-8 text-xl rounded-[1.5rem]',
  xl: 'min-h-[76px] min-w-[76px] px-10 text-2xl rounded-[1.75rem]',
};

/** 二次确认的超时窗口（毫秒）：2 秒内再次点击才执行 */
const CONFIRM_WINDOW_MS = 2000;

export interface CandyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: Size;
  variant?: 'solid' | 'soft' | 'ghost';
  icon?: ReactNode;
  fullWidth?: boolean;
  /** 关闭点击音效 */
  silent?: boolean;
  /** 显式保证点击区域 ≥ 44×44px（WCAG 推荐，图标按钮等小尺寸场景使用） */
  minTouchTarget?: boolean;
  /**
   * 关键操作（删除、重置等）二次确认：
   * - 第一次点击进入"待确认"态，按钮显示「再按一次确认」
   * - CONFIRM_WINDOW_MS 内再次点击才真正执行 onClick
   * - 超时自动恢复为初始态
   */
  requireConfirm?: boolean;
}

export function CandyButton({
  tone = 'purple',
  size = 'md',
  variant = 'solid',
  icon,
  fullWidth,
  silent,
  minTouchTarget,
  requireConfirm,
  className,
  children,
  onClick,
  disabled,
  ...rest
}: CandyButtonProps) {
  const { t: translate } = useTranslation();
  const ts = TONE_STYLE[tone]!

  // 二次确认状态：armed=true 表示已进入"待确认"态，等待第二次点击
  const [armed, setArmed] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 卸载时清理定时器，避免 setState on unmounted
  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  const style =
    variant === 'solid'
      ? {
          background: `linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(0,0,0,0.04) 100%), ${ts.main}`,
          color: ts.on,
          boxShadow: `0 6px 0 0 ${ts.deep}, inset 0 2px 0 0 rgba(255,255,255,0.45)`,
        }
      : variant === 'soft'
        ? {
            background: ts.soft,
            color: ts.deep,
            boxShadow: `0 4px 0 0 ${ts.main}44, inset 0 1.5px 0 0 rgba(255,255,255,0.7)`,
          }
        : { background: 'transparent', color: ts.deep, boxShadow: 'none' };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (requireConfirm) {
      if (armed) {
        if (confirmTimer.current) {
          clearTimeout(confirmTimer.current);
          confirmTimer.current = null;
        }
        setArmed(false);
        if (!silent) sfxTap();
        onClick?.(e);
        return;
      }
      setArmed(true);
      confirmTimer.current = setTimeout(() => {
        confirmTimer.current = null;
        setArmed(false);
      }, CONFIRM_WINDOW_MS);
      return;
    }
    if (!silent) sfxTap();
    onClick?.(e);
  };

  return (
    <button
      {...rest}
      disabled={disabled}
      onClick={handleClick}
      style={style}
      className={cn(
        'no-select relative inline-flex items-center justify-center gap-2 font-black tracking-wide',
        'transition-all duration-100 ease-out select-none border border-white/30',
        'active:translate-y-[4px] active:shadow-none hover:brightness-105',
        'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-purple/60',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0',
        SIZE[size],
        minTouchTarget && 'min-touch-target',
        fullWidth && 'w-full',
        className,
      )}
    >
      {requireConfirm && armed ? (
        <span className="whitespace-nowrap">{translate('button.confirmAgain')}</span>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

/** 圆形图标按钮 */
export function IconButton({
  tone = 'purple',
  className,
  children,
  onClick,
  silent,
  label,
  ...rest
}: Omit<CandyButtonProps, 'size' | 'variant'> & { label: string }) {
  const ts = TONE_STYLE[tone]!;
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      onClick={(e) => {
        if (!silent) sfxTap();
        onClick?.(e);
      }}
      style={{
        background: ts.soft,
        color: ts.deep,
        boxShadow: `0 5px 0 0 ${ts.main}55, inset 0 2px 0 0 rgba(255,255,255,0.7)`,
      }}
      className={cn(
        'no-select grid h-12 w-12 place-items-center rounded-full text-xl font-black border-2 border-white/60',
        'transition-all duration-100 active:translate-y-[4px] active:shadow-none hover:scale-105',
        'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-candy-purple/60',
        className,
      )}
    >
      {children}
    </button>
  );
}
