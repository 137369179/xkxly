/**
 * 轻量前端监控：错误上报 + Web Vitals
 * ------------------------------------------------------------
 * 设计目标：
 *   - 零第三方依赖，不引入 Sentry/GA 等重 SDK
 *   - 错误兜底：window.onerror + unhandledrejection + ErrorBoundary 主动上报
 *   - Web Vitals：LCP / CLS / FCP / TTFB，用原生 PerformanceObserver 采集
 *   - 上报通道：navigator.sendBeacon（页面关闭也能发出）+ fetch 兜底
 *   - 限流：同类错误 30s 内只上报一次，避免错误风暴打爆 /api/log
 *   - 开发环境只 console，不发请求，避免噪音
 *
 * BFF 端 /api/log 接口接收后落盘到 logs/error.log（server）或 Cache API（worker）。
 */

/** 上报载荷 */
interface ErrorReport {
  type: 'error' | 'vital';
  /** 错误类型：runtime | promise | render | resource */
  category?: string;
  /** 错误消息（type=error 时必填，type=vital 时为空） */
  message?: string;
  stack?: string;
  /** 发生时间戳 */
  at: number;
  /** 当前路由 hash */
  route: string;
  /** User-Agent（用于区分 iPad / 手机 / 桌面） */
  ua: string;
  /** 构建版本，便于排查"哪个版本开始出现" */
  build?: string;
  /** Web Vitals 指标名（type=vital 时） */
  metric?: string;
  /** Web Vitals 数值（type=vital 时） */
  value?: number;
  /** 评分（good/needs-improvement/poor） */
  rating?: string;
}

/** 上报端点 */
const ENDPOINT = '/api/log';

/** 同类错误去重窗口（30 秒） */
const DEDUP_WINDOW = 30_000;
/** 最近上报过的错误指纹 → 时间戳 */
const recentReports = new Map<string, number>();

/** 是否开发环境（开发环境只 console 不上报） */
const isDev = import.meta.env.DEV;

/** 构建版本：从 Vite 注入的 BASE_URL 或时间戳兜底 */
const BUILD_VERSION = import.meta.env.MODE + '-' + 'v6';

/** 生成错误指纹，用于去重 */
function fingerprint(r: ErrorReport): string {
  if (r.type === 'vital') return `vital:${r.metric}`;
  // 错误：取 message 前 100 字 + category，忽略堆栈细节（堆栈每次可能不同）
  return `error:${r.category}:${(r.message ?? '').slice(0, 100)}`;
}

/** 实际发送上报 */
function send(report: ErrorReport): void {
  if (isDev) {
    // 开发环境只打控制台，不发请求
    if (report.type === 'vital') {
      console.log(`[vital] ${report.metric}=${report.value?.toFixed(0)} (${report.rating})`);
    } else {
      console.warn('[monitor]', report.category, report.message, report.stack);
    }
    return;
  }

  // 去重：30s 内同类错误只报一次
  const fp = fingerprint(report);
  const now = Date.now();
  const last = recentReports.get(fp);
  if (last && now - last < DEDUP_WINDOW) return;
  recentReports.set(fp, now);
  // 清理过期条目，防止 Map 无限增长（每次 send 都清理，避免 stale 指纹堆积）
  for (const [k, t] of recentReports) {
    if (k !== fp && now - t > DEDUP_WINDOW) recentReports.delete(k);
  }

  // 优先用 sendBeacon（页面卸载也能发出），兜底 fetch
  try {
    const body = JSON.stringify(report);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {/* 上报失败不影响主功能 */});
  } catch {
    /* noop */
  }
}

/** 主动上报渲染期错误（ErrorBoundary 调用） */
export function reportRenderError(error: Error, componentStack?: string): void {
  send({
    type: 'error',
    category: 'render',
    message: error.message,
    stack: error.stack || componentStack,
    at: Date.now(),
    route: location.hash || location.pathname,
    ua: navigator.userAgent,
    build: BUILD_VERSION,
  });
}

/** 主动上报通用错误 */
export function reportError(category: string, message: string, stack?: string): void {
  send({
    type: 'error',
    category,
    message,
    stack,
    at: Date.now(),
    route: location.hash || location.pathname,
    ua: navigator.userAgent,
    build: BUILD_VERSION,
  });
}

/** 上报 Web Vital */
function reportVital(metric: string, value: number, rating: string): void {
  send({
    type: 'vital',
    metric,
    value,
    rating,
    at: Date.now(),
    route: location.hash || location.pathname,
    ua: navigator.userAgent,
    build: BUILD_VERSION,
  });
}

