/**
 * 安全本地存储封装 · 全站唯一容错入口
 * ------------------------------------------------------------
 * 为什么需要：Safari 隐私模式、部分家长管控 WebView、禁用第三方存储的
 * 嵌入式浏览器中，`localStorage` / `sessionStorage` 的读写会抛
 * `SecurityError` / `QuotaExceededError`。zustand persist 水合、i18n 初始化、
 * 组件挂载期若裸调 localStorage，会直接把整页拖垮（白屏或 ErrorBoundary 兜底卡片）。
 *
 * 设计要点：
 *   - 所有读写永不抛出：不可用 / 解析失败时回落到默认值或内存态；
 *   - 读取失败先试 sessionStorage 兜底，再回落内存 Map（保证会话内一致性）；
 *   - 提供 getJSON / setJSON，JSON 解析失败安全回落 fallback，不污染调用方；
 *   - 写入失败派发 'storage-error' 事件，供 UI 轻提示（不走 console 报错刷屏）。
 */

const MAX_MEMORY_FALLBACK_ENTRIES = 200;
const memoryFallback = new Map<string, string>();

function setMemoryFallback(name: string, value: string): void {
  // 若已存在先删除再设置，确保 Map 迭代顺序反映最新访问 (LRU)
  if (memoryFallback.has(name)) {
    memoryFallback.delete(name);
  } else if (memoryFallback.size >= MAX_MEMORY_FALLBACK_ENTRIES) {
    // 达到上限淘汰最旧条目，防止无限制内存膨胀
    const oldest = memoryFallback.keys().next().value;
    if (oldest !== undefined) memoryFallback.delete(oldest);
  }
  memoryFallback.set(name, value);
}

function storageAvailable(kind: 'local' | 'session'): Storage | null {
  try {
    const s = kind === 'local' ? window.localStorage : window.sessionStorage;
    const probe = '__bb_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

// P2-2 修复：原每次 get/set 都执行 setItem+removeItem 探针写，高频调用放大主线程阻塞。
// 缓存探针结果 5 分钟，复用同一 Storage 引用；写失败立即失效，下次调用重新探测。
const PROBE_TTL = 5 * 60 * 1000;
let _local: Storage | null | undefined = undefined;
let _localAt = 0;
let _session: Storage | null | undefined = undefined;
let _sessionAt = 0;

function getLocal(): Storage | null {
  const now = Date.now();
  if (_local !== undefined && now - _localAt < PROBE_TTL) return _local;
  _local = storageAvailable('local');
  _localAt = now;
  return _local;
}
function getSession(): Storage | null {
  const now = Date.now();
  if (_session !== undefined && now - _sessionAt < PROBE_TTL) return _session;
  _session = storageAvailable('session');
  _sessionAt = now;
  return _session;
}
function invalidateLocal() { _local = undefined; _localAt = 0; }
function invalidateSession() { _session = undefined; _sessionAt = 0; }

function emitError(name: string) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('storage-error', { detail: { name } }));
    } catch {
      /* 事件派发失败不二次抛错 */
    }
  }
}

export function safeGetItem(name: string): string | null {
  // 1) 优先 memory 兜底（上次同会话写入若 localStorage 不可用，仍可读回）
  if (memoryFallback.has(name)) return memoryFallback.get(name)!;
  try {
    const ls = getLocal();
    if (ls) return ls.getItem(name);
  } catch {
    invalidateLocal();
    /* 落到 sessionStorage */
  }
  try {
    const ss = getSession();
    if (ss) return ss.getItem(name);
  } catch {
    invalidateSession();
    /* 落到内存 */
  }
  return null;
}

export function safeSetItem(name: string, value: string): void {
  setMemoryFallback(name, value);
  try {
    const ls = getLocal();
    if (ls) {
      ls.setItem(name, value);
      return;
    }
  } catch {
    invalidateLocal();
    /* 落到 sessionStorage */
  }
  try {
    const ss = getSession();
    if (ss) {
      ss.setItem(name, value);
      return;
    }
  } catch {
    invalidateSession();
    /* 落到内存 */
  }
  // 全部不可用：仅保留内存态，并通知 UI（不抛错）
  emitError(name);
}

export function safeRemoveItem(name: string): void {
  memoryFallback.delete(name);
  try {
    const ls = getLocal();
    if (ls) ls.removeItem(name);
  } catch {
    invalidateLocal();
    /* noop */
  }
  try {
    const ss = getSession();
    if (ss) ss.removeItem(name);
  } catch {
    invalidateSession();
    /* noop */
  }
}

/** 安全解析 JSON：失败回落 fallback（默认 null），绝不抛出 */
export function safeParseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeGetJSON<T>(name: string, fallback: T): T {
  return safeParseJSON(safeGetItem(name), fallback);
}

export function safeSetJSON(name: string, value: unknown): void {
  try {
    safeSetItem(name, JSON.stringify(value));
  } catch {
    // JSON.stringify 极少见失败（循环引用等）；写内存兜底避免丢失引用
    setMemoryFallback(name, String(value));
  }
}

export const safeStorage = {
  getItem: safeGetItem,
  setItem: safeSetItem,
  removeItem: safeRemoveItem,
  getJSON: safeGetJSON,
  setJSON: safeSetJSON,
  parseJSON: safeParseJSON,
};

/** 仅测试用：清空内存兜底态，配合 vi.stubGlobal 后加载场景的跨测试隔离 */
export function clearMemoryFallback(): void {
  memoryFallback.clear();
}
