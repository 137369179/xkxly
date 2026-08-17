/**
 * 勋章体系配置（Medal System）
 * ------------------------------------------------------------------
 * 与站点现有徽章系统完全兼容：MedalDef 继承自 BadgeDef，因此勋章会
 * 自动并入 BADGES / BADGE_MAP，复用整套「进度变更 → findNewBadges
 * 检测 → pendingBadges → BadgeUnlock 弹窗 / AchievementWall 展示」管线。
 *
 * 与徽章的差别：勋章额外携带
 *   - category：成就 / 里程碑 / 行为激励 三类
 *   - reward：解锁时自动发放的奖励（星星 / 小鱼干 / 猫咪资源）
 *   - image：配套 AI 生成图片资源（/medals/<id>.png）
 *
 * 奖励发放在 src/store/storeHelpers.ts 的 applyProgress 中、检测出新勋章后
 * 通过 applyMedalReward 写入 Progress，保证与功能逻辑一致且只发放一次。
 */
import type { BadgeDef, Progress } from '@/types';

/** 勋章三大类型 */
export type MedalCategory = 'achievement' | 'milestone' | 'behavior';

/** 奖励类型（与现有货币/养成资源对齐） */
export type RewardType = 'stars' | 'fish' | 'catAffection' | 'catFullness' | 'catCleanliness';

/** 奖励发放规格 */
export interface RewardSpec {
  type: RewardType;
  /** 发放数量（猫咪资源会按 0-100 封顶） */
  amount: number;
}

/** 勋章定义：在 BadgeDef 基础上扩展勋章专属字段 */
export interface MedalDef extends BadgeDef {
  category: MedalCategory;
  reward?: RewardSpec;
  /** 图片资源路径，放在 public/medals/ 下由构建静态托管 */
  image?: string;
}

/* ------------------------------------------------------------------ */
/* 进度读取小工具（全部基于现有 Progress 真实字段，零新增状态）          */
/* ------------------------------------------------------------------ */
const hanziMastered = (p: Progress) =>
  Object.entries(p.mastery).filter(([k, m]) => k.startsWith('hanzi:') && (m.lv ?? 0) >= 2).length;

const listenOk = (p: Progress) =>
  Object.keys(p.mastery)
    .filter((k) => k.startsWith('listen:'))
    .reduce((s, k) => s + (p.mastery[k]?.ok ?? 0), 0);

const chatRounds = (p: Progress) =>
  Object.entries(p.chatHistory ?? {})
    .filter(([k]) => k.startsWith('chatCount_'))
    .reduce((s, [, v]) => s + (typeof v === 'number' ? v : 0), 0);

const pinyinMastered = (p: Progress) =>
  Object.keys(p.mastery).filter((k) => k.startsWith('pinyin:')).length;

const bossDefeated = (p: Progress) =>
  Object.values(p.bossRecords ?? {}).filter((r) => r.defeated).length;

/** 每日任务最长连续完成天数（当天至少完成一项即计为完成） */
const dailyQuestStreak = (p: Progress) => {
  const dailyQuests = p.dailyQuests ?? {};
  const dates = Object.keys(dailyQuests)
    .filter((d) => (dailyQuests[d] ?? []).some((q) => q.completed))
    .sort();
  if (!dates.length) return 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const curDate = dates[i];
    const prevDate = dates[i - 1];
    if (!curDate || !prevDate) continue;
    const diff = Math.round(
      (new Date(curDate).getTime() - new Date(prevDate).getTime()) / 86_400_000,
    );
    if (diff === 1) cur++;
    else if (diff > 1) cur = 1;
    if (cur > best) best = cur;
  }
  return best;
};

