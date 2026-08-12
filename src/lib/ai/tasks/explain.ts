/**
 * AI 任务 · 讲解类（流式）
 * 数学答错讲解 / 逻辑规律揭秘 / 古诗导师多轮问答
 * v6 新增：古诗画面想象 / 古诗对比讲解 / 格律 AI 解读 / 诗人故事会 / 答对知识扩展
 */
import {
  logicExplainMessages,
  mathExplainMessages,
  poemTutorAsk,
  poemTutorOpening,
  poemTutorSystem,
  poemImagineMessages,
  poemCompareMessages,
  poemProsodyMessages,
  poetStoryMessages,
  quizExtendMessages,
  hanziStoryMessages,
  pinyinTutorMessages,
  wordPhonicsMessages,
  type PoemCtx,
  type PoemCompareInput,
  type HanziStoryCtx,
  type PinyinTutorCtx,
  type WordPhonicsCtx,
} from '../prompts';
import type { AiMessage } from '../types';
import { pick, type StreamTask } from './types';

/* ================================================================== */
/* 数学答错讲解                                                        */
/* ================================================================== */

/** 本地兜底：按算式手工造一段「数苹果」式讲解 */
function mathFallback(display: string, correct: string): string {
  const m = display.match(/(\d+)\s*([+\-])\s*(\d+)/);
  if (!m) return `没关系，我们再算一次。正确答案是 ${correct} 哦，下次一定行！`;
  const [, a, op, b] = m;
  if (op === '+') {
    return `没关系呀，我们一起数一次。先拿 ${a} 个苹果，再放进 ${b} 个苹果。一个一个数下去，一共是 ${correct} 个！`;
  }
  return `没关系呀，我们一起数一次。原来有 ${a} 个苹果，被吃掉 ${b} 个。剩下的就是 ${correct} 个！`;
}

export function mathExplainTask(
  promptText: string,
  display: string,
  correct: string,
  chosen: string,
): StreamTask {
  return {
    scene: 'math.explain',
    messages: mathExplainMessages(promptText || display, correct, chosen),
    // 同一道题 + 同一个错选项，讲解可以复用
    cacheKey: `${display}|${correct}|${chosen}`,
    fallback: mathFallback(display, correct),
    title: '小智讲一讲',
    hint: '正在想怎么讲给你听…',
  };
}

/* ================================================================== */
/* 逻辑规律揭秘                                                        */
/* ================================================================== */

const LOGIC_FALLBACK = [
  '你看这一排，是不是有几个图案在轮流出现呀？照着这个顺序往下排，就知道是谁啦！',
  '这些图案在玩「排队游戏」，前面怎么排，后面就怎么排。跟着节奏走就找到答案啦！',
];

export function logicExplainTask(
  promptText: string,
  seq: string,
  correct: string,
): StreamTask {
  return {
    scene: 'logic.explain',
    messages: logicExplainMessages(promptText, seq, correct),
    cacheKey: `${seq}|${correct}`,
    fallback: `${pick(LOGIC_FALLBACK, seq.length)}正确答案是 ${correct}。`,
    title: '规律大揭秘',
    hint: '小智正在找规律…',
  };
}

/* ================================================================== */
/* 古诗导师（支持多轮）                                                */
/* ================================================================== */

/**
 * @param history 之前的对话（不含 system），用于多轮追问
 * @param question 本轮提问；不传表示开场，让小智主动讲这首诗
 */
export function poemTutorTask(
  ctx: PoemCtx,
  question?: string,
  history: AiMessage[] = [],
): StreamTask {
  const ask = question ? poemTutorAsk(question) : poemTutorOpening();
  return {
    scene: 'poem.tutor',
    messages: [poemTutorSystem(ctx), ...history, ask],
    // 只有开场白值得缓存；追问内容千变万化，缓存反而会答非所问
    cacheKey: question || history.length ? undefined : `open:${ctx.title}:${ctx.author}`,
    fallback:
      ctx.reference?.slice(0, 120) ||
      `这首《${ctx.title}》是${ctx.dynasty}朝${ctx.author}写的。你先跟着读一遍，念出来就能感觉到它的画面啦！`,
    title: '问问小智',
    hint: '小智正在读这首诗…',
  };
}

