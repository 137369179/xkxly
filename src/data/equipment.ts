import type { Tone } from '@/types';

export interface EquipmentDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  tone: Tone;
  slot: 'hat' | 'cape' | 'sword' | 'shield' | 'crown' | 'robe';
  fragmentId: string;
  bonus: EquipmentBonus;
}

export interface EquipmentBonus {
  extraHp?: number;
  extraTime?: number;
  extraHints?: number;
  starBonus?: number;
}

export const EQUIPMENT: EquipmentDef[] = [
  {
    id: 'forest-hat',
    name: '森林之帽',
    emoji: '🎩',
    desc: '字母森林的神秘帽子，Boss战+1生命',
    tone: 'green',
    slot: 'hat',
    fragmentId: 'frag:forest-hat',
    bonus: { extraHp: 1 },
  },
  {
    id: 'valley-cape',
    name: '山谷披风',
    emoji: '🦸',
    desc: '数字山谷的勇敢披风，Boss战+3秒限时',
    tone: 'yellow',
    slot: 'cape',
    fragmentId: 'frag:valley-cape',
    bonus: { extraTime: 3 },
  },
  {
    id: 'castle-sword',
    name: '城堡之剑',
    emoji: '⚔️',
    desc: '汉字城堡的锋利之剑，Boss战+1提示次数',
    tone: 'blue',
    slot: 'sword',
    fragmentId: 'frag:castle-sword',
    bonus: { extraHints: 1 },
  },
  {
    id: 'maze-shield',
    name: '迷宫之盾',
    emoji: '🛡️',
    desc: '逻辑迷宫的坚固之盾，Boss战+1生命',
    tone: 'purple',
    slot: 'shield',
    fragmentId: 'frag:maze-shield',
    bonus: { extraHp: 1 },
  },
  {
    id: 'mech-crown',
    name: '机械王冠',
    emoji: '👑',
    desc: '机械之城的智慧王冠，通关+1额外星星',
    tone: 'orange',
    slot: 'crown',
    fragmentId: 'frag:mech-crown',
    bonus: { starBonus: 1 },
  },
  {
    id: 'star-king-robe',
    name: '星王长袍',
    emoji: '✨',
    desc: '星空之海的终极装备，全属性+1',
    tone: 'pink',
    slot: 'robe',
    fragmentId: 'frag:star-king-robe',
    bonus: { extraHp: 1, extraTime: 2, extraHints: 1, starBonus: 1 },
  },
];

export const EQUIPMENT_MAP = new Map(EQUIPMENT.map(e => [e.id, e]));

export function findEquipmentByFragment(fragmentId: string): EquipmentDef | undefined {
  return EQUIPMENT.find(e => e.fragmentId === fragmentId);
}

export function getOwnedEquipment(ownedFragments: string[]): EquipmentDef[] {
  return EQUIPMENT.filter(e => ownedFragments.includes(e.fragmentId));
}

export function calcTotalBonus(ownedFragments: string[]): EquipmentBonus {
  const owned = getOwnedEquipment(ownedFragments);
  return owned.reduce<EquipmentBonus>((acc, e) => ({
    extraHp: (acc.extraHp ?? 0) + (e.bonus.extraHp ?? 0),
    extraTime: (acc.extraTime ?? 0) + (e.bonus.extraTime ?? 0),
    extraHints: (acc.extraHints ?? 0) + (e.bonus.extraHints ?? 0),
    starBonus: (acc.starBonus ?? 0) + (e.bonus.starBonus ?? 0),
  }), {});
}
