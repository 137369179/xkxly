/**
 * 幼小衔接常用启蒙汉字语料库（扩展版）
 * ------------------------------------------------------------------
 * 原始策划字 12 个 + 自动合并 hanzi.ts 主字表 300 字（去重），
 * 通过 getExtendedHanzi500() 对外提供 300+ 字的完整浏览。
 * 合并进来的字使用主字表的字源/组词/例句，并标注造字法分类。
 */

export interface HanziItem {
  id: string;
  char: string;
  pinyin: string;
  strokeCount: number;
  radical: string; // 部首
  category: '象形' | '指事' | '会意' | '形声';
  words: string[]; // 常用词语
  originDesc: string; // 象形/字源演变简述
  sentence: string; // 例句
}

export const HANZI_500: HanziItem[] = [
  {
    id: 'hz-1',
    char: '日',
    pinyin: 'rì',
    strokeCount: 4,
    radical: '日',
    category: '象形',
    words: ['太阳', '日子', '日落'],
    originDesc: '象形字，圆圆的太阳中间有一点光芒',
    sentence: '太阳公公从东方升起来了。',
  },
  {
    id: 'hz-2',
    char: '月',
    pinyin: 'yuè',
    strokeCount: 4,
    radical: '月',
    category: '象形',
    words: ['月亮', '月光', '月份'],
    originDesc: '象形字，弯弯的月牙儿形态',
    sentence: '弯弯的月亮像小船。',
  },
  {
    id: 'hz-3',
    char: '水',
    pinyin: 'shuǐ',
    strokeCount: 4,
    radical: '水',
    category: '象形',
    words: ['水果', '河水', '喝水'],
    originDesc: '象形字，弯曲水流与水滴飞溅',
    sentence: '我们要多喝清凉的开水。',
  },
  {
    id: 'hz-4',
    char: '火',
    pinyin: 'huǒ',
    strokeCount: 4,
    radical: '火',
    category: '象形',
    words: ['火苗', '火山', '灭火'],
    originDesc: '象形字，熊熊燃烧的火焰姿态',
    sentence: '篝火在黑夜里熊熊燃烧。',
  },
  {
    id: 'hz-5',
    char: '木',
    pinyin: 'mù',
    strokeCount: 4,
    radical: '木',
    category: '象形',
    words: ['木头', '树木', '积木'],
    originDesc: '象形字，枝干与向下延伸的树根',
    sentence: '小熊用木头搭了一间漂亮的房子。',
  },
  {
    id: 'hz-6',
    char: '人',
    pinyin: 'rén',
    strokeCount: 2,
    radical: '人',
    category: '象形',
    words: ['人们', '大人', '工人'],
    originDesc: '象形字，侧面伸出双手迈步的人形',
    sentence: '公园里有好多散步的人们。',
  },
  {
    id: 'hz-7',
    char: '天',
    pinyin: 'tiān',
    strokeCount: 4,
    radical: '大',
    category: '指事',
    words: ['天空', '天气', '天天'],
    originDesc: '指事字，在人的头上标注至高无上的天空',
    sentence: '蓝蓝的天空飘着朵朵白云。',
  },
  {
    id: 'hz-8',
    char: '地',
    pinyin: 'dì',
    strokeCount: 6,
    radical: '土',
    category: '形声',
    words: ['大地', '地面', '草地'],
    originDesc: '形声字，土字旁代表广袤的土地与地面',
    sentence: '绿色的小草铺满了大地。',
  },
  {
    id: 'hz-9',
    char: '山',
    pinyin: 'shān',
    strokeCount: 3,
    radical: '山',
    category: '象形',
    words: ['大山', '爬山', '高山'],
    originDesc: '象形字，三座连绵起伏的高耸山峰',
    sentence: '远处的高山耸立在云霄之中。',
  },
  {
    id: 'hz-10',
    char: '石',
    pinyin: 'shí',
    strokeCount: 5,
    radical: '石',
    category: '象形',
    words: ['石头', '宝石', '石桥'],
    originDesc: '象形字，悬崖下方落下的坚硬石头',
    sentence: '河边散落着好多彩色的石头。',
  },
  {
    id: 'hz-11',
    char: '田',
    pinyin: 'tián',
    strokeCount: 5,
    radical: '田',
    category: '象形',
    words: ['田地', '稻田', '麦田'],
    originDesc: '象形字，一块块划分整齐的方格农田',
    sentence: '农民伯伯在田地里忙着播种。',
  },
  {
    id: 'hz-12',
    char: '土',
    pinyin: 'tǔ',
    strokeCount: 3,
    radical: '土',
    category: '象形',
    words: ['泥土', '土豆', '土壤'],
    originDesc: '象形字，地面上堆起的土块与泥丘',
    sentence: '小花种在肥沃的泥土里长得快。',
  },
];

