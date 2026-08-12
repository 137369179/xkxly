/**
 * 测量与比较 📏 (N8)
 * 幼儿数学启蒙：长短、高矮、轻重、大小比较
 * 4 种类型 + 可视化对比
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';
import { cn, shuffle } from '@/lib/utils';
import type { Tone } from '@/lib/tones';
import { useTranslation } from '@/i18n/useTranslation';

type CompareType = 'length' | 'height' | 'weight' | 'size';

interface CompareItem { label: string; value: number; emoji: string; color: string; }
interface CompareQ { type: CompareType; items: CompareItem[]; question: string; answerLabel: string; isMax: boolean; }

const COMPARES: CompareQ[] = [
  // 长短
  { type: 'length', items: [
    { label:'measure.pencil', value:3, emoji:'✏️', color:'bg-yellow-200' },
    { label:'measure.crayon', value:5, emoji:'🖍️', color:'bg-red-200' },
  ], question:'measure.questionLengthLong', answerLabel:'measure.crayon', isMax:true },
  { type: 'length', items: [
    { label:'measure.ropeA', value:2, emoji:'🪢', color:'bg-amber-200' },
    { label:'measure.ropeB', value:6, emoji:'🧵', color:'bg-green-200' },
  ], question:'measure.questionLengthLong', answerLabel:'measure.ropeB', isMax:true },
  { type: 'length', items: [
    { label:'measure.ruler', value:4, emoji:'📏', color:'bg-blue-200' },
    { label:'measure.toothpick', value:1, emoji:'🪥', color:'bg-pink-200' },
  ], question:'measure.questionLengthShort', answerLabel:'measure.toothpick', isMax:false },
  // 高矮
  { type: 'height', items: [
    { label:'measure.giraffe', value:8, emoji:'🦒', color:'bg-yellow-200' },
    { label:'measure.rabbit', value:2, emoji:'🐰', color:'bg-pink-200' },
  ], question:'measure.questionHeightHigh', answerLabel:'measure.giraffe', isMax:true },
  { type: 'height', items: [
    { label:'measure.tree', value:7, emoji:'🌳', color:'bg-green-200' },
    { label:'measure.mushroom', value:1, emoji:'🍄', color:'bg-red-200' },
  ], question:'measure.questionHeightHigh', answerLabel:'measure.tree', isMax:true },
  { type: 'height', items: [
    { label:'measure.building', value:6, emoji:'🏢', color:'bg-blue-200' },
    { label:'measure.house', value:3, emoji:'🏠', color:'bg-amber-200' },
  ], question:'measure.questionHeightShort', answerLabel:'measure.house', isMax:false },
  // 轻重
  { type: 'weight', items: [
    { label:'measure.elephant', value:9, emoji:'🐘', color:'bg-gray-200' },
    { label:'measure.bird', value:1, emoji:'🐦', color:'bg-yellow-200' },
  ], question:'measure.questionWeightHeavy', answerLabel:'measure.elephant', isMax:true },
  { type: 'weight', items: [
    { label:'measure.watermelon', value:7, emoji:'🍉', color:'bg-green-200' },
    { label:'measure.strawberry', value:2, emoji:'🍓', color:'bg-red-200' },
  ], question:'哪个更重？', answerLabel:'measure.watermelon', isMax:true },
  { type: 'weight', items: [
    { label:'measure.pencil', value:1, emoji:'✏️', color:'bg-yellow-200' },
    { label:'measure.schoolbag', value:5, emoji:'🎒', color:'bg-blue-200' },
  ], question:'measure.questionWeightLight', answerLabel:'measure.pencil', isMax:false },
  // 大小
  { type: 'size', items: [
    { label:'measure.basketball', value:6, emoji:'🏀', color:'bg-orange-200' },
    { label:'measure.pingpong', value:1, emoji:'🏓', color:'bg-white' },
  ], question:'measure.questionSizeBig', answerLabel:'measure.basketball', isMax:true },
  { type: 'size', items: [
    { label:'measure.sun', value:9, emoji:'☀️', color:'bg-yellow-200' },
    { label:'measure.star', value:2, emoji:'⭐', color:'bg-yellow-100' },
  ], question:'measure.questionSizeBig', answerLabel:'measure.sun', isMax:true },
  { type: 'size', items: [
    { label:'measure.bean', value:1, emoji:'🫘', color:'bg-green-200' },
    { label:'measure.pumpkin', value:8, emoji:'🎃', color:'bg-orange-200' },
  ], question:'measure.questionSizeSmall', answerLabel:'measure.bean', isMax:false },
];

const TYPE_EMOJI: Record<CompareType, { emoji: string; label: string; tone: Tone }> = {
  length: { emoji:'📏', label:'measure.length', tone:'blue' },
  height: { emoji:'🦒', label:'measure.height', tone:'green' },
  weight: { emoji:'⚖️', label:'measure.weight', tone:'orange' },
  size: { emoji:'🏀', label:'measure.size', tone:'pink' },
};

export function MeasureCompare() {
  const { t } = useTranslation();
  const [pool] = useState(() => shuffle(COMPARES));


  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState<'correct'|'wrong'|''>('');
  const [score, setScore] = useState(0);
  const lockRef = useRef(false);

  const current = pool[idx % pool.length]!
  const answerLabel = current.answerLabel;
  const typeInfo = TYPE_EMOJI[current.type]!

  const handlePick = (label: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    if (label === answerLabel) {
      sfxCorrect();
      setFeedback('correct');
      setScore(s => s + 1);
      void speak(t('measure.correctSpeak', { label: t(answerLabel) }), { lang:'zh-CN', rate:0.85, module:'praise' });
      useStore.getState().practice('compare', true, 1);
    } else {
      sfxWrong();
      setFeedback('wrong');
      void speak(t('measure.wrongSpeak', { picked: t(label), answer: t(answerLabel) }), { lang:'zh-CN', rate:0.85, module:'praise' });
      useStore.getState().practice('compare', false, 0);
    }
    setTimeout(() => { setFeedback(''); setIdx(i => i+1); lockRef.current = false; }, 1200);
  };

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-1 text-center text-lg font-extrabold text-ink">{t('measure.title')}</h3>
      <div className="mb-4 flex justify-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-ink-soft shadow-sm">
          {typeInfo.emoji} {t(typeInfo.label)}
        </span>
      </div>

      <p className="mb-5 text-center text-lg font-bold text-ink">{t(current.question)}</p>

      {/* 可视化对比栏 */}
      <div className="mb-6 flex items-end justify-center gap-6" style={{ minHeight:'160px' }}>
        {current.items.map(item => {
          const barH = Math.round((item.value / 10) * 120);
          return (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <span className="text-3xl">{item.emoji}</span>
              <span className="text-xs font-extrabold text-ink-soft">{t(item.label)}</span>
              <div
                className={cn('w-16 rounded-t-xl shadow-md', item.color)}
                style={{ height: `${barH}px` }}
              />
            </div>
          );
        })}
      </div>

      {/* 选项 */}
      <div className="flex gap-3">
        {current.items.map(item => (
          <CandyButton
            key={item.label}
            tone={
              feedback === 'correct' && item.label === answerLabel ? 'green' :
              feedback === 'wrong' && item.label === answerLabel ? 'green' : typeInfo.tone
            }
            size="lg"
            className="flex-1"
            onClick={() => handlePick(item.label)}
          >
            {item.emoji} {t(item.label)}
          </CandyButton>
        ))}
      </div>

      {/* 反馈 */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="mt-4 text-center">
            {feedback === 'correct' ? (
              <span className="inline-block rounded-xl bg-candy-green-soft px-4 py-2 text-sm font-extrabold text-candy-green-deep">{t('measure.correct')}</span>
            ) : (
              <span className="inline-block rounded-xl bg-candy-pink-soft px-4 py-2 text-sm font-extrabold text-candy-pink-deep">{t('measure.answerIs', { label: t(answerLabel) })}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 text-center text-xs font-bold text-ink-soft">{t('measure.score', { score })}</div>
    </div>
  );
}
