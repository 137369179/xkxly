/**
 * 错题本面板（错字本 · SRS 闭环 UI）
 * ------------------------------------------------------------
 * 把 wrongCluster（因果聚类）+ srs.dueSkills（到期复习）收敛为儿童友好的复习入口。
 * 渐进难度（任务 #2）：今天该复习的标 🔔 优先，其余「先放一放」，避免一次性轰炸。
 * 即时反馈（#3）：消灭错题即正向成长，错题本清空给大鼓励。
 * 无障碍：列表用 <button>，min-height 44px 触控友好，aria-label 含聚类与数量。
 */
import { useMemo } from 'react';
import type { Progress } from '@/types';
import { clusterWrongBook } from '@/lib/wrongCluster';
import { dueSkills, skillLabel } from '@/lib/srs';

interface Props {
  progress: Progress;
  /** 点击某个聚类首题时触发复习 */
  onReview: (skill: string) => void;
}

export function MistakeBookPanel({ progress, onReview }: Props) {
  const clusters = useMemo(() => clusterWrongBook(progress), [progress]);
  const due = useMemo(() => new Set(dueSkills(progress, Date.now(), 999)), [progress]);

  if (clusters.length === 0) {
    return (
      <section aria-label="错题本" className="rounded-2xl bg-[#e7fbe9] p-4 text-center font-bold text-[#1f8a3b]">
        <h3 className="mb-2 text-lg font-extrabold text-[#ff5c8a]">📕 我的错题本</h3>
        🎉 错题本空空如也，你真棒！
      </section>
    );
  }

  return (
    <section aria-label="错题本" className="rounded-2xl bg-white/80 p-4 shadow-sm">
      <h3 className="mb-2 text-lg font-extrabold text-[#ff5c8a]">📕 我的错题本</h3>
      <ul className="grid gap-2">
        {clusters.map((c) => {
          const first = c.skills[0] ?? c.key;
          const isDue = due.has(c.key);
          return (
            <li key={c.key}>
              <button
                type="button"
                onClick={() => onReview(first)}
                aria-label={`复习${c.label}，共${c.count}个${isDue ? '，今天该复习' : ''}`}
                className="flex min-h-[44px] w-full items-center justify-between rounded-xl bg-[#fff3e0] px-4 py-2 font-bold text-[#a85b00] hover:bg-[#ffe6c2]"
              >
                <span>
                  {c.label}
                  <span className="ml-2 text-sm font-normal text-[#b07a3a]">
                    {skillLabel(first)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm">{c.count} 个</span>
                  {isDue && <span aria-hidden>🔔</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
