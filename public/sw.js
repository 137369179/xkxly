/**
 * 宝贝学习乐园 · Service Worker
 * ============================================================
 * 缓存策略：
 *   1. App Shell（HTML/manifest/图标）：安装时预缓存
 *   2. JS/CSS chunk（/assets/*.js|css）：cache-first（文件名带 hash， immutable）
 *   3. 字体（/fonts/*）：cache-first，长期缓存
 *   4. 数据 JSON（/data/*.json，字库/古诗语料）：stale-while-revalidate
 *   5. 图片（png/jpg/svg/webp）：cache-first，30 天
 *   6. 导航请求（页面跳转）：network-first，离线时回退到缓存的 index.html
 *   7. API 请求（/api/*）：不缓存，直接透传网络
 *
 * 缓存版本：版本号与预缓存清单现在由构建脚本 scripts/gen-sw-precache.mjs
 *   在每次构建时自动派生并写入 public/precache-manifest.json（随 public/ 一起部署）。
 *   - version 由预缓存资源内容哈希生成，资源变更自动产生新版本 → 旧缓存清理，无需手动 bump。
 *   - urls 自动扫描 public/ 的稳定 App Shell 资源，新增图标/字体无需手动维护。
 *   详见 sw.js 内 loadManifest() 与 scripts/gen-sw-precache.mjs。
 *
 * 注意：此文件运行在 ServiceWorker GlobalScope，不能用 ES module import，
 * 也不能用 window/document。所有 API 都是 self.* / caches.* / fetch()。
 */
// @ts-check

/**
 * 预缓存清单在构建时由 scripts/gen-sw-precache.mjs 生成（public/precache-manifest.json）：
 *   - version：由预缓存资源内容哈希派生，资源变更自动产生新版本 → 旧缓存被清理
 *   - urls：自动扫描 public/ 的稳定 App Shell 资源（manifest / 字体 / png 图标 / 精选 jpg）
 * 这样无需手动 bump 版本号或维护 URL 清单（解决 sw.js 头部的两条 ⚠️ 警告）。
 */

/** 清单加载失败时的兜底（保证 install 永不中断；版本固定，资源变更时需重新部署） */
const FALLBACK_MANIFEST = {
  version: 'baby-park-v16',
  urls: [
    '/',
    '/index.html',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/apple.png',
    '/icons/letters.jpg',
    '/icons/words.jpg',
    '/icons/fun.jpg',
    '/icons/adventure.jpg',
    '/icons/star.png',
    '/icons/heart.png',
    '/icons/crown.png',
    '/certificate_bg.jpg',
    '/hero_banner.jpg',
    '/fonts/baloo-2.woff2',
  ],
};

/** 运行时由 install 阶段填充（先给默认值，保证 fetch 阶段可用） */
let VERSION = FALLBACK_MANIFEST.version;
let PRECACHE_URLS = FALLBACK_MANIFEST.urls.slice();

/** 运行时缓存分桶，每桶独立 cache + 独立策略；桶名随版本变化以整体刷新 */
function runtimeBuckets(version) {
  return {
    // 带 hash 的构建产物，永久缓存（文件名变了就是新 URL，不会命中旧缓存）
    assets: `${version}-assets`,
    // 字体文件
    fonts: `${version}-fonts`,
    // 数据 JSON（字库、古诗语料等）—— 用 stale-while-revalidate 保证能更新
    data: `${version}-data`,
    // 图片资源
    images: `${version}-images`,
    // 音频资源（歌曲、发音等）—— cache-first + LRU，离线可用
    audio: `${version}-audio`,
  };
}
let RUNTIME_BUCKETS = runtimeBuckets(VERSION);

/** 异步加载预缓存清单（构建产物，随 public/ 一起部署到 dist/） */
async function loadManifest() {
  try {
    const res = await fetch('/precache-manifest.json', { cache: 'no-cache' });
    if (res && res.ok) {
      const json = await res.json();
      if (json && typeof json.version === 'string' && Array.isArray(json.urls)) {
        return json;
      }
    }
  } catch (e) {
    /* 离线或清单缺失：回落 FALLBACK */
  }
  return FALLBACK_MANIFEST;
}

/** 所有缓存桶名，activate 时清理不在列表中的旧桶 */
function allBuckets() {
  return [VERSION, ...Object.values(RUNTIME_BUCKETS)];
}

/**
 * 离线图片占位：当图片请求离线且未缓存时，返回一个内联 SVG（可爱小猫 + 提示），
 * 而不是让 <img> 显示浏览器默认的破图。SVG 由同源 SW 返回，符合 CSP img-src 'self'。
 */
