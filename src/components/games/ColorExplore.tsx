/**
 * 颜色认知 🌈 (O1)
 * 基础颜色命名 + 实物配对 + 混色演示
 */
import { memo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const COLORS = [
  { name: '红色', en: 'Red', hex: '#ff5c7a', emoji: '🔴', items: ['🍎苹果','🌹玫瑰','🚗消防车'] },
  { name: '蓝色', en: 'Blue', hex: '#55aee0', emoji: '🔵', items: ['🌊大海','🦋蝴蝶','👖牛仔裤'] },
  { name: '黄色', en: 'Yellow', hex: '#ffc93c', emoji: '🟡', items: ['☀️太阳','🍌香蕉','🌻向日葵'] },
  { name: '绿色', en: 'Green', hex: '#5fd68b', emoji: '🟢', items: ['🌳大树','🍀四叶草','🐸青蛙'] },
  { name: '橙色', en: 'Orange', hex: '#ff9f5a', emoji: '🟠', items: ['🍊橙子','🎃南瓜','🥕胡萝卜'] },
  { name: '紫色', en: 'Purple', hex: '#8b6ef0', emoji: '🟣', items: ['🍇葡萄','🦄独角兽','💜爱心'] },
  { name: '粉色', en: 'Pink', hex: '#ff6b96', emoji: '💗', items: ['🐷小猪','🌸樱花','🎀蝴蝶结'] },
  { name: '棕色', en: 'Brown', hex: '#92400E', emoji: '🟤', items: ['🐻小熊','🍫巧克力','🌰板栗'] },
  { name: '白色', en: 'White', hex: '#fff9fa', emoji: '⚪', items: ['☁️白云','🐑绵羊','🥛牛奶'] },
  { name: '黑色', en: 'Black', hex: '#5c2e3d', emoji: '⚫', items: ['🐼熊猫','🖤黑猫','🌑夜晚'] },
];

function ColorExploreImpl() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'learn'|'quiz'>('learn');
  const [current, setCurrent] = useState(() => COLORS[0] ?? { name: '红色', en: 'Red', hex: '#ff5c7a', emoji: '🔴', items: ['🍎苹果','🌹玫瑰','🚗消防车'] });
  const [options, setOptions] = useState(() => shuffle(COLORS).slice(0,4));
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);

  const selectMode = (m: 'learn'|'quiz') => { setMode(m); setFeedback(''); };

  const pickColor = (color: typeof COLORS[0]) => {
    if (!color || lockRef.current) return;
    lockRef.current = true;
    if (mode === 'learn') {
      setCurrent(color);
      void speak(color.name, { lang:'zh-CN', rate:0.8, module:'ai' });
      setTimeout(() => { lockRef.current = false; }, 600);
      return;
    }
    if (color.name === current.name) {
      sfxCorrect(); setFeedback(t('colorExplore.rightFeedback', { name: current.name })); setScore(s=>s+1);
      void speak(`对了！${current.name}`, { lang:'zh-CN', rate:0.85, module:'praise' });
      setTimeout(() => {
        const nextColor = COLORS[Math.floor(Math.random() * COLORS.length)] ?? { name: '', en: '', hex: '', emoji: '', items: [] };
        setCurrent(nextColor);
        setOptions(shuffle(COLORS).slice(0,4));
        setFeedback('');
        lockRef.current = false;
      }, 1000);
    } else {
      sfxWrong(); setFeedback(t('colorExplore.wrongFeedback', { name: color.name }));
      void speak(`这是${color.name}呀`, { lang:'zh-CN', rate:0.85, module:'praise' });
      setTimeout(() => { setFeedback(''); lockRef.current = false; }, 1200);
    }
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">🌈 颜色认知</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button onClick={()=>selectMode('learn')} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='learn'?'bg-candy-purple-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>📖 认识颜色</button>
        <button onClick={()=>selectMode('quiz')} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='quiz'?'bg-candy-purple-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>🎯 颜色测验</button>
      </div>

      {mode === 'learn' && (
        <>
          <div className="mb-4 flex justify-center">
            <motion.div key={current.name} initial={{scale:0.8}} animate={{scale:1}} className="rounded-2xl p-6 text-center shadow-lg" style={{background:current.hex}}>
              <span className="text-5xl drop-shadow-md">{current.emoji}</span>
              <p className="mt-2 text-2xl font-extrabold text-white drop-shadow-md">{current.name}</p>
              <p className="text-sm font-bold text-white/80">{current.en}</p>
            </motion.div>
          </div>
          <p className="mb-3 text-center text-xs font-bold text-ink-soft">{current.items.join(' · ')}</p>
          <div className="grid grid-cols-5 gap-2">
            {COLORS.map(c => (
              <button key={c.name} onClick={()=>pickColor(c)} className="rounded-xl p-2 shadow-sm transition-all hover:scale-110 active:scale-95" style={{background:c.hex}}>
                <span className="text-2xl block">{c.emoji}</span>
                <span className="text-xs font-bold text-white/90">{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {mode === 'quiz' && (
        <>
          <div className="mb-5 text-center">
            <motion.div key={current.name} initial={{scale:0.8}} animate={{scale:1}} className="mx-auto inline-flex h-32 w-32 items-center justify-center rounded-[2rem] shadow-xl" style={{background:current.hex}}>
              <span className="text-6xl drop-shadow-md">{current.emoji}</span>
            </motion.div>
            <p className="mt-2 text-lg font-extrabold text-ink">{t('colorExplore.question')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {options.map(c => (
              <CandyButton key={c.name} tone="blue" size="lg" onClick={()=>pickColor(c)}
                className="flex items-center justify-center gap-2">
                <span className="text-xl">{c.emoji}</span>{c.name}
              </CandyButton>
            ))}
          </div>
          <p className="mt-4 text-center text-xs font-bold text-ink-soft">{t('colorExplore.score', { n: score })}</p>
        </>
      )}

      <AnimatePresence>{!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}</AnimatePresence>
    </div>
  );
}

export const ColorExplore = memo(ColorExploreImpl);
