import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

const CURRENCY = [
  { value: 1, emoji: '🪙', label: '1元', desc: '硬币/纸币', color: 'bg-amber-100 border-amber-300' },
  { value: 2, emoji: '🪙', label: '2元', desc: '硬币/纸币', color: 'bg-yellow-100 border-yellow-300' },
  { value: 5, emoji: '💵', label: '5元', desc: '紫色纸币', color: 'bg-purple-100 border-purple-300' },
  { value: 10, emoji: '💵', label: '10元', desc: '蓝色纸币', color: 'bg-blue-100 border-blue-300' },
  { value: 20, emoji: '💵', label: '20元', desc: '棕色纸币', color: 'bg-orange-100 border-orange-300' },
  { value: 50, emoji: '💵', label: '50元', desc: '绿色纸币', color: 'bg-emerald-100 border-emerald-300' },
];

const ITEMS = [
  { emoji: '🍭', label: '棒棒糖', price: 2 },
  { emoji: '🍎', label: '红苹果', price: 3 },
  { emoji: '🍪', label: '小饼干', price: 5 },
  { emoji: '🧃', label: '果汁', price: 6 },
  { emoji: '🍦', label: '冰淇淋', price: 8 },
  { emoji: '🍫', label: '巧克力', price: 10 },
  { emoji: '🧁', label: '纸杯蛋糕', price: 15 },
  { emoji: '🧸', label: '小熊玩偶', price: 25 },
];

