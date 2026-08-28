/**
 * 影子配对 🌟 (R3)
 * 找物品和影子的对应关系
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong, sfxWin, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { cn, shuffle } from '@/lib/utils';

const ITEMS = [
  { emoji: '🐘', shadow: 'Shape-shadow of elephant', name: '大象' },
  { emoji: '🦒', shadow: 'Shape-shadow of giraffe', name: '长颈鹿' },
  { emoji: '🐰', shadow: 'Shape-shadow of rabbit', name: '兔子' },
  { emoji: '🐟', shadow: 'Shape-shadow of fish', name: '鱼' },
  { emoji: '🦋', shadow: 'Shape-shadow of butterfly', name: '蝴蝶' },
  { emoji: '🍎', shadow: 'Shape-shadow of apple', name: '苹果' },
  { emoji: '⭐', shadow: 'Shape-shadow of star', name: '星星' },
  { emoji: '🏠', shadow: 'Shape-shadow of house', name: '房子' },
];

export function ShadowMatch() {
  const { t } = useTranslation();
  const [items, setItems] = useState(() => shuffle(ITEMS).slice(0, 4));
  const [shadows, setShadows] = useState(() => shuffle(items));
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');

  // 清理挂起的 setTimeout，防止组件卸载后仍触发 setState
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 组件卸载时清理所有挂起的定时器
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current !== null) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, []);

  const newItemSet = useCallback(() => {
    sfxTap();
    triggerHaptic(30);
    if (inactivityTimerRef.current !== null) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    const newItems = shuffle(ITEMS).slice(0, 4);
    setItems(newItems);
    setShadows(shuffle(newItems));
    setSelectedItem(null);
    setMatched([]);
    setFeedback('');
  }, []);

  const clickItem = useCallback((idx: number) => {
    if (matched.includes(idx)) return;
    sfxTap();
    triggerHaptic(20);
    setSelectedItem(idx);
  }, [matched]);

  const clickShadow = useCallback((sIdx: number) => {
    if (selectedItem === null || matched.includes(selectedItem)) return;
    if (items[selectedItem]?.name === shadows[sIdx]?.name) {
      sfxCorrect();
      triggerHaptic(45);
      const newMatched = [...matched, selectedItem];
      setMatched(newMatched);
      setScore(s => s + 1);
      setFeedback(t('shadowMatch.matchSuccess'));
      setSelectedItem(null);
      if (newMatched.length >= items.length) {
        sfxWin();
        celebrateSmall();
        triggerHaptic([60, 40, 60, 40, 100]);
        inactivityTimerRef.current = setTimeout(newItemSet, 1500);
      }
    } else {
      sfxWrong();
      triggerHaptic(20);
      setFeedback(t('shadowMatch.matchWrong'));
      setSelectedItem(null);
    }
    inactivityTimerRef.current = setTimeout(() => setFeedback(''), 1000);
  }, [selectedItem, matched, items, shadows, t, newItemSet]);

  // 键盘快捷监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (selectedItem === null) {
          if (items[idx] && !matched.includes(idx)) {
            e.preventDefault();
            clickItem(idx);
          }
        } else {
          if (shadows[idx]) {
            e.preventDefault();
            clickShadow(idx);
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedItem(null);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        newItemSet();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, items, shadows, matched, clickItem, clickShadow, newItemSet]);

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('shadowMatch.title')}</h3>
      <p className="mb-2 text-center text-xs font-bold text-ink-soft">{t('shadowMatch.subtitle')}</p>

      {/* 快捷操作提示条 */}
      <div className="mb-3 text-center">
        <span className="inline-block text-xs text-blue-900 font-bold bg-blue-50/90 px-3 py-1 rounded-xl border border-blue-200">
          ⌨️ 键盘快捷操作：数字键 1-4 选择物品/影子 · Escape 取消选择 · R 换一组
        </span>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-center text-xs font-extrabold text-ink-soft">{t('shadowMatch.itemsLabel')}</p>
        <div className="flex justify-center gap-3">
          {items.map((item, i) => (
            <button
              key={`item-${i}`}
              type="button"
              onClick={() => clickItem(i)}
              disabled={matched.includes(i)}
              className={cn(
                'flex h-16 w-16 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl text-3xl shadow-sm transition-all focus-visible:ring-4 focus-visible:ring-blue-300 focus:outline-none',
                matched.includes(i) ? 'bg-candy-green-soft opacity-50 scale-95' :
                selectedItem === i ? 'bg-candy-blue-deep text-white scale-110 shadow-md ring-4 ring-blue-300' : 'bg-white hover:scale-105 active:scale-95'
              )}
              title={item.name}
            >
              {item.emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-center text-xs font-extrabold text-ink-soft">{t('shadowMatch.shadowsLabel')}</p>
        <div className="flex justify-center gap-3">
          {shadows.map((shadow, i) => {
            const isMatched = matched.some(mi => items[mi]?.name === shadow.name);
            return (
              <button
                key={`shadow-${i}`}
                type="button"
                onClick={() => clickShadow(i)}
                disabled={isMatched}
                className={cn(
                  'flex h-16 w-16 min-h-[48px] min-w-[48px] items-center justify-center rounded-2xl text-3xl shadow-sm transition-all focus-visible:ring-4 focus-visible:ring-blue-300 focus:outline-none',
                  isMatched ? 'bg-candy-green-soft opacity-50 scale-95' : 'bg-gray-200 hover:scale-105 active:scale-95'
                )}
                style={{ filter: isMatched ? 'none' : 'brightness(0) invert(0.2)' }}
                title="影子"
              >
                {shadow.emoji}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {!!feedback && (
          <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-candy-blue-deep">
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs font-bold text-ink-soft">{t('shadowMatch.pairProgress', { matched: matched.length, total: items.length, score })}</span>
        <CandyButton tone="blue" size="sm" onClick={newItemSet} className="min-h-[44px] px-4 font-bold">
          🔄 {t('shadowMatch.newSet')}
        </CandyButton>
      </div>
    </div>
  );
}
