/**
 * 韵母分类练习 🎶 (N5)
 * 将韵母按类型分类：单韵母/复韵母/前鼻韵母/后鼻韵母
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';
import { useStore } from '@/store/useStore';

/** 韵母分类数据（教学正确性核心：单6/复9/前鼻5/后鼻4，供单元测试校验） */
export const YUNMU = [
  // 单韵母 (6)
  ...['a','o','e','i','u','ü'].map(p => ({ p, type: 'single' as const, label: '单韵母' })),
  // 复韵母 (9)
  ...['ai','ei','ui','ao','ou','iu','ie','üe','er'].map(p => ({ p, type: 'compound' as const, label: '复韵母' })),
  // 前鼻韵母 (5)
  ...['an','en','in','un','ün'].map(p => ({ p, type: 'front_nasal' as const, label: '前鼻韵母' })),
  // 后鼻韵母 (4)
  ...['ang','eng','ing','ong'].map(p => ({ p, type: 'back_nasal' as const, label: '后鼻韵母' })),
];

export const CATEGORIES = [
  { id: 'single', label: '单韵母', emoji: '😮', color: 'bg-candy-blue-soft', desc: 'a o e i u ü', hint: '嘴巴形状不变' },
  { id: 'compound', label: '复韵母', emoji: '🔄', color: 'bg-candy-green-soft', desc: 'ai ei ui ao ou iu ie üe er', hint: '两个单韵母组合' },
  { id: 'front_nasal', label: '前鼻韵母', emoji: '👃', color: 'bg-candy-orange-soft', desc: 'an en in un ün', hint: '以 n 结尾，舌尖抵上牙膛' },
  { id: 'back_nasal', label: '后鼻韵母', emoji: '😤', color: 'bg-candy-pink-soft', desc: 'ang eng ing ong', hint: '以 ng 结尾，鼻子嗡嗡响' },
] as const;

type YMCategory = (typeof CATEGORIES)[number]['id'];

export function PinyinGroup() {
  const { t } = useTranslation();
  const CAT_LABEL_KEY: Record<string, string> = {"单韵母": "pinyinGroup.single", "复韵母": "pinyinGroup.compound", "前鼻韵母": "pinyinGroup.frontNasal", "后鼻韵母": "pinyinGroup.backNasal"};
  const [items, setItems] = useState(() => shuffle(YUNMU).slice(0, 8));
  const [placed, setPlaced] = useState<Record<string, YMCategory>>({});
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; pinyin: string; category: YMCategory } | null>(null);
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);
  const practice = useStore((s) => s.practice);

  const handleDrop = (categoryId: YMCategory) => {
    if (!draggedItem || lockRef.current) return;
    const item = YUNMU.find(y => y.p === draggedItem);
    if (!item) return;
    const isCorrect = item.type === categoryId;
    // SRS 回写：以该韵母所属分组的稳定 id 作为掌握度 key
    practice(`pinyin:group:${item.type}`, isCorrect, isCorrect ? 1 : 0);

    if (isCorrect) {
      sfxCorrect();
      setScore(s => s + 1);
      setPlaced(prev => ({ ...prev, [item.p]: categoryId }));
      void speak(`对了，${item.p}是${CATEGORIES.find(c => c.id === categoryId)?.label}`, { lang: 'zh-CN', rate: 0.8, module: 'praise' }).catch(() => {});
      setFeedback({ correct: true, pinyin: item.p, category: categoryId });
    } else {
      sfxWrong();
      const correctCat = CATEGORIES.find(c => c.id === item.type);
      setFeedback({ correct: false, pinyin: item.p, category: categoryId });
      void speak(`${item.p}不是${CATEGORIES.find(c => c.id === categoryId)?.label}，它是${correctCat?.label}`, { lang: 'zh-CN', rate: 0.8, module: 'praise' }).catch(() => {});
    }
    setDraggedItem(null);
    setTimeout(() => {
      setFeedback(null);
      lockRef.current = false;
      // 检查是否全部完成
      setPlaced(current => {
        if (Object.keys(current).length >= items.length) {
          setTimeout(() => { setItems(shuffle(YUNMU).slice(0, 8)); setPlaced({}); }, 500);
        }
        return current;
      });
    }, 1200);
  };

  const reset = () => {
    setItems(shuffle(YUNMU).slice(0, 8));
    setPlaced({});
    setDraggedItem(null);
    setFeedback(null);
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-1 text-center text-lg font-extrabold text-ink">{t('pinyinGroup.title')}</h3>
      <p className="mb-4 text-center text-xs font-bold text-ink-soft">{t('pinyinGroup.subtitle')}</p>

      {/* 待分类区 */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-bold text-ink-soft">{t('pinyinGroup.pendingLabel')}</p>
        <div className="flex flex-wrap gap-2">
          {items.map(item => {
            if (placed[item.p]) return null;
            const isDragging = draggedItem === item.p;
            return (
              <button
                key={item.p}
                onClick={() => { sfxTap(); setDraggedItem(item.p); void speak(item.p, { lang: 'zh-CN', rate: 0.7, module: 'ai' }).catch(() => {}); }}
                className={cn(
                  'rounded-xl px-4 py-3 text-2xl font-extrabold leading-tight shadow-candy-sm transition-all sm:text-3xl',
                  isDragging ? 'scale-110 bg-candy-purple-soft ring-2 ring-candy-purple-deep' : 'bg-white hover:bg-pink-50',
                )}
              >
                {item.p}
              </button>
            );
          })}
          {items.every(i => placed[i.p]) && (
            <span className="text-sm font-extrabold text-candy-green-deep self-center">🎉 全部分类完成！</span>
          )}
        </div>
        {draggedItem && (
          <p className="mt-2 text-xs font-bold text-candy-purple-deep">
            {t('pinyinGroup.selectedHint', { p: draggedItem })}
          </p>
        )}
      </div>

      {/* 分类框 */}
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleDrop(cat.id)}
            className={cn(
              'rounded-2xl border-2 border-dashed p-3 text-center transition-all',
              draggedItem ? `${cat.color} border-candy-purple-deep hover:scale-105` : `${cat.color} border-ink-muted/20`
            )}
          >
            <div className="text-lg font-extrabold text-ink">{cat.emoji} {t(CAT_LABEL_KEY[cat.label] || cat.label)}</div>
            <div className="mt-1 text-xs font-bold text-ink-soft">{cat.desc}</div>
            <div className="mt-1 text-xs font-medium text-ink-muted">💡 {cat.hint}</div>
            {/* 已放入的韵母 */}
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {items.filter(i => placed[i.p] === cat.id).map(i => (
                <span key={i.p} className="rounded-lg bg-white/80 px-2 py-0.5 text-base font-extrabold leading-tight text-ink shadow-sm sm:text-lg">{i.p}</span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* 反馈 */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="mt-4 text-center">
            {feedback.correct ? (
              <span className="inline-block rounded-xl bg-candy-green-soft px-4 py-2 text-sm font-extrabold text-candy-green-deep">
                {t('pinyinGroup.correct', { p: feedback.pinyin })}
              </span>
            ) : (
              <span className="inline-block rounded-xl bg-candy-pink-soft px-4 py-2 text-sm font-extrabold text-candy-pink-deep">
                {t('pinyinGroup.wrong', { p: feedback.pinyin })}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-bold text-ink-soft">{t('pinyinGroup.score', { n: score })}</span>
        <button onClick={reset} className="rounded-lg bg-white px-2 py-1 text-xs font-bold shadow-sm hover:bg-pink-50">🔄 换一批</button>
      </div>
    </div>
  );
}
