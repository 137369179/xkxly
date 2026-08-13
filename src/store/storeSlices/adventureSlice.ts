import { findEquipmentByFragment, EQUIPMENT_MAP } from '@/data/equipment';
import { applyProgress as _applyProgress } from '../storeHelpers';
import { type SliceCreator } from '../storeShared';
import type { StoreState } from '../useStore';

export const createAdventureSlice: SliceCreator<
  Pick<
    StoreState,
    | 'addFragment'
    | 'unlockEquipment'
    | 'toggleEquip'
    | 'recordBossResult'
  >
> = (set) => ({
  addFragment: (fragmentId) =>
    set((s) =>
      _applyProgress(s, (p) => {
        if (p.ownedFragments?.includes(fragmentId)) return p;
        return { ...p, ownedFragments: [...(p.ownedFragments ?? []), fragmentId] };
      }),
    ),

  unlockEquipment: (fragmentId) =>
    set((s) =>
      _applyProgress(s, (p) => {
        // 检查是否已有碎片
        if (!p.ownedFragments?.includes(fragmentId)) return p;
        // 查找对应装备
        const equip = findEquipmentByFragment(fragmentId);
        if (!equip) return p;
        // 检查是否已解锁
        if (p.ownedEquipment?.includes(equip.id)) return p;
        return { ...p, ownedEquipment: [...(p.ownedEquipment ?? []), equip.id] };
      }),
    ),

  toggleEquip: (equipmentId) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const equip = EQUIPMENT_MAP.get(equipmentId);
        if (!equip || !p.ownedEquipment?.includes(equipmentId)) return p;
        const currentEquipped = p.equippedItems ?? {};
        const isEquipped = currentEquipped[equip.slot] === equipmentId;
        return {
          ...p,
          equippedItems: isEquipped
            ? Object.fromEntries(Object.entries(currentEquipped).filter(([k]) => k !== equip.slot))
            : { ...currentEquipped, [equip.slot]: equipmentId },
        };
      }),
    ),

  recordBossResult: (levelId, defeated, turns) =>
    set((s) =>
      _applyProgress(s, (p) => {
        const prev = p.bossRecords?.[levelId];
        if (prev && !defeated) return p; // 只记录胜利
        if (prev && prev.defeated && prev.bestTurns <= turns) return p; // 只记录最佳成绩
        return {
          ...p,
          bossRecords: {
            ...(p.bossRecords ?? {}),
            [levelId]: { defeated, bestTurns: defeated ? Math.min(prev?.bestTurns ?? turns, turns) : turns },
          },
        };
      }),
    ),
});
