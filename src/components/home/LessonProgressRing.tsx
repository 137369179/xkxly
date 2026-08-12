import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useProgress } from '@/store/useStore';
import { buildDailyPlan, dateKey } from '@/lib/dailyPlan';
import { navigate } from '@/lib/router';
import { sfxTap, sfxStar } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { CandyButton } from '@/components/ui/Button';

/**
 * 环形进度组件：SVG 环 + 中心数字 + 按钮
 * 展示今日课程完成进度
 */
export default function LessonProgressRing() {
  const p = useProgress();

  const today = dateKey();
  const plan = useMemo(() => buildDailyPlan(p, Date.now()), [today]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = !!p.dailyLog[today]?.lesson;
  const total = plan.sections.length;
  const step = done
    ? total
    : p.lessonDate === today
      ? Math.min(p.lessonStep, total)
      : 0;

  const progress = total > 0 ? step / total : 0;
  const RADIUS = 52;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const isComplete = done || step >= total;

  const handleClick = () => {
    sfxTap();
    if (isComplete) {
      sfxStar();
      void celebrateSmall();
    }
    navigate('today');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center gap-4 rounded-[2rem] border-4 border-white bg-gradient-to-br from-candy-purple-soft to-candy-blue-soft p-6 shadow-pop"
    >
      <div className="relative h-32 w-32">
        {/* SVG 环形进度 */}
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          {/* 背景圆环 */}
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="10"
          />
          {/* 进度圆环 */}
          <motion.circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={isComplete ? '#5FD68B' : '#A78BFA'}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>

        {/* 中心数字 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isComplete ? (
            <>
              <span className="text-3xl">🎉</span>
              <span className="text-sm font-extrabold text-candy-green-deep">已完成</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-extrabold tabular-nums text-candy-purple-deep">
                {step}<span className="text-lg text-candy-purple-deep/60">/{total}</span>
              </span>
              <span className="text-xs font-bold text-candy-purple-deep/70">小节</span>
            </>
          )}
        </div>
      </div>

      <p className="text-center text-sm font-bold text-ink-soft">
        约 {plan.minutes ?? 15} 分钟 · {(plan.dueCount ?? 0) > 0 ? `${plan.dueCount} 个复习` : '今日课程'}
      </p>

      <CandyButton
        tone={isComplete ? 'green' : 'purple'}
        size="lg"
        fullWidth
        onClick={handleClick}
      >
        {isComplete ? '再学一遍 🔄' : step > 0 ? '继续学习 →' : '开始今日课程 →'}
      </CandyButton>
    </motion.div>
  );
}
