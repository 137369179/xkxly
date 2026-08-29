import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/store/useStore';
import { celebrateBig } from '@/lib/celebrate';

/** 汉字探险里程碑：与掌握度记录（progress.mastery 中以 `hanzi:` 为前缀的键）共用同一累计口径，
 *  代表孩子“认识了多少个汉字”，随练习自然增长。 */
export interface Milestone {
  at: number;
  emoji: string;
  title: string;
  desc: string;
}

export const HANZI_MILESTONES: Milestone[] = [
  { at: 5, emoji: '🌱', title: '识字小芽', desc: '你认识了最初的几个汉字，真棒！' },
  {
    at: 20,
    emoji: '✏️',
    title: '识字小能手',
    desc: '20 个汉字被你拿下啦',
  },
  { at: 50, emoji: '📚', title: '识字小学士', desc: '你的汉字宝库越来越丰富' },
  { at: 100, emoji: '🏅', title: '识字小博士', desc: '汉字王国的闪亮小明星' },
];

export interface QuestState {
  /** 已抵达的最高里程碑（未抵达任何时为 null） */
  current: Milestone | null;
  /** 下一个待解锁里程碑（已全部解锁时为 null） */
  next: Milestone | null;
  /** 当前区间进度百分比 0–100 */
  progressPct: number;
  /** 已抵达里程碑数量 */
  reachedCount: number;
}

/** 纯函数：根据累计认识汉字数推导探险进度（便于单测，无副作用） */
export function getHanziQuest(learned: number): QuestState {
  const safe = Math.max(0, Math.floor(learned));
  let idx = -1;
  for (let i = 0; i < HANZI_MILESTONES.length; i++) {
    const m = HANZI_MILESTONES[i];
    if (m && safe >= m.at) idx = i;
  }
  const current: Milestone | null =
    idx >= 0 ? HANZI_MILESTONES[idx] ?? null : null;
  const next: Milestone | null =
    idx + 1 < HANZI_MILESTONES.length ? HANZI_MILESTONES[idx + 1] ?? null : null;
  const reachedCount = idx + 1;

  let progressPct: number;
  if (next) {
    const prev = idx > 0 ? HANZI_MILESTONES[idx - 1] : undefined;
    const prevAt = prev ? prev.at : 0;
    const span = Math.max(1, next.at - prevAt);
    progressPct = Math.min(100, Math.round(((safe - prevAt) / span) * 100));
  } else {
    progressPct = 100;
  }
  return { current, next, progressPct, reachedCount };
}

/** 汉字专属「探险解锁」成就层：把 progress.mastery 中 `hanzi:` 前缀的掌握项数可视化为渐进式解锁地图，
 *  每跨过一个里程碑即触发庆祝，给孩子清晰的成长目标感（需求#1 奖励解锁 / #5 成就系统）。 */
export function HanziStarQuest() {
  const learned = useStore((s) =>
    Object.keys(s.progress.mastery).filter((k) => k.startsWith('hanzi:')).length,
  );
  const quest = getHanziQuest(learned);

  const [banner, setBanner] = useState<Milestone | null>(null);
  // 挂载时把已抵达里程碑数记为基准，避免首次渲染重复庆祝历史成就
  const seenRef = useRef(quest.reachedCount);

  useEffect(() => {
    if (quest.reachedCount <= seenRef.current) {
      seenRef.current = quest.reachedCount;
      return;
    }
    const justUnlocked = HANZI_MILESTONES[quest.reachedCount - 1] ?? null;
    if (!justUnlocked) {
      seenRef.current = quest.reachedCount;
      return;
    }
    setBanner(justUnlocked);
    void celebrateBig();
    seenRef.current = quest.reachedCount;
    const timer = setTimeout(() => setBanner(null), 3200);
    return () => clearTimeout(timer);
  }, [quest.reachedCount]);

  const nextHint = quest.next
    ? `再学会 ${quest.next.at - learned} 个汉字，解锁 ${quest.next.emoji} ${quest.next.title}`
    : '全部成就已点亮，你是真正的识字小博士！';

  return (
    <section
      aria-label={`汉字探险进度：已认识 ${learned} 个汉字`}
      className="mt-5 rounded-3xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">
          🐉
        </span>
        <h3 className="text-lg font-extrabold text-rose-700">汉字探险地图</h3>
        <span className="ml-auto rounded-full bg-rose-200 px-3 py-1 text-sm font-bold text-rose-800">
          已认识 {learned} 字
        </span>
      </div>

      {/* 里程碑节点（装饰性，文案已在下方文本与 aria-label 中提供） */}
      <div
        className="mb-3 flex items-center justify-between gap-1"
        aria-hidden="true"
      >
        {HANZI_MILESTONES.map((m) => {
          const reached = learned >= m.at;
          return (
            <div key={m.at} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={
                  'grid h-11 w-11 place-items-center rounded-full text-xl transition ' +
                  (reached
                    ? 'bg-rose-400 shadow-md ring-2 ring-rose-300'
                    : 'bg-white text-gray-300 ring-2 ring-gray-200')
                }
                title={`${m.title}（${m.at} 字）`}
              >
                {reached ? m.emoji : '🔒'}
              </div>
              <span
                className={
                  'text-xs font-semibold ' +
                  (reached ? 'text-rose-700' : 'text-gray-400')
                }
              >
                {m.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* 当前区间进度条（装饰性） */}
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-white"
        aria-hidden="true"
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-400"
          initial={false}
          animate={{ width: `${quest.progressPct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        />
      </div>
      <p className="mt-2 text-center text-sm font-bold text-rose-700">
        {nextHint}
      </p>

      {/* 解锁庆祝横幅 */}
      {banner && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-candy-pink-on shadow-lg"
        >
          <span className="text-2xl" aria-hidden="true">
            {banner.emoji}
          </span>
          <span className="text-base font-extrabold">解锁成就：{banner.title}！</span>
        </motion.div>
      )}
    </section>
  );
}
