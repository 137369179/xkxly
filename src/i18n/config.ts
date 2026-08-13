/**
 * 国际化（i18n）配置模块
 * 
 * 特性：
 * - 支持中英文切换
 * - 命名空间隔离
 * - 类型安全的翻译键
 * - 支持插值和复数形式
 */

// 支持的语言列表
export type Locale = 'zh-CN' | 'zh-TW' | 'en-US';

export interface I18nConfig {
  /** 默认语言 */
  defaultLocale: Locale;
  /** 可用语言列表 */
  availableLocales: Locale[];
  /** 语言显示名称 */
  localeNames: Record<Locale, string>;
}

export const i18nConfig: I18nConfig = {
  defaultLocale: 'zh-CN',
  availableLocales: ['zh-CN', 'zh-TW', 'en-US'],
  localeNames: {
    'zh-CN': '简体中文',
    'zh-TW': '繁體中文',
    'en-US': 'English',
  },
};

/**
 * 翻译函数类型定义
 */
export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

/**
 * 翻译值结构
 */
export interface TranslationValue {
  string: string;
  // 未来可扩展：支持复数、上下文等
  plural?: Record<string, string>;
  context?: Record<string, string>;
}

/**
 * 命名空间翻译字典
 */
export interface TranslationNamespace {
  [key: string]: TranslationValue | TranslationNamespace;
}

/**
 * 完整的翻译字典
 */
export interface TranslationDict {
  [key: string]: string | number | boolean | object | TranslationDict;
}

// 当前活跃的语言状态（运行时）
let currentLocale: Locale = i18nConfig.defaultLocale;

/**
 * 获取当前语言
 */
export function getCurrentLocale(): Locale {
  return currentLocale;
}

/**
 * 设置当前语言
 */
export function setLocale(locale: Locale): void {
  if (i18nConfig.availableLocales.includes(locale)) {
    currentLocale = locale;
    // 触发 UI 更新事件
    window.dispatchEvent(new CustomEvent('locale-change', { detail: { locale } }));
  } else {
    if (import.meta.env.DEV) console.warn(`[i18n] Unsupported locale: ${locale}`);
  }
}

/**
 * 浏览器语言检测
 */
export function detectBrowserLocale(): Locale {
  if (typeof window === 'undefined') return i18nConfig.defaultLocale;
  
  const browserLang = navigator.language;
  
  // 精确匹配
  if (i18nConfig.availableLocales.includes(browserLang as Locale)) {
    return browserLang as Locale;
  }
  
  // 前缀匹配（如 zh -> zh-CN）
  const langPrefix = browserLang.split('-')[0]!;
  const matched = i18nConfig.availableLocales.find(loc => loc.startsWith(langPrefix));
  
  return matched || i18nConfig.defaultLocale;
}

import { safeGetItem, safeSetItem } from '@/lib/safeStorage';

/**
 * 持久化语言偏好（兼容 Safari 隐私模式 / localStorage 不可用场景）
 */
export function persistLocale(locale: Locale): void {
  try {
    safeSetItem('baby-learning-locale', locale);
  } catch {
    // 全部存储不可用时静默忽略，下次启动回退到 detectBrowserLocale()
  }
}

/**
 * 从安全存储恢复语言偏好（隐私模式下自动回落内存 / 检测浏览器语言）
 */
export function restorePersistedLocale(): Locale | null {
  try {
    const saved = safeGetItem('baby-learning-locale');
    if (saved && i18nConfig.availableLocales.includes(saved as Locale)) {
      return saved as Locale;
    }
  } catch {
    // 存储异常时不阻塞初始化
  }
  return null;
}

export default i18nConfig;