const OFFLINE_IMAGE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">' +
  '<rect width="320" height="240" fill="#F3E8FF"/>' +
  '<circle cx="160" cy="100" r="46" fill="#C4B5FD"/>' +
  '<polygon points="128,70 118,42 150,64" fill="#C4B5FD"/>' +
  '<polygon points="192,70 202,42 170,64" fill="#C4B5FD"/>' +
  '<circle cx="144" cy="98" r="6" fill="#4C1D95"/>' +
  '<circle cx="176" cy="98" r="6" fill="#4C1D95"/>' +
  '<path d="M150 116 q10 10 20 0" stroke="#4C1D95" stroke-width="4" fill="none" stroke-linecap="round"/>' +
  '<text x="160" y="186" font-size="20" fill="#7C3AED" text-anchor="middle" font-family="system-ui,sans-serif">离线啦，连网后就能看～</text>' +
  '</svg>';

/** 构造离线图片占位响应 */
function offlineImageResponse() {
  return new Response(OFFLINE_IMAGE_SVG, {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
}

/* ------------------------------------------------------------------ */
/* 安装：预缓存 App Shell                                               */
/* ------------------------------------------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // 加载构建生成的预缓存清单，派生版本号与资源清单（失败回落 FALLBACK）
      const manifest = await loadManifest();
      VERSION = manifest.version;
      PRECACHE_URLS = manifest.urls;
      RUNTIME_BUCKETS = runtimeBuckets(VERSION);
      const cache = await caches.open(VERSION);
      // 逐个添加容错：单个资源失败不阻断安装，运行时会自动回退到网络
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => {
            /* 单个资源预缓存失败不阻断安装，运行时会自动回退到网络 */
          }),
        ),
      );
    })(),
  );
  // 跳过等待，新版 SW 立即接管
  self.skipWaiting();
});

/* ------------------------------------------------------------------ */
/* 激活：清理旧版本缓存，并通知前端"已更新"                              */
/* ------------------------------------------------------------------ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. 清理白名单外的旧缓存，统计清理数量（前端可显示"已清理 N 项"）
      const keys = await caches.keys();
      const staleKeys = keys.filter((k) => !allBuckets().includes(k));
      await Promise.all(staleKeys.map((k) => caches.delete(k)));

      // 2. 立即控制所有客户端，不用等下次刷新
      await self.clients.claim();

      // 3. 通知所有打开的页面：SW 已更新到新版本
      //    前端据此显示温和的"刷新可用"提示，避免用户困惑：
      //    - 不强制刷新，孩子当前的学习会话不会被中断
      //    - 不静默更新，让用户知道"刷新一下就能用最新版"
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const payload = {
        type: 'sw-updated',
        version: VERSION,
        clearedCaches: staleKeys.length,
        at: Date.now(),
      };
      clientsList.forEach((client) => client.postMessage(payload));
    })(),
  );
});

/* ------------------------------------------------------------------ */
/* message：前端可主动请求立即激活新版（配合 updatefound 监听）          */
/* ------------------------------------------------------------------ */
self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'skip-waiting') {
    self.skipWaiting();
  }
});

/* ------------------------------------------------------------------ */
/* 工具函数                                                            */
/* ------------------------------------------------------------------ */

/** 判断请求 URL 是否匹配指定前缀或扩展名 */
/**
 * @param {URL} url
 * @returns {boolean}
 */
function isAsset(url) {
  // Vite 构建产物：/assets/index-xxxx.js / /assets/index-xxxx.css
  return url.pathname.startsWith('/assets/');
}
/**
 * @param {URL} url
 * @returns {boolean}
 */
function isFont(url) {
  return (
    url.pathname.startsWith('/fonts/') ||
    /\.(woff2?|ttf|eot|otf)(\?|$)/.test(url.pathname)
  );
}
/**
 * @param {URL} url
 * @returns {boolean}
 */
function isData(url) {
  return url.pathname.startsWith('/data/') && url.pathname.endsWith('.json');
}
/**
 * @param {URL} url
 * @returns {boolean}
 */
function isImage(url) {
  return /\.(png|jpe?g|gif|svg|webp|avif|ico)(\?|$)/.test(url.pathname);
}
/**
 * @param {URL} url
 * @returns {boolean}
 */
function isAudio(url) {
  return /\.(mp3|wav|ogg|m4a)(\?|$)/.test(url.pathname);
}

/**
 * @param {URL} url
 * @returns {boolean}
 */
function isApi(url) {
  return url.pathname.startsWith('/api/');
}

/**
 * cache-first：有缓存直接返回，无缓存走网络并回填缓存
 * @param {Request} request
 * @param {string} bucketName
 * @returns {Promise<Response>}
 */
async function cacheFirst(request, bucketName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const network = await fetch(request);
  if (network && network.ok) {
    const cache = await caches.open(bucketName);
    try {
      await cache.put(request, network.clone());
    } catch (e) {
      // 存储配额超限（QuotaExceededError）时静默跳过，不影响响应
    }
  }
  return network;
}

const IMAGE_CACHE_MAX = 80;

