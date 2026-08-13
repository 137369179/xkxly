/**
 * 职业认知 👮 (S6)
 * 认识职业 + 工具配对
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const JOBS = [
  { emoji: '👮', name: '警察', en: 'Police', tool: '🚔', uniform: '蓝色制服', desc: '保护大家安全' },
  { emoji: '🧑‍⚕️', name: '医生', en: 'Doctor', tool: '🩺', uniform: '白大褂', desc: '治病救人' },
  { emoji: '🧑‍🏫', name: '老师', en: 'Teacher', tool: '📚', uniform: '正装', desc: '教书育人' },
  { emoji: '🚒', name: '消防员', en: 'Firefighter', tool: '🚒', uniform: '橙色防护服', desc: '灭火救援' },
  { emoji: '👨‍🍳', name: '厨师', en: 'Chef', tool: '🍳', uniform: '围裙厨师帽', desc: '做美味饭菜' },
  { emoji: '🧑‍🌾', name: '农民', en: 'Farmer', tool: '🚜', uniform: '草帽工装', desc: '种粮食蔬菜' },
  { emoji: '🧑‍✈️', name: '飞行员', en: 'Pilot', tool: '✈️', uniform: '制服帽子', desc: '开飞机' },
  { emoji: '🧑‍🎨', name: '画家', en: 'Artist', tool: '🎨', uniform: '围裙', desc: '画美丽图画' },
  { emoji: '🧑‍🔬', name: '科学家', en: 'Scientist', tool: '🔬', uniform: '白大褂', desc: '做实验研究' },
  { emoji: '🧑‍🎤', name: '歌手', en: 'Singer', tool: '🎤', uniform: '演出服', desc: '唱歌表演' },
];



export function JobExplore() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn');
  const [selected, setSelected] = useState(0);
  const [quizJob, setQuizJob] = useState(() => JOBS[Math.floor(Math.random() * JOBS.length)]!);
  const [options, setOptions] = useState(() => shuffle(JOBS).slice(0, 4));
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const j = mode === 'learn' ? JOBS[selected]! : quizJob!;

  const nextQuiz = () => {
    setQuizJob(JOBS[Math.floor(Math.random() * JOBS.length)]!);
    setOptions(shuffle(JOBS).slice(0, 4));
    setFeedback('');
  };

  const pick = (job: typeof JOBS[0]) => {
    if (lockRef.current) return;
    lockRef.current = true;
    sfxTap();
    if (job.name === quizJob!.name) {
      sfxCorrect(); setScore(s => s + 1); setFeedback(`✅ ${t('jobExplore.correct', { name: quizJob!.name, desc: quizJob!.desc })}`);
      void speak(`对了！${quizJob.name}`, { lang: 'zh-CN', rate: 0.85, module: 'praise' });
    } else {
      sfxWrong(); setFeedback(`❌ ${t('jobExplore.wrong', { name: quizJob.name })}`);
      void speak('再想想', { lang: 'zh-CN', rate: 0.85, module: 'praise' });
    }
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { timerRef.current = null; nextQuiz(); lockRef.current = false; }, 1500);
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">👮 {t('jobExplore.title')}</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button onClick={()=>setMode('learn')} className={cn('rounded-xl px-4 py-1.5 text-sm font-extrabold', mode==='learn'?'bg-candy-orange-deep text-white':'bg-white text-ink-soft shadow-sm')}>📖 {t('jobExplore.learnMode')}</button>
        <button onClick={()=>{setMode('quiz');nextQuiz();}} className={cn('rounded-xl px-4 py-1.5 text-sm font-extrabold', mode==='quiz'?'bg-candy-orange-deep text-white':'bg-white text-ink-soft shadow-sm')}>🎯 {t('jobExplore.quizMode')}</button>
      </div>

      {mode === 'learn' && (
        <>
          <div className="mb-4 text-center">
            <motion.div key={j.emoji} initial={{scale:0.5}} animate={{scale:1}} className="mx-auto mb-2 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white shadow-lg">
              <span className="text-5xl">{j.emoji}</span>
            </motion.div>
            <p className="text-xl font-extrabold text-ink">{j.name} <span className="text-sm font-bold text-ink-soft">{j.en}</span></p>
            <p className="text-xs font-bold text-ink-soft">🔧 {t('jobExplore.toolPrefix')}：{j.tool} · 👕 {j.uniform}</p>
            <p className="mt-1 text-xs text-ink-muted">{j.desc}</p>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {JOBS.map((job, i) => (
              <button key={job.en} onClick={()=>{setSelected(i);speak(job.name,{lang:'zh-CN',rate:0.8,module:'ai'});}}
                className={cn('rounded-xl p-2 text-center shadow-sm transition-all hover:scale-105',
                  selected===i ? 'bg-candy-orange-deep text-white' : 'bg-white'
                )}>
                <div className="text-2xl">{job.emoji}</div>
                <div className="text-[9px] font-bold">{job.name}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {mode === 'quiz' && (
        <div className="text-center">
          <p className="mb-3 text-sm font-bold text-ink">{t('jobExplore.quizPrompt')}</p>
          <motion.div key={j.tool} initial={{scale:0.5}} animate={{scale:1}} className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg">
            <span className="text-5xl">{j.tool}</span>
          </motion.div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {options.map(o => (
              <button key={o.en} onClick={()=>pick(o)} disabled={lockRef.current}
                className="rounded-2xl bg-white p-3 text-center shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50">
                <div className="text-3xl">{o.emoji}</div>
                <div className="text-xs font-extrabold">{o.name}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 text-xs font-bold text-ink-soft">{t('jobExplore.score', { score })}</div>
        </div>
      )}

      <AnimatePresence>
        {!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
