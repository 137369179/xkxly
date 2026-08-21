/**
 * 表扬 / 鼓励语库（从 speech.ts 拆分）
 * ------------------------------------------------------------
 * 幼儿学习场景的分场景话术库：
 * - 表扬语（答对）：分 9 个场景（general/hanzi/pinyin/word/letter/number/poem/math/combo）
 * - 鼓励语（答错）：分 8 个场景（无 combo）
 * 附 skill id → 场景映射工具，让话术带"题型语境"。
 */

/* ============================================================
   场景类型
   ============================================================ */
/** 表扬场景：按学习模块区分 */
export type PraiseScene = 'general' | 'hanzi' | 'pinyin' | 'word' | 'letter' | 'number' | 'poem' | 'math' | 'combo';
/** 鼓励场景：不含 combo（连击鼓励不用于答错场景） */
export type EncourageScene = 'general' | 'hanzi' | 'pinyin' | 'word' | 'letter' | 'number' | 'poem' | 'math';

/* ============================================================
   表扬语库（按场景分类）
   ------------------------------------------------------------
   - general：通用夸奖
   - hanzi/pinyin/word/letter/number/poem/math：具体学科语境
   - combo：连击表扬（连续答对时使用）
   ============================================================ */
const PRAISES_BY_SCENE: Record<PraiseScene, string[]> = {
  general: [
    '真棒！',
    '太厉害了！',
    '你做对了！',
    '太棒啦！',
    '你真聪明！',
    '答对了，好厉害！',
    '完全正确！',
    '宝贝真棒！',
    '好厉害呀！',
    '真了不起！',
    '真了不起，给你点赞！',
    '做得真好！',
  ],
  hanzi: [
    '笔顺记对了！',
    '这个部首认得准！',
    '字写得很漂亮！',
    '这个字认得真准！',
    '笔顺写对了！',
  ],
  pinyin: ['拼音读得很准！', '声调记得牢！', '韵母认得真清楚！', '拼音拼对了！'],
  word: ['这个单词拼得对！', '发音真标准！', '单词记得真牢！', '这个单词读得真准！', '拼写完全正确！'],
  letter: ['字母认得很准！', '这个字母读得对！', '字母顺序记得牢！', '大小写分得清！', '字母写得很漂亮！'],
  number: ['数字写得很漂亮！', '数数真准确！', '这个数字认得对！', '数字记得真牢！'],
  poem: ['古诗背得真流利！', '诗句记得牢！', '背得真有感情！', '整首诗都背对了！'],
  math: ['算得真快！', '答案正确！', '算式列得真清楚！', '算得真准确！'],
  combo: ['连续答对了！', '你真专注！', '越做越好！', '连击真厉害！', '势头真好！'],
};

/**
 * 鼓励语库（按场景分类）
 * - general：温柔鼓励
 * - hanzi/pinyin/word/letter/number/poem/math：具体引导
 */
const ENCOURAGES_BY_SCENE: Record<EncourageScene, string[]> = {
  general: [
    '再试一次吧',
    '差一点点就对了',
    '没关系，多练几次就好',
    '慢慢来，不着急',
    '没关系，再试一次！',
    '差一点点，加油！',
    '再想一想吧！',
    '不要灰心，你可以的！',
    '再来一次好不好？',
    '换个角度试试',
    '看看提示再想想',
    '这个有点难，再看看',
  ],
  hanzi: ['看看这个字再想想', '笔顺再回想一下', '部首仔细看看', '这个字再认认'],
  pinyin: ['听听拼音再试试', '声调再想一想', '韵母再看看', '拼音再读一遍'],
  word: ['听听发音再试试', '字母再拼一拼', '这个单词再看看', '跟着读一遍再试'],
  letter: ['字母再认一认', '顺序再想一想', '这个字母再看看', '跟着读一遍试试'],
  number: ['数一数再试试', '数字再看看', '慢慢数清楚', '这个数字再认认'],
  poem: ['听听古诗再想想', '下一句再回忆一下', '慢慢背不着急', '这句诗再想想'],
  math: ['算式再算一遍', '换个方法试试', '数数看再算一次', '再算一遍好吗'],
};

/** 所有表扬语的扁平集合（供 randomPraise 向后兼容使用） */
const ALL_PRAISES: string[] = Object.values(PRAISES_BY_SCENE).flat();
/** 所有鼓励语的扁平集合（供 randomEncourage 向后兼容使用） */
const ALL_ENCOURAGES: string[] = Object.values(ENCOURAGES_BY_SCENE).flat();

function pickFrom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)]!;
}

/**
 * 随机表扬语（向后兼容）。
 * 答对时 50% 概率返回空字符串，避免每次都念叨，让调用方决定是否朗读；
 * 调用方若需要稳定的非空文本，请使用 praiseByScene。
 */
export function randomPraise(): string {
  if (Math.random() < 0.5) return '';
  return pickFrom(ALL_PRAISES);
}

/** 随机鼓励语（向后兼容，始终返回非空） */
export function randomEncourage(): string {
  return pickFrom(ALL_ENCOURAGES);
}

/** 按场景获取表扬语（永不返回空字符串） */
export function praiseByScene(scene: PraiseScene): string {
  const list = PRAISES_BY_SCENE[scene]! ?? PRAISES_BY_SCENE.general;
  return pickFrom(list);
}

/** 按场景获取鼓励语（永不返回空字符串） */
export function encourageByScene(scene: EncourageScene): string {
  const list = ENCOURAGES_BY_SCENE[scene]! ?? ENCOURAGES_BY_SCENE.general;
  return pickFrom(list);
}

/**
 * 核心加强 H：skill id → 场景映射
 * ------------------------------------------------------------
 * 让题目答对/答错时的表扬鼓励语带上"题型语境"：
 *   - hanzi:山 → 'hanzi'（"笔顺记对了！"比"真棒！"更有针对性）
 *   - math:add → 'math'（"算得真快！"）
 *   - poem:xxx → 'poem'（"古诗背得真流利！"）
 *   - word:cat → 'word'（"这个单词拼得对！"）
 *   - letter:A → 'letter'（"字母认得很准！"）
 *   - pinyin:a → 'pinyin'
 *   - 未知/通用 skill → 'general'
 * 这样孩子每次答对都能听到与当前学习内容相关的鼓励，
 * 而不是千篇一律的"真棒"，强化正向反馈的具体性。
 */
export function skillToPraiseScene(skill?: string): PraiseScene {
  if (!skill) return 'general';
  const cat = skill.split(':')[0];
  switch (cat) {
    case 'hanzi':
    case 'similar':
      return 'hanzi';
    case 'pinyin':
    case 'rhyme':
      return 'pinyin';
    case 'word':
      return 'word';
    case 'letter':
    case 'letter-order':
      return 'letter';
    case 'number':
    case 'count':
      return 'number';
    case 'poem':
      return 'poem';
    case 'math':
      return 'math';
    default:
      return 'general';
  }
}

/** skill id → 鼓励场景（与表扬场景同映射，但不含 combo） */
export function skillToEncourageScene(skill?: string): EncourageScene {
  const s = skillToPraiseScene(skill);
  // PraiseScene 比 EncourageScene 多一个 'combo'，combo 不适用鼓励场景，回退 general
  return s === 'combo' ? 'general' : s;
}
