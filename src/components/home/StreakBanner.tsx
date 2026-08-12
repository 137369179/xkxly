import { motion } from 'motion/react';
import { useStreak } from '@/store/useStore';
import { navigate } from '@/lib/router';
import { sfxTap } from '@/lib/sfx';
import { CandyButton } from '@/components/ui/Button';

/**
 * 连续打卡展示：火焰动画 + 里程碑
 * 火焰随天数变化（1-2天🔥, 3-6天🔥🔥, 7+🔥🔥🔥）
 */
export default function StreakBanner() {
  const streak = useStreak();

  // 火焰等级
  const flameLevel = streak === 0 ? 0 : streak <= 2 ? 1 : streak <= 6 ? 2 : 3;
  const flames = '🔥'.repeat(flameLevel);

  // 里程碑文案
  const milestone =
    streak === 0
      ? '今天开始第一次学习吧！'
      : streak < 3
        ? '坚持就是胜利，继续加油！'
        : streak < 7
          ? '已经坚持好几天啦，太棒了！'
          : streak < 14
            ? '一周以上！你是学习小能手！'
            : streak < 30
              ? '两周以上！超级了不起！'
              : '一个月以上！你是学习小英雄！';

  // 下一个里程碑
  const nextMilestone =
    streak < 3 ? 3 : streak < 7 ? 7 : streak < 14 ? 14 : streak < 30 ? 30 : streak + 7;
  const daysToNext = Math.max(0, nextMilestone - streak);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-[2rem] border-4 border-white bg-gradient-to-br from-orange-100 via-pink-50 to-yellow-50 p-6 shadow-pop"
    >
      {/* 背景装饰圆 */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-200/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-pink-200/30 blur-xl" />

      <div className="relative z-10 flex items-center gap-5">
        {/* 火焰动画区 */}
        <motion.div
          className="flex shrink-0 flex-col items-center justify-center"
          animate={
            flameLevel > 0
              ? { y: [0, -4, 0] }
              : {}
          }
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: 'easeInOut',
          }}
        >
          <div className="text-5xl sm:text-6xl">
            {flameLevel === 0 ? '🌱' : flames}
          </div>
          <div className="mt-1 text-center">
            <span className="text-2xl font-extrabold tabular-nums text-candy-orange-deep">
              {streak}
            </span>
            <span className="text-sm font-bold text-candy-orange-deep/70"> 天</span>
          </div>
        </motion.div>

        {/* 文案区 */}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold text-candy-orange-deep sm:text-xl">
            连续打卡
          </h2>
          <p className="mt-1 text-sm font-bold text-ink-soft">{milestone}</p>
          {daysToNext > 0 && (
            <p className="mt-1 text-xs font-bold text-candy-orange-deep/60">
              再坚持 {daysToNext} 天到达 {nextMilestone} 天里程碑 🎯
            </p>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <CandyButton
          tone="orange"
          size="md"
          fullWidth
          onClick={() => {
            sfxTap();
            navigate('today');
          }}
        >
          马上学习 →
        </CandyButton>
      </div>
    </motion.div>
  );
}
