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

const memoryFallback = new Map<string, string>();

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
    const ls = storageAvailable('local');
    if (ls) return ls.getItem(name);
  } catch {
    /* 落到 sessionStorage */
  }
  try {
    const ss = storageAvailable('session');
    if (ss) return ss.getItem(name);
  } catch {
    /* 落到内存 */
  }
  return null;
}

export function safeSetItem(name: string, value: string): void {
  memoryFallback.set(name, value);
  try {
    const ls = storageAvailable('local');
    if (ls) {
      ls.setItem(name, value);
      return;
    }
  } catch {
    /* 落到 sessionStorage */
  }
  try {
    const ss = storageAvailable('session');
    if (ss) {
      ss.setItem(name, value);
      return;
    }
  } catch {
    /* 落到内存 */
  }
  // 全部不可用：仅保留内存态，并通知 UI（不抛错）
  emitError(name);
}

export function safeRemoveItem(name: string): void {
  memoryFallback.delete(name);
  try {
    const ls = storageAvailable('local');
    if (ls) ls.removeItem(name);
  } catch {
    /* noop */
  }
  try {
    const ss = storageAvailable('session');
    if (ss) ss.removeItem(name);
  } catch {
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
    memoryFallback.set(name, String(value));
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
