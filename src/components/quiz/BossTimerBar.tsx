/**
 * Boss 战倒计时进度条（从 QuizCard 拆分）
 * ------------------------------------------------------------
 * 纯展示组件：展示剩余时间比例。
 */
export function BossTimerBar({ remaining, total }: { remaining: number; total: number }) {
  return (
    <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-candy-pink-soft">
      <div
        className="h-full rounded-full bg-red-500 transition-[width] duration-100 ease-linear"
        style={{ width: `${(remaining / total) * 100}%` }}
      />
    </div>
  );
}
