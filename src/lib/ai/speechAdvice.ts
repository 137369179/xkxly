/**
 * AI 朗读发音建议（P3-14）
 * ------------------------------------------------------------
 * 孩子跟读后，把发音评测结果（读错的字、识别到的近似音）发给 AI，
 * 生成个性化的发音改进建议：哪个字怎么读、嘴型怎么放、有什么小口诀。
 *
 * 设计：
 *   - 输入：evaluatePronunciation 的结果 + 目标文本 + 语言；
 *   - 输出：结构化建议（每条含字 / 建议 / 口诀），UI 可逐条展示并朗读；
 *   - AI 不可用时降级到本地规则建议（pinyinData / 简单提示），保证永远有内容。
 */
import { chat } from './client';
import { extractJson } from './guard';
import type { PronunciationResult } from '../pronunciationEval';

export interface SpeechAdviceItem {
  /** 针对的目标字/词 */
  target: string;
  /** 发音建议（孩子能听懂的口语） */
  advice: string;
  /** 小口诀/记忆法（可选） */
  mnemonic?: string;
}

export interface SpeechAdviceResult {
  ok: boolean;
  /** 建议列表（AI 不可用时为本地降级建议） */
  items: SpeechAdviceItem[];
  /** 鼓励语（总结性的一句话） */
  encouragement: string;
  /** 是否来自 AI（false = 本地降级） */
  fromAi: boolean;
}

interface AiAdviceResponse {
  encouragement: string;
  items: SpeechAdviceItem[];
}

/** 本地降级建议：AI 不可用时按语言给出通用发音提示 */
function localFallback(result: PronunciationResult, lang: 'zh-CN' | 'en-US'): SpeechAdviceResult {
  const wrongs = result.chars.filter((c) => c.status !== 'correct');
  const items: SpeechAdviceItem[] = wrongs.slice(0, 3).map((c) => {
    if (lang === 'zh-CN') {
      return {
        target: c.ch,
        advice: c.status === 'missing' ? `「${c.ch}」要读出来哦，跟着音频再听一遍` : `「${c.ch}」再慢慢读一遍，注意声调`,
        mnemonic: `把「${c.ch}」放进词里读，比如反复念三遍`,
      };
    }
    return {
      target: c.ch,
      advice: c.status === 'missing' ? `"${c.ch}" needs to be pronounced, listen and try again` : `"${c.ch}" — try saying it slowly and clearly`,
      mnemonic: `Repeat "${c.ch}" three times with the audio`,
    };
  });

  return {
    ok: true,
    items,
    encouragement: result.score >= 75 ? '读得很棒，再练练就更完美啦！' : '没关系，多读几遍一定行！',
    fromAi: false,
  };
}

/**
 * 请求 AI 生成朗读发音建议。
 * @param target  目标文本
 * @param result  发音评测结果
 * @param lang    语言
 * @param signal  可选取消信号
 */
export async function getSpeechAdvice(
  target: string,
  result: PronunciationResult,
  lang: 'zh-CN' | 'en-US' = 'zh-CN',
  signal?: AbortSignal,
): Promise<SpeechAdviceResult> {
  // 没有读错的字 → 不需要请求 AI
  const wrongs = result.chars.filter((c) => c.status !== 'correct');
  if (wrongs.length === 0) {
    return {
      ok: true,
      items: [],
      encouragement: '每个字都读对了，太厉害啦！🌟',
      fromAi: false,
    };
  }

  // 构造给 AI 的输入：目标文本 + 识别结果 + 逐字对齐
  const charSummary = result.chars
    .map((c) => `${c.ch}(${c.status === 'correct' ? '正确' : c.status === 'wrong' ? `读成${c.heard}` : '漏读'})`)
    .join('、');

  const sysPrompt =
    lang === 'zh-CN'
      ? '你是一位温柔的幼儿语言老师，专门帮助 3-7 岁孩子改善中文发音。根据孩子的跟读评测结果，给出具体、易懂、有爱的发音建议。每条建议要告诉孩子嘴怎么放、声音怎么发，配上一个小口诀帮助记忆。用孩子能听懂的话，不要用专业术语。返回 JSON。'
      : 'You are a gentle early-childhood language teacher helping kids aged 3-7 improve English pronunciation. Based on the reading evaluation, give specific, simple, encouraging advice. Return JSON.';

  const userPrompt =
    lang === 'zh-CN'
      ? `孩子跟读目标：「${target}」\n识别结果：「${result.transcript}」\n逐字评测：${charSummary}\n得分：${result.score}/100\n\n请针对读错/漏读的字给出建议（最多3条），每条包含 target（字）、advice（发音建议）、mnemonic（小口诀）。再加一句 encouragement 鼓励孩子。\n\n返回格式：{"encouragement":"...","items":[{"target":"...","advice":"...","mnemonic":"..."}]}`
      : `Target: "${target}"\nHeard: "${result.transcript}"\nScore: ${result.score}/100\n\nGive advice for mispronounced words (max 3). Return: {"encouragement":"...","items":[{"target":"...","advice":"...","mnemonic":"..."}]}`;

  try {
    const res = await chat({
      scene: 'speech.advise',
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt },
      ],
      json: true,
      signal,
      cacheKey: `${lang}:${target}:${result.transcript}`,
    });

    if (!res.ok || !res.text) {
      return localFallback(result, lang);
    }

    // 用健壮解析抠出 JSON（自动处理 ```json 围栏 / 前后缀 / 尾逗号，解析失败返回 null）
    const parsed = extractJson<AiAdviceResponse>(res.text);
    if (!parsed || !Array.isArray(parsed.items)) {
      return localFallback(result, lang);
    }

    return {
      ok: true,
      items: parsed.items.slice(0, 3).map((it) => ({
        target: String(it.target ?? ''),
        advice: String(it.advice ?? ''),
        mnemonic: it.mnemonic ? String(it.mnemonic) : undefined,
      })),
      encouragement: String(parsed.encouragement ?? '继续加油！'),
      fromAi: true,
    };
  } catch {
    return localFallback(result, lang);
  }
}
