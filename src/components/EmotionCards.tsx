/**
 * 情绪表情卡 😊 (R2)
 * 认识情绪 + 情景配对，社交情感学习
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';

import { speak } from '@/lib/speech';
import { cn, shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

const EMOTIONS = [
  { emoji: '😊', name: '开心', en: 'Happy', color: 'bg-yellow-200', desc: '笑眯眯的，心情很好' },
  { emoji: '😢', name: '难过', en: 'Sad', color: 'bg-blue-200', desc: '想哭，心里不舒服' },
  { emoji: '😠', name: '生气', en: 'Angry', color: 'bg-red-200', desc: '很恼火，想发脾气' },
  { emoji: '😮', name: '惊讶', en: 'Surprised', color: 'bg-purple-200', desc: '没想到会这样' },
  { emoji: '😨', name: '害怕', en: 'Scared', color: 'bg-gray-200', desc: '有点担心，不敢' },
  { emoji: '😴', name: '困倦', en: 'Sleepy', color: 'bg-indigo-200', desc: '好困，想睡觉了' },
];

const SCENARIOS = [
  { scene: '🎂 小朋友收到了生日礼物', emotion: '😊' },
  { scene: '🤖 玩具坏了修不好', emotion: '😢' },
  { scene: '😡 有人抢了我的玩具', emotion: '😠' },
  { scene: '🎉 突然有人喊惊喜！', emotion: '😮' },
  { scene: '👻 黑暗中看到奇怪的影子', emotion: '😨' },
  { scene: '🌙 天黑了，好困呀', emotion: '😴' },
  { scene: '🏆 比赛得了第一名', emotion: '😊' },
  { scene: '💧 冰淇淋掉地上了', emotion: '😢' },
];

export function EmotionCards() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'learn' | 'quiz'>('learn');
  const [scenario, setScenario] = useState(() => SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)] ?? SCENARIOS[0]!);
  const [options, setOptions] = useState(() => shuffle(EMOTIONS).slice(0, 4));
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // P3: 卸载时清理待触发的反馈定时器，避免对已卸载组件 setState
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const nextQuiz = () => {
    const sc = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)] ?? SCENARIOS[0]!;
    setScenario(sc);
    const corr = EMOTIONS.find(e => e.emoji === sc.emotion) ?? EMOTIONS[0]!;
    const others = shuffle(EMOTIONS.filter(e => e.emoji !== sc.emotion)).slice(0, 3);
    setOptions(shuffle([corr, ...others]));
    setFeedback('');
  };

  const nextScenario = () => {
    setScenario(SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)] ?? SCENARIOS[0]!);
    setOptions(shuffle(EMOTIONS).slice(0, 4));
    setFeedback('');
  };

  const pickEmotion = (emoji: string) => {
    if (mode === 'learn') {
      const e = EMOTIONS.find(em => em.emoji === emoji);
      if (e) { speak(e.name, { lang: 'zh-CN', rate: 0.8, module: 'ai' }); }
      return;
    }
    if (lockRef.current) return;
    lockRef.current = true;
    sfxTap();
    const correct = EMOTIONS.find(e => e.emoji === scenario.emotion)!;
    if (emoji === scenario.emotion) {
      sfxCorrect(); setScore(s => s + 1); setFeedback(t('emotion.correct', { name: correct.name }));
      void speak(`对了！这是${correct.name}`, { lang: 'zh-CN', rate: 0.85, module: 'praise' });
    } else {
      sfxWrong(); setFeedback(t('emotion.answerIs', { name: correct.name, emoji: correct.emoji }));
      void speak(`再想想`, { lang: 'zh-CN', rate: 0.85, module: 'praise' });
    }
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { timerRef.current = null; nextScenario(); lockRef.current = false; }, 1500);
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('emotion.title')}</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button onClick={()=>setMode('learn')} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='learn'?'bg-candy-pink-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{t('emotion.learn')}</button>
        <button onClick={()=>{setMode('quiz');nextQuiz();}} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${mode==='quiz'?'bg-candy-pink-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{t('emotion.quiz')}</button>

      </div>

      {mode === 'learn' && (
        <div className="grid grid-cols-3 gap-3">
          {EMOTIONS.map(e => (
            <button key={e.name} onClick={()=>pickEmotion(e.emoji)}
              className={cn(e.color, 'rounded-2xl p-4 text-center shadow-sm transition-all hover:scale-105 active:scale-95')}>
              <div className="text-4xl">{e.emoji}</div>
              <div className="mt-1 text-sm font-extrabold">{e.name}</div>
              <div className="text-[10px] font-medium opacity-70">{e.en}</div>
              <div className="mt-1 text-[9px] font-medium text-ink-muted">{e.desc}</div>
            </button>
          ))}
        </div>
      )}

      {mode === 'quiz' && (
        <div className="text-center">
          <div className="mb-4 rounded-xl bg-candy-pink-soft/30 p-4">
            <p className="text-lg font-extrabold text-ink">{scenario.scene}</p>
            <p className="mt-1 text-xs font-bold text-ink-soft">{t('emotion.howFeel')}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {options.map(e => (
              <button key={e.name} onClick={()=>pickEmotion(e.emoji)}
                className="rounded-2xl bg-white p-3 text-center shadow-sm transition-all hover:scale-105 active:scale-95">
                <div className="text-3xl">{e.emoji}</div>
                <div className="text-[10px] font-extrabold">{e.name}</div>
              </button>
            ))}
          </div>
          <div className="mt-3 text-xs font-bold text-ink-soft">{t('common.score')} {score}</div>
        </div>
      )}

      <AnimatePresence>
        {!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-3 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}
      </AnimatePresence>
    </div>
  );
}
