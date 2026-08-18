/**
 * 身体部位认知 👤 (O2)
 * 头部/躯干/四肢，中英双语，点击发音
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

/** 身体部位数据（供单元测试校验完整性） */
export const PARTS = [
  { id:'head', name:'头', en:'Head', emoji:'😀', zone:'head', desc:'我们用它来思考问题' },
  { id:'eye', name:'眼睛', en:'Eye', emoji:'👁️', zone:'head', desc:'用来看世界的窗户' },
  { id:'ear', name:'耳朵', en:'Ear', emoji:'👂', zone:'head', desc:'用来听声音的' },
  { id:'nose', name:'鼻子', en:'Nose', emoji:'👃', zone:'head', desc:'用来呼吸和闻味道' },
  { id:'mouth', name:'嘴巴', en:'Mouth', emoji:'👄', zone:'head', desc:'用来吃东西和说话' },
  { id:'neck', name:'脖子', en:'Neck', emoji:'🧣', zone:'torso', desc:'连接头和身体' },
  { id:'shoulder', name:'肩膀', en:'Shoulder', emoji:'💪', zone:'torso', desc:'支撑手臂' },
  { id:'arm', name:'手臂', en:'Arm', emoji:'💪', zone:'limb', desc:'用来拿东西和抱抱' },
  { id:'hand', name:'手', en:'Hand', emoji:'✋', zone:'limb', desc:'用来写字画画' },
  { id:'leg', name:'腿', en:'Leg', emoji:'🦵', zone:'limb', desc:'用来走路和跑步' },
  { id:'foot', name:'脚', en:'Foot', emoji:'🦶', zone:'limb', desc:'支撑我们站立' },
  { id:'belly', name:'肚子', en:'Belly', emoji:'🍔', zone:'torso', desc:'消化食物的地方' },
];

export function BodyParts() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [quizPart, setQuizPart] = useState(PARTS[0]!);

  const select = (id: string) => {
    setSelected(id);
    const part = PARTS.find(p=>p.id===id);
    if (part) speak(part.name, { lang:'zh-CN', rate:0.8, module:'ai' });
  };

  const nextQuiz = () => {
    const p = PARTS[Math.floor(Math.random()*PARTS.length)]!
    setQuizPart(p);
    speak(p.name, { lang:'zh-CN', rate:0.85, module:'ai' });
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">{t('body.title')}</h3>
      <div className="mb-4 flex justify-center gap-2">
        <button aria-label={t('body.learn')} onClick={()=>setQuizMode(false)} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${!quizMode?'bg-candy-blue-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{t('body.learn')}</button>
        <button aria-label={t('body.point')} onClick={()=>{setQuizMode(true);nextQuiz();}} className={`rounded-xl px-4 py-1.5 text-sm font-extrabold ${quizMode?'bg-candy-blue-deep text-white':'bg-white text-ink-soft shadow-sm'}`}>{t('body.point')}</button>
      </div>

      {!quizMode ? (
        <div className="space-y-3">
          {['head','torso','limb'].map(zone => (
            <div key={zone}>
              <p className="mb-2 text-xs font-extrabold text-ink-muted uppercase">{zone==='head'?t('body.head'):zone==='torso'?t('body.torso'):t('body.limb')}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {PARTS.filter(p=>p.zone===zone).map(p => (
                  <button key={p.id} onClick={()=>select(p.id)}
                    className={cn('rounded-xl p-3 text-center shadow-sm transition-all hover:scale-105', selected===p.id?'bg-candy-blue-deep text-white':'bg-white')}>
                    <div className="text-2xl">{p.emoji}</div>
                    <div className="mt-1 text-xs font-extrabold">{p.name}</div>
                    <div className="text-[10px] font-medium opacity-70">{p.en}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {selected && (
            <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} className="rounded-xl bg-candy-blue-soft p-3 text-center">
              <p className="text-sm font-bold text-candy-blue-deep">{PARTS.find(p=>p.id===selected)?.desc}</p>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <motion.div key={quizPart.id} initial={{scale:0}} animate={{scale:1}} className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] bg-candy-blue-soft text-6xl shadow-lg">
            {quizPart.emoji}
          </motion.div>
          <p className="text-lg font-extrabold text-ink">{t('body.pointYours', { part: quizPart.name })}</p>
          <p className="text-xs font-bold text-ink-soft">{t('body.foundIt')}</p>
          <button onClick={nextQuiz} className="rounded-xl bg-candy-blue-deep px-6 py-2.5 text-sm font-extrabold text-white shadow-sm">{t('body.next')}</button>
        </div>
      )}
    </div>
  );
}
