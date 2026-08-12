/**
 * 猫咪的“学习求助” (Cat Study Help / "Be the Cat's Teacher")
 * ------------------------------------------------------------
 * 猫咪不再只是被动的被喂养者，它会遇到学习难题向孩子发问，
 * 孩子作为“猫咪小老师”给猫咪答疑解惑，解答正确获得小鱼干与亲密度奖励。
 */

export interface CatHelpQuestion {
  id: string;
  subject: 'math' | 'pinyin' | 'hanzi';
  subjectName: string;
  catPrompt: string;
  options: string[];
  answerIdx: number;
  explanation: string;
  rewardFish: number;
  rewardAffection: number;
}

const CAT_HELP_POOL: CatHelpQuestion[] = [
  // 数学求助
  {
    id: 'math-1',
    subject: 'math',
    subjectName: '数学城堡',
    catPrompt: '小老师喵！小猫这里有 3 条红鱼和 4 条金鱼，一共有几条鱼干呀？喵？',
    options: ['6 条', '7 条', '8 条'],
    answerIdx: 1,
    explanation: '3 + 4 = 7 条鱼干！',
    rewardFish: 3,
    rewardAffection: 5,
  },
  {
    id: 'math-2',
    subject: 'math',
    subjectName: '数学城堡',
    catPrompt: '小老师喵！5 加上几等于 10 呀？破十法我不懂喵...',
    options: ['4', '5', '6'],
    answerIdx: 1,
    explanation: '5 + 5 = 10，凑十法好棒！',
    rewardFish: 4,
    rewardAffection: 6,
  },
  {
    id: 'math-3',
    subject: 'math',
    subjectName: '数学城堡',
    catPrompt: '小老师！8 比 5 大多少呢喵？小猫数不过来手脚啦！',
    options: ['3', '2', '4'],
    answerIdx: 0,
    explanation: '8 - 5 = 3！',
    rewardFish: 3,
    rewardAffection: 5,
  },

  // 拼音求助
  {
    id: 'pinyin-1',
    subject: 'pinyin',
    subjectName: '拼音森林',
    catPrompt: '小老师！「b」和「a」拼在一起，读什么声音喵？',
    options: ['bā (八)', 'mā (妈)', 'dā (搭)'],
    answerIdx: 0,
    explanation: 'b - a -> bā 爸！',
    rewardFish: 3,
    rewardAffection: 5,
  },
  {
    id: 'pinyin-2',
    subject: 'pinyin',
    subjectName: '拼音森林',
    catPrompt: '小老师！「m」和「o」拼在一起，怎么发音喵？',
    options: ['mō (摸)', 'pō (坡)', 'fō (佛)'],
    answerIdx: 0,
    explanation: 'm - o -> mō 摸！',
    rewardFish: 3,
    rewardAffection: 5,
  },
  {
    id: 'pinyin-3',
    subject: 'pinyin',
    subjectName: '拼音森林',
    catPrompt: '小老师！单韵母里的“小姑娘发型”是哪一个字母喵？',
    options: ['a', 'o', 'e'],
    answerIdx: 0,
    explanation: '张大嘴巴 a a a！',
    rewardFish: 3,
    rewardAffection: 5,
  },

  // 汉字古诗求助
  {
    id: 'hanzi-1',
    subject: 'hanzi',
    subjectName: '汉字古镇',
    catPrompt: '小老师！《静夜思》里“床前明月光”的下一句是什么喵？',
    options: ['疑是地上霜', '举头望明月', '低头思故乡'],
    answerIdx: 0,
    explanation: '床前明月光，疑是地上霜！',
    rewardFish: 4,
    rewardAffection: 6,
  },
  {
    id: 'hanzi-2',
    subject: 'hanzi',
    subjectName: '汉字古镇',
    catPrompt: '小老师！“日”字加一笔，可以变成什么新字喵？',
    options: ['目', '田', '白'],
    answerIdx: 0,
    explanation: '日字加横变目！',
    rewardFish: 3,
    rewardAffection: 5,
  },
  {
    id: 'hanzi-3',
    subject: 'hanzi',
    subjectName: '汉字古镇',
    catPrompt: '小老师！“春眠不觉晓”里的“晓”字是什么意思喵？',
    options: ['天亮', '夜晚', '做梦'],
    answerIdx: 0,
    explanation: '晓代表天亮了！',
    rewardFish: 4,
    rewardAffection: 6,
  },
];

export function getRandomCatHelpQuestion(): CatHelpQuestion {
  const idx = Math.floor(Math.random() * CAT_HELP_POOL.length);
  return { ...CAT_HELP_POOL[idx]! };
}