/* ------------------------------------------------------------------ */
/* 勋章清单（16 枚：成就 6 + 里程碑 5 + 行为激励 5）                      */
/* ------------------------------------------------------------------ */
export const MEDALS: MedalDef[] = [
  /* ===================== 成就类：技能掌握 ===================== */
  {
    id: 'medal-hanzi-master',
    name: '识字小状元',
    desc: '掌握 100 个汉字',
    emoji: '🀄',
    tone: 'pink',
    category: 'achievement',
    image: '/medals/medal-hanzi-master.png',
    reward: { type: 'stars', amount: 20 },
    check: (p) => hanziMastered(p) >= 100,
    meter: (p) => [Math.min(hanziMastered(p), 100), 100],
  },
  {
    id: 'medal-poem-poet',
    name: '唐诗小诗人',
    desc: '背诵 10 首古诗',
    emoji: '📜',
    tone: 'green',
    category: 'achievement',
    image: '/medals/medal-poem-poet.png',
    reward: { type: 'stars', amount: 15 },
    check: (p) => Object.keys(p.poemRecite ?? {}).length >= 10,
    meter: (p) => [Math.min(Object.keys(p.poemRecite ?? {}).length, 10), 10],
  },
  {
    id: 'medal-listen-king',
    name: '听音辨字王',
    desc: '听音识字答对 50 次',
    emoji: '👂',
    tone: 'blue',
    category: 'achievement',
    image: '/medals/medal-listen-king.png',
    reward: { type: 'stars', amount: 15 },
    check: (p) => listenOk(p) >= 50,
    meter: (p) => [Math.min(listenOk(p), 50), 50],
  },
  {
    id: 'medal-math-genius',
    name: '数学小天才',
    desc: '数学题累计答对 100 道',
    emoji: '🔢',
    tone: 'orange',
    category: 'achievement',
    image: '/medals/medal-math-genius.png',
    reward: { type: 'stars', amount: 15 },
    check: (p) => (p.mathCorrect ?? 0) >= 100,
    meter: (p) => [Math.min(p.mathCorrect ?? 0, 100), 100],
  },
  {
    id: 'medal-pinyin-master',
    name: '拼音小能手',
    desc: '掌握 20 个拼音',
    emoji: '🗣️',
    tone: 'blue',
    category: 'achievement',
    image: '/medals/medal-pinyin-master.png',
    reward: { type: 'stars', amount: 15 },
    check: (p) => pinyinMastered(p) >= 20,
    meter: (p) => [Math.min(pinyinMastered(p), 20), 20],
  },
  {
    id: 'medal-adventure-hero',
    name: '闯关小勇士',
    desc: '击败 3 个冒险 Boss',
    emoji: '🚀',
    tone: 'purple',
    category: 'achievement',
    image: '/medals/medal-adventure-hero.png',
    reward: { type: 'stars', amount: 15 },
    check: (p) => bossDefeated(p) >= 3,
    meter: (p) => [Math.min(bossDefeated(p), 3), 3],
  },

  /* ===================== 里程碑类：累计 / 连续 ===================== */
  {
    id: 'medal-streak-30',
    name: '坚持小勇士',
    desc: '连续学习 30 天',
    emoji: '🔥',
    tone: 'orange',
    category: 'milestone',
    image: '/medals/medal-streak-30.png',
    reward: { type: 'stars', amount: 30 },
    check: (p) => (p.streak ?? 0) >= 30,
    meter: (p) => [Math.min(p.streak ?? 0, 30), 30],
  },
  {
    id: 'medal-stars-300',
    name: '星星收藏家',
    desc: '累计获得 300 颗星星',
    emoji: '⭐',
    tone: 'yellow',
    category: 'milestone',
    image: '/medals/medal-stars-300.png',
    reward: { type: 'fish', amount: 30 },
    check: (p) => (p.stars ?? 0) >= 300,
    meter: (p) => [Math.min(p.stars ?? 0, 300), 300],
  },
  {
    id: 'medal-story-master',
    name: '故事大王',
    desc: '读完 10 本绘本',
    emoji: '📚',
    tone: 'purple',
    category: 'milestone',
    image: '/medals/medal-story-master.png',
    reward: { type: 'stars', amount: 20 },
    check: (p) => (p.storybooks?.length ?? 0) >= 10,
    meter: (p) => [Math.min(p.storybooks?.length ?? 0, 10), 10],
  },
  {
    id: 'medal-research-scientist',
    name: '小小科学家',
    desc: '完成 5 次研究会话',
    emoji: '🔬',
    tone: 'blue',
    category: 'milestone',
    image: '/medals/medal-research-scientist.png',
    reward: { type: 'stars', amount: 15 },
    check: (p) => (p.researchStats?.sessionsCompleted ?? 0) >= 5,
    meter: (p) => [Math.min(p.researchStats?.sessionsCompleted ?? 0, 5), 5],
  },
  {
    id: 'medal-cat-friend',
    name: '猫咪好伙伴',
    desc: '猫咪进化到学童猫',
    emoji: '🐱',
    tone: 'pink',
    category: 'milestone',
    image: '/medals/medal-cat-friend.png',
    reward: { type: 'catAffection', amount: 20 },
    check: (p) => (p.catLevel ?? 1) >= 2,
    meter: (p) => [Math.min(p.catLevel ?? 1, 2), 2],
  },

  /* ===================== 行为激励类：日常行为 ===================== */
  {
    id: 'medal-first-learner',
    name: '起步勋章',
    desc: '完成第一次学习',
    emoji: '🌟',
    tone: 'yellow',
    category: 'behavior',
    image: '/medals/medal-first-learner.png',
    reward: { type: 'stars', amount: 5 },
    check: (p) => Object.keys(p.mastery).length >= 1,
    meter: (p) => [Math.min(Object.keys(p.mastery).length, 1), 1],
  },
  {
    id: 'medal-review-keeper',
    name: '复习小达人',
    desc: '连续复习 7 天',
    emoji: '🔁',
    tone: 'green',
    category: 'behavior',
    image: '/medals/medal-review-keeper.png',
    reward: { type: 'stars', amount: 10 },
    check: (p) => (p.wrongHistory?.dailyStreak ?? 0) >= 7,
    meter: (p) => [Math.min(p.wrongHistory?.dailyStreak ?? 0, 7), 7],
  },
  {
    id: 'medal-companion-friend',
    name: '小智好朋友',
    desc: '与小智聊天 20 轮',
    emoji: '💬',
    tone: 'purple',
    category: 'behavior',
    image: '/medals/medal-companion-friend.png',
    reward: { type: 'stars', amount: 10 },
    check: (p) => chatRounds(p) >= 20,
    meter: (p) => [Math.min(chatRounds(p), 20), 20],
  },
  {
    id: 'medal-creative',
    name: '创意小画家',
    desc: '创作 5 次作品',
    emoji: '🎨',
    tone: 'pink',
    category: 'behavior',
    image: '/medals/medal-creative.png',
    reward: { type: 'stars', amount: 10 },
    check: (p) => (p.creativeCount ?? 0) >= 5,
    meter: (p) => [Math.min(p.creativeCount ?? 0, 5), 5],
  },
  {
    id: 'medal-daily-champion',
    name: '每日小标兵',
    desc: '连续完成每日任务 7 天',
    emoji: '🏅',
    tone: 'green',
    category: 'behavior',
    image: '/medals/medal-daily-champion.png',
    reward: { type: 'stars', amount: 10 },
    check: (p) => dailyQuestStreak(p) >= 7,
    meter: (p) => [Math.min(dailyQuestStreak(p), 7), 7],
  },
];

