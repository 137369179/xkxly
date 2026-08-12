import { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useProgress, useStore } from '@/store/useStore';
import { useProfilesStore } from '@/store/useProfilesStore';
import { dateKey } from '@/lib/dailyPlan';
import { getBestToday, getCombo, subscribeCombo } from '@/lib/combo';
import { cn } from '@/lib/utils';
import { navigate, type RouteId } from '@/lib/router';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safeStorage';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 每日挑战任务（规格七完整版：今日 4 任务卡）
 * 每天生成 4 个小任务（含「完成今日课程」必选），
 * 按年龄过滤候选池（低龄排除复杂逻辑/连击），完成后领星星。
 */

interface Challenge {
  id: string;
  label: string;
  emoji: string;
  target: number;
  check: (p: any) => number; // 返回当前进度
  reward: number;
  /** 点击未完成任务跳转的模块；无则不可跳 */
  route?: RouteId;
}

const CHALLENGES: Challenge[] = [
  {
    id: 'math-10',
    label: 'dailyChallenge.math10',
    emoji: '➕',
    target: 10,
    // 当日增量：今日数学总数 - 起始值（旧数据无起始值时兜底为 0 增量）
    check: (p) => {
      const start = p.dailyLog[dateKey()]?.startMathTotal ?? p.mathTotal ?? 0;
      return (p.mathTotal ?? 0) - start;
    },
    reward: 3,
    route: 'numbers',
  },
  {
    id: 'poem-2',
    label: 'dailyChallenge.poem2',
    emoji: '🌸',
    target: 2,
    check: (p) => p.poemsRead.length,
    reward: 2,
    route: 'poems',
  },
  {
    id: 'logic-5',
    label: 'dailyChallenge.logic5',
    emoji: '🧩',
    target: 5,
    // 当日增量：今日逻辑总数 - 起始值（旧数据无起始值时兜底为 0 增量）
    check: (p) => {
      const start = p.dailyLog[dateKey()]?.startLogicTotal ?? p.logicTotal ?? 0;
      return (p.logicTotal ?? 0) - start;
    },
    reward: 3,
    route: 'logic',
  },
  {
    id: 'count-5',
    label: 'dailyChallenge.count5',
    emoji: '🍎',
    target: 5,
    check: (p) => p.countCorrect ?? 0,
    reward: 2,
    route: 'numbers',
  },
  {
    id: 'hanzi-5',
    label: 'dailyChallenge.hanzi5',
    emoji: '🀄',
    target: 5,
    check: (p) => Object.keys(p.mastery).filter((k: string) => k.startsWith('hanzi:')).length,
    reward: 3,
    route: 'hanzi',
  },
  {
    id: 'pinyin-3',
    label: 'dailyChallenge.pinyin3',
    emoji: '📋',
    target: 3,
    check: (p) => Object.keys(p.mastery).filter((k: string) => k.startsWith('pinyin:')).length,
    reward: 2,
    route: 'pinyin',
  },
  {
    id: 'word-3',
    label: 'dailyChallenge.word3',
    emoji: '🌐',
    target: 3,
    check: (p) => Object.keys(p.mastery).filter((k: string) => k.startsWith('word:')).length,
    reward: 2,
    route: 'words',
  },
  {
    id: 'combo-5',
    label: 'dailyChallenge.combo5',
    emoji: '🔥',
    target: 5,
    // 使用全局连击系统的今日最高连击
    check: () => getBestToday(),
    reward: 3,
  },
  {
    id: 'lesson-1',
    label: 'dailyChallenge.lesson1',
    emoji: '📅',
    target: 1,
    check: (p) => (p.dailyLog[dateKey()]?.lesson ? 1 : 0),
    reward: 5,
    route: 'today',
  },
];

/** 低龄（3-6 岁）不出的偏难任务 */
const LOW_AGE_EXCLUDE = new Set(['logic-5', 'combo-5']);

// 基于日期生成稳定的 4 个任务（lesson-1 必选，其余按年龄过滤后抽 3）
function getDailyChallenges(ageRange?: string): Challenge[] {
  const today = dateKey();
  const seed = today.split('-').join('').split('').reduce((s, c) => s + parseInt(c), 0);
  const lowAge = ageRange === '3-4' || ageRange === '5-6';
  const pool = CHALLENGES.filter(
    (c) => c.id !== 'lesson-1' && !(lowAge && LOW_AGE_EXCLUDE.has(c.id)),
  );
  const shuffled = [...pool].sort((a, b) => {
    return ((a.id.charCodeAt(0) + seed) % 7) - ((b.id.charCodeAt(0) + seed + 3) % 7);
  });
  const lesson = CHALLENGES.find((c) => c.id === 'lesson-1')!;
  return [lesson, ...shuffled.slice(0, 3)];
}