export function MoneyLearn() {
  const practice = useStore((s) => s.practice);
  const [mode, setMode] = useState<'learn' | 'shop'>('learn');
  const [feedback, setFeedback] = useState<{ kind: 'correct' | 'wrong'; msg: string } | null>(null);
  const [paid, setPaid] = useState(0);
  const [targetItemIdx, setTargetItemIdx] = useState(0);
  const lockRef = useRef(false);

  const targetItem = ITEMS[targetItemIdx % ITEMS.length]!;

  const handlePay = () => {
    if (lockRef.current) return;
    lockRef.current = true;
    sfxTap();

    if (paid >= targetItem.price) {
      sfxCorrect();
      celebrateSmall();
      const change = paid - targetItem.price;
      practice('math:money', true);
      const msg = change > 0
        ? `购买成功！实付${paid}元，商品${targetItem.price}元，找零${change}元！`
        : `正好付了${paid}元，购买成功！`;
      setFeedback({ kind: 'correct', msg });
      speak(`购买成功！找零${change}元。`, { lang: 'zh-CN', rate: 0.85, module: 'praise' }).catch(() => {});
      setTimeout(() => {
        setPaid(0);
        setFeedback(null);
        setTargetItemIdx((i) => i + 1);
        lockRef.current = false;
      }, 2000);
    } else {
      sfxWrong();
      practice('math:money', false);
      const diff = targetItem.price - paid;
      setFeedback({ kind: 'wrong', msg: `钱还不够哦，还差 ${diff} 元！请继续投币。` });
      speak(`还差${diff}元哦`, { lang: 'zh-CN', rate: 0.85, module: 'praise' }).catch(() => {});
      setTimeout(() => {
        setFeedback(null);
        lockRef.current = false;
      }, 1800);
    }
  };

  const addCoin = (val: number) => {
    sfxTap();
    setPaid((p) => p + val);
    speak(`${val}元`, { lang: 'zh-CN', rate: 0.85, module: 'ai' }).catch(() => {});
  };

  const clearPaid = () => {
    sfxTap();
    setPaid(0);
    setFeedback(null);
  };

  return (
    <div className="card-candy p-4 sm:p-6 shadow-fluffy">
      <h3 className="mb-2 text-center text-xl font-black text-ink">💰 人民币认知与模拟小超市</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button
          onClick={() => setMode('learn')}
          className={`rounded-2xl px-5 py-2 text-sm font-black transition-all ${
            mode === 'learn' ? 'bg-candy-orange-deep text-white shadow-sm scale-105' : 'bg-white text-ink-soft shadow-sm'
          }`}
        >
          👀 认识钱币
        </button>
        <button
          onClick={() => {
            setMode('shop');
            setPaid(0);
            setFeedback(null);
          }}
          className={`rounded-2xl px-5 py-2 text-sm font-black transition-all ${
            mode === 'shop' ? 'bg-candy-orange-deep text-white shadow-sm scale-105' : 'bg-white text-ink-soft shadow-sm'
          }`}
        >
          🛒 小超市购物收银
        </button>
      </div>

      {mode === 'learn' && (
        <div className="space-y-4">
          <p className="text-center text-xs font-bold text-ink-soft">
            点击任意面值钱币，听听它的名字和颜色特征：
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CURRENCY.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  sfxTap();
                  speak(`这是人民币${c.label}。${c.desc}`, { lang: 'zh-CN', rate: 0.8, module: 'ai' }).catch(() => {});
                }}
                className={cn(
                  c.color,
                  'rounded-3xl p-4 text-center border-2 shadow-sm transition-all hover:scale-105 active:scale-95'
                )}
              >
                <div className="text-4xl mb-1">{c.emoji}</div>
                <div className="text-xl font-black text-ink">{c.label}</div>
                <div className="text-xs font-bold opacity-75 mt-0.5">{c.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'shop' && (
        <div className="space-y-4 text-center">
          {/* 当前要买的目标商品 */}
          <div className="mx-auto max-w-sm rounded-3xl border-3 border-candy-orange-deep/30 bg-gradient-to-br from-orange-50 via-amber-50 to-pink-50 p-4 shadow-sm">
            <span className="text-xs font-black text-candy-orange-deep bg-white px-3 py-1 rounded-full border border-orange-200">
              🎯 当前要购买的商品
            </span>
            <div className="text-6xl my-2 animate-bounce">{targetItem.emoji}</div>
            <div className="text-xl font-black text-ink">{targetItem.label}</div>
            <div className="text-2xl font-black text-candy-pink-deep mt-1">
              价格：¥{targetItem.price} 元
            </div>
          </div>

          {/* 收银盘与已付金额 */}
          <div className="mx-auto max-w-sm rounded-3xl border-2 border-dashed border-purple-300 bg-white/90 p-3.5 shadow-inner">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold text-ink-soft">收银托盘:</span>
              <span className="text-2xl font-black text-candy-purple-deep leading-tight sm:text-3xl">
                已放入: ¥{paid} 元
              </span>
            </div>
          </div>

          {/* 反馈提示 */}
          <AnimatePresence mode="wait">
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  'rounded-2xl p-3 text-sm font-black border',
                  feedback.kind === 'correct'
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                )}
              >
                {feedback.msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 投币钱包 */}
          <div>
            <p className="text-xs font-bold text-ink-soft mb-2">👛 点击钱币放入收银盘：</p>
            <div className="flex flex-wrap justify-center gap-2">
              {CURRENCY.map((c) => (
                <button
                  key={c.value}
                  onClick={() => addCoin(c.value)}
                  className={cn(
                    c.color,
                    'rounded-2xl px-3.5 py-2 border shadow-xs transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5'
                  )}
                >
                  <span className="text-lg">{c.emoji}</span>
                  <span className="text-sm font-black text-ink">+{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 结账与重置按钮 */}
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={clearPaid}
              className="rounded-2xl bg-gray-100 px-4 py-2.5 text-base font-black text-gray-700 hover:bg-gray-200 active:scale-95"
            >
              🔄 清空托盘
            </button>
            <button
              onClick={handlePay}
              className="rounded-2xl bg-candy-green-deep px-6 py-2 text-sm font-black text-candy-green-on shadow-md hover:bg-green-600 active:scale-95 transition-all"
            >
              💳 确认付款并结账
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
