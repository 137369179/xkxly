/**
 * 每日学习目标卡
 * 每天3个小目标，完成打勾+动画+星星
 */

import { useState, useMemo, useEffect } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { useProgress, useStore } from '@/store/useStore';
import { dateKey } from '@/lib/dailyPlan';
import { sfxStar } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { motion } from 'motion/react';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

interface DailyGoal {
  id: string;
  emoji: string;
  label: string;
  target: number;
  current: (p: ReturnType<typeof useProgress>) => number;
  reward: number;
}

const GOAL_POOL: DailyGoal[] = [
  { id: 'practice', emoji: '✏️', label: '完成 10 道练习题', target: 10, current: p => p.dailyLog[dateKey()]?.items ?? 0, reward: 2 },
  { id: 'new-hanzi', emoji: '🀄', label: '学习 3 个新汉字', target: 3, current: p => Object.keys(p.mastery).filter(k => k.startsWith('hanzi:') && p.mastery[k]!.lv >= 1).length % 100, reward: 2 },
  { id: 'read-poem', emoji: '🌸', label: '朗读 1 首古诗', target: 1, current: p => p.poemsRead.filter(() => { const entry = p.dailyLog[dateKey()]; return entry; }).length > 0 ? 1 : 0, reward: 2 },
  { id: 'math', emoji: '🔢', label: '答对 5 道数学题', target: 5, current: p => p.mathCorrect % 100, reward: 2 },
  { id: 'stars', emoji: '⭐', label: '获得 5 颗星星', target: 5, current: p => p.dailyLog[dateKey()]?.stars ?? 0, reward: 3 },
  { id: 'time', emoji: '⏰', label: '学习 15 分钟', target: 15, current: p => Math.floor((p.dailyLog[dateKey()]?.sec ?? 0) / 60), reward: 2 },
  { id: 'pinyin', emoji: '📋', label: '练习 5 个拼音', target: 5, current: p => Object.keys(p.mastery).filter(k => k.startsWith('pinyin:') && p.mastery[k]!.lv >= 1).length % 63, reward: 2 },
  { id: 'word', emoji: '🔤', label: '学 3 个英语单词', target: 3, current: p => Object.keys(p.mastery).filter(k => k.startsWith('word:') && p.mastery[k]!.lv >= 1).length % 74, reward: 2 },
];

function pickGoals(dateStr: string): DailyGoal[] {
  const seed = dateStr.split('-').join('').split('').reduce((a, b) => a + parseInt(b), 0);
  const shuffled = [...GOAL_POOL].sort((a, b) => {
    const ha = (a.id.charCodeAt(0) + seed) % 7;
    const hb = (b.id.charCodeAt(0) + seed) % 7;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

export function DailyGoal() {
  const progress = useProgress();
  const addStars = useStore(s => s.addStars);
  const today = dateKey();
  const goals = useMemo(() => pickGoals(today), [today]);
  const [claimed, setClaimed] = useState<Set<string>>(() => {
    const saved = safeGetItem(`goals-${dateKey()}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    safeSetItem(`goals-${dateKey()}`, JSON.stringify([...claimed]));
  }, [claimed]);

  const allDone = goals.every(g => {
    const cur = g.current(progress);
    return cur >= g.target || claimed.has(g.id);
  });

  const handleClaim = (goal: DailyGoal) => {
    if (claimed.has(goal.id)) return;
    const cur = goal.current(progress);
    if (cur < goal.target) return;
    sfxStar();
    celebrateSmall();
    addStars(goal.reward);
    setClaimed(prev => new Set([...prev, goal.id]));
  };

  return (
    <Panel>
      <PanelTitle emoji="🎯" title="今日小目标" subtitle="完成可领星星" tone="orange" />
      <div className="space-y-2">
        {goals.map(g => {
          const cur = g.current(progress);
          const done = cur >= g.target;
          const claimedG = claimed.has(g.id);
          return (
            <div
              key={g.id}
              className={`flex items-center gap-3 rounded-2xl border-4 p-3 transition-all ${
                claimedG
                  ? 'border-candy-green-soft bg-candy-green-soft'
                  : done
                  ? 'border-candy-orange-soft bg-candy-orange-soft'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <button
                onClick={() => claimedG ? null : handleClaim(g)}
                disabled={!done || claimedG}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-black transition-all ${
                  claimedG
                    ? 'bg-candy-green-deep text-white'
                    : done
                    ? 'bg-candy-orange-deep text-white animate-pulse'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {claimedG ? '✓' : done ? '🎉' : '○'}
              </button>
              <span className="text-xl">{g.emoji}</span>
              <div className="flex-1">
                <div className={`text-sm font-extrabold ${claimedG ? 'text-ink-soft line-through' : 'text-ink'}`}>
                  {g.label}
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
                  <motion.div
                    className={`h-full rounded-full ${claimedG ? 'bg-candy-green-deep' : 'bg-candy-orange-deep'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (cur / g.target) * 100)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-ink-soft">{Math.min(cur, g.target)}/{g.target}</div>
                <div className="text-xs font-extrabold text-candy-orange-deep">+{g.reward}⭐</div>
              </div>
            </div>
          );
        })}
      </div>
      {allDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 rounded-2xl bg-gradient-to-r from-candy-orange-soft to-candy-pink-soft p-3 text-center"
        >
          <p className="text-base font-black text-ink">🏆 今日全部目标完成！宝贝太棒了！</p>
        </motion.div>
      )}
    </Panel>
  );
}
