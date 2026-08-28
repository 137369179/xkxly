/**
 * ⚡ 高频路由预测性预加载 (Predictive Route Preloader)
 * ------------------------------------------------------------------
 * 在浏览器空闲时（requestIdleCallback）或首屏渲染后静默预加载高频模块代码包，
 * 彻底消除点击切换页面时的网络拉取延迟与骨架屏闪烁。
 */

import type { RouteId } from './router';

const PRELOAD_LOADERS: Partial<Record<RouteId, () => Promise<unknown>>> = {
  today: () => import('@/modules/today/TodayPage'),
  hanzi: () => import('@/modules/hanzi/HanziPage'),
  letters: () => import('@/modules/letters/LettersPage'),
  numbers: () => import('@/modules/numbers/NumbersPage'),
  cat_house: () => import('@/modules/pet/CatHousePage'),
  pinyin: () => import('@/modules/pinyin/PinyinPage'),
  words: () => import('@/modules/words/WordsPage'),
  poems: () => import('@/modules/poems/PoemsPage'),
  growth: () => import('@/modules/growth/GrowthMuseumPage'),
};

const preloadedRoutes = new Set<RouteId>();

/** 预加载指定路由的代码分包 */
export function preloadRoute(routeId: RouteId): void {
  if (preloadedRoutes.has(routeId)) return;
  const loader = PRELOAD_LOADERS[routeId];
  if (loader) {
    preloadedRoutes.add(routeId);
    loader().catch(() => {
      // 预加载静默失败不抛错，真正导航时仍会触发重试
      preloadedRoutes.delete(routeId);
    });
  }
}

/** 在浏览器空闲时间段依次温和预加载核心高频路由（首屏稳定后 6s 启动，间隔 1.5s） */
export function preloadHighFrequencyRoutes(): void {
  if (typeof window === 'undefined') return;

  const coreQueue: RouteId[] = ['today', 'hanzi', 'letters', 'numbers', 'cat_house'];

  const scheduleNext = (queue: RouteId[]) => {
    if (queue.length === 0) return;
    const nextRoute = queue[0]!;
    const remaining = queue.slice(1);

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(
        () => {
          preloadRoute(nextRoute);
          setTimeout(() => scheduleNext(remaining), 1500);
        },
        { timeout: 8000 },
      );
    } else {
      setTimeout(() => {
        preloadRoute(nextRoute);
        scheduleNext(remaining);
      }, 1500);
    }
  };

  // 延迟到首屏渲染完成且主线程充分空闲后触发（避免与 TBT/LCP 测速争抢 CPU）
  setTimeout(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        scheduleNext(coreQueue);
      }, { timeout: 10000 });
    } else {
      scheduleNext(coreQueue);
    }
  }, 6000);
}
