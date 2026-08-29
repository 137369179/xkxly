/**
 * 每日学习目标卡
 * 每天3个小目标，完成打勾+动画+星星
 */

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import type { Progress } from '@/types';
import { dateKey } from '@/lib/dailyPlan';
import { sfxStar } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import { motion } from 'motion/react';
import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

/**
 * 单个每日目标的定义。
 * 命名为 DailyGoalItem 而非 DailyGoal：本文件同时导出同名组件 `DailyGoal`，
 * 若类型也叫 DailyGoal 会与组件在导出空间重名（TS2323）。
 */
export interface DailyGoalItem {
  id: string;
  emoji: string;
  labelKey: string;
  target: number;
  current: (p: Progress) => number;
  reward: number;
}

// 导出供首页 Hero 复用同一套目标定义与选取算法，保证两处进度口径完全一致
// （避免首页另算一套导致「首页显示 1/3、目标卡显示 2/3」的不一致）。
export const GOAL_POOL: DailyGoalItem[] = [
  { id: 'practice', emoji: '✏️', labelKey: 'dailyGoal.practice', target: 10, current: p => p.dailyLog[dateKey()]?.items ?? 0, reward: 2 },
  { id: 'new-hanzi', emoji: '🀄', labelKey: 'dailyGoal.newHanzi', target: 3, current: p => Object.keys(p.mastery).filter(k => k.startsWith('hanzi:') && (p.mastery[k]?.lv ?? 0) >= 1 && p.mastery[k]?.firstSeen === dateKey()).length, reward: 2 },
  { id: 'read-poem', emoji: '🌸', labelKey: 'dailyGoal.readPoem', target: 1, current: p => p.poemsRead.filter(() => { const entry = p.dailyLog[dateKey()]; return entry; }).length > 0 ? 1 : 0, reward: 2 },
  { id: 'math', emoji: '🔢', labelKey: 'dailyGoal.math', target: 5, current: p => { const t = p.dailyLog[dateKey()]; const start = t?.startMathCorrect ?? p.mathCorrect; return Math.max(0, p.mathCorrect - start); }, reward: 2 },
  { id: 'stars', emoji: '⭐', labelKey: 'dailyGoal.stars', target: 5, current: p => p.dailyLog[dateKey()]?.stars ?? 0, reward: 3 },
  { id: 'time', emoji: '⏰', labelKey: 'dailyGoal.time', target: 15, current: p => Math.floor((p.dailyLog[dateKey()]?.sec ?? 0) / 60), reward: 2 },
  { id: 'pinyin', emoji: '📋', labelKey: 'dailyGoal.pinyin', target: 5, current: p => Object.keys(p.mastery).filter(k => k.startsWith('pinyin:') && (p.mastery[k]?.lv ?? 0) >= 1 && p.mastery[k]?.firstSeen === dateKey()).length, reward: 2 },
  { id: 'word', emoji: '🔤', labelKey: 'dailyGoal.word', target: 3, current: p => Object.keys(p.mastery).filter(k => k.startsWith('word:') && (p.mastery[k]?.lv ?? 0) >= 1 && p.mastery[k]?.firstSeen === dateKey()).length, reward: 2 },
];

export function pickGoals(dateStr: string): DailyGoalItem[] {
  const seed = dateStr.split('-').join('').split('').reduce((a, b) => a + parseInt(b), 0);
  const shuffled = [...GOAL_POOL].sort((a, b) => {
    const ha = (a.id.charCodeAt(0) + seed) % 7;
    const hb = (b.id.charCodeAt(0) + seed) % 7;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

export function DailyGoal() {
  const { t } = useTranslation();
  // 各目标 current() 仅读取 dailyLog / mastery / poemsRead / mathCorrect
  const progress = useStore(
    useShallow(
      (s) =>
        ({
          dailyLog: s.progress.dailyLog,
          mastery: s.progress.mastery,
          poemsRead: s.progress.poemsRead,
          mathCorrect: s.progress.mathCorrect,
        }) as Progress,
    ),
  );
  const addStars = useStore(s => s.addStars);
  const today = dateKey();
  const goals = useMemo(() => pickGoals(today), [today]);
  const [claimed, setClaimed] = useState<Set<string>>(() => {
    const saved = safeGetItem(`goals-${dateKey()}`);
    if (!saved) return new Set();
    try {
      const arr = JSON.parse(saved);
      return Array.isArray(arr) ? new Set(arr) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    safeSetItem(`goals-${dateKey()}`, JSON.stringify([...claimed]));
  }, [claimed]);

  const allDone = goals.every(g => {
    const cur = g.current(progress);
    return cur >= g.target || claimed.has(g.id);
  });

  const handleClaim = (goal: DailyGoalItem) => {
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
      <PanelTitle emoji="🎯" title={t('dailyGoal.title')} subtitle={t('dailyGoal.subtitle')} tone="orange" />
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
                  {t(g.labelKey)}
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
          <p className="text-base font-black text-ink">{t('dailyGoal.allDone')}</p>
        </motion.div>
      )}
    </Panel>
  );
}
