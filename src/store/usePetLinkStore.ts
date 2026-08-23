/**
 * 全站学习行为 → 宠物属性 事件总线
 * 各学习模块完成回调一行接入：usePetLinkStore.getState().report('numbers')
 * PetProvider 订阅后 dispatch gain-attr（日上限由 attributes 引擎二次拦截）。
 */
import { create } from 'zustand';
import type { AttrSourceKind } from '@/modules/pet/desktop/lib/attributes';

const KEY = 'xkxly_pet_link_v1';
const DEDUP_MS = 60_000;

type Listener = (kind: AttrSourceKind) => void;

interface PetLinkState {
  lastAt: Partial<Record<AttrSourceKind, number>>;
  listeners: Listener[];
  report: (kind: AttrSourceKind) => void;
  subscribe: (l: Listener) => () => void;
}

function loadLastAt(): Partial<Record<AttrSourceKind, number>> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export const usePetLinkStore = create<PetLinkState>((set, get) => ({
  lastAt: typeof window !== 'undefined' ? loadLastAt() : {},
  listeners: [],
  report: (kind) => {
    const now = Date.now();
    const { lastAt, listeners } = get();
    if (lastAt[kind] != null && now - lastAt[kind]! < DEDUP_MS) return;
    const next = { ...lastAt, [kind]: now };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 满 */ }
    set({ lastAt: next });
    listeners.forEach((l) => l(kind));
  },
  subscribe: (l) => {
    set({ listeners: [...get().listeners, l] });
    return () => set({ listeners: get().listeners.filter((x) => x !== l) });
  },
}));