/**
 * cache-first + LRU 淘汰（核心加强 L）
 * ------------------------------------------------------------
 * 图片缓存原 cache-first 无上限，长期使用后缓存会无限增长，
 * 最终触发浏览器存储配额（通常 50MB-数 GB）耗尽，导致：
 *   - 新图片无法缓存
 *   - 其他缓存桶被浏览器强制清除
 *   - SW 写入失败报错
 *
 * LRU 策略：写入新缓存后检查条目数，超过 MAX_ENTRIES 时
 * 按 Cache API 的插入顺序删除最早的条目（近似 LRU）。
 * 80 张图 ≈ 10-20MB，足够覆盖常用资源又不会撑爆配额。
 *
 * @param {Request} request
 * @param {string} bucketName
 * @param {number} maxEntries 单桶最大条目数，超过则淘汰最旧
 * @returns {Promise<Response>}
 */
async function cacheFirstWithLRU(request, bucketName, maxEntries) {
  const cache = await caches.open(bucketName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const network = await fetch(request);
  if (network && network.ok) {
    try {
      await cache.put(request, network.clone());
    } catch (e) {
      // 存储配额超限（QuotaExceededError）时静默跳过
    }
    // LRU 淘汰：检查条目数，超限则删最早的
    try {
      const keys = await cache.keys();
      if (keys.length > maxEntries) {
        // keys() 按插入顺序返回，删掉最早的 (keys.length - maxEntries) 个
        const toRemove = keys.length - maxEntries;
        for (let i = 0; i < toRemove; i++) {
          await cache.delete(keys[i]);
        }
      }
    } catch {
      /* LRU 清理失败不阻断响应 */
    }
  }
  return network;
}

/**
 * stale-while-revalidate：先返回缓存，后台更新缓存
 * @param {Request} request
 * @param {string} bucketName
 * @returns {Promise<Response>}
 */
async function staleWhileRevalidate(request, bucketName) {
  const cache = await caches.open(bucketName);
  const cached = await cache.match(request);
  // 后台更新（不阻塞响应）
  const networkPromise = fetch(request)
    .then((network) => {
      if (network && network.ok) {
        try {
          cache.put(request, network.clone());
        } catch (e) {
          // 存储配额超限（QuotaExceededError）时静默跳过
        }
      }
      return network;
    })
    .catch((err) => {
      // 网络失败：有缓存就返回缓存，无缓存则抛错让外层 catch 回退到 fetch
      if (cached) return cached;
      throw err;
    });
  // 有缓存先返回，无缓存等网络
  return cached || networkPromise;
}

/** network-first：优先网络，失败时回退缓存，再失败回退 App Shell */
async function networkFirst(request) {
  try {
    const network = await fetch(request);
    if (network && network.ok) {
      const cache = await caches.open(VERSION);
      cache.put(request, network.clone());
    }
    return network;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // 导航请求离线时回退到 index.html（SPA 路由由前端处理）
    const shell = await caches.match('/index.html');
    if (shell) return shell;
    // index.html 也没缓存（首次访问离线）：返回一个最小的离线提示页
    return new Response(
      '<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>离线了</title><body style="font-family:system-ui;text-align:center;padding:3rem">' +
        '<h1>📶 当前没有网络</h1><p>请连上网络后再打开宝贝学习乐园～</p></body>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 },
    );
  }
}

/* ------------------------------------------------------------------ */
/* fetch 事件：按资源类型分发缓存策略                                   */
/* ------------------------------------------------------------------ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  // 只拦截 GET 请求
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  // 跨域请求（如 AI 上游）不缓存
  if (url.origin !== self.location.origin) return;

  // API 请求：绝不缓存，直接透传
  if (isApi(url)) return;

  // 按资源类型分发
  if (isAsset(url)) {
    // JS/CSS chunk：cache-first（文件名带 hash，immutable）
    event.respondWith(cacheFirst(request, RUNTIME_BUCKETS.assets).catch(() => fetch(request)));
    return;
  }
  if (isFont(url)) {
    event.respondWith(cacheFirst(request, RUNTIME_BUCKETS.fonts).catch(() => fetch(request)));
    return;
  }
  if (isData(url)) {
    // 数据 JSON：stale-while-revalidate，保证语料能更新
    event.respondWith(staleWhileRevalidate(request, RUNTIME_BUCKETS.data).catch(() => fetch(request)));
    return;
  }
  if (isImage(url)) {
    // 核心加强 L：图片缓存改用 LRU 限制，避免长期使用撑爆存储配额
    // 离线且未缓存时回退到内联 SVG 占位，避免破图
    event.respondWith(
      cacheFirstWithLRU(request, RUNTIME_BUCKETS.images, IMAGE_CACHE_MAX).catch(() =>
        offlineImageResponse(),
      ),
    );
    return;
  }
  if (isAudio(url)) {
    // 音频缓存：cache-first + LRU（30 条），离线时仍可播放歌曲和发音
    event.respondWith(cacheFirstWithLRU(request, RUNTIME_BUCKETS.audio, 30).catch(() => fetch(request)));
    return;
  }
  // 导航请求（页面跳转）：network-first，离线回退 index.html
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  // 其他请求：默认 network-first
  event.respondWith(networkFirst(request));
});
