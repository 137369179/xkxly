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
  "author": "小茜 & 宝贝",
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

/* ================================================================== */
/* 科学十万个为什么                                                    */
/* ================================================================== */
export function scienceAskMessages(question: string, contextTopic?: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「科学探索馆」，正在回答小朋友提出的科学常识好奇提问。

回答要求：
1. 充满童趣：用生动的生活比喻（如太阳像大火炉、云朵像吸饱水的大海绵、小松鼠的大尾巴像小降落伞）。
2. 科学严谨：核心事实必须准确，不能传递伪科学。
3. 结构简练（严格 3-4 句话，不超过 100 字）：
   - 第一句：赞美孩子的好奇心，给出神奇现象的直观比喻。
   - 第二句：解释科学原理（最核心的原因）。
   - 第三句：结尾提出一个小互动或观察建议。`,
    ),
    user(`科学问题：${question}${contextTopic ? `\n背景探索主题：${contextTopic}` : ''}`),
  ];
}

/* ================================================================== */
/* 汉字字形记忆口诀                                                    */
/* ================================================================== */
export function hanziMnemonicMessages(char: string, pinyin?: string, meaning?: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「汉字乐园」，要为汉字「${char}」编写一个生动形象的记忆口诀。

要求：
1. 观察这个汉字的结构/偏旁/象形特点（例如：“休”是一人靠木头，“森”是三棵树成森林）。
2. 编写一首 2-4 句朗朗上口的顺口溜口诀，押韵好记。
3. 解释口诀里为什么这么记，字的意思是什么。
4. 全文不超过 80 字，生动有趣。`,
    ),
    user(`汉字：${char}${pinyin ? `\n拼音：${pinyin}` : ''}${meaning ? `\n含义：${meaning}` : ''}`),
  ];
}

/* ================================================================== */
/* 英语趣味互动小问答                                                  */
/* ================================================================== */
export function wordQuizMessages(word: string, meaning: string, example?: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「英语小天地」，带宝贝认识英文单词「${word}」（中文：${meaning}）。

要求：
1. 用可爱活泼的语气打招呼并念出单词。
2. 讲一句生活情景中的小例句（中英对照）。
3. 结尾出一个可爱的小提问让宝贝跟着互动。
4. 语言简短，总字数不超过 70 字。`,
    ),
    user(`单词：${word}\n中文释义：${meaning}${example ? `\n参考例句：${example}` : ''}`),
  ];
}

/* ================================================================== */
/* 交互式互动分支绘本续写                                              */
/* ================================================================== */
export interface StoryBranchData {
  text: string;
  emoji: string;
  isEnd: boolean;
  choices: string[];
}

export function storybookBranchMessages(
  previousSummary: string,
  chosenOption: string,
  character: string,
  pageNum: number,
): AiMessage[] {
  const isFinal = pageNum >= 4;
  return [
    sys(
      `${PERSONA}

现在你在「魔法绘本屋」，正在为宝贝进行互动式分支绘本的剧情续写。

输出格式必须是纯 JSON，严格如下格式：
{
  "text": "本页故事正文（40-70字，生动有趣，分1-2段）",
  "emoji": "本页核心情境emoji",
  "isEnd": ${isFinal ? 'true' : 'false'},
  "choices": ${isFinal ? '[]' : '["选项A（10字内）", "选项B（10字内）"]'}
}

规则：
- 主人公：${character}
- 紧密承接上一页故事以及宝贝刚才的选择：「${chosenOption}」
- ${isFinal ? '这是故事大结局，请给出一个温馨圆满的结尾' : '提供 2 个充满童趣的未来选择分支让宝贝决定'}`,
    ),
    user(`前文概要：${previousSummary}\n宝贝做出的选择：${chosenOption}\n当前页码：第 ${pageNum} 页`),
  ];
}

/* ================================================================== */
/* 科学家庭微实验指南                                                  */
/* ================================================================== */
export function scienceExperimentMessages(topic: string, question?: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「科学探索馆」，请为小朋友和家长设计一个【家庭安全微实验】。

要求：
1. 取材日常：只需杯子、水、纸巾、手电筒、吸管或小镜子等家中常见物品。
2. 绝对安全：严禁任何火、电、尖锐物或化学品。
3. 步骤清晰（严格 3 步）：
   - 【准备道具】：列出 2-3 样小物品
   - 【动手小实验】：2 句话说明怎么做
   - 【神奇大发现】：1 句话解释实验看到的神奇科学原理
4. 语言活泼亲切，总字数不超过 100 字。`,
    ),
    user(`科学主题：${topic}${question ? `\n问题：${question}` : ''}`),
  ];
}

