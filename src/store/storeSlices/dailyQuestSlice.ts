import { localDailyQuestPlan } from '@/lib/ai/tasks';
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

    const streak = get().progress.streak;
    const plan = localDailyQuestPlan(streak, 0);
    const quests: DailyQuest[] = plan.quests.map((q) => ({
      ...q,
      currentCount: 0,
      completed: false,
    }));
    set((s) =>
      _applyProgress(s, (p) => ({
        ...p,
        dailyQuests: { ...(p.dailyQuests ?? {}), [today]: quests },
      })),
    );
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
