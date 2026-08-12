import type { ExploreSlotKey, ResearchTopic } from './types';
/**
 * 研究模式 · 静态选题注册表（F2 / D1）
 * ------------------------------------------------------------------
 * 纯数据模块：所有面向儿童的文案一律走 i18n 键（C7 红线，T7 正则断言），
 * 本文件不得出现中文字面量。density 按 ADR-002 认知负荷分级。
 */

/** 支持的年龄档（与 useProfilesStore.AGE_RANGES 对齐） */
export type ResearchAgeKey = '3-4' | '5-6' | '7-8' | '9-10' | '11-12';

/** density 兜底：任何未显式登记的 ageRange 回落 5-6 档（最保守） */
export const DEFAULT_DENSITY = { core: 2, extended: 1, maxReveal: 3 };

/** ADR-002：core=首屏事实条数，extended=每次揭示增量，maxReveal=扩展层数上限 */
const DENSITY: Record<ResearchAgeKey, { core: number; extended: number; maxReveal: number }> = {
  '3-4': { core: 1, extended: 1, maxReveal: 2 },
  '5-6': { core: 2, extended: 1, maxReveal: 3 },
  '7-8': { core: 3, extended: 2, maxReveal: 4 },
  '9-10': { core: 3, extended: 2, maxReveal: 5 },
  '11-12': { core: 4, extended: 2, maxReveal: 5 },
};

export function densityFor(ageRange: string): { core: number; extended: number; maxReveal: number } {
  return DENSITY[ageRange as ResearchAgeKey] ?? DEFAULT_DENSITY;
}

export const RESEARCH_TOPICS: ResearchTopic[] = [
  {
    id: 'color',
    i18nKey: 'research.topic.color',
    emoji: '🎨',
    tone: 'pink',
    exploreSlot: 'color',
    aiContentType: 'science',
    cardMatchTags: ['color', '颜色'],
    fallbackFactsI18nKey: 'research.fallbackFacts.color',
    quizSkillKey: 'research:color',
    density: DENSITY,
  },
  {
    id: 'dino',
    i18nKey: 'research.topic.dino',
    emoji: '🦕',
    tone: 'green',
    exploreSlot: 'dino',
    aiContentType: 'science',
    cardMatchTags: ['dino', 'dinosaur', '恐龙'],
    fallbackFactsI18nKey: 'research.fallbackFacts.dino',
    quizSkillKey: 'research:dino',
    density: DENSITY,
  },
  {
    id: 'space',
    i18nKey: 'research.topic.space',
    emoji: '🚀',
    tone: 'blue',
    exploreSlot: 'space',
    aiContentType: 'science',
    cardMatchTags: ['space', 'planet', '宇宙', '行星'],
    fallbackFactsI18nKey: 'research.fallbackFacts.space',
    quizSkillKey: 'research:space',
    density: DENSITY,
  },
  {
    id: 'body',
    i18nKey: 'research.topic.body',
    emoji: '🧠',
    tone: 'pink',
    exploreSlot: 'body',
    aiContentType: 'science',
    cardMatchTags: ['body', 'human', '身体', '人体'],
    fallbackFactsI18nKey: 'research.fallbackFacts.body',
    quizSkillKey: 'research:body',
    density: DENSITY,
  },
  {
    id: 'vehicle',
    i18nKey: 'research.topic.vehicle',
    emoji: '🚗',
    tone: 'orange',
    exploreSlot: 'vehicle',
    aiContentType: 'riddle',
    cardMatchTags: ['vehicle', 'car', '车辆', '汽车'],
    fallbackFactsI18nKey: 'research.fallbackFacts.vehicle',
    quizSkillKey: 'research:vehicle',
    density: DENSITY,
  },
  {
    id: 'job',
    i18nKey: 'research.topic.job',
    emoji: '👩‍🚒',
    tone: 'purple',
    exploreSlot: 'job',
    aiContentType: 'story',
    cardMatchTags: ['job', '职业'],
    fallbackFactsI18nKey: 'research.fallbackFacts.job',
    quizSkillKey: 'research:job',
    density: DENSITY,
  },
] as const;

export const TOPIC_MAP = new Map<string, ResearchTopic>(RESEARCH_TOPICS.map((t) => [t.id, t]));

/** 探索槽 lazy 注册表键集（T7 断言 exploreSlot ∈ 此集合） */
export const SLOT_KEYS: readonly ExploreSlotKey[] = [
  'color',
  'vehicle',
  'job',
  'dino',
  'space',
  'body',
];

export function getTopic(topicId: string): ResearchTopic | null {
  return TOPIC_MAP.get(topicId) ?? null;
}
