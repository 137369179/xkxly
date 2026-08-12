/**
 * 数学应用题数据 · 30 道
 */

export interface WordProblem {
  id: string;
  level: 1 | 2 | 3;
  emoji: string;
  scenario: string;
  question: string;
  display?: string;
  options: number[];
  answer: number;
  hint: string;
  why: string;
}

export const WORD_PROBLEMS: WordProblem[] = [
  // Level 1 (10以内加减)
  { id: 'wp-1', level: 1, emoji: '🍎', scenario: '桌上有 3 个苹果，妈妈又放了 2 个。', question: '现在桌上有几个苹果？', options: [4, 5, 6, 3], answer: 5, hint: '3 + 2 = ?', why: '原来 3 个加上新放的 2 个，3+2=5。' },
  { id: 'wp-2', level: 1, emoji: '🐦', scenario: '树枝上停着 6 只小鸟，飞走了 2 只。', question: '树上还剩几只小鸟？', options: [3, 4, 5, 8], answer: 4, hint: '6 - 2 = ?', why: '6 只减去飞走的 2 只，6-2=4。' },
  { id: 'wp-3', level: 1, emoji: '🐟', scenario: '鱼缸里有 4 条金鱼，小明又买了 3 条。', question: '鱼缸里现在有几条金鱼？', options: [6, 7, 8, 5], answer: 7, hint: '4 + 3 = ?', why: '原来 4 条加上新买的 3 条，4+3=7。' },
  { id: 'wp-4', level: 1, emoji: '🎈', scenario: '小红有 8 个气球，破了 3 个。', question: '小红还剩几个气球？', options: [4, 5, 6, 11], answer: 5, hint: '8 - 3 = ?', why: '8 个减去破的 3 个，8-3=5。' },
  { id: 'wp-5', level: 1, emoji: '🌸', scenario: '花园里开了 5 朵红花和 4 朵黄花。', question: '花园里一共开了几朵花？', options: [8, 9, 10, 7], answer: 9, hint: '5 + 4 = ?', why: '红花 5 朵加黄花 4 朵，5+4=9。' },
  { id: 'wp-6', level: 1, emoji: '饼干', scenario: '盘子里有 10 块饼干，小亮吃了 4 块。', question: '盘子里还剩几块饼干？', options: [5, 6, 7, 14], answer: 6, hint: '10 - 4 = ?', why: '10 块减去吃了的 4 块，10-4=6。' },
  { id: 'wp-7', level: 1, emoji: '🚗', scenario: '停车场有 7 辆车，又开来了 3 辆。', question: '停车场现在有几辆车？', options: [9, 10, 11, 8], answer: 10, hint: '7 + 3 = ?', why: '原来 7 辆加上开来 3 辆，7+3=10。' },
  { id: 'wp-8', level: 1, emoji: '⭐', scenario: '小星得了 9 颗星，送给同学 5 颗。', question: '小星还剩几颗星？', options: [3, 4, 5, 14], answer: 4, hint: '9 - 5 = ?', why: '9 颗减去送出的 5 颗，9-5=4。' },
  { id: 'wp-9', level: 1, emoji: '📚', scenario: '书架第一层有 6 本书，第二层有 3 本书。', question: '书架上一共有几本书？', options: [8, 9, 10, 7], answer: 9, hint: '6 + 3 = ?', why: '第一层 6 本加第二层 3 本，6+3=9。' },
  { id: 'wp-10', level: 1, emoji: '🍇', scenario: '篮子里有 8 串葡萄，吃掉了 6 串。', question: '篮子里还剩几串葡萄？', options: [1, 2, 3, 14], answer: 2, hint: '8 - 6 = ?', why: '8 串减去吃了 6 串，8-6=2。' },

  // Level 2 (20以内加减)
  { id: 'wp-11', level: 2, emoji: '🏫', scenario: '一班有 12 个男生和 8 个女生。', question: '一班一共有多少个同学？', options: [18, 19, 20, 21], answer: 20, hint: '12 + 8 = ?', why: '男生 12 加女生 8，12+8=20。' },
  { id: 'wp-12', level: 2, emoji: '🎨', scenario: '美术课有 15 支彩笔，丢了 7 支。', question: '还剩几支彩笔？', options: [7, 8, 9, 22], answer: 8, hint: '15 - 7 = ?', why: '15 支减去丢的 7 支，15-7=8。' },
  { id: 'wp-13', level: 2, emoji: '🦋', scenario: '花园里有 9 只蝴蝶，又飞来了 8 只。', question: '花园里现在有几只蝴蝶？', options: [15, 16, 17, 18], answer: 17, hint: '9 + 8 = ?', why: '原来 9 只加上飞来 8 只，9+8=17。' },
  { id: 'wp-14', level: 2, emoji: '🍬', scenario: '小糖有 16 颗糖，分给朋友 9 颗。', question: '小糖还剩几颗糖？', options: [6, 7, 8, 25], answer: 7, hint: '16 - 9 = ?', why: '16 颗减去分出的 9 颗，16-9=7。' },
  { id: 'wp-15', level: 2, emoji: '⚽', scenario: '操场上有 13 人在踢球，又来了 7 人。', question: '操场上现在有多少人？', options: [19, 20, 21, 18], answer: 20, hint: '13 + 7 = ?', why: '原来 13 人加来 7 人，13+7=20。' },
  { id: 'wp-16', level: 2, emoji: '📖', scenario: '图书馆有 18 本绘本，借走了 9 本。', question: '图书馆还剩几本绘本？', options: [8, 9, 10, 27], answer: 9, hint: '18 - 9 = ?', why: '18 本减去借走 9 本，18-9=9。' },
  { id: 'wp-17', level: 2, emoji: '🌻', scenario: '花店有 14 朵向日葵，卖掉了 6 朵。', question: '花店还剩几朵向日葵？', options: [7, 8, 9, 20], answer: 8, hint: '14 - 6 = ?', why: '14 朵减去卖出 6 朵，14-6=8。' },
  { id: 'wp-18', level: 2, emoji: '🐝', scenario: '蜂巢有 11 只蜜蜂，飞出去 4 只采蜜。', question: '蜂巢里还剩几只蜜蜂？', options: [6, 7, 8, 15], answer: 7, hint: '11 - 4 = ?', why: '11 只减去飞出 4 只，11-4=7。' },
  { id: 'wp-19', level: 2, emoji: '🍐', scenario: '果篮里有 8 个梨和 7 个苹果。', question: '果篮里一共有几个水果？', options: [14, 15, 16, 13], answer: 15, hint: '8 + 7 = ?', why: '梨 8 个加苹果 7 个，8+7=15。' },
  { id: 'wp-20', level: 2, emoji: '🦆', scenario: '池塘里有 17 只鸭子，游走了 8 只。', question: '池塘里还剩几只鸭子？', options: [8, 9, 10, 25], answer: 9, hint: '17 - 8 = ?', why: '17 只减去游走 8 只，17-8=9。' },

  // Level 3 (两步计算/乘除启蒙)
  { id: 'wp-21', level: 3, emoji: '🍕', scenario: '一个披萨切成 8 块，小明吃了 3 块，小红吃了 2 块。', question: '披萨还剩几块？', options: [2, 3, 4, 5], answer: 3, hint: '8 - 3 - 2 = ?', why: '8 块减去小明 3 块再减小红 2 块，8-3-2=3。' },
  { id: 'wp-22', level: 3, emoji: '🎁', scenario: '有 3 个盒子，每个盒子里有 4 个礼物。', question: '一共有多少个礼物？', options: [10, 11, 12, 14], answer: 12, hint: '3 × 4 = ?', why: '3 盒每盒 4 个，3×4=12。' },
  { id: 'wp-23', level: 3, emoji: '🍪', scenario: '12 块饼干平均分给 3 个小朋友。', question: '每个小朋友分到几块？', options: [3, 4, 5, 6], answer: 4, hint: '12 ÷ 3 = ?', why: '12 块平均分 3 人，12÷3=4。' },
  { id: 'wp-24', level: 3, emoji: '🚸', scenario: '排队做操，小明前面有 5 人，后面有 6 人。', question: '这排一共有多少人？', options: [10, 11, 12, 13], answer: 12, hint: '5 + 1 + 6 = ?', why: '前面 5 人加小明自己再加后面 6 人，5+1+6=12。' },
  { id: 'wp-25', level: 3, emoji: '🌱', scenario: '种了 4 行树，每行 5 棵。', question: '一共种了多少棵树？', options: [16, 18, 20, 22], answer: 20, hint: '4 × 5 = ?', why: '4 行每行 5 棵，4×5=20。' },
  { id: 'wp-26', level: 3, emoji: '🥚', scenario: '有 15 个鸡蛋，装到盒子里，每盒装 5 个。', question: '需要几个盒子？', options: [2, 3, 4, 5], answer: 3, hint: '15 ÷ 5 = ?', why: '15 个每盒 5 个，15÷5=3。' },
  { id: 'wp-27', level: 3, emoji: '🛒', scenario: '苹果 3 元一斤，买了 4 斤，付了 20 元。', question: '找回多少钱？', options: [6, 7, 8, 12], answer: 8, hint: '20 - 3×4 = ?', why: '4 斤每斤 3 元共 12 元，20-12=8。' },
  { id: 'wp-28', level: 3, emoji: '🏫', scenario: '二年级有 3 个班，每班 15 人。', question: '二年级一共有多少人？', options: [40, 45, 50, 55], answer: 45, hint: '3 × 15 = ?', why: '3 班每班 15 人，3×15=45。' },
  { id: 'wp-29', level: 3, emoji: '⏰', scenario: '小华 7:00 出发，路上走了 20 分钟，又等了 5 分钟。', question: '小华几点到的？', options: [720, 725, 730, 735], answer: 725, hint: '7:00 + 20分 + 5分', why: '7 点加 25 分钟等于 7:25。' },
  { id: 'wp-30', level: 3, emoji: '💰', scenario: '一个文具盒 8 元，一支笔 3 元。', question: '买一个文具盒和两支笔共多少钱？', options: [12, 13, 14, 19], answer: 14, hint: '8 + 3×2 = ?', why: '文具盒 8 元加两支笔 6 元，8+6=14。' },
];

export function getProblemsByLevel(level: 1 | 2 | 3): WordProblem[] {
  return WORD_PROBLEMS.filter(p => p.level === level);
}

export function getAllProblems(): WordProblem[] {
  return WORD_PROBLEMS;
}
