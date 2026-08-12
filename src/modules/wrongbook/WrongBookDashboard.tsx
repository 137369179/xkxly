/**
 * 错题本仪表盘 · 主页面
 * ------------------------------------------------------------------
 * Tab 切换：概览（统计图表 + 消灭进度环）/ 训练（AdaptiveTrainer）/ 徽章（WrongBookBadgeList）
 * 顶部统计卡片：总错题数 / 已消灭 / 待复习 / 今日新增
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel } from '@/components/ui/Card';
import { CandyButton } from '@/components/ui/Button';
import { useProgress } from '@/store/useStore';
import { isDue } from '@/lib/srs';
import { sfxTap } from '@/lib/sfx';
import { navigate } from '@/lib/router';
import {
  WrongTrendChart,
  WeaknessRadar,
  KillProgressRing,
  WrongBookStatCards,
} from './WrongBookStats';
import { AdaptiveTrainer } from './AdaptiveTrainer';
import { WrongBookBadgeList } from './WrongBookBadgeList';

type TabId = 'overview' | 'train' | 'badges';

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'overview', label: '概览', emoji: '📊' },
  { id: 'train', label: '训练', emoji: '🧠' },
  { id: 'badges', label: '徽章', emoji: '🏅' },
];

export default function WrongBookDashboard() {
  const progress = useProgress();
  const [tab, setTab] = useState<TabId>('overview');

  // 到期错题提醒
  const dueWrongCount = useMemo(() => {
    return progress.wrongBook.filter((s) => {
      const m = progress.mastery[s];
      return m && isDue(m);
    }).length;
  }, [progress.wrongBook, progress.mastery]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-3">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <span className="text-3xl">📝</span>
        <h1 className="text-2xl font-black text-ink">错题本</h1>
      </div>

      {/* 顶部统计卡片 */}
      <WrongBookStatCards />

      {/* 到期提醒 */}
      {dueWrongCount > 0 && tab !== 'train' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-candy-orange-soft p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏰</span>
              <span className="text-sm font-extrabold text-candy-orange-deep">
                有 {dueWrongCount} 个错题到了最佳复习时间！
              </span>
            </div>
            <CandyButton
              tone="orange"
              size="sm"
              onClick={() => {
                sfxTap();
                setTab('train');
              }}
            >
              立即复习
            </CandyButton>
          </div>
        </motion.div>
      )}

      {/* Tab 切换 */}
      <div className="flex gap-1 rounded-2xl bg-white/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              sfxTap();
              setTab(t.id);
            }}
            className={`flex-1 rounded-xl py-2 text-sm font-extrabold transition ${
              tab === t.id
                ? 'bg-white shadow-sm text-ink'
                : 'text-ink-soft'
            }`}
          >
            <span className="mr-1">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'overview' && <OverviewTab />}
          {tab === 'train' && <AdaptiveTrainer />}
          {tab === 'badges' && <WrongBookBadgeList />}
        </motion.div>
      </AnimatePresence>

      {/* 空状态引导 */}
      {progress.wrongBook.length === 0 && tab !== 'badges' && (
        <Panel className="text-center">
          <div className="text-5xl">🎉</div>
          <h3 className="mt-2 text-lg font-extrabold text-ink">错题本空空如也！</h3>
          <p className="mt-1 text-sm font-bold text-ink-soft">
            去学习积攒一些错题，再来这里消灭它们吧！
          </p>
          <div className="mt-4">
            <CandyButton
              tone="purple"
              size="md"
              fullWidth
              onClick={() => {
                sfxTap();
                navigate('home');
              }}
            >
              🏠 回首页学习
            </CandyButton>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 概览 Tab                                                            */
/* ------------------------------------------------------------------ */
function OverviewTab() {
  return (
    <div className="space-y-4">
      <Panel className="space-y-4">
        <WrongTrendChart />
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <WeaknessRadar />
        </Panel>
        <Panel>
          <KillProgressRing />
        </Panel>
      </div>
    </div>
  );
}
