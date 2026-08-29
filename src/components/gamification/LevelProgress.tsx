/**
 * 掌握进度条（渐进难度可视化 · 任务 #2/#5）
 * ------------------------------------------------------------
 * 把 srs.masteryRate / masteredCount / touchedCount 收敛为友好的「成长进度」。
 * 渐进难度（#2）：展示「已学会 / 熟练 / 掌握度 %」，让孩子看见清晰的成长曲线。
 * 无障碍：role=progressbar + 完整 aria-valuenow/min/max。
 */
import type { Progress } from '@/types';
import { masteryRate, masteredCount, touchedCount } from '@/lib/srs';

interface Props {
  progress: Progress;
}

export function LevelProgress({ progress }: Props) {
  const rate = Math.round(masteryRate(progress) * 100);
  const mastered = masteredCount(progress);
  const touched = touchedCount(progress);

  return (
    <section aria-label="掌握进度" className="rounded-2xl bg-white/80 p-4 shadow-sm">
      <h3 className="mb-2 text-lg font-extrabold text-[#3fc26b]">📈 我的学习进度</h3>
      <div
        role="progressbar"
        aria-valuenow={rate}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`整体掌握度 ${rate}%`}
        className="h-4 w-full overflow-hidden rounded-full bg-[#e6f5ec]"
      >
        <div
          className="h-full rounded-full bg-[#62CC8A] transition-[width]"
          style={{ width: `${rate}%` }}
        />
      </div>
      <p className="mt-2 font-bold text-[#2c7a47]">
        已接触 {touched} 个知识点 · 熟练 {mastered} 个 · 掌握度 {rate}%
      </p>
    </section>
  );
}
