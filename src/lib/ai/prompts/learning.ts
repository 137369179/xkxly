/**
 * AI Prompt · 学科类（古诗/数学/逻辑/字母/数字/汉字/拼音/单词/绘本）
 */
import type { AiMessage } from '../types';
import { PERSONA } from './core';
import type { Idiom } from '@/data/idioms';

/* ── helpers ─────────────────────────────────────────────── */
function sys(c: string): AiMessage { return { role: 'system', content: c }; }
function user(c: string): AiMessage { return { role: 'user', content: c }; }

/* ================================================================== */
/* 古诗导师 —— 讲解 + 多轮追问                                          */
/* ================================================================== */
export interface PoemCtx {
  title: string;
  author: string;
  dynasty: string;
  text: string;
  reference?: string;
}

export function poemTutorSystem(ctx: PoemCtx): AiMessage {
  return sys(
    `${PERSONA}

现在你在「古诗花园」，陪孩子读一首古诗。

讲解要求：
- 先说这句诗在讲什么画面，让孩子能想象出来
- 再说一个跟孩子生活有关的例子
- 全部回答不超过 3 句话

【当前这首诗】
《${ctx.title}》 ${ctx.dynasty}·${ctx.author}
${ctx.text}${ctx.reference ? `\n\n【参考资料，以此为准，不要编造】\n${ctx.reference}` : ''}`,
  );
}

export function poemTutorAsk(question: string): AiMessage {
  return user(question);
}

export function poemTutorOpening(): AiMessage {
  return user('请用最简单的话告诉我，这首诗在说什么？');
}

/* ================================================================== */
/* 背诵讲评 —— 结构化批改                                               */
/* ================================================================== */
export function reciteGradeMessages(
  title: string,
  original: string,
  answer: string,
): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你要批改孩子的古诗默写，要鼓励为主、指出错在哪。

只输出 JSON，格式：
{"score":0到100的整数,"praise":"一句表扬，不超过20字","wrong":[{"got":"孩子写错的字词","want":"正确的字词","tip":"为什么，不超过15字"}],"advice":"一句改进建议，不超过25字"}

规则：
- 完全正确时 wrong 为空数组，score 给 100
- wrong 最多列 3 条，挑最重要的
- 标点不算错`,
    ),
    user(`《${title}》\n\n【正确原文】\n${original}\n\n【孩子默写的】\n${answer}`),
  ];
}

export interface ReciteGrade {
  score: number;
  praise: string;
  wrong: { got: string; want: string; tip: string }[];
  advice: string;
}

/* ================================================================== */
/* 数学答错讲解                                                        */
/* ================================================================== */
export function mathExplainMessages(
  prompt: string,
  correct: string,
  chosen: string,
): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在孩子做算术题答错了，你要讲清楚为什么。

讲解结构（严格 3 句）：
1. 先安慰一句，别让孩子有挫败感
2. 用具体东西（苹果/小车/糖果）演示正确算法
3. 说出正确答案

不要说"你错了"，要说"我们再数一次"。`,
    ),
    user(`题目：${prompt}\n正确答案：${correct}\n孩子选的：${chosen}`),
  ];
}

/* ================================================================== */
/* 数学应用题生成                                                       */
/* ================================================================== */
export function mathGenerateMessages(theme: string, op: '加法' | '减法', max: number): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你要给孩子出一道${op}应用题，主题是「${theme}」。

只输出 JSON，格式：
{"prompt":"题目文字，不超过30字","display":"算式如 3+2=?","options":["选项1","选项2","选项3"],"answer":0,"hint":"答对后的一句小知识，不超过20字","why":"答错时的提示，不超过20字"}

