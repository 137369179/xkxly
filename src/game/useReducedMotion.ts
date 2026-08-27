/**
 * 无障碍：prefers-reduced-motion 订阅 Hook
 * ------------------------------------------------------------
 * 儿童前庭安全 / 光敏友好（A 儿童无障碍包容层 · R135 新增）。
 * 所有动效（彩带 / 缩放 / 转场）应读取本值后降级为静态，
 * 避免高频动画引发不适。SSR / 无 matchMedia 环境安全降级为 false。
 */
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(QUERY).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}
