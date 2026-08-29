/**
 * 成就墙（进度追踪 + 成就系统 · 任务 #5）
 * ------------------------------------------------------------
 * 把 milestone.achievedCount / milestoneCount（成长里程碑）与 progress.badges
 * （已解锁徽章）收敛为一个清晰的「成长目标感」面板。
 * 无障碍：用 <li> + aria-label，徽章网格对读屏友好。
 */
import { useMemo } from 'react';
import type { Progress } from '@/types';
import { achievedCount, milestoneCount } from '@/lib/milestone';

interface Props {
  progress: Progress;
}

export function AchievementWall({ progress }: Props) {
  const achieved = useMemo(() => achievedCount(progress), [progress]);
  const total = milestoneCount();
  const badges = progress.badges.slice(0, 24);

  return (
    <section aria-label="成就墙" className="rounded-2xl bg-white/80 p-4 shadow-sm">
      <h3 className="mb-2 text-lg font-extrabold text-[#8f5bff]">🏆 我的成就墙</h3>
      <p className="mb-3 font-bold text-[#5a4ba8]">
        已点亮 <span className="text-xl text-[#ff5c8a]">{achieved}</span> / {total} 个成长里程碑
      </p>
      {badges.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="已解锁徽章">
          {badges.map((b, i) => (
            <li
              key={`${b}-${i}`}
              aria-label={`已解锁徽章 ${b}`}
              className="rounded-full bg-[#f3eeff] px-3 py-1 text-sm font-bold text-[#5a4ba8]"
            >
              🏅 {b}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#ab81ff]">继续加油，第一个成就就在前方！</p>
      )}
    </section>
  );
}
