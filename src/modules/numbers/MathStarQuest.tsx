import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/store/useStore';
import { celebrateBig } from '@/lib/celebrate';

/** 数学探险里程碑：与成就徽章 math-20 / math-100 共用同一持久化计数（progress.mathCorrect） */
export interface MathMilestone {
  at: number;
  emoji: string;
  title: string;
  desc: string;
}

export const MATH_MILESTONES: MathMilestone[] = [
  { at: 5, emoji: '🌱', title: '数感萌芽', desc: '你开始感受数字的奇妙啦' },
  {
    at: 20,
    emoji: '🔢',
    title: '计算小能手',
    desc: '20 道数学题全对，真了不起',
  },
  { at: 50, emoji: '🧩', title: '逻辑小博士', desc: '你的小脑瓜越来越灵光' },
  { at: 100, emoji: '🏅', title: '数学小院士', desc: '数学王国的闪亮明星' },
];

export interface MathQuestState {
  /** 已抵达的最高里程碑（未抵达任何时为 null） */
  current: MathMilestone | null;
  /** 下一个待解锁里程碑（已全部解锁时为 null） */
  next: MathMilestone | null;
  /** 当前区间进度百分比 0–100 */
  progressPct: number;
  /** 已抵达里程碑数量 */
  reachedCount: number;
}

/** 纯函数：根据累计答对题数推导探险进度（便于单测，无副作用） */
export function getMathQuest(mathCorrect: number): MathQuestState {
  const safe = Math.max(0, Math.floor(mathCorrect));
  let idx = -1;
  for (let i = 0; i < MATH_MILESTONES.length; i++) {
    const m = MATH_MILESTONES[i];
    if (m && safe >= m.at) idx = i;
  }
  const current: MathMilestone | null =
    idx >= 0 ? MATH_MILESTONES[idx] ?? null : null;
  const next: MathMilestone | null =
    idx + 1 < MATH_MILESTONES.length ? MATH_MILESTONES[idx + 1] ?? null : null;
  const reachedCount = idx + 1;

  let progressPct: number;
  if (next) {
    // 当前区间起点：首个里程碑从 0 起，其余取上一里程碑的 at
    const prev = idx > 0 ? MATH_MILESTONES[idx - 1] : undefined;
    const prevAt = prev ? prev.at : 0;
    const span = Math.max(1, next.at - prevAt);
    progressPct = Math.min(100, Math.round(((safe - prevAt) / span) * 100));
  } else {
    progressPct = 100;
  }
  return { current, next, progressPct, reachedCount };
}

/** 数学专属「探险解锁」成就层：把 progress.mathCorrect 可视化为渐进式解锁地图，
 *  每跨过一个里程碑即触发庆祝，给孩子清晰的成长目标感（需求#1 奖励解锁 / #5 成就系统）。 */
export function MathStarQuest() {
  const mathCorrect = useStore((s) => s.progress.mathCorrect);
  const quest = getMathQuest(mathCorrect);

  const [banner, setBanner] = useState<MathMilestone | null>(null);
  // 挂载时把已抵达里程碑数记为基准，避免首次渲染重复庆祝历史成就
  const seenRef = useRef(quest.reachedCount);

  useEffect(() => {
    if (quest.reachedCount <= seenRef.current) {
      seenRef.current = quest.reachedCount;
      return;
    }
    const justUnlocked = MATH_MILESTONES[quest.reachedCount - 1] ?? null;
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
    ? `再答对 ${quest.next.at - mathCorrect} 题，解锁 ${quest.next.emoji} ${quest.next.title}`
    : '全部成就已点亮，你是真正的数学小院士！';

  return (
    <section
      aria-label={`数学探险进度：已答对 ${mathCorrect} 道数学题`}
      className="mt-5 rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">
          🚀
        </span>
        <h3 className="text-lg font-extrabold text-amber-700">数学探险地图</h3>
        <span className="ml-auto rounded-full bg-amber-200 px-3 py-1 text-sm font-bold text-amber-800">
          已答对 {mathCorrect} 题
        </span>
      </div>

      {/* 里程碑节点（装饰性，文案已在下方文本与 aria-label 中提供） */}
      <div
        className="mb-3 flex items-center justify-between gap-1"
        aria-hidden="true"
      >
        {MATH_MILESTONES.map((m) => {
          const reached = mathCorrect >= m.at;
          return (
            <div key={m.at} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={
                  'grid h-11 w-11 place-items-center rounded-full text-xl transition ' +
                  (reached
                    ? 'bg-amber-400 shadow-md ring-2 ring-amber-300'
                    : 'bg-white text-gray-300 ring-2 ring-gray-200')
                }
                title={`${m.title}（${m.at} 题）`}
              >
                {reached ? m.emoji : '🔒'}
              </div>
              <span
                className={
                  'text-xs font-semibold ' +
                  (reached ? 'text-amber-700' : 'text-gray-400')
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
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
          initial={false}
          animate={{ width: `${quest.progressPct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        />
      </div>
      <p className="mt-2 text-center text-sm font-bold text-amber-700">
        {nextHint}
      </p>

      {/* 解锁庆祝横幅 */}
      {banner && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-white shadow-lg"
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
