/**
 * AI 任务 · 成语模块
 * ------------------------------------------------------------------
 * idiomStoryTask    —— AI 成语故事讲解（流式）
 * idiomSentenceTask —— AI 成语造句（结构化，3 个场景各一句）
 * idiomHintTask     —— AI 成语接龙智能提示（结构化，不给答案只给线索）
 *
 * 本地兜底永远可用：AI 挂了孩子也绝不冷场。
 */
import {
  idiomStoryMessages,
  idiomSentenceMessages,
  idiomHintMessages,
} from '../prompts';
import { chat } from '@/lib/ai/client';
import { sanitizeStructuredText } from '@/lib/ai/guard';
import { safeParseJSON } from '@/lib/safeStorage';
import type { StreamTask, TaskResult } from './types';
import type { Idiom } from '@/data/idioms';

/* ================================================================
 * 1. AI 成语故事讲解（流式）
 * ================================================================ */

/** 本地兜底故事：用已有 story 字段 + 润色 */
export function localIdiomStory(idiom: Idiom): string {
  return `宝贝，来听「${idiom.word}」的故事！\n\n${idiom.story}\n\n所以呀，${idiom.meaning}记住了吗？${idiom.emoji}`;
}

/** 成语故事讲解任务（流式） */
export function idiomStoryTask(idiom: Idiom): StreamTask {
  return {
    scene: 'idiom.story',
    messages: idiomStoryMessages(idiom),
    cacheKey: `idiomStory:${idiom.id}`,
    cacheTtl: 7 * 24 * 60 * 60 * 1000,
    title: `小茜讲「${idiom.word}」`,
    hint: `正在给宝贝讲「${idiom.word}」的故事…`,
    fallback: localIdiomStory(idiom),
  };
}

/* ================================================================
 * 2. AI 成语造句（结构化）
 * ================================================================ */

export interface IdiomSentenceData {
  /** 三个场景的造句 */
  sentences: Array<{
    scene: string;
    text: string;
  }>;
}

/** 本地兜底造句 */
export function localIdiomSentences(idiom: Idiom): IdiomSentenceData {
  return {
    sentences: [
      { scene: '学校', text: `老师说要我们${idiom.word}，不要浪费时间。` },
      { scene: '家庭', text: `妈妈说做饭的时候${idiom.word}，一次做两道菜。` },
      { scene: '户外', text: `在公园里${idiom.word}，一边玩一边学。` },
    ],
  };
}

/** 成语造句任务（结构化，返回 3 个场景的例句） */
export async function idiomSentenceTask(idiom: Idiom): Promise<TaskResult<IdiomSentenceData>> {
  const fallbackData = localIdiomSentences(idiom);
  try {
    const r = await chat({
      scene: 'idiom.sentence',
      messages: idiomSentenceMessages(idiom),
      cacheKey: `idiomSentence:${idiom.id}`,
      cacheTtl: 7 * 24 * 60 * 60 * 1000,
    });
    if (!r.ok) {
      return { ok: false, data: fallbackData, fallback: true, ...(r.error ? { error: r.error } : {}), ...(r.ms !== undefined ? { ms: r.ms } : {}) };
    }
    const parsed = sanitizeStructuredText<
      { sentences?: Array<{ scene?: string; text?: string }> }
    >(safeParseJSON<{ sentences?: Array<{ scene?: string; text?: string }> }>(r.text, {}));
    const sentences = (parsed.sentences ?? [])
      .filter((s) => s && typeof s.text === 'string' && s.text.length > 0)
      .slice(0, 3)
      .map((s) => ({ scene: s.scene ?? '学校', text: s.text as string }));
    if (sentences.length === 0) return { ok: true, data: fallbackData, fallback: true, ...(r.ms !== undefined ? { ms: r.ms } : {}) };
    return { ok: true, data: { sentences }, fallback: false, ...(r.ms !== undefined ? { ms: r.ms } : {}) };
  } catch {
    return { ok: false, data: fallbackData, fallback: true };
  }
}

/* ================================================================
 * 3. AI 成语接龙智能提示（结构化）
 * ================================================================ */

export interface IdiomHintData {
  /** 提示的首字 */
  char: string;
  /** 首字拼音 */
  pinyin: string;
  /** 关联 emoji */
  emoji: string;
  /** 线索描述，不直接给答案 */
  clue: string;
}

