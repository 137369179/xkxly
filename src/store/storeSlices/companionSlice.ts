import { applyProgress as _applyProgress } from '../storeHelpers';
import { todayStr, type SliceCreator } from '../storeShared';
import type { StoreState } from '../useStore';

export const createCompanionSlice: SliceCreator<
  Pick<StoreState, 'incrementAiChatCount' | 'markExplained'>
> = (set) => ({
  incrementAiChatCount: () =>
    set((s) =>
      _applyProgress(s, (p) => {
        const today = todayStr();
        const key = `chatCount_${today}`;
        const cur = (p.chatHistory?.[key] as number | undefined) ?? 0;
        return {
          ...p,
          chatHistory: { ...(p.chatHistory ?? {}), [key]: cur + 1 },
        };
      }),
    ),

  markExplained: (topicId) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const today = todayStr();
        const key = `explained_${today}`;
        const arr: string[] = (p.chatHistory?.[key] as string[] | undefined) ?? [];
        if (arr.includes(topicId)) return p;
        return {
          ...p,
          chatHistory: { ...(p.chatHistory ?? {}), [key]: [...arr, topicId] },
        };
      }),
    ),
});
