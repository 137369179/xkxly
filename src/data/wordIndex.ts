import { WORD_THEMES, type WordEntry, type WordTheme } from './words';

export { WORD_THEMES } from './words';
export type { WordEntry, WordTheme } from './words';

/**
 * 获取所有单词
 */
export function getAllWords(): WordEntry[] {
  return WORD_THEMES.flatMap((theme) => theme.words);
}

/**
 * 按主题获取单词
 */
export function getWordsByTheme(themeId: string): WordEntry[] {
  const theme = WORD_THEMES.find((t) => t.id === themeId);
  return theme ? theme.words : [];
}

/**
 * 按关键词搜索单词（支持英文单词和中文意思）
 */
export function searchWords(query: string): WordEntry[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return [];
  return getAllWords().filter(
    (w) =>
      w.word.toLowerCase().includes(lower) ||
      w.zh.includes(lower) ||
      w.sentence.toLowerCase().includes(lower) ||
      w.sentenceZh.includes(lower),
  );
}

/**
 * 根据英文单词精确查找
 */
export function getWordByWord(word: string): WordEntry | undefined {
  const lower = word.toLowerCase().trim();
  return getAllWords().find((w) => w.word.toLowerCase() === lower);
}

/**
 * 获取所有主题（不含单词数据，用于列表展示）
 */
export function getThemes(): Omit<WordTheme, 'words'>[] {
  return WORD_THEMES.map(({ words: _words, ...rest }) => rest);
}

/**
 * 按难度获取单词
 */
export function getWordsByLevel(level: 1 | 2 | 3): WordEntry[] {
  return getAllWords().filter((w) => w.level === level);
}

/**
 * 获取单词总数
 */
export function getWordCount(): number {
  return getAllWords().length;
}
