/**
 * 汉字500扩展 - 按造字法浏览
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { getExtendedHanzi500, type HanziItem } from '@/data/hanzi500';
import { StrokeAnimation } from '@/components/StrokeAnimation';
import { speak } from '@/lib/speech';
import { sfxTap } from '@/lib/sfx';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';
import { ExploreReward } from '@/components/study/ExploreReward';

const CATEGORIES: { id: HanziItem['category'] | 'all'; labelKey: string; emoji: string }[] = [
  { id: 'all', labelKey: 'hanzi500Page.all', emoji: '📚' },
  { id: '象形', labelKey: 'hanzi500Page.pictographic', emoji: '🌅' },
  { id: '指事', labelKey: 'hanzi500Page.indicative', emoji: '👉' },
  { id: '会意', labelKey: 'hanzi500Page.associative', emoji: '🤝' },
  { id: '形声', labelKey: 'hanzi500Page.phonetic', emoji: '🔊' },
];

const CAT_COLOR: Record<string, string> = {
  '象形': '#ff5c7a',
  '指事': '#5fd68b',
  '会意': '#e5ac2e',
  '形声': '#b8f0d8',
};

/** 性能优化（核心加强 P）：分页加载
 * 500 字一次性渲染 500 个 DOM 节点 + 监听，切到"全部"分类时明显卡顿。
 * 改为每页 80 字，滚动到底部自动加载下一批，首次 DOM 节点降到 80。 */
const PAGE_SIZE = 80;

export function Hanzi500Page() {
  const { t } = useTranslation();
  const [cat, setCat] = useState<HanziItem['category'] | 'all'>('all');
  const [selected, setSelected] = useState<HanziItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const learnSkill = useStore(s => s.learnSkill);

  const filtered = useMemo(() => {
    const all = getExtendedHanzi500();
    if (cat === 'all') return all;
    return all.filter(h => h.category === cat);
  }, [cat]);

  // 切换分类时重置分页
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [cat]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // 滚动到哨兵元素时加载下一页
  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (selected) {
    return (
      <div className="space-y-4">
        <CandyButton tone="blue" variant="soft" size="sm" onClick={() => { sfxTap(); setSelected(null); }}>
          {t('hanzi500Page.back')}
        </CandyButton>

        <Panel className="text-center">
          <div className="text-8xl font-black text-ink">{selected.char}</div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="rounded-full bg-candy-blue-soft px-3 py-1 text-sm font-bold text-candy-blue-deep">
              {selected.pinyin}
            </span>
            <span className="rounded-full bg-candy-pink-soft px-3 py-1 text-sm font-bold text-candy-pink-deep">
              {selected.category}
            </span>
            <span className="rounded-full bg-candy-green-soft px-3 py-1 text-sm font-bold text-candy-green-deep">
              {t('hanzi500Page.strokeInfo', { n: selected.strokeCount, radical: selected.radical })}
            </span>
          </div>
          <CandyButton tone="blue" size="sm" className="mt-3" onClick={() => { speak(selected.char, { rate: 0.7 }); learnSkill(`hanzi:${selected.char}`); }}>
            {t('hanzi500Page.read')}
          </CandyButton>
        </Panel>

        {/* 真实笔顺动画（hanzi-writer 数据） */}
        <StrokeAnimation char={selected.char} autoPlay />

        <Panel>
          <h4 className="mb-1 text-sm font-extrabold text-ink">{t('hanzi500Page.evolution')}</h4>
          <p className="text-sm font-bold text-ink-soft">{selected.originDesc}</p>
        </Panel>

        <Panel>
          <h4 className="mb-1 text-sm font-extrabold text-ink">{t('hanzi500Page.words')}</h4>
          <div className="flex flex-wrap gap-2">
            {selected.words.map(w => (
              <span key={w} className="rounded-full bg-candy-yellow-soft px-3 py-1 text-sm font-bold text-candy-yellow-deep">
                {w}
              </span>
            ))}
          </div>
        </Panel>

        <Panel>
          <h4 className="mb-1 text-sm font-extrabold text-ink">{t('hanzi500Page.example')}</h4>
          <p className="text-sm font-bold text-ink-soft">{selected.sentence}</p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader emoji="📚" title={t('hanzi500Page.title')} subtitle={`${getExtendedHanzi500().length} 个常用字 · 按造字法分类`} tone="blue" />

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <CandyButton
            key={c.id}
            tone={cat === c.id ? 'blue' : 'purple'}
            variant={cat === c.id ? 'solid' : 'soft'}
            size="sm"
            onClick={() => { sfxTap(); setCat(c.id); }}
          >
            {c.emoji} {t(c.labelKey)}
          </CandyButton>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
        {visible.map(h => (
          <button
            key={h.id}
            onClick={() => { sfxTap(); setSelected(h); learnSkill(`hanzi:${h.char}`); }}
            className="flex flex-col items-center rounded-xl border-4 bg-white p-2 transition-all hover:scale-105 active:translate-y-[1px]"
            style={{ borderColor: (CAT_COLOR[h.category] ?? '#cda6b0') + '40' }}
          >
            <span className="text-2xl font-black text-ink">{h.char}</span>
            <span className="text-xs font-bold text-ink-soft">{h.pinyin}</span>
          </button>
        ))}
      </div>

      {/* 滚动哨兵：进入视口时加载下一页 */}
      {hasMore && <div ref={sentinelRef} className="h-4" />}

      <p className="text-center text-xs font-bold text-ink-soft">
        {t('hanzi500Page.shown', { shown: visible.length, total: filtered.length })}
        {hasMore && <span className="ml-1 text-candy-purple">{t('hanzi500Page.loadMore')}</span>}
      </p>
    
      <ExploreReward rewardKey="hanzi-500" scene="hanzi" tone="blue" /></div>
  );
}
