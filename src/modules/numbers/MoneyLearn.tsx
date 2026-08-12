/**
 * 钱币认知 💰 (Q4)
 * 认识人民币 + 简单购物找零
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const COINS = [
  { value: 1, emoji: '🪙', label: '1角', color: 'bg-amber-200' },
  { value: 5, emoji: '🪙', label: '5角', color: 'bg-amber-300' },
  { value: 10, emoji: '💰', label: '1元', color: 'bg-red-200' },
  { value: 50, emoji: '💰', label: '5元', color: 'bg-purple-200' },
  { value: 100, emoji: '💵', label: '10元', color: 'bg-green-200' },
];

const ITEMS = [
  { emoji: '🍭', label: '棒棒糖', price: 5 },
  { emoji: '🍦', label: '冰淇淋', price: 10 },
  { emoji: '🧃', label: '果汁', price: 8 },
  { emoji: '🍫', label: '巧克力', price: 15 },
  { emoji: '🧁', label: '纸杯蛋糕', price: 20 },
  { emoji: '🍪', label: '饼干', price: 3 },
  { emoji: '🍌', label: '香蕉', price: 2 },
  { emoji: '🍎', label: '苹果', price: 4 },
];

export function MoneyLearn() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'learn'|'shop'>('learn');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [paid, setPaid] = useState(0);
  const lockRef = useRef(false);

  const buy = (item: typeof ITEMS[0]) => {
    if (lockRef.current) return;
    lockRef.current = true;
    sfxTap();
    if (item.price <= paid) {
      sfxCorrect();
      const change = paid - item.price;
      setScore(s=>s+1);
      setFeedback(t('money.bought', { label: item.label, price: item.price, change: change > 0 ? t('money.change', { change }) : '' }));
      void speak(`买了${item.label}！`, { lang:'zh-CN', rate:0.85, module:'praise' });
    } else {
      sfxWrong();
      setFeedback(t('money.notEnough', { diff: item.price - paid }));
      void speak('钱不够哦', { lang:'zh-CN', rate:0.85, module:'praise' });
    }
    setTimeout(() => { setPaid(0); setFeedback(''); lockRef.current = false; }, 1500);
  };

  const addCoin = (value: number) => {
    sfxTap();
    setPaid(p => p + value);
    void speak(`${value}元`, { lang:'zh-CN', rate:0.8, module:'ai' });
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('money.title')}</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button onClick={()=>setMode('learn')} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='learn'?'bg-candy-orange-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{t('money.learn')}</button>
        <button aria-label={t('money.shop')} onClick={()=>{setMode('shop');setPaid(0);setFeedback('');}} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='shop'?'bg-candy-orange-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{t('money.shop')}</button>
      </div>

      {mode === 'learn' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {COINS.map(c => (
            <button key={c.value} onClick={()=>{sfxTap();speak(c.label,{lang:'zh-CN',rate:0.8,module:'ai'});}}
              className={cn(c.color,'rounded-2xl p-4 text-center shadow-sm transition-all hover:scale-105 active:scale-95')}>
              <div className="text-4xl">{c.emoji}</div>
              <div className="mt-1 text-sm font-extrabold">{c.label}</div>
              <div className="text-[10px] font-medium opacity-70">{c.value}元</div>
            </button>
          ))}
        </div>
      )}

      {mode === 'shop' && (
        <div className="text-center">
          <p className="mb-3 text-sm font-bold text-ink">🛒 {t('money.shopDesc')}</p>
          <div className="mb-3 rounded-xl bg-candy-orange-soft/30 p-3">
            <span className="text-2xl font-extrabold text-candy-orange-deep">💰 {t('money.paid', { value: paid })}</span>
          </div>
          <div className="mb-4 flex justify-center gap-2">
            {COINS.map(c => (
              <button key={c.value} onClick={()=>addCoin(c.value)}
                className={cn(c.color,'rounded-xl px-3 py-2 shadow-sm transition-all hover:scale-105 active:scale-95')}>
                <div className="text-xl">{c.emoji}</div>
                <div className="text-[10px] font-extrabold">{c.label}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ITEMS.map(item => (
              <button key={item.label} onClick={()=>buy(item)} disabled={lockRef.current}
                className="rounded-xl bg-white p-3 text-center shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                <div className="text-3xl">{item.emoji}</div>
                <div className="text-xs font-extrabold">{item.label}</div>
                <div className="text-xs font-bold text-candy-orange-deep">¥{item.price}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>{!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}</AnimatePresence>
      {mode === 'shop' && <div className="mt-2 text-center text-xs font-bold text-ink-soft">{t('money.score', { score })}</div>}
    </div>
  );
}
