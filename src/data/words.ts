export interface WordEntry {
  /** 英文单词 */
  word: string;
  /** 中文意思 */
  zh: string;
  /** 音标（美式） */
  phonetic: string;
  /** 自然拼读发音提示 */
  phonics: string;
  /** 字母数 */
  len: number;
  /** Phonics 难度 1=单音节 2=双音节 3=多音节 */
  level: 1 | 2 | 3;
  /** 示例句子 */
  sentence: string;
  /** 中文句子 */
  sentenceZh: string;
  /** emoji 或图片描述 */
  emoji: string;
  /** 学段 1=学前启蒙 2=一年级 3=二年级（可选，缺省时按 level 推断） */
  grade?: 1 | 2 | 3;
  /** 词族 id（如 'at' / 'an' / 'ake'，用于拼读迁移练习，可选） */
  family?: string;
  /** 重音音节标记（多音节词，如 tiger → 'tig'，可选） */
  stressed?: string;
}

/**
 * 推断学段：显式 grade 优先，否则按 level 映射（1→1 学前 / 2→2 一年级 / 3→3 二年级）
 */
export function gradeOf(word: Pick<WordEntry, 'grade' | 'level'>): 1 | 2 | 3 {
  return word.grade ?? (word.level as 1 | 2 | 3);
}

export interface WordTheme {
  id: string;
  name: string;
  emoji: string;
  tone: 'green' | 'blue' | 'yellow' | 'pink' | 'purple' | 'orange';
  desc: string;
  words: WordEntry[];
}

