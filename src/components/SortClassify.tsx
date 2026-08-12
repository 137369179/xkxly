/**
 * 分类归类 🗂️ (P3)
 * 物品按类别分组，锻炼归纳思维
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface Item { id: string; emoji: string; label: string; category: string; }
interface Round { items: Item[]; categories: string[]; catLabels: Record<string,string>; catEmojis: Record<string,string>; }

const ROUNDS: Round[] = [
  {
    categories: ['fruit','animal','vehicle'],
    catLabels: { fruit:'水果', animal:'动物', vehicle:'交通' },
    catEmojis: { fruit:'🍎', animal:'🐱', vehicle:'🚗' },
    items: [
      { id:'1', emoji:'🍎', label:'苹果', category:'fruit' },
      { id:'2', emoji:'🍌', label:'香蕉', category:'fruit' },
      { id:'3', emoji:'🍇', label:'葡萄', category:'fruit' },
      { id:'4', emoji:'🐱', label:'小猫', category:'animal' },
      { id:'5', emoji:'🐶', label:'小狗', category:'animal' },
      { id:'6', emoji:'🐰', label:'兔子', category:'animal' },
      { id:'7', emoji:'🚗', label:'汽车', category:'vehicle' },
      { id:'8', emoji:'✈️', label:'飞机', category:'vehicle' },
      { id:'9', emoji:'🚌', label:'公交车', category:'vehicle' },
    ],
  },
  {
    categories: ['food','clothes','toy'],
    catLabels: { food:'食物', clothes:'衣物', toy:'玩具' },
    catEmojis: { food:'🍔', clothes:'👕', toy:'🧸' },
    items: [
      { id:'1', emoji:'🍔', label:'汉堡', category:'food' },
      { id:'2', emoji:'🍕', label:'披萨', category:'food' },
      { id:'3', emoji:'🍦', label:'冰淇淋', category:'food' },
      { id:'4', emoji:'👕', label:'上衣', category:'clothes' },
      { id:'5', emoji:'👖', label:'裤子', category:'clothes' },
      { id:'6', emoji:'🧦', label:'袜子', category:'clothes' },
      { id:'7', emoji:'🧸', label:'熊娃娃', category:'toy' },
      { id:'8', emoji:'⚽', label:'足球', category:'toy' },
      { id:'9', emoji:'🎲', label:'骰子', category:'toy' },
    ],
  },
  {
    categories: ['land','sea','sky'],
    catLabels: { land:'陆地', sea:'海洋', sky:'天空' },
    catEmojis: { land:'🌳', sea:'🌊', sky:'☁️' },
    items: [
      { id:'1', emoji:'🐯', label:'老虎', category:'land' },
      { id:'2', emoji:'🐘', label:'大象', category:'land' },
      { id:'3', emoji:'🐦', label:'小鸟', category:'sky' },
      { id:'4', emoji:'🦋', label:'蝴蝶', category:'sky' },
      { id:'5', emoji:'🐠', label:'小鱼', category:'sea' },
      { id:'6', emoji:'🐙', label:'章鱼', category:'sea' },
      { id:'7', emoji:'🦌', label:'小鹿', category:'land' },
      { id:'8', emoji:'🐳', label:'鲸鱼', category:'sea' },
      { id:'9', emoji:'🦅', label:'老鹰', category:'sky' },
    ],
  },
];

export function SortClassify() {
  const { t } = useTranslation();
  const [roundIdx, setRoundIdx] = useState(0);
  const round = ROUNDS[roundIdx]!!
  const [items, setItems] = useState(() => shuffle(round.items));
  const [assigned, setAssigned] = useState<Record<string, string[]>>(() => {
    const obj: Record<string,string[]> = {};
    round.categories.forEach(c => obj[c] = []);
    return obj;
  });
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const lockRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(id => clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const startNew = (idx: number) => {
    const r = ROUNDS[idx]!!
    setRoundIdx(idx);
    setItems(shuffle(r.items));
    const obj: Record<string,string[]> = {};
    r.categories.forEach(c => obj[c] = []);
    setAssigned(obj);
    setFeedback('');
    setSelected(null);
  };

  const assignTo = (cat: string) => {
    if (!selected || lockRef.current) return;
    lockRef.current = true;
    const item = items.find(i=>i.id===selected);
    if (!item) { lockRef.current = false; return; }
    if (item.category === cat) {
      sfxCorrect();
      setAssigned(prev => ({ ...prev, [cat]: [...prev[cat]!, selected] }));
      setItems(prev => prev.filter(i=>i.id!==selected));
      setScore(s=>s+1);
      void speak(`${item.label}是${round.catLabels[cat]}！`, { lang:'zh-CN', rate:0.85, module:'praise' });
      setSelected(null);
      if (items.length <= 1) {
        const t1 = setTimeout(() => {
          setFeedback(t('sort.correctAll'));
          void speak('太棒了！全部分类正确！', { lang:'zh-CN', rate:0.85, module:'praise' });
          const t2 = setTimeout(() => startNew((roundIdx+1)%ROUNDS.length), 1500);
          timersRef.current.push(t2);
        }, 500);
        timersRef.current.push(t1);
      }
      const t3 = setTimeout(() => lockRef.current = false, 300);
      timersRef.current.push(t3);
    } else {
      sfxWrong();
      setFeedback(t('sort.wrongCategory', { item: item.label, category: round.catLabels[cat] ?? '' }));
      void speak(`再想想，${item.label}应该分到哪里呢？`, { lang:'zh-CN', rate:0.85, module:'praise' });
      setSelected(null);
      const t4 = setTimeout(() => { setFeedback(''); lockRef.current = false; }, 1000);
      timersRef.current.push(t4);
    }
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('sort.title')}</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">{t('sort.subtitle')}</p>

      {/* 待分类物品 */}
      <div className="mb-4">
        <p className="mb-2 text-center text-xs font-extrabold text-ink-muted">{t('sort.pending')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {items.map(item => (
            <button key={item.id} onClick={()=>{sfxTap();setSelected(item.id);speak(item.label,{lang:'zh-CN',rate:0.8,module:'ai'});}}
              className={cn('rounded-xl bg-white p-2 text-center shadow-sm transition-all hover:scale-105',
                selected===item.id ? 'ring-2 ring-candy-purple-deep scale-105' : ''
              )}>
              <div className="text-2xl">{item.emoji}</div>
              <div className="text-[10px] font-extrabold">{item.label}</div>
            </button>
          ))}
          {items.length === 0 && <span className="text-xs text-ink-muted">{t('sort.allDone')}</span>}
        </div>
      </div>

      {/* 类别桶 */}
      <div className="grid grid-cols-3 gap-2">
        {round.categories.map(cat => (
          <button key={cat} onClick={()=>assignTo(cat)} disabled={!selected}
            className={cn('rounded-xl border-2 border-dashed p-3 min-h-[100px] transition-all',
              selected ? 'border-candy-purple-deep bg-candy-purple-soft/30 hover:bg-candy-purple-soft/50' : 'border-ink-muted/20 bg-white/50'
            )}>
            <div className="mb-1 text-center text-2xl">{round.catEmojis[cat]}</div>
            <div className="mb-2 text-center text-xs font-extrabold">{round.catLabels[cat]}</div>
            <div className="flex flex-wrap justify-center gap-1">
              {assigned[cat]!.map(id => {
                const item = round.items.find(i=>i.id===id)!;
                return <span key={id} className="text-xl">{item.emoji}</span>;
              })}
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}
      </AnimatePresence>
      <div className="mt-2 text-center text-xs font-bold text-ink-soft">{t('sort.progress', { score, n: roundIdx+1, total: ROUNDS.length })}</div>
      <CandyButton tone="purple" size="sm" className="mt-3 w-full" onClick={()=>startNew((roundIdx+1)%ROUNDS.length)}>{t('sort.shuffle')}</CandyButton>
    </div>
  );
}