/* ================================================================== */
/* v6 新增：古诗画面想象                                               */
/* ================================================================== */
export function poemImagineTask(
  title: string,
  author: string,
  text: string,
  reference?: string,
): StreamTask {
  return {
    scene: 'poem.imagine',
    messages: poemImagineMessages(title, author, text, reference),
    cacheKey: `imagine:${title}:${author}`,
    fallback:
      reference?.slice(0, 60) ||
      `闭上眼睛，想象一下诗里的画面，${text.slice(0, 30)}……多美呀！`,
    title: '想象画面',
    hint: '小智正在描绘画面…',
  };
}

/* ================================================================== */
/* v6 新增：古诗对比讲解                                               */
/* ================================================================== */
export function poemCompareTask(input: PoemCompareInput): StreamTask {
  return {
    scene: 'poem.compare',
    messages: poemCompareMessages(input),
    cacheKey: `compare:${input.titleA}:${input.titleB}`,
    fallback: `两首诗都在写自然景色。《${input.titleA}》和《${input.titleB}》各有各的美，你更喜欢哪一首呢？`,
    title: '小智讲异同',
    hint: '小智正在对比两首诗…',
  };
}

/* ================================================================== */
/* v6 新增：格律 AI 解读                                              */
/* ================================================================== */
export function poemProsodyTask(
  title: string,
  author: string,
  prosodyInfo: string,
): StreamTask {
  return {
    scene: 'poem.prosody',
    messages: poemProsodyMessages(title, author, prosodyInfo),
    cacheKey: `prosody:${title}:${author}`,
    fallback: '这首诗读起来很好听，因为句尾的字声音相近，像唱歌一样有节奏！',
    title: '小智说格律',
    hint: '小智正在想这首诗为什么好听…',
  };
}

/* ================================================================== */
/* v6 新增：诗人故事会                                                */
/* ================================================================== */
export function poetStoryTask(
  poetName: string,
  dynasty: string,
  bio: string,
): StreamTask {
  return {
    scene: 'poet.story',
    messages: poetStoryMessages(poetName, dynasty, bio),
    cacheKey: `poet:${poetName}`,
    fallback: `${poetName}是${dynasty}朝的大诗人，他写的诗到现在还有很多人在读呢！`,
    title: '听诗人故事',
    hint: '小智正在讲故事…',
  };
}

/* ================================================================== */
/* v6 新增：答对知识扩展                                              */
/* ================================================================== */
export function quizExtendTask(
  prompt: string,
  correct: string,
  skill: string,
): StreamTask {
  return {
    scene: 'quiz.extend',
    messages: quizExtendMessages(prompt, correct, skill),
    fallback: `你知道吗？${correct} 这个答案其实还有很多有趣的秘密哦！`,
    title: '小智说你知道吗',
    hint: '小智正在想一个小知识…',
  };
}

/* ================================================================== */
/* 汉字小故事                                                        */
/* ================================================================== */
export function hanziStoryTask(ctx: HanziStoryCtx): StreamTask {
  return {
    scene: 'hanzi.story',
    messages: hanziStoryMessages(ctx),
    cacheKey: `hanzi:${ctx.char}`,
    fallback:
      [ctx.origin, ctx.evolve].filter(Boolean).join('') ||
      `这个「${ctx.char}」字${ctx.meaning ? `表示${ctx.meaning}` : ''}，仔细看看它的样子，是不是很有趣呀？`,
    title: '汉字小故事',
    hint: '小智正在编故事…',
  };
}

