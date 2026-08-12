/**
 * 英语日常句子数据 · 5 主题 30 句
 * ------------------------------------------------------------------
 * 每句含英文/中文/拼音/emoji/主题/难度
 */

export interface Sentence {
  id: string;
  en: string;
  zh: string;
  emoji: string;
  theme: string;
  level: 1 | 2 | 3;
  words: string[]; // 逐词拆分用于跟读
}

export const SENTENCE_THEMES = [
  { id: 'greeting', name: '打招呼', emoji: '👋', tone: 'blue' as const },
  { id: 'family', name: '家庭', emoji: '👨‍👩‍👧', tone: 'orange' as const },
  { id: 'food', name: '饮食', emoji: '🍎', tone: 'yellow' as const },
  { id: 'nature', name: '自然', emoji: '🌳', tone: 'green' as const },
  { id: 'daily', name: '日常', emoji: '☀️', tone: 'purple' as const },
];

export const SENTENCES: Sentence[] = [
  // 打招呼
  { id: 's1', en: 'Hello, how are you?', zh: '你好，你好吗？', emoji: '👋', theme: 'greeting', level: 1, words: ['Hello', 'how', 'are', 'you'] },
  { id: 's2', en: 'Good morning!', zh: '早上好！', emoji: '🌅', theme: 'greeting', level: 1, words: ['Good', 'morning'] },
  { id: 's3', en: 'Nice to meet you.', zh: '很高兴认识你。', emoji: '😊', theme: 'greeting', level: 2, words: ['Nice', 'to', 'meet', 'you'] },
  { id: 's4', en: 'See you tomorrow!', zh: '明天见！', emoji: '👋', theme: 'greeting', level: 1, words: ['See', 'you', 'tomorrow'] },
  { id: 's5', en: 'Thank you very much!', zh: '非常感谢！', emoji: '🙏', theme: 'greeting', level: 1, words: ['Thank', 'you', 'very', 'much'] },
  { id: 's6', en: 'What is your name?', zh: '你叫什么名字？', emoji: '🤔', theme: 'greeting', level: 2, words: ['What', 'is', 'your', 'name'] },

  // 家庭
  { id: 's7', en: 'I love my mom.', zh: '我爱我的妈妈。', emoji: '👩', theme: 'family', level: 1, words: ['I', 'love', 'my', 'mom'] },
  { id: 's8', en: 'This is my dad.', zh: '这是我爸爸。', emoji: '👨', theme: 'family', level: 1, words: ['This', 'is', 'my', 'dad'] },
  { id: 's9', en: 'We are a happy family.', zh: '我们是快乐的一家。', emoji: '👨‍👩‍👧', theme: 'family', level: 2, words: ['We', 'are', 'a', 'happy', 'family'] },
  { id: 's10', en: 'My brother is tall.', zh: '我哥哥很高。', emoji: '👦', theme: 'family', level: 2, words: ['My', 'brother', 'is', 'tall'] },
  { id: 's11', en: 'My sister likes to sing.', zh: '我姐姐喜欢唱歌。', emoji: '👧', theme: 'family', level: 3, words: ['My', 'sister', 'likes', 'to', 'sing'] },
  { id: 's12', en: 'Grandma tells stories.', zh: '奶奶讲故事。', emoji: '👵', theme: 'family', level: 2, words: ['Grandma', 'tells', 'stories'] },

  // 饮食
  { id: 's13', en: 'I like apples.', zh: '我喜欢苹果。', emoji: '🍎', theme: 'food', level: 1, words: ['I', 'like', 'apples'] },
  { id: 's14', en: 'The water is cold.', zh: '水很凉。', emoji: '💧', theme: 'food', level: 1, words: ['The', 'water', 'is', 'cold'] },
  { id: 's15', en: 'I want some milk.', zh: '我想喝牛奶。', emoji: '🥛', theme: 'food', level: 2, words: ['I', 'want', 'some', 'milk'] },
  { id: 's16', en: 'The cake is sweet.', zh: '蛋糕很甜。', emoji: '🍰', theme: 'food', level: 2, words: ['The', 'cake', 'is', 'sweet'] },
  { id: 's17', en: 'I eat rice every day.', zh: '我每天吃米饭。', emoji: '🍚', theme: 'food', level: 2, words: ['I', 'eat', 'rice', 'every', 'day'] },
  { id: 's18', en: 'Bananas are yellow.', zh: '香蕉是黄色的。', emoji: '🍌', theme: 'food', level: 1, words: ['Bananas', 'are', 'yellow'] },

  // 自然
  { id: 's19', en: 'The sun is bright.', zh: '太阳很亮。', emoji: '☀️', theme: 'nature', level: 1, words: ['The', 'sun', 'is', 'bright'] },
  { id: 's20', en: 'I see a bird.', zh: '我看到一只鸟。', emoji: '🐦', theme: 'nature', level: 1, words: ['I', 'see', 'a', 'bird'] },
  { id: 's21', en: 'The sky is blue.', zh: '天空是蓝色的。', emoji: '🌌', theme: 'nature', level: 1, words: ['The', 'sky', 'is', 'blue'] },
  { id: 's22', en: 'Look at the rainbow!', zh: '看彩虹！', emoji: '🌈', theme: 'nature', level: 2, words: ['Look', 'at', 'the', 'rainbow'] },
  { id: 's23', en: 'The tree is very tall.', zh: '这棵树很高。', emoji: '🌳', theme: 'nature', level: 2, words: ['The', 'tree', 'is', 'very', 'tall'] },
  { id: 's24', en: 'Flowers are beautiful.', zh: '花很美丽。', emoji: '🌸', theme: 'nature', level: 2, words: ['Flowers', 'are', 'beautiful'] },

  // 日常
  { id: 's25', en: 'I go to school.', zh: '我去上学。', emoji: '🏫', theme: 'daily', level: 1, words: ['I', 'go', 'to', 'school'] },
  { id: 's26', en: 'It is time to play.', zh: '该玩了。', emoji: '🎮', theme: 'daily', level: 2, words: ['It', 'is', 'time', 'to', 'play'] },
  { id: 's27', en: 'I can read a book.', zh: '我会读书。', emoji: '📖', theme: 'daily', level: 2, words: ['I', 'can', 'read', 'a', 'book'] },
  { id: 's28', en: 'Let us sing a song!', zh: '我们唱歌吧！', emoji: '🎵', theme: 'daily', level: 2, words: ['Let', 'us', 'sing', 'a', 'song'] },
  { id: 's29', en: 'I am very happy today.', zh: '我今天很开心。', emoji: '😄', theme: 'daily', level: 3, words: ['I', 'am', 'very', 'happy', 'today'] },
  { id: 's30', en: 'Time to go to bed.', zh: '该睡觉了。', emoji: '🛏️', theme: 'daily', level: 2, words: ['Time', 'to', 'go', 'to', 'bed'] },
];

export function getSentencesByTheme(theme: string): Sentence[] {
  return SENTENCES.filter(s => s.theme === theme);
}

export function getAllSentences(): Sentence[] {
  return SENTENCES;
}