规则：
- 数字都在 ${max} 以内，结果不能是负数
- options 是 3 个不同的数字字符串，answer 是正确答案在数组中的下标（0/1/2）
- 题目要有画面感，用孩子熟悉的东西`,
    ),
    user(`出一道${op}题，主题：${theme}`),
  ];
}

export interface GenMathQuestion {
  prompt: string;
  display: string;
  options: string[];
  answer: number;
  hint: string;
  why: string;
}

/* ================================================================== */
/* 逻辑规律揭秘                                                        */
/* ================================================================== */
export function logicExplainMessages(prompt: string, seq: string, correct: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你要给孩子讲清楚一道找规律题的规律是什么。

讲解结构（严格 2 句）：
1. 这一排东西是按什么顺序排的
2. 所以下一个应该是什么

要像在玩游戏一样说，不要像在讲课。`,
    ),
    user(`题目：${prompt}\n图形序列：${seq}\n正确答案：${correct}`),
  ];
}

/* ================================================================== */
/* 字母小故事                                                          */
/* ================================================================== */
export function letterStoryMessages(letter: string, word: string, cn: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「字母乐园」，要为一个英文字母编一段好记的顺口溜。

输出格式（严格 2 行，不要序号）：
第一行：一句押韵的中文顺口溜，帮孩子记住这个字母的形状，不超过 15 字
第二行：一句话说这个单词，不超过 15 字`,
    ),
    user(`字母：${letter}\n代表单词：${word}（${cn}）`),
  ];
}

/* ================================================================== */
/* 数字小故事                                                          */
/* ================================================================== */
export function numberStoryMessages(n: number): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「数字王国」，要为数字 ${n} 编一首好记的儿歌。

输出格式（严格 2 行，不要序号）：
第一行：用 ${n} 个东西编一句画面感的话，不超过 15 字
第二行：一句话说数字 ${n} 的特点，不超过 15 字`,
    ),
    user(`请为数字 ${n} 编一首儿歌。`),
  ];
}

/* ================================================================== */
/* AI 情景数数题                                                       */
/* ================================================================== */
export function countGenerateMessages(max: number, theme: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你要给孩子出一道数数应用题，主题是「${theme}」。

只输出 JSON，格式：
{"prompt":"题目文字，不超过30字","emoji":"一个表情符号","count":数字,"options":["选项1","选项2","选项3"],"answer":0,"hint":"答对后的小知识，不超过20字"}

规则：
- count 在 1 到 ${max} 之间
- options 是 3 个不同的数字字符串，answer 是正确答案在数组中的下标（0/1/2）
- 题目要有画面感，用孩子熟悉的东西`,
    ),
    user(`出一道数数题，主题：${theme}，数字范围 1-${max}`),
  ];
}

export interface GenCountQuestion {
  prompt: string;
  emoji: string;
  count: number;
  options: string[];
  answer: number;
  hint: string;
}

/* ================================================================== */
/* AI 字母配对出题                                                     */
/* ================================================================== */
export function letterMatchMessages(unlearned: string[], weak: string[], learned: string[]): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你要为字母配对游戏选 6 个字母。

只输出 JSON，格式：
{"letters":["A","B","C","D","E","F"]}

规则：
- 从未学字母 [${unlearned.join(',')}] 中选 3-4 个
- 从薄弱字母 [${weak.join(',')}] 中选 1-2 个（如果有）
- 从已学字母 [${learned.join(',')}] 中选 1-2 个
- 总共 6 个不同字母`,
    ),
    user(`请选 6 个字母用于配对游戏。`),
  ];
}

export interface GenLetterMatch {
  letters: string[];
}

/* ================================================================== */
/* 古诗画面想象                                                         */
/* ================================================================== */
export function poemImagineMessages(title: string, author: string, text: string, reference?: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「古诗花园」，要用孩子能懂的话描绘这首诗的画面。

要求：
- 用 3 句话描绘诗中场景，让孩子闭眼就能看到
- 用生活中见过的东西打比方
- 不超过 60 个字
- 不说"想象一下"这种开场，直接描绘`,
    ),
    user(`《${title}》 ${author}\n${text}${reference ? `\n\n参考：${reference}` : ''}`),
  ];
}

/* ================================================================== */
/* 古诗对比讲解                                                         */
/* ================================================================== */
export interface PoemCompareInput {
  titleA: string; authorA: string; textA: string;
  titleB: string; authorB: string; textB: string;
}

export function poemCompareMessages(input: PoemCompareInput): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你要给孩子讲两首古诗的相同点和不同点。

讲解结构（严格 4 句）：
1. 两首诗都在讲什么
2. 它们哪里一样
3. 它们哪里不一样
4. 你更喜欢哪一首的什么

不超过 80 个字。`,
    ),
    user(`第一首：《${input.titleA}》 ${input.authorA}\n${input.textA}\n\n第二首：《${input.titleB}》 ${input.authorB}\n${input.textB}`),
  ];
}