/* ================================================================== */
/* 安全情境角色扮演对练                                                */
/* ================================================================== */
export function safetyRoleplayMessages(scenario: string, childResponse?: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「安全小卫士演练场」，正在和宝贝进行生活安全情景角色扮演互动。

规则：
1. 扮演一个逼真但不过度惊悚的情景（如：有陌生人敲门送快递、在商场找不到妈妈、有大狗狗突然跑过来）。
2. 若孩子没有回答，由你抛出情境并询问孩子：“宝贝，这时候你该怎么做呢？”
3. 若孩子给出了回答，先热情表扬孩子的机智，并补全一条最关键的安全避险守则。
4. 全文简短，不超过 80 字。`,
    ),
    user(`安全情景：${scenario}${childResponse ? `\n宝贝的回答：${childResponse}` : ''}`),
  ];
}

/* ================================================================== */
/* AI 错题名师变式题（结构化 JSON）                                      */
/* ================================================================== */
export interface WrongVariantQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  hint: string;
}

export function wrongVariantMessages(
  skillId: string,
  originalQuestion: string,
  originalAnswer: string,
): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你要为孩子出一道【知识点完全相同，但情境全新】的举一反三变式题。

只输出 JSON，格式必须严格如下：
{
  "question": "新变式题目，语言生动童趣，配小动物/水果情境（40字内）",
  "options": ["选项A", "选项B", "选项C", "选项D"],
  "answer": "正确选项内容（必须完全匹配 options 中的某一项）",
  "explanation": "简短解题步骤与思路（30字内）",
  "hint": "给孩子的答题小提示（15字内）"
}

规则：
- 考察相同的核心技能：${skillId}
- options 恰好 4 个选项，干扰项要有辨识度且难度适中
- 题目要温馨有趣，适合 3-8 岁儿童`,
    ),
    user(`原错题技能：${skillId}\n原题内容：${originalQuestion}\n原题正确答案：${originalAnswer}`),
  ];
}

/* ================================================================== */
/* AI 逻辑小侦探情景推理                                               */
/* ================================================================== */
export function logicDetectiveMessages(theme: string): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「逻辑小侦探俱乐部」，请为小朋友出一个有趣的【微型情境推理小谜题】。

要求：
1. 设定一个生动可爱的破案情境（如：森林蛋糕不见了、谁戴了红帽子、小动物按什么规律排队）。
2. 提供 2 条简明清晰的线索。
3. 结尾抛出一个推理问题：“小侦探，你能猜出是谁/下一个是什么吗？”
4. 语言活泼，不超过 80 字。`,
    ),
    user(`侦探主题：${theme}`),
  ];
}

/* ================================================================== */
/* AI 汉字/生词儿歌顺口溜创作                                          */
/* ================================================================== */
export function rhymeCreateMessages(subject: string, type: 'hanzi' | 'word' = 'hanzi'): AiMessage[] {
  return [
    sys(
      `${PERSONA}

现在你在「儿歌小作坊」，请为${type === 'hanzi' ? `汉字「${subject}」` : `英文单词「${subject}」`}创作一首朗朗上口的【2-4句押韵小儿歌】。

要求：
1. 必须押韵、节奏明快、充满童趣。
2. 融入该${type === 'hanzi' ? '汉字的字义或字形' : '单词的中文含义与发音'}。
3. 全文不超过 60 字，适合拍手念唱。`,
    ),
    user(`创作对象：${subject}`),
  ];
}



