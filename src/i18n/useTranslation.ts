/**
 * 国际化翻译 Hook
 * 
 * 提供类型安全的翻译函数，支持插值和命名空间。
 * 
 * 使用示例：
 * ```tsx
 * const { t, locale, setLocale } = useTranslation();
 * 
 * // 基础用法
 * t('common.home') // → '首页' 或 'Home'
 * 
 * // 插值
 * t('learning.starsEarned', { count: 5 }) // → '获得 5 颗星'
 * ```
 */

import { useState, useCallback, useEffect } from 'react';
import type { Locale, TranslateFn } from './config';
import {
  getCurrentLocale,
  setLocale as setLocaleFn,
  detectBrowserLocale,
  restorePersistedLocale,
  persistLocale,
  i18nConfig,
} from './config';
import { toTraditional } from './traditional';

// 导入翻译包
// 默认语言(zh-CN)及其补丁内联进主包，保证首屏即可用；
// en-US 套件（P1-5 分包）改为按需 import()，避免中文默认环境下打包 ~250KB 英文词典。
import zhCN from './locales/zh-CN.json';
import hanziListenZh from './locales/hanziListen.zh-CN.json';
import patchZh from './locales/patch.zh-CN.json';
import achievementCenterZh from './locales/achievementCenter.zh-CN.json';

/** 深度合并：将模块级翻译增量并入全局字典（不改动全局 i18n 文件，规避并发 WIP 冲突） */
function deepMergeLocale(base: any, extra: any): any {
  const out: any = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(extra)) {
    const bv = out[k];
    const ev = extra[k];
    if (ev && typeof ev === 'object' && !Array.isArray(ev) && bv && typeof bv === 'object' && !Array.isArray(bv)) {
      out[k] = deepMergeLocale(bv, ev);
    } else {
      out[k] = ev;
    }
  }
  return out;
}

type TranslationData = typeof zhCN;

/** 深度获取嵌套对象属性的工具函数。
 * 兼容两种键风格（P4-1 修复）：
 *   - 嵌套键：'wrongbook.tab.overview' → { wrongbook: { tab: { overview } } }
 *   - 扁平带点键：'mathExtra.subTabs.mul' → { mathExtra: { 'subTabs.mul' } }
 * 优先把「剩余段合并为字面量键」直查，找不到再逐层下钻——
 * 否则 'mathExtra.subTabs.mul' 会被按 3 层下钻，永远命中不了扁平键
 * （此前导致 MathExtra/VerticalMath 的 Tab 标签在 UI 渲染成原始 key 路径）。 */
function getNestedValue(obj: any, path: string): string {
  const raw = resolvePath(obj, path.split('.'));
  if (raw === undefined || raw === null) return path;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    return (raw as Record<string, unknown>).string || Object.values(raw)[0] || path;
  }
  return path;
}

/** 逐层下钻：每层先试「剩余段整体作为字面量键」，命中即返回 */
function resolvePath(obj: any, segments: string[]): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const literal = segments.join('.');
  const viaLiteral = obj[literal];
  if (viaLiteral !== undefined && viaLiteral !== null) return viaLiteral;
  if (segments.length === 1) return undefined;
  const first = segments[0];
  if (!first) return undefined;
  return resolvePath(obj[first], segments.slice(1));
}

/** 执行插值替换 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key]!
    return value !== undefined ? String(value) : match;
  });
}

/**
 * 语言包存储：zh-CN/zh-TW 内联（zh-TW 复用 zh 字典、运行时繁体转换），
 * en-US 懒加载注入（见 enTranslationCache / loadEnUs）。
 */
const zhPack = deepMergeLocale(
  deepMergeLocale(deepMergeLocale(zhCN, hanziListenZh), patchZh),
  achievementCenterZh,
);
const translations: Partial<Record<Locale, TranslationData>> = {
  'zh-CN': zhPack,
  'zh-TW': zhPack,
};

/** en-US 语言包缓存：首次进入英文时按需加载；null 表示尚未就绪（t() 走 zh-CN 回退） */
let enTranslationCache: TranslationData | null = null;
const enLoadListeners = new Set<() => void>();
function subscribeEnLoad(cb: () => void): () => void {
  enLoadListeners.add(cb);
  return () => {
    enLoadListeners.delete(cb);
  };
}
function notifyEnLoaded(): void {
  enLoadListeners.forEach((cb) => cb());
}
/** 加载 en-US 全套词典（幂等）。动态 import 让 4 个英文包各自成为按需 chunk，不进主包。 */
function loadEnUs(): Promise<void> {
  if (enTranslationCache) return Promise.resolve();
  return Promise.all([
    import('./locales/en-US.json'),
    import('./locales/hanziListen.en-US.json'),
    import('./locales/patch.en-US.json'),
    import('./locales/achievementCenter.en-US.json'),
  ]).then(([enUS, hanziEn, patchEn, achEn]) => {
    enTranslationCache = deepMergeLocale(
      deepMergeLocale(deepMergeLocale(enUS.default, hanziEn.default), patchEn.default),
      achEn.default,
    );
    notifyEnLoaded();
  });
}

