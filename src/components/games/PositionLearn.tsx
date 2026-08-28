/**
 * 位置方位认知 🧭 (O3)
 * 上下左右里外前后 — 空间概念
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const POSES = [
  { label:'上面', en:'Above', opposite:'下面', emoji:'⬆️', color:'bg-sky-200' },
  { label:'下面', en:'Below', opposite:'上面', emoji:'⬇️', color:'bg-amber-200' },
  { label:'左边', en:'Left', opposite:'右边', emoji:'⬅️', color:'bg-pink-200' },
  { label:'右边', en:'Right', opposite:'左边', emoji:'➡️', color:'bg-green-200' },
  { label:'里面', en:'Inside', opposite:'外面', emoji:'📥', color:'bg-purple-200' },
  { label:'外面', en:'Outside', opposite:'里面', emoji:'📤', color:'bg-orange-200' },
  { label:'前面', en:'Front', opposite:'后面', emoji:'👆', color:'bg-yellow-200' },
  { label:'后面', en:'Behind', opposite:'前面', emoji:'👇', color:'bg-red-200' },
];

/** 场景：小动物位置描述 */
const SCENES = [
  { obj:'🐱 小猫', container:'📦 盒子', pose:'里面', prompt:'小猫在盒子里面' },
  { obj:'🐶 小狗', container:'🏠 房子', pose:'外面', prompt:'小狗在房子外面' },
  { obj:'🐰 兔子', container:'🌳 大树', pose:'上面', prompt:'兔子在大树上面' },
  { obj:'🐻 小熊', container:'🪑 椅子', pose:'下面', prompt:'小熊在椅子下面' },
  { obj:'🐸 青蛙', container:'🪷 荷叶', pose:'前面', prompt:'青蛙在荷叶前面' },
  { obj:'🐦 小鸟', container:'🌳 树', pose:'后面', prompt:'小鸟在树的后面' },
];

export function PositionLearn() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'learn'|'quiz'>('learn');
  const [scene, setScene] = useState(() => SCENES[Math.floor(Math.random()*SCENES.length)] ?? { obj: '', container: '', pose: '', prompt: '' });
  const [options, setOptions] = useState(() => shuffle(POSES).slice(0,4));
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);

  const newRound = () => {
    setScene(SCENES[Math.floor(Math.random()*SCENES.length)] ?? { obj: '', container: '', pose: '', prompt: '' });
    setOptions(shuffle(POSES).slice(0,4));
  };

  const pickPose = (pose: typeof POSES[number]) => {
    if (lockRef.current) return;
    lockRef.current = true;
    if (mode === 'learn') {
      void speak(`${pose.label}，${pose.opposite}的对面就是${pose.label}`, { lang:'zh-CN', rate:0.8, module:'ai' });
      setTimeout(() => lockRef.current = false, 800);
      return;
    }
    const correct = POSES.find(p=>p.label===scene.pose) ?? { label: '', en: '', opposite: '', emoji: '', color: '' };
    if (pose.label === correct.label) {
      sfxCorrect(); setFeedback(t('position.correct', { prompt: scene.prompt })); setScore(s=>s+1);
      void speak(`对了！${scene.prompt}`, { lang:'zh-CN', rate:0.85, module:'praise' });
    } else {
      sfxWrong(); setFeedback(t('position.wrong', { pose: pose.label }));
      void speak(`再想想，${scene.obj}在哪儿呢？`, { lang:'zh-CN', rate:0.85, module:'praise' });
    }
    setTimeout(() => { newRound(); setFeedback(''); lockRef.current = false; }, 1200);
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('position.title')}</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button onClick={()=>setMode('learn')} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='learn'?'bg-candy-green-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{t('position.learn')}</button>
        <button onClick={()=>{setMode('quiz');newRound();}} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='quiz'?'bg-candy-green-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{t('position.quiz')}</button>
      </div>

      {mode === 'learn' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {POSES.map(p => (
            <button key={p.label} onClick={()=>pickPose(p)} className={`${p.color} rounded-2xl p-4 text-center shadow-sm transition-all hover:scale-105 active:scale-95`}>
              <div className="text-3xl">{p.emoji}</div>
              <div className="mt-1 text-sm font-extrabold">{p.label}</div>
              <div className="text-xs font-medium opacity-70">{p.en}</div>
            </button>
          ))}
        </div>
      )}

      {mode === 'quiz' && (
        <>
          <div className="mb-5 text-center">
            <div className="mb-2 text-5xl">{scene.obj}</div>
            <div className="text-6xl">{scene.container}</div>
            <p className="mt-3 text-lg font-extrabold text-ink">
              {t('position.question', { obj: scene.obj, container: scene.container })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {options.map(p => (
              <CandyButton key={p.label} tone="green" size="lg" onClick={()=>pickPose(p)}>
                {p.emoji} {p.label}
              </CandyButton>
            ))}
          </div>
          <div className="mt-4 text-center text-xs font-bold text-ink-soft">{t('position.score', { score })}</div>
        </>
      )}

      <AnimatePresence>{!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}</AnimatePresence>
    </div>
  );
}
