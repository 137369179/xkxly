import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useStore } from '@/store/useStore';
import { celebrateBig } from '@/lib/celebrate';

/** 词语探险里程碑：与掌握度记录（progress.mastery 中以 `word:` 为前缀的键）共用同一累计口径，
 *  代表孩子“记住了多少个英语单词”，随练习自然增长。 */
export interface Milestone {
  at: number;
  emoji: string;
  title: string;
  desc: string;
}

export const WORD_MILESTONES: Milestone[] = [
  { at: 5, emoji: '🌟', title: '单词小芽', desc: '你开始积累英语单词啦' },
  {
    at: 20,
    emoji: '🔤',
    title: '单词小能手',
    desc: '20 个单词被你记住了',
  },
  { at: 50, emoji: '📖', title: '单词小学士', desc: '你的词汇宝库越来越丰富' },
  { at: 100, emoji: '🏅', title: '单词小博士', desc: '英语王国的闪亮小明星' },
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

/** 纯函数：根据累计记住单词数推导探险进度（便于单测，无副作用） */
export function getWordQuest(learned: number): QuestState {
  const safe = Math.max(0, Math.floor(learned));
  let idx = -1;
  for (let i = 0; i < WORD_MILESTONES.length; i++) {
    const m = WORD_MILESTONES[i];
    if (m && safe >= m.at) idx = i;
  }
  const current: Milestone | null =
    idx >= 0 ? WORD_MILESTONES[idx] ?? null : null;
  const next: Milestone | null =
    idx + 1 < WORD_MILESTONES.length ? WORD_MILESTONES[idx + 1] ?? null : null;
  const reachedCount = idx + 1;

  let progressPct: number;
  if (next) {
    const prev = idx > 0 ? WORD_MILESTONES[idx - 1] : undefined;
    const prevAt = prev ? prev.at : 0;
    const span = Math.max(1, next.at - prevAt);
    progressPct = Math.min(100, Math.round(((safe - prevAt) / span) * 100));
  } else {
    progressPct = 100;
  }
  return { current, next, progressPct, reachedCount };
}

/** 词语专属「探险解锁」成就层：把 progress.mastery 中 `word:` 前缀的掌握项数可视化为渐进式解锁地图，
 *  每跨过一个里程碑即触发庆祝，给孩子清晰的成长目标感（需求#1 奖励解锁 / #5 成就系统）。 */
export function WordStarQuest() {
  const learned = useStore((s) =>
    Object.keys(s.progress.mastery).filter((k) => k.startsWith('word:')).length,
  );
  const quest = getWordQuest(learned);

  const [banner, setBanner] = useState<Milestone | null>(null);
  // 挂载时把已抵达里程碑数记为基准，避免首次渲染重复庆祝历史成就
  const seenRef = useRef(quest.reachedCount);

  useEffect(() => {
    if (quest.reachedCount <= seenRef.current) {
      seenRef.current = quest.reachedCount;
      return;
    }
    const justUnlocked = WORD_MILESTONES[quest.reachedCount - 1] ?? null;
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
    ? `再记住 ${quest.next.at - learned} 个单词，解锁 ${quest.next.emoji} ${quest.next.title}`
    : '全部成就已点亮，你是真正的单词小博士！';

  return (
    <section
      aria-label={`词语探险进度：已记住 ${learned} 个单词`}
      className="mt-5 rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl" aria-hidden="true">
          🌈
        </span>
        <h3 className="text-lg font-extrabold text-emerald-700">词语探险地图</h3>
        <span className="ml-auto rounded-full bg-emerald-200 px-3 py-1 text-sm font-bold text-emerald-800">
          已记住 {learned} 词
        </span>
      </div>

      {/* 里程碑节点（装饰性，文案已在下方文本与 aria-label 中提供） */}
      <div
        className="mb-3 flex items-center justify-between gap-1"
        aria-hidden="true"
      >
        {WORD_MILESTONES.map((m) => {
          const reached = learned >= m.at;
          return (
            <div key={m.at} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={
                  'grid h-11 w-11 place-items-center rounded-full text-xl transition ' +
                  (reached
                    ? 'bg-emerald-400 shadow-md ring-2 ring-emerald-300'
                    : 'bg-white text-gray-300 ring-2 ring-gray-200')
                }
                title={`${m.title}（${m.at} 词）`}
              >
                {reached ? m.emoji : '🔒'}
              </div>
              <span
                className={
                  'text-xs font-semibold ' +
                  (reached ? 'text-emerald-700' : 'text-gray-400')
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
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-400"
          initial={false}
          animate={{ width: `${quest.progressPct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        />
      </div>
      <p className="mt-2 text-center text-sm font-bold text-emerald-700">
        {nextHint}
      </p>

      {/* 解锁庆祝横幅 */}
      {banner && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-white shadow-lg"
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