/* ================================================================== */
/* 格律 AI 解读                                                         */
/* ================================================================== */
export function poemProsodyMessages(title: string, author: string, prosodyInfo: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你要用孩子能懂的话解释一首诗为什么读起来好听。

要求：
- 用 2 句话，不超过 40 个字
- 提到押韵或对仗，但不要用"押韵""对仗"这些词，用"句尾字一样""上下句对得整整齐齐"代替
- 像在夸这首诗一样`,
    ),
    user(`《${title}》 ${author}\n格律信息：${prosodyInfo}`),
  ];
}

/* ================================================================== */
/* 诗人故事会                                                           */
/* ================================================================== */
export function poetStoryMessages(poetName: string, dynasty: string, bio: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你要给孩子讲一个关于诗人的小故事。

要求：
- 用 3 句话讲一个有趣的小故事，让孩子觉得诗人是个有趣的人
- 不超过 60 个字
- 用"他"而不是诗人名字来称呼
- 可以编一个跟诗人性格相关的小情节，但不要编造历史事件`,
    ),
    user(`诗人：${poetName}（${dynasty}）\n生平：${bio}`),
  ];
}

/* ================================================================== */
/* 汉字识字 · 汉字小故事                                                  */
/* ================================================================== */
export interface HanziStoryCtx {
  char: string;
  meaning?: string;
  origin?: string;
  evolve?: string;
}

export function hanziStoryMessages(ctx: HanziStoryCtx): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「汉字乐园」，要为一个汉字编一个小故事，帮孩子记住它。

故事要求：
- 用 3-4 句话讲一个小故事，不超过 80 个字
- 故事里要融入这个字的字形特点（像什么样子）和字义（什么意思）
- 如果有字源信息，用孩子能懂的话提一下
- 故事要有趣，像讲童话一样
- 结尾帮孩子总结一句「所以这个字就是这样写的」`,
    ),
    user(`汉字：${ctx.char}${ctx.meaning ? `\n字义：${ctx.meaning}` : ''}${ctx.origin ? `\n字源：${ctx.origin}` : ''}${ctx.evolve ? `\n演变：${ctx.evolve}` : ''}`),
  ];
}

/* ================================================================== */
/* 汉字识字 · 造句                                                       */
/* ================================================================== */
export interface HanziSentenceCtx {
  char: string;
  words?: string[];
  sentence?: string;
}

export function hanziSentenceMessages(ctx: HanziSentenceCtx): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你要用目标汉字造 2-3 个句子，帮孩子在生活场景中理解它的用法。

要求：
- 每个句子不超过 15 个字
- 用孩子生活中的场景（吃饭、玩耍、上学）
- 句子要简单好懂，有画面感
- 每个句子独占一行，不要编号`,
    ),
    user(`汉字：${ctx.char}${ctx.words?.length ? `\n常用词语：${ctx.words.join('、')}` : ''}${ctx.sentence ? `\n参考例句：${ctx.sentence}` : ''}`),
  ];
}

/* ================================================================== */
/* 拼音辅导                                                             */
/* ================================================================== */
export interface PinyinTutorCtx {
  symbol: string;
  type: 'initial' | 'final' | 'whole';
  confusedWith?: string[];
}

export function pinyinTutorMessages(ctx: PinyinTutorCtx): AiMessage[] {
  const typeLabel = ctx.type === 'initial' ? '声母' : ctx.type === 'final' ? '韵母' : '整体认读音节';
  return [
    sys(
      `${PERSONA}

现在你在「拼音城堡」，要教孩子发准一个${typeLabel}的音。

讲解要求：
- 用 3-4 句话，不超过 80 个字
- 第一句说嘴巴怎么张：嘴唇是圆是扁，舌头放哪里
- 第二句说发出来的声音像什么（用孩子熟悉的声音打比方）
- 如果有容易混淆的音，说一句怎么区分
- 最后鼓励孩子跟着念一遍`,
    ),
    user(`${typeLabel}：${ctx.symbol}${ctx.confusedWith?.length ? `\n容易混淆的音：${ctx.confusedWith.join('、')}` : ''}`),
  ];
}

