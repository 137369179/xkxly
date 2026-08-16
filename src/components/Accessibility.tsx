/**
 * 无障碍访问性增强组件
 * ------------------------------------------------------------
 * 提供统一的ARIA标签、键盘导航和屏幕阅读器支持
 */

import { useEffect, useRef, useState } from 'react';

/**
 * 键盘导航Hook - 支持方向键移动焦点
 */
export function useKeyboardNavigation(options: {
  items: Array<{ id: string; element?: HTMLElement }>;
  onNavigate?: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentIndex = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { key } = e;
      const { items, onNavigate } = options;
      
      if (!items.length) return;
      
      switch (key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          currentIndex.current = (currentIndex.current + 1) % items.length;
          onNavigate?.(currentIndex.current);
          focusItem(currentIndex.current);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          currentIndex.current = (currentIndex.current - 1 + items.length) % items.length;
          onNavigate?.(currentIndex.current);
          focusItem(currentIndex.current);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          items[currentIndex.current]?.element?.click();
          break;
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [options]);
  
  const focusItem = (index: number) => {
    const item = options.items[index];
    item?.element?.focus();
  };

  return { containerRef, focusItem };
}

/**
 * 屏幕阅读器通知
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // 延迟移除，确保屏幕阅读器有时间读取
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * 焦点管理Hook
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
      
      if (e.key === 'Escape') {
        // 触发关闭事件
        container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}

/**
 * ARIA标签增强按钮
 */
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel?: string;
  ariaDescribedBy?: string;
  role?: string;
}

export function AccessibleButton({ 
  ariaLabel, 
  ariaDescribedBy,
  children, 
  className,
  ...props 
}: AccessibleButtonProps) {
  return (
    <button
      className={className}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * 高对比度模式检测
 */
export function useHighContrastMode(): boolean {
  const [isHighContrast, setIsHighContrast] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    setIsHighContrast(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return isHighContrast;
}

/**
 * 减少动画偏好检测
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return reducedMotion;
}
