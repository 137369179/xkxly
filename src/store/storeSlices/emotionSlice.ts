import { type SliceCreator } from '../storeShared';
import type { StoreState } from '../useStore';

export const createEmotionSlice: SliceCreator<
  Pick<
    StoreState,
    | 'wrongStreak'
    | 'comfortingActive'
    | 'recordWrong'
    | 'resetWrongStreak'
    | 'setComforting'
  >
> = (set) => ({
  wrongStreak: 0,
  comfortingActive: false,
  recordWrong: () =>
    set((s) => {
      const next = s.wrongStreak + 1;
      if (next >= 3 && !s.comfortingActive) {
        return { wrongStreak: 0, comfortingActive: true };
      }
      return { wrongStreak: next };
    }),
  resetWrongStreak: () => set(() => ({ wrongStreak: 0 })),
  setComforting: (v) => set(() => ({ comfortingActive: v })),
});