/* ================================================================== */
/* 英语单词故事                                                         */
/* ================================================================== */
export interface WordStoryCtx {
  word: string;
  meaning: string;
  pos?: string;
}

export function wordStoryMessages(ctx: WordStoryCtx): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「英语故事屋」，要用一个英语单词编一个简短的小故事。

故事要求：
- 用 3-4 句话讲一个小故事，不超过 60 个字
- 故事里要出现这个英语单词至少 2 次
- 用孩子能懂的生活场景
- 结尾用中文总结一句这个单词的意思
- 故事要有趣，让孩子想跟着说`,
    ),
    user(`单词：${ctx.word}（${ctx.meaning}）${ctx.pos ? `\n词性：${ctx.pos}` : ''}`),
  ];
}

/* ================================================================== */
/* 自然拼读讲解                                                         */
/* ================================================================== */
export interface WordPhonicsCtx {
  letters: string;
  sound?: string;
  examples?: string[];
}

export function wordPhonicsMessages(ctx: WordPhonicsCtx): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「拼读音乐园」，要教孩子一组字母或字母组合怎么发音。

讲解要求：
- 用 3-4 句话，不超过 80 个字
- 第一句说这组字母发什么音，用中文近似音打个比方
- 第二句给 2-3 个包含这个发音的单词做例子
- 如果有容易混的音，说一句怎么区分
- 最后鼓励孩子跟着念一遍`,
    ),
    user(`字母/字母组合：${ctx.letters}${ctx.sound ? `\n发音：${ctx.sound}` : ''}${ctx.examples?.length ? `\n示例单词：${ctx.examples.join(', ')}` : ''}`),
  ];
}

/* ================================================================== */
/* AI 故事绘本生成                                                       */
/* ================================================================== */
export interface StoryBookPageData {
  pageNumber: number;
  title: string;
  content: string;
  illustrationTheme: string;
  bgColor: string;
  emoji: string;
}

export interface StoryBookData {
  bookTitle: string;
  author: string;
  moral: string;
  pages: StoryBookPageData[];
}

export function storybookMessages(
  character: string,
  theme: string,
  style?: import('@/modules/storybook/types').StorybookStyle,
  userPrompt?: string,
): AiMessage[] {
  const styleHints: Record<string, string> = {
    warm: '故事风格：温馨感人，充满爱和关怀，结局温暖美好',
    adventure: '故事风格：冒险刺激，有挑战和勇气，结局胜利欢呼',
    funny: '故事风格：幽默搞笑，有意想不到的转折，让孩子哈哈大笑',
  };
  const styleLine = style ? styleHints[style] ?? '' : '';
  return [
    sys(
      `${PERSONA}

现在你要为孩子创作一本精美的儿童连环故事绘本。
${styleLine}

只输出 JSON，格式：
{
  "bookTitle": "绘本大标题，如《小狮子的大航海》",
  "author": "小智 & 宝贝",
  "moral": "一句话启示/道理，不超过20字",
  "pages": [
    {
      "pageNumber": 1,
      "title": "章节小标题，如 发现神秘地图",
      "content": "故事内容，2-3句话，语言生动形象有童趣，不超过60字",
      "illustrationTheme": "插画主题关键词，如 space, magic, sea, forest",
      "bgColor": "#fff4d6",
      "emoji": "🦁"
    }
  ]
}

规则：
- pages 必须包含恰好 4 个连续的页面（pageNumber 1 到 4）
- 故事必须情节完整：起因 → 发展 → 高潮 → 欢快大团圆
- bgColor 使用好看柔和的马卡龙浅色 HEX code（如 #FFF4D6, #DCE8FA, #F0FAF4, #F8F0FD）
- emoji 选择与该页故事情节最契合的卡通表情`,
    ),
    user(`主角小伙伴：${character}\n故事场景/主题：${theme}${userPrompt ? `\n宝贝的特别点子：${userPrompt}` : ''}`),
  ];
}

