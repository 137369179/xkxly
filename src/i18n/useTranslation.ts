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

// 导入翻译包
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';
import hanziListenZh from './locales/hanziListen.zh-CN.json';
import hanziListenEn from './locales/hanziListen.en-US.json';

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

/** 深度获取嵌套对象属性的工具函数 */
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === undefined || current === null) {
      return path; // 找不到则返回原始键名
    }
    current = current[key]!;
  }

  if (typeof current === 'string') {
    return current;
  }

  // 如果是对象（如 plural/context），返回默认值或第一个值
  if (typeof current === 'object' && current !== null) {
    return current.string || Object.values(current)[0] || path;
  }

  return path;
}

/** 执行插值替换 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key]!!
    return value !== undefined ? String(value) : match;
  });
}

const translations: Record<Locale, TranslationData> = {
  'zh-CN': deepMergeLocale(zhCN, hanziListenZh),
  'en-US': deepMergeLocale(enUS, hanziListenEn),
};

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

  const setLocaleHandler = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setLocaleFn(newLocale);
    persistLocale(newLocale);
  }, []);

  const t: TranslateFn = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const translationData = translations[locale]!!
      let template = getNestedValue(translationData, key);
      // 缺失键回退链：当前语言缺失 → 默认语言(zh-CN) → 原始键名。
      // 避免 en-US 等未覆盖键在 UI 露出原始 key 路径（如 common.home）。
      if (template === key && locale !== i18nConfig.defaultLocale) {
        const fallback = getNestedValue(translations[i18nConfig.defaultLocale], key);
        if (fallback !== key) template = fallback;
      }
      return interpolate(template, params);
    },
    [locale]
  );

  return {
    t,
    locale,
    setLocale: setLocaleHandler,
    availableLocales: ['zh-CN', 'en-US'],
  };
}

/**
 * 非组件环境（模块级函数 / 工具函数）的翻译入口。
 * 与 t() 共用同一套字典与回退链（当前语言 → 默认 zh-CN → 原始键名），
 * 但依赖全局 currentLocale，不会触发 React 重渲染——适合在组件之外调用。
 */
export function translate(key: string, params?: Record<string, string | number>): string {
  const locale = getCurrentLocale();
  const translationData = translations[locale]!;
  let template = getNestedValue(translationData, key);
  if (template === key && locale !== i18nConfig.defaultLocale) {
    const fallback = getNestedValue(translations[i18nConfig.defaultLocale], key);
    if (fallback !== key) template = fallback;
  }
  return interpolate(template, params);
}

export default useTranslation;
