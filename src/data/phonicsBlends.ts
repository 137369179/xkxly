/**
 * Phonics 自然拼读 Level 3 - 双字母组合 (Blends & Digraphs) 数据库
 * ------------------------------------------------------------
 * 包含：sh, ch, th, ph, ee, oo, ea, ai 等经典双字母发音与美音例词
 */

export interface BlendRule {
  combo: string;
  sound: string;
  desc: string;
  emoji: string;
  examples: { word: string; zh: string; highlight: string }[];
}

export const PHONICS_BLENDS: BlendRule[] = [
  {
    combo: 'sh',
    sound: 'ʃ',
    desc: '发“嘘——”的声音，嘴唇稍稍撅起',
    emoji: '🚢',
    examples: [
      { word: 'ship', zh: '轮船', highlight: 'sh' },
      { word: 'fish', zh: '小鱼', highlight: 'sh' },
      { word: 'shoe', zh: '鞋子', highlight: 'sh' },
      { word: 'sheep', zh: '绵羊', highlight: 'sh' },
    ],
  },
  {
    combo: 'ch',
    sound: 'tʃ',
    desc: '发“吃”短音，舌尖抵住上齿龈',
    emoji: '🐥',
    examples: [
      { word: 'chick', zh: '小鸡', highlight: 'ch' },
      { word: 'chair', zh: '椅子', highlight: 'ch' },
      { word: 'beach', zh: '海滩', highlight: 'ch' },
      { word: 'chess', zh: '象棋', highlight: 'ch' },
    ],
  },
  {
    combo: 'th',
    sound: 'θ / ð',
    desc: '轻咬舌尖吹气发音（如 this / math）',
    emoji: '👍',
    examples: [
      { word: 'this', zh: '这个', highlight: 'th' },
      { word: 'math', zh: '数学', highlight: 'th' },
      { word: 'three', zh: '数字3', highlight: 'th' },
      { word: 'teeth', zh: '牙齿', highlight: 'th' },
    ],
  },
  {
    combo: 'ph',
    sound: 'f',
    desc: '发“f”音，上齿轻触下唇吹气',
    emoji: '📱',
    examples: [
      { word: 'phone', zh: '电话', highlight: 'ph' },
      { word: 'photo', zh: '照片', highlight: 'ph' },
      { word: 'dolphin', zh: '海豚', highlight: 'ph' },
    ],
  },
  {
    combo: 'ee',
    sound: 'iː',
    desc: '长元音，嘴角向两边拉开微笑发“衣——”',
    emoji: '🐝',
    examples: [
      { word: 'bee', zh: '蜜蜂', highlight: 'ee' },
      { word: 'tree', zh: '大树', highlight: 'ee' },
      { word: 'green', zh: '绿色', highlight: 'ee' },
      { word: 'feet', zh: '脚丫', highlight: 'ee' },
    ],
  },
  {
    combo: 'oo',
    sound: 'uː / ʊ',
    desc: '发“乌——”长音或短“乌”',
    emoji: '🦁',
    examples: [
      { word: 'zoo', zh: '动物园', highlight: 'oo' },
      { word: 'book', zh: '书本', highlight: 'oo' },
      { word: 'moon', zh: '月亮', highlight: 'oo' },
      { word: 'food', zh: '食物', highlight: 'oo' },
    ],
  },
  {
    combo: 'ea',
    sound: 'iː',
    desc: '长元音“衣——”或短元音“Short e”',
    emoji: '🍵',
    examples: [
      { word: 'tea', zh: '茶叶', highlight: 'ea' },
      { word: 'read', zh: '阅读', highlight: 'ea' },
      { word: 'leaf', zh: '树叶', highlight: 'ea' },
      { word: 'sea', zh: '大海', highlight: 'ea' },
    ],
  },
  {
    combo: 'ai',
    sound: 'eɪ',
    desc: '双元音“爱——”，从 e 滑向 i',
    emoji: '🌧️',
    examples: [
      { word: 'rain', zh: '下雨', highlight: 'ai' },
      { word: 'train', zh: '火车', highlight: 'ai' },
      { word: 'paint', zh: '颜料', highlight: 'ai' },
    ],
  },
];
