/**
 * 统一日志工具
 * 
 * WHY: 
 * - 生产环境自动禁用 debug/info 级别日志，避免隐私泄露和性能开销
 * - 开发环境保留完整日志便于调试
 * - 统一格式前缀，方便控制台过滤
 */

const isDev = import.meta.env.DEV;
// 测试环境也要输出 debug/info：多处测试通过 console spy 断言业务日志（[stuck]/fr_debug 等），
// 「生产静默」的本意只是不污染生产控制台，不应让 vitest 下断言失明。
const verbose = isDev || import.meta.env.MODE === 'test';

export const logger = {
  /**
   * 开发环境专用调试日志
   * 生产环境完全静默（开发 / 测试环境输出）
   */
  debug: (...args: unknown[]) => {
    if (verbose) {
      console.debug('[Debug]', ...args);
    }
  },

  /**
   * 信息性日志
   * 生产环境静默，仅开发 / 测试环境输出
   */
  info: (...args: unknown[]) => {
    if (verbose) {
      console.info('[Info]', ...args);
    }
  },

  /**
   * 警告日志 - 始终输出
   * 用于潜在问题提醒
   */
  warn: (...args: unknown[]) => {
    console.warn('[Warn]', ...args);
  },

  /**
   * 错误日志 - 始终输出
   * 用于异常捕获和业务错误
   */
  error: (...args: unknown[]) => {
    console.error('[Error]', ...args);
  },

  /**
   * 性能打点日志（仅开发环境）
   * 用于 LCP/FID/CLS 等 Web Vitals 调试
   */
  perf: (label: string, value: number) => {
    if (isDev) {
      console.log(`[Perf] ${label}: ${value.toFixed(2)}ms`);
    }
  },
};
