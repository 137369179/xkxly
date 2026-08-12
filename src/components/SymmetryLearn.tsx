/**
 * 对称图形 🦋 (Q2)
 * 轴对称认知 — 判断是否对称、找对称轴
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';

const ITEMS = [
  { emoji: '🦋', label: '蝴蝶', symmetric: true, axes: 1 },
  { emoji: '🍎', label: '苹果', symmetric: true, axes: 2 },
  { emoji: '⭐', label: '五角星', symmetric: true, axes: 5 },
  { emoji: '❤️', label: '爱心', symmetric: true, axes: 1 },
  { emoji: '🍃', label: '树叶', symmetric: true, axes: 1 },
  { emoji: '☂️', label: '雨伞', symmetric: true, axes: 1 },
  { emoji: '🚗', label: '汽车', symmetric: true, axes: 1 },
  { emoji: '🧦', label: '袜子', symmetric: false, axes: 0 },
  { emoji: '🍺', label: '啤酒杯', symmetric: false, axes: 0 },
  { emoji: '🦀', label: '螃蟹', symmetric: true, axes: 1 },
  { emoji: '🐝', label: '蜜蜂', symmetric: true, axes: 1 },
  { emoji: '🔑', label: '钥匙', symmetric: false, axes: 0 },
];

export function SymmetryLearn() {
  const [mode, setMode] = useState<'learn'|'quiz'>('learn');
  const [current, setCurrent] = useState(0);
  const [options, setOptions] = useState<typeof ITEMS>([]);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);

  const startQuiz = () => {
    setOptions(shuffle(ITEMS).slice(0, 4));
    setFeedback('');
  };

  const pickItem = (item: typeof ITEMS[0]) => {
    if (mode === 'learn') {
      setCurrent(ITEMS.indexOf(item));
      void speak(item.label, { lang:'zh-CN', rate:0.8, module:'ai' });
      return;
    }
    if (lockRef.current) return;
    lockRef.current = true;
    sfxTap();
    const target = ITEMS[current]!!
    if (item.symmetric === target.symmetric) {
      sfxCorrect(); setScore(s=>s+1); setFeedback('✅ 对了！');
      void speak(`对了！`, { lang:'zh-CN', rate:0.85, module:'praise' });
    } else {
      sfxWrong(); setFeedback('❌ 再看看');
      void speak('再想想', { lang:'zh-CN', rate:0.85, module:'praise' });
    }
    setTimeout(() => { setCurrent(ITEMS.indexOf(options[Math.floor(Math.random()*options.length)]!)); setOptions(shuffle(ITEMS).slice(0,4)); setFeedback(''); lockRef.current = false; }, 1200);
  };

  const pickYesNo = (yes: boolean) => {
    if (lockRef.current) return;
    lockRef.current = true;
    const item = ITEMS[current]!!
    if ((yes && item.symmetric) || (!yes && !item.symmetric)) {
      sfxCorrect(); setScore(s=>s+1); setFeedback(`✅ 对了！${item.label}${item.symmetric ? '是对称的' : '不是对称的'}`);
      void speak(`对了！${item.label}${item.symmetric?'是对称图形':'不是对称图形'}`, { lang:'zh-CN', rate:0.85, module:'praise' });
    } else {
      sfxWrong(); setFeedback(`❌ ${item.label}${item.symmetric ? '其实是对称的' : '不是对称的'}`);
      void speak('再想想', { lang:'zh-CN', rate:0.85, module:'praise' });
    }
    setTimeout(() => { setCurrent(Math.floor(Math.random()*ITEMS.length)); setFeedback(''); lockRef.current = false; }, 1500);
  };

  const item = ITEMS[current]!!

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">🦋 对称认知</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button onClick={()=>setMode('learn')} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='learn'?'bg-candy-blue-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>📖 认识对称</button>
        <button aria-label="🎯 测验" onClick={()=>{setMode('quiz');startQuiz();setCurrent(Math.floor(Math.random()*ITEMS.length));}} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='quiz'?'bg-candy-blue-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>🎯 测验</button>
      </div>

      {mode === 'learn' && (
        <div className="text-center">
          <div className="mb-4 flex justify-center gap-2 flex-wrap">
            {ITEMS.map((it, i) => (
              <button key={it.label} onClick={()=>pickItem(it)}
                className={cn('rounded-xl p-2 text-center shadow-sm transition-all hover:scale-105',
                  current===i ? 'bg-candy-blue-deep text-white' : 'bg-white'
                )}>
                <div className="text-2xl">{it.emoji}</div>
                <div className="text-[10px] font-bold">{it.label}</div>
              </button>
            ))}
          </div>
          <motion.div key={current} initial={{scale:0.5}} animate={{scale:1}} className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-lg">
            <span className="text-5xl">{item.emoji}</span>
          </motion.div>
          <p className="text-sm font-extrabold text-candy-blue-deep">
            {item.symmetric ? `✅ ${item.label}是对称图形，有${item.axes}条对称轴` : `❌ ${item.label}不是对称图形`}
          </p>
        </div>
      )}

      {mode === 'quiz' && (
        <div className="text-center">
          <motion.div key={current} initial={{scale:0.5}} animate={{scale:1}} className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-[2rem] bg-white shadow-lg">
            <span className="text-6xl">{item.emoji}</span>
          </motion.div>
          <p className="mb-4 text-lg font-extrabold text-ink">它是对称图形吗？</p>
          <div className="flex justify-center gap-4">
            <CandyButton tone="green" size="lg" onClick={()=>pickYesNo(true)}>✅ 是对称</CandyButton>
            <CandyButton tone="pink" size="lg" onClick={()=>pickYesNo(false)}>❌ 不对称</CandyButton>
          </div>
          <div className="mt-3 text-xs font-bold text-ink-soft">得分 {score}</div>
        </div>
      )}

      <AnimatePresence>{!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}</AnimatePresence>
    </div>
  );
}
