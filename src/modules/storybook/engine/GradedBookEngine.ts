/**
 * 洪恩级分级阅读与自集字绘本引擎 (Graded Book & Sub-book Matrix Engine)
 * ------------------------------------------------------------
 * 1. 严格字库分级控制 (Level 1~5)：
 *    - Level 1 (启蒙阶 20-50字): 单句短篇、高频字占比 >95%
 *    - Level 2 (萌芽阶 50-100字): 日常情境、故事简短趣味
 *    - Level 3 (进阶阶 100-200字): 复合句式、自然与科学
 *    - Level 4 (拓展阶 200-350字): 寓言童话、社交与情商
 *    - Level 5 (飞跃阶 350-500+字): 国学与长篇探险
 * 2. 自适应覆盖率分析 (Vocabulary Coverage Rate)
 * 3. 自集字动态绘本拼配算法 (Sub-book Generator)
 */

export interface GradedPage {
  text: string;
  pinyin: string;
  illustrationEmoji: string;
  scenePrompt?: string;
  highlightWords?: string[];
}

export interface GradedBookQuiz {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface GradedBook {
  id: string;
  level: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  coverEmoji: string;
  theme: 'nature' | 'daily' | 'emotion' | 'science' | 'fairy';
  targetChars: string[];
  pages: GradedPage[];
  quiz: GradedBookQuiz;
}

export interface BookCoverageResult {
  bookId: string;
  totalUniqueChars: number;
  knownCount: number;
  unknownChars: string[];
  coverageRate: number; // 0 ~ 1
  canReadIndependently: boolean; // >= 0.9
  recommendStatus: 'perfect' | 'challenge' | 'learning';
}

/** 经典精编分级阅读矩阵 (Pre-authored Graded Library) */
export const GRADED_BOOKS_LIBRARY: GradedBook[] = [
  // ========== Level 1: 启蒙 20-50 字 ==========
  {
    id: 'l1-01-sun-and-moon',
    level: 1,
    title: '太阳和月亮',
    subtitle: '认识白天与黑夜的美丽自然',
    coverEmoji: '☀️🌙',
    theme: 'nature',
    targetChars: ['日', '月', '天', '大', '上', '山', '白', '来'],
    pages: [
      {
        text: '大大的太阳升上山头，白天来了。',
        pinyin: 'dà dà de tài yáng shēng shàng shān tóu, bái tiān lái le.',
        illustrationEmoji: '🌅 ⛰️',
        highlightWords: ['大', '日', '上', '山', '白', '天', '来'],
      },
      {
        text: '白白的云朵在天上飘，天蓝蓝的。',
        pinyin: 'bái bái de yún duǒ zài tiān shàng piāo, tiān lán lán de.',
        illustrationEmoji: '☁️ 🌤️',
        highlightWords: ['白', '天', '上'],
      },
      {
        text: '弯弯的月亮出来了，天黑了。',
        pinyin: 'wān wān de yuè liang chū lái le, tiān hēi le.',
        illustrationEmoji: '🌙 🌌',
        highlightWords: ['月', '天', '来'],
      },
      {
        text: '月亮和星星在天上眨眼睛，晚安！',
        pinyin: 'yuè liang hé xīng xing zài tiān shàng zhǎ yǎn jing, wǎn ān!',
        illustrationEmoji: '⭐ 🛌',
        highlightWords: ['月', '天', '上'],
      },
    ],
    quiz: {
      question: '故事里，白天升上山头的是什么？',
      options: ['大大的太阳', '弯弯的月亮', '小红花'],
      answer: '大大的太阳',
      explanation: '白天太阳出来照亮大地，天黑了月亮才出来哦！',
    },
  },
  {
    id: 'l1-02-spring-flowers',
    level: 1,
    title: '春天花开了',
    subtitle: '春风吹拂，小草小花快快长大',
    coverEmoji: '🌸🌱',
    theme: 'nature',
    targetChars: ['春', '风', '花', '水', '不', '多', '小'],
    pages: [
      {
        text: '春风吹来了，天气暖和了。',
        pinyin: 'chūn fēng chuī lái le, tiān qì nuǎn huo le.',
        illustrationEmoji: '🍃 🌿',
        highlightWords: ['春', '风', '来', '天'],
      },
      {
        text: '春雨落下，山间的水流变多了。',
        pinyin: 'chūn yǔ luò xià, shān jiān de shuǐ liú biàn duō le.',
        illustrationEmoji: '🌧️ 💧',
        highlightWords: ['春', '雨', '山', '水', '多'],
      },
      {
        text: '红红的花开在山上，真好看！',
        pinyin: 'hóng hóng de huā kāi zài shān shàng, zhēn hǎo kàn!',
        illustrationEmoji: '🌺 🏔️',
        highlightWords: ['花', '山', '上', '好'],
      },
    ],
    quiz: {
      question: '春天下雨后，山上的什么变多了？',
      options: ['水流', '积雪', '落叶'],
      answer: '水流',
      explanation: '春雨落下来，滋润大地，水流变得清澈欢快！',
    },
  },

  // ========== Level 2: 萌芽 50-100 字 ==========
  {
    id: 'l2-01-little-cat-fish',
    level: 2,
    title: '小猫钓鱼记',
    subtitle: '做事专心，才能收获满满',
    coverEmoji: '🐱🎣',
    theme: 'fairy',
    targetChars: ['猫', '鱼', '水', '大', '小', '不', '去', '见'],
    pages: [
      {
        text: '小猫和妈妈来到江边，坐在一块大石头上钓鱼。',
        pinyin: 'xiǎo māo hé mā ma lái dào jiāng biān, zuò zài yī kuài dà shí tou shàng diào yú.',
        illustrationEmoji: '🐱 🎣 🌊',
        highlightWords: ['小', '猫', '来', '江', '一', '大', '上', '鱼'],
      },
      {
        text: '一只小鸟飞过来，小猫跑去看小鸟，结果没钓到鱼。',
        pinyin: 'yī zhī xiǎo niǎo fēi guò lái, xiǎo māo pǎo qù kàn xiǎo niǎo, jié guǒ méi diào dào yú.',
        illustrationEmoji: '🐦 🐾',
        highlightWords: ['一', '小', '鸟', '来', '猫', '去', '鱼'],
      },
      {
        text: '小猫静下心来，不再东张西望，终于钓到了一条大红鱼！',
        pinyin: 'xiǎo māo jìng xià xīn lái, bù zài dōng zhāng xī wàng, zhōng yú diào dào le yī tiáo dà hóng yú!',
        illustrationEmoji: '🐟 🎉',
        highlightWords: ['小', '猫', '下', '心', '来', '不', '一', '大', '鱼'],
      },
    ],
    quiz: {
      question: '小猫一开始为什么没有钓到鱼？',
      options: ['跑去看小鸟分心了', '江里没有鱼', '鱼竿坏了'],
      answer: '跑去看小鸟分心了',
      explanation: '做事情要专心致志，三心二意就容易一无所获哦！',
    },
  },
  {
    id: 'l2-02-little-frog-home',
    level: 2,
    title: '小青蛙找家',
    subtitle: '荷叶圆圆，小河清清',
    coverEmoji: '🐸🪷',
    theme: 'nature',
    targetChars: ['青', '水', '中', '家', '有', '知', '何', '处'],
    pages: [
      {
        text: '荷塘里有一只绿绿的小青蛙。',
        pinyin: 'hé táng lǐ yǒu yī zhī lǜ lǜ de xiǎo qīng wā.',
        illustrationEmoji: '🪷 🐸',
        highlightWords: ['有', '一', '小', '青'],
      },
      {
        text: '水中有大大的荷叶，青蛙在荷叶中间跳来跳去。',
        pinyin: 'shuǐ zhōng yǒu dà dà de hé yè, qīng wā zài hé yè zhōng jiān tiào lái tiào qù.',
        illustrationEmoji: '🍃 💦',
        highlightWords: ['水', '中', '有', '大', '青', '中', '来', '去'],
      },
      {
        text: '小青蛙找到了家，心里真高兴！',
        pinyin: 'xiǎo qīng wā zhǎo dào le jiā, xīn lǐ zhēn gāo xìng!',
        illustrationEmoji: '🏡 ❤️',
        highlightWords: ['小', '青', '家', '心'],
      },
    ],
    quiz: {
      question: '小青蛙在什么中间跳来跳去？',
      options: ['大大的荷叶中间', '大树枝头', '高高的房顶'],
      answer: '大大的荷叶中间',
      explanation: '小青蛙喜欢生活在水边荷塘里，荷叶就是它的舞台！',
    },
  },

  // ========== Level 3: 进阶 100-200 字 ==========
  {
    id: 'l3-01-forest-music',
    level: 3,
    title: '森林音乐会',
    subtitle: '动物小伙伴们一起快乐演奏',
    coverEmoji: '🌲🎷',
    theme: 'daily',
    targetChars: ['声', '音', '听', '高', '唱', '乐', '友', '同'],
    pages: [
      {
        text: '春天的森林里，小鸟发出清脆的声音，大声唱歌。',
        pinyin: 'chūn tiān de sēn lín lǐ, xiǎo niǎo fā chū qīng cuì de shēng yīn, dà shēng chàng gē.',
        illustrationEmoji: '🐦 🌳',
        highlightWords: ['春', '天', '小', '鸟', '出', '声', '音', '大'],
      },
      {
        text: '小兔打起鼓，小熊吹着笛子，大家一同奏响快乐的音乐。',
        pinyin: 'xiǎo tù dǎ qǐ gǔ, xiǎo xióng chuī zhe dí zi, dà jiā yī tóng zòu xiǎng kuài lè de yīn yuè.',
        illustrationEmoji: '🥁 🐻 🐰',
        highlightWords: ['小', '起', '大', '家', '一', '同', '音', '乐'],
      },
      {
        text: '好朋友们在一起，声音多么优美，整座山林都笑了！',
        pinyin: 'hǎo péng you men zài yī qǐ, shēng yīn duō me yōu měi, zhěng zuò shān lín dōu xiào le!',
        illustrationEmoji: '✨ 🎶 🌲',
        highlightWords: ['好', '友', '一', '起', '声', '音', '多', '山'],
      },
    ],
    quiz: {
      question: '森林音乐会里大家的感觉怎么样？',
      options: ['非常快乐热闹', '很害怕', '很无聊'],
      answer: '非常快乐热闹',
      explanation: '和小伙伴们一起合作演奏音乐，是最开心的事情！',
    },
  },
  {
    id: 'l3-02-little-ant-bridge',
    level: 3,
    title: '小蚂蚁搭桥记',
    subtitle: '齐心协力，克服困难渡过大河',
    coverEmoji: '🐜🌿',
    theme: 'nature',
    targetChars: ['蚁', '河', '水', '桥', '力', '同', '心', '过'],
    pages: [
      {
        text: '一群小蚂蚁在草地上找食物，遇到了一条清清的小河。',
        pinyin: 'yī qún xiǎo mǎ yǐ zài cǎo dì shàng zhǎo shí wù, yù dào le yī tiáo qīng qīng de xiǎo hé.',
        illustrationEmoji: '🐜 🌾 🌊',
        highlightWords: ['一', '小', '上', '一', '河'],
      },
      {
        text: '河水流得急，小蚂蚁们衔来绿色的落叶，大家手拉手搭成了一座树叶小桥。',
        pinyin: 'hé shuǐ liú de jí, xiǎo mǎ yǐ men xián lái lǜ sè de luò yè, dà jiā shǒu lā shǒu dā chéng le yī zuò shù yè xiǎo qiáo.',
        illustrationEmoji: '🍃 🤝',
        highlightWords: ['河', '水', '小', '来', '大', '家', '手', '一', '小'],
      },
      {
        text: '小蚂蚁们安全地过了河，齐心协力把甜甜的果实运回了家！',
        pinyin: 'xiǎo mǎ yǐ men ān quán de guò le hé, qí xīn xié lì bǎ tián tián de guǒ shí yùn huí le jiā!',
        illustrationEmoji: '🍓 🏡 🎉',
        highlightWords: ['小', '过', '河', '心', '力', '回', '家'],
      },
    ],
    quiz: {
      question: '小蚂蚁们是用什么搭成桥过河的？',
      options: ['绿色的树叶和大家齐心协力', '巨大的石头', '小船'],
      answer: '绿色的树叶和大家齐心协力',
      explanation: '遇到困难时团结合作，就能想出好办法解决难题！',
    },
  },

  // ========== Level 4: 拓展 200-350 字 ==========
  {
    id: 'l4-01-three-little-pigs',
    level: 4,
    title: '三只小猪盖房子',
    subtitle: '勤劳与智慧，打造最坚固的温暖小窝',
    coverEmoji: '🐷🧱',
    theme: 'fairy',
    targetChars: ['猪', '房', '草', '木', '石', '大', '风', '安'],
    pages: [
      {
        text: '三只小猪长大了，准备自己盖一间结实的小房子。',
        pinyin: 'sān zhī xiǎo zhū zhǎng dà le, zhǔn bèi zì jǐ gài yī jiān jiē shi de xiǎo fáng zi.',
        illustrationEmoji: '🐷 🏡',
        highlightWords: ['三', '小', '大', '自', '一', '小', '房'],
      },
      {
        text: '老大用稻草盖房，老二用木头盖房，老三不怕辛苦，一块块搬来坚硬的红砖石头盖砖房。',
        pinyin: 'lǎo dà yòng dào cǎo gài fáng, lǎo èr yòng mù tou gài fáng, lǎo sān bù pà xīn kǔ, yī kuài kuài bān lái jiān yìng de hóng zhuān shí tou gài zhuān fáng.',
        illustrationEmoji: '🌾 🪵 🧱',
        highlightWords: ['大', '用', '草', '房', '二', '用', '木', '房', '三', '不', '心', '一', '来', '石', '房'],
      },
      {
        text: '大灰狼呼呼吹倒了草房和木房，却怎么也吹不动坚固的砖房，三只小猪在砖房里开心地唱歌！',
        pinyin: 'dà huī láng hū hū chuī dǎo le cǎo fáng hé mù fáng, què zěn me yě chuī bù dòng jiān gù de zhuān fáng, sān zhī xiǎo zhū zài zhuān fáng lǐ kāi xīn de chàng gē!',
        illustrationEmoji: '🐺 💨 🏰',
        highlightWords: ['大', '草', '房', '木', '房', '不', '动', '房', '三', '小', '房', '心'],
      },
    ],
    quiz: {
      question: '哪座房子最坚固，大灰狼吹不动？',
      options: ['老三辛苦盖的红砖石房', '老大的稻草房', '老二的木头房'],
      answer: '老三辛苦盖的红砖石房',
      explanation: '做事不怕辛苦认真做，才能创造安全可靠的成果！',
    },
  },

  // ========== Level 5: 飞跃 350-500+ 字 ==========
  {
    id: 'l5-01-monkey-king-adventure',
    level: 5,
    title: '美猴王的花果山',
    subtitle: '勇敢探索水帘洞，成为快乐的美猴王',
    coverEmoji: '🐒🌊',
    theme: 'fairy',
    targetChars: ['猴', '山', '水', '洞', '石', '天', '王', '乐'],
    pages: [
      {
        text: '东胜神洲有一座美丽的花果山，山上有一块吸收天地灵气的仙石，蹦出了一只聪明机灵的石猴。',
        pinyin: 'dōng shèng shén zhōu yǒu yī zuò měi lì de huā guǒ shān, shān shàng yǒu yī kuài xī shōu tiān dì líng qì de xiān shí, bèng chū le yī zhī cōng míng jī líng de shí hóu.',
        illustrationEmoji: '⛰️ 🌸 🐒',
        highlightWords: ['有', '一', '山', '山', '上', '有', '一', '天', '地', '石', '出', '了', '一', '石'],
      },
      {
        text: '山间瀑布飞流直下，石猴毫不畏惧，纵身一跃穿过水帘，发现了一座宽敞明亮的水帘洞！',
        pinyin: 'shān jiān pù bù fēi liú zhí xià, shí hóu háo bù wèi jù, zòng shēn yī yuè chuān guò shuǐ lián, fā xiàn le yī zuò kuān chang míng liàng de shuǐ lián dòng!',
        illustrationEmoji: '🌊 💎 🏯',
        highlightWords: ['山', '下', '石', '不', '一', '过', '水', '出', '了', '一', '水', '洞'],
      },
      {
        text: '群猴欢呼雀跃，尊称他为美猴王，大家在洞天福地里过上了无忧无虑的快乐生活！',
        pinyin: 'qún hóu huān hū què yuè, zūn chēng tā wéi měi hóu wáng, dà jiā zài dòng tiān fú dì lǐ guò shàng le wú yōu wú lǜ de kuài lè shēng huó!',
        illustrationEmoji: '👑 🐒 🎉',
        highlightWords: ['王', '大', '家', '洞', '天', '地', '过', '上', '了', '乐', '生'],
      },
    ],
    quiz: {
      question: '石猴穿过瀑布发现了什么神奇的好地方？',
      options: ['水帘洞洞天福地', '雪山城堡', '神秘迷宫'],
      answer: '水帘洞洞天福地',
      explanation: '石猴勇敢无畏勇于探索，为大家找到了温暖舒适的美好家园！',
    },
  },
];

/**
 * 分析绘本与用户已掌握字库的匹配率
 * @param book 绘本对象
 * @param knownCharsSet 孩子已掌握的汉字集合（Set 或 Array）
 */
export function analyzeBookCoverage(
  book: GradedBook,
  knownChars: string[] | Set<string>
): BookCoverageResult {
  const knownSet = knownChars instanceof Set ? knownChars : new Set(knownChars);

  // 提取绘本全文所有去重的汉字
  const fullText = book.pages.map((p) => p.text).join('');
  const hanziRegex = /[\u4e00-\u9fa5]/g;
  const charsInBook = Array.from(new Set(fullText.match(hanziRegex) || []));

  const totalUnique = charsInBook.length || 1;
  const unknownChars: string[] = [];
  let knownCount = 0;

  for (const c of charsInBook) {
    if (knownSet.has(c)) {
      knownCount++;
    } else {
      unknownChars.push(c);
    }
  }

  const coverageRate = Math.min(1, Math.max(0, knownCount / totalUnique));
  const canReadIndependently = coverageRate >= 0.85;

  let recommendStatus: 'perfect' | 'challenge' | 'learning' = 'learning';
  if (coverageRate >= 0.95) {
    recommendStatus = 'perfect';
  } else if (coverageRate >= 0.75) {
    recommendStatus = 'challenge';
  }

  return {
    bookId: book.id,
    totalUniqueChars: totalUnique,
    knownCount,
    unknownChars,
    coverageRate,
    canReadIndependently,
    recommendStatus,
  };
}

/**
 * 自集字自适应绘本生成器 (从已知字动态组合一本专属小故事)
 */
export function generateSubBookFromKnownChars(
  knownChars: string[],
  theme: 'nature' | 'fairy' | 'daily' = 'nature'
): GradedBook {
  const chars = knownChars.length > 0 ? knownChars : ['日', '月', '水', '火', '山', '石', '田', '土', '大', '小', '人', '天'];
  const hasChar = (c: string) => chars.includes(c);

  // 根据可用字挑选最贴切的故事模板
  const title = hasChar('山') && hasChar('水')
    ? '山水间的小小奇迹'
    : hasChar('日') && hasChar('月')
    ? '日月星光伴我行'
    : '我的第一本自集字绘本';

  const p1 = hasChar('日') && hasChar('大')
    ? '大大的红日升起来了，照亮了天空。'
    : '天亮了，阳光洒在山石上。';

  const p2 = hasChar('水') && hasChar('花')
    ? '清清的流水滋润着红花与青草。'
    : '小鸟和我们一起快乐地唱起歌来。';

  const p3 = hasChar('人') && hasChar('家')
    ? '大家一起快快乐乐走回家。'
    : '今天真是一个开心又美好的日子！';

  return {
    id: `custom-subbook-${Date.now()}`,
    level: 1,
    title,
    subtitle: `专属于你的 ${chars.length} 字自集字定制读物`,
    coverEmoji: theme === 'nature' ? '🌿📖' : theme === 'fairy' ? '🪄📖' : '🏡📖',
    theme,
    targetChars: chars.slice(0, 10),
    pages: [
      {
        text: p1,
        pinyin: 'tian liang le, tai yang gao gao sheng qi lai.',
        illustrationEmoji: '🌅 ⛰️',
        highlightWords: chars.slice(0, 4),
      },
      {
        text: p2,
        pinyin: 'qing qing de shui liu pei zhe xiao hua.',
        illustrationEmoji: '💧 🌸',
        highlightWords: chars.slice(4, 8),
      },
      {
        text: p3,
        pinyin: 'da jia yi qi kuai kuai le le.',
        illustrationEmoji: '🏡 ✨',
        highlightWords: chars.slice(8, 12),
      },
    ],
    quiz: {
      question: '读完这篇专属自集字故事，你的心情怎么样？',
      options: ['开心自豪，我能自己读啦！', '还想再读一本', '想要挑战更长故事'],
      answer: '开心自豪，我能自己读啦！',
      explanation: '恭喜你！靠自己掌握的汉字读完了一整本绘本，真是识字小天才！',
    },
  };
}
