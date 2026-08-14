/**
 * 英语高频词表（Dolch Sight Words，分学段）
 * ------------------------------------------------------------
 * Dolch 词表是英美幼儿园到小学三年级最常用的 220 个高频词，
 * 掌握后即可读懂儿童读物 75% 的词汇。本项目按幼儿学习阶段分组：
 *   1 = 启蒙（Pre-Primer）   2 = 一年级（Primer + Grade 1）
 *   3 = 二年级（Grade 2）
 * 用于替换 WordsPage「Sight Words 宝盒」的硬编码 8 词，并按学段取词。
 */

export interface SightWordSet {
  grade: 1 | 2 | 3;
  name: string;
  desc: string;
  emoji: string;
  words: string[];
}

export const SIGHT_WORD_SETS: SightWordSet[] = [
  {
    grade: 1,
    name: '启蒙高频词',
    desc: '幼儿园最常用的 40 个词',
    emoji: '🌱',
    words: [
      'a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for',
      'funny', 'go', 'help', 'here', 'i', 'in', 'is', 'it', 'jump', 'little',
      'look', 'make', 'me', 'my', 'not', 'one', 'play', 'red', 'run', 'said',
      'see', 'the', 'three', 'to', 'two', 'up', 'we', 'where', 'yellow', 'you',
    ],
  },
  {
    grade: 2,
    name: '一年级高频词',
    desc: '一年级掌握后能读简单句子',
    emoji: '🌿',
    words: [
      'all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came',
      'did', 'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like',
      'must', 'new', 'no', 'now', 'on', 'our', 'out', 'please', 'pretty', 'ran',
      'ride', 'saw', 'say', 'she', 'so', 'soon', 'that', 'there', 'they', 'this',
      'too', 'under', 'want', 'was', 'well', 'went', 'what', 'white', 'who', 'will',
      'with', 'yes', 'after', 'again', 'an', 'any', 'as', 'ask', 'by', 'could',
      'every', 'fly', 'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his',
      'how', 'just', 'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open',
      'over', 'put', 'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think',
      'walk', 'were', 'when',
    ],
  },
  {
    grade: 3,
    name: '二年级高频词',
    desc: '二年级词汇，向自主阅读过渡',
    emoji: '🌳',
    words: [
      'always', 'around', 'because', 'been', 'before', 'best', 'both', 'buy', 'call', 'cold',
      'don\'t', 'does', 'fast', 'first', 'five', 'found', 'gave', 'goes', 'green', 'its', 'made',
      'many', 'off', 'or', 'pull', 'read', 'right', 'sing', 'sit', 'sleep', 'tell',
      'their', 'these', 'those', 'upon', 'us', 'use', 'very', 'wash', 'which', 'why',
      'wish', 'work', 'would', 'write', 'your',
    ],
  },
];

/** 获取全部高频词 */
export function getAllSightWords(): string[] {
  return SIGHT_WORD_SETS.flatMap((s) => s.words);
}

/** 按学段获取高频词 */
export function getSightWordsByGrade(grade: 1 | 2 | 3): string[] {
  return SIGHT_WORD_SETS.find((s) => s.grade === grade)?.words ?? [];
}

/** 获取高频词总数 */
export function getSightWordCount(): number {
  return getAllSightWords().length;
}
