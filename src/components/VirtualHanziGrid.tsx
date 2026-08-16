/**
 * 汉字页虚拟滚动优化
 * ------------------------------------------------------------
 * 使用 IntersectionObserver 实现虚拟列表，仅渲染可视区域内的卡片
 * 避免一次性渲染300+个DOM节点导致的性能问题
 */

import { memo, useMemo, useRef, useState, useEffect } from 'react';
import type { HanziEntry } from '@/data/hanziIndex';
import { HanziVideoCard } from '@/modules/hanzi/HanziVideoCard';

const CARD_HEIGHT = 130; // 每张卡片的高度（px）
const CARD_GAP = 8; // 卡片间距
const COLUMNS = 4; // 每行显示4张卡片
const PRELOAD_ROWS = 3; // 预加载行数

export interface VirtualHanziGridProps {
  data: HanziEntry[];
  learnedMap: Record<string, boolean>;
  onCardClick?: (hanzi: HanziEntry) => void;
}

/**
 * 简单虚拟滚动实现
 */
export const VirtualHanziGrid = memo(function VirtualHanziGrid({
  data,
  learnedMap,
  onCardClick,
}: VirtualHanziGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.length === 0) return;
    
    const cardHeight = CARD_HEIGHT + CARD_GAP;
    const totalRows = Math.ceil(data.length / COLUMNS);
    
    const updateVisibleRange = () => {
      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;
      
      const startRow = Math.max(0, Math.floor(scrollTop / cardHeight) - PRELOAD_ROWS);
      const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / cardHeight) + PRELOAD_ROWS);
      
      const startIndex = startRow * COLUMNS;
      const endIndex = Math.min(endRow * COLUMNS, data.length);
      
      setVisibleRange({ start: startIndex, end: endIndex });
    };
    
    updateVisibleRange();
    container.addEventListener('scroll', updateVisibleRange, { passive: true });
    window.addEventListener('resize', updateVisibleRange);
    
    return () => {
      container.removeEventListener('scroll', updateVisibleRange);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [data.length]);
  
  const renderCard = (hanzi: HanziEntry, index: number) => {
    if (index < visibleRange.start || index >= visibleRange.end) {
      return (
        <div
          key={index}
          style={{ height: `${CARD_HEIGHT}px`, opacity: 0 }}
          aria-hidden="true"
        />
      );
    }
    
    return (
      <div key={index}>
        <HanziVideoCard
          char={hanzi.c}
          pinyin={hanzi.pd}
          tone={hanzi.tone}
          learned={learnedMap[hanzi.c] || false}
          onClick={() => onCardClick?.(hanzi)}
        />
      </div>
    );
  };
  
  if (data.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-ink-soft">
        <p className="text-base font-bold">暂无汉字数据</p>
      </div>
    );
  }
  
  const totalRows = Math.ceil(data.length / COLUMNS);
  const totalHeight = totalRows * (CARD_HEIGHT + CARD_GAP);
  const visibleCards = data.slice(visibleRange.start, visibleRange.end);
  
  return (
    <div
      ref={containerRef}
      className="relative max-h-[600px] overflow-y-auto"
      role="list"
      aria-label="汉字列表"
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {visibleCards.map((_, localIdx) => {
          const globalIdx = visibleRange.start + localIdx;
          const row = Math.floor(globalIdx / COLUMNS);
          
          return (
            <div
              key={globalIdx}
              className="absolute left-0 right-0 flex gap-2 p-1"
              style={{
                top: `${row * (CARD_HEIGHT + CARD_GAP)}px`,
                height: `${CARD_HEIGHT}px`,
              }}
              role="listitem"
            >
              {Array.from({ length: COLUMNS }).map((_, colIdx) => {
                const cardIndex = row * COLUMNS + colIdx;
                if (cardIndex >= data.length) return <div key={colIdx} style={{ width: 'calc(25% - 6px)' }} />;
                
                return (
                  <div
                    key={colIdx}
                    style={{ width: 'calc(25% - 6px)' }}
                  >
                    {renderCard(data[cardIndex]!, cardIndex)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/**
 * 带搜索过滤的虚拟汉字网格
 */
export function FilteredVirtualHanziGrid({
  data,
  filterText,
  learnedMap,
  onCardClick,
}: VirtualHanziGridProps & {
  filterText: string;
}) {
  const filteredData = useMemo(() => {
    if (!filterText.trim()) return data;
    
    const search = filterText.toLowerCase().trim();
    return data.filter((h: HanziEntry) => 
      h.c.includes(search) || 
      h.p.includes(search) ||
      h.pd.includes(search)
    );
  }, [data, filterText]);

  return (
    <VirtualHanziGrid
      data={filteredData}
      learnedMap={learnedMap}
      onCardClick={onCardClick}
    />
  );
}
