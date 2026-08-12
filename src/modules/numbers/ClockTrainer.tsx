/**
 * 时钟认知训练 🌈 (N1)
 * ------------------------------------------------------------
 * 5-6 岁幼儿时钟学习组件，分 3 个难度递进：
 *   1. 整点（认识时针分针、读整点）
 *   2. 半点（认识半点、区分短针位置）
 *   3. 混合练习（随机时间 + 手动画指针）
 *
 * 设计依据：蒙台梭利时间教育法 + 幼小衔接时钟大纲
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CandyButton } from '@/components/ui/Button';
import { sfxCorrect, sfxWrong } from '@/lib/sfx';
import { speak } from '@/lib/speech';
import { useStore } from '@/store/useStore';
import { useTranslation } from '@/i18n/useTranslation';

type Level = 1 | 2 | 3;

interface ClockTime {
  hour: number;
  minute: number;
  label: string; // 如 "3点整"、"3点半"
}

function randomTime(level: Level): ClockTime {
  const hour = Math.floor(Math.random() * 12) + 1;
  if (level === 1) {
    return { hour, minute: 0, label: `${hour}点整` };
  }
  if (level === 2) {
    return { hour, minute: 30, label: `${hour}点半` };
  }
  const half = Math.random() < 0.5;
  return half
    ? { hour, minute: 30, label: `${hour}点半` }
    : { hour, minute: 0, label: `${hour}点整` };
}

function generateOptions(correct: ClockTime, count: number): ClockTime[] {
  const opts = new Set([correct.label]);
  while (opts.size < count) {
    const h = Math.floor(Math.random() * 12) + 1;
    const m = Math.random() < 0.5 ? 0 : 30;
    const label = m === 0 ? `${h}点整` : `${h}点半`;
    opts.add(label);
  }
  return [...opts].map((l) => {
    const [h, rest] = l.split('点');
    const m = rest!.includes('半') ? 30 : 0;
    return { hour: Number(h), minute: m, label: l };
  });
}

/** 时针角度（hour 1-12, minute 0/30） */
function hourAngle(h: number, m: number): number {
  return ((h % 12) + m / 60) * 30;
}

/** 分针角度 */
function minuteAngle(m: number): number {
  return m * 6;
}

