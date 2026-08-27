/**
 * Service Worker 注册与更新通知
 * ------------------------------------------------------------------
 * 把原本散落在 index.html 内联脚本里的注册逻辑收敛到这里，集中管理：
 *   1. 注册 /sw.js
 *   2. 监听 SW 发来的 `sw-updated` 消息（activate 时 postMessage）
 *   3. 兜底监听 controllerchange（防止 message 事件丢失）
 *   4. 暴露 onSwUpdate(callback) 让 UI 层订阅更新事件，显示温和提示
 *
 * 设计取舍：
 *   - 不强制刷新：孩子正在学习时突然刷新页面会打断体验，只提示不强制
 *   - 不静默更新：让用户知道"刷新一下就能用最新版"，避免困惑
 *   - 单次订阅：callback 返回 unsubscribe 函数，方便组件卸载时清理
 */

export interface SwUpdateInfo {
  /** 新 SW 的缓存版本号，例如 'baby-park-v3' */
  version: string;
  /** 本次 activate 清理的旧缓存桶数量 */
  clearedCaches: number;
  /** 更新发生的时间戳 */
  at: number;
}

type Listener = (info: SwUpdateInfo) => void;

const listeners = new Set<Listener>();

function emit(info: SwUpdateInfo): void {
  listeners.forEach((l) => l(info));
}

let registered = false;
/** 消息/controllerchange 监听只绑一次（registered 会在注册失败时回退，绑定不能跟着重复） */
let channelsBound = false;
/** 已尝试注册次数，用于失败自动重试的次数上限 */
let attempts = 0;

/** 注册失败后的重试上限与退避间隔（弱网/首屏拥塞时给一次机会） */
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;

/** 绑定更新通知的两条监听路径（幂等） */
function bindUpdateChannels(): void {
  if (channelsBound) return;
  channelsBound = true;

  // 路径 1：接收 SW activate 后 postMessage 来的更新通知（主路径）
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data;
    if (data && data.type === 'sw-updated') {
      emit({
        version: data.version,
        clearedCaches: data.clearedCaches ?? 0,
        at: data.at ?? Date.now(),
      });
    }
  });

  // 路径 2：controller 切换兜底（防止 postMessage 时序丢失）
  // 正确逻辑：首次注册时 controller 为 null，此时 controllerchange 是"首次接管"，应跳过；
  // 已有 controller 时（更新场景），controllerchange 才是真正的"更新"，应 emit。
  let skipFirstChange = !navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (skipFirstChange) {
      skipFirstChange = false;
      return;
    }
    emit({
      version: 'unknown',
      clearedCaches: 0,
      at: Date.now(),
    });
  });
}

/** 真正调用 register()；失败时重置标志并做有限次退避重试 */
async function doRegister(): Promise<void> {
  attempts++;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');

    // 路径 3：updatefound + statechange 兜底
    // 当 register() 发现新版 SW 正在安装时，监听其状态变化
    const trackWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        // 新 SW 已激活（skipWaiting 后立即进入 activated）
        if (worker.state === 'activated') {
          emit({ version: 'unknown', clearedCaches: 0, at: Date.now() });
        }
      });
    };

    // 注册时可能已有 waiting 的 SW（浏览器在导航阶段就下载了新版）
    if (registration.waiting) {
      emit({ version: 'unknown', clearedCaches: 0, at: Date.now() });
    }
    if (registration.installing) {
      trackWorker(registration.installing);
    }

    // 后续发现新版 SW
    registration.addEventListener('updatefound', () => {
      trackWorker(registration.installing);
    });
  } catch (err) {
    // SW 注册失败不阻断应用，只是暂时失去离线能力
    if (import.meta.env.DEV) console.warn('[SW] 注册失败：', err);
    // 重置标志：允许后续（自动重试或调用方再次调用 registerSW）重新注册
    registered = false;
    if (attempts < MAX_ATTEMPTS) {
      setTimeout(() => registerSW(), RETRY_DELAY_MS * attempts);
    }
  }
}

/** 注册 Service Worker。重复调用是安全的，只注册一次（失败后允许重试）。 */
export function registerSW(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  // 开发环境 (localhost/127.0.0.1/DEV) 彻底注销并清除旧 Service Worker 与 Cache Storage，确保热重载与最新代码立即可见
  if (
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister();
      }
    });
    if ('caches' in window) {
      void caches.keys().then((keys) => {
        for (const key of keys) {
          void caches.delete(key);
        }
      });
    }
    return;
  }

  if (registered) return;
  registered = true;
  bindUpdateChannels();

  // 原实现死等 load 事件：若本模块在 load 之后才执行（懒加载/动态 import），
  // load 永不再触发 → SW 永不注册。改为先看 readyState，已就绪就直接注册。
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    void doRegister();
    return;
  }
  // 文档仍在解析：DOM 就绪即可注册（load 兜底，两者只会生效一次）
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    void doRegister();
  };
  window.addEventListener('DOMContentLoaded', start, { once: true });
  window.addEventListener('load', start, { once: true });
}

/** 订阅 SW 更新事件，返回取消订阅函数 */
export function onSwUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
