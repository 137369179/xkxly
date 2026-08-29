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

/** requestIdleCallback 的类型（不引入 lib.dom 的 IdleRequestOptions 依赖） */
type IdleScheduler = (cb: () => void, opts?: { timeout: number }) => void;

/**
 * 条件预热繁体转换器
 * ------------------------------------------------------------
 * opencc-js 约 506KB(gzip)，**无条件预热会拖慢所有简体用户**，
 * 与「惰性初始化避免首屏加载大字典」的设计意图冲突。
 *
 * 故仅在用户「可能需要繁体」时才于浏览器空闲期预加载：
 *   ① 当前 locale 已是 zh-TW；② 系统语言属繁体地区（zh-TW/HK/MO、zh-Hant）。
 * 效果：繁体用户切换时零等待（不再先闪简体再变繁体），简体用户零成本。
 *
 * @param locale 当前语言（可选，传入即可判断条件 ①）
 */
export function maybePrewarmCn2t(locale?: string): void {
  if (converter || initPromise) return; // 已就绪或已在加载中
  const sysLang = typeof navigator === 'undefined' ? '' : navigator.language || '';
  const wantsTraditional =
    locale === 'zh-TW' || /^zh[-_](tw|hk|mo)$|^zh-hant/i.test(sysLang);
  if (!wantsTraditional) return;

  const run = () => {
    void ensureCn2t().catch(() => {}); // 失败静默忽略，仍会回退简体原文
  };
  const ric = (globalThis as { requestIdleCallback?: IdleScheduler }).requestIdleCallback;
  if (typeof ric === 'function') ric(run, { timeout: 3000 });
  else setTimeout(run, 1500);
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
