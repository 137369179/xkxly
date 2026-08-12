/**
 * AI 服务层 · 结果缓存
 * ------------------------------------------------------------------
 * 为什么必须有：Agnes 全系推理模型，端到端 8~15s。同一个字母的小故事、
 * 同一首诗的讲解，没必要每次都等十几秒。命中缓存后是瞬时的。
 *
 * 策略：内存镜像 + localStorage 持久化 + TTL + LRU（容量上限 120 条）
 *
 * ⚠️ 性能要点：
 * 旧实现每次 read/write 都要 JSON.parse / JSON.stringify 整个 120 条的对象，
 * 而且 cacheGet 命中后为了更新 LRU 时间戳还会立刻全量写回 localStorage
 * ——localStorage 是同步 API，200KB 的序列化直接卡主渲染线程，
 * 首页一进来批量命中缓存就能掉帧。
 * 现在只在内存里改，落盘走防抖 + 页面隐藏时兜底 flush。
 */
import { CACHE_TTL } from './config';

const KEY = 'bl_ai_cache_v1';
const CAP = 120;
/** 落盘防抖窗口：期间的多次改动合并成一次写 */
const FLUSH_DELAY = 1200;

interface Entry {
  v: string;
  /** 过期时间戳 */
  exp: number;
  /** 最近使用时间，用于 LRU */
  at: number;
}

type Store = Record<string, Entry>;

const hasLS = (() => {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
})();

/* ------------------------------------------------------------------ */
/* 内存镜像：全程唯一数据源，localStorage 只是它的持久化副本             */
/* ------------------------------------------------------------------ */
let mem: Store | null = null;
let dirty = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function isEntry(x: unknown): x is Entry {
  const e = x as Entry | undefined;
  return !!e && typeof e.v === 'string' && typeof e.exp === 'number';
}

import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safeStorage';

function load(): Store {
  if (mem) return mem;
  mem = {};
  if (!hasLS) return mem;
  const raw = safeGetItem(KEY);
  if (!raw) return mem;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return mem;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return mem;

  // 顺手清掉已过期的，避免脏数据一直占着容量
  const now = Date.now();
  let dropped = 0;
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isEntry(v)) {
      dropped++;
      continue;
    }
    if (v.exp <= now) {
      dropped++;
      continue;
    }
    mem[k] = { v: v.v, exp: v.exp, at: typeof v.at === 'number' ? v.at : now };
  }
  if (dropped > 0) dirty = true;
  return mem;
}

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!dirty || !mem || !hasLS) return;
  dirty = false;
  try {
    safeSetItem(KEY, JSON.stringify(mem));
  } catch {
    // 容量超限：砍掉一半最久没用的再试一次，还不行就整体放弃
    try {
      const keys = Object.keys(mem).sort((a, b) => mem![a]!.at - mem![b]!.at);
      keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => delete mem![k]);
      safeSetItem(KEY, JSON.stringify(mem));
    } catch {
      safeRemoveItem(KEY);
    }
  }
}

function scheduleFlush() {
  dirty = true;
  if (flushTimer) return;
  flushTimer = setTimeout(flush, FLUSH_DELAY);
}

// 页面被关掉/切后台时兜底落盘，否则防抖窗口内的写入会丢
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

/* ------------------------------------------------------------------ */
/* 对外 API                                                            */
/* ------------------------------------------------------------------ */
export function cacheGet(key: string): string | null {
  const s = load();
  const e = s[key]!;
  if (!e) return null;
  if (Date.now() > e.exp) {
    delete s[key];
    scheduleFlush();
    return null;
  }
  // 只更新内存里的 LRU 时间戳；落盘交给防抖，命中路径保持 O(1) 无序列化
  e.at = Date.now();
  scheduleFlush();
  return e.v;
}

export function cacheSet(key: string, value: string, ttl = CACHE_TTL) {
  if (!key || !value) return;
  const s = load();
  const now = Date.now();
  s[key] = { v: value, exp: now + ttl, at: now };

  const keys = Object.keys(s);
  if (keys.length > CAP) {
    // 先清过期，再按 LRU 砍到 80%
    for (const k of keys) if (s[k]!.exp <= now) delete s[k];
    const left = Object.keys(s);
    if (left.length > CAP) {
      const target = Math.floor(CAP * 0.8);
      left
        .sort((a, b) => s[a]!.at - s[b]!.at)
        .slice(0, left.length - target)
        .forEach((k) => delete s[k]);
    }
  }
  scheduleFlush();
}

export function cacheClear() {
  mem = {};
  dirty = false;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!hasLS) return;
  safeRemoveItem(KEY);
}

export function cacheSize(): number {
  return Object.keys(load()).length;
}
