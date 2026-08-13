import type { SavedStorybook } from '@/modules/storybook/types';
import { applyProgress as _applyProgress } from '../storeHelpers';
import { type SliceCreator } from '../storeShared';
import type { StoreState } from '../useStore';

export const createStorybookSlice: SliceCreator<
  Pick<
    StoreState,
    | 'saveStorybook'
    | 'removeStorybook'
    | 'incrementStorybookRead'
    | 'toggleStorybookFavorite'
  >
> = (set) => ({
  saveStorybook: (book: SavedStorybook) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const list = p.storybooks ?? [];
        // 避免重复保存同一本
        if (list.some((b) => b.id === book.id)) return p;
        const next = [book, ...list].slice(0, 50);
        return { ...p, storybooks: next };
      }),
    ),

  removeStorybook: (id) =>
    set((s) =>
      _applyProgress(s, (p) => ({
        ...p,
        storybooks: (p.storybooks ?? []).filter((b) => b.id !== id),
      })),
    ),

  incrementStorybookRead: (id) =>
    set((s) =>
      _applyProgress(s, (p) => ({
        ...p,
        storybooks: (p.storybooks ?? []).map((b) =>
          b.id === id ? { ...b, readCount: b.readCount + 1 } : b,
        ),
      })),
    ),

  toggleStorybookFavorite: (id) =>
    set((s) =>
      _applyProgress(s, (p) => ({
        ...p,
        storybooks: (p.storybooks ?? []).map((b) =>
          b.id === id ? { ...b, favorite: !b.favorite } : b,
        ),
      })),
    ),
});
