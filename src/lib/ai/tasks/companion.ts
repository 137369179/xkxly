/**
 * AI 任务 · 陪伴学习伙伴
 * ------------------------------------------------------------------
 * companionChatTask   —— 自由多轮对话（孩子端，AiChat / 悬浮猫共用）
 * companionExplainTask —— 拟人化讲解（主题卡，走缓存：同主题 7 天内不重复问）
 * 本地兜底永远可用：AI 挂了孩子也绝不冷场。
 */
import { companionChatMessages, companionExplainMessages, companionComfortMessages, companionCelebrateMessages, companionFollowUpMessages } from '../prompts';
import type { AiMessage } from '../types';
import type { StreamTask, TaskResult } from './types';
import { pick } from './types';
import type { CompanionTopic } from '@/data/companionTopics';

/** 本地兜底：关键词匹配的猫猫式回答（AI 失败时使用） */
export function localChatReply(q: string): string {
  if (q.includes('名字') || q.includes('你是谁'))
    return '我是小智呀！你的 AI 学习小伙伴，最喜欢陪你读书、数数、看星星啦！';
  if (q.includes('夸') || q.includes('棒') || q.includes('厉害'))
    return '你当然超棒啦！每天认真学习的小勇士，小智给你一个大大的赞 👍！';
  if (q.includes('故事'))
    return '好呀！从前有一只小兔子，它每天都会读一本书…宝贝猜猜它读的是什么？';
  if (q.includes('唱') || q.includes('歌'))
    return '喵喵喵～小智唱给你听：一闪一闪亮晶晶，满天都是小星星～宝贝会唱吗？';
  if (q.includes('恐龙'))
    return '恐龙呀，它们是很久很久以前的大朋友，后来变成化石藏在地下啦。科学家挖出来就能看到它们的样子哦！';
  if (q.includes('数'))
    return '数数啦！1、2、3、4、5…小智和你一起数，数到 20 就有小星星！';
  if (q.includes('刷牙'))
    return '刷牙是为了赶走嘴巴里的小细菌，不然牙齿会疼的！早晚各刷一次，牙齿白又亮 ✨';
  return '哇，这个问题真有趣！小智觉得，我们可以一边玩一边找到答案，要不要一起试试？';
}

/** 自由对话任务（流式）：question 已通过 guardInput，history 为最近几轮上下文 */
export function companionChatTask(question: string, history: AiMessage[]): StreamTask {
  return {
    scene: 'companion.chat',
    messages: companionChatMessages(question, history),
    title: '小智陪你聊',
    hint: '正在想怎么回答你…',
    fallback: localChatReply(question),
  };
}

/** 拟人化讲解任务（流式）：同主题缓存 7 天，讲过的知识不重复烧额度 */
export function companionExplainTask(topic: CompanionTopic): StreamTask {
  return {
    scene: 'companion.explain',
    messages: companionExplainMessages(topic.prompt),
    cacheKey: `companionExplain:${topic.id}`,
    cacheTtl: 7 * 24 * 60 * 60 * 1000,
    title: `小智讲${topic.label}`,
    hint: `正在给你讲「${topic.label}」…`,
    fallback: topic.fallback,
  };
}

/* ================================================================
 * S2 Companion 2.0 新增 Task
 * ================================================================ */

/** —— 学习搭子出题（结构化）—— */
export interface BuddyQuizData {
  question: string;
  display?: string;
  buddyAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  subject: string;
}

/** 本地兜底题库 */
const BUDDY_QUIZ_FALLBACKS: Record<string, BuddyQuizData[]> = {
  '数学': [
    { question: '3 + 4 = ?', display: '3 + 4 = ?', buddyAnswer: '6', isCorrect: false, correctAnswer: '7', explanation: '3个苹果加4个苹果，一共7个！', subject: '数学' },
    { question: '10 - 5 = ?', display: '10 - 5 = ?', buddyAnswer: '5', isCorrect: true, correctAnswer: '5', explanation: '10颗糖果吃了5颗，还剩5颗！', subject: '数学' },
    { question: '2 + 2 = ?', display: '2 + 2 = ?', buddyAnswer: '5', isCorrect: false, correctAnswer: '4', explanation: '2辆小汽车加2辆，一共4辆！', subject: '数学' },
  ],
  '古诗': [
    { question: '《静夜思》是谁写的？', buddyAnswer: '杜甫', isCorrect: false, correctAnswer: '李白', explanation: '李白是诗仙，他写了静夜思哦！', subject: '古诗' },
    { question: '「床前明月光」下一句？', buddyAnswer: '疑是地上霜', isCorrect: true, correctAnswer: '疑是地上霜', explanation: '对啦，月光像地上的霜一样白！', subject: '古诗' },
  ],
  '汉字': [
    { question: '「山」字像什么？', buddyAnswer: '像三座山峰', isCorrect: true, correctAnswer: '像三座山峰', explanation: '中间高两边低，就是山的样子！', subject: '汉字' },
    { question: '「水」字有几笔？', buddyAnswer: '3笔', isCorrect: false, correctAnswer: '4笔', explanation: '水字有4笔哦，数数看！', subject: '汉字' },
  ],
  '英语': [
    { question: 'Apple 是什么意思？', buddyAnswer: '香蕉', isCorrect: false, correctAnswer: '苹果', explanation: 'Apple 是红色的苹果哦！', subject: '英语' },
    { question: 'Cat 是什么动物？', buddyAnswer: '猫', isCorrect: true, correctAnswer: '猫', explanation: '对啦，cat 就是小猫咪！', subject: '英语' },
  ],
};