/* ================================================================== */
/* 答对知识扩展                                                         */
/* ================================================================== */
export function quizExtendMessages(prompt: string, correct: string, skill: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

孩子连续答对了好几题，你要给一个跟当前题目相关的有趣小知识。

要求：
- 只说 1 句话，不超过 25 个字
- 必须跟这道题的内容相关，不要空泛
- 像在分享一个秘密一样有趣`,
    ),
    user(`题目：${prompt}\n正确答案：${correct}\n知识点：${skill}`),
  ];
}

/* ================================================================== */
/* 闯关失败鼓励                                                         */
/* ================================================================== */
export function adventureEncourageMessages(levelTitle: string, weakTypes: string, stars: number): AiMessage[] {
  return [
    sys(
      `${PERSONA}

孩子闯关只得了 ${stars} 颗星，你要鼓励他并指出怎么提高。

要求：
- 1 句鼓励，提到具体哪类题需要多练
- 不超过 30 个字
- 不说"失败了""没通过"，说"差一点点就三颗星了"`,
    ),
    user(`关卡：${levelTitle}\n薄弱题型：${weakTypes}\n获得星数：${stars}`),
  ];
}

/* ================================================================== */
/* 成语模块                                                             */
/* ================================================================== */
/** 成语故事讲解 */
export function idiomStoryMessages(idiom: Idiom): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「成语故事屋」，要给宝贝讲一个成语故事。

故事要求：
- 用 4-6 句话讲一个生动有趣的故事，不超过 120 个字
- 故事里要有主人公（小动物、小朋友都行），有情节
- 故事要自然地体现这个成语的意思
- 结尾用一句话总结这个成语告诉我们什么道理
- 像讲童话一样，让宝贝想一直听下去`,
    ),
    user(`成语：${idiom.word}\n拼音：${idiom.pinyin}\n释义：${idiom.meaning}\n参考故事：${idiom.story}\n例句：${idiom.example}`),
  ];
}

/** 成语造句 */
export function idiomSentenceMessages(idiom: Idiom): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你要为成语造 3 个例句，分别用在 3 个场景里，让宝贝选最有趣的一句。

只输出 JSON，格式：
{"sentences":[{"scene":"学校","text":"在学校里用这个成语造的句子，不超过20字"},{"scene":"家庭","text":"在家里用这个成语造的句子，不超过20字"},{"scene":"户外","text":"在户外用这个成语造的句子，不超过20字"}]}

规则：
- 3 个句子必须各不相同，场景要鲜明
- 句子要简单好懂，5 岁孩子能理解
- 每个句子不超过 20 个字
- 句子要有趣有画面感，让宝贝想笑或想跟着说`,
    ),
    user(`成语：${idiom.word}\n释义：${idiom.meaning}\n参考例句：${idiom.example}`),
  ];
}

/** 成语接龙提示 */
export function idiomHintMessages(lastChar: string, excludeIdioms: string[]): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在宝贝在玩成语接龙，卡住了，需要你给一个提示。注意：不能直接告诉答案！

只输出 JSON，格式：
{"char":"首字","pinyin":"首字拼音","emoji":"相关表情","clue":"线索，不超过25字"}

规则：
- char 就是接龙需要匹配的首字：「${lastChar}」
- pinyin 是这个字的拼音
- emoji 选一个跟可能的成语相关的表情
- clue 给一个模糊的提示，比如「想想和动物有关的成语」或「有个故事说一个人在井里…」
- 绝对不能在 clue 里出现任何完整成语
- 不要在输出中包含任何成语答案`,
    ),
    user(`接龙需要找一个以「${lastChar}」开头的成语。${excludeIdioms.length > 0 ? `已经用过的成语：${excludeIdioms.join('、')}` : ''}请给一个提示，帮宝贝想到答案，但不要直接说答案。`),
  ];
}
