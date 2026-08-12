/**
 * 故事化主线串联
 * 小兔（伙伴动物）迷路了，需要闯过 18 关才能找到回家的路。
 * 每关解锁一段探险剧情，串联字母森林→数字山谷→...→冒险之王。
 */

export interface StoryBeat {
  levelId: number;
  title: string;
  narrative: string;
  emoji: string;
}

export const ADVENTURE_STORY: StoryBeat[] = [
  {
    levelId: 1,
    title: '出发啦',
    narrative: '小兔蹦蹦跳跳地出发了，第一站是字母森林。大树挂满字母果实，等你来采摘！',
    emoji: '🌳',
  },
  {
    levelId: 2,
    title: '数字山谷',
    narrative: '穿过森林，小兔来到数字山谷。山谷里的小动物们正在数数，一起加入吧！',
    emoji: '⛰️',
  },
  {
    levelId: 3,
    title: '算术小溪',
    narrative: '山谷下有条算术小溪，溪水漂着加减法题目。答对了小兔才能过河哦～',
    emoji: '🌊',
  },
  {
    levelId: 4,
    title: '诗花园',
    narrative: '过了小溪，眼前是一片诗花园。花儿们正念着古诗，小兔静静听一听～',
    emoji: '🌸',
  },
  {
    levelId: 5,
    title: '逻辑迷宫',
    narrative: '花园尽头是逻辑迷宫，墙上有好多有趣的规律。找对规律小兔就能走出去！',
    emoji: '🔍',
  },
  {
    levelId: 6,
    title: '汉字城堡',
    narrative: '走出迷宫，一座汉字城堡出现在眼前。城门上写着汉字，认出来就能进去！',
    emoji: '🏰',
  },
  {
    levelId: 7,
    title: '拼音瀑布',
    narrative: '城堡后面传来哗哗水声，是拼音瀑布！瀑布上挂着声母韵母，真好玩～',
    emoji: '💧',
  },
  {
    levelId: 8,
    title: '英语村落',
    narrative: '瀑布旁有个英语村落，村民们说着英语单词。跟他们打个招呼吧！',
    emoji: '🏘️',
  },
  {
    levelId: 9,
    title: '森林深处',
    narrative: '小兔回到字母森林深处，这里的字母更大更多啦！加油采摘呀～',
    emoji: '🌲',
  },
  {
    levelId: 10,
    title: '算术大河',
    narrative: '森林尽头是算术大河，河水更急题目更难。小兔别怕，你能行的！',
    emoji: '🧠',
  },
  {
    levelId: 11,
    title: '迷宫深处',
    narrative: '大河对岸是迷宫深处，迷宫更复杂了。开动小脑筋，帮小兔找到出口！',
    emoji: '🧩',
  },
  {
    levelId: 12,
    title: '城堡塔楼',
    narrative: '迷宫出口连着城堡塔楼，塔楼上满是新汉字。一层一层往上爬吧！',
    emoji: '📚',
  },
  {
    levelId: 13,
    title: '诗花园秘境',
    narrative: '塔楼顶上能看到诗花园秘境，那里有更美的古诗。静静欣赏呀～',
    emoji: '📜',
  },
  {
    levelId: 14,
    title: '彩虹桥',
    narrative: '花园秘境里有一座彩虹桥，桥上什么题目都有。小兔勇敢走过去！',
    emoji: '🌈',
  },
  {
    levelId: 15,
    title: '陡峭高山',
    narrative: '彩虹桥通向一座陡峭高山，山上综合挑战真不少。小兔加油爬！',
    emoji: '🏔️',
  },
  {
    levelId: 16,
    title: '机械之城',
    narrative: '山顶上有一座机械之城，机器人等着你用逻辑解题。滴滴嘟嘟～',
    emoji: '🤖',
  },
  {
    levelId: 17,
    title: '星空之海',
    narrative: '机械城上方是星空之海，九大题型大集合！小兔快要到家啦！',
    emoji: '🌟',
  },
  {
    levelId: 18,
    title: '回家啦',
    narrative: '穿过星空，小兔终于看到家的灯光！最后一关，成为冒险之王吧！',
    emoji: '👑',
  },
];

/** 按 levelId 快速查找剧情 */
export const STORY_MAP: Map<number, StoryBeat> = new Map(
  ADVENTURE_STORY.map((s) => [s.levelId, s]),
);
