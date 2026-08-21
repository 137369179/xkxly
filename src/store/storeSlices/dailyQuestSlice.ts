import { dailyQuestTask } from '@/lib/ai/tasks';
import { weakSkills as collectWeak } from '@/lib/srs';
import type { DailyQuest } from '@/types';
import { applyProgress as _applyProgress, bumpLog as _bumpLog } from '../storeHelpers';
import { todayStr, type SliceCreator } from '../storeShared';
import type { StoreState } from '../useStore';

export const createDailyQuestSlice: SliceCreator<
  Pick<
    StoreState,
    | 'generateDailyQuests'
    | 'checkQuestCompletion'
    | 'claimQuestReward'
  >
> = (set, get) => ({
  generateDailyQuests: () => {
    const today = todayStr();
    const existing = get().progress.dailyQuests?.[today];
    if (existing && existing.length > 0) return;

    const p = get().progress;
    const streak = p.streak;
    const itemsToday = p.dailyLog?.[today]?.items ?? 0;
    // 薄弱点摘要：让 AI 按孩子真正的薄弱科目生成今日任务（非固定模板）
    const weak = collectWeak(p, 5)
      .map((w) => w.skill)
      .join(',');

    // 异步接线（P0-2）：先发 AI 生成个性化每日任务，失败/无结果则本次不写入（下次进入再试）
    void dailyQuestTask(streak, weak, itemsToday).then((res) => {
      if (!res.ok || !res.data?.quests?.length) return;
      const st = todayStr();
      if (get().progress.dailyQuests?.[st]?.length) return; // 期间已生成则跳过
      const quests: DailyQuest[] = res.data.quests.map((q) => ({
        ...q,
        currentCount: 0,
        completed: false,
      }));
      set((s) =>
        _applyProgress(s, (pp) => ({
          ...pp,
          dailyQuests: { ...(pp.dailyQuests ?? {}), [st]: quests },
        })),
      );
    });
  },

  checkQuestCompletion: () => {
    const today = todayStr();
    const quests = get().progress.dailyQuests?.[today];
    if (!quests) return;

    const p = get().progress;
    const todayLog = p.dailyLog[today];
    const itemsToday = todayLog?.items ?? 0;

    let changed = false;
    const updated = quests.map((q) => {
      if (q.completed) return q;
      let current = q.currentCount;
      if (q.type === 'math') current = Math.min(itemsToday, q.targetCount);
      else if (q.type === 'poem') current = Math.min(p.poemsRead.length, q.targetCount);
      else if (q.type === 'logic') current = Math.min(p.logicTotal, q.targetCount);
      else if (q.type === 'hanzi') current = Math.min(p.traced.length, q.targetCount);
      else if (q.type === 'word') current = Math.min(p.lettersHeard.length, q.targetCount);

      const isDone = current >= q.targetCount;
      if (isDone && !q.completed) {
        changed = true;
        return { ...q, currentCount: current, completed: true, completedAt: Date.now() };
      }
      if (current !== q.currentCount) {
        changed = true;
        return { ...q, currentCount: current };
      }
      return q;
    });

    if (changed) {
      set((s) =>
        _applyProgress(s, (pp) => ({
          ...pp,
          dailyQuests: { ...(pp.dailyQuests ?? {}), [today]: updated },
        })),
      );
    }
  },

  claimQuestReward: (questId) => {
    const today = todayStr();
    const quests = get().progress.dailyQuests?.[today];
    if (!quests) return;

    const quest = quests.find((q) => q.id === questId);
    if (!quest || !quest.completed) return;

    // 检查是否已领过奖（防止重复领取）
    const claimedKey = `questClaimed_${questId}_${today}`;
    if ((get().progress.chatHistory?.[claimedKey] as number | undefined)) return;

    set((s) =>
      _applyProgress(s, (p) => ({
        ...p,
        stars: p.stars + quest.reward,
        dailyLog: _bumpLog(p, { items: 1, ok: 1, stars: quest.reward }),
        chatHistory: { ...(p.chatHistory ?? {}), [claimedKey]: 1 },
      })),
    );
  },
});
