import type { SavedStorybook } from '@/modules/storybook/types';
import { applyProgress as _applyProgress } from '../storeHelpers';
import { type SliceCreator } from '../storeShared';
import type { StoreState } from '../useStore';
import { putStorybookContent, deleteStorybookContent } from '@/lib/storybookStore';

export const createStorybookSlice: SliceCreator<
  Pick<
    StoreState,
    | 'saveStorybook'
    | 'removeStorybook'
    | 'incrementStorybookRead'
    | 'toggleStorybookFavorite'
  >
> = (set) => ({
  saveStorybook: (book) => {
    // P1-10：完整内容写 IndexedDB（低频大对象），progress 只存轻量元数据，
    // 避免 50 本绘本全文撑爆 localStorage（5MB 上限）。
    void putStorybookContent(book);
    const meta: SavedStorybook = {
      id: book.id,
      title: book.data?.bookTitle ?? book.title,
      theme: book.theme,
      style: book.style,
      character: book.character,
      createdAt: book.createdAt,
      readCount: book.readCount,
      favorite: book.favorite,
    };
    set((s) =>
      _applyProgress(s, (p) => {
        const list = p.storybooks ?? [];
        // 避免重复保存同一本
        if (list.some((b) => b.id === book.id)) return p;
        const next = [meta, ...list].slice(0, 50);
        return { ...p, storybooks: next };
      }),
    );
  },

  removeStorybook: (id) => {
    // 同步清理 IndexedDB 中的完整内容
    void deleteStorybookContent(id);
    set((s) =>
      _applyProgress(s, (p) => ({
        ...p,
        storybooks: (p.storybooks ?? []).filter((b) => b.id !== id),
      })),
    );
  },

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
