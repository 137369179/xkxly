/**
 * 多孩子档案 Store（P1-2）
 * ------------------------------------------------------------------
 * 设计原则（最小侵入、零破坏现有代码）：
 *  - 主 useStore 的 `progress` 字段语义保持为「当前激活孩子的进度视图」。
 *    所有现有 progress 读写代码（applyProgress / applyPractice / useProgress /
 *    280 个单测）完全不动。
 *  - 本 Store 作为外层管理者，持有全部孩子的 progress 仓库（profiles）与元信息
 *    （meta：名字 / 头像 / 主题色），以及当前激活 id（activeProfileId）。
 *  - 切换孩子时：先把主 Store 的 progress（运行时最新）存回旧孩子的仓库，
 *    再把新孩子的 progress 载入主 Store —— 保证两个持久化源始终一致、不丢进度。
 *  - 首次启动（老用户）自动把当前主 Store 的 progress 迁移为第一个孩子「宝贝」，
 *    历史数据零丢失。
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { Progress } from '@/types';
import { createInitialProgress } from '@/lib/progress';
import { useStore } from './useStore';
import { createThrottledStorage } from './storeHelpers';
import { safeGetItem } from '@/lib/safeStorage';

/** 主 Store 的持久化 key —— 用于判定「是否曾使用过应用（老用户）」 */
const LEGACY_STORE_KEY = 'baby-learning-park-v1';

/** 年龄分级（规格六：第一次使用引导选择年龄，驱动内容/UI/AI/难度自适应） */
export const AGE_RANGES = [
  { key: '3-4', emoji: '🧸', label: '3-4岁', short: '3-4' },
  { key: '5-6', emoji: '🌱', label: '5-6岁', short: '5-6' },
  { key: '7-8', emoji: '📚', label: '7-8岁', short: '7-8' },
  { key: '9-10', emoji: '🚀', label: '9-10岁', short: '9-10' },
  { key: '11-12', emoji: '🧠', label: '11-12岁', short: '11-12' },
] as const;

export type AgeRangeKey = (typeof AGE_RANGES)[number]['key'];

/**
 * 年龄 → 难度边界（clamp 自适应难度）：
 * 低龄段整体压低上限、给足信心；高龄段抬高下限、更快进入挑战。
 * 这是对 adaptChain.recommendDifficulty 的「基线偏置」，不替代其会话内信号。
 */
const AGE_DIFFICULTY_BOUNDS: Record<AgeRangeKey, { min: 1 | 2; max: 1 | 2 | 3 }> = {
  '3-4': { min: 1, max: 1 },
  '5-6': { min: 1, max: 2 },
  '7-8': { min: 1, max: 3 },
  '9-10': { min: 2, max: 3 },
  '11-12': { min: 2, max: 3 },
};

/** 给定年龄（缺省取当前激活孩子）的难度边界；无激活孩子时返回全开放默认 */
export function ageDifficultyBounds(ageRange?: string): { min: 1 | 2; max: 1 | 2 | 3 } {
  if (ageRange && ageRange in AGE_DIFFICULTY_BOUNDS) {
    return AGE_DIFFICULTY_BOUNDS[ageRange as AgeRangeKey];
  }
  const active = useProfilesStore.getState().meta[useProfilesStore.getState().activeProfileId];
  if (active?.ageRange && active.ageRange in AGE_DIFFICULTY_BOUNDS) {
    return AGE_DIFFICULTY_BOUNDS[active.ageRange as AgeRangeKey];
  }
  return { min: 1, max: 3 };
}

export interface ProfileMeta {
  id: string;
  name: string;
  /** 头像 emoji */
  avatar: string;
  /** 主题色 key，见 PROFILE_COLORS */
  color: string;
  /** 年龄分级 key，见 AGE_RANGES（规格六） */
  ageRange: AgeRangeKey;
  createdAt: number;
}

export interface ProfileColorDef {
  key: string;
  /** 主色（头像底色 / 强调） */
  hex: string;
  /** 浅色（卡片背景） */
  soft: string;
}

