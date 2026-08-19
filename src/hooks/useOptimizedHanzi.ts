/**
 * 汉字页性能优化 Hook
 * ------------------------------------------------------------
 */

import { useMemo, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

/**
 * 缓存已学汉字状态映射，避免父组件反复构建 learnedMap
 */
export function useOptimizedHanziQuery() {
  const mastery = useStore(s => s.progress.mastery);

  const learnedMap = useMemo(() => {
    const map: Record<string, { lv: number }> = {};
    for (const [key, value] of Object.entries(mastery)) {
      if (key.startsWith('hanzi:')) {
        map[key.replace('hanzi:', '')] = value;
      }
    }
    return map;
  }, [mastery]);

  const learnedCount = useMemo(() => {
    return Object.values(learnedMap).filter(m => m.lv >= 1).length;
  }, [learnedMap]);

  return { learnedMap, learnedCount };
}

/**
 * 搜索防抖 Hook
 * 延迟 delay ms 后返回最新值，避免每次按键都触发重渲染
 */
export function useDebounceSearch<T>(value: T, delay: number): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const debouncedRef = useRef(value);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      debouncedRef.current = value;
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debouncedRef.current;
}