function ClockFace({ time }: { time: ClockTime }) {

  const hAngle = hourAngle(time.hour, time.minute);
  const mAngle = minuteAngle(time.minute);

  return (
    <div className="relative mx-auto h-48 w-48 sm:h-56 sm:w-56">
      {/* 外圈 */}
      <div className="absolute inset-0 rounded-full border-[6px] border-candy-yellow-deep bg-white shadow-candy-md" />
      {/* 数字 */}
      {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const r = 80;
        const x = 50 + (r * Math.sin(angle)) / 2;
        const y = 50 - (r * Math.cos(angle)) / 2;
        return (
          <span
            key={`n-${i}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-xs font-extrabold text-ink sm:text-sm"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {n === 12 ? '🕛' : n === 3 ? '🕒' : n === 6 ? '🕕' : n === 9 ? '🕘' : n}
          </span>
        );
      })}
      {/* 时针 */}
      <div
        className="absolute left-1/2 top-1/2 origin-bottom rounded-full bg-candy-blue-deep"
        style={{
          width: '4px',
          height: '30%',
          transform: `translate(-50%, -100%) rotate(${hAngle}deg)`,
          borderRadius: '4px 4px 0 0',
        }}
      />
      {/* 分针 */}
      <div
        className="absolute left-1/2 top-1/2 origin-bottom rounded-full bg-candy-pink-deep"
        style={{
          width: '3px',
          height: '40%',
          transform: `translate(-50%, -100%) rotate(${mAngle}deg)`,
          borderRadius: '3px 3px 0 0',
        }}
      />
      {/* 中心点 */}
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-candy-orange-deep shadow-sm" />
    </div>
  );
}

export function ClockTrainer() {
  const { t: tr } = useTranslation();
  const [level, setLevel] = useState<Level>(1);
  const [current, setCurrent] = useState(() => randomTime(1));
  const [options, setOptions] = useState(() => generateOptions(current, 4));
  const [feedback, setFeedback] = useState<{ kind: 'correct' | 'wrong'; label: string } | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const lockRef = useRef(false);

  const nextRound = useCallback((lvl?: Level) => {
    const lv = lvl ?? level;
    const t = randomTime(lv);
    setCurrent(t);
    setOptions(generateOptions(t, lv === 3 ? 4 : 3));
    setFeedback(null);
    lockRef.current = false;
  }, [level]);

  const handlePick = (opt: ClockTime) => {
    if (lockRef.current) return;
    lockRef.current = true;
    if (opt.label === current.label) {
      sfxCorrect();
      setFeedback({ kind: 'correct', label: current.label });
      const newScore = score + 1;
      setScore(newScore);
      setRound(r => r + 1);
      void speak(`对了！${current.label}`, { lang: 'zh-CN', rate: 0.85, module: 'praise' });
      useStore.getState().practice('time', true, 1);
      // 升级检查：连对 3 次升档
      if (newScore >= 3 && level < 3) {
        setTimeout(() => {
          const nextLv = (level + 1) as Level;
          setLevel(nextLv);
          setScore(0);
          nextRound(nextLv);
        }, 800);
      } else {
        setTimeout(() => nextRound(), 1000);
      }
    } else {
      sfxWrong();
      setFeedback({ kind: 'wrong', label: current.label });
      setRound(r => r + 1);
      void speak(`再试试！这是${current.label}哦`, { lang: 'zh-CN', rate: 0.85, module: 'praise' });
      useStore.getState().practice('time', false, 0);
      setTimeout(() => nextRound(), 1500);
    }
  };

  const lvInfo = {
    1: { label: tr('clockTrainer.level1'), desc: tr('clockTrainer.level1Desc'), color: 'bg-candy-blue-soft' },
    2: { label: tr('clockTrainer.level2'), desc: tr('clockTrainer.level2Desc'), color: 'bg-candy-green-soft' },
    3: { label: tr('clockTrainer.level3'), desc: tr('clockTrainer.level3Desc'), color: 'bg-candy-purple-soft' },
  }[level];

  return (
    <div className="card-candy p-4 sm:p-6">
      <h3 className="mb-2 text-center text-lg font-extrabold text-ink">⏰ {tr('clockTrainer.title')}</h3>
      <div className="mb-4 text-center">
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${lvInfo.color} text-ink`}>
          {lvInfo.label} · {lvInfo.desc}
        </span>
      </div>

      {/* 钟面 */}
      <div className="mb-5">
        <ClockFace key={current.label} time={current} />
      </div>

      {/* 题目 */}
      <p className="mb-4 text-center text-lg font-bold text-ink-soft">
        {tr('clockTrainer.question')}
      </p>

      {/* 选项 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {options.map((opt) => (
          <CandyButton
            key={opt.label}
            tone={feedback?.kind === 'correct' && opt.label === current.label ? 'green' : feedback?.kind === 'wrong' && opt.label === current.label ? 'pink' : 'blue'}
            size="lg"
            onClick={() => handlePick(opt)}
          >
            {opt.label}
          </CandyButton>
        ))}
      </div>

      {/* 反馈 */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center"
          >
            {feedback.kind === 'correct' ? (
              <span className="inline-block rounded-xl bg-candy-green-soft px-4 py-2 text-sm font-extrabold text-candy-green-deep">
                ✅ {tr('clockTrainer.correct', { label: feedback.label })}
              </span>
            ) : (
              <span className="inline-block rounded-xl bg-candy-pink-soft px-4 py-2 text-sm font-extrabold text-candy-pink-deep">
                ❌ {tr('clockTrainer.wrong', { label: feedback.label })}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 进度 */}
      <div className="mt-4 flex items-center justify-between text-xs font-bold text-ink-soft">
        <span>{tr('clockTrainer.questionN', { n: round + 1 })}</span>
        <span>{tr('clockTrainer.streak', { score })}</span>
        <button
          onClick={() => { setLevel(1); setScore(0); nextRound(1); }}
          className="rounded-lg bg-white px-2 py-1 shadow-sm hover:bg-pink-50"
        >
          🔄 {tr('clockTrainer.restart')}
        </button>
      </div>
    </div>
  );
}