export const WORD_THEMES: WordTheme[] = [
  {
    id: 'animals',
    name: '动物',
    emoji: '🐱',
    tone: 'green',
    desc: '可爱的动物朋友们',
    words: [
      { word: 'cat', zh: '猫', phonetic: '/kæt/', phonics: '/k/ /æ/ /t/', len: 3, level: 1, sentence: 'I have a cat.', sentenceZh: '我有一只猫。', emoji: '🐱' },
      { word: 'dog', zh: '狗', phonetic: '/dɔɡ/', phonics: '/d/ /ɒ/ /g/', len: 3, level: 1, sentence: 'The dog is running.', sentenceZh: '小狗在跑步。', emoji: '🐶' },
      { word: 'pig', zh: '猪', phonetic: '/pɪɡ/', phonics: '/p/ /ɪ/ /g/', len: 3, level: 1, sentence: 'The pig is pink.', sentenceZh: '小猪是粉色的。', emoji: '🐷' },
      { word: 'cow', zh: '牛', phonetic: '/kaʊ/', phonics: '/k/ /aʊ/', len: 3, level: 1, sentence: 'The cow gives milk.', sentenceZh: '奶牛产牛奶。', emoji: '🐮' },
      { word: 'hen', zh: '母鸡', phonetic: '/hen/', phonics: '/h/ /e/ /n/', len: 3, level: 1, sentence: 'The hen lays eggs.', sentenceZh: '母鸡下蛋。', emoji: '🐔' },
      { word: 'fox', zh: '狐狸', phonetic: '/fɒks/', phonics: '/f/ /ɒ/ /k/ /s/', len: 3, level: 1, sentence: 'The fox is clever.', sentenceZh: '狐狸很聪明。', emoji: '🦊' },
      { word: 'duck', zh: '鸭子', phonetic: '/dʌk/', phonics: '/d/ /ʌ/ /k/', len: 4, level: 1, sentence: 'The duck can swim.', sentenceZh: '鸭子会游泳。', emoji: '🦆' },
      { word: 'fish', zh: '鱼', phonetic: '/fɪʃ/', phonics: '/f/ /ɪ/ /sh/', len: 4, level: 1, sentence: 'I see a fish.', sentenceZh: '我看到一条鱼。', emoji: '🐟' },
      { word: 'bird', zh: '鸟', phonetic: '/bɜːrd/', phonics: '/b/ /ɜːr/ /d/', len: 4, level: 1, sentence: 'The bird can fly.', sentenceZh: '鸟儿会飞。', emoji: '🐦' },
      { word: 'bear', zh: '熊', phonetic: '/ber/', phonics: '/b/ /e/ /r/', len: 4, level: 1, sentence: 'The bear is big.', sentenceZh: '熊很大。', emoji: '🐻' },
      { word: 'lion', zh: '狮子', phonetic: '/ˈlaɪən/', phonics: '/l/ /aɪ/ /ə/ /n/', len: 4, level: 2, sentence: 'The lion is strong.', sentenceZh: '狮子很强壮。', emoji: '🦁' },
      { word: 'tiger', zh: '老虎', phonetic: '/ˈtaɪɡər/', phonics: '/t/ /aɪ/ /g/ /ər/', len: 5, level: 2, sentence: 'The tiger runs fast.', sentenceZh: '老虎跑得快。', emoji: '🐯' },
      { word: 'rabbit', zh: '兔子', phonetic: '/ˈræbɪt/', phonics: '/r/ /æ/ /b/ /ɪ/ /t/', len: 6, level: 2, sentence: 'The rabbit likes carrots.', sentenceZh: '兔子喜欢胡萝卜。', emoji: '🐰' },
      { word: 'monkey', zh: '猴子', phonetic: '/ˈmʌŋki/', phonics: '/m/ /ʌ/ /ng/ /k/ /ee/', len: 6, level: 2, sentence: 'The monkey climbs trees.', sentenceZh: '猴子爬树。', emoji: '🐵' },
      { word: 'elephant', zh: '大象', phonetic: '/ˈeləfənt/', phonics: '/e/ /l/ /ə/ /f/ /ə/ /n/ /t/', len: 8, level: 3, sentence: 'The elephant is huge.', sentenceZh: '大象很大。', emoji: '🐘' },
      { word: 'panda', zh: '熊猫', phonetic: '/ˈpændə/', phonics: '/p/ /æ/ /n/ /d/ /ə/', len: 5, level: 2, sentence: 'The panda eats bamboo.', sentenceZh: '熊猫吃竹子。', emoji: '🐼' },
    ],
  },
  {
    id: 'colors',
    name: '颜色',
    emoji: '🌈',
    tone: 'pink',
    desc: '五彩缤纷的世界',
    words: [
      { word: 'red', zh: '红色', phonetic: '/red/', phonics: '/r/ /e/ /d/', len: 3, level: 1, sentence: 'I like the red apple.', sentenceZh: '我喜欢红色的苹果。', emoji: '🔴' },
      { word: 'blue', zh: '蓝色', phonetic: '/bluː/', phonics: '/b/ /l/ /oo/', len: 4, level: 1, sentence: 'The sky is blue.', sentenceZh: '天空是蓝色的。', emoji: '🔵' },
      { word: 'yellow', zh: '黄色', phonetic: '/ˈjeloʊ/', phonics: '/y/ /e/ /l/ /oʊ/', len: 6, level: 2, sentence: 'The sun is yellow.', sentenceZh: '太阳是黄色的。', emoji: '🟡' },
      { word: 'green', zh: '绿色', phonetic: '/ɡriːn/', phonics: '/g/ /r/ /ee/ /n/', len: 5, level: 1, sentence: 'The grass is green.', sentenceZh: '草是绿色的。', emoji: '🟢' },
      { word: 'black', zh: '黑色', phonetic: '/blæk/', phonics: '/b/ /l/ /æ/ /k/', len: 5, level: 1, sentence: 'I have a black cat.', sentenceZh: '我有一只黑猫。', emoji: '⚫' },
      { word: 'white', zh: '白色', phonetic: '/waɪt/', phonics: '/w/ /aɪ/ /t/', len: 5, level: 1, sentence: 'The cloud is white.', sentenceZh: '云是白色的。', emoji: '⚪' },
      { word: 'pink', zh: '粉色', phonetic: '/pɪŋk/', phonics: '/p/ /ɪ/ /ng/ /k/', len: 4, level: 1, sentence: 'The flower is pink.', sentenceZh: '花是粉色的。', emoji: '🌸' },
      { word: 'orange', zh: '橙色', phonetic: '/ˈɔrɪndʒ/', phonics: '/ɔ/ /r/ /ɪ/ /n/ /j/ /dʒ/', len: 6, level: 2, sentence: 'The orange is sweet.', sentenceZh: '橙子很甜。', emoji: '🟠' },
      { word: 'purple', zh: '紫色', phonetic: '/ˈpɜːrpəl/', phonics: '/p/ /ɜːr/ /p/ /ə/ /l/', len: 6, level: 2, sentence: 'I like purple grapes.', sentenceZh: '我喜欢紫色的葡萄。', emoji: '🟣' },
      { word: 'brown', zh: '棕色', phonetic: '/braʊn/', phonics: '/b/ /r/ /aʊ/ /n/', len: 5, level: 1, sentence: 'The bear is brown.', sentenceZh: '熊是棕色的。', emoji: '🟤' },
      { word: 'gray', zh: '灰色', phonetic: '/ɡreɪ/', phonics: '/g/ /r/ /ay/', len: 4, level: 1, sentence: 'The elephant is gray.', sentenceZh: '大象是灰色的。', emoji: '🐘' },
      { word: 'gold', zh: '金色', phonetic: '/ɡoʊld/', phonics: '/g/ /oʊ/ /l/ /d/', len: 4, level: 1, sentence: 'The star is gold.', sentenceZh: '星星是金色的。', emoji: '✨' },
    ],
  },
  {
    id: 'numbers',
    name: '数字',
    emoji: '🔢',
    tone: 'blue',
    desc: '从一数到十',
    words: [
      { word: 'one', zh: '一', phonetic: '/wʌn/', phonics: '/w/ /ʌ/ /n/', len: 3, level: 1, sentence: 'I have one apple.', sentenceZh: '我有一个苹果。', emoji: '1️⃣' },
      { word: 'two', zh: '二', phonetic: '/tuː/', phonics: '/t/ /oo/', len: 3, level: 1, sentence: 'I have two hands.', sentenceZh: '我有两只手。', emoji: '2️⃣' },
      { word: 'three', zh: '三', phonetic: '/θriː/', phonics: '/th/ /r/ /ee/', len: 5, level: 1, sentence: 'Three little birds.', sentenceZh: '三只小鸟。', emoji: '3️⃣' },
      { word: 'four', zh: '四', phonetic: '/fɔːr/', phonics: '/f/ /ɔːr/', len: 4, level: 1, sentence: 'I have four legs.', sentenceZh: '我有四条腿。', emoji: '4️⃣' },
      { word: 'five', zh: '五', phonetic: '/faɪv/', phonics: '/f/ /aɪ/ /v/', len: 4, level: 1, sentence: 'I have five fingers.', sentenceZh: '我有五根手指。', emoji: '5️⃣' },
      { word: 'six', zh: '六', phonetic: '/sɪks/', phonics: '/s/ /ɪ/ /k/ /s/', len: 3, level: 1, sentence: 'Six is after five.', sentenceZh: '六在五后面。', emoji: '6️⃣' },
      { word: 'seven', zh: '七', phonetic: '/ˈsevən/', phonics: '/s/ /e/ /v/ /ə/ /n/', len: 5, level: 2, sentence: 'Seven days in a week.', sentenceZh: '一周有七天。', emoji: '7️⃣' },
      { word: 'eight', zh: '八', phonetic: '/eɪt/', phonics: '/ay/ /t/', len: 5, level: 1, sentence: 'I am eight years old.', sentenceZh: '我八岁了。', emoji: '8️⃣' },
      { word: 'nine', zh: '九', phonetic: '/naɪn/', phonics: '/n/ /aɪ/ /n/', len: 4, level: 1, sentence: 'Nine is before ten.', sentenceZh: '九在十前面。', emoji: '9️⃣' },
      { word: 'ten', zh: '十', phonetic: '/ten/', phonics: '/t/ /e/ /n/', len: 3, level: 1, sentence: 'I have ten toes.', sentenceZh: '我有十个脚趾。', emoji: '🔟' },
    ],
  },
  {
    id: 'family',
    name: '家人',
    emoji: '👨‍👩‍👧',
    tone: 'orange',
    desc: '温暖的大家庭',
    words: [
      { word: 'dad', zh: '爸爸', phonetic: '/dæd/', phonics: '/d/ /æ/ /d/', len: 3, level: 1, sentence: 'My dad is tall.', sentenceZh: '我爸爸很高。', emoji: '👨' },
      { word: 'mom', zh: '妈妈', phonetic: '/mɒm/', phonics: '/m/ /ɒ/ /m/', len: 3, level: 1, sentence: 'My mom is kind.', sentenceZh: '我妈妈很温柔。', emoji: '👩' },
      { word: 'son', zh: '儿子', phonetic: '/sʌn/', phonics: '/s/ /ʌ/ /n/', len: 3, level: 1, sentence: 'He is my son.', sentenceZh: '他是我的儿子。', emoji: '👦' },
      { word: 'baby', zh: '宝宝', phonetic: '/ˈbeɪbi/', phonics: '/b/ /ay/ /b/ /ee/', len: 4, level: 2, sentence: 'The baby is cute.', sentenceZh: '宝宝很可爱。', emoji: '👶' },
      { word: 'boy', zh: '男孩', phonetic: '/bɔɪ/', phonics: '/b/ /ɔɪ/', len: 3, level: 1, sentence: 'The boy likes toys.', sentenceZh: '男孩喜欢玩具。', emoji: '👦' },
      { word: 'girl', zh: '女孩', phonetic: '/ɡɜːrl/', phonics: '/g/ /ɜːr/ /l/', len: 4, level: 1, sentence: 'The girl has long hair.', sentenceZh: '女孩头发很长。', emoji: '👧' },
      { word: 'man', zh: '男人', phonetic: '/mæn/', phonics: '/m/ /æ/ /n/', len: 3, level: 1, sentence: 'The man is strong.', sentenceZh: '男人很强壮。', emoji: '🧑' },
      { word: 'woman', zh: '女人', phonetic: '/ˈwʊmən/', phonics: '/w/ /ʊ/ /m/ /ə/ /n/', len: 5, level: 2, sentence: 'The woman is nice.', sentenceZh: '女人很友善。', emoji: '👩' },
      { word: 'grandpa', zh: '爷爷', phonetic: '/ˈɡrænpɑː/', phonics: '/g/ /r/ /æ/ /n/ /p/ /ɑː/', len: 7, level: 2, sentence: 'Grandpa tells stories.', sentenceZh: '爷爷讲故事。', emoji: '👴' },
      { word: 'grandma', zh: '奶奶', phonetic: '/ˈɡrænmɑː/', phonics: '/g/ /r/ /æ/ /n/ /m/ /ɑː/', len: 7, level: 2, sentence: 'Grandma cooks well.', sentenceZh: '奶奶做饭好吃。', emoji: '👵' },
    ],
  },
  {
    id: 'food',
    name: '食物',
    emoji: '🍎',
    tone: 'yellow',
    desc: '美味的食物',
    words: [
      { word: 'apple', zh: '苹果', phonetic: '/ˈæpəl/', phonics: '/æ/ /p/ /ə/ /l/', len: 5, level: 2, sentence: 'I eat an apple a day.', sentenceZh: '我每天吃一个苹果。', emoji: '🍎' },
      { word: 'banana', zh: '香蕉', phonetic: '/bəˈnænə/', phonics: '/b/ /ə/ /n/ /æ/ /n/ /ə/', len: 6, level: 3, sentence: 'The monkey eats bananas.', sentenceZh: '猴子吃香蕉。', emoji: '🍌' },
      { word: 'milk', zh: '牛奶', phonetic: '/mɪlk/', phonics: '/m/ /ɪ/ /l/ /k/', len: 4, level: 1, sentence: 'I drink milk every day.', sentenceZh: '我每天喝牛奶。', emoji: '🥛' },
      { word: 'cake', zh: '蛋糕', phonetic: '/keɪk/', phonics: '/k/ /ay/ /k/', len: 4, level: 1, sentence: 'I like birthday cake.', sentenceZh: '我喜欢生日蛋糕。', emoji: '🎂' },
      { word: 'egg', zh: '鸡蛋', phonetic: '/eɡ/', phonics: '/e/ /g/', len: 3, level: 1, sentence: 'I eat an egg for breakfast.', sentenceZh: '我早餐吃鸡蛋。', emoji: '🥚' },
      { word: 'bread', zh: '面包', phonetic: '/bred/', phonics: '/b/ /r/ /e/ /d/', len: 5, level: 1, sentence: 'I have bread for breakfast.', sentenceZh: '我早餐吃面包。', emoji: '🍞' },
      { word: 'rice', zh: '米饭', phonetic: '/raɪs/', phonics: '/r/ /aɪ/ /s/', len: 4, level: 1, sentence: 'I eat rice for lunch.', sentenceZh: '我午饭吃米饭。', emoji: '🍚' },
      { word: 'fish', zh: '鱼肉', phonetic: '/fɪʃ/', phonics: '/f/ /ɪ/ /sh/', len: 4, level: 1, sentence: 'I like fish and chips.', sentenceZh: '我喜欢炸鱼薯条。', emoji: '🐟' },
      { word: 'meat', zh: '肉', phonetic: '/miːt/', phonics: '/m/ /ee/ /t/', len: 4, level: 1, sentence: 'The meat is tasty.', sentenceZh: '肉很好吃。', emoji: '🥩' },
      { word: 'juice', zh: '果汁', phonetic: '/dʒuːs/', phonics: '/j/ /oo/ /s/', len: 5, level: 1, sentence: 'I drink orange juice.', sentenceZh: '我喝橙汁。', emoji: '🧃' },
      { word: 'water', zh: '水', phonetic: '/ˈwɔːtər/', phonics: '/w/ /ɔː/ /t/ /ər/', len: 5, level: 2, sentence: 'I drink water every day.', sentenceZh: '我每天喝水。', emoji: '💧' },
      { word: 'candy', zh: '糖果', phonetic: '/ˈkændi/', phonics: '/k/ /æ/ /n/ /d/ /ee/', len: 5, level: 2, sentence: 'I love candy.', sentenceZh: '我喜欢糖果。', emoji: '🍬' },
    ],
  },
  {
    id: 'nature',
    name: '自然',
    emoji: '🌳',
    tone: 'purple',
    desc: '美丽的大自然',
    words: [
      { word: 'sun', zh: '太阳', phonetic: '/sʌn/', phonics: '/s/ /ʌ/ /n/', len: 3, level: 1, sentence: 'The sun is bright.', sentenceZh: '太阳很亮。', emoji: '☀️' },
      { word: 'moon', zh: '月亮', phonetic: '/muːn/', phonics: '/m/ /oo/ /n/', len: 4, level: 1, sentence: 'The moon is round.', sentenceZh: '月亮是圆的。', emoji: '🌙' },
      { word: 'star', zh: '星星', phonetic: '/stɑːr/', phonics: '/s/ /t/ /ɑːr/', len: 4, level: 1, sentence: 'I see a star in the sky.', sentenceZh: '我看到天上有一颗星星。', emoji: '⭐' },
      { word: 'tree', zh: '树', phonetic: '/triː/', phonics: '/t/ /r/ /ee/', len: 4, level: 1, sentence: 'The tree is tall.', sentenceZh: '树很高。', emoji: '🌳' },
      { word: 'flower', zh: '花', phonetic: '/ˈflaʊər/', phonics: '/f/ /l/ /aʊ/ /ər/', len: 6, level: 2, sentence: 'The flower is beautiful.', sentenceZh: '花很美。', emoji: '🌸' },
      { word: 'grass', zh: '草', phonetic: '/ɡræs/', phonics: '/g/ /r/ /æ/ /s/', len: 5, level: 1, sentence: 'The grass is soft.', sentenceZh: '草很柔软。', emoji: '🌱' },
      { word: 'rain', zh: '雨', phonetic: '/reɪn/', phonics: '/r/ /ay/ /n/', len: 4, level: 1, sentence: 'I like the rain.', sentenceZh: '我喜欢下雨。', emoji: '🌧️' },
      { word: 'snow', zh: '雪', phonetic: '/snoʊ/', phonics: '/s/ /n/ /oʊ/', len: 4, level: 1, sentence: 'The snow is white.', sentenceZh: '雪是白色的。', emoji: '❄️' },
      { word: 'wind', zh: '风', phonetic: '/wɪnd/', phonics: '/w/ /ɪ/ /n/ /d/', len: 4, level: 1, sentence: 'The wind is cool.', sentenceZh: '风很凉爽。', emoji: '💨' },
      { word: 'cloud', zh: '云', phonetic: '/klaʊd/', phonics: '/k/ /l/ /aʊ/ /d/', len: 5, level: 1, sentence: 'The cloud is white.', sentenceZh: '云是白色的。', emoji: '☁️' },
      { word: 'sky', zh: '天空', phonetic: '/skaɪ/', phonics: '/s/ /k/ /aɪ/', len: 3, level: 1, sentence: 'The sky is blue.', sentenceZh: '天空是蓝色的。', emoji: '🌌' },
      { word: 'river', zh: '河流', phonetic: '/ˈrɪvər/', phonics: '/r/ /ɪ/ /v/ /ər/', len: 5, level: 2, sentence: 'The river is long.', sentenceZh: '河流很长。', emoji: '🏞️' },
      { word: 'sea', zh: '大海', phonetic: '/siː/', phonics: '/s/ /ee/', len: 3, level: 1, sentence: 'The sea is deep.', sentenceZh: '大海很深。', emoji: '🌊' },
      { word: 'hill', zh: '小山', phonetic: '/hɪl/', phonics: '/h/ /ɪ/ /l/', len: 4, level: 1, sentence: 'I climb the hill.', sentenceZh: '我爬山。', emoji: '⛰️' },
    ],
  },
];
