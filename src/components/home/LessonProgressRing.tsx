import { useMemo } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
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
  const { t } = useTranslation();
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
      className="flex flex-col items-center justify-between gap-4 rounded-[2.2rem] border-4 border-pink-200/90 bg-white/95 p-6 shadow-fluffy backdrop-blur-xl min-h-[260px]"
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
              <span className="text-sm font-extrabold text-candy-green-deep">{t('lessonProgressRing.completed')}</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-extrabold tabular-nums text-candy-purple-deep">
                {step}<span className="text-lg text-candy-purple-deep/60">/{total}</span>
              </span>
              <span className="text-xs font-bold text-candy-purple-deep/70">{t('lessonProgressRing.lessons')}</span>
            </>
          )}
        </div>
      </div>

      <p className="text-center text-sm font-bold text-ink-soft">
        {t('lessonProgressRing.plan', { minutes: plan.minutes ?? 15, planLabel: (plan.dueCount ?? 0) > 0 ? t('lessonProgressRing.planReview', { count: plan.dueCount ?? 0 }) : t('lessonProgressRing.planToday') })}
      </p>

      <CandyButton
        tone={isComplete ? 'green' : 'purple'}
        size="lg"
        fullWidth
        onClick={handleClick}
      >
        {isComplete ? t('lessonProgressRing.again') : step > 0 ? t('lessonProgressRing.continue') : t('lessonProgressRing.start')}
      </CandyButton>
    </motion.div>
  );
}