/** 取某语言已就绪的翻译数据；en-US 未加载完时返回 undefined（调用方走 zh-CN 回退） */
function getTranslationData(locale: Locale): TranslationData | undefined {
  if (locale === 'en-US') return enTranslationCache ?? undefined;
  return translations[locale];
}

interface UseTranslationReturn {
  /** 翻译函数 */
  t: TranslateFn;
  /** 当前语言 */
  locale: Locale;
  /** 切换语言 */
  setLocale: (locale: Locale) => void;
  /** 可用语言列表 */
  availableLocales: Locale[];
}

export function useTranslation(): UseTranslationReturn {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // 优先使用持久化的语言偏好
    const persisted = restorePersistedLocale();
    if (persisted) return persisted;

    // 其次检测浏览器语言
    const detected = detectBrowserLocale();
    return detected;
  });
  // en-US 词典就绪后递增 enTick 触发重渲染，让 t() 从 zh 回退切到英文（P1-5 分包）
  const [enTick, setEnTick] = useState(0);

  // 初始化时设置全局状态
  useEffect(() => {
    setLocaleFn(locale);
  }, []);

  // 跨组件同步语言：监听全局 locale-change 事件，使已挂载的其它组件也跟随切换
  // （setLocale 会更新模块级 currentLocale 并派发该事件；此前无任何监听者，导致切语言后旧页面不刷新）
  useEffect(() => {
    const onLocaleChange = (e: Event) => {
      const next = (e as CustomEvent<{ locale: Locale }>).detail?.locale;
      if (next && i18nConfig.availableLocales.includes(next)) {
        setLocaleState(next);
      }
    };
    window.addEventListener('locale-change', onLocaleChange);
    return () => window.removeEventListener('locale-change', onLocaleChange);
  }, []);

  // P1-5 i18n 分包：进入英文才按需加载 en-US 词典；加载完成后刷新 t()
  useEffect(() => {
    const unsub = subscribeEnLoad(() => setEnTick((v) => v + 1));
    if (locale === 'en-US') void loadEnUs();
    return unsub;
  }, [locale]);

  const setLocaleHandler = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setLocaleFn(newLocale);
    persistLocale(newLocale);
  }, []);

  const t: TranslateFn = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const translationData = getTranslationData(locale);
      let template = translationData ? getNestedValue(translationData, key) : key;
      // 缺失键回退链：当前语言缺失 → 默认语言(zh-CN) → 原始键名。
      // 避免 en-US 等未覆盖键在 UI 露出原始 key 路径（如 common.home），
      // 也覆盖 en-US 词典尚未加载完（enTranslationCache 为空）时的临时 zh 回退。
      if (template === key && locale !== i18nConfig.defaultLocale) {
        const fallback = getNestedValue(getTranslationData(i18nConfig.defaultLocale), key);
        if (fallback !== key) template = fallback;
      }
      const result = interpolate(template, params);
      // 繁体模式：运行时简体 → 繁体（zh-TW 复用 zh-CN 字典）
      return locale === 'zh-TW' ? toTraditional(result) : result;
    },
    [locale, enTick]
  );

  return {
    t,
    locale,
    setLocale: setLocaleHandler,
    availableLocales: ['zh-CN', 'zh-TW', 'en-US'],
  };
}

/**
 * 非组件环境（模块级函数 / 工具函数）的翻译入口。
 * 与 t() 共用同一套字典与回退链（当前语言 → 默认 zh-CN → 原始键名），
 * 但依赖全局 currentLocale，不会触发 React 重渲染——适合在组件之外调用。
 */
export function translate(key: string, params?: Record<string, string | number>): string {
  const locale = getCurrentLocale();
  // 非组件入口无法触发重渲染，此处仅发起按需加载；首次调用可能仍为 zh-CN 回退
  if (locale === 'en-US') void loadEnUs();
  const translationData = getTranslationData(locale);
  let template = translationData ? getNestedValue(translationData, key) : key;
  if (template === key && locale !== i18nConfig.defaultLocale) {
    const fallback = getNestedValue(getTranslationData(i18nConfig.defaultLocale), key);
    if (fallback !== key) template = fallback;
  }
  const result = interpolate(template, params);
  return locale === 'zh-TW' ? toTraditional(result) : result;
}

export default useTranslation;