/** 勋章快速查找表（id -> MedalDef），供解锁弹窗读取奖励/图片 */
export const MEDAL_MAP = new Map(MEDALS.map((m) => [m.id, m]));

/** 奖励类型展示元数据（弹窗展示用） */
export const REWARD_META: Record<RewardType, { label: string; emoji: string }> = {
  stars: { label: '星星', emoji: '⭐' },
  fish: { label: '小鱼干', emoji: '🐟' },
  catAffection: { label: '亲密度', emoji: '💗' },
  catFullness: { label: '饱食度', emoji: '🍽️' },
  catCleanliness: { label: '清洁度', emoji: '🛁' },
};

/** 在 Progress 上就地发放一枚勋章的奖励（猫咪资源按 0-100 封顶） */
export function applyMedalReward(p: Progress, reward: RewardSpec): void {
  switch (reward.type) {
    case 'stars':
      p.stars = (p.stars ?? 0) + reward.amount;
      break;
    case 'fish':
      p.fishCount = (p.fishCount ?? 0) + reward.amount;
      break;
    case 'catAffection':
      p.catAffection = Math.min(100, (p.catAffection ?? 0) + reward.amount);
      break;
    case 'catFullness':
      p.catFullness = Math.min(100, (p.catFullness ?? 0) + reward.amount);
      break;
    case 'catCleanliness':
      p.catCleanliness = Math.min(100, (p.catCleanliness ?? 0) + reward.amount);
      break;
  }
}