/* ================================================================== */
/* 拼音辅导                                                        */
/* ================================================================== */
const PINYIN_FALLBACKS: Record<string, string> = {
  a: '嘴巴张大，像看医生说「啊——」，发出来的就是 a 的音！',
  o: '嘴巴圆圆，像公鸡打鸣「喔喔喔」，发出来的就是 o 的音！',
  e: '嘴巴扁扁，笑一笑，发出来的就是 e 的音！',
  i: '嘴角拉开，像微笑一样，发出来的就是 i 的音！',
  u: '嘴巴嘟起来，像要吹泡泡，发出来的就是 u 的音！',
  ü: '嘴巴圆圆往前撅，发出来的就是 ü 的音！',
  b: '嘴唇先闭上，再突然打开，像水泡泡破了一样，发出来的就是 b！',
  p: '跟 b 一样嘴巴先闭上，但打开时吹一口气，发出来的就是 p！',
  m: '嘴唇闭上，鼻子出声，像叫妈妈一样，发出来的就是 m！',
  f: '上牙轻轻咬住下嘴唇，吹一口气，发出来的就是 f！',
  d: '舌尖顶住上牙床，突然放开，发出来的就是 d！',
  t: '跟 d 一样，但放开时吹一口气，发出来的就是 t！',
  n: '舌尖顶住上牙床，鼻子出声，发出来的就是 n！',
  l: '舌尖顶住上牙床，声音从两边出来，发出来的就是 l！',
  g: '舌根顶住软腭，突然放开，发出来的就是 g！',
  k: '跟 g 一样，但放开时吹一口气，发出来的就是 k！',
  h: '舌根靠近软腭，摩擦出气，发出来的就是 h！',
  j: '舌面靠近硬腭，先贴后放，发出来的就是 j！',
  q: '跟 j 一样，但放开时吹一口气，发出来的就是 q！',
  x: '舌面靠近硬腭，留一条缝出气，发出来的就是 x！',
  zh: '舌尖翘起顶住硬腭，突然放开，发出来的就是 zh！',
  ch: '跟 zh 一样，但放开时吹一口气，发出来的就是 ch！',
  sh: '舌尖翘起靠近硬腭，留一条缝出气，发出来的就是 sh！',
  r: '跟 sh 一样，但声带要振动，发出来的就是 r！',
  z: '舌尖顶住上齿背，突然放开，发出来的就是 z！',
  c: '跟 z 一样，但放开时吹一口气，发出来的就是 c！',
  s: '舌尖靠近上齿背，留一条缝出气，发出来的就是 s！',
};

export function pinyinTutorTask(ctx: PinyinTutorCtx): StreamTask {
  return {
    scene: 'pinyin.tutor',
    messages: pinyinTutorMessages(ctx),
    fallback:
      PINYIN_FALLBACKS[ctx.symbol] ||
      `跟着小智一起念：${ctx.symbol} ${ctx.symbol} ${ctx.symbol}！多念几遍就会啦！`,
    title: '拼音辅导',
    hint: '小智正在教发音…',
  };
}

/* ================================================================== */
/* 自然拼读讲解                                                     */
/* ================================================================== */
const PHONICS_FALLBACKS: Record<string, string> = {
  a: '字母 a 发短音 /æ/，嘴巴张大，像发「啊」但嘴巴更扁。比如 apple、cat 都有这个音！',
  e: '字母 e 发短音 /e/，嘴巴微张，像发「诶」。比如 egg、bed 都有这个音！',
  i: '字母 i 发短音 /ɪ/，嘴巴微张，像发「伊」但更短。比如 pig、sit 都有这个音！',
  o: '字母 o 发短音 /ɒ/，嘴巴圆圆，像发「奥」。比如 dog、box 都有这个音！',
  u: '字母 u 发短音 /ʌ/，嘴巴微张，像发「阿」。比如 sun、cup 都有这个音！',
  sh: '字母组合 sh 发 /ʃ/，像说「嘘」的声音。比如 sheep、fish 都有这个音！',
  ch: '字母组合 ch 发 /tʃ/，像打喷嚏「阿嚏」的声音。比如 chair、chick 都有这个音！',
  th: '字母组合 th 发 /θ/ 或 /ð/，舌头放在牙齿中间出气。比如 think、this 都有这个音！',
  oo: '字母组合 oo 发 /uː/ 或 /ʊ/，嘴巴圆圆像吹泡泡。比如 food、book 都有这个音！',
  ee: '字母组合 ee 发 /iː/，嘴角拉开像微笑。比如 tree、bee 都有这个音！',
};

export function wordPhonicsTask(ctx: WordPhonicsCtx): StreamTask {
  return {
    scene: 'word.phonics',
    messages: wordPhonicsMessages(ctx),
    fallback:
      PHONICS_FALLBACKS[ctx.letters.toLowerCase()] ||
      `字母组合 ${ctx.letters} 的发音，跟着小智念几遍就好啦！${ctx.examples?.length ? `比如 ${ctx.examples.join(', ')} 都有这个音。` : ''}`,
    title: '拼读小课堂',
    hint: '小智正在讲拼读…',
  };
}
