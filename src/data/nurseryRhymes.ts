import type { Tone } from '@/lib/tones';

/**
 * 儿歌数据集（A5 · 跨模块内容形态扩展）
 * ------------------------------------------------------------
 * 设计依据：洪恩/巧虎等幼儿启蒙产品中，儿歌是最早能吸引低龄儿童的内容形态。
 * 拼音/汉字模块需要"听→说"的过渡，儿歌以押韵节奏提供自然的语言输入，
 * 同时承担跨模块知识点串联：数数儿歌关联数字、动物儿歌关联英语单词、
 * 古诗韵律延伸到儿歌等。
 *
 * 数据来源：精选 8 首中文公共领域经典儿歌，按主题分类，每首关联 1-2 个学习模块。
 */

export type RhymeTheme = 'animals' | 'nature' | 'number' | 'daily' | 'family';

export interface NurseryRhyme {
  id: string;
  title: string;
  emoji: string;
  theme: RhymeTheme;
  tone: Tone;
  /** 一句话简介 */
  desc: string;
  /** 逐行歌词（用于逐句朗读与展示） */
  lyrics: string[];
  /** 关联的知识点前缀，用于跨模块联动（如 number → 数字王国） */
  relatedPrefix?: string;
  /** 教育寓意 */
  moral: string;
  /** 适合年龄下限 */
  ageMin: 2 | 3 | 4 | 5;
}

export const NURSERY_RHYMES: NurseryRhyme[] = [
  {
    id: 'two-tigers',
    title: '两只老虎',
    emoji: '🐯',
    theme: 'animals',
    tone: 'orange',
    desc: '经典趣味儿歌，韵律简单',
    lyrics: ['两只老虎，两只老虎，', '跑得快，跑得快，', '一只没有耳朵，', '一只没有尾巴，', '真奇怪！真奇怪！'],
    relatedPrefix: 'number',
    moral: '培养节奏感与观察力',
    ageMin: 2,
  },
  {
    id: 'little-star',
    title: '小星星',
    emoji: '⭐',
    theme: 'nature',
    tone: 'yellow',
    desc: '夜空里的温柔童谣',
    lyrics: ['一闪一闪亮晶晶，', '满天都是小星星，', '挂在天上放光明，', '好像许多小眼睛，', '一闪一闪亮晶晶，', '满天都是小星星。'],
    relatedPrefix: 'poem',
    moral: '感受夜空的美丽与想象',
    ageMin: 3,
  },
  {
    id: 'count-ducks',
    title: '数鸭子',
    emoji: '🦆',
    theme: 'number',
    tone: 'green',
    desc: '边唱边学数数',
    lyrics: ['门前大桥下，', '游过一群鸭，', '快来快来数一数，', '二四六七八。', '咕嘎咕嘎，真呀真多呀，', '数不清到底多少鸭。'],
    relatedPrefix: 'number',
    moral: '在歌唱中熟悉数字顺序',
    ageMin: 3,
  },
  {
    id: 'little-rabbit',
    title: '小兔子乖乖',
    emoji: '🐰',
    theme: 'animals',
    tone: 'pink',
    desc: '安全教育启蒙',
    lyrics: ['小兔子乖乖，把门儿开开，', '快点儿开开，我要进来。', '不开不开我不开，', '妈妈没回来，', '谁来也不开。'],
    relatedPrefix: 'word',
    moral: '学会自我保护，不轻信陌生人',
    ageMin: 3,
  },
  {
    id: 'pull-radish',
    title: '拔萝卜',
    emoji: '🥕',
    theme: 'daily',
    tone: 'orange',
    desc: '团结力量大',
    lyrics: ['拔萝卜，拔萝卜，', '嘿哟嘿哟，拔萝卜，', '嘿哟嘿哟，拔不动。', '老奶奶，快快来，', '快来帮我们拔萝卜。'],
    relatedPrefix: 'hanzi',
    moral: '团结合作才能完成任务',
    ageMin: 2,
  },
  {
    id: 'spring-is-coming',
    title: '春天在哪里',
    emoji: '🌸',
    theme: 'nature',
    tone: 'pink',
    desc: '寻找春天的颜色',
    lyrics: ['春天在哪里呀，', '春天在哪里，', '春天在那青翠的山林里。', '这里有红花呀，', '这里有绿草，', '还有那会唱歌的小黄鹂。'],
    relatedPrefix: 'poem',
    moral: '观察自然，感受四季变化',
    ageMin: 4,
  },
  {
    id: 'abc-song',
    title: '字母歌',
    emoji: '🔤',
    theme: 'daily',
    tone: 'blue',
    desc: '26 个字母唱出来',
    lyrics: ['A B C D E F G,', 'H I J K L M N,', 'O P Q, R S T,', 'U V W, X Y Z,', 'Now I know my ABCs,', 'Next time won\'t you sing with me?'],
    relatedPrefix: 'letter',
    moral: '通过旋律轻松记住 26 个字母',
    ageMin: 3,
  },
  {
    id: 'my-family',
    title: '我的好妈妈',
    emoji: '👩',
    theme: 'family',
    tone: 'pink',
    desc: '感恩家人的爱',
    lyrics: ['我的好妈妈，', '下班回到家，', '请喝一杯茶，', '让我亲亲您吧，', '我的好妈妈。'],
    relatedPrefix: 'word',
    moral: '学会感恩与表达爱意',
    ageMin: 3,
  },
  {
    id: 'wheels-on-bus',
    title: '公交车转呀转',
    emoji: '🚌',
    theme: 'daily',
    tone: 'yellow',
    desc: '英文启蒙儿歌',
    lyrics: ['The wheels on the bus go round and round,', 'round and round, round and round.', 'The wheels on the bus go round and round,', 'all through the town.'],
    relatedPrefix: 'word',
    moral: '在英文儿歌中熟悉日常表达',
    ageMin: 4,
  },
  {
    id: 'rain-rain',
    title: '小雨小雨',
    emoji: '🌧️',
    theme: 'nature',
    tone: 'blue',
    desc: '雨天的童趣',
    lyrics: ['小雨小雨沙沙沙，', '种子种子在说话，', '哎呀呀，雨水真甜，', '哎哟哟，我要发芽。'],
    relatedPrefix: 'pinyin',
    moral: '感受自然循环与生命成长',
    ageMin: 3,
  },
];

export const RHYME_MAP = new Map(NURSERY_RHYMES.map((r) => [r.id, r]));

/** 主题标签映射 */
export const THEME_LABEL: Record<RhymeTheme, { label: string; emoji: string }> = {
  animals: { label: '动物', emoji: '🐾' },
  nature: { label: '自然', emoji: '🌿' },
  number: { label: '数数', emoji: '🔢' },
  daily: { label: '生活', emoji: '🌈' },
  family: { label: '家人', emoji: '👨‍👩‍👧' },
};

/** 按主题分组 */
export function rhymesByTheme(): Record<RhymeTheme, NurseryRhyme[]> {
  const result: Record<RhymeTheme, NurseryRhyme[]> = {
    animals: [],
    nature: [],
    number: [],
    daily: [],
    family: [],
  };
  for (const r of NURSERY_RHYMES) {
    result[r.theme].push(r);
  }
  return result;
}
