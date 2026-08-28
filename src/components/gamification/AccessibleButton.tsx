/**
 * 无障碍按钮（A 儿童无障碍包容层 · A1 / A3 / A6 · R150）
 * ------------------------------------------------------------
 * 生产级可复用按钮，把儿童可达性要求内建进基础组件：
 *   A3 最小 44px 触控命中区（Apple HIG 44pt / 儿童友好）
 *   A6 键盘焦点可见描边（.a11y-focusable，覆盖浏览器默认弱描边）
 *   A1 色彩不独依：icon 槽位 + 文案，避免仅靠颜色传达状态
 *   A2 尊重 reduced-motion：动效经 className 受 a11y.css 全局降级
 * 与 <button> 行为一致；支持 aria-pressed（开关态）/ disabled / 前置图标。
 * 纯展示、零学习逻辑改动、零网络、零 PII。
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import '@/components/gamification/a11y.css';

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 前置图标（A1 色彩不独依：用图标辅助传达含义，标记为 aria-hidden） */
  icon?: ReactNode;
  /** 是否为开关态：提供时渲染 aria-pressed，便于读屏与键盘用户识别状态 */
  pressed?: boolean;
}

export function AccessibleButton({
  icon,
  pressed,
  className,
  children,
  type = 'button',
  ...rest
}: AccessibleButtonProps) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={[
        'a11y-min-target a11y-focusable inline-flex items-center justify-center gap-2 rounded-2xl px-4 font-bold',
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      {icon != null && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}
