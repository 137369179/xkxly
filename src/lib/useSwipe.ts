/**
 * 📱 iPad / 移动端触屏滑动手势 Hook
 * 支持监听 TouchStart / TouchEnd 计算滑动方向，增强手账与闪卡的拟真翻页感
 */
import { useRef, useEffect } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useSwipe<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: SwipeOptions) {
  const ref = useRef<T | null>(null);
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0]!.clientX;
      startY.current = e.touches[0]!.clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const diffX = e.changedTouches[0]!.clientX - startX.current;
      const diffY = e.changedTouches[0]!.clientY - startY.current;

      // 确保是以水平向滑为主的手势
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) >= threshold) {
        if (diffX < 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (diffX > 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return ref;
}
