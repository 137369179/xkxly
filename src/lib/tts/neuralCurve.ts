/**
 * 神经引擎情感化语速曲线（P9 · ②）
 * ------------------------------------------------------------
 * 系统语音只能整句匀速朗读；而 Kokoro 神经网络引擎支持「分段以不同 speed 生成
 * 并拼接」。本模块把一段文本切成句子，按「内容模块 + 诗歌情绪」算出每句的语速
 * 倍率与停顿，交给 Kokoro 生成出有抑扬顿挫、句末拖腔的音频。
 *
 * 设计：
 *   - 古诗：首句稍慢入境、末句落腔拖长，配合诗歌情绪（思乡更缓、豪放更扬）；
 *   - 故事：平稳叙述、句末自然呼吸、收尾略缓；
 *   - 鼓励语：明快略快；
 *   - 段末按标点补静音，模拟句读呼吸。
 * 仅作用于 zh-CN + 神经引擎；英文/系统语音忽略。
 */
import { splitSentences } from './g2p';
import type { NeuralSegment } from './types';

/** 诗歌情绪 → 整体语速相对系数（以从容舒缓 plain=1 为基准，与 chant.ts MOOD 对齐） */
const MOOD_SPEED: Record<string, number> = {
  plain: 1,
  frontier: 0.95, // 苍凉雄浑，稍缓
  homesick: 0.95, // 低回婉转
  farewell: 0.97, // 依依惜别
  nature: 1.0, // 清新闲适
  history: 0.98, // 沉郁顿挫
  love: 0.95, // 缠绵悱恻
  bold: 1.13, // 豪迈奔放
  joy: 1.05, // 欢快明朗
};

function moodFactor(moodKey?: string): number {
  if (!moodKey) return 1;
  return MOOD_SPEED[moodKey] ?? 1;
}

/** 句末标点 → 静音时长（毫秒），用于句读呼吸 */
function pauseForEnding(tail: string): number {
  if (/[。！？!?]$/.test(tail)) return 460;
  if (/[；;：:]$/.test(tail)) return 300;
  if (/[，,、]$/.test(tail)) return 160;
  return 120;
}

/** 模块 + 第几句 → 该句相对语速倍率（与情绪系数相乘） */
function positionCurve(module: string | undefined, index: number, total: number): number {
  if (module === 'poem') {
    if (index === 0) return 1.06; // 首句慢入境
    if (index === total - 1) return 0.9; // 末句落腔拖长
    return 1.0;
  }
  if (module === 'story' || module === 'ai') {
    if (index === total - 1) return 0.95; // 收尾略缓
    return 1.0;
  }
  if (module === 'praise') return 1.05; // 鼓励语明快
  return 1.0;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * 把一段文本切成「情感曲线分段」，供 Kokoro 逐段生成。
 * @param text     待朗读文本（建议整段/整首，内部按标点切句）
 * @param module   内容模块 key（poem/story/praise/ai…），驱动音色气质
 * @param moodKey  诗歌情绪 key（古诗范读时传入，强化情感起伏）
 */
export function buildNeuralSegments(
  text: string,
  module?: string,
  moodKey?: string,
): NeuralSegment[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];
  const mf = moodFactor(moodKey);
  const total = sentences.length;

  return sentences.map((s, i) => {
    const speed = clamp(positionCurve(module, i, total) * mf, 0.5, 2);
    return {
      text: s,
      speed: +speed.toFixed(3),
      pauseMs: pauseForEnding(s),
    };
  });
}
