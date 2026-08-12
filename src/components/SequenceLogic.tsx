/**
 * 序列推理 🔗 (R5)
 * 找规律填空 — 图形/数字/颜色序列
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';

interface SequenceItem { display: string; value: string; }
interface Puzzle {
  seq: SequenceItem[];
  answer: string;
  options: string[];
  hint: string;
}

const PUZZLES: Puzzle[] = [
  { seq: [{display:'🔴',value:'red'},{display:'🟡',value:'yellow'},{display:'🟢',value:'green'},{display:'?',value:'?'}], answer: '🔴', options: ['🔴','🟡','🟢','🔵'], hint: '红黄绿循环' },
  { seq: [{display:'1',value:'1'},{display:'3',value:'3'},{display:'5',value:'5'},{display:'?',value:'?'}], answer: '7', options: ['6','7','8','9'], hint: '奇数递增' },
  { seq: [{display:'🍎',value:'a'},{display:'🍎',value:'a'},{display:'🍌',value:'b'},{display:'🍎',value:'a'},{display:'?',value:'?'}], answer: '🍎', options: ['🍎','🍌','🍇','🍊'], hint: 'AABA规律' },
  { seq: [{display:'⬆️',value:'up'},{display:'➡️',value:'right'},{display:'⬇️',value:'down'},{display:'?',value:'?'}], answer: '⬅️', options: ['⬆️','➡️','⬇️','⬅️'], hint: '顺时针旋转' },
  { seq: [{display:'2',value:'2'},{display:'4',value:'4'},{display:'8',value:'8'},{display:'?',value:'?'}], answer: '16', options: ['10','12','14','16'], hint: '每次乘2' },
  { seq: [{display:'🌙',value:'moon'},{display:'☀️',value:'sun'},{display:'🌙',value:'moon'},{display:'☀️',value:'sun'},{display:'?',value:'?'}], answer: '🌙', options: ['🌙','☀️','⭐','☁️'], hint: '日夜交替' },
  { seq: [{display:'△',value:'triangle'},{display:'□',value:'square'},{display:'○',value:'circle'},{display:'△',value:'triangle'},{display:'?',value:'?'}], answer: '□', options: ['△','□','○','◇'], hint: '三角方圆循环' },
  { seq: [{display:'🌱',value:'seed'},{display:'🌿',value:'sprout'},{display:'🌳',value:'tree'},{display:'?',value:'?'}], answer: '🌳', options: ['🌱','🌿','🌳','🍂'], hint: '植物生长' },
];

export function SequenceLogic() {
  const [idx, setIdx] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState(() => shuffle(PUZZLES[0]!.options));
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const puzzle = PUZZLES[idx]!!

  const next = () => {
    const ni = (idx + 1) % PUZZLES.length;
    setIdx(ni);
    setShuffledOptions(shuffle(PUZZLES[ni]!.options));
    setFeedback('');
    setShowHint(false);
  };

  const pick = (option: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    sfxTap();
    if (option === puzzle.answer) {
      sfxCorrect(); setScore(s => s + 1); setFeedback('✅ 对了！好聪明！');
      void speak('对了！', { lang: 'zh-CN', rate: 0.85, module: 'praise' });
    } else {
      sfxWrong(); setFeedback(`❌ 答案是 ${puzzle.answer}`);
      void speak('再想想', { lang: 'zh-CN', rate: 0.85, module: 'praise' });
    }
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { timerRef.current = null; next(); lockRef.current = false; }, 1500);
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">🔗 序列推理</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">找规律，填下一个</p>

      <div className="mb-4 flex justify-center gap-2">
        {puzzle.seq.map((item, i) => (
          <motion.div key={`item-${i}`} initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} transition={{delay: i * 0.1}}
            className={cn('flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm',
              item.value === '?' ? 'bg-candy-orange-soft ring-2 ring-candy-orange-deep' : 'bg-white'
            )}>
            {item.display}
          </motion.div>
        ))}
      </div>

      <div className="mb-3 flex justify-center gap-2">
        {shuffledOptions.map((opt, i) => (
          <CandyButton key={`opt-${i}`} tone="orange" size="lg" onClick={() => pick(opt)}>{opt}</CandyButton>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => setShowHint(h => !h)} className="text-xs font-bold text-candy-blue-deep">
          {showHint ? `💡 ${puzzle.hint}` : '💡 提示'}
        </button>
        <span className="text-xs font-bold text-ink-soft">第 {idx + 1}/{PUZZLES.length} 题 · 得分 {score}</span>
      </div>

      <AnimatePresence>
        {!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-2 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
