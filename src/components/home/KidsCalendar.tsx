import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useDailyLog } from '@/store/useStore';
import { dateKey, dayStart } from '@/lib/dailyPlan';

/**
 * 儿童化 30 天日历：圆点网格
 * 最近 30 天，每天一个圆点
 * 颜色 4 级（0分钟灰色小点, 1-9分钟浅黄, 10-19分钟黄色, 20+分钟橙色大点）
 * 今天高亮脉冲
 */

const DAY_MS = 86400000;

/** 根据学习时长返回圆点样式 */
function dotStyle(minutes: number): {
  size: string;
  bg: string;
  border: string;
} {
  if (minutes === 0) {
    return { size: 'h-2.5 w-2.5', bg: 'bg-gray-300', border: '' };
  }
  if (minutes < 10) {
    return { size: 'h-3 w-3', bg: 'bg-yellow-200', border: 'border border-yellow-300' };
  }
  if (minutes < 20) {
    return { size: 'h-3.5 w-3.5', bg: 'bg-yellow-400', border: 'border border-yellow-500' };
  }
  return { size: 'h-4 w-4', bg: 'bg-orange-400', border: 'border border-orange-500' };
}

/** 获取某日期的星期几（中文） */
function weekdayLabel(d: Date): string {
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]!;
}

export default function KidsCalendar() {
  const dailyLog = useDailyLog();
  const [hovered, setHovered] = useState<{ date: string; minutes: number } | null>(null);

  const today = dateKey();
  const todayStart = dayStart();

  // 生成最近 30 天的数据
  const days = useMemo(() => {
    const arr: { date: string; minutes: number; isToday: boolean; weekday: string }[] = [];
    for (let i = 29; i >= 0; i--) {
      const time = todayStart - i * DAY_MS;
      const d = new Date(time);
      const dKey = dateKey(time);
      const log = dailyLog[dKey];
      const minutes = log?.minutes ?? (log?.sec ? Math.floor(log.sec / 60) : 0);
      arr.push({
        date: dKey,
        minutes,
        isToday: dKey === today,
        weekday: weekdayLabel(d),
      });
    }
    return arr;
  }, [dailyLog, today, todayStart]);

  // 统计
  const activeDays = days.filter((d) => d.minutes > 0).length;
  const totalMinutes = days.reduce((s, d) => s + d.minutes, 0);

  return (
    <div className="rounded-[2rem] border-4 border-white bg-gradient-to-br from-candy-blue-soft to-candy-green-soft p-5 shadow-pop sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📅</span>
          <h2 className="text-lg font-extrabold text-candy-blue-deep">最近 30 天</h2>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-ink-soft">
          <span>📊 {activeDays} 天学习</span>
          <span>⏱️ {totalMinutes} 分钟</span>
        </div>
      </div>

      {/* 圆点网格 */}
      <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
        {days.map((day, i) => {
          const style = dotStyle(day.minutes);
          return (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.015, duration: 0.2 }}
              className="flex flex-col items-center gap-0.5"
              onMouseEnter={() => setHovered({ date: day.date, minutes: day.minutes })}
              onMouseLeave={() => setHovered(null)}
            >
              <motion.div
                className={`rounded-full ${style.size} ${style.bg} ${style.border} ${
                  day.isToday ? 'ring-2 ring-candy-pink-main ring-offset-1' : ''
                }`}
                animate={
                  day.isToday
                    ? { scale: [1, 1.3, 1] }
                    : {}
                }
                transition={{
                  repeat: day.isToday ? Infinity : 0,
                  duration: 1.5,
                  ease: 'easeInOut',
                }}
              />
              <span className="text-[8px] font-bold text-ink-soft/50">{day.weekday}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Tooltip / 详情 */}
      <div className="mt-3 flex min-h-[28px] items-center justify-center">
        {hovered ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-bold text-ink-soft"
          >
            {hovered.date === today ? '今天' : hovered.date.slice(5)} ·{' '}
            {hovered.minutes > 0 ? `学习了 ${hovered.minutes} 分钟` : '没有学习'}
          </motion.p>
        ) : (
          <p className="text-xs font-bold text-ink-soft/50">鼠标移到圆点上看详情</p>
        )}
      </div>

      {/* 图例 */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold text-ink-soft/60">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" /> 未学习
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-yellow-200 border border-yellow-300" /> 1-9 分钟
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3.5 w-3.5 rounded-full bg-yellow-400 border border-yellow-500" /> 10-19 分钟
        </span>
        <span className="flex items-center gap-1">
          <span className="h-4 w-4 rounded-full bg-orange-400 border border-orange-500" /> 20+ 分钟
        </span>
      </div>
    </div>
  );
}
