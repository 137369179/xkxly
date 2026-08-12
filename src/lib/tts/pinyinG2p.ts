/**
 * 拼音 G2P（字→音）· Kokoro 拼音直接输入（P1-5）
 * ------------------------------------------------------------
 * Kokoro 中文社区模型可直接接受拼音输入（如 `chun2 mian2 bu4 jue4 xiao3`），
 * 从而精确控制多音字读音——不再依赖引擎自带 G2P 猜测。
 *
 * 本模块用 pinyin-pro 把中文文本转成带声调数字的拼音串：
 *   - 多音字按词组上下文自动选音（pinyin-pro 内置词库）；
 *   - 用户提供逐字标注拼音时（如古诗 chars[].p）优先用标注；
 *   - 标点保留原样（触发 Kokoro 自然停顿）；
 *   - 非中文字符（英文/数字）原样保留。
 *
 * 仅在 Kokoro 引擎 + 中文场景下启用；Web Speech 不支持拼音输入，
 * 仍走 correctText/correctChars 同音字替换方案。
 */
// pinyin-pro 词典较大（~500KB），使用动态 import 按需加载并缓存结果
let _pinyinMod: typeof import('pinyin-pro') | null = null;
async function getPinyinMod() {
  if (!_pinyinMod) {
    _pinyinMod = await import('pinyin-pro');
  }
  return _pinyinMod;
}

export interface PinyinAnnotatedChar {
  c: string;
  p?: string;
}

/**
 * 把中文字符串转成 Kokoro 可读的拼音串（声调用数字后缀，如 ni3 hao3）。
 * @param text 待转换的中文文本
 * @returns 拼音串（非中文字符原样保留，字间空格分隔）
 */
export async function textToPinyin(text: string): Promise<string> {
  if (!text) return '';
  const { pinyin } = await getPinyinMod();
  // pinyin-pro 的 pinyin 函数：自动多音字消歧 + 词组切分
  // toneType: 'num' → 声调用数字后缀（Kokoro 中文模型标准格式）
  // type: 'array' → 逐字拼音数组，便于我们在中间插入标点
  const result = pinyin(text, { toneType: 'num', type: 'array' }) as string[];
  // pinyin-pro 对非中文字符返回原文，逐字拼回时加空格分隔
  return result.join(' ');
}

/**
 * 把带逐字标注拼音的字符数组转成 Kokoro 拼音串。
 * 优先使用标注拼音（如古诗 chars[].p），未标注的字用 pinyin-pro 推导。
 * @param chars 字符数组，每项含字 c 和可选标注拼音 p
 * @returns 拼音串
 */
export async function annotatedCharsToPinyin(chars: PinyinAnnotatedChar[]): Promise<string> {
  if (!chars.length) return '';
  const { pinyin } = await getPinyinMod();
  const parts: string[] = [];
  for (const ch of chars) {
    // 标点/空格原样保留
    if (/[。！？；：，、\s.!?;:,]/.test(ch.c)) { parts.push(ch.c); continue; }
    // 英文/数字原样保留
    if (!/[\u4e00-\u9fff]/.test(ch.c)) { parts.push(ch.c); continue; }
    // 有标注拼音：规范化为声调数字格式
    if (ch.p) {
      parts.push(await pinyinToNum(ch.p));
      continue;
    }
    // 无标注：用 pinyin-pro 推导
    parts.push(pinyin(ch.c, { toneType: 'num' }));
  }
  return parts.join(' ');
}

/**
 * 把带调号拼音（如 huán）转成数字声调格式（如 huan2）。
 * pinyin-pro 的 numTone 格式输出就是数字后缀，这里复用它做单字转换。
 */
async function pinyinToNum(tonedPinyin: string): Promise<string> {
  if (!tonedPinyin) return '';
  const { pinyin } = await getPinyinMod();
  // pinyin-pro 可以把带调号的音节转成数字格式
  const result = pinyin(tonedPinyin, { toneType: 'num' });
  return result || tonedPinyin;
}

/**
 * 检测文本是否包含中文（决定是否启用拼音 G2P）。
 */
export function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}