export function DailyChallenge({ compact = false }: { compact?: boolean } = {}) {
  const { t: tr } = useTranslation();
  const progress = useProgress();
  const addStars = useStore((s) => s.addStars);
  const ageRange = useProfilesStore((s) => s.meta[s.activeProfileId]?.ageRange);
  // 订阅全局连击变化：连击任务依赖 bestToday，需在连击变化时触发重渲染
  useSyncExternalStore(subscribeCombo, getCombo, getCombo);
  const today = dateKey();
  const [claimed, setClaimed] = useState<string[]>(() => {
    const s = safeGetItem(`dc-claimed-${today}`);
    return s ? JSON.parse(s) : [];
  });

  const challenges = useMemo(() => getDailyChallenges(ageRange), [today, ageRange]);

  const challengeState = challenges.map(c => {
    const current = c.check(progress);
    const done = current >= c.target;
    const isClaimed = claimed.includes(c.id);
    return { ...c, current: Math.min(current, c.target), done, isClaimed };
  });

  const claim = (c: Challenge) => {
    if (claimed.includes(c.id)) return;
    const current = c.check(progress);
    if (current < c.target) return;
    addStars(c.reward);
    const next = [...claimed, c.id];
    setClaimed(next);
    safeSetItem(`dc-claimed-${today}`, JSON.stringify(next));
  };

  // 清理过期的 claimed：只清理今天之前注册的 key，避免遍历全量 localStorage
  useEffect(() => {
    const todayKey = `dc-claimed-${today}`;
    // 内存镜像里找今天的 key，然后清掉同前缀的其他 key
    const todayRaw = safeGetItem(todayKey);
    if (todayRaw) {
      // 清理策略：按日期扫描已知前缀（避免 O(n) 遍历）
      const prevDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i - 1);
        return `dc-claimed-${d.toISOString().slice(0, 10)}`;
      });
      prevDays.forEach(k => safeRemoveItem(k));
    }
  }, [today]);

  const allDone = challengeState.every(c => c.done);
  const claimedCount = challengeState.filter(c => c.isClaimed).length;
  const totalReward = challengeState.reduce((s, c) => s + c.reward, 0);
  const claimedReward = challengeState.filter(c => c.isClaimed).reduce((s, c) => s + c.reward, 0);

  // compact 模式：首页用，3 行概要
  if (compact) {
    return (
      <button
        onClick={() => navigate('today')}
        className="no-select w-full rounded-[1.6rem] border-4 border-white bg-gradient-to-br from-candy-orange-soft to-candy-yellow-soft p-4 text-left shadow-candy-sm transition active:scale-95"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <span className="text-base font-extrabold text-candy-orange-deep">{tr('dailyChallenge.title')}</span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold text-candy-orange-deep">
              {claimedCount}/{challenges.length}
            </span>
          </div>
          <span className="text-sm font-black text-candy-orange-deep">⭐{claimedReward}/{totalReward}</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {challengeState.map(c => (
            <div
              key={c.id}
              className={`flex-1 rounded-lg p-1.5 text-center transition ${
                c.isClaimed ? 'bg-candy-green-soft' : c.done ? 'bg-candy-yellow-soft' : 'bg-white/60'
              }`}
            >
              <div className="text-base">{c.emoji}</div>
              <div className="text-[10px] font-bold text-ink-soft">
                {c.isClaimed ? '✓' : `${c.current}/${c.target}`}
              </div>
            </div>
          ))}
        </div>
        {allDone && claimedCount === challengeState.length && (
          <div className="mt-2 text-center text-xs font-black text-candy-green-deep">
            🎉 {tr('dailyChallenge.allDone')}
          </div>
        )}
      </button>
    );
  }

  return (
    <Panel>
      <PanelTitle emoji="🎯" title={tr('dailyChallenge.title')} subtitle={tr('dailyChallenge.claimedN', { claimed: claimedCount, total: challenges.length })} tone="orange" />

      {allDone && claimedCount === challengeState.length && (
        <div className="mb-2 rounded-2xl bg-candy-green-soft p-3 text-center">
          <span className="text-2xl">🎉</span>
          <span className="ml-2 text-sm font-black text-candy-green-deep">{tr('dailyChallenge.allDone')}</span>
        </div>
      )}

      <div className="space-y-2">
        {challengeState.map(c => (
          <button
            key={c.id}
            type="button"
            disabled={c.isClaimed}
            onClick={() => {
              if (!c.done && !c.isClaimed && c.route) navigate(c.route);
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition',
              c.isClaimed ? 'bg-candy-green-soft opacity-70' : c.done ? 'bg-candy-yellow-soft' : 'bg-white/60',
              !c.isClaimed && !c.done && c.route && 'cursor-pointer hover:bg-white active:scale-[0.99]',
            )}
          >
            <span className="text-2xl">{c.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-ink">{tr(c.label)}</span>
                <span className="shrink-0 text-xs font-bold text-ink-soft">{c.current}/{c.target}</span>
              </div>
              <ProgressBar value={c.current} max={c.target} tone={c.done ? 'green' : 'blue'} height={6} />
            </div>
            <div className="shrink-0">
              {c.isClaimed ? (
                <span className="text-sm font-black text-candy-green-deep">✅</span>
              ) : c.done ? (
                <CandyButton tone="orange" size="sm" onClick={(e) => { e.stopPropagation(); claim(c); }}>
                  ⭐{c.reward}
                </CandyButton>
              ) : (
                <span className="text-xs font-bold text-ink-soft">{c.reward}⭐</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}