/** 预设主题色（糖果色系，与全站视觉一致） */
export const PROFILE_COLORS: ProfileColorDef[] = [
  { key: 'pink', hex: '#ff5c8a', soft: '#ffe1eb' },
  { key: 'blue', hex: '#3d9bff', soft: '#dcebff' },
  { key: 'green', hex: '#62cc8a', soft: '#f0faf3' },
  { key: 'orange', hex: '#ff9f2e', soft: '#fff3ec' },
  { key: 'purple', hex: '#8f5bff', soft: '#ece5ff' },
  { key: 'teal', hex: '#35bcc0', soft: '#ecfbfa' },
];

export const PROFILE_AVATARS = [
  '👦', '👧', '🧒', '👶',
  '🐱', '🐰', '🦊', '🐻',
  '🐼', '🦁', '🐯', '🐸',
];

export function colorHex(key: string): string {
  return PROFILE_COLORS.find((c) => c.key === key)?.hex ?? PROFILE_COLORS[0]?.hex ?? '';
}
export function colorSoft(key: string): string {
  return PROFILE_COLORS.find((c) => c.key === key)?.soft ?? PROFILE_COLORS[0]?.soft ?? '';
}

function genId(): string {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface ProfilesState {
  profiles: Record<string, Progress>;
  meta: Record<string, ProfileMeta>;
  activeProfileId: string;
  initialized: boolean;
  /** 是否已走完首启引导配置（老用户 / 已引导过 = true，全新用户 = false 需弹引导） */
  onboarded: boolean;

  /** 启动钩子：首次迁移 / 运行时进度同步回 active 仓库 */
  ensureInit: () => void;
  /** 首启引导完成：更新当前孩子名字 / 头像 / 主题色 / 年龄，并标记已引导 */
  completeOnboarding: (name: string, avatar: string, color: string, ageRange?: AgeRangeKey) => void;
  /** 家长中心「重新引导 / 自动登录配置」：下次启动重新弹出引导 */
  reopenOnboarding: () => void;
  /** 切换到指定孩子（先存回旧，再载新） */
  switchProfile: (id: string) => void;
  /** 新增孩子，返回新 id（不自动切换） */
  addProfile: (name: string, avatar: string, color: string, ageRange?: AgeRangeKey) => string;
  /** 重命名 */
  renameProfile: (id: string, name: string) => void;
  /** 改头像 / 主题色 / 年龄 */
  updateProfileAppearance: (id: string, patch: Partial<Pick<ProfileMeta, 'avatar' | 'color' | 'ageRange'>>) => void;
  /** 单独设置年龄分级（驱动 DDA 难度边界） */
  setAgeRange: (id: string, ageRange: AgeRangeKey) => void;
  /** 删除孩子（至少保留 1 个；删当前则自动切到另一个） */
  removeProfile: (id: string) => void;
  /** 当前孩子的元信息 */
  getActiveMeta: () => ProfileMeta | undefined;
}

const { storage: throttledLocalStorage } = createThrottledStorage();

export const useProfilesStore = create<ProfilesState>()(
  persist(
    (set, get) => ({
      profiles: {},
      meta: {},
      activeProfileId: '',
      initialized: false,
      onboarded: false,

      ensureInit: () => {
        const st = get();
        const current = useStore.getState().progress;
        const activeExists = st.activeProfileId !== '' && st.profiles[st.activeProfileId] !== undefined;

        if (st.initialized && activeExists) {
          // 已初始化：用运行时最新（主 Store 当前值）同步回 active 仓库，
          // 保证 profiles 仓库与「当前视图」一致。
          if (st.profiles[st.activeProfileId] !== current) {
            set({ profiles: { ...st.profiles, [st.activeProfileId]: current } });
          }
          return;
        }

        // 首次启动 / active 缺失：把当前主 Store 进度迁移为第一个孩子「宝贝」。
        // 区分老用户（曾用过应用，LEGACY_STORE_KEY 存在）与全新用户：
        //  - 老用户：直接迁移并标记已引导（自动进入，不弹引导，历史数据零丢失）。
        //  - 全新用户：创建默认档案但 onboarded=false，由 OnboardingModal 引导配置。
        const isReturning = safeGetItem(LEGACY_STORE_KEY) !== null;
        const id = genId();
        set({
          profiles: { ...st.profiles, [id]: current },
          meta: {
            ...st.meta,
            [id]: { id, name: '宝贝', avatar: '👦', color: 'pink', ageRange: '7-8', createdAt: Date.now() },
          },
          activeProfileId: id,
          initialized: true,
          onboarded: isReturning,
        });
      },

      completeOnboarding: (name, avatar, color, ageRange) => {
        const st = get();
        const id = st.activeProfileId;
        if (!id) return;
        const m = st.meta[id];
        if (!m) return;
        set({
          meta: { ...st.meta, [id]: { ...m, name: name.trim() || m.name, avatar, color, ageRange: ageRange ?? m.ageRange } },
          onboarded: true,
        });
      },

      reopenOnboarding: () => set({ onboarded: false }),

      switchProfile: (id) => {
        const st = get();
        if (st.profiles[id] === undefined || id === st.activeProfileId) return;
        // 1) 先把主 Store 当前（最新）进度存回旧孩子的仓库
        const current = useStore.getState().progress;
        // 2) 再载入新孩子的进度到主 Store
        const target = st.profiles[id];
        set({
          profiles: { ...st.profiles, [st.activeProfileId]: current },
          activeProfileId: id,
        });
        useStore.setState({ progress: target });
      },

      addProfile: (name, avatar, color, ageRange) => {
        const id = genId();
        const st = get();
        const trimmed = name.trim() || '宝贝';
        set({
          profiles: { ...st.profiles, [id]: createInitialProgress() },
          meta: {
            ...st.meta,
            [id]: { id, name: trimmed, avatar, color, ageRange: ageRange ?? '7-8', createdAt: Date.now() },
          },
        });
        return id;
      },

      renameProfile: (id, name) => {
        const st = get();
        const m = st.meta[id];
        if (!m) return;
        const trimmed = name.trim() || m.name;
        set({ meta: { ...st.meta, [id]: { ...m, name: trimmed } } });
      },

      updateProfileAppearance: (id, patch) => {
        const st = get();
        const m = st.meta[id];
        if (!m) return;
        set({ meta: { ...st.meta, [id]: { ...m, ...patch } } });
      },

      setAgeRange: (id, ageRange) => {
        const st = get();
        const m = st.meta[id];
        if (!m) return;
        set({ meta: { ...st.meta, [id]: { ...m, ageRange } } });
      },

      removeProfile: (id) => {
        const st = get();
        const ids = Object.keys(st.profiles);
        if (ids.length <= 1) return; // 至少保留 1 个孩子
        const profiles = { ...st.profiles };
        const meta = { ...st.meta };
        delete profiles[id];
        delete meta[id];

        if (id === st.activeProfileId) {
          // 删除当前孩子 → 自动切到剩余第一个，并把其进度载入主 Store
          const nextId = Object.keys(profiles)[0] ?? '';
          set({ profiles, meta, activeProfileId: nextId });
          useStore.setState({ progress: profiles[nextId] ?? createInitialProgress() });
        } else {
          set({ profiles, meta });
        }
      },

      getActiveMeta: () => {
        const st = get();
        return st.meta[st.activeProfileId];
      },
    }),
    {
      name: 'baby-learning-park-profiles-v1',
      version: 1,
      storage: createJSONStorage(() => throttledLocalStorage),
      partialize: (s) => ({
        profiles: s.profiles,
        meta: s.meta,
        activeProfileId: s.activeProfileId,
        initialized: s.initialized,
        onboarded: s.onboarded,
      }),
    },
  ),
);

/** 便捷选择器：当前孩子元信息 */
export const useActiveProfileMeta = () => useProfilesStore((s) => (s.activeProfileId ? s.meta[s.activeProfileId] : undefined));
/** 便捷选择器：全部孩子元信息列表（按创建顺序）。
 * P2-3 修复：原实现每次返回 Object.values 新数组，任一变更重渲染所有订阅者。
 * 改用 useShallow 做浅比较，仅当元信息内容真正变化时才触发重渲染，返回稳定引用。 */
export const useProfileList = () => useProfilesStore(useShallow((s) => Object.values(s.meta)));
