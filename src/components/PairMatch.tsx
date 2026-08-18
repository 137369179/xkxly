/**
 * 配对联想 🧩 (O8)
 * 影子配对 + 关联配对，锻炼逻辑思维
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';


interface Pair { left: { emoji: string; label: string }; right: { emoji: string; label: string }; }

const SHADOW_PAIRS: Pair[] = [
  { left:{emoji:'🐱',label:'小猫'}, right:{emoji:'🐈‍⬛',label:'影子'} },
  { left:{emoji:'🐶',label:'小狗'}, right:{emoji:'🐕‍🦺',label:'影子'} },
  { left:{emoji:'🐰',label:'兔子'}, right:{emoji:'🐇',label:'影子'} },
  { left:{emoji:'🐻',label:'小熊'}, right:{emoji:'🐻‍❄️',label:'影子'} },
  { left:{emoji:'🦁',label:'狮子'}, right:{emoji:'😺',label:'影子'} },
  { left:{emoji:'🐘',label:'大象'}, right:{emoji:'🦣',label:'影子'} },
];

const ASSOC_PAIRS: Pair[] = [
  { left:{emoji:'☀️',label:'太阳'}, right:{emoji:'🌞',label:'光芒'} },
  { left:{emoji:'🌧️',label:'下雨'}, right:{emoji:'☔',label:'雨伞'} },
  { left:{emoji:'🐝',label:'蜜蜂'}, right:{emoji:'🍯',label:'蜂蜜'} },
  { left:{emoji:'🐄',label:'奶牛'}, right:{emoji:'🥛',label:'牛奶'} },
  { left:{emoji:'🌱',label:'种子'}, right:{emoji:'🌸',label:'花朵'} },
  { left:{emoji:'🍳',label:'鸡蛋'}, right:{emoji:'🐔',label:'母鸡'} },
  { left:{emoji:'🧑‍🍳',label:'厨师'}, right:{emoji:'🍴',label:'餐具'} },
  { left:{emoji:'👨‍⚕️',label:'医生'}, right:{emoji:'🩺',label:'听诊器'} },
];

type Mode = 'shadow' | 'assoc';

export function PairMatch() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('shadow');
  const [pairs, setPairs] = useState<Pair[]>(() => shuffle(SHADOW_PAIRS).slice(0, 4));
  const [leftSel, setLeftSel] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const [wrongPair, setWrongPair] = useState<{ l: number; r: number } | null>(null);
  const lockRef = useRef(false);

  const startNew = (m: Mode) => {
    const src = m === 'shadow' ? SHADOW_PAIRS : ASSOC_PAIRS;
    setMode(m);
    setPairs(shuffle(src).slice(0, 4));
    setLeftSel(null);
    setMatched(new Set());
    setFeedback('');
    setWrongPair(null);
  };

  const pickLeft = (i: number) => {
    if (lockRef.current || matched.has(i)) return;
    sfxTap();
    setLeftSel(i);
    void speak(pairs[i]?.left.label ?? '', { lang: 'zh-CN', rate: 0.8, module: 'ai' });
  };

  const pickRight = (i: number) => {
    if (lockRef.current || leftSel === null || matched.has(i)) return;
    lockRef.current = true;
    if (i === leftSel) {
      sfxCorrect();
      const newMatched = new Set(matched);
      newMatched.add(i);
      setMatched(newMatched);
      setScore(s => s + 1);
      setFeedback(t('pair.success', { left: pairs[i]?.left.label ?? '', right: pairs[i]?.right.label ?? '' }));
      void speak(`配对成功！`, { lang: 'zh-CN', rate: 0.85, module: 'praise' });
      setLeftSel(null);
      if (newMatched.size >= pairs.length) {
        setTimeout(() => {
          const src = mode === 'shadow' ? SHADOW_PAIRS : ASSOC_PAIRS;
          setPairs(shuffle(src).slice(0, 4));
          setMatched(new Set());
          setFeedback('');
        }, 1000);
      }
      setTimeout(() => { setFeedback(''); lockRef.current = false; }, 800);
    } else {
      sfxWrong();
      setWrongPair({ l: leftSel, r: i });
      setFeedback(t('pair.fail'));
      void speak('不匹配，再试试', { lang: 'zh-CN', rate: 0.85, module: 'praise' });
      setTimeout(() => { setWrongPair(null); setLeftSel(null); setFeedback(''); lockRef.current = false; }, 1000);
    }
  };

  const rightIndices = shuffle(pairs.map((_, i) => i));

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('pair.title')}</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button onClick={()=>startNew('shadow')} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='shadow'?'bg-candy-green-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{t('pair.shadow')}</button>
        <button onClick={()=>startNew('assoc')} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='assoc'?'bg-candy-green-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{t('pair.assoc')}</button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-8">
        {/* 左列 */}
        <div className="space-y-3">
          <p className="text-center text-xs font-bold text-ink-muted">{mode === 'shadow' ? t('pair.findShadow') : t('pair.findPair')}</p>
          {pairs.map((p, i) => (
            <button key={`l-${i}`} onClick={()=>pickLeft(i)} disabled={matched.has(i)}
              className={cn('w-full rounded-2xl p-4 text-center shadow-sm transition-all',
                matched.has(i) ? 'bg-candy-green-soft opacity-50' :
                leftSel === i ? 'bg-candy-green-deep text-white scale-105' :
                wrongPair?.l === i ? 'bg-candy-pink-soft animate-shake' : 'bg-white hover:bg-green-50'
              )}>
              <span className="text-4xl">{p.left.emoji}</span>
              <div className="mt-1 text-xs font-extrabold">{p.left.label}</div>
            </button>
          ))}
        </div>
        {/* 右列（打乱顺序） */}
        <div className="space-y-3">
          <p className="text-center text-xs font-bold text-ink-muted">{t('pair.chooseMatch')}</p>
          {rightIndices.map(ri => (
            <button key={`r-${ri}`} onClick={()=>pickRight(ri)} disabled={matched.has(ri)}
              className={cn('w-full rounded-2xl p-4 text-center shadow-sm transition-all',
                matched.has(ri) ? 'bg-candy-green-soft opacity-50' :
                wrongPair?.r === ri ? 'bg-candy-pink-soft animate-shake' : 'bg-white hover:bg-green-50'
              )}>
              <span className="text-4xl">{pairs[ri]?.right.emoji ?? ''}</span>
              <div className="mt-1 text-xs font-extrabold">{pairs[ri]?.right.label ?? ''}</div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-4 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}
      </AnimatePresence>
      <div className="mt-3 text-center text-xs font-bold text-ink-soft">{t('pair.progress', { matched: matched.size, total: pairs.length, score })}</div>
    </div>
  );
}
