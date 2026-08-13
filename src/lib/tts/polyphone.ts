/**
 * 拼音驱动的多音字纠音（P3）
 * ------------------------------------------------------------
 * 背景：Web Speech API 不接受拼音输入，多音字只能听凭各家引擎自带 G2P。
 * 「万里长征人未还(huán)」「风吹草低见(xiàn)牛羊」「最喜小儿亡(wú)赖」
 * 这类诗词专有读音，几乎所有系统语音都会读错。
 *
 * 手法：同音字替换。只替换「送进 TTS 的那份文本」，页面显示的原文不变。
 *   还(huán) → 环   见(xiàn) → 限   亡(wú) → 吴
 * 听感完全一致，读音立刻正确，且对任何引擎都生效（不依赖引擎能力）。
 *
 * 安全原则：宁可少纠，不可纠错。以下两类一律不动 ——
 *   1. 轻声（上 shang / 头 tou / 了 le）：无调号，引擎按词典自会处理；
 *   2. 变调（不 bú vs bù）：音节相同仅声调不同，硬替换会破坏引擎变调规则。
 *
 * 判定规则与 scripts/genPolyphone.mjs 保持严格一致，改一处必须改两处。
 */
import { DEFAULT_READING, SUB, WORD_SUBS, type WordSub } from './polyphoneData';

const TONE_MAP: Record<string, string> = {
  ā: 'a', á: 'a', ǎ: 'a', à: 'a', ē: 'e', é: 'e', ě: 'e', è: 'e',
  ī: 'i', í: 'i', ǐ: 'i', ì: 'i', ō: 'o', ó: 'o', ǒ: 'o', ò: 'o',
  ū: 'u', ú: 'u', ǔ: 'u', ù: 'u', ǖ: 'v', ǘ: 'v', ǚ: 'v', ǜ: 'v',
  ü: 'v', ń: 'n', ň: 'n', ǹ: 'n', ḿ: 'm',
};
/** 带调号字符（ü 本身不是声调，需排除） */
const TONED = new Set('āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ');

const norm = (s: string): string => (s || '').trim().toLowerCase();
const stripTone = (s: string): string =>
  Array.from(s)
    .map((c) => TONE_MAP[c] ?? c)
    .join('');
const hasTone = (s: string): boolean => Array.from(s).some((c) => TONED.has(c));

/** 该标注读音是否值得纠正（与生成脚本同规则） */
function worthFixing(annotated: string, def: string): boolean {
  if (!annotated || !def || annotated === def) return false;
  if (!hasTone(annotated)) return false; // 轻声
  if (stripTone(annotated) === stripTone(def)) return false; // 仅变调
  return true;
}

export interface PolyphoneFix {
  /** 在原字符数组中的下标 */
  index: number;
  /** 原字 */
  char: string;
  /** 引擎默认会读成 */
  from: string;
  /** 正确读音（数据标注） */
  to: string;
  /** 送进 TTS 的替代字 */
  sub: string;
}

/**
 * 单字纠音：返回应送进 TTS 的字符（不需纠正时原样返回）。
 * @param c 汉字
 * @param annotatedPinyin 权威标注拼音（带调，如 huán）
 */
export function correctChar(c: string, annotatedPinyin?: string): string {
  if (!c || !annotatedPinyin) return c;
  const def = DEFAULT_READING[c]!
  if (!def) return c; // 非多音字（或无可用替代），引擎不会读错
  const p = norm(annotatedPinyin);
  if (!worthFixing(p, def)) return c;
  return SUB[p] ?? c;
}

/** 整行纠音：返回送进 TTS 的文本（标点原样保留，用于触发自然停顿） */
export function correctChars(chars: { c: string; p?: string }[]): string {
  return chars.map((ch) => correctChar(ch.c, ch.p)).join('');
}

/** 诊断用：列出一行里所有被纠正的字，供设置页/测试页展示纠音明细 */
export function polyphoneFixes(chars: { c: string; p?: string }[]): PolyphoneFix[] {
  const out: PolyphoneFix[] = [];
  chars.forEach((ch, index) => {
    const def = DEFAULT_READING[ch.c]!
    if (!def || !ch.p) return;
    const p = norm(ch.p);
    if (!worthFixing(p, def)) return;
    const sub = SUB[p]!
    if (!sub) return;
    out.push({ index, char: ch.c, from: def, to: p, sub });
  });
  return out;
}

/** 纠音表规模（供诊断页展示） */
export const POLYPHONE_STATS = {
  chars: Object.keys(DEFAULT_READING).length,
  subs: Object.keys(SUB).length,
  words: WORD_SUBS.length,
};

/* ---------------- P9 · ① 日常词库纠音（词组级同音替换） ---------------- */

// 最长优先：避免「数字」被「数」先命中、或「数一数」被短词截断。
const WORD_LIST: WordSub[] = [...WORD_SUBS].sort((a, b) => b.from.length - a.from.length);
const WORD_MAP = new Map(WORD_LIST.map((w) => [w.from, w.to]));
const WORD_RE = new RegExp(WORD_LIST.map((w) => w.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');

/**
 * 整段自由文本的「日常词库纠音」：把高频多音词整词替换成同音词送进 TTS。
 * 用于故事 / 讲解 / 跟读这类「无逐字拼音」的文本；古诗走单字+拼音纠音（correctChars），
 * 不经此函数，避免双重替换。
 *
 * 单次最长优先扫描、非重叠替换，替换字本身不再触发二次替换（替换字均不在 FROM 词表中）。
 */
export function correctText(text: string): string {
  if (!text) return text;
  return text.replace(WORD_RE, (m) => WORD_MAP.get(m) ?? m);
}