export function getHanziById(id: string): HanziItem | undefined {
  return HANZI_500.find((h) => h.id === id);
}

export function searchHanzi(kw: string): HanziItem[] {
  if (!kw.trim()) return HANZI_500;
  return HANZI_500.filter(
    (h) => h.char.includes(kw) || h.pinyin.includes(kw) || h.words.some((w) => w.includes(kw)),
  );
}

import { HANZI_DATA } from './hanzi';

/* ------------------------------------------------------------------ */
/* 造字法分类（对主字表 300 字的标注；未标注的默认「形声」——              */
/* 汉字中形声字占 80% 以上，默认归类统计上最合理）                        */
/* ------------------------------------------------------------------ */
const CATEGORY_OVERRIDES: Record<string, HanziItem['category']> = {
  // 象形：描画事物形状造字
  人: '象形', 山: '象形', 日: '象形', 月: '象形', 水: '象形', 火: '象形',
  木: '象形', 田: '象形', 石: '象形', 子: '象形', 女: '象形', 心: '象形',
  云: '象形', 雨: '象形', 门: '象形', 自: '象形', 又: '象形', 飞: '象形',
  州: '象形', 气: '象形', 面: '象形', 夕: '象形', 牛: '象形', 鱼: '象形',
  鸟: '象形', 马: '象形', 舟: '象形', 竹: '象形', 豆: '象形', 燕: '象形',
  衣: '象形',
  // 指事：用符号或在象形上加标记表示抽象意思
  一: '指事', 二: '指事', 三: '指事', 上: '指事', 下: '指事', 中: '指事',
  十: '指事', 千: '指事', 入: '指事', 半: '指事', 天: '指事',
  // 会意：两个或多个部件合起来表意
  明: '会意', 春: '会意', 秋: '会意', 家: '会意', 看: '会意', 见: '会意',
  相: '会意', 采: '会意', 林: '会意', 好: '会意', 尘: '会意', 泪: '会意',
  寒: '会意', 光: '会意', 鸣: '会意', 暮: '会意', 朝: '会意', 望: '会意',
  思: '会意', 知: '会意', 归: '会意', 尽: '会意', 得: '会意', 香: '会意',
  书: '会意', 星: '会意', 出: '会意', 多: '会意', 莫: '会意', 北: '会意',
  从: '会意', 步: '会意',
};

/**
 * 扩展字库：策划 12 字 + 主字表 300 字（按字去重，策划字优先）。
 * 返回约 300+ 个汉字，按部首/造字法分类浏览。
 */
export function getExtendedHanzi500(): HanziItem[] {
  const seen = new Set(HANZI_500.map((h) => h.char));
  const out: HanziItem[] = [...HANZI_500];
  for (const h of HANZI_DATA) {
    if (seen.has(h.c)) continue;
    seen.add(h.c);
    out.push({
      id: `ext-${h.c}`,
      char: h.c,
      pinyin: h.pd,
      strokeCount: h.strokes,
      radical: h.radical,
      category: CATEGORY_OVERRIDES[h.c] ?? '形声',
      words: h.words,
      originDesc: `${h.origin}。${h.evolve}`,
      sentence: h.sentence.endsWith('。') ? h.sentence : `${h.sentence}。`,
    });
  }
  return out;
}
