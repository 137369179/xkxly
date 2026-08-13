/**
 * 图形认知 - 三角形/正方形/圆形/长方形
 */

import { useState, useMemo } from 'react';
import { shuffle } from "@/lib/utils";
import { PageHeader, Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { sfxTap, sfxStar, sfxCorrect, sfxWrong } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { motion, AnimatePresence } from 'motion/react';
import { speak } from '@/lib/speech';
import { useTranslation } from '@/i18n/useTranslation';

interface Shape {
  name: string;
  emoji: string;
  sides: number;
  desc: string;
  examples: string[];
}

const SHAPES: Shape[] = [
  { name: '圆形', emoji: '⭕', sides: 0, desc: '圆溜溜的，没有角', examples: ['球', '太阳', '车轮', '盘子'] },
  { name: '正方形', emoji: '⬜', sides: 4, desc: '四条边一样长，四个角一样大', examples: ['窗户', '手帕', '骰子', '瓷砖'] },
  { name: '长方形', emoji: '▬', sides: 4, desc: '对边一样长，四个角一样大', examples: ['门', '书本', '手机', '床'] },
  { name: '三角形', emoji: '🔺', sides: 3, desc: '三条边，三个角', examples: ['屋顶', '红领巾', '三角尺', '切片蛋糕'] },
  { name: '五角星', emoji: '⭐', sides: 5, desc: '五个角，五条边', examples: ['星星', '国旗上的星', '苹果切开'] },
];

type Mode = 'learn' | 'quiz';

export function ShapeLearn() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('learn');
  const [idx, setIdx] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [picked, setPicked] = useState(-1);

  const shape = SHAPES[idx]!

  // 出题：给一个物品名，选图形
  const quizItem = useMemo(() => {
    const s = SHAPES[quizIdx % SHAPES.length]!
    const ex = s.examples[quizIdx % s.examples.length];
    const options = shuffle([s, ...SHAPES.filter(x => x !== s)]).slice(0, 4);
    if (!options.find(o => o.name === s.name)) options[0] = s;
    return { ex, answer: s, options };
  }, [quizIdx]);

  const handlePick = (i: number) => {
    if (answered) return;
    sfxTap();
    setPicked(i);
    setAnswered(true);
    if (quizItem.options[i]!.name === quizItem.answer.name) {
      sfxCorrect();
      setScore(s => s + 1);
      celebrateSmall();
    } else {
      sfxWrong();
    }
  };

  const next = () => {
    sfxTap();
    setAnswered(false);
    setPicked(-1);
    setQuizIdx(i => i + 1);
  };

  if (mode === 'quiz') {
    const { ex, answer, options } = quizItem;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <CandyButton tone="blue" variant="soft" size="sm" onClick={() => { sfxTap(); setMode('learn'); }}>
            ◀️ {t('numbers.learnShape')}
          </CandyButton>
          <span className="text-sm font-black text-candy-orange-deep">⭐ {score}</span>
        </div>

        <Panel className="text-center">
          <p className="text-sm font-bold text-ink-soft">{t('numbers.whatShape', { item: ex ?? '' })}</p>
        </Panel>

        <div className="grid grid-cols-2 gap-3">
          {options.map((o, i) => {
            const isAnswer = o.name === answer.name;
            const isPicked = i === picked;
            return (
              <motion.button
                key={`o-${i}`}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePick(i)}
                disabled={answered}
                className={`rounded-2xl p-4 text-center transition-all ${
                  answered
                    ? isAnswer
                      ? 'bg-candy-green-soft ring-4 ring-candy-green-deep'
                      : isPicked
                        ? 'bg-candy-pink-soft ring-4 ring-candy-pink-deep'
                        : 'bg-white/40'
                    : 'bg-candy-blue-soft hover:bg-candy-blue-soft/80'
                }`}
              >
                <div className="text-4xl">{o.emoji}</div>
                <div className="mt-1 text-sm font-black text-ink">{o.name}</div>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {answered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Panel className="text-center">
                <p className="text-sm font-bold text-ink">
                  {picked >= 0 && options[picked]!.name === answer.name ? t('numbers.correct') : t('numbers.wrongAnswer', { shape: answer.name })}
                </p>
                <p className="mt-1 text-xs font-bold text-ink-soft">{answer.desc}</p>
                <CandyButton tone="orange" size="sm" onClick={next} className="mt-3">
                  {t('numbers.nextQuestion')}
                </CandyButton>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader emoji="📐" title={t('numbers.learnShape')} subtitle={t('numbers.shapeDesc')} tone="blue" />

      <div className="flex justify-end">
        <CandyButton tone="orange" size="sm" onClick={() => { sfxTap(); setMode('quiz'); setScore(0); setQuizIdx(0); setAnswered(false); setPicked(-1); }}>
          {t('numbers.guessShape')}
        </CandyButton>
      </div>

      <motion.div
        key={`shape-${idx}`}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <Panel className="text-center">
          <div className="text-8xl">{shape.emoji}</div>
          <h2 className="mt-2 text-2xl font-black text-ink">{shape.name}</h2>
          <p className="text-sm font-bold text-ink-soft">{shape.desc}</p>
          <CandyButton tone="blue" size="sm" onClick={() => speak(shape.name)} className="mt-2">
            {t('numbers.read')}
          </CandyButton>
        </Panel>
      </motion.div>

      <Panel>
        <h4 className="mb-2 text-sm font-extrabold text-ink">{t('numbers.realLife', { shape: shape.name })}</h4>
        <div className="flex flex-wrap gap-2">
          {shape.examples.map((ex, i) => (
            <span key={`ex-${i}`} className="rounded-full bg-candy-blue-soft px-3 py-1 text-sm font-bold text-candy-blue-deep">
              {ex}
            </span>
          ))}
        </div>
      </Panel>

      <div className="flex items-center justify-between">
        <CandyButton
          tone="blue"
          variant="soft"
          size="sm"
          disabled={idx === 0}
          onClick={() => { sfxTap(); setIdx(i => Math.max(0, i - 1)); }}
        >
          {t('numbers.prev')}
        </CandyButton>
        <span className="text-sm font-bold text-ink-soft">{idx + 1} / {SHAPES.length}</span>
        <CandyButton
          tone="blue"
          size="sm"
          disabled={idx === SHAPES.length - 1}
          onClick={() => { sfxTap(); sfxStar(); setIdx(i => Math.min(SHAPES.length - 1, i + 1)); }}
        >
          {t('numbers.next')}
        </CandyButton>
      </div>
    </div>
  );
}
