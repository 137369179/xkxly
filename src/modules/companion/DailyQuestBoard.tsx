/**
 * DailyQuestBoard —— 每日任务面板
 * ------------------------------------------------------------------
 * - 从 useStore 读 progress.dailyQuests[today]
 * - 如果没有任务，显示"生成今日任务"按钮 → generateDailyQuests()
 * - 展示 3 个任务卡片：emoji / label / 进度条 / 奖励
 * - 完成的任务显示"领取奖励"按钮 → claimQuestReward(id)
 * - 全部完成显示庆祝
 */
import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AiAvatar } from '@/components/ai/AiAvatar';
import { Panel, PanelTitle } from '@/components/ui/Card';
import { useStore } from '@/store/useStore';
import { dateKey } from '@/lib/dailyPlan';
import { TONE_STYLE, toneAt } from '@/lib/tones';
import { sfxTap, sfxStar, sfxCorrect, triggerHaptic } from '@/lib/sfx';
import { celebrateSmall } from '@/lib/celebrate';
import type { DailyQuest } from '@/types';
import { useTranslation } from '@/i18n/useTranslation';

function QuestCard({ quest, tone, onClaim }: {
  quest: DailyQuest;
  tone: ReturnType<typeof getToneStyle>;
  onClaim: (id: string) => void;
}) {
  const { t: tr } = useTranslation();
  const pct = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));
  const claimedKey = `questClaimed_${quest.id}_${dateKey()}`;
  const claimed = useStore((s) => !!(s.progress.chatHistory?.[claimedKey]));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border-2 p-4 transition ${
        quest.completed ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
      }`}
    >
      {/* 头部 */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{quest.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold text-ink">{quest.title}</p>
          <p className="text-xs font-bold text-ink-soft">
            {tr('quest.rewardStars', { count: quest.reward })}
          </p>
        </div>
        {quest.completed && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-2xl"
          >
            ✅
          </motion.span>
        )}
      </div>

      {/* 进度条 */}
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs font-bold">
          <span style={{ color: tone.deep }}>
            {quest.currentCount} / {quest.targetCount}
          </span>
          <span className="text-ink-soft">{pct}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: quest.completed
                ? 'linear-gradient(90deg, #5FD68B, #33A863)'
                : `linear-gradient(90deg, ${tone.main}, ${tone.deep})`,
            }}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      {quest.completed && !claimed && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => { triggerHaptic(45); onClaim(quest.id); }}
          className="min-h-[48px] w-full rounded-full text-base font-extrabold transition active:translate-y-[2px]"
          style={{
            background: '#FFC93C',
            color: '#5A4408',
            boxShadow: '0 4px 0 0 #e5ac2e',
          }}
        >
          🎁 {tr('quest.claimReward')}
        </motion.button>
      )}
      {quest.completed && claimed && (
        <div className="text-center text-sm font-extrabold text-green-600">
          ✨ {tr('quest.claimedReward', { count: quest.reward })}
        </div>
      )}
      {!quest.completed && (
        <a
          href={quest.route}
          onClick={() => triggerHaptic(20)}
          className="block min-h-[48px] w-full rounded-full border-2 text-center text-base font-extrabold leading-[44px] transition active:translate-y-[2px]"
          style={{ borderColor: `${tone.main}55`, color: tone.deep }}
        >
          {tr('quest.doTask')} →
        </a>
      )}
    </motion.div>
  );
}

// Helper to get tone style by index
function getToneStyle(i: number) {
  return TONE_STYLE[toneAt(i)];
}

export function DailyQuestBoard() {
  const { t: tr } = useTranslation();
  const progress = useStore((s) => s.progress);
  const generateDailyQuests = useStore((s) => s.generateDailyQuests);
  const claimQuestReward = useStore((s) => s.claimQuestReward);

  const today = dateKey();
  const quests = progress.dailyQuests?.[today] ?? [];
  const hasQuests = quests.length > 0;
  const allCompleted = hasQuests && quests.every((q) => q.completed);
  const allClaimed = hasQuests && quests.every((q) => {
    const claimedKey = `questClaimed_${q.id}_${today}`;
    return !!progress.chatHistory?.[claimedKey];
  });

  // 自动检查任务完成状态
  const checkQuestCompletion = useStore((s) => s.checkQuestCompletion);
  useEffect(() => {
    if (hasQuests) {
      checkQuestCompletion();
    }
  }, [hasQuests, progress.mathTotal, (progress.poemsRead ?? []).length, progress.logicTotal, (progress.traced ?? []).length, checkQuestCompletion]);

  const handleGenerate = useCallback(() => {
    sfxTap();
    triggerHaptic(30);
    generateDailyQuests();
  }, [generateDailyQuests]);

  const handleClaim = useCallback((questId: string) => {
    sfxStar();
    sfxCorrect();
    triggerHaptic(45);
    claimQuestReward(questId);
    // 小庆祝
    void celebrateSmall();
  }, [claimQuestReward]);

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (['1', '2', '3'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const q = quests[idx];
        if (q && q.completed) {
          const claimedKey = `questClaimed_${q.id}_${today}`;
          if (!progress.chatHistory?.[claimedKey]) {
            e.preventDefault();
            handleClaim(q.id);
          }
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (!hasQuests) {
          e.preventDefault();
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quests, hasQuests, today, progress.chatHistory, handleClaim, handleGenerate]);

  const tone = TONE_STYLE.green;

  return (
    <Panel>
      {/* 快捷操作提示条 */}
      <div className="mb-3 text-center">
        <span className="inline-block text-[11px] text-green-900 font-bold bg-green-50/90 px-3 py-1 rounded-xl border border-green-200">
          ⌨️ 键盘快捷操作：数字键 1-3 领取完成任务 · 空格 生成今日成长任务
        </span>
      </div>

      <PanelTitle
        emoji="📋"
        title={tr('quest.title')}
        subtitle={tr('quest.subtitle')}
        tone="green"
      />

      {/* 无任务状态 */}
      {!hasQuests && (
        <div className="flex flex-col items-center gap-4 py-8">
          <AiAvatar size={56} mood="idle" />
          <p className="text-base font-bold text-ink-soft text-center">
            {tr('quest.empty')}
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            className="min-h-[52px] min-w-[200px] rounded-full px-8 text-lg font-extrabold transition active:translate-y-[3px]"
            style={{
              background: tone.main,
              color: tone.on,
              boxShadow: `0 5px 0 0 ${tone.deep}`,
            }}
          >
            🚀 {tr('quest.generateTasks')}
          </button>
        </div>
      )}

      {/* 任务列表 */}
      {hasQuests && (
        <div className="space-y-3">
          <AnimatePresence>
            {quests.map((q, i) => (
              <QuestCard
                key={q.id}
                quest={q}
                tone={getToneStyle(i)}
                onClaim={handleClaim}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 全部完成庆祝 */}
      <AnimatePresence>
        {allCompleted && allClaimed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 rounded-2xl border-4 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 p-5 text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1 }}
              className="text-5xl mb-2"
            >
              🏆
            </motion.div>
            <p className="text-lg font-extrabold text-orange-600">
              {tr('quest.allComplete')}
            </p>
            <p className="text-sm font-bold text-orange-500 mt-1">
              {tr('quest.hero')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 进度概览 */}
      {hasQuests && !allClaimed && (
        <div className="mt-3 flex items-center justify-between text-xs font-bold text-ink-soft">
          <span>
            {tr('quest.progress', { done: quests.filter((q) => q.completed).length, total: quests.length })}
          </span>
          <span>
            {tr('quest.totalReward', { count: quests.reduce((s, q) => s + q.reward, 0) })}
          </span>
        </div>
      )}
    </Panel>
  );
}
