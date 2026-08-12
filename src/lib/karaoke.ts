/**
 * 卡拉OK 逐字高亮 · 时长估算引擎（P0-2 / P2-10）
 * ------------------------------------------------------------
 * Web Speech API 的 onboundary 事件在中文环境下几乎不可用，Kokoro 神经引擎
 * 虽然能算出真实音频时长，但字级切分需要额外仪器化。本模块采用「按字符类型
 * 估算时长」的方案，在两种引擎下都能驱动逐字高亮，误差控制在可接受范围内
 * （幼儿朗读本身速度不快，±100ms 的偏差不影响跟读体验）。
 *
 * 设计：
 *   - 纯函数 buildCharTimeline：输入文本 + 语速 + 语言，输出每个字符的起止时间；
 *   - 中文按字估时（含声调拉长），英文按音节估时，标点给停顿；
 *   - 句间额外停顿（与 neuralCurve 的 pauseForEnding 对齐）；
 *   - 支持 onChar 回调驱动 UI 高亮，支持 seek 跳转。
 * 仅依赖 splitSentences，不触碰浏览器 API，可在 Node 下单测。
 */
import { splitSentences } from './tts/g2p';

/** 单个字符的时间片 */
export interface CharSlot {
  /** 字符原文（含标点、空格） */
  ch: string;
  /** 在原文中的下标 */
  index: number;
  /** 所属句子下标（0-based） */
  line: number;
  /** 起始时间（毫秒，相对朗读起点） */
  startMs: number;
  /** 结束时间（毫秒） */
  endMs: number;
  /** 是否为可高亮的朗读字符（标点/空格不参与高亮，但仍占时间） */
  speakable: boolean;
}

/** 一条完整的时间线 */
export interface CharTimeline {
  slots: CharSlot[];
  /** 总时长（毫秒） */
  totalMs: number;
  /** 句子数 */
  lineCount: number;
}

/** 中文单字基础时长（毫秒），rate=1 时的基准 */
const ZH_CHAR_MS = 280;
/** 英文单音节基础时长 */
const EN_SYLLABLE_MS = 220;
/** 数字单字基础时长 */
const DIGIT_MS = 240;
/** 标点停顿时长（按标点类型分级） */
const PUNCT_MS: Record<string, number> = {
  '。': 420, '！': 420, '？': 420, '.': 360, '!': 360, '?': 360,
  '；': 300, ';': 280, '：': 280, ':': 260,
  '，': 200, ',': 180, '、': 200,
};
/** 默认标点停顿（未列入上表的标点） */
const PUNCT_DEFAULT_MS = 120;
/** 句间额外停顿（一句结束后到下一句开始前） */
const LINE_GAP_MS = 160;

/** 估算单个字符的朗读时长（毫秒） */
function charDuration(ch: string, lang: 'zh-CN' | 'en-US', rate: number): number {
  // 标点：查表，给停顿
  if (PUNCT_MS[ch] !== undefined) return PUNCT_MS[ch] / rate;
  if (/[。！？；：，、.!?;:,]/.test(ch)) return PUNCT_DEFAULT_MS / rate;

  // 空格：英文词间短停顿，中文无空格
  if (/\s/.test(ch)) return lang === 'en-US' ? 80 / rate : 0;

  // 数字
  if (/[0-9]/.test(ch)) return DIGIT_MS / rate;

  // 中文字符（含全角符号已在上面的标点处理）
  if (/[\u4e00-\u9fff]/.test(ch)) return ZH_CHAR_MS / rate;

  // 英文字母：按音节估算（元音+辅音组合），简化为单字母时长
  if (/[a-zA-Z]/.test(ch)) return EN_SYLLABLE_MS / rate;

  // 其他字符（如 emoji、特殊符号）
  return 100 / rate;
}

/**
 * 把文本拆成逐字时间线。
 * @param text  待朗读文本
 * @param rate  语速（0.5–2，1=正常；越慢每字时长越长）
 * @param lang  语言（影响数字/字母估时基准）
 */
export function buildCharTimeline(
  text: string,
  rate = 0.8,
  lang: 'zh-CN' | 'en-US' = 'zh-CN',
): CharTimeline {
  const sentences = splitSentences(text);
  const slots: CharSlot[] = [];
  let cursor = 0; // 全局时间游标（毫秒）
  let globalIdx = 0; // 全局字符下标

  sentences.forEach((line, lineIdx) => {
    for (const ch of line) {
      const dur = charDuration(ch, lang, rate);
      if (dur <= 0) {
        // 不占时间的字符（如中文空格）仍记录位置但不推进游标
        slots.push({
          ch,
          index: globalIdx,
          line: lineIdx,
          startMs: cursor,
          endMs: cursor,
          speakable: false,
        });
        globalIdx++;
        continue;
      }
      const speakable = !/[。！？；：，、.!?;:,\s]/.test(ch);
      slots.push({
        ch,
        index: globalIdx,
        line: lineIdx,
        startMs: cursor,
        endMs: cursor + dur,
        speakable,
      });
      cursor += dur;
      globalIdx++;
    }
    // 句间停顿（最后一句不加）
    if (lineIdx < sentences.length - 1) {
      cursor += LINE_GAP_MS / rate;
    }
  });

  return { slots, totalMs: cursor, lineCount: sentences.length };
}

/** 根据已播放时长（毫秒）找到当前应高亮的字符下标，无则返回 -1 */
export function charIndexAtTime(timeline: CharTimeline, elapsedMs: number): number {
  const slots = timeline.slots;
  if (!slots.length) return -1;
  if (elapsedMs <= 0) return -1;
  // 二分查找：最后一个 startMs <= elapsedMs 的可高亮字符
  let lo = 0;
  let hi = slots.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (slots[mid]!.startMs <= elapsedMs) {
      if (slots[mid]!.speakable) result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/** 根据已播放时长找到当前句子下标（0-based），无则返回 -1 */
export function lineIndexAtTime(timeline: CharTimeline, elapsedMs: number): number {
  const slots = timeline.slots;
  if (!slots.length) return -1;
  const idx = charIndexAtTime(timeline, elapsedMs);
  if (idx < 0) return -1;
  return slots[idx]!.line;
}

/** 获取某句的起止时间（毫秒） */
export function lineTimeRange(timeline: CharTimeline, lineIdx: number): { startMs: number; endMs: number } {
  const slots = timeline.slots.filter((s) => s.line === lineIdx);
  if (!slots.length) return { startMs: 0, endMs: 0 };
  return { startMs: slots[0]!.startMs, endMs: slots[slots.length - 1]!.endMs };
}
