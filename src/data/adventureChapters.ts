import type { Tone } from '@/types';

/** 章节配置 */
export interface ChapterDef {
  id: number;
  name: string;
  emoji: string;
  tone: Tone;
  desc: string;
  bgGradient: string;
  levelIds: number[];
  bossLevelId: number;
  boss: BossConfig;
  introStory: string;
  outroStory: string;
}

export interface BossConfig {
  name: string;
  emoji: string;
  hp: number;
  attackEvery: number;
  skills: BossSkill[];
  drops: string[];
  bgmTone?: string;
}

export interface BossSkill {
  name: string;
  emoji: string;
  desc: string;
  triggerHpPct: number;
  effect: 'timeLimit' | 'doubleDamage' | 'shuffle' | 'hideHint';
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 1,
    name: '字母森林',
    emoji: '🌳',
    tone: 'green',
    desc: '小兔在字母森林里探险',
    bgGradient: 'from-green-100 via-emerald-50 to-teal-100',
    levelIds: [1, 2, 3],
    bossLevelId: 3,
    boss: {
      name: '数字巨龙',
      emoji: '🐉',
      hp: 5,
      attackEvery: 2,
      skills: [
        { name: '咆哮', emoji: '💢', desc: '答错时额外扣1血', triggerHpPct: 60, effect: 'doubleDamage' },
      ],
      drops: ['frag:forest-hat'],
    },
    introStory: '小兔蹦蹦跳跳地出发啦！第一站是神秘的字母森林，大树挂满字母果实，数字动物们藏在树丛中...',
    outroStory: '数字巨龙倒下了，留下一顶森林帽子！小兔戴上帽子，继续向数字山谷出发！',
  },
  {
    id: 2,
    name: '数字山谷',
    emoji: '⛰️',
    tone: 'yellow',
    desc: '穿越数字山谷和算术小溪',
    bgGradient: 'from-amber-100 via-yellow-50 to-orange-100',
    levelIds: [4, 5, 6],
    bossLevelId: 6,
    boss: {
      name: '算术巨人',
      emoji: '🧌',
      hp: 6,
      attackEvery: 2,
      skills: [
        { name: '时间压力', emoji: '⏰', desc: '每题限时15秒', triggerHpPct: 50, effect: 'timeLimit' },
      ],
      drops: ['frag:valley-cape'],
    },
    introStory: '穿过森林，小兔来到数字山谷。山谷里的小动物们正在数数，远处传来巨人沉重的脚步声...',
    outroStory: '算术巨人笑了，递给小兔一件山谷披风！"你真聪明！"巨人说完就消失了。',
  },
  {
    id: 3,
    name: '汉字城堡',
    emoji: '🏰',
    tone: 'blue',
    desc: '汉字城堡和拼音瀑布',
    bgGradient: 'from-blue-100 via-sky-50 to-indigo-100',
    levelIds: [7, 8, 9],
    bossLevelId: 9,
    boss: {
      name: '汉字守卫',
      emoji: '🥷',
      hp: 7,
      attackEvery: 2,
      skills: [
        { name: '打乱', emoji: '🔀', desc: '打乱你的选项顺序', triggerHpPct: 40, effect: 'shuffle' },
        { name: '隐藏提示', emoji: '🚫', desc: '不能使用提示', triggerHpPct: 20, effect: 'hideHint' },
      ],
      drops: ['frag:castle-sword'],
    },
    introStory: '城堡大门缓缓打开，里面满是汉字和拼音。城墙上写着挑战：只有通过汉字守卫的考验，才能继续前进！',
    outroStory: '汉字守卫摘下头盔，露出笑容："你赢了！"他把一把城堡之剑交给了小兔。',
  },
  {
    id: 4,
    name: '逻辑迷宫',
    emoji: '🧩',
    tone: 'purple',
    desc: '逻辑迷宫和诗词花园',
    bgGradient: 'from-purple-100 via-fuchsia-50 to-pink-100',
    levelIds: [10, 11, 12],
    bossLevelId: 12,
    boss: {
      name: '迷宫大师',
      emoji: '🧙',
      hp: 8,
      attackEvery: 2,
      skills: [
        { name: '时间压力', emoji: '⏰', desc: '每题限时12秒', triggerHpPct: 50, effect: 'timeLimit' },
        { name: '双倍伤害', emoji: '💥', desc: '答错扣2血', triggerHpPct: 30, effect: 'doubleDamage' },
      ],
      drops: ['frag:maze-shield'],
    },
    introStory: '花园尽头是巨大的逻辑迷宫，迷宫大师在中心等着挑战者。小兔深吸一口气，走了进去...',
    outroStory: '迷宫大师的魔杖发光了！"你是我见过最聪明的小冒险家！"一面迷宫之盾飘到小兔手中。',
  },
  {
    id: 5,
    name: '机械之城',
    emoji: '🤖',
    tone: 'orange',
    desc: '机械之城和综合挑战',
    bgGradient: 'from-orange-100 via-amber-50 to-red-100',
    levelIds: [13, 14, 15],
    bossLevelId: 15,
    boss: {
      name: '机械帝王',
      emoji: '👑',
      hp: 9,
      attackEvery: 2,
      skills: [
        { name: '全技能', emoji: '⚡', desc: '限时+打乱+禁提示', triggerHpPct: 40, effect: 'shuffle' },
      ],
      drops: ['frag:mech-crown'],
    },
    introStory: '山顶上矗立着机械之城，齿轮转动声不绝于耳。机械帝王在城墙上俯视着小兔："来吧，证明你的实力！"',
    outroStory: '机械帝王的装甲打开，露出一颗温暖的心："你做到了！"一顶机械王冠飘落下来。',
  },
  {
    id: 6,
    name: '星空之海',
    emoji: '🌟',
    tone: 'pink',
    desc: '终极挑战，全模块全题型',
    bgGradient: 'from-indigo-200 via-purple-100 to-pink-100',
    levelIds: [16, 17, 18],
    bossLevelId: 18,
    boss: {
      name: '冒险之王',
      emoji: '👑',
      hp: 10,
      attackEvery: 2,
      skills: [
        { name: '终极考验', emoji: '💫', desc: '全技能激活', triggerHpPct: 50, effect: 'timeLimit' },
        { name: '最后挣扎', emoji: '🔥', desc: '答错扣2血', triggerHpPct: 25, effect: 'doubleDamage' },
      ],
      drops: ['frag:star-king-robe'],
    },
    introStory: '穿过机械之城，眼前是壮丽的星空之海。星星闪烁着光芒，家的方向就在彼岸。最后的冒险，开始了！',
    outroStory: '冒险之王消失了，满天的星光汇聚成一件星王长袍。小兔穿上它，终于看到了家温暖的灯光！',
  },
];

export const TOTAL_CHAPTERS = CHAPTERS.length;

export function findChapterByLevel(levelId: number): ChapterDef | undefined {
  return CHAPTERS.find(c => c.levelIds.includes(levelId));
}

export function isBossLevel(levelId: number): boolean {
  return CHAPTERS.some(c => c.bossLevelId === levelId);
}