/** 本地兜底提示：从 IDIOMS 里找一个匹配首字的成语 */
export function localIdiomHint(lastChar: string): IdiomHintData {
  const pinyinMap: Record<string, string> = {
    '一': 'yī', '二': 'èr', '三': 'sān', '四': 'sì', '五': 'wǔ',
    '六': 'liù', '七': 'qī', '八': 'bā', '九': 'jiǔ', '十': 'shí',
    '百': 'bǎi', '千': 'qiān', '万': 'wàn', '大': 'dà', '小': 'xiǎo',
    '天': 'tiān', '地': 'dì', '人': 'rén', '心': 'xīn', '水': 'shuǐ',
    '火': 'huǒ', '风': 'fēng', '花': 'huā', '鸟': 'niǎo', '鱼': 'yú',
    '马': 'mǎ', '龙': 'lóng', '虎': 'hǔ', '鸡': 'jī', '画': 'huà',
    '自': 'zì', '雪': 'xuě', '春': 'chūn', '秋': 'qiū',
    '冰': 'bīng', '叶': 'yè', '杯': 'bēi', '打': 'dǎ', '半': 'bàn',
    '井': 'jǐng', '狐': 'hú', '守': 'shǒu', '亡': 'wáng', '对': 'duì',
    '闻': 'wén', '胸': 'xiōng', '刻': 'kè', '拔': 'bá', '坐': 'zuò',
    '愚': 'yú', '鹏': 'péng', '蛛': 'zhū', '鹤': 'hè', '蜂': 'fēng',
    '黔': 'qián', '金': 'jīn', '盲': 'máng',
  };
  const emojiMap: Record<string, string> = {
    '一': '1️⃣', '二': '2️⃣', '三': '3️⃣', '四': '4️⃣', '五': '5️⃣',
    '六': '6️⃣', '七': '7️⃣', '八': '8️⃣', '九': '9️⃣', '十': '🔟',
    '百': '💯', '千': '🔑', '万': '🌟', '大': '🐘', '小': '🐜',
    '天': '☀️', '地': '🌍', '人': '👤', '心': '❤️', '水': '💧',
    '火': '🔥', '风': '🌪️', '花': '🌸', '鸟': '🐦', '鱼': '🐟',
    '马': '🐎', '龙': '🐉', '虎': '🐯', '鸡': '🐔', '画': '🎨',
    '自': '😀', '雪': '❄️', '春': '🌱', '秋': '🍂', '冰': '🧊',
    '叶': '🍃', '杯': '🥤', '打': '👋', '半': '🌗', '井': '🕳️',
    '狐': '🦊', '守': '🛡️', '亡': '🐑', '对': '🎯', '闻': '👃',
    '胸': '🫁', '刻': '🔪', '拔': '🙌', '坐': '🪑', '愚': '👴',
    '鹏': '🦅', '蛛': '🕷️', '鹤': '🦩', '蜂': '🐝', '黔': '🫏',
    '金': '✨', '盲': '🙈',
  };

  return {
    char: lastChar,
    pinyin: pinyinMap[lastChar] ?? '?',
    emoji: emojiMap[lastChar] ?? '❓',
    clue: `想想看，哪个成语的第一个字是「${lastChar}」呢？`,
  };
}

/** 成语接龙提示任务（结构化）——首字+拼音+emoji+线索，不直接给答案 */
export async function idiomHintTask(lastChar: string, usedIdioms?: string[]): Promise<TaskResult<IdiomHintData>> {
  const fallbackData = localIdiomHint(lastChar);
  try {
    const r = await chat({
      scene: 'idiom.hint',
      messages: idiomHintMessages(lastChar, usedIdioms ?? []),
      cacheKey: `idiomHint:${lastChar}:${(usedIdioms ?? []).join(',')}`.slice(0, 120),
      cacheTtl: 24 * 60 * 60 * 1000,
    });
    if (!r.ok) {
      return { ok: false, data: fallbackData, fallback: true, ...(r.error ? { error: r.error } : {}), ...(r.ms !== undefined ? { ms: r.ms } : {}) };
    }
    const parsed = sanitizeStructuredText<
      { char?: string; pinyin?: string; emoji?: string; clue?: string }
    >(safeParseJSON<{ char?: string; pinyin?: string; emoji?: string; clue?: string }>(r.text, {}));
    if (!parsed.char || !parsed.clue) return { ok: true, data: fallbackData, fallback: true, ...(r.ms !== undefined ? { ms: r.ms } : {}) };
    return {
      ok: true,
      data: {
        char: parsed.char,
        pinyin: parsed.pinyin ?? '',
        emoji: parsed.emoji ?? '❓',
        clue: parsed.clue,
      },
      fallback: false,
      ...(r.ms !== undefined ? { ms: r.ms } : {}),
    };
  } catch {
    return { ok: false, data: fallbackData, fallback: true };
  }
}
