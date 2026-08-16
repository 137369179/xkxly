/**
 * 汉字页性能优化Hook
 * ------------------------------------------------------------
 * 使用React.memo、useMemo、useCallback等优化手段
 * 避免不必要的重渲染
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
import type { HanziEntry } from '@/data/hanziIndex';
import { useStore } from '@/store/useStore';

/**
 * 优化的汉字查询Hook
 */
export function useOptimizedHanziQuery() {
  const mastery = useStore(s => s.progress.mastery);
  
  // 缓存已学状态映射
  const learnedMap = useMemo(() => {
    const map: Record<string, { lv: number }> = {};
    for (const [key, value] of Object.entries(mastery)) {
      if (key.startsWith('hanzi:')) {
        const char = key.replace('hanzi:', '');
        map[char] = value;
      }
    }
    return map;
  }, [mastery]);

  // 缓存已学数量
  const learnedCount = useMemo(() => {
    return Object.values(learnedMap).filter(m => m.lv >= 1).length;
  }, [learnedMap]);

  return { learnedMap, learnedCount };
}

/**
 * 防抖搜索Hook
 */
export function useDebounceSearch<T>(
  value: T,
  delay: number
): T {
  const debouncedValue = useRef<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 清理定时器
  useMemo(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 延迟更新值
  useMemo(() => {
    timerRef.current = setTimeout(() => {
      debouncedValue.current = value;
    }, delay);
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue.current;
}

/**
 * 优化的汉字分组Hook
 */
export function useGroupedHanzi(data: HanziEntry[]) {
  // 按等级分组（仅一次）
  const groupedByLevel = useMemo(() => {
    const groups: Record<number, HanziEntry[]> = { 1: [], 2: [], 3: [] };
    
    for (const hanzi of data) {
      if (groups[hanzi.level]) {
        groups[hanzi.level]!.push(hanzi);
      }
    }
    
    return groups;
  }, [data]);

  // 按部首分组
  const groupedByRadical = useMemo(() => {
    const groups: Record<string, HanziEntry[]> = {};
    
    for (const hanzi of data) {
      if (!groups[hanzi.radical]) {
        groups[hanzi.radical] = [];
      }
      groups[hanzi.radical]!.push(hanzi);
    }
    
    return groups;
  }, [data]);

  return { groupedByLevel, groupedByRadical };
}

/**
 * 批量渲染优化
 */
export function useBatchRender<T>(
  items: T[],
  _renderItem?: (item: T, index: number) => React.ReactNode,
  batchSize: number = 20
) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  
  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + batchSize, items.length));
  }, [items.length, batchSize]);

  return { visibleItems, loadMore, hasMore: visibleCount < items.length };
}
