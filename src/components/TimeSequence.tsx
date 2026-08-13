/**
 * 时间顺序排列 ⏰ (P2)
 * 日常活动时间线排序，时间认知+因果逻辑
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { shuffle } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface TimeCard { id: string; emoji: string; label: string; time: string; order: number; }

const SEQUENCES: TimeCard[][] = [
  [
    { id:'1', emoji:'🌅', label:'早上起床', time:'7:00', order:1 },
    { id:'2', emoji:'🪥', label:'刷牙洗脸', time:'7:10', order:2 },
    { id:'3', emoji:'🍳', label:'吃早餐', time:'7:30', order:3 },
    { id:'4', emoji:'📚', label:'去上学', time:'8:00', order:4 },
    { id:'5', emoji:'🌙', label:'晚上睡觉', time:'21:00', order:5 },
  ],
  [
    { id:'1', emoji:'🌱', label:'种下种子', time:'第1天', order:1 },
    { id:'2', emoji:'🌿', label:'发出小芽', time:'第3天', order:2 },
    { id:'3', emoji:'🌸', label:'开花了', time:'第7天', order:3 },
    { id:'4', emoji:'🍎', label:'结出果实', time:'第14天', order:4 },
  ],
  [
    { id:'1', emoji:'🥚', label:'母鸡下蛋', time:'step 1', order:1 },
    { id:'2', emoji:'🐤', label:'小鸡破壳', time:'step 2', order:2 },
    { id:'3', emoji:'🐔', label:'长大成鸡', time:'step 3', order:3 },
    { id:'4', emoji:'🥚', label:'又下蛋了', time:'step 4', order:4 },
  ],
  [
    { id:'1', emoji:'☁️', label:'天上乌云', time:'step 1', order:1 },
    { id:'2', emoji:'🌧️', label:'下起大雨', time:'step 2', order:2 },
    { id:'3', emoji:'🌈', label:'雨后彩虹', time:'step 3', order:3 },
    { id:'4', emoji:'☀️', label:'太阳出来', time:'step 4', order:4 },
  ],
  [
    { id:'1', emoji:'🌙', label:'夜晚月亮', time:'20:00', order:1 },
    { id:'2', emoji:'😴', label:'睡着做梦', time:'21:00', order:2 },
    { id:'3', emoji:'🌅', label:'太阳升起', time:'6:00', order:3 },
    { id:'4', emoji:'🌅', label:'新的一天', time:'7:00', order:4 },
  ],
];

export function TimeSequence() {
  const { t } = useTranslation();
  const [seqIdx, setSeqIdx] = useState(0);
  const [cards, setCards] = useState<TimeCard[]>(() => shuffle(SEQUENCES[0]!));
  const [answer, setAnswer] = useState<TimeCard[]>([]);
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // P3: 卸载时清理待触发的反馈定时器，避免对已卸载组件 setState
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const startNew = (idx: number) => {
    setSeqIdx(idx);
    setCards(shuffle(SEQUENCES[idx]!));
    setAnswer([]);
    setFeedback('');
  };

  const pickCard = (card: TimeCard) => {
    if (lockRef.current || answer.find(a=>a.id===card.id)) return;
    sfxTap();
    const newAns = [...answer, card];
    setAnswer(newAns);
    void speak(card.label, { lang:'zh-CN', rate:0.8, module:'ai' });

    if (newAns.length === SEQUENCES[seqIdx]!.length) {
      lockRef.current = true;
      const correct = SEQUENCES[seqIdx]!.sort((a,b)=>a.order-b.order);
      const isCorrect = newAns.every((c,i)=>c.id=== correct[i]!.id);
      if (isCorrect) {
        sfxCorrect();
        setFeedback(t('timeseq.correct'));
        setScore(s=>s+1);
        void speak(t('timeseq.greatJobAllCorrect'), { lang:'zh-CN', rate:0.85, module:'praise' });
      } else {
        sfxWrong();
        const correctLabels = correct.map(c=>c.label).join('→');
        setFeedback(t('timeseq.correctOrder', { order: correctLabels }));
        void speak('再想想，什么先发生什么后发生呢？', { lang:'zh-CN', rate:0.85, module:'praise' });
      }
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { timerRef.current = null; startNew((seqIdx+1)%SEQUENCES.length); lockRef.current = false; }, 2000);
    }
  };

  const unpick = (card: TimeCard) => {
    if (lockRef.current) return;
    setAnswer(answer.filter(a=>a.id!==card.id));
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('timeseq.title')}</h3>
      <p className="mb-3 text-center text-xs font-bold text-ink-soft">{t('timeseq.subtitle')}</p>

      {/* 答案区 */}
      <div className="mb-4 min-h-[80px] rounded-xl bg-candy-blue-soft p-3">
        <p className="mb-2 text-center text-xs font-extrabold text-candy-blue-deep">{t('timeseq.tapToSort')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {answer.map((c, i) => (
            <motion.button key={c.id} initial={{scale:0}} animate={{scale:1}} onClick={()=>unpick(c)}
              className="relative rounded-xl bg-white p-2 text-center shadow-sm">
              <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-candy-blue-deep text-[10px] font-bold text-white">{i+1}</span>
              <div className="text-2xl">{c.emoji}</div>
              <div className="text-[10px] font-extrabold">{c.label}</div>
            </motion.button>
          ))}
          {answer.length === 0 && <span className="text-xs text-ink-muted">{t('timeseq.pickCards')}</span>}
        </div>
      </div>

      {/* 待选区 */}
      <div className="flex flex-wrap justify-center gap-2">
        {cards.filter(c=>!answer.find(a=>a.id===c.id)).map(c => (
          <button key={c.id} onClick={()=>pickCard(c)}
            className="rounded-xl bg-white p-2 text-center shadow-sm transition-all hover:scale-105 active:scale-95">
            <div className="text-2xl">{c.emoji}</div>
            <div className="text-[10px] font-extrabold">{c.label}</div>
            <div className="text-[9px] text-ink-muted">{c.time}</div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {!!feedback && <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-4 text-center text-sm font-extrabold text-ink-soft">{feedback}</motion.div>}
      </AnimatePresence>
      <div className="mt-2 text-center text-xs font-bold text-ink-soft">{t('timeseq.progress', { score, n: seqIdx+1, total: SEQUENCES.length })}</div>
      <CandyButton tone="blue" size="sm" className="mt-3 w-full" onClick={()=>startNew((seqIdx+1)%SEQUENCES.length)}>{t('common.retryNew')}</CandyButton>
    </div>
  );
}
