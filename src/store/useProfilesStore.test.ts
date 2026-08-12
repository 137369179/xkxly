import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialProgress } from '@/lib/progress';
import { useStore } from './useStore';
import { useProfilesStore, ageDifficultyBounds } from './useProfilesStore';
import { safeSetItem, safeRemoveItem } from '@/lib/safeStorage';

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* 非浏览器环境忽略 */
  }
  // 清除 legacy 主 Store key 的 memory fallback 残留，避免「老用户」测试污染后续用例
  try {
    safeRemoveItem('baby-learning-park-v1');
  } catch {
    /* 忽略 */
  }
  useProfilesStore.setState({ profiles: {}, meta: {}, activeProfileId: '', initialized: false, onboarded: false });
  useStore.setState({ progress: createInitialProgress() });
});

describe('useProfilesStore (P1-2 多孩子档案)', () => {
  it('ensureInit 把当前进度迁移为首个孩子「宝贝」，老数据不丢', () => {
    useStore.setState({ progress: { ...createInitialProgress(), stars: 7 } });
    useProfilesStore.getState().ensureInit();
    const st = useProfilesStore.getState();
    expect(Object.keys(st.profiles)).toHaveLength(1);
    expect(st.activeProfileId).toBeTruthy();
    expect(st.meta[st.activeProfileId!]!.name).toBe('宝贝');
    expect(st.profiles[st.activeProfileId!]!.stars).toBe(7);
    // 主 Store 进度与首个档案一致（同一份数据）
    expect(useStore.getState().progress.stars).toBe(7);
  });

  it('switchProfile 先存回旧孩子、再载入新孩子，进度零丢失', () => {
    useProfilesStore.getState().ensureInit();
    const firstId = useProfilesStore.getState().activeProfileId;
    const secondId = useProfilesStore.getState().addProfile('小明', '👦', 'blue');
    // 当前（第一个）孩子答题 +5 星
    useStore.setState({ progress: { ...useStore.getState().progress, stars: 5 } });
    useProfilesStore.getState().switchProfile(secondId);
    // 主 Store 现在指向第二个（全新）档案
    expect(useStore.getState().progress.stars).toBe(0);
    // 第一个档案保留了 5 颗星
    expect(useProfilesStore.getState().profiles[firstId!]!.stars).toBe(5);
    expect(useProfilesStore.getState().activeProfileId).toBe(secondId);
  });

  it('removeProfile 至少保留 1 个孩子；删当前自动切换', () => {
    useProfilesStore.getState().ensureInit();
    const firstId = useProfilesStore.getState().activeProfileId;
    const secondId = useProfilesStore.getState().addProfile('小美', '👧', 'green');
    useProfilesStore.getState().removeProfile(firstId!);
    expect(Object.keys(useProfilesStore.getState().profiles)).toHaveLength(1);
    expect(useProfilesStore.getState().activeProfileId).toBe(secondId);
    // 仅剩 1 个时不再删除
    useProfilesStore.getState().removeProfile(secondId);
    expect(Object.keys(useProfilesStore.getState().profiles)).toHaveLength(1);
  });

  it('renameProfile 更新元信息名字', () => {
    useProfilesStore.getState().ensureInit();
    const id = useProfilesStore.getState().activeProfileId;
    useProfilesStore.getState().renameProfile(id!, '大宝');
    expect(useProfilesStore.getState().meta[id!]!.name).toBe('大宝');
  });

  it('ensureInit 对全新用户设 onboarded=false（需引导），老用户设 onboarded=true（自动进入）', () => {
    // 全新用户：无 legacy 主 Store key
    useProfilesStore.getState().ensureInit();
    expect(useProfilesStore.getState().onboarded).toBe(false);

    // 老用户：存在 legacy 主 Store key
    useProfilesStore.setState({ profiles: {}, meta: {}, activeProfileId: '', initialized: false, onboarded: false });
    safeSetItem('baby-learning-park-v1', JSON.stringify({ state: {}, version: 2 }));
    useProfilesStore.getState().ensureInit();
    expect(useProfilesStore.getState().onboarded).toBe(true);
  });

  it('completeOnboarding 更新当前孩子元信息并标记已引导', () => {
    useProfilesStore.getState().ensureInit();
    expect(useProfilesStore.getState().onboarded).toBe(false);
    const id = useProfilesStore.getState().activeProfileId;
    useProfilesStore.getState().completeOnboarding('小明', '🐱', 'blue');
    const st = useProfilesStore.getState();
    expect(st.onboarded).toBe(true);
    expect(st.meta[id!]!.name).toBe('小明');
    expect(st.meta[id!]!.avatar).toBe('🐱');
    expect(st.meta[id!]!.color).toBe('blue');
  });

  it('reopenOnboarding 重置 onboarded=false，家长中心可重新引导', () => {
    useProfilesStore.getState().ensureInit();
    const id = useProfilesStore.getState().activeProfileId;
    useProfilesStore.getState().completeOnboarding('小红', '🐰', 'pink');
    expect(useProfilesStore.getState().onboarded).toBe(true);
    useProfilesStore.getState().reopenOnboarding();
    expect(useProfilesStore.getState().onboarded).toBe(false);
    // 重开后元信息保留（只是重新弹引导）
    expect(useProfilesStore.getState().meta[id!]!.name).toBe('小红');
  });
});

describe('useProfilesStore 年龄分级（规格六 → DDA 难度边界）', () => {
  it('ensureInit 默认年龄为 7-8', () => {
    useProfilesStore.getState().ensureInit();
    const id = useProfilesStore.getState().activeProfileId;
    expect(useProfilesStore.getState().meta[id!]!.ageRange).toBe('7-8');
  });

  it('completeOnboarding / setAgeRange 更新年龄', () => {
    useProfilesStore.getState().ensureInit();
    const id = useProfilesStore.getState().activeProfileId;
    useProfilesStore.getState().completeOnboarding('小明', '🐱', 'blue', '3-4');
    expect(useProfilesStore.getState().meta[id!]!.ageRange).toBe('3-4');
    useProfilesStore.getState().setAgeRange(id!, '11-12');
    expect(useProfilesStore.getState().meta[id!]!.ageRange).toBe('11-12');
  });

  it('ageDifficultyBounds 按年龄 clamp 难度边界（低龄压上限、高龄抬下限）', () => {
    useProfilesStore.getState().ensureInit();
    const id = useProfilesStore.getState().activeProfileId;
    useProfilesStore.getState().setAgeRange(id!, '3-4');
    expect(ageDifficultyBounds()).toEqual({ min: 1, max: 1 });
    useProfilesStore.getState().setAgeRange(id!, '11-12');
    expect(ageDifficultyBounds()).toEqual({ min: 2, max: 3 });
    // 显式传入参数优先
    expect(ageDifficultyBounds('5-6')).toEqual({ min: 1, max: 2 });
  });
});
