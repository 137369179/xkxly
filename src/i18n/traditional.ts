/**
 * 繁简转换工具（运行时，基于 opencc-js）
 * ------------------------------------------------------------
 * 用于 zh-TW（繁体）语言模式：zh-TW 复用 zh-CN 的翻译字典，
 * 在 t() 输出前做简体 → 繁体转换，避免维护两套中文字典。
 *
 * 注意：
 *  - 转换器惰性初始化（首次切换到繁体时创建），避免首屏加载大字典；
 *  - 转换失败时静默回退原文，不影响 UI；
 *  - 拼音/emoji/英文不受影响（opencc 仅转换中文字符）。
 */
import type { ConverterFunction } from 'opencc-js';

let converter: ConverterFunction | null = null;
let initPromise: Promise<ConverterFunction> | null = null;

/** 预初始化转换器（切换到繁体时调用） */
export function ensureCn2t(): Promise<ConverterFunction> {
  if (!initPromise) {
    initPromise = import('opencc-js').then(({ Converter }) => {
      converter = Converter({ from: 'cn', to: 'tw' });
      return converter;
    });
  }
  return initPromise;
}

/** 简体 → 繁体（同步；若转换器尚未就绪则返回原文，并异步预热） */
export function toTraditional(text: string): string {
  if (!text || !converter) {
    if (text) ensureCn2t().catch(() => {});
    return text;
  }
  try {
    return converter(text);
  } catch {
    return text;
  }
}