export function buddyQuizTask(subject: string, _difficulty: number): Promise<TaskResult<BuddyQuizData>> {
  const bank = BUDDY_QUIZ_FALLBACKS[subject] ?? BUDDY_QUIZ_FALLBACKS['数学']!;
  const fallbackData = pick(bank);
  return Promise.resolve({
    ok: true,
    data: fallbackData!,
    fallback: true,
  });
}

/** —— 每日任务生成（结构化）—— */
export interface DailyQuestPlan {
  greeting: string;
  quests: Array<{
    id: string;
    type: 'math' | 'poem' | 'logic' | 'hanzi' | 'word' | 'game';
    title: string;
    targetCount: number;
    reward: number;
    route: string;
    emoji: string;
  }>;
  cheer: string;
}

/** 本地兜底每日任务 */
export function localDailyQuestPlan(streak: number, _itemsToday: number): DailyQuestPlan {
  const templates = [
    { id: 'quest-math', type: 'math' as const, title: '练5道数学题', targetCount: 5, reward: 5, route: '/math', emoji: '🧮' },
    { id: 'quest-poem', type: 'poem' as const, title: '读1首古诗', targetCount: 1, reward: 3, route: '/poems', emoji: '🌸' },
    { id: 'quest-logic', type: 'logic' as const, title: '玩1关逻辑闯关', targetCount: 1, reward: 4, route: '/logic', emoji: '🧩' },
  ];
  return {
    greeting: streak > 0 ? `小勇士好！你已经连续学习${streak}天啦！` : '小勇士好！今天开始新冒险吧！',
    quests: templates,
    cheer: '加油加油，你最棒！',
  };
}

export function dailyQuestTask(streak: number, _weakSkills: string, itemsToday: number): Promise<TaskResult<DailyQuestPlan>> {
  const plan = localDailyQuestPlan(streak, itemsToday);
  return Promise.resolve({
    ok: true,
    data: plan,
    fallback: true,
  });
}

/** —— 情绪安抚（流式）—— */
const COMFORT_FALLBACKS = [
  '哎呀这几道题确实有点难呢，没关系，小智陪你一起看！',
  '答错不可怕，小智以前也答错过好多题呢！我们再来一次吧~',
  '没关系没关系，深呼吸一下，你已经很努力了！',
  '这几道题好狡猾呀，我们一起打败它们好不好？',
  '别灰心别灰心，小智相信你，多试几次一定能学会的！',
];

export function companionComfortTask(subject: string, count: number, weakSkill: string): StreamTask {
  return {
    scene: 'companion.comfort',
    messages: companionComfortMessages(subject, count, weakSkill),
    title: '小智安慰你',
    hint: '小智正在想怎么安慰你…',
    fallback: pick(COMFORT_FALLBACKS),
  };
}

/** —— 成就庆祝（流式）—— */
const CELEBRATE_FALLBACKS: Record<string, string> = {
  default: '哇！太厉害了！你又获得了一个新徽章！小智为你骄傲！继续加油~',
  math: '数学小达人诞生啦！你的脑袋瓜跟计算器一样快！',
  poem: '诗词小明星闪亮登场！你读诗的样子真好看！',
  letter: '英语小能手来啦！26个字母都认识你啦！',
  logic: '逻辑小天才就是你！脑瓜子转得比陀螺还快！',
};

export function companionCelebrateTask(badgeName: string, badgeDesc: string, badgeEmoji: string): StreamTask {
  const key = Object.keys(CELEBRATE_FALLBACKS).find((k) => badgeName.includes(k));
  const fallback = CELEBRATE_FALLBACKS[key ?? 'default'] ?? CELEBRATE_FALLBACKS.default!;
  return {
    scene: 'companion.celebrate',
    messages: companionCelebrateMessages(badgeName, badgeDesc, badgeEmoji),
    title: '小智庆祝你',
    hint: '小智正在为你欢呼…',
    fallback,
  };
}

/** —— 知识追问（流式）—— */
export function companionFollowUpTask(topicLabel: string, explainText: string, question: string): StreamTask {
  let fallback = `你问得真好！小智觉得${topicLabel}很有趣呢，我们一起想想吧！`;
  if (question.includes('什么意思') || question.includes('不懂')) {
    fallback = `简单来说呢，${topicLabel}就是这样一个有趣的东西，你能明白吗？`;
  } else if (question.includes('例子') || question.includes('比如')) {
    fallback = `举个例子吧！${topicLabel}就在我们身边呢，你也有这样的例子吗？`;
  } else if (question.includes('为什么')) {
    fallback = `好问题！因为呀，${topicLabel}就是这样有趣的道理，还想继续问吗？`;
  }
  return {
    scene: 'companion.followUp',
    messages: companionFollowUpMessages(topicLabel, explainText, question),
    title: '小智回答你',
    hint: '小智正在想怎么回答…',
    fallback,
  };
}
