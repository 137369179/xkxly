/**
 * 影子配对 🌟 (R3)
 * 找物品和影子的对应关系
 */
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
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

// 简化：用 silhouette 滤镜模拟影子

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

  const newItemSet = () => {
    // 切换前清理挂起的定时器，避免新游戏已开始还在触发旧 setState
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
  };

  const clickItem = (idx: number) => {
    if (matched.includes(idx)) return;
    sfxTap();
    setSelectedItem(idx);
  };

  const clickShadow = (sIdx: number) => {
    if (selectedItem === null || matched.includes(selectedItem)) return;
    if (items[selectedItem]!.name === shadows[sIdx]!.name) {
      sfxCorrect();
      setMatched(m => [...m, selectedItem]);
      setScore(s => s + 1);
      setFeedback(t('shadowMatch.matchSuccess'));
      setSelectedItem(null);
      if (matched.length + 1 >= items.length) {
        inactivityTimerRef.current = setTimeout(newItemSet, 1500);
      }
    } else {
      sfxWrong();
      setFeedback(t('shadowMatch.matchWrong'));
      setSelectedItem(null);
    }
    inactivityTimerRef.current = setTimeout(() => setFeedback(''), 1000);
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('shadowMatch.title')}</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">{t('shadowMatch.subtitle')}</p>

      <div className="mb-4">
        <p className="mb-2 text-center text-xs font-extrabold text-ink-soft">{t('shadowMatch.itemsLabel')}</p>
        <div className="flex justify-center gap-3">
          {items.map((item, i) => (
            <button key={`item-${i}`} onClick={() => clickItem(i)} disabled={matched.includes(i)}
              className={cn('flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-sm transition-all',
                matched.includes(i) ? 'bg-candy-green-soft opacity-50' :
                selectedItem === i ? 'bg-candy-blue-deep scale-110' : 'bg-white hover:scale-105'
              )}>
              {item.emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-center text-xs font-extrabold text-ink-soft">{t('shadowMatch.shadowsLabel')}</p>
        <div className="flex justify-center gap-3">
          {shadows.map((shadow, i) => {
            const isMatched = matched.some(mi => items[mi]!.name === shadow.name);
            return (
              <button key={`shadow-${i}`} onClick={() => clickShadow(i)} disabled={isMatched}
                className={cn('flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-sm transition-all',
                  isMatched ? 'bg-candy-green-soft opacity-50' : 'bg-gray-200 hover:scale-105'
                )}
                style={{ filter: isMatched ? 'none' : 'brightness(0) invert(0.2)' }}>
                {shadow.emoji}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}
      </AnimatePresence>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-bold text-ink-soft">{t('shadowMatch.pairProgress', { matched: matched.length, total: items.length, score })}</span>
        <CandyButton tone="blue" size="sm" onClick={newItemSet}>{t('shadowMatch.newSet')}</CandyButton>
      </div>
    </div>
  );
}
