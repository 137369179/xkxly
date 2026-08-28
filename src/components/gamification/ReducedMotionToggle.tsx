/**
 * 减弱动画总开关（A 儿童无障碍包容层 · A2 · R150）
 * ------------------------------------------------------------
 * 儿童前庭安全 / 光敏友好的「总开关」。两路来源合并：
 *   1) 系统偏好：prefers-reduced-motion（useReducedMotion）
 *   2) 应用内覆盖：本开关写入 safeStorage 偏好，并在 <html> 打
 *      data-reduced-motion="true"，由 a11y.css 的
 *      html[data-reduced-motion="true"] 规则全站降级动效。
 * 设计为「总开关」：开启后全站 CSS 动效降级，无需改写各业务组件。
 * 纯展示 + 持久化首选项；零学习逻辑改动、零网络、零 PII。
 * 注：Framer Motion 走 JS 动效，本开关主要覆盖 CSS 动效；系统级
 *     prefers-reduced-motion 仍由各组件 useReducedMotion 协同降级（见 GentleFeedback）。
 */
import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/game/useReducedMotion';
import { safeGetJSON, safeSetJSON } from '@/lib/safeStorage';
import '@/components/gamification/a11y.css';

const STORAGE_KEY = 'a11y.reducedMotionOverride';
type Override = 'on' | 'off' | 'system';

function readOverride(): Override {
  const v = safeGetJSON<Override | null>(STORAGE_KEY, null);
  return v === 'on' || v === 'off' ? v : 'system';
}

export function ReducedMotionToggle({ className }: { className?: string }) {
  const systemReduced = useReducedMotion();
  const [override, setOverride] = useState<Override>(() => readOverride());

  const effective = override === 'system' ? systemReduced : override === 'on';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (effective) document.documentElement.setAttribute('data-reduced-motion', 'true');
    else document.documentElement.removeAttribute('data-reduced-motion');
  }, [effective]);

  const toggle = () => {
    const next: Override = effective ? 'off' : 'on';
    setOverride(next);
    safeSetJSON(STORAGE_KEY, next);
  };

  const label = effective ? '减弱动画已开启，点击恢复生动动画' : '当前为生动动画，点击减弱动画';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={effective}
      aria-label={label}
      onClick={toggle}
      className={[
        'a11y-min-target a11y-focusable flex items-center gap-2 rounded-2xl border-2 px-3 py-2 text-sm font-bold',
        className ?? '',
      ].join(' ')}
      style={{
        background: effective ? '#EAF1FF' : '#FFFFFF',
        borderColor: effective ? '#2b6cff' : '#e3e8f0',
        color: effective ? '#1f4fd6' : '#5a6472',
      }}
    >
      <span aria-hidden="true">{effective ? '🌿' : '🌈'}</span>
      <span>{effective ? '减弱动画' : '生动动画'}</span>
    </button>
  );
}
