/**
 * 翻牌记忆 🃏 (O5)
 * 经典记忆配对游戏，锻炼幼儿专注力与记忆
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const PAIRS = [
  { id:'pair1', emoji:'🐱', label:'小猫' },
  { id:'pair2', emoji:'🐶', label:'小狗' },
  { id:'pair3', emoji:'🐰', label:'兔子' },
  { id:'pair4', emoji:'🐻', label:'小熊' },
  { id:'pair5', emoji:'🐸', label:'青蛙' },
  { id:'pair6', emoji:'🦊', label:'狐狸' },
  { id:'pair7', emoji:'🐯', label:'老虎' },
  { id:'pair8', emoji:'🐮', label:'奶牛' },
];

interface Card { id:string; pairId:string; emoji:string; label:string; flipped:boolean; matched:boolean; }

function createDeck(count:number):Card[] {
  const selected = shuffle(PAIRS).slice(0,count);
  return shuffle(selected.flatMap(p=>[
    { id:`${p.id}-a`, pairId:p.id, emoji:p.emoji, label:p.label, flipped:false, matched:false },
    { id:`${p.id}-b`, pairId:p.id, emoji:p.emoji, label:p.label, flipped:false, matched:false },
  ]));
}

export function MemoryMatch() {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState(4); // 4/6/8 pairs
  const [deck, setDeck] = useState<Card[]>(()=>createDeck(4));
  const [flipped, setFlipped] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);

  const newGame = (d:number) => {
    setDifficulty(d);
    setDeck(createDeck(d));
    setFlipped([]);
    setMoves(0);
    setMatched(0);
    setLocked(false);
    setDone(false);
  };

  const handleFlip = (card:Card) => {
    if (locked || card.flipped || card.matched) return;
    sfxTap();
    setDeck(prev => prev.map(c => c.id===card.id ? {...c, flipped:true} : c));
    const newFlipped = [...flipped, card.id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m=>m+1);
      setLocked(true);
      const [first, second] = newFlipped;
      const c1 = deck.find(c=>c.id===first)!;
      const c2 = deck.find(c=>c.id===second)!;
      if (c1.pairId === c2.pairId) {
        sfxCorrect();
        const newMatched = matched + 1;
        setMatched(newMatched);
        void speak(`找到了一对${c1.label}！`, { lang:'zh-CN', rate:0.85, module:'praise' });
        setTimeout(()=>{
          setDeck(prev => prev.map(c => (c.id===first||c.id===second) ? {...c, matched:true} : c));
          setFlipped([]);
          setLocked(false);
          if (newMatched+1 >= difficulty) setDone(true);
        }, 500);
      } else {
        sfxWrong();
        setTimeout(()=>{
          setDeck(prev => prev.map(c => (c.id===first||c.id===second) ? {...c, flipped:false} : c));
          setFlipped([]);
          setLocked(false);
        }, 800);
      }
    }
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('memoryMatch.title')}</h3>
      <div className="mb-4 flex justify-center gap-2">
        {[4,6,8].map(d => (
          <button key={d} onClick={()=>newGame(d)}
            className={cn('rounded-xl px-3 py-1.5 text-xs font-extrabold',
              difficulty===d ? 'bg-candy-purple-deep text-white' : 'bg-white text-ink-soft shadow-sm'
            )}>
            {d===4?t('memoryMatch.pairs',{count:4}):d===6?t('memoryMatch.pairs',{count:6}):t('memoryMatch.pairs',{count:8})}
          </button>
        ))}
      </div>
      <div className="flex justify-between mb-3 text-xs font-bold text-ink-soft">
        <span>{t('memoryMatch.moves', { count: moves })}</span><span>✅ {matched}/{difficulty}</span>
      </div>
      <div className={cn('grid gap-2', difficulty<=4?'grid-cols-4':difficulty===6?'grid-cols-4':'grid-cols-4')}>
        {deck.map(card => (
          <button key={card.id} onClick={()=>handleFlip(card)}
            className={cn('aspect-square rounded-xl flex items-center justify-center text-3xl transition-all duration-300 shadow-sm',
              card.flipped||card.matched ? 'bg-white' : 'bg-candy-purple-deep',
              card.matched && 'bg-candy-green-soft',
              !card.flipped && !card.matched && 'hover:scale-105'
            )}>
            {(card.flipped||card.matched) ? card.emoji : '❓'}
          </button>
        ))}
      </div>
      {done && (
        <motion.div initial={{scale:0}} animate={{scale:1}} className="mt-4 text-center">
          <div className="text-4xl">🎉🏆🎉</div>
          <p className="text-lg font-extrabold text-candy-purple-deep">{t('memoryMatch.allFound', { count: moves })}</p>
          <CandyButton tone="purple" onClick={()=>newGame(Math.min(difficulty+2,8))} className="mt-2">下一关 →</CandyButton>
        </motion.div>
      )}
    </div>
  );
}