/** Web Vitals 评分阈值 */
function rateLcp(v: number): string {
  if (v <= 2500) return 'good';
  if (v <= 4000) return 'needs-improvement';
  return 'poor';
}
function rateCls(v: number): string {
  if (v <= 0.1) return 'good';
  if (v <= 0.25) return 'needs-improvement';
  return 'poor';
}
function rateFcp(v: number): string {
  if (v <= 1800) return 'good';
  if (v <= 3000) return 'needs-improvement';
  return 'poor';
}
function rateTtfb(v: number): string {
  if (v <= 800) return 'good';
  if (v <= 1800) return 'needs-improvement';
  return 'poor';
}
/** INP 评分阈值（2024 年起替代 FID 成为 Core Web Vital） */
function rateInp(v: number): string {
  if (v <= 200) return 'good';
  if (v <= 500) return 'needs-improvement';
  return 'poor';
}

/** 初始化全局监控：在 main.tsx 调用一次 */
export function initMonitor(): void {
  // 1. 运行时同步错误
  window.addEventListener('error', (e) => {
    reportError('runtime', e.message, e.error?.stack || e.filename + ':' + e.lineno);
  });

  // 2. Promise 未捕获拒绝
  window.addEventListener(
    'unhandledrejection',
    (e) => {
      const reason = e.reason;
      const msg = (reason instanceof Error ? reason.message || reason.name : String(reason ?? '')).trim();
      // 过滤由浏览器插件/DevTools扩展（如 Qoder/React DevTools）注入引起的外部通信噪音及空错误
      if (
        !msg ||
        msg === 'undefined' ||
        msg === 'null' ||
        msg === '[object Object]' ||
        msg.includes('message channel closed before a response was received') ||
        msg.includes('Could not establish connection') ||
        msg.includes('Extension context invalidated') ||
        msg.includes('ResizeObserver loop')
      ) {
        e.preventDefault?.();
        e.stopImmediatePropagation?.();
        return;
      }
      const stack = reason instanceof Error ? reason.stack : undefined;
      reportError('promise', msg, stack);
    },
    true,
  );

  // 3. Web Vitals：LCP（最大内容绘制）
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1]!
      if (last) {
        reportVital('LCP', last.startTime, rateLcp(last.startTime));
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {/* 老浏览器不支持 */}

  // 4. Web Vitals：CLS（累积布局偏移）
  let clsValue = 0;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // LayoutShift entry: hadRecentInput and value are not in the standard PerformanceEntry type
        const ls = entry as PerformanceEntry & { hadRecentInput?: boolean; value: number };
        if (!ls.hadRecentInput) clsValue += ls.value;
      }
      reportVital('CLS', clsValue, rateCls(clsValue));
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {/* noop */}

  // 5. Web Vitals：FCP（首次内容绘制）
  try {
    new PerformanceObserver((list) => {
      const entry = list.getEntries()[0];
      if (entry) reportVital('FCP', entry.startTime, rateFcp(entry.startTime));
    }).observe({ type: 'paint', buffered: true });
  } catch {/* noop */}

  // 6. Web Vitals：TTFB（首字节时间）
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      reportVital('TTFB', nav.responseStart - nav.requestStart, rateTtfb(nav.responseStart - nav.requestStart));
    }
  } catch {/* noop */}

  // 7. Web Vitals：INP（Interaction to Next Paint，2024 年起替代 FID 的 Core Web Vital）
  //    测量用户交互（点击/按键/pointerdown）到下一帧绘制间的最长延迟，反映"卡顿感"。
  //    采用 worstStrategy：会话内取最高值，页面隐藏时上报。
  try {
    let worstInp = 0;
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // interactionDuration 是 Chrome 110+ 字段；老版本回退到 duration
        const dur = (entry as PerformanceEventTiming).interactionDuration ?? entry.duration;
        if (dur > worstInp) worstInp = dur;
      }
    });
    po.observe({ type: 'event', buffered: true });
    // 页面隐藏时上报本会话最差 INP
    const onHide = () => {
      if (worstInp > 0) reportVital('INP', worstInp, rateInp(worstInp));
      po.disconnect();
      window.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    window.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
  } catch {/* 老浏览器不支持 event observer */}
}

/** PerformanceObserver 'event' 条目类型（INP 用），TS 内置类型尚不完整故补声明 */
interface PerformanceEventTiming extends PerformanceEntry {
  interactionDuration?: number;
}
