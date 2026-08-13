import { applyProgress as _applyProgress } from '../storeHelpers';
import { type SliceCreator } from '../storeShared';
import type { StoreState } from '../useStore';

const emptyResearchStats = () => ({
  topicsExplored: [] as string[],
  exploreActions: 0,
  cardsRead: 0,
  sessionsCompleted: 0,
  exploreSeconds: 0,
});

export const createResearchSlice: SliceCreator<
  Pick<
    StoreState,
    | 'recordResearchAction'
    | 'discoverCard'
    | 'removeDiscovery'
    | 'setResearchNote'
    | 'removeResearchNote'
    | 'completeResearchSession'
  >
> = (set) => ({
  // —— 研究模式（CMML）——
  // 全部走 _applyProgress：progress 变更后统一跑 findNewBadges（F19 行为型徽章）
  recordResearchAction: (topicId, deltaSec = 0, opts) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const st = p.researchStats ?? emptyResearchStats();
        return {
          ...p,
          researchStats: {
            ...st,
            topicsExplored: st.topicsExplored.includes(topicId)
              ? st.topicsExplored
              : [...st.topicsExplored, topicId],
            exploreActions: st.exploreActions + 1,
            exploreSeconds: st.exploreSeconds + deltaSec,
            cardsRead: st.cardsRead + (opts?.readCard ? 1 : 0),
          },
        };
      }),
    ),
  discoverCard: (kvId) =>
    set((s) =>
      _applyProgress(s, (p) => ({
        ...p,
        discoveries: p.discoveries.includes(kvId) ? p.discoveries : [...p.discoveries, kvId],
      })),
    ),
  removeDiscovery: (kvId) =>
    set((s) =>
      _applyProgress(s, (p) => ({
        ...p,
        discoveries: p.discoveries.filter((x) => x !== kvId),
      })),
    ),
  setResearchNote: (topicId, text) =>
    set((s) =>
      _applyProgress(s, (p) => ({
        ...p,
        researchNotes: { ...p.researchNotes, [topicId]: text },
      })),
    ),
  removeResearchNote: (topicId) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const next = { ...p.researchNotes };
        delete next[topicId];
        return { ...p, researchNotes: next };
      }),
    ),
  completeResearchSession: () =>
    set((s) =>
      _applyProgress(s, (p) => {
        const st = p.researchStats ?? emptyResearchStats();
        return { ...p, researchStats: { ...st, sessionsCompleted: st.sessionsCompleted + 1 } };
      }),
    ),
});
